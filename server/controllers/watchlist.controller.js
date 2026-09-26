const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/watchlist
 * Lists all movies on the current user's watchlist, newest additions first.
 */
const listWatchlist = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [rows] = await pool.query(
    `SELECT
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
        w.added_at,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        GROUP_CONCAT(DISTINCT g.name ORDER BY g.name SEPARATOR ',') AS genre_names
     FROM watchlist w
     JOIN movies m ON m.id = w.movie_id
     LEFT JOIN reviews r ON r.movie_id = m.id
     LEFT JOIN movie_genres mg ON mg.movie_id = m.id
     LEFT JOIN genres g ON g.id = mg.genre_id
     WHERE w.user_id = ?
     GROUP BY m.id, w.added_at
     ORDER BY w.added_at DESC`,
    [userId]
  );

  const items = rows.map((row) => {
    const { genre_names: genreNames, ...movie } = row;
    return {
      ...movie,
      avg_rating: Number(movie.avg_rating) || 0,
      review_count: Number(movie.review_count) || 0,
      genres: genreNames ? String(genreNames).split(',').filter(Boolean) : []
    };
  });

  return res.json({ items, total: items.length });
});

/**
 * POST /api/watchlist  { movieId }
 * Adds a movie to the current user's watchlist (idempotent).
 */
const addToWatchlist = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const raw = req.body && (req.body.movieId !== undefined ? req.body.movieId : req.body.movie_id);
  const movieId = Number.parseInt(raw, 10);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: 'A valid movieId is required' });
  }

  const [movieRows] = await pool.query('SELECT id, title, slug FROM movies WHERE id = ? LIMIT 1', [
    movieId
  ]);

  if (!movieRows.length) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const [result] = await pool.query(
    'INSERT IGNORE INTO watchlist (user_id, movie_id, added_at) VALUES (?, ?, NOW())',
    [userId, movieId]
  );

  return res.status(201).json({
    added: true,
    alreadyPresent: result.affectedRows === 0,
    movieId,
    movie: movieRows[0]
  });
});

/**
 * DELETE /api/watchlist/:movieId
 * Removes a movie from the current user's watchlist.
 */
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const movieId = Number.parseInt(req.params.movieId, 10);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: 'A valid movieId is required' });
  }

  const [result] = await pool.query('DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?', [
    userId,
    movieId
  ]);

  return res.json({ removed: true, movieId, wasPresent: result.affectedRows > 0 });
});

module.exports = {
  listWatchlist,
  addToWatchlist,
  removeFromWatchlist
};