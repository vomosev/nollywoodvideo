'use strict';

const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const { pool } = require('./db');

const MySQLStore = MySQLStoreFactory(session);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

let cachedMiddleware = null;

/**
 * Builds (and memoises) the express-session middleware backed by the
 * MySQL `sessions` table defined in schema.sql.
 */
function createSessionMiddleware() {
  if (cachedMiddleware) {
    return cachedMiddleware;
  }

  let store;

  try {
    store = new MySQLStore(
      {
        clearExpired: true,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: SEVEN_DAYS_MS,
        createDatabaseTable: true,
        charset: 'utf8mb4_general_ci',
        schema: {
          tableName: 'sessions',
          columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
          }
        }
      },
      pool
    );

    store.on('error', (err) => {
      console.error('[session] MySQL session store error:', err.message);
    });
  } catch (err) {
    console.error(
      '[session] Failed to initialise MySQL session store, falling back to in-memory store:',
      err.message
    );
    store = undefined;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const options = {
    name: 'nv.sid',
    secret: process.env.SESSION_SECRET || 'nollywoodvideo-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      path: '/',
      maxAge: SEVEN_DAYS_MS
    }
  };

  if (store) {
    options.store = store;
  }

  if (!isProduction && process.env.SSL_ENABLED !== 'true') {
    // Browsers reject SameSite=None cookies without Secure; relax for plain
    // HTTP local development only.
    options.cookie.secure = false;
    options.cookie.sameSite = 'lax';
  }

  cachedMiddleware = session(options);
  return cachedMiddleware;
}

module.exports = { createSessionMiddleware };