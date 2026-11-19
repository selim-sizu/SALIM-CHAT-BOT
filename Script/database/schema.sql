CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_groups (
  group_id        TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  bot_enabled     INTEGER NOT NULL DEFAULT 1,
  replies_enabled INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS replies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_text TEXT NOT NULL,
  match_type   TEXT NOT NULL DEFAULT 'exact'
               CHECK (match_type IN ('exact', 'keyword', 'contains')),
  reply_mode   TEXT NOT NULL DEFAULT 'random'
               CHECK (reply_mode IN ('random', 'fixed')),
  priority     INTEGER NOT NULL DEFAULT 0,
  enabled      INTEGER NOT NULL DEFAULT 1,
  group_id     TEXT NOT NULL DEFAULT 'global',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (trigger_text, group_id)
);

CREATE TABLE IF NOT EXISTS reply_variations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  reply_id   INTEGER NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  UNIQUE (reply_id, reply_text)
);

CREATE INDEX IF NOT EXISTS idx_variations_reply ON reply_variations(reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_group ON replies(group_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  group_id   TEXT,
  sender_id  TEXT,
  message    TEXT,
  response   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);

CREATE TABLE IF NOT EXISTS processed_messages (
  message_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
