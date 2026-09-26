'use strict';

/**
 * Express middleware helpers for 404 handling, centralised error handling
 * and wrapping async route handlers so rejected promises reach next().
 */

function notFound(req, res) {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl || req.url,
  });
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  const status = Number(err && err.status) || Number(err && err.statusCode) || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const logPrefix = `[error] ${req.method} ${req.originalUrl || req.url} -> ${status}`;
  if (status >= 500) {
    console.error(logPrefix, err && err.stack ? err.stack : err);
  } else {
    console.warn(logPrefix, err && err.message ? err.message : err);
  }

  if (res.headersSent) {
    return next(err);
  }

  let message = (err && err.message) || 'Something went wrong';
  if (isProduction && status >= 500) {
    message = 'Internal server error';
  }

  const payload = { error: message };
  if (err && err.details) {
    payload.details = err.details;
  }
  if (!isProduction && err && err.stack && status >= 500) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
/* eslint-enable no-unused-vars */

function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
      return result;
    } catch (err) {
      next(err);
      return undefined;
    }
  };
}

module.exports = { notFound, errorHandler, asyncHandler };