'use strict';

const database = require('./database/database');
const { normalizeText, tokenize } = require('../utils/formatter');

const TYPE_RANK = { exact: 3, keyword: 2, contains: 1 };

function comparable(text) {
  const tokens = tokenize(text);
  return tokens.length ? tokens.join(' ') : normalizeText(text);
}

function hasSequence(messageTokens, keywordTokens) {
  if (keywordTokens.length === 0 || keywordTokens.length > messageTokens.length) return false;
  for (let i = 0; i <= messageTokens.length - keywordTokens.length; i += 1) {
    let ok = true;
    for (let j = 0; j < keywordTokens.length; j += 1) {
      if (messageTokens[i + j] !== keywordTokens[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function matches(rule, ctx) {
  if (rule.match_type === 'exact') {
    return comparable(rule.trigger_text) === ctx.comparable;
  }
  if (rule.match_type === 'contains') {
    return ctx.normalized.includes(normalizeText(rule.trigger_text));
  }
  if (rule.match_type === 'keyword') {
    return rule.trigger_text
      .split(/[,|]/)
      .some((part) => hasSequence(ctx.tokens, tokenize(part)));
  }
  return false;
}

// অগ্রাধিকার: priority বেশি > গ্রুপ-নির্দিষ্ট > exact/keyword/contains > লম্বা ট্রিগার > পুরোনো ID
function compareRules(a, b) {
  return (
    b.priority - a.priority ||
    Number(b.group_id !== 'global') - Number(a.group_id !== 'global') ||
    TYPE_RANK[b.match_type] - TYPE_RANK[a.match_type] ||
    b.trigger_text.length - a.trigger_text.length ||
    a.id - b.id
  );
}

function loadCandidates(groupId) {
  return database
    .getDb()
    .prepare("SELECT * FROM replies WHERE enabled = 1 AND group_id IN ('global', ?)")
    .all(String(groupId === undefined || groupId === null ? '' : groupId));
}

function getVariations(replyId) {
  return database
    .getDb()
    .prepare('SELECT reply_text FROM reply_variations WHERE reply_id = ? ORDER BY id')
    .all(replyId)
    .map((row) => row.reply_text);
}

// মেসেজের জন্য সঠিক রিপ্লাই খোঁজে; না পেলে null
function findReply({ text, groupId = null, random = Math.random }) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const ctx = { normalized, comparable: comparable(text), tokens: tokenize(text) };

  const matched = loadCandidates(groupId)
    .filter((rule) => matches(rule, ctx))
    .sort(compareRules);

  for (const rule of matched) {
    const variations = getVariations(rule.id);
    if (variations.length === 0) continue;
    const index =
      rule.reply_mode === 'fixed'
        ? 0
        : Math.min(variations.length - 1, Math.floor(random() * variations.length));
    return {
      replyId: rule.id,
      trigger: rule.trigger_text,
      matchType: rule.match_type,
      groupId: rule.group_id,
      reply: variations[index]
    };
  }
  return null;
}

module.exports = { findReply };
