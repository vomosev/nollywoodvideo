-- NollywoodVideo MySQL schema
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- Usage: mysql -u <user> -p <database> < schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('viewer','admin') NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Sessions (express-mysql-session)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Genres
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_genres_name (name),
  UNIQUE KEY uq_genres_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Movies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title           VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) NOT NULL,
  synopsis        TEXT,
  release_year    SMALLINT UNSIGNED DEFAULT NULL,
  runtime_minutes SMALLINT UNSIGNED DEFAULT NULL,
  language        VARCHAR(60) DEFAULT 'English',
  director        VARCHAR(150) DEFAULT NULL,
  rating_label    VARCHAR(20) DEFAULT NULL,
  stream_url      VARCHAR(500) DEFAULT NULL,
  trailer_url     VARCHAR(500) DEFAULT NULL,
  poster_hue      SMALLINT NOT NULL DEFAULT 38,
  is_featured     TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_movies_slug (slug),
  KEY idx_movies_year (release_year),
  KEY idx_movies_language (language),
  KEY idx_movies_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Movie <-> Genre join
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INT UNSIGNED NOT NULL,
  genre_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  KEY idx_movie_genres_genre (genre_id),
  CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES genres (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Watchlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id  INT UNSIGNED NOT NULL,
  movie_id INT UNSIGNED NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_watchlist_user_movie (user_id, movie_id),
  KEY idx_watchlist_movie (movie_id),
  CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_watchlist_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL,
  body       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_movie_user (movie_id, user_id),
  KEY idx_reviews_user (user_id),
  CONSTRAINT fk_reviews_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Seed data: genres
-- ---------------------------------------------------------------------------
INSERT INTO genres (name, slug) VALUES
  ('Drama',       'drama'),
  ('Comedy',      'comedy'),
  ('Romance',     'romance'),
  ('Thriller',    'thriller'),
  ('Epic',        'epic'),
  ('Crime',       'crime'),
  ('Family',      'family'),
  ('Documentary', 'documentary')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ---------------------------------------------------------------------------
-- Seed data: movies (~12 Nollywood-style titles)
-- ---------------------------------------------------------------------------
INSERT INTO movies
  (title, slug, synopsis, release_year, runtime_minutes, language, director, rating_label, stream_url, trailer_url, poster_hue, is_featured)
VALUES
  ('Lagos at Dawn', 'lagos-at-dawn',
   'A night-bus conductor and a runaway pianist cross paths on the last journey out of Oshodi, and by sunrise both of their lives in Lagos have been rewritten.',
   2023, 118, 'English', 'Chidinma Okafor', 'PG-13',
   'https://cdn.nollywoodvideo.example/streams/lagos-at-dawn.mp4',
   'https://cdn.nollywoodvideo.example/trailers/lagos-at-dawn.mp4', 34, 1),

  ('The Owambe Contract', 'the-owambe-contract',
   'Two rival party planners are forced to co-host the wedding of the decade in Ikoyi, where every aso-ebi order hides a bigger secret.',
   2022, 104, 'English', 'Bolaji Adeyemi', 'PG',
   'https://cdn.nollywoodvideo.example/streams/the-owambe-contract.mp4',
   'https://cdn.nollywoodvideo.example/trailers/the-owambe-contract.mp4', 48, 0),

  ('Blood on the Mainland', 'blood-on-the-mainland',
   'A tired detective returns to Ebute Metta to close a cold case, only to discover the killer has been filing reports beside her for nine years.',
   2024, 126, 'English', 'Emeka Nwosu', '18',
   'https://cdn.nollywoodvideo.example/streams/blood-on-the-mainland.mp4',
   'https://cdn.nollywoodvideo.example/trailers/blood-on-the-mainland.mp4', 355, 1),

  ('Daughters of Nkwo', 'daughters-of-nkwo',
   'Three sisters return to their late father''s compound in Enugu for the burial rites and find that the family land has already been sold.',
   2021, 132, 'Igbo', 'Ngozi Eze', 'PG-13',
   'https://cdn.nollywoodvideo.example/streams/daughters-of-nkwo.mp4',
   'https://cdn.nollywoodvideo.example/trailers/daughters-of-nkwo.mp4', 12, 0),

  ('Oba of the Seven Rivers', 'oba-of-the-seven-rivers',
   'In pre-colonial Yorubaland, a reluctant prince must unite seven warring riverine kingdoms before the dry season ends.',
   2023, 148, 'Yoruba', 'Tunde Ogundipe', '15',
   'https://cdn.nollywoodvideo.example/streams/oba-of-the-seven-rivers.mp4',
   'https://cdn.nollywoodvideo.example/trailers/oba-of-the-seven-rivers.mp4', 28, 1),

  ('Danfo Dreams', 'danfo-dreams',
   'A university dropout buys a battered yellow bus with his last savings and learns that the Lagos road teaches faster than any lecture hall.',
   2020, 96, 'Pidgin', 'Samuel Adeniran', 'PG',
   'https://cdn.nollywoodvideo.example/streams/danfo-dreams.mp4',
   'https://cdn.nollywoodvideo.example/trailers/danfo-dreams.mp4', 52, 0),

  ('Harmattan Letters', 'harmattan-letters',
   'Separated by a visa refusal, two lovers keep a decade-long correspondence between Jos and Toronto that neither family is allowed to read.',
   2022, 112, 'English', 'Aisha Bello', 'PG-13',
   'https://cdn.nollywoodvideo.example/streams/harmattan-letters.mp4',
   'https://cdn.nollywoodvideo.example/trailers/harmattan-letters.mp4', 330, 0),

  ('The Yahoo Boys of Ikorodu', 'the-yahoo-boys-of-ikorodu',
   'A brilliant computer science graduate is pulled into an internet fraud ring and discovers the syndicate is run by the people meant to police it.',
   2024, 121, 'English', 'Femi Salako', '18',
   NULL,
   'https://cdn.nollywoodvideo.example/trailers/the-yahoo-boys-of-ikorodu.mp4', 200, 0),

  ('Mama Put', 'mama-put',
   'A widowed roadside food seller in Surulere raises four children on jollof rice and stubborn hope, and lives to see her buka become a landmark.',
   2019, 108, 'English', 'Grace Ibitoye', 'U',
   'https://cdn.nollywoodvideo.example/streams/mama-put.mp4',
   'https://cdn.nollywoodvideo.example/trailers/mama-put.mp4', 92, 0),

  ('Nollywood: Thirty Years of Light', 'nollywood-thirty-years-of-light',
   'An archival documentary tracing the industry from Idumota VHS stalls to global streaming deals, told by the producers who were there.',
   2023, 88, 'English', 'Kunle Afolabi', 'U',
   'https://cdn.nollywoodvideo.example/streams/nollywood-thirty-years-of-light.mp4',
   'https://cdn.nollywoodvideo.example/trailers/nollywood-thirty-years-of-light.mp4', 220, 0),

  ('Calabar Kitchen', 'calabar-kitchen',
   'A Michelin-trained chef comes home to Cross River and must beat her aunt''s legendary afang soup to inherit the family restaurant.',
   2021, 99, 'English', 'Idara Effiong', 'PG',
   'https://cdn.nollywoodvideo.example/streams/calabar-kitchen.mp4',
   'https://cdn.nollywoodvideo.example/trailers/calabar-kitchen.mp4', 140, 0),

  ('Silent Bullets', 'silent-bullets',
   'A retired army sniper is forced back into service when a kidnapping ring on the Abuja-Kaduna road takes the one hostage he cannot ignore.',
   2024, 130, 'English', 'Peter Obinna', '18',
   'https://cdn.nollywoodvideo.example/streams/silent-bullets.mp4',
   'https://cdn.nollywoodvideo.example/trailers/silent-bullets.mp4', 248, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ---------------------------------------------------------------------------
-- Seed data: movie <-> genre links
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g
WHERE (m.slug = 'lagos-at-dawn'                    AND g.slug IN ('drama','romance'))
   OR (m.slug = 'the-owambe-contract'              AND g.slug IN ('comedy','romance'))
   OR (m.slug = 'blood-on-the-mainland'            AND g.slug IN ('thriller','crime'))
   OR (m.slug = 'daughters-of-nkwo'                AND g.slug IN ('drama','family'))
   OR (m.slug = 'oba-of-the-seven-rivers'          AND g.slug IN ('epic','drama'))
   OR (m.slug = 'danfo-dreams'                     AND g.slug IN ('comedy','drama'))
   OR (m.slug = 'harmattan-letters'                AND g.slug IN ('romance','drama'))
   OR (m.slug = 'the-yahoo-boys-of-ikorodu'        AND g.slug IN ('crime','thriller'))
   OR (m.slug = 'mama-put'                         AND g.slug IN ('family','drama'))
   OR (m.slug = 'nollywood-thirty-years-of-light'  AND g.slug IN ('documentary'))
   OR (m.slug = 'calabar-kitchen'                  AND g.slug IN ('comedy','family'))
   OR (m.slug = 'silent-bullets'                   AND g.slug IN ('thriller','crime'));