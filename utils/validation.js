'use strict';

const { normalizeText } = require('./formatter');

const MATCH_TYPES = ['exact', 'keyword', 'contains'];
const REPLY_MODES = ['random', 'fixed'];
const MAX_TRIGGER_LENGTH = 200;
const MAX_REPLY_LENGTH = 2000;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function cleanTrigger(value) {
  const text = normalizeText(value);
  if (!text) throw new ValidationError('ট্রিগার খালি রাখা যাবে না।');
  if (text.length > MAX_TRIGGER_LENGTH) {
    throw new ValidationError(`ট্রিগার সর্বোচ্চ ${MAX_TRIGGER_LENGTH} অক্ষরের হতে পারে।`);
  }
  return text;
}

function cleanReplies(value) {
  const list = Array.isArray(value) ? value : [value];
  const result = [];
  for (const item of list) {
    const text = String(item === undefined || item === null ? '' : item).trim();
    if (!text) continue;
    if (text.length > MAX_REPLY_LENGTH) {
      throw new ValidationError(`একটি রিপ্লাই সর্বোচ্চ ${MAX_REPLY_LENGTH} অক্ষরের হতে পারে।`);
    }
    if (!result.includes(text)) result.push(text);
  }
  if (result.length === 0) {
    throw new ValidationError('কমপক্ষে একটি রিপ্লাই দিতে হবে।');
  }
  return result;
}

function cleanMatchType(value) {
  const type = String(value === undefined || value === null ? 'exact' : value)
    .toLowerCase()
    .trim();
  if (!MATCH_TYPES.includes(type)) {
    throw new ValidationError(`Match type শুধু ${MATCH_TYPES.join(', ')} হতে পারে।`);
  }
  return type;
}

function cleanReplyMode(value) {
  const mode = String(value === undefined || value === null ? 'random' : value)
    .toLowerCase()
    .trim();
  if (!REPLY_MODES.includes(mode)) {
    throw new ValidationError(`Reply mode শুধু ${REPLY_MODES.join(', ')} হতে পারে।`);
  }
  return mode;
}

function cleanPriority(value) {
  const number = Number(value === undefined || value === null || value === '' ? 0 : value);
  if (!Number.isInteger(number) || number < -1000 || number > 1000) {
    throw new ValidationError('Priority -1000 থেকে 1000 এর মধ্যে পূর্ণ সংখ্যা হতে হবে।');
  }
  return number;
}

function cleanBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase().trim();
  if (['1', 'true', 'on', 'yes'].includes(text)) return true;
  if (['0', 'false', 'off', 'no'].includes(text)) return false;
  throw new ValidationError('মান শুধু on/off বা true/false হতে পারে।');
}

// খালি, "all" বা "global" মানে সব গ্রুপ
function cleanGroupId(value) {
  if (value === undefined || value === null) return 'global';
  const text = String(value).trim();
  if (text === '' || text.toLowerCase() === 'all' || text.toLowerCase() === 'global') {
    return 'global';
  }
  if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(text)) {
    throw new ValidationError('গ্রুপ ID তে শুধু ইংরেজি অক্ষর, সংখ্যা এবং _ . : - থাকতে পারে।');
  }
  return text;
}

module.exports = {
  ValidationError,
  MATCH_TYPES,
  REPLY_MODES,
  cleanTrigger,
  cleanReplies,
  cleanMatchType,
  cleanReplyMode,
  cleanPriority,
  cleanBoolean,
  cleanGroupId
};
