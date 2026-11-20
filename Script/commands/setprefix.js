'use strict';

const database = require('../database/database');
const { ValidationError } = require('../../utils/validation');

const showPrefix = {
  name: 'prefix',
  description: 'বর্তমান কমান্ড প্রিফিক্স',
  usage: 'prefix',
  adminOnly: false,
  execute({ prefix }) {
    return `💬 Current prefix: ${prefix}`;
  }
};

const setPrefix = {
  name: 'setprefix',
  description: 'কমান্ড প্রিফিক্স বদলান',
  usage: 'setprefix নতুন-চিহ্ন',
  adminOnly: true,
  execute({ args, prefix }) {
    const next = args[0];
    if (!next) throw new ValidationError(`ব্যবহার: ${prefix}setprefix #`);
    if (!/^[^\s\p{L}\p{N}]{1,3}$/u.test(next)) {
      throw new ValidationError('প্রিফিক্স ১ থেকে ৩টি চিহ্ন হতে হবে (অক্ষর/সংখ্যা চলবে না)।');
    }
    database.setSetting('prefix', next);
    return `✅ প্রিফিক্স বদলে "${next}" হয়েছে। এখন থেকে ${next}help লিখুন।`;
  }
};

module.exports = [showPrefix, setPrefix];
