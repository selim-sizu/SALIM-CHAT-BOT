'use strict';

const database = require('../database/database');
const { ValidationError } = require('../../utils/validation');

function parseOnOff(value, usage) {
  const text = String(value || '').toLowerCase();
  if (text === 'on') return true;
  if (text === 'off') return false;
  throw new ValidationError(usage);
}

const autoreply = {
  name: 'autoreply',
  description: 'অটো রিপ্লাই চালু/বন্ধ',
  usage: 'autoreply on|off',
  adminOnly: true,
  execute({ args, prefix }) {
    const on = parseOnOff(args[0], `ব্যবহার: ${prefix}autoreply on|off`);
    database.setSetting('auto_reply', on ? 'on' : 'off');
    return on ? '✅ Auto reply চালু হয়েছে।' : '⏸️ Auto reply বন্ধ হয়েছে। (কমান্ড কাজ করবে)';
  }
};

const group = {
  name: 'group',
  description: 'এই গ্রুপে বট চালু/বন্ধ (replies on|off দিয়ে শুধু রিপ্লাই)',
  usage: 'group on|off  অথবা  group replies on|off',
  adminOnly: true,
  execute({ args, prefix, groupId }) {
    const usage = `ব্যবহার: ${prefix}group on|off  অথবা  ${prefix}group replies on|off`;
    if (args[0] && args[0].toLowerCase() === 'replies') {
      const repliesOn = parseOnOff(args[1], usage);
      database.updateGroup(groupId, { replies_enabled: repliesOn });
      return repliesOn ? '✅ এই গ্রুপে কাস্টম রিপ্লাই চালু।' : '⏸️ এই গ্রুপে কাস্টম রিপ্লাই বন্ধ।';
    }
    const on = parseOnOff(args[0], usage);
    database.updateGroup(groupId, { bot_enabled: on });
    return on
      ? '✅ এই গ্রুপে বট চালু হয়েছে।'
      : `⏸️ এই গ্রুপে বট বন্ধ হয়েছে। শুধু অ্যাডমিন কমান্ড কাজ করবে। চালু করতে: ${prefix}group on`;
  }
};

const maintenance = {
  name: 'maintenance',
  description: 'মেইনটেন্যান্স মোড চালু/বন্ধ',
  usage: 'maintenance on|off',
  adminOnly: true,
  execute({ args, prefix }) {
    const on = parseOnOff(args[0], `ব্যবহার: ${prefix}maintenance on|off`);
    database.setSetting('maintenance_mode', on ? 'on' : 'off');
    return on
      ? '🟠 Maintenance mode চালু। শুধু অ্যাডমিন কমান্ড কাজ করবে।'
      : '🟢 Maintenance mode বন্ধ। বট আবার স্বাভাবিক।';
  }
};

module.exports = [autoreply, group, maintenance];
