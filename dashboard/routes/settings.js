'use strict';

const express = require('express');
const database = require('../../Script/database/database');
const { ValidationError, cleanBoolean } = require('../../utils/validation');
const { getAdminInfo } = require('../../admin/adminMessage');
const { getUptimeMs, formatDuration } = require('../../utils/uptime');

const KEYS = ['bot_name', 'owner_name', 'prefix', 'reply_delay_ms', 'auto_reply', 'maintenance_mode'];

function cleanName(label) {
  return (value) => {
    const text = String(value === undefined || value === null ? '' : value).trim();
    if (!text || text.length > 50) {
      throw new ValidationError(`${label} ১ থেকে ৫০ অক্ষরের হতে হবে।`);
    }
    return text;
  };
}

function cleanPrefix(value) {
  const text = String(value === undefined || value === null ? '' : value);
  if (!/^[^\s\p{L}\p{N}]{1,3}$/u.test(text)) {
    throw new ValidationError('প্রিফিক্স ১ থেকে ৩টি চিহ্ন হতে হবে (অক্ষর/সংখ্যা চলবে না)।');
  }
  return text;
}

function cleanDelay(value) {
  const number = Number(value === undefined || value === null ? 0 : value);
  if (!Number.isInteger(number) || number < 0 || number > 30000) {
    throw new ValidationError('Reply delay ০ থেকে ৩০০০০ ms এর মধ্যে পূর্ণ সংখ্যা হতে হবে।');
  }
  return String(number);
}

function cleanOnOff(value) {
  return cleanBoolean(value) ? 'on' : 'off';
}

const CLEANERS = {
  bot_name: cleanName('Bot name'),
  owner_name: cleanName('Owner name'),
  prefix: cleanPrefix,
  reply_delay_ms: cleanDelay,
  auto_reply: cleanOnOff,
  maintenance_mode: cleanOnOff
};

function snapshot() {
  const all = database.getAllSettings();
  const settings = {};
  for (const key of KEYS) settings[key] = all[key];
  return { settings, info: getAdminInfo(), uptime: formatDuration(getUptimeMs()) };
}

function createSettingsRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(snapshot());
  });

  router.put('/', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates = {};
    // আগে সব যাচাই, তারপর একসাথে সেভ (আংশিক সেভ হবে না)
    for (const key of KEYS) {
      if (body[key] !== undefined) updates[key] = CLEANERS[key](body[key]);
    }
    database.getDb().transaction(() => {
      for (const [key, value] of Object.entries(updates)) database.setSetting(key, value);
    })();
    res.json(snapshot());
  });

  return router;
}

module.exports = { createSettingsRouter };
