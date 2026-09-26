'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { validateSignup, validateLogin } = require('../utils/validators');
const { asyncHandler } = require('../middleware/errorHandler');

const SESSION_COOKIE_NAME = 'nv.sid';

function safeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      resolve();
      return;
    }
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') {
      resolve();
      return;
    }
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.destroy !== 'function') {
      resolve();
      return;
    }
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * POST /api/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateSignup(req.body || {});
  if (!valid) {
    return res.status(400).json({ error: 'Invalid signup details', errors });
  }

  const email = String(value.email).toLowerCase().trim();

  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(value.password, 10);

  let insertResult;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [value.name, email, passwordHash, 'viewer']
    );
    insertResult = result;
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [insertResult.insertId]
  );
  const user = safeUser(rows[0]);

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);

  return res.status(201).json({ user });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateLogin(req.body || {});
  if (!valid) {
    return res.status(400).json({ error: 'Invalid login details', errors });
  }

  const email = String(value.email).toLowerCase().trim();

  const [rows] = await pool.query(
    'SELECT id, name, email, role, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const row = rows[0];
  const matches = await bcrypt.compare(value.password, row.password_hash || '');
  if (!matches) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  await regenerateSession(req);
  req.session.userId = row.id;
  await saveSession(req);

  return res.json({ user: safeUser(row) });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    path: '/'
  });
  return res.json({ loggedOut: true });
});

/**
 * GET /api/auth/me  (behind requireAuth)
 */
const me = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user) {
    return res.json({ user: safeUser(req.user) });
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (rows.length === 0) {
    await destroySession(req);
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.json({ user: safeUser(rows[0]) });
});

module.exports = { signup, login, logout, me };