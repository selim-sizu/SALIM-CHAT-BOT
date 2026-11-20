'use strict';

const bcrypt = require('bcryptjs');
const database = require('../Script/database/database');

// ইউজার না পাওয়া গেলেও একই সময় লাগানোর জন্য (টাইমিং অ্যাটাক ঠেকাতে)
const DUMMY_HASH = bcrypt.hashSync('timing-protection-password', 10);
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

function ensureAdminUser(username, password) {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    throw new Error('ADMIN_USERNAME ৩-৩২ অক্ষরের হতে হবে (ইংরেজি অক্ষর, সংখ্যা, _ . - চলবে)।');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new Error('ADMIN_PASSWORD কমপক্ষে ৮ অক্ষরের হতে হবে (১২+ হলে ভালো)।');
  }
  const db = database.getDb();
  const row = db
    .prepare('SELECT id, password_hash FROM admin_users WHERE username = ?')
    .get(username);

  if (!row) {
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
      username,
      bcrypt.hashSync(password, 10)
    );
    return 'created';
  }
  if (!bcrypt.compareSync(password, row.password_hash)) {
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(password, 10),
      row.id
    );
    return 'updated';
  }
  return 'unchanged';
}

function hasAdminUsers() {
  return database.getDb().prepare('SELECT COUNT(*) AS c FROM admin_users').get().c > 0;
}

// সফল হলে ইউজারনেম, নইলে null
async function verifyLogin(username, password) {
  const row = database
    .getDb()
    .prepare('SELECT username, password_hash FROM admin_users WHERE username = ?')
    .get(username);
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  return row && ok ? row.username : null;
}

module.exports = { ensureAdminUser, hasAdminUsers, verifyLogin };
