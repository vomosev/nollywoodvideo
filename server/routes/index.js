'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const movieRoutes = require('./movies.routes');
const watchlistRoutes = require('./watchlist.routes');
const reviewRoutes = require('./reviews.routes');
const { checkDatabaseConnection } = require('../config/db');

const router = express.Router();

router.get('/status', async (req, res) => {
  let database = false;
  try {
    database = await checkDatabaseConnection();
  } catch (err) {
    console.error('[status] database check failed:', err.message);
    database = false;
  }
  res.json({ status: 'ok', database: Boolean(database) });
});

router.use('/auth', authRoutes);
router.use('/movies', movieRoutes);
router.use('/watchlist', watchlistRoutes);

// Review routes declare their own full paths:
//   GET    /movies/:movieId/reviews
//   POST   /movies/:movieId/reviews
//   DELETE /reviews/:id
router.use('/', reviewRoutes);

module.exports = router;