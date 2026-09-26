# Integration Notes for nollywoodvideo

## Overview

NollywoodVideo is a two-tier video distribution platform for Nollywood films. Viewers browse a curated catalogue, filter by genre, release year and language, open a title page with an HTML5 streaming player, maintain a personal watchlist and post 1–5 star reviews.

The system is composed of two independently deployed applications plus a database:

```
  Browser
     |
     |  HTTPS (credentials: include)
     v
  Next.js App Router frontend            Express API
  https://nollywoodvideo.arx-app.com --> https://nollywoodvideo-api.arx-app.com:4110
  (frontend/)                            (server/)
                                              |
                                              |  mysql2/promise pool
                                              v
                                          MySQL 8
                                          (users, movies, genres,
                                           movie_genres, watchlist,
                                           reviews, sessions)
```

Key integration facts:

- **Authentication is session-cookie based.** The API issues a cookie named `nv.sid` (`httpOnly`, `secure`, `sameSite: 'none'`, `domain` from `SESSION_COOKIE_DOMAIN`). Sessions are persisted in MySQL via `express-mysql-session` using the `sessions` table in `schema.sql`.
- **The frontend never proxies the API.** `frontend/lib/api.js` calls the API host directly with `credentials: 'include'`, so both apps must share a cookie domain (e.g. `.arx-app.com`) and the API must be reachable over HTTPS from the browser.
- **Passwords are hashed with `bcryptjs` at 10 rounds** in `server/controllers/auth.controller.js`.
- **All styling lives in one file**, `frontend/app/globals.css`, imported exactly once from `frontend/app/layout.jsx`. There are no CSS modules, no Tailwind and no inline style objects.
- **No data fetching happens at module scope or during SSR.** Every page and component fetches inside `useEffect` or event handlers, and tolerates the API being unavailable.

## Prerequisites

| Requirement | Version / Notes |
| --- | --- |
| Node.js | 18 LTS or newer (native `fetch`, App Router support) |
| npm | 9+ (ships with Node 18) |
| MySQL | 8.0+ (or MariaDB 10.6+), `utf8mb4` default charset |
| TLS certificate & key | Required when `SSL_ENABLED=true`; readable by the API process |
| PM2 | Optional, for production process management (`npm i -g pm2`) |

You also need:

- A MySQL user with `CREATE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the application database (the session store creates/writes the `sessions` table).
- DNS entries for both hosts under a shared parent domain, e.g. `nollywoodvideo.arx-app.com` and `nollywoodvideo-api.arx-app.com`, so the session cookie domain `.arx-app.com` applies to both.
- Port `4110` open inbound on the API host.

## Installation

### 1. Clone and install the backend

```bash
cd /home/arx-app/backends/nollywoodvideo
npm install            # or: npm install --omit=dev for production
```

This installs `express`, `cors`, `dotenv`, `mysql2`, `bcryptjs`, `express-session` and `express-mysql-session` as declared in the root `package.json` (package name `nollywoodvideo-api`).

### 2. Create the database and load the schema

```bash
mysql -h "$DB_HOST" -u root -p -e "CREATE DATABASE nollywoodvideo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h "$DB_HOST" -u root -p nollywoodvideo < schema.sql
```

`schema.sql` creates `users`, `sessions`, `genres`, `movies`, `movie_genres`, `watchlist` and `reviews`, then seeds the eight genre rows (Drama, Comedy, Romance, Thriller, Epic, Crime, Family, Documentary) and roughly twelve Nollywood-style titles with genre mappings. It is safe to run once on a fresh database; re-running will fail on duplicate unique keys.

### 3. Configure backend environment

```bash
cp .env.example .env
$EDITOR .env
```

Fill in every value from the table below. `.env.example` contains placeholders only — never commit a populated `.env`.

### 4. Install the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
$EDITOR .env.local     # set NEXT_PUBLIC_API_BASE_URL
```

`frontend/package.json` (package name `nollywoodvideo-web`) depends only on `next`, `react` and `react-dom`.

## Environment Variables

### Backend — `/home/arx-app/backends/nollywoodvideo/.env`

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the Express API binds to (assigned by the deploy script; 4110 in production). Read in `server/index.js` via `server.listen(process.env.PORT, '0.0.0.0')` — the port is never hardcoded. | `4110` |
| `NODE_ENV` | Node environment. In `production`, `server/middleware/errorHandler.js` returns generic error messages instead of stack details, and CORS drops the localhost allowance. | `production` |
| `SSL_ENABLED` | When `'true'` the API terminates TLS itself using the cert/key paths below (`https.createServer`); otherwise it falls back to `http.createServer`. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate file, read with `fs.readFileSync` at boot. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key file. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA chain bundle; included in the HTTPS options only when set. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `DB_HOST` | MySQL host name used by the `mysql2/promise` pool in `server/config/db.js`. | `db.example.com` |
| `DB_USER` | MySQL user name. | `nollywoodvideo` |
| `DB_PASSWORD` | MySQL password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `nollywoodvideo` |
| `SESSION_SECRET` | Secret used to sign the session cookie (`server/config/session.js`). Use a long random string; rotating it invalidates all sessions. | `change-me-to-a-long-random-string` |
| `SESSION_COOKIE_DOMAIN` | Cookie domain shared by frontend and API so the `nv.sid` session cookie is sent cross-subdomain. Must begin with a dot for subdomain sharing. | `.arx-app.com` |
| `CORS_ALLOWED_SUFFIX` | Domain suffix allowed by CORS — any origin whose hostname ends with this suffix is accepted with `credentials: true`. | `.arx-app.com` |

### Frontend — `frontend/.env.local`

| Variable | Description | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the backend API used by the Next.js client at runtime. Consumed by `frontend/lib/api.js` (`API_BASE`) and passed through `frontend/next.config.js`. Because it is a `NEXT_PUBLIC_` variable it is inlined at build time — rebuild after changing it. | `https://nollywoodvideo-api.arx-app.com:4110` |

> **Cookie checklist.** For sign-in to work in the browser, all four of these must hold: the API is served over HTTPS, `SESSION_COOKIE_DOMAIN` is the shared parent domain, the frontend origin ends with `CORS_ALLOWED_SUFFIX`, and requests use `credentials: 'include'` (already the default in `frontend/lib/api.js`).

## Running the Application

### Backend

Foreground (development or a quick smoke test):

```bash
cd /home/arx-app/backends/nollywoodvideo
npm run server          # equivalent to: node server/index.js
# npm start also maps to node server/index.js
```

Background via the deploy script:

```bash
./START.sh
```

`START.sh` changes into the project directory, runs `npm install --omit=dev`, creates `logs/` if missing, launches `nohup node server/index.js > logs/api.log 2>&1 &` and echoes the PID. It never invokes `next dev`, `next build` or `next start`.

Managed by PM2:

```bash
pm2 start ecosystem.config.js
pm2 logs nollywoodvideo
pm2 restart nollywoodvideo
pm2 save
```

`ecosystem.config.js` pins `cwd` to `/home/arx-app/backends/nollywoodvideo`, `script` to `server/index.js`, and sets `NODE_ENV=production` / `PORT=4110`.

Health checks:

```bash
curl -k https://nollywoodvideo-api.arx-app.com:4110/health
# {"status":"ok"}

curl -k https://nollywoodvideo-api.arx-app.com:4110/api/status
# {"status":"ok","database":true}
```

`/api/status` calls `checkDatabaseConnection()` from `server/config/db.js` and degrades gracefully to `"database": false` rather than throwing.

### Frontend

```bash
cd frontend
npm run dev             # http://localhost:3000
npm run build
npm run start
```

In development, `server/index.js` also permits `localhost` origins through CORS, so a local Next.js dev server can talk to a remote or local API.

### API surface (mounted under `/api` by `server/routes/index.js`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/status` | – | Service + database health |
| `POST` | `/api/auth/signup` | – | Create account, start session |
| `POST` | `/api/auth/login` | – | Verify credentials, start session |
| `POST` | `/api/auth/logout` | – | Destroy session, clear `nv.sid` |
| `GET` | `/api/auth/me` | session | Current user |
| `GET` | `/api/movies` | – | List with `?q&genre&year&language&sort&page&limit` |
| `GET` | `/api/movies/featured` | – | Up to 5 featured titles |
| `GET` | `/api/movies/genres` | – | Genres with movie counts |
| `GET` | `/api/movies/:idOrSlug` | – | Single title with genres and average rating |
| `GET` | `/api/watchlist` | session | Current user's watchlist |
| `POST` | `/api/watchlist` | session | Body `{ movieId }` |
| `DELETE` | `/api/watchlist/:movieId` | session | Remove entry |
| `GET` | `/api/movies/:movieId/reviews` | – | Reviews + average rating |
| `POST` | `/api/movies/:movieId/reviews` | session | Upsert own review (`rating` 1–5, `body`) |
| `DELETE` | `/api/reviews/:id` | session | Delete own review |

Static movie routes (`/featured`, `/genres`) are registered before the `/:idOrSlug` param route in `server/routes/movies.routes.js`.

## Project Structure

```
.
├── package.json                  # nollywoodvideo-api manifest (start/server scripts only)
├── .env.example                  # Documented backend env placeholders
├── ecosystem.config.js           # PM2 app definition (name, script, cwd, env)
├── START.sh                      # Install + nohup background launch, writes logs/api.log
├── schema.sql                    # utf8mb4 tables + genre/movie seed data
├── README.md                     # Full project documentation
├── server/
│   ├── index.js                  # Entry: dotenv, trust proxy, CORS, session, /health, /api, errors, HTTP(S) listen
│   ├── config/
│   │   ├── db.js                 # mysql2/promise pool + checkDatabaseConnection()
│   │   └── session.js            # createSessionMiddleware() with MySQLStore on the pool
│   ├── middleware/
│   │   ├── auth.js               # requireAuth, attachUser
│   │   └── errorHandler.js       # notFound, errorHandler, asyncHandler
│   ├── utils/validators.js       # isEmail, validateSignup/Login/Review, parsePagination
│   ├── controllers/              # auth, movies, watchlist, reviews (parameterised SQL only)
│   └── routes/                   # auth, movies, watchlist, reviews + aggregate index.js
└── frontend/
    ├── package.json              # nollywoodvideo-web (next, react, react-dom)
    ├── next.config.js            # reactStrictMode + NEXT_PUBLIC_API_BASE_URL passthrough
    ├── .env.example              # NEXT_PUBLIC_API_BASE_URL sample
    ├── app/
    │   ├── globals.css           # THE single stylesheet: reset, tokens, typography, layout, components, media queries
    │   ├── layout.jsx            # Root layout, metadata, single globals.css import, AuthProvider
    │   ├── page.jsx              # Home: HeroFeature + New this week / Trending grids
    │   ├── browse/page.jsx       # Filters, debounced search, URL sync, pagination
    │   ├── movies/[id]/page.jsx  # Player, meta table, synopsis, watchlist toggle, reviews
    │   ├── watchlist/page.jsx    # Auth-gated list with optimistic remove + confirm Modal
    │   ├── login/page.jsx        # Centred sign-in card
    │   ├── signup/page.jsx       # Account creation with client-side validation
    │   └── not-found.jsx         # 404 via EmptyState
    ├── lib/
    │   ├── api.js                # API_BASE, request(), typed endpoint helpers (credentials: include)
    │   └── AuthContext.jsx       # AuthProvider/useAuth, getMe() on mount
    └── components/
        ├── ui/                   # Button, Field, Card, Modal, Table, Badge, Spinner, EmptyState
        ├── layout/               # SiteHeader, SiteFooter, PageShell
        ├── movies/               # PosterArt, MovieCard, MovieGrid, MovieFilters, HeroFeature, VideoPlayer
        └── reviews/ReviewSection.jsx
```

**Design-system rules worth preserving when editing:** all spacing comes from the `--space-*` tokens applied as Flex/Grid `gap` (never margins on layout children, never spacer divs); colours only from `:root` roles; `.text-wrap-safe` is applied strictly to user-supplied strings such as movie titles, reviewer names and review bodies; `Modal.jsx` portals to `document.body` so it cannot be clipped; `PosterArt.jsx` and `EmptyState.jsx` draw inline SVG so no image request can 404.

## Next Steps / Production Considerations

**Security**

- Replace `SESSION_SECRET` with a 32+ byte random value (`openssl rand -hex 32`) and store it in a secrets manager rather than a plaintext `.env`.
- Keep `SSL_ENABLED=true` in production — the session cookie is `secure` + `sameSite: 'none'`, so it will simply not be set over plain HTTP.
- Restrict the MySQL user to the application database and, once `sessions` exists, consider dropping `CREATE` privileges.
- Add rate limiting (e.g. `express-rate-limit`) on `POST /api/auth/login` and `POST /api/auth/signup` to blunt credential stuffing.
- Consider raising the bcrypt cost factor above 10 in `server/controllers/auth.controller.js` as hardware improves, and re-hash on successful login.
- Add a `helmet` middleware layer in `server/index.js` for standard security headers.

**Data and operations**

- Schedule expired-session cleanup; `express-mysql-session` prunes on an interval, but a nightly `DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP()` job is a cheap safety net.
- Add indexes as the catalogue grows: `movies(release_year)`, `movies(language)`, `movies(is_featured)`, `reviews(movie_id)` and `watchlist(user_id)` back the hottest queries in `movies.controller.js` and `watchlist.controller.js`.
- The `mysql2` pool is fixed at `connectionLimit: 10`; raise it in `server/config/db.js` only in step with MySQL's `max_connections`.
- Back up the database before re-running `schema.sql` — it is not idempotent.
- Rotate `logs/api.log` (logrotate, or `pm2-logrotate` if running under PM2) so the nohup log does not grow unbounded.

**Scaling and delivery**

- `movies.stream_url` currently points wherever you host the media. For real distribution, move to signed URLs or HLS manifests behind a CDN and have `VideoPlayer.jsx` consume the signed URL returned by the API rather than a static field.
- Sessions live in MySQL, so the API scales horizontally behind a load balancer without sticky sessions; keep `app.set('trust proxy', 1)` accurate for your proxy depth.
- Serve the Next.js build with `npm run build && npm run start` behind a reverse proxy, or export to your platform of choice. Remember that `NEXT_PUBLIC_API_BASE_URL` is baked in at build time — a change requires a rebuild and redeploy, not just a restart.

**Product**

- The `users.role` column already supports `admin`; an admin surface for creating and editing titles, plus moderation of review bodies, is the natural next feature.
- Add pagination or lazy loading to `ReviewSection.jsx` once popular titles accumulate reviews.
- Add monitoring on `/api/status` (which reports database reachability) and alert on `"database": false`.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_nollywoodvideo
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** nollywoodvideo
- **Credentials stored in Vault at:** `secret/data/mysql/nollywoodvideo`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
