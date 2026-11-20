'use strict';

const { getAdminInfo } = require('../../admin/adminMessage');

module.exports = {
  name: 'owner',
  description: 'বটের মালিকের তথ্য',
  usage: 'owner',
  adminOnly: false,
  execute() {
    const info = getAdminInfo();
    return `👑 Owner: ${info.ownerName}\n💻 Developer: ${info.developer}`;
  }
};
