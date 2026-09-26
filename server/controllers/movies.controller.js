const { pool } = require('../config/db');
const { parsePagination } = require('../utils/validators');
const { asyncHandler } = require('../middleware/errorHandler');

const MOVIE_BASE_FIELDS = `
  m.id,
  m.title,
  m.slug,
  m.synopsis,
  m.release_year,
  m.runtime_minutes,
  m.language,
  m.director,
  m.rating_label,
  m.stream_url,
  m.trailer_url,
  m.poster_hue,
  m.is_featured,
  m.created_at
`;

const SORT_MAP = {
  newest: 'm.created_at DESC, m.id DESC',
  title: 'm.title ASC',
  rating: 'avg_rating DESC, review_count DESC, m.title ASC',
  year: 'm.release_year DESC, m.title ASC'
};

function normaliseMovieRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    synopsis: row.synopsis,
    release_year: row.release_year,
    runtime_minutes: row.runtime_minutes,
    language: row.language,
    director: row.director,
    rating_label: row.rating_label,
    stream_url: row.stream_url,
    trailer_url: row.trailer_url,
    poster_hue: row.poster_hue === null || row.poster_hue === undefined ? 32 : Number(row.poster_hue),
    is_featured: Number(row.is_featured) === 1,
    created_at: row.created_at,
    avg_rating: row.avg_rating === null || row.avg_rating === undefined ? null : Number(Number(row.avg_rating).toFixed(2)),
    review_count: row.review_count === null || row.review_count === undefined ? 0 : Number(row.review_count),
    genres: typeof row.genres === 'string' && row.genres.length
      ? row.genres.split('||').map((chunk) => {
          const [name, slug] = chunk.split('::');
          return { name: name || '', slug: slug || '' };
        }).filter((g) => g.name)
      : []
  };
}

/**
 * GET /api/movies
 * Supports ?q, ?genre (slug), ?year, ?language, ?sort, ?page, ?limit
 */
const listMovies = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query || {});

  const where = [];
  const params = [];

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    where.push('(m.title LIKE ? OR m.synopsis LIKE ? OR m.director LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const genreSlug = typeof req.query.genre === 'string' ? req.query.genre.trim() : '';
  if (genreSlug) {
    where.push(
      'EXISTS (SELECT 1 FROM movie_genres mgf JOIN genres gf ON gf.id = mgf.genre_id WHERE mgf.movie_id = m.id AND gf.slug = ?)'
    );
    params.push(genreSlug);
  }

  const yearRaw = req.query.year;
  const year = Number.parseInt(yearRaw, 10);
  if (Number.isInteger(year) && year > 1900 && year < 2200) {
    where.push('m.release_year = ?');
    params.push(year);
  }

  const language = typeof req.query.language === 'string' ? req.query.language.trim() : '';
  if (language) {
    where.push('m.language = ?');
    params.push(language);
  }

  const featuredOnly = req.query.featured === '1' || req.query.featured === 'true';
  if (featuredOnly) {
    where.push('m.is_featured = 1');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortKey = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : 'newest';
  const orderSql = SORT_MAP[sortKey] || SORT_MAP.newest;

  const countSql = `SELECT COUNT(*) AS total FROM movies m ${whereSql}`;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

  const listSql = `
    SELECT
      ${MOVIE_BASE_FIELDS},
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.review_count, 0) AS review_count,
      (
        SELECT GROUP_CONCAT(CONCAT(g.name, '::', g.slug) ORDER BY g.name SEPARATOR '||')
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id
        WHERE mg.movie_id = m.id
      ) AS genres
    FROM movies m
    LEFT JOIN (
      SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
      FROM reviews
      GROUP BY movie_id
    ) r ON r.movie_id = m.id
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(listSql, [...params, limit, offset]);

  res.json({
    items: (rows || []).map(normaliseMovieRow),
    total,
    page,
    limit,
    pages: limit > 0 ? Math.ceil(total / limit) : 0
  });
});

/**
 * GET /api/movies/featured
 */
const listFeatured = asyncHandler(async (req, res) => {
  const sql = `
    SELECT
      ${MOVIE_BASE_FIELDS},
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.review_count, 0) AS review_count,
      (
        SELECT GROUP_CONCAT(CONCAT(g.name, '::', g.slug) ORDER BY g.name SEPARATOR '||')
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id
        WHERE mg.movie_id = m.id
      ) AS genres
    FROM movies m
    LEFT JOIN (
      SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
      FROM reviews
      GROUP BY movie_id
    ) r ON r.movie_id = m.id
    WHERE m.is_featured = 1
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 5
  `;

  const [rows] = await pool.query(sql);
  res.json({ items: (rows || []).map(normaliseMovieRow) });
});

/**
 * GET /api/movies/genres
 */
const listGenres = asyncHandler(async (req, res) => {
  const sql = `
    SELECT
      g.id,
      g.name,
      g.slug,
      COUNT(mg.movie_id) AS movie_count
    FROM genres g
    LEFT JOIN movie_genres mg ON mg.genre_id = g.id
    GROUP BY g.id, g.name, g.slug
    ORDER BY g.name ASC
  `;

  const [rows] = await pool.query(sql);
  res.json({
    items: (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      movie_count: Number(row.movie_count) || 0
    }))
  });
});

/**
 * GET /api/movies/:idOrSlug
 */
const getMovieBySlugOrId = asyncHandler(async (req, res) => {
  const raw = typeof req.params.idOrSlug === 'string' ? req.params.idOrSlug.trim() : '';
  if (!raw) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const numericId = Number.parseInt(raw, 10);
  const isNumeric = Number.isInteger(numericId) && String(numericId) === raw;

  const sql = `
    SELECT
      ${MOVIE_BASE_FIELDS},
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.review_count, 0) AS review_count,
      (
        SELECT GROUP_CONCAT(CONCAT(g.name, '::', g.slug) ORDER BY g.name SEPARATOR '||')
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id
        WHERE mg.movie_id = m.id
      ) AS genres
    FROM movies m
    LEFT JOIN (
      SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
      FROM reviews
      GROUP BY movie_id
    ) r ON r.movie_id = m.id
    WHERE ${isNumeric ? 'm.id = ?' : 'm.slug = ?'}
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [isNumeric ? numericId : raw]);
  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const movie = normaliseMovieRow(rows[0]);

  let inWatchlist = false;
  if (req.session && req.session.userId) {
    const [wl] = await pool.query(
      'SELECT id FROM watchlist WHERE user_id = ? AND movie_id = ? LIMIT 1',
      [req.session.userId, movie.id]
    );
    inWatchlist = Array.isArray(wl) && wl.length > 0;
  }

  res.json({ movie: { ...movie, in_watchlist: inWatchlist } });
});

module.exports = {
  listMovies,
  listFeatured,
  listGenres,
  getMovieBySlugOrId
};