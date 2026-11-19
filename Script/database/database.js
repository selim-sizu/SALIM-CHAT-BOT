'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const DEFAULT_SETTINGS = {
  bot_name: 'SALIM CHAT BOT',
  owner_name: 'Salim Ahmad',
  prefix: '!',
  reply_delay_ms: '1000',
  auto_reply: 'on',
  maintenance_mode: 'off'
};

// নতুন টেবিল/কলাম লাগলে এখানে নতুন version যোগ হবে
const MIGRATIONS = [
  {
    version: 1,
    up(db) {
      db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    }
  }
];

let db = null;

function resolveDbPath(customPath) {
  if (customPath) return customPath;
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  return path.resolve(__dirname, '..', '..', 'data', 'salim-bot.db');
}

function runMigrations() {
  const current = db.pragma('user_version', { simple: true });
  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      const apply = db.transaction(() => {
        migration.up(db);
        db.pragma(`user_version = ${migration.version}`);
      });
      apply();
    }
  }
}

function seedDefaults() {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const seed = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run(key, value);
    }
  });
  seed();
}

function init(customPath) {
  if (db) return db;
  const file = resolveDbPath(customPath);
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations();
  seedDefaults();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database is not initialized. Call init() first.');
  return db;
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

// ---------- Settings ----------
function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, String(value));
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

// ---------- Groups ----------
function ensureGroup(groupId, name = '') {
  getDb()
    .prepare('INSERT OR IGNORE INTO chat_groups (group_id, name) VALUES (?, ?)')
    .run(String(groupId), name);
  if (name) {
    getDb()
      .prepare("UPDATE chat_groups SET name = ? WHERE group_id = ? AND name = ''")
      .run(name, String(groupId));
  }
  return getGroup(groupId);
}

function getGroup(groupId) {
  return getDb().prepare('SELECT * FROM chat_groups WHERE group_id = ?').get(String(groupId));
}

function listGroups() {
  return getDb().prepare('SELECT * FROM chat_groups ORDER BY created_at DESC').all();
}

function updateGroup(groupId, fields) {
  const allowed = ['name', 'bot_enabled', 'replies_enabled'];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(key === 'name' ? String(fields[key]) : fields[key] ? 1 : 0);
    }
  }
  if (sets.length === 0) return getGroup(groupId);
  values.push(String(groupId));
  getDb().prepare(`UPDATE chat_groups SET ${sets.join(', ')} WHERE group_id = ?`).run(...values);
  return getGroup(groupId);
}

// ---------- Duplicate message check ----------
// নতুন মেসেজ হলে true, আগে দেখা মেসেজ হলে false
function markMessageProcessed(messageId) {
  const result = getDb()
    .prepare('INSERT OR IGNORE INTO processed_messages (message_id) VALUES (?)')
    .run(String(messageId));
  return result.changes === 1;
}

function pruneProcessedMessages(days = 7) {
  return getDb()
    .prepare("DELETE FROM processed_messages WHERE created_at < datetime('now', ?)")
    .run(`-${Number(days)} days`).changes;
}

// ---------- Activity logs ----------
function addLog({ type, groupId = null, senderId = null, message = null, response = null }) {
  getDb()
    .prepare(
      'INSERT INTO activity_logs (type, group_id, sender_id, message, response) ' +
        'VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      String(type),
      groupId === null ? null : String(groupId),
      senderId === null ? null : String(senderId),
      message,
      response
    );
}

function getRecentLogs(limit = 20) {
  return getDb()
    .prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?')
    .all(Number(limit));
}

module.exports = {
  init,
  getDb,
  close,
  getSetting,
  setSetting,
  getAllSettings,
  ensureGroup,
  getGroup,
  listGroups,
  updateGroup,
  markMessageProcessed,
  pruneProcessedMessages,
  addLog,
  getRecentLogs,
  DEFAULT_SETTINGS
};
