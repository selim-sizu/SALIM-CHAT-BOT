'use strict';

const { getUptimeMs, formatDuration } = require('../../utils/uptime');

module.exports = {
  name: 'uptime',
  description: 'বট কতক্ষণ ধরে চলছে',
  usage: 'uptime',
  adminOnly: false,
  execute() {
    return `⏱️ Uptime: ${formatDuration(getUptimeMs())}`;
  }
};
