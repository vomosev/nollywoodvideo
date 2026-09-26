'use strict';

/**
 * Pure validation helpers for the NollywoodVideo API.
 * No framework dependencies — every helper returns plain data.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isNonEmptyString(value, maxLength) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (typeof maxLength === 'number' && trimmed.length > maxLength) return false;
  return true;
}

function isEmail(value) {
  if (!isNonEmptyString(value, 255)) return false;
  return EMAIL_RE.test(value.trim());
}

function toPlainObject(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  return {};
}

function validateSignup(body) {
  const src = toPlainObject(body);
  const errors = {};

  const name = typeof src.name === 'string' ? src.name.trim() : '';
  const email = typeof src.email === 'string' ? src.email.trim().toLowerCase() : '';
  const password = typeof src.password === 'string' ? src.password : '';

  if (!isNonEmptyString(name, 120)) {
    errors.name = 'Name is required and must be 120 characters or fewer.';
  }
  if (!isEmail(email)) {
    errors.email = 'A valid email address is required.';
  }
  if (typeof password !== 'string' || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (password.length > 200) {
    errors.password = 'Password must be 200 characters or fewer.';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid ? { name, email, password } : null
  };
}

function validateLogin(body) {
  const src = toPlainObject(body);
  const errors = {};

  const email = typeof src.email === 'string' ? src.email.trim().toLowerCase() : '';
  const password = typeof src.password === 'string' ? src.password : '';

  if (!isEmail(email)) {
    errors.email = 'A valid email address is required.';
  }
  if (!isNonEmptyString(password, 200)) {
    errors.password = 'Password is required.';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid ? { email, password } : null
  };
}

function validateReview(body) {
  const src = toPlainObject(body);
  const errors = {};

  const ratingRaw = src.rating;
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Rating must be a whole number between 1 and 5.';
  }

  let text = typeof src.body === 'string' ? src.body.trim() : '';
  if (text.length > 2000) {
    errors.body = 'Review must be 2000 characters or fewer.';
  }
  if (text.length === 0) {
    text = '';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid ? { rating, body: text } : null
  };
}

function parsePagination(query) {
  const src = toPlainObject(query);

  let page = Number.parseInt(src.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (page > 10000) page = 10000;

  let limit = Number.parseInt(src.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 12;
  if (limit > 60) limit = 60;

  const offset = (page - 1) * limit;

  return {
    valid: true,
    errors: {},
    value: { page, limit, offset }
  };
}

function parsePositiveInt(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

module.exports = {
  isEmail,
  isNonEmptyString,
  validateSignup,
  validateLogin,
  validateReview,
  parsePagination,
  parsePositiveInt
};