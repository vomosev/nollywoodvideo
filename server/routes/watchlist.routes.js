const express = require('express');

const { requireAuth } = require('../middleware/auth');
const {
  listWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = require('../controllers/watchlist.controller');

const router = express.Router();

// Every watchlist route requires an authenticated session.
router.use(requireAuth);

router.get('/', listWatchlist);
router.post('/', addToWatchlist);
router.delete('/:movieId', removeFromWatchlist);

module.exports = router;