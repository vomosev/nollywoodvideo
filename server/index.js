'use strict';

require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');

const { createSessionMiddleware } = require('./config/session');
const { checkDatabaseConnection } = require('./config/db');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const apiRouter = require('./routes');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const ALLOWED_SUFFIX = process.env.CORS_ALLOWED_SUFFIX || '.arx-app.com';
const isDev = process.env.NODE_ENV !== 'production';

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / server-to-server / curl
  let hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch (err) {
    return false;
  }
  if (hostname === ALLOWED_SUFFIX.replace(/^\./, '')) return true;
  if (hostname.endsWith(ALLOWED_SUFFIX)) return true;
  if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')) {
    return true;
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.options('*', cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Session support (MySQL backed). If the store cannot be created the API still
// boots so /health remains useful for diagnostics.
try {
  app.use(createSessionMiddleware());
} catch (err) {
  console.error('[nollywoodvideo] Failed to initialise session middleware:', err.message);
}

app.use(attachUser);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

function buildServer() {
  if (process.env.SSL_ENABLED === 'true') {
    const certPath = process.env.SSL_CERT_PATH || '/home/arx-app/backends/certs/certificate.crt';
    const keyPath = process.env.SSL_KEY_PATH || '/home/arx-app/backends/certs/private.key';
    const caPath = process.env.SSL_CA_PATH;

    try {
      const options = {
        cert: fs.readFileSync(path.resolve(certPath)),
        key: fs.readFileSync(path.resolve(keyPath)),
      };
      if (caPath && fs.existsSync(path.resolve(caPath))) {
        options.ca = fs.readFileSync(path.resolve(caPath));
      }
      console.log('[nollywoodvideo] TLS enabled — serving HTTPS.');
      return https.createServer(options, app);
    } catch (err) {
      console.error('[nollywoodvideo] Unable to read TLS material:', err.message);
      console.error('[nollywoodvideo] Falling back to plain HTTP.');
      return http.createServer(app);
    }
  }
  return http.createServer(app);
}

const server = buildServer();

server.on('error', (err) => {
  console.error('[nollywoodvideo] Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`[nollywoodvideo] API listening on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
  try {
    const dbOk = await checkDatabaseConnection();
    console.log(`[nollywoodvideo] Database reachable: ${dbOk}`);
  } catch (err) {
    console.error('[nollywoodvideo] Database check failed:', err.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[nollywoodvideo] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[nollywoodvideo] Uncaught exception:', err);
});

function shutdown(signal) {
  console.log(`[nollywoodvideo] Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };