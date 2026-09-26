# NollywoodVideo

A video distribution platform focused on Nollywood cinema. Viewers browse a curated catalogue of Nigerian films, filter by genre, release year and language, open a title page with a streaming player, maintain a personal watchlist and post 1–5 star reviews.

- **Frontend:** Next.js (App Router) — `https://nollywoodvideo.arx-app.com`
- **Backend API:** Node + Express — `https://nollywoodvideo-api.arx-app.com:4110`
- **Database:** MySQL (accessed with `mysql2/promise`)
- **Auth:** session cookies (`nv.sid`) backed by `express-session` + `express-mysql-session`, passwords hashed with `bcryptjs`

---

## Table of contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [MySQL setup](#mysql-setup)
4. [Environment variables](#environment-variables)
5. [Running the API](#running-the-api)
6. [Running the frontend](#running-the-frontend)
7. [API endpoint reference](#api-endpoint-reference)
8. [Session authentication notes](#session-authentication-notes)
9. [Project structure](#project-structure)
10. [Styling conventions](#styling-conventions)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
                           ┌──────────────────────────────────────────┐
   Browser                 │  Next.js frontend (App Router)           │
   (desktop / mobile)  ──► │  https://nollywoodvideo.arx-app.com      │
                           │  - app/ pages are client components      │
                           │  - frontend/lib/api.js fetch client      │
                           │  - one global stylesheet: globals.css    │
                           └───────────────────┬──────────────────────┘
                                               │  fetch(..., { credentials: 'include' })
                                               │  HTTPS, JSON, cache: 'no-store'
                                               ▼
                           ┌──────────────────────────────────────────┐
                           │  Express API                             │
                           │  https://nollywoodvideo-api.arx-app.com  │
                           │  :4110   (server/index.js)               │
                           │  - CORS: any *.arx-app.com origin        │
                           │  - express-session, cookie nv.sid        │
                           │    (httpOnly, secure, sameSite=none)     │
                           │  - routes: /api/auth, /api/movies,       │
                           │    /api/watchlist, /api/... reviews      │
                           └───────────────────┬──────────────────────┘
                                               │  mysql2/promise pool (limit 10)
                                               ▼
                           ┌──────────────────────────────────────────┐
                           │  MySQL 8 (utf8mb4)                       │
                           │  users, sessions, genres, movies,        │
                           │  movie_genres, watchlist, reviews        │
                           └──────────────────────────────────────────┘
```

The two applications are deployed independently. The frontend never proxies or rewrites API calls — it talks directly to the HTTPS API using `NEXT_PUBLIC_API_BASE_URL`. Because both hosts live under `.arx-app.com`, the session cookie is shared cross-subdomain using `SESSION_COOKIE_DOMAIN`.

---

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| Node.js     | 18 LTS or newer (native `fetch`, modern Express support) |
| npm         | 9 or newer |
| MySQL       | 8.0 (or MySQL 5.7+ / MariaDB 10.5+ with `utf8mb4`) |
| TLS certs   | Only when `SSL_ENABLED=true`. Default paths: `/home/arx-app/backends/certs/certificate.crt` and `/home/arx-app/backends/certs/private.key` |
| PM2         | Optional, for production process management (`npm i -g pm2`) |

---

## MySQL setup

1. Create the database and a user:

   ```sql
   CREATE DATABASE nollywoodvideo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'nollywoodvideo'@'localhost' IDENTIFIED BY 'change-me';
   GRANT ALL PRIVILEGES ON nollywoodvideo.* TO 'nollywoodvideo'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Load the schema and seed data:

   ```bash
   mysql -u nollywoodvideo -p nollywoodvideo < schema.sql
   ```

   `schema.sql` creates every table the API needs and seeds the catalogue:

   | Table | Purpose |
   |-------|---------|
   | `users` | `id`, `name`, `email` (unique), `password_hash`, `role` (`viewer` \| `admin`), `created_at` |
   | `sessions` | `session_id` (PK), `expires`, `data` — required by `express-mysql-session` |
   | `genres` | `id`, `name` (unique), `slug` (unique) — Drama, Comedy, Romance, Thriller, Epic, Crime, Family, Documentary |
   | `movies` | title, slug, synopsis, `release_year`, `runtime_minutes`, `language`, `director`, `rating_label`, `stream_url`, `trailer_url`, `poster_hue`, `is_featured`, `created_at` |
   | `movie_genres` | composite PK join table (`movie_id`, `genre_id`) with foreign keys |
   | `watchlist` | `user_id` + `movie_id` with `UNIQUE(user_id, movie_id)` |
   | `reviews` | `rating` (1–5), `body`, `UNIQUE(movie_id, user_id)` so each viewer has one review per title |

   Seed data includes roughly a dozen Nollywood-style titles with genre associations, several flagged `is_featured = 1` for the home page hero.

3. Verify connectivity once the API is running:

   ```bash
   curl -k https://localhost:4110/api/status
   # { "status": "ok", "database": true }
   ```

---

## Environment variables

### Backend (`.env` in the project root — copy from `.env.example`)

| Variable | Required | Example / default | Description |
|----------|----------|-------------------|-------------|
| `PORT` | yes | `4110` | Port Express binds to on `0.0.0.0`. Never hardcoded in code. |
| `NODE_ENV` | yes | `production` | `development` also relaxes CORS to allow `localhost`. |
| `SSL_ENABLED` | no | `true` | When `'true'` the API terminates TLS itself; otherwise plain HTTP. |
| `SSL_CERT_PATH` | when SSL | `/home/arx-app/backends/certs/certificate.crt` | TLS certificate file. |
| `SSL_KEY_PATH` | when SSL | `/home/arx-app/backends/certs/private.key` | TLS private key file. |
| `SSL_CA_PATH` | no | `/home/arx-app/backends/certs/ca_bundle.crt` | Optional CA chain bundle. |
| `DB_HOST` | yes | `localhost` | MySQL host. |
| `DB_USER` | yes | `nollywoodvideo` | MySQL user. |
| `DB_PASSWORD` | yes | `your-db-password` | MySQL password. |
| `DB_NAME` | yes | `nollywoodvideo` | MySQL database name. |
| `SESSION_SECRET` | yes | `replace-with-a-long-random-string` | Signs the `nv.sid` session cookie. |
| `SESSION_COOKIE_DOMAIN` | yes (prod) | `.arx-app.com` | Shared cookie domain so the cookie is sent cross-subdomain. |
| `CORS_ALLOWED_SUFFIX` | no | `.arx-app.com` | Hostname suffix accepted by the CORS origin callback. |

> Never commit a real `.env`. `.env.example` contains placeholders only.

### Frontend (`frontend/.env.local` — copy from `frontend/.env.example`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | `https://nollywoodvideo-api.arx-app.com:4110` | Base URL used by `frontend/lib/api.js` at runtime. Falls back to the production URL if unset. |

---

## Running the API

From the project root:

```bash
cp .env.example .env      # then edit the values
npm install
npm run server            # equivalent to: node server/index.js
```

`package.json` exposes exactly two scripts:

```json
{ "start": "node server/index.js", "server": "node server/index.js" }
```

### Background start script

```bash
chmod +x START.sh
./START.sh
```

`START.sh` installs production dependencies (`npm install --omit=dev`), creates `logs/` if needed, launches the API with `nohup node server/index.js > logs/api.log 2>&1 &` and echoes the background PID. It never runs `next dev`, `next build` or `next start`.

### PM2 (production)

```bash
pm2 start ecosystem.config.js
pm2 logs nollywoodvideo
pm2 restart nollywoodvideo
pm2 save
```

`ecosystem.config.js` runs `server/index.js` from `/home/arx-app/backends/nollywoodvideo` with `NODE_ENV=production` and `PORT=4110`.

### Health checks

```bash
curl -k https://localhost:4110/health      # { "status": "ok" }
curl -k https://localhost:4110/api/status  # { "status": "ok", "database": true }
```

`/api/status` degrades gracefully: if MySQL is unreachable it returns `database: false` instead of throwing.

---

## Running the frontend

```bash
cd frontend
cp .env.example .env.local
npm install

npm run dev      # development on http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

The frontend has only three dependencies: `next`, `react`, `react-dom`. All data fetching happens inside `useEffect` handlers or event handlers — never at module scope and never during SSR — so the site renders even when the API is unreachable (each page shows an `ErrorState` with a retry button instead of crashing).

---

## API endpoint reference

All endpoints are mounted under `/api`. Every response is JSON. Requests that need a session must be sent with `credentials: 'include'`.

### Health / status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | – | `{ status: 'ok' }` liveness probe (outside `/api`). |
| `GET` | `/api/status` | – | `{ status: 'ok', database: boolean }`. |

### Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/signup` | – | `{ name, email, password }` | Creates a viewer, hashes the password with bcrypt (10 rounds), regenerates the session and returns `{ user }`. |
| `POST` | `/api/auth/login` | – | `{ email, password }` | Verifies with `bcrypt.compare`, starts a session, returns `{ user }`. |
| `POST` | `/api/auth/logout` | – | – | Destroys the session and clears the `nv.sid` cookie. Returns `{ loggedOut: true }`. |
| `GET` | `/api/auth/me` | session | – | Returns `{ user }` or `401 { error: 'Authentication required' }`. |

The safe user object is `{ id, name, email, role }` — password hashes are never returned.

### Movies — `/api/movies`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/movies` | – | Catalogue list. Query params: `q` (title/synopsis search), `genre` (slug), `year`, `language`, `sort` = `newest` \| `title` \| `rating`, `page`, `limit`. Returns `{ items, total, page, limit }` where each item includes `genres`, `avg_rating` and `review_count`. |
| `GET` | `/api/movies/featured` | – | Up to 5 movies with `is_featured = 1`. |
| `GET` | `/api/movies/genres` | – | All genres with movie counts. |
| `GET` | `/api/movies/:idOrSlug` | – | Single title with genres and average rating, or `404 { error: 'Not found' }`. |

Static routes are declared before the `:idOrSlug` param route so `/featured` and `/genres` are never swallowed.

### Watchlist — `/api/watchlist` (all require a session)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/watchlist` | – | The signed-in viewer's saved movies, newest first. |
| `POST` | `/api/watchlist` | `{ movieId }` | `INSERT IGNORE`, idempotent. `404` when the movie does not exist. |
| `DELETE` | `/api/watchlist/:movieId` | – | `{ removed: true }`. |

### Reviews

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/movies/:movieId/reviews` | – | – | Reviews joined with reviewer names, newest first, plus `average` and `count`. |
| `POST` | `/api/movies/:movieId/reviews` | session | `{ rating: 1-5, body }` | Upsert (`INSERT ... ON DUPLICATE KEY UPDATE`) — one review per user per movie. |
| `DELETE` | `/api/reviews/:id` | session | – | Deletes the caller's own review only. |

### Error shape

```json
{ "error": "Human readable message" }
```

Status codes used: `400` validation, `401` authentication required, `403` not your resource, `404` not found, `409` duplicate (e.g. email already registered), `500` unexpected. In production the 500 message is generic; details are logged server-side.

Example session flow with `curl`:

```bash
curl -k -c cookies.txt -X POST https://localhost:4110/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"viewer@example.com","password":"secretpassword"}'

curl -k -b cookies.txt https://localhost:4110/api/watchlist
```

---

## Session authentication notes

- Cookie name: **`nv.sid`**.
- Cookie flags: `httpOnly: true`, `secure: true`, `sameSite: 'none'`, `domain: SESSION_COOKIE_DOMAIN`, `maxAge` 7 days.
- Because `sameSite: 'none'` requires `secure: true`, the API must be served over HTTPS (either `SSL_ENABLED=true` or behind a TLS-terminating proxy). `app.set('trust proxy', 1)` is enabled so Express trusts the forwarded protocol.
- Sessions are persisted in the MySQL `sessions` table through `express-mysql-session` bound to the same `mysql2` pool, so restarts and multiple PM2 instances do not sign users out.
- CORS uses an origin callback: any origin whose hostname ends with `CORS_ALLOWED_SUFFIX` (default `.arx-app.com`) is allowed, plus `localhost` in development. `credentials: true` is set, and the browser must send `credentials: 'include'` — `frontend/lib/api.js` always does.
- The session is regenerated on signup/login to prevent fixation; logout destroys the record and clears the cookie.
- `attachUser` middleware loads `{ id, name, email, role }` onto `req.user` for every request that carries a valid session; `requireAuth` guards protected routes.

---

## Project structure

```
.
├── package.json                 # API manifest (express, cors, dotenv, mysql2,
│                                #  bcryptjs, express-session, express-mysql-session)
├── .env.example                 # Documented backend env template (placeholders only)
├── ecosystem.config.js          # PM2 app definition (port 4110, production)
├── START.sh                     # Install deps + nohup background API launch
├── schema.sql                   # utf8mb4 schema + Nollywood seed catalogue
├── README.md                    # This document
│
├── server/
│   ├── index.js                 # Entry point: express app, CORS, session,
│   │                            # /health, /api router, http(s) server, listen(PORT)
│   ├── config/
│   │   ├── db.js                # mysql2/promise pool + checkDatabaseConnection()
│   │   └── session.js           # createSessionMiddleware() with MySQLStore
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, attachUser
│   │   └── errorHandler.js      # notFound, errorHandler, asyncHandler
│   ├── utils/
│   │   └── validators.js        # isEmail, validateSignup/Login/Review, parsePagination
│   ├── controllers/
│   │   ├── auth.controller.js   # signup, login, logout, me
│   │   ├── movies.controller.js # listMovies, getMovieBySlugOrId, listFeatured, listGenres
│   │   ├── watchlist.controller.js
│   │   └── reviews.controller.js
│   └── routes/
│       ├── index.js             # /api aggregate router + /api/status
│       ├── auth.routes.js
│       ├── movies.routes.js
│       ├── watchlist.routes.js
│       └── reviews.routes.js
│
└── frontend/
    ├── package.json             # next, react, react-dom + dev/build/start scripts
    ├── next.config.js           # reactStrictMode + NEXT_PUBLIC_API_BASE_URL passthrough
    ├── .env.example             # NEXT_PUBLIC_API_BASE_URL template
    ├── lib/
    │   ├── api.js               # fetch client (credentials: 'include') + typed helpers
    │   └── AuthContext.jsx      # AuthProvider / useAuth (getMe on mount)
    ├── components/
    │   ├── layout/
    │   │   ├── PageShell.jsx    # SiteHeader + <main class="container"> + SiteFooter
    │   │   ├── SiteHeader.jsx   # sticky nav, search, auth area, mobile menu
    │   │   └── SiteFooter.jsx   # three token-spaced columns
    │   ├── ui/
    │   │   ├── Button.jsx  Field.jsx  Card.jsx  Modal.jsx
    │   │   ├── Table.jsx   Badge.jsx  Spinner.jsx (+ SkeletonBlock)
    │   │   └── EmptyState.jsx   # EmptyState + ErrorState
    │   ├── movies/
    │   │   ├── PosterArt.jsx    # deterministic 2:3 gradient poster (never 404s)
    │   │   ├── MovieCard.jsx  MovieGrid.jsx  MovieFilters.jsx
    │   │   ├── HeroFeature.jsx  VideoPlayer.jsx
    │   └── reviews/
    │       └── ReviewSection.jsx
    └── app/
        ├── globals.css          # THE single global stylesheet (imported once)
        ├── layout.jsx           # metadata, globals.css import, AuthProvider
        ├── page.jsx             # Home: hero + New this week + Trending
        ├── browse/page.jsx      # Filters, grid, pagination, URL sync
        ├── movies/[id]/page.jsx # Player, meta table, synopsis, reviews
        ├── watchlist/page.jsx   # Auth-gated list with optimistic removal
        ├── login/page.jsx       # Centred sign-in card
        ├── signup/page.jsx      # Centred registration card
        └── not-found.jsx        # 404 EmptyState
```

---

## Styling conventions

There is exactly **one** stylesheet: `frontend/app/globals.css`, imported once in `frontend/app/layout.jsx`. No CSS modules, no Tailwind, no inline style objects.

- Design tokens live in `:root` — colour roles (warm Nollywood amber accent), a 4→64px spacing scale, a type scale with paired line heights, radii, three elevations and z-index tokens.
- Layout uses Flexbox/Grid `gap` only — never margins on layout children, never spacer divs.
- Buttons and inputs reach a 44px minimum hit area through padding, and every interactive element has visible `:hover`, `:focus-visible`, `:active` and `:disabled` states with a real focus ring.
- Mobile-first breakpoints at 640/768/1024px; the layout works at 360px with no horizontal scroll.
- `.text-wrap-safe` (`overflow-wrap: break-word`) is applied only to user-supplied strings such as movie titles, reviewer names and review bodies.
- A `prefers-reduced-motion` block disables transitions; all transitions are under 200ms on specific properties.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `/api/status` returns `database: false` | Check `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` and that `schema.sql` has been loaded. |
| Frontend shows "Service unavailable" everywhere | API not running, wrong `NEXT_PUBLIC_API_BASE_URL`, or the self-signed certificate is not trusted by the browser. |
| Login succeeds but `/api/auth/me` returns 401 | Cookie not being stored: confirm HTTPS on both hosts, `SESSION_COOKIE_DOMAIN=.arx-app.com`, and that the frontend origin ends with `CORS_ALLOWED_SUFFIX`. |
| `ER_NO_SUCH_TABLE: sessions` | Run `schema.sql`; `express-mysql-session` expects the `sessions` table with `session_id`, `expires`, `data`. |
| `EADDRINUSE` on start | Another process owns `PORT`. `pm2 delete nollywoodvideo` or `lsof -i :4110`. |
| `ENOENT` reading the certificate | `SSL_ENABLED=true` without valid `SSL_CERT_PATH`/`SSL_KEY_PATH`; set `SSL_ENABLED=false` for local HTTP development. |
| Duplicate review error | Expected — `reviews` has `UNIQUE(movie_id, user_id)`; the API upserts instead of inserting twice. |

---

© NollywoodVideo. Licensed Nollywood distribution, built for viewers everywhere.