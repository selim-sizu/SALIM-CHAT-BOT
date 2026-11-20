'use strict';

const express = require('express');
const database = require('../../Script/database/database');
const manager = require('../../Script/replyManager');
const { getAdminInfo } = require('../../admin/adminMessage');
const { getUptimeMs, formatDuration } = require('../../utils/uptime');

function describeConnection(status) {
  if (!status) return 'কোনো মেসেজিং adapter চালু নেই।';
  if (status.simulated) return 'Simulator (টেস্ট মোড): Facebook-এর সাথে সংযুক্ত নয়।';
  return status.connected ? `${status.name}: সংযুক্ত` : `${status.name}: সংযুক্ত নয়`;
}

function createOverviewRouter({ adapter = null } = {}) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const info = getAdminInfo();
    const status = adapter && typeof adapter.getStatus === 'function' ? adapter.getStatus() : null;
    res.json({
      status: info.maintenance ? 'MAINTENANCE' : 'ONLINE',
      maintenance: info.maintenance,
      uptime: formatDuration(getUptimeMs()),
      stats: manager.getStats(),
      groupsCount: database.listGroups().length,
      connection: describeConnection(status),
      recent: database.getRecentLogs(10)
    });
  });

  return router;
}

module.exports = { createOverviewRouter };
