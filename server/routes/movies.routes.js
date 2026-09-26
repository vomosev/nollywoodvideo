const express = require('express');
const {
  listMovies,
  listFeatured,
  listGenres,
  getMovieBySlugOrId,
} = require('../controllers/movies.controller');

const router = express.Router();

// Static routes must be declared before the dynamic :idOrSlug route
router.get('/featured', listFeatured);
router.get('/genres', listGenres);
router.get('/', listMovies);
router.get('/:idOrSlug', getMovieBySlugOrId);

module.exports = router;