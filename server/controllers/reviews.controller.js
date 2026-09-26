const { pool } = require('../config/db');
const { validateReview } = require('../utils/validators');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Resolve a movie id from a route param, returning null when it is not a
 * positive integer or the movie does not exist.
 */
async function resolveMovieId(rawId) {
  const movieId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(movieId) || movieId <= 0) return null;

  const [rows] = await pool.query('SELECT id FROM movies WHERE id = ? LIMIT 1', [movieId]);
  if (!rows.length) return null;
  return rows[0].id;
}

/**
 * GET /api/movies/:movieId/reviews
 * Public. Newest first, includes reviewer name plus aggregate summary.
 */
const listReviewsForMovie = asyncHandler(async (req, res) => {
  const movieId = await resolveMovieId(req.params.movieId);
  if (!movieId) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const [rows] = await pool.query(
    `SELECT r.id,
            r.movie_id,
            r.user_id,
            r.rating,
            r.body,
            r.created_at,
            u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.movie_id = ?
      ORDER BY r.created_at DESC, r.id DESC`,
    [movieId]
  );

  const [summaryRows] = await pool.query(
    `SELECT COUNT(*) AS review_count, AVG(rating) AS avg_rating
       FROM reviews
      WHERE movie_id = ?`,
    [movieId]
  );

  const summary = summaryRows[0] || { review_count: 0, avg_rating: null };
  const avg = summary.avg_rating === null ? null : Number(Number(summary.avg_rating).toFixed(2));

  return res.json({
    items: rows.map((row) => ({
      id: row.id,
      movieId: row.movie_id,
      userId: row.user_id,
      rating: Number(row.rating),
      body: row.body,
      createdAt: row.created_at,
      reviewerName: row.reviewer_name,
      isOwn: Boolean(req.session && req.session.userId === row.user_id)
    })),
    reviewCount: Number(summary.review_count) || 0,
    avgRating: avg
  });
});

/**
 * POST /api/movies/:movieId/reviews
 * Requires auth. One review per user per movie (upsert).
 */
const upsertReview = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const movieId = await resolveMovieId(req.params.movieId);
  if (!movieId) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const { valid, errors, value } = validateReview(req.body || {});
  if (!valid) {
    return res.status(400).json({ error: 'Invalid review', errors });
  }

  await pool.query(
    `INSERT INTO reviews (movie_id, user_id, rating, body)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), body = VALUES(body)`,
    [movieId, userId, value.rating, value.body]
  );

  const [rows] = await pool.query(
    `SELECT r.id,
            r.movie_id,
            r.user_id,
            r.rating,
            r.body,
            r.created_at,
            u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.movie_id = ? AND r.user_id = ?
      LIMIT 1`,
    [movieId, userId]
  );

  if (!rows.length) {
    return res.status(500).json({ error: 'Could not save review' });
  }

  const row = rows[0];
  return res.status(201).json({
    review: {
      id: row.id,
      movieId: row.movie_id,
      userId: row.user_id,
      rating: Number(row.rating),
      body: row.body,
      createdAt: row.created_at,
      reviewerName: row.reviewer_name,
      isOwn: true
    }
  });
});

/**
 * DELETE /api/reviews/:id
 * Requires auth. Only the review author may delete it.
 */
const deleteReview = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const reviewId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: 'Invalid review id' });
  }

  const [rows] = await pool.query('SELECT id, user_id FROM reviews WHERE id = ? LIMIT 1', [
    reviewId
  ]);

  if (!rows.length) {
    return res.status(404).json({ error: 'Review not found' });
  }

  if (rows[0].user_id !== userId) {
    return res.status(403).json({ error: 'You can only delete your own review' });
  }

  await pool.query('DELETE FROM reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);

  return res.json({ removed: true });
});

module.exports = {
  listReviewsForMovie,
  upsertReview,
  deleteReview
};