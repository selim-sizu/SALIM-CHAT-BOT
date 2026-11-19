'use strict';

const fs = require('fs');
const path = require('path');
const database = require('./database/database');
const v = require('../utils/validation');

const DEFAULT_JSON_PATH = path.resolve(__dirname, '..', 'replies', 'customReplies.json');

function parseId(id) {
  const number = Number(id);
  if (!Number.isInteger(number) || number < 1) {
    throw new v.ValidationError('ID একটি সঠিক সংখ্যা হতে হবে।');
  }
  return number;
}

function toReply(row) {
  const variations = database
    .getDb()
    .prepare('SELECT reply_text FROM reply_variations WHERE reply_id = ? ORDER BY id')
    .all(row.id)
    .map((item) => item.reply_text);
  return {
    id: row.id,
    trigger: row.trigger_text,
    matchType: row.match_type,
    replyMode: row.reply_mode,
    priority: row.priority,
    enabled: row.enabled === 1,
    groupId: row.group_id,
    replies: variations,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function insertVariations(replyId, replies) {
  const insert = database
    .getDb()
    .prepare('INSERT OR IGNORE INTO reply_variations (reply_id, reply_text) VALUES (?, ?)');
  for (const text of replies) insert.run(replyId, text);
}

function getReply(id) {
  const row = database.getDb().prepare('SELECT * FROM replies WHERE id = ?').get(parseId(id));
  return row ? toReply(row) : null;
}

function mustGetReply(id) {
  const reply = getReply(id);
  if (!reply) throw new v.ValidationError(`ID ${id} এর কোনো রিপ্লাই পাওয়া যায়নি।`);
  return reply;
}

function addReply(input = {}) {
  const data = {
    trigger: v.cleanTrigger(input.trigger),
    replies: v.cleanReplies(input.replies),
    matchType: v.cleanMatchType(input.matchType),
    replyMode: v.cleanReplyMode(input.replyMode),
    priority: v.cleanPriority(input.priority),
    enabled: v.cleanBoolean(input.enabled, true),
    groupId: v.cleanGroupId(input.groupId)
  };
  const db = database.getDb();
  const exists = db
    .prepare('SELECT id FROM replies WHERE trigger_text = ? AND group_id = ?')
    .get(data.trigger, data.groupId);
  if (exists) {
    throw new v.ValidationError(
      `"${data.trigger}" ট্রিগার আগে থেকেই আছে (ID ${exists.id})। নতুন না বানিয়ে এডিট করুন।`
    );
  }
  const create = db.transaction(() => {
    const result = db
      .prepare(
        'INSERT INTO replies (trigger_text, match_type, reply_mode, priority, enabled, group_id) ' +
          'VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        data.trigger,
        data.matchType,
        data.replyMode,
        data.priority,
        data.enabled ? 1 : 0,
        data.groupId
      );
    const id = Number(result.lastInsertRowid);
    insertVariations(id, data.replies);
    return id;
  });
  return getReply(create());
}

function updateReply(id, fields = {}) {
  const current = mustGetReply(id);
  const has = (key) => fields[key] !== undefined;
  const next = {
    trigger: has('trigger') ? v.cleanTrigger(fields.trigger) : current.trigger,
    matchType: has('matchType') ? v.cleanMatchType(fields.matchType) : current.matchType,
    replyMode: has('replyMode') ? v.cleanReplyMode(fields.replyMode) : current.replyMode,
    priority: has('priority') ? v.cleanPriority(fields.priority) : current.priority,
    enabled: has('enabled') ? v.cleanBoolean(fields.enabled) : current.enabled,
    groupId: has('groupId') ? v.cleanGroupId(fields.groupId) : current.groupId
  };
  const newReplies = has('replies') ? v.cleanReplies(fields.replies) : null;
  const db = database.getDb();
  const clash = db
    .prepare('SELECT id FROM replies WHERE trigger_text = ? AND group_id = ? AND id != ?')
    .get(next.trigger, next.groupId, current.id);
  if (clash) {
    throw new v.ValidationError(`"${next.trigger}" ট্রিগার এই গ্রুপে আগে থেকেই আছে (ID ${clash.id})।`);
  }
  const apply = db.transaction(() => {
    db.prepare(
      'UPDATE replies SET trigger_text = ?, match_type = ?, reply_mode = ?, priority = ?, ' +
        "enabled = ?, group_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(
      next.trigger,
      next.matchType,
      next.replyMode,
      next.priority,
      next.enabled ? 1 : 0,
      next.groupId,
      current.id
    );
    if (newReplies) {
      db.prepare('DELETE FROM reply_variations WHERE reply_id = ?').run(current.id);
      insertVariations(current.id, newReplies);
    }
  });
  apply();
  return getReply(current.id);
}

function deleteReply(id) {
  const current = mustGetReply(id);
  database.getDb().prepare('DELETE FROM replies WHERE id = ?').run(current.id);
  return current;
}

function setEnabled(id, enabled) {
  return updateReply(id, { enabled: v.cleanBoolean(enabled) });
}

function listReplies(filters = {}) {
  const where = [];
  const params = [];
  if (filters.groupId !== undefined && filters.groupId !== null && filters.groupId !== '') {
    where.push('r.group_id = ?');
    params.push(v.cleanGroupId(filters.groupId));
  }
  if (filters.enabled !== undefined && filters.enabled !== null) {
    where.push('r.enabled = ?');
    params.push(v.cleanBoolean(filters.enabled) ? 1 : 0);
  }
  if (filters.matchType) {
    where.push('r.match_type = ?');
    params.push(v.cleanMatchType(filters.matchType));
  }
  if (filters.search) {
    const like = `%${String(filters.search).toLowerCase().replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    where.push(
      "(LOWER(r.trigger_text) LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM reply_variations x " +
        "WHERE x.reply_id = r.id AND LOWER(x.reply_text) LIKE ? ESCAPE '\\'))"
    );
    params.push(like, like);
  }
  const sql =
    'SELECT r.* FROM replies r' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY r.id DESC';
  return database
    .getDb()
    .prepare(sql)
    .all(...params)
    .map(toReply);
}

function getStats() {
  const row = database
    .getDb()
    .prepare(
      'SELECT COUNT(*) AS total, ' +
        'COALESCE(SUM(enabled = 1), 0) AS enabled, ' +
        'COALESCE(SUM(enabled = 0), 0) AS disabled FROM replies'
    )
    .get();
  return { total: row.total, enabled: row.enabled, disabled: row.disabled };
}

// customReplies.json ফরম্যাটের অবজেক্ট ইমপোর্ট করে
function importFromObject(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new v.ValidationError('JSON একটি অবজেক্ট হতে হবে।');
  }
  const result = { added: 0, skipped: 0, errors: [] };
  for (const [trigger, config] of Object.entries(data)) {
    const c = config && typeof config === 'object' ? config : {};
    try {
      addReply({
        trigger,
        replies: c.replies,
        matchType: c.matchType,
        replyMode: c.replyMode,
        priority: c.priority,
        enabled: c.enabled,
        groupId: c.groupId !== undefined ? c.groupId : c.group
      });
      result.added += 1;
    } catch (error) {
      if (error instanceof v.ValidationError) {
        result.skipped += 1;
        result.errors.push(`${trigger}: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
  return result;
}

// ডাটাবেসে কোনো রিপ্লাই না থাকলে JSON ফাইল থেকে প্রথমবার লোড করে
function seedFromFileIfEmpty(filePath = DEFAULT_JSON_PATH) {
  if (getStats().total > 0) return null;
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return importFromObject(data);
}

module.exports = {
  addReply,
  updateReply,
  deleteReply,
  setEnabled,
  getReply,
  listReplies,
  getStats,
  importFromObject,
  seedFromFileIfEmpty,
  DEFAULT_JSON_PATH
};
