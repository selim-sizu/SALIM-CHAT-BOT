'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const database = require('../Script/database/database');
const manager = require('../Script/replyManager');
const { createMessageHandler } = require('../Script/events/message');
const { SimulatorAdapter } = require('../adapters/simulatorAdapter');
const { ValidationError } = require('../utils/validation');

let adapter;
let commands;
let handler;

const isAdmin = (id) => id === 'admin';

beforeEach(() => {
  database.init(':memory:');
  database.setSetting('reply_delay_ms', '0');
  adapter = new SimulatorAdapter();
  commands = new Map([
    ['echo', { name: 'echo', adminOnly: false, execute: ({ argsText }) => `Echo: ${argsText}` }],
    ['secret', { name: 'secret', adminOnly: true, execute: () => 'Top secret' }],
    ['bad', { name: 'bad', adminOnly: false, execute: () => { throw new Error('boom'); } }],
    ['invalid', { name: 'invalid', adminOnly: false, execute: () => { throw new ValidationError('Bad input'); } }]
  ]);
  handler = createMessageHandler({ adapter, commands, isAdmin });
  adapter.onMessage(handler);
});

afterEach(() => {
  database.close();
});

test('custom reply is sent once', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  const result = await adapter.simulateIncoming({ groupId: 'g1', senderId: 'u1', text: 'Hi' });
  assert.strictEqual(result.action, 'reply');
  assert.strictEqual(adapter.getSentMessages().length, 1);
  assert.strictEqual(adapter.getSentMessages()[0].text, 'Hello');
});

test('bot ignores its own messages', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  const first = await adapter.simulateIncoming({ senderId: adapter.botId, text: 'hi' });
  const second = await adapter.simulateIncoming({ senderId: 'u1', text: 'hi', isFromBot: true });
  assert.strictEqual(first.reason, 'own-message');
  assert.strictEqual(second.reason, 'own-message');
  assert.strictEqual(adapter.getSentMessages().length, 0);
});

test('duplicate message id is not answered twice', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  const first = await adapter.simulateIncoming({ messageId: 'dup-1', text: 'hi' });
  const second = await adapter.simulateIncoming({ messageId: 'dup-1', text: 'hi' });
  assert.strictEqual(first.action, 'reply');
  assert.strictEqual(second.reason, 'duplicate');
  assert.strictEqual(adapter.getSentMessages().length, 1);
});

test('group-specific replies work', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Global'] });
  manager.addReply({ trigger: 'hi', replies: ['Group'], groupId: 'g1' });
  await adapter.simulateIncoming({ groupId: 'g1', text: 'hi' });
  await adapter.simulateIncoming({ groupId: 'g2', text: 'hi' });
  const texts = adapter.getSentMessages().map((m) => m.text);
  assert.deepStrictEqual(texts, ['Group', 'Global']);
});

test('disabled group is ignored, replies-off group still allows commands', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  database.ensureGroup('g3', 'Off');
  database.updateGroup('g3', { bot_enabled: false });
  database.ensureGroup('g4', 'NoReplies');
  database.updateGroup('g4', { replies_enabled: false });

  assert.strictEqual((await adapter.simulateIncoming({ groupId: 'g3', text: 'hi' })).reason, 'group-disabled');
  assert.strictEqual((await adapter.simulateIncoming({ groupId: 'g4', text: 'hi' })).reason, 'group-replies-off');
  assert.strictEqual((await adapter.simulateIncoming({ groupId: 'g4', text: '!echo ok' })).action, 'command');
  assert.strictEqual(adapter.getSentMessages().length, 1);
});

test('auto reply off stops custom replies but commands still work', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  database.setSetting('auto_reply', 'off');
  assert.strictEqual((await adapter.simulateIncoming({ text: 'hi' })).reason, 'auto-reply-off');
  assert.strictEqual((await adapter.simulateIncoming({ text: '!echo x' })).action, 'command');
});

test('maintenance mode silences everyone except admin commands', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  database.setSetting('maintenance_mode', 'on');
  assert.strictEqual((await adapter.simulateIncoming({ senderId: 'u1', text: 'hi' })).reason, 'maintenance');
  assert.strictEqual((await adapter.simulateIncoming({ senderId: 'u1', text: '!echo x' })).reason, 'maintenance');
  const admin = await adapter.simulateIncoming({ senderId: 'admin', text: '!echo x' });
  assert.strictEqual(admin.action, 'command');
  assert.strictEqual(adapter.getSentMessages()[0].text, 'Echo: x');
});

test('unauthorized admin command is blocked', async () => {
  const denied = await adapter.simulateIncoming({ senderId: 'u1', text: '!secret' });
  assert.strictEqual(denied.action, 'unauthorized');
  assert.ok(!adapter.getSentMessages()[0].text.includes('Top secret'));

  adapter.clearSent();
  const allowed = await adapter.simulateIncoming({ senderId: 'admin', text: '!secret' });
  assert.strictEqual(allowed.action, 'command');
  assert.strictEqual(adapter.getSentMessages()[0].text, 'Top secret');
});

test('command receives its arguments', async () => {
  await adapter.simulateIncoming({ text: '!echo hello world' });
  assert.strictEqual(adapter.getSentMessages()[0].text, 'Echo: hello world');
});

test('command errors never crash the bot', async () => {
  await adapter.simulateIncoming({ text: '!invalid' });
  await adapter.simulateIncoming({ text: '!bad' });
  const texts = adapter.getSentMessages().map((m) => m.text);
  assert.strictEqual(texts[0], 'Bad input');
  assert.ok(!texts[1].includes('boom'));
});

test('activity log is saved', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  await adapter.simulateIncoming({ groupId: 'g1', senderId: 'u1', text: 'hi' });
  const log = database.getRecentLogs(1)[0];
  assert.strictEqual(log.type, 'reply');
  assert.strictEqual(log.group_id, 'g1');
  assert.strictEqual(log.response, 'Hello');
});

test('only one reply is sent even if many triggers match', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Exact'], matchType: 'exact' });
  manager.addReply({ trigger: 'h', replies: ['Part'], matchType: 'contains' });
  await adapter.simulateIncoming({ text: 'hi' });
  assert.strictEqual(adapter.getSentMessages().length, 1);
});

test('configured reply delay is used', async () => {
  const waits = [];
  const delayed = createMessageHandler({
    adapter,
    commands,
    isAdmin,
    sleep: async (ms) => {
      waits.push(ms);
    }
  });
  adapter.onMessage(delayed);
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  database.setSetting('reply_delay_ms', '1500');
  await adapter.simulateIncoming({ text: 'hi' });
  assert.deepStrictEqual(waits, [1500]);
});

test('send failure is logged and does not crash', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  adapter.sendMessage = async () => {
    throw new Error('network down');
  };
  const result = await adapter.simulateIncoming({ text: 'hi' });
  assert.strictEqual(result.action, 'error');
  assert.strictEqual(database.getRecentLogs(1)[0].type, 'send_error');
});

test('invalid message is ignored', async () => {
  assert.strictEqual((await handler({})).reason, 'invalid');
  assert.strictEqual((await handler({ messageId: 'x', groupId: 'g', senderId: 'u' })).reason, 'invalid');
});
