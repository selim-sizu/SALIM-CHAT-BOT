'use strict';

const manager = require('../replyManager');
const { ValidationError, MATCH_TYPES } = require('../../utils/validation');

const PAGE_SIZE = 10;

function clip(text, max) {
  const value = String(text);
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function splitReplies(text) {
  return String(text)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

function summary(reply) {
  return [
    `🆔 ID: ${reply.id}`,
    `🔑 Trigger: ${clip(reply.trigger, 60)}`,
    `🎯 Type: ${reply.matchType} | Mode: ${reply.replyMode} | Priority: ${reply.priority}`,
    `${reply.enabled ? '✅ ON' : '❌ OFF'} | 💬 ${reply.replies.length} টি রিপ্লাই`
  ].join('\n');
}

function singleId(args, usage) {
  if (args.length !== 1) throw new ValidationError(usage);
  return args[0];
}

const replyadd = {
  name: 'replyadd',
  description: 'নতুন রিপ্লাই যোগ করুন',
  usage: 'replyadd [exact|keyword|contains] ট্রিগার | রিপ্লাই১ | রিপ্লাই২',
  adminOnly: true,
  execute({ argsText, prefix }) {
    const usage = `ব্যবহার: ${prefix}replyadd [exact|keyword|contains] ট্রিগার | রিপ্লাই১ | রিপ্লাই২`;
    const segments = argsText.split('|').map((part) => part.trim());
    const head = segments.shift() || '';
    const replies = segments.filter(Boolean);
    if (!head || replies.length === 0) throw new ValidationError(usage);

    const words = head.split(/\s+/);
    let matchType = 'exact';
    let trigger = head;
    if (words.length >= 2 && MATCH_TYPES.includes(words[0].toLowerCase())) {
      matchType = words[0].toLowerCase();
      trigger = head.slice(words[0].length).trim();
    }
    const reply = manager.addReply({ trigger, replies, matchType });
    return `✅ রিপ্লাই যোগ হয়েছে\n${summary(reply)}`;
  }
};

const replylist = {
  name: 'replylist',
  description: 'রিপ্লাইয়ের তালিকা (পেজ নম্বর বা সার্চ শব্দ দিন)',
  usage: 'replylist [পেজ | সার্চ]',
  adminOnly: true,
  execute({ args, prefix }) {
    let page = 1;
    let search;
    if (args.length === 1 && /^\d+$/.test(args[0])) {
      page = Number(args[0]);
    } else if (args.length > 0) {
      search = args.join(' ');
    }
    const all = manager.listReplies({ search });
    if (all.length === 0) return search ? 'কিছু পাওয়া যায়নি।' : 'এখনো কোনো রিপ্লাই নেই।';

    const pages = Math.ceil(all.length / PAGE_SIZE);
    page = Math.min(Math.max(1, page), pages);
    const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const lines = items.map((reply) => {
      const scope = reply.groupId === 'global' ? '' : ` @${clip(reply.groupId, 12)}`;
      return `${reply.enabled ? '✅' : '❌'} #${reply.id} ${clip(reply.trigger, 30)} [${reply.matchType}${scope}] (${reply.replies.length})`;
    });
    const footer = pages > 1 && page < pages ? `\n\nপরের পেজ: ${prefix}replylist ${page + 1}` : '';
    return `📋 রিপ্লাই তালিকা (পেজ ${page}/${pages}, মোট ${all.length})\n\n${lines.join('\n')}${footer}`;
  }
};

const replyedit = {
  name: 'replyedit',
  description: 'রিপ্লাই এডিট করুন',
  usage: 'replyedit ID trigger|replies|type|mode|priority নতুন-মান',
  adminOnly: true,
  execute({ argsText, prefix }) {
    const usage = `ব্যবহার: ${prefix}replyedit ID trigger|replies|type|mode|priority নতুন-মান`;
    const match = argsText.match(/^(\S+)\s+(\S+)\s*([\s\S]*)$/);
    if (!match) throw new ValidationError(usage);
    const id = match[1];
    const field = match[2].toLowerCase();
    const value = match[3].trim();
    if (!value) throw new ValidationError(usage);

    const changes = {};
    if (field === 'trigger') changes.trigger = value;
    else if (field === 'replies') changes.replies = splitReplies(value);
    else if (field === 'type') changes.matchType = value;
    else if (field === 'mode') changes.replyMode = value;
    else if (field === 'priority') changes.priority = value;
    else throw new ValidationError(usage);

    const updated = manager.updateReply(id, changes);
    return `✏️ আপডেট হয়েছে\n${summary(updated)}`;
  }
};

const replyremove = {
  name: 'replyremove',
  description: 'রিপ্লাই মুছে ফেলুন',
  usage: 'replyremove ID',
  adminOnly: true,
  execute({ args, prefix }) {
    const id = singleId(args, `ব্যবহার: ${prefix}replyremove ID`);
    const removed = manager.deleteReply(id);
    return `🗑️ মুছে ফেলা হয়েছে: ${clip(removed.trigger, 40)} (ID ${removed.id})`;
  }
};

const replyon = {
  name: 'replyon',
  description: 'রিপ্লাই চালু করুন',
  usage: 'replyon ID',
  adminOnly: true,
  execute({ args, prefix }) {
    const id = singleId(args, `ব্যবহার: ${prefix}replyon ID`);
    const updated = manager.setEnabled(id, true);
    return `✅ চালু হয়েছে\n${summary(updated)}`;
  }
};

const replyoff = {
  name: 'replyoff',
  description: 'রিপ্লাই বন্ধ করুন',
  usage: 'replyoff ID',
  adminOnly: true,
  execute({ args, prefix }) {
    const id = singleId(args, `ব্যবহার: ${prefix}replyoff ID`);
    const updated = manager.setEnabled(id, false);
    return `⏸️ বন্ধ হয়েছে\n${summary(updated)}`;
  }
};

module.exports = [replyadd, replylist, replyedit, replyremove, replyon, replyoff];
