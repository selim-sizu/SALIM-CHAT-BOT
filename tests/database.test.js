'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const database = require('../Script/database/database');

test('default settings are created', () => {
  database.init(':memory:');
  assert.strictEqual(database.getSetting('prefix'), '!');
  assert.strictEqual(database.getSetting('owner_name'), 'Salim Ahmad');
  database.close();
});

test('duplicate message id is detected', () => {
  database.init(':memory:');
  assert.strictEqual(database.markMessageProcessed('msg-1'), true);
  assert.strictEqual(database.markMessageProcessed('msg-1'), false);
  database.close();
});

test('group settings can be updated', () => {
  database.init(':memory:');
  database.ensureGroup('g1', 'Test Group');
  database.updateGroup('g1', { bot_enabled: false });
  assert.strictEqual(database.getGroup('g1').bot_enabled, 0);
  assert.strictEqual(database.getGroup('g1').replies_enabled, 1);
  database.close();
});

test('deleting a reply removes its variations', () => {
  const db = database.init(':memory:');
  const id = db
    .prepare("INSERT INTO replies (trigger_text) VALUES ('hi')")
    .run().lastInsertRowid;
  db.prepare('INSERT INTO reply_variations (reply_id, reply_text) VALUES (?, ?)').run(id, 'Hello');
  db.prepare('DELETE FROM replies WHERE id = ?').run(id);
  const count = db.prepare('SELECT COUNT(*) AS c FROM reply_variations').get().c;
  assert.strictEqual(count, 0);
  database.close();
});

test('data persists after restart', () => {
  const file = path.join(os.tmpdir(), `salim-test-${Date.now()}.db`);
  database.init(file);
  database.setSetting('prefix', '#');
  database.close();

  database.init(file);
  assert.strictEqual(database.getSetting('prefix'), '#');
  database.close();

  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(file + suffix)) fs.unlinkSync(file + suffix);
  }
});
