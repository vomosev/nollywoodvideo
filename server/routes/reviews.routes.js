const express = require('express');

const {
  listReviewsForMovie,
  upsertReview,
  deleteReview,
} = require('../controllers/reviews.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: list reviews for a movie
router.get('/movies/:movieId/reviews', listReviewsForMovie);

// Authenticated: create or update the current user's review for a movie
router.post('/movies/:movieId/reviews', requireAuth, upsertReview);

// Authenticated: delete own review
router.delete('/reviews/:id', requireAuth, deleteReview);

module.exports = router;