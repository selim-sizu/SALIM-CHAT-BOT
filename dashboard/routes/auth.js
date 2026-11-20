'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { verifyLogin } = require('../adminUsers');

const SESSION_COOKIE = 'salim.sid';

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: 'লগইন করতে হবে।' });
}

function createAuthRouter() {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।' }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        !username ||
        !password ||
        username.length > 100 ||
        password.length > 200
      ) {
        return res.status(400).json({ error: 'ইউজারনেম ও পাসওয়ার্ড দিন।' });
      }
      const verified = await verifyLogin(username, password);
      if (!verified) {
        return res.status(401).json({ error: 'ইউজারনেম বা পাসওয়ার্ড ভুল।' });
      }
      return req.session.regenerate((regenerateError) => {
        if (regenerateError) return next(regenerateError);
        req.session.admin = { username: verified };
        return req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.json({ ok: true, username: verified });
        });
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(SESSION_COOKIE);
      return res.json({ ok: true });
    });
  });

  router.get('/me', (req, res) => {
    const admin = req.session && req.session.admin;
    res.json({ authenticated: Boolean(admin), username: admin ? admin.username : null });
  });

  return router;
}

module.exports = { createAuthRouter, requireAuth, SESSION_COOKIE };
