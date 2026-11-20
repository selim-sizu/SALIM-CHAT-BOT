'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { rateLimit } = require('express-rate-limit');
const database = require('../Script/database/database');
const { ValidationError } = require('../utils/validation');
const { SqliteSessionStore } = require('./sessionStore');
const { ensureAdminUser, hasAdminUsers } = require('./adminUsers');
const { createAuthRouter, requireAuth, SESSION_COOKIE } = require('./routes/auth');
const { createOverviewRouter } = require('./routes/overview');
const { createRepliesRouter } = require('./routes/replies');
const { createSettingsRouter } = require('./routes/settings');
const { createGroupsRouter } = require('./routes/groups');

const PUBLIC_DIR = path.join(__dirname, 'public');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function securityHeaders(isProduction) {
  return (req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
        "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    });
    if (isProduction) {
      res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}

// অন্য সাইট থেকে আসা পরিবর্তনের রিকোয়েস্ট ব্লক করে
function sameOriginGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch (error) {
      host = null;
    }
    if (host !== req.get('host')) {
      return res.status(403).json({ error: 'Cross-site request blocked.' });
    }
  }
  if (req.method !== 'DELETE' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json.' });
  }
  return next();
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON.' });
  }
  if (error && error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large.' });
  }
  console.error('[dashboard] error:', error && error.message);
  return res.status(500).json({ error: 'Server error.' });
}

function createApp({ adapter = null, sessionSecret = process.env.SESSION_SECRET } = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  let secret = sessionSecret;
  if (!secret) {
    if (isProduction) throw new Error('SESSION_SECRET environment variable is required in production.');
    secret = crypto.randomBytes(32).toString('hex');
  }
  if (isProduction && secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }

  const app = express();
  app.disable('x-powered-by');
  if (isProduction || process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(securityHeaders(isProduction));

  // Render ও UptimeRobot এর জন্য: লগইন ছাড়াই খোলা, কোনো গোপন তথ্য নেই
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });

  app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));

  const store = new SqliteSessionStore(database.getDb(), { ttlMs: WEEK_MS });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false })
  );
  app.use('/api', sameOriginGuard);
  app.use('/api', express.json({ limit: '100kb' }));
  app.use(
    '/api',
    session({
      name: SESSION_COOKIE,
      secret,
      resave: false,
      saveUninitialized: false,
      store,
      cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: WEEK_MS }
    })
  );

  app.use('/api/auth', createAuthRouter());
  app.use('/api', requireAuth);
  app.use('/api/overview', createOverviewRouter({ adapter }));
  app.use('/api/replies', createRepliesRouter());
  app.use('/api/settings', createSettingsRouter());
  app.use('/api/groups', createGroupsRouter());
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(errorHandler);

  return { app, store };
}

// ADMIN_USERNAME ও ADMIN_PASSWORD থেকে অ্যাডমিন বানায় (পাসওয়ার্ড হ্যাশ হয়ে সেভ হয়)
function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) return ensureAdminUser(username, password);
  return hasAdminUsers() ? 'existing' : 'missing';
}

function startServer({
  port = Number(process.env.PORT) || 3000,
  adapter = null,
  sessionSecret = process.env.SESSION_SECRET
} = {}) {
  const { app, store } = createApp({ adapter, sessionSecret });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      resolve({
        app,
        server,
        port: server.address().port,
        close: () =>
          new Promise((done) => {
            store.close();
            server.close(() => done());
            if (server.closeAllConnections) server.closeAllConnections();
          })
      });
    });
    server.on('error', reject);
  });
}

module.exports = { createApp, startServer, bootstrapAdmin };
