'use strict';

const database = require('../database/database');
const { findReply } = require('../replyEngine');
const { ValidationError } = require('../../utils/validation');

const MAX_LOG_TEXT = 500;
const MAX_DELAY_MS = 30000;

const ignored = (reason) => ({ action: 'ignored', reason });

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultIsAdmin(senderId) {
  const ids = String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(String(senderId));
}

function clip(text) {
  const value = String(text === undefined || text === null ? '' : text);
  return value.length > MAX_LOG_TEXT ? value.slice(0, MAX_LOG_TEXT) : value;
}

function present(value) {
  return value !== undefined && value !== null && String(value) !== '';
}

function isValidMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    present(message.messageId) &&
    present(message.groupId) &&
    present(message.senderId) &&
    typeof message.text === 'string'
  );
}

function parseCommand(text, prefix) {
  const clean = String(text).trim();
  if (!prefix || !clean.startsWith(prefix)) return null;
  const rest = clean.slice(prefix.length).trim();
  if (!rest) return null;
  const parts = rest.split(/\s+/);
  return {
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
    argsText: rest.slice(parts[0].length).trim()
  };
}

function createMessageHandler({
  adapter,
  commands = new Map(),
  isAdmin = defaultIsAdmin,
  sleep = defaultSleep
}) {
  if (!adapter || typeof adapter.sendMessage !== 'function') {
    throw new Error('A messaging adapter is required.');
  }

  async function send(groupId, text) {
    const configured = Number(database.getSetting('reply_delay_ms', '0'));
    const delay = Math.min(Math.max(0, configured || 0), MAX_DELAY_MS);
    if (delay > 0) await sleep(delay);
    await adapter.sendMessage(groupId, text);
  }

  async function deliver(groupId, senderId, inputText, outputText, type, extra = {}) {
    try {
      await send(groupId, outputText);
    } catch (error) {
      database.addLog({
        type: 'send_error',
        groupId,
        senderId,
        message: clip(inputText),
        response: clip(error.message)
      });
      return { action: 'error', reason: 'send-failed' };
    }
    database.addLog({
      type,
      groupId,
      senderId,
      message: clip(inputText),
      response: clip(outputText)
    });
    return { action: type, reply: outputText, ...extra };
  }

  async function processMessage(message) {
    // 1-2. মেসেজ ঠিক আছে কিনা, এবং বটের নিজের মেসেজ কিনা
    if (!isValidMessage(message)) return ignored('invalid');
    const groupId = String(message.groupId);
    const senderId = String(message.senderId);
    const text = message.text.trim();

    if (message.isFromBot === true || senderId === String(adapter.botId)) {
      return ignored('own-message');
    }
    if (!text) return ignored('empty');

    // 3. ডুপ্লিকেট মেসেজ আইডি
    if (!database.markMessageProcessed(message.messageId)) return ignored('duplicate');

    // 4-5. গ্রুপ ও বট সেটিং
    const group = database.ensureGroup(groupId, message.groupName ? String(message.groupName) : '');
    const settings = database.getAllSettings();
    const admin = Boolean(isAdmin(senderId));
    const maintenance = settings.maintenance_mode === 'on';
    const botActive = !maintenance && group.bot_enabled === 1;

    // 6. কমান্ড
    const parsed = parseCommand(text, settings.prefix);
    const command = parsed ? commands.get(parsed.name) : null;

    if (command) {
      if (!botActive && !admin) return ignored(maintenance ? 'maintenance' : 'group-disabled');

      if (command.adminOnly && !admin) {
        database.addLog({ type: 'unauthorized_attempt', groupId, senderId, message: clip(text) });
        return deliver(groupId, senderId, text, '⛔ এই কমান্ড শুধু অ্যাডমিনদের জন্য।', 'unauthorized');
      }

      let output;
      try {
        output = await command.execute({
          args: parsed.args,
          argsText: parsed.argsText,
          commandName: parsed.name,
          message,
          groupId,
          senderId,
          senderName: message.senderName || '',
          isAdmin: admin,
          prefix: settings.prefix,
          settings,
          commands
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          output = error.message;
        } else {
          database.addLog({
            type: 'error',
            groupId,
            senderId,
            message: clip(text),
            response: clip(error.message)
          });
          output = 'দুঃখিত, কমান্ডটি চালাতে সমস্যা হয়েছে।';
        }
      }
      if (!output) return { action: 'command', reply: null };
      return deliver(groupId, senderId, text, String(output), 'command');
    }

    // 7. কাস্টম রিপ্লাই
    if (!botActive) return ignored(maintenance ? 'maintenance' : 'group-disabled');
    if (settings.auto_reply !== 'on') return ignored('auto-reply-off');
    if (group.replies_enabled !== 1) return ignored('group-replies-off');

    const found = findReply({ text, groupId });
    if (!found) return { action: 'none', reason: 'no-match' };

    // 8-9. একটি মেসেজের জন্য একটিই রিপ্লাই পাঠানো ও লগ
    return deliver(groupId, senderId, text, found.reply, 'reply', { replyId: found.replyId });
  }

  return async function handleMessage(message) {
    try {
      return await processMessage(message);
    } catch (error) {
      try {
        database.addLog({ type: 'error', response: clip(error.message) });
      } catch (logError) {
        // লগ লেখা না গেলেও বট যেন বন্ধ না হয়
      }
      return { action: 'error', reason: 'internal' };
    }
  };
}

module.exports = { createMessageHandler, parseCommand };
