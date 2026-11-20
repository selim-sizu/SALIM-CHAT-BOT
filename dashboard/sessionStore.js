'use strict';

const session = require('express-session');

// সেশন SQLite-এ রাখে, তাই রিস্টার্টেও লগইন থাকে
class SqliteSessionStore extends session.Store {
  constructor(db, { ttlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
    super();
    this.db = db;
    this.ttlMs = ttlMs;
    db.exec(
      'CREATE TABLE IF NOT EXISTS sessions (' +
        'sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at INTEGER NOT NULL)'
    );
    this.timer = setInterval(() => this.prune(), 15 * 60 * 1000);
    this.timer.unref();
  }

  prune() {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    } catch (error) {
      // ডাটাবেস বন্ধ থাকলে চুপচাপ বাদ
    }
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row || row.expires_at < Date.now()) return callback(null, null);
      return callback(null, JSON.parse(row.data));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sess, callback) {
    try {
      const expires =
        sess.cookie && sess.cookie.expires
          ? new Date(sess.cookie.expires).getTime()
          : Date.now() + this.ttlMs;
      this.db
        .prepare(
          'INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?) ' +
            'ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at'
        )
        .run(sid, JSON.stringify(sess), expires);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  touch(sid, sess, callback) {
    this.set(sid, sess, callback);
  }

  destroy(sid, callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  close() {
    clearInterval(this.timer);
  }
}

module.exports = { SqliteSessionStore };
