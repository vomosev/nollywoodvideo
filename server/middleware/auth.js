const { pool } = require('../config/db');

/**
 * Blocks the request when there is no authenticated session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

/**
 * Loads the current user row onto req.user when a session exists.
 * Never fails the request: on DB trouble it simply leaves req.user null.
 */
async function attachUser(req, res, next) {
  req.user = null;

  if (!req.session || !req.session.userId) {
    return next();
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      req.user = rows[0];
    } else {
      // Stale session pointing at a deleted user - clear it.
      req.session.userId = null;
    }
  } catch (err) {
    console.error('[attachUser] Failed to load session user:', err.message);
  }

  return next();
}

module.exports = { requireAuth, attachUser };