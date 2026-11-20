'use strict';

const database = require('../database/database');
const { buildAdminMessage } = require('../../admin/adminMessage');

const info = {
  name: 'info',
  description: 'বটের তথ্য ও অবস্থা',
  usage: 'info',
  adminOnly: false,
  execute() {
    return buildAdminMessage();
  }
};

const state = (group) =>
  `${group.bot_enabled ? '🟢' : '🔴'} বট | ${group.replies_enabled ? '🟢' : '🔴'} রিপ্লাই`;

const groups = {
  name: 'groups',
  description: 'গ্রুপের তথ্য (অ্যাডমিন সব গ্রুপ দেখে)',
  usage: 'groups',
  adminOnly: false,
  execute({ isAdmin, groupId }) {
    if (!isAdmin) {
      const current = database.getGroup(groupId);
      return `👥 এই গ্রুপ\n🆔 ${groupId}\n${state(current)}`;
    }
    const all = database.listGroups().slice(0, 15);
    if (all.length === 0) return 'এখনো কোনো গ্রুপ নিবন্ধিত নেই।';
    const lines = all.map(
      (group, index) => `${index + 1}. ${group.name || '(নাম নেই)'}\n   🆔 ${group.group_id}\n   ${state(group)}`
    );
    return `👥 গ্রুপ তালিকা (${all.length})\n\n${lines.join('\n')}`;
  }
};

module.exports = [info, groups];
