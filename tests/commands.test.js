'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const database = require('../Script/database/database');
const manager = require('../Script/replyManager');
const { loadCommands } = require('../Script/commands');
const { createMessageHandler } = require('../Script/events/message');
const { SimulatorAdapter } = require('../adapters/simulatorAdapter');
const { formatDuration } = require('../utils/uptime');

let adapter;

beforeEach(() => {
  database.init(':memory:');
  database.setSetting('reply_delay_ms', '0');
  adapter = new SimulatorAdapter();
  adapter.onMessage(
    createMessageHandler({ adapter, commands: loadCommands(), isAdmin: (id) => id === 'admin' })
  );
});

afterEach(() => {
  database.close();
});

async function say(senderId, text, groupId = 'g1') {
  adapter.clearSent();
  const result = await adapter.simulateIncoming({ senderId, text, groupId });
  const sent = adapter.getSentMessages();
  return { result, text: sent.length ? sent[sent.length - 1].text : null };
}

test('all commands are loaded', () => {
  const commands = loadCommands();
  const names = [
    'help', 'owner', 'info', 'ping', 'uptime', 'prefix', 'groups',
    'replyadd', 'replylist', 'replyedit', 'replyremove', 'replyon', 'replyoff',
    'setprefix', 'autoreply', 'group', 'maintenance'
  ];
  for (const name of names) {
    assert.ok(commands.has(name), `missing command: ${name}`);
  }
});

test('help hides admin commands from normal users', async () => {
  const user = await say('u1', '!help');
  assert.ok(user.text.includes('!ping'));
  assert.ok(!user.text.includes('replyadd'));
  assert.ok(!user.text.includes('setprefix'));
  const admin = await say('admin', '!help');
  assert.ok(admin.text.includes('!replyadd'));
  assert.ok(admin.text.includes('!maintenance'));
});

test('owner and info messages use the config', async () => {
  const owner = await say('u1', '!owner');
  assert.ok(owner.text.includes('Salim Ahmad'));
  const info = await say('u1', '!info');
  assert.ok(info.text.includes('╭━━━〔 SALIM CHAT BOT 〕━━━╮'));
  assert.ok(info.text.includes('Prefix: !'));
  assert.ok(info.text.includes('Uptime:'));
  assert.ok(info.text.includes('Developed by Salim Ahmad'));
});

test('owner name changed in settings overrides the config file', async () => {
  database.setSetting('owner_name', 'Test Owner');
  const owner = await say('u1', '!owner');
  assert.ok(owner.text.includes('Test Owner'));
});

test('ping works', async () => {
  const ping = await say('u1', '!ping');
  assert.ok(ping.text.startsWith('🏓 Pong'));
});

test('uptime command works', async () => {
  const uptime = await say('u1', '!uptime');
  assert.ok(uptime.text.includes('Uptime'));
});

test('formatDuration formats time', () => {
  assert.strictEqual(formatDuration(8100000), '2h 15m');
  assert.strictEqual(formatDuration(45000), '45s');
  assert.strictEqual(formatDuration(90061000), '1d 1h 1m');
});

test('normal users cannot use admin commands', async () => {
  const blocked = [
    '!replyadd hi | Hello', '!replylist', '!replyedit 1 priority 3', '!replyremove 1',
    '!replyon 1', '!replyoff 1', '!setprefix #', '!autoreply off', '!group off', '!maintenance on'
  ];
  for (const text of blocked) {
    const { result } = await say('u1', text);
    assert.strictEqual(result.action, 'unauthorized', text);
  }
  assert.strictEqual(manager.getStats().total, 0);
  assert.strictEqual(database.getSetting('prefix'), '!');
  assert.strictEqual(database.getSetting('auto_reply'), 'on');
  assert.strictEqual(database.getSetting('maintenance_mode'), 'off');
  assert.strictEqual(database.getGroup('g1').bot_enabled, 1);
});

test('replyadd creates an exact reply', async () => {
  const added = await say('admin', '!replyadd hi | Hello | Hey');
  assert.ok(added.text.includes('রিপ্লাই যোগ হয়েছে'));
  const reply = await say('u1', 'hi');
  assert.ok(['Hello', 'Hey'].includes(reply.text));
});

test('replyadd creates a keyword reply', async () => {
  await say('admin', '!replyadd keyword price, দাম | Inbox me');
  const reply = await say('u1', 'ভাই দাম কত');
  assert.strictEqual(reply.text, 'Inbox me');
});

test('replylist shows replies', async () => {
  await say('admin', '!replyadd hi | Hello');
  const list = await say('admin', '!replylist');
  assert.ok(list.text.includes('#1'));
  assert.ok(list.text.includes('hi'));
});

test('replyedit changes replies and rejects bad input', async () => {
  await say('admin', '!replyadd hi | Hello');
  await say('admin', '!replyedit 1 replies Yo | Sup');
  const reply = await say('u1', 'hi');
  assert.ok(['Yo', 'Sup'].includes(reply.text));
  const bad = await say('admin', '!replyedit 1 priority abc');
  assert.ok(bad.text.includes('Priority'));
});

test('replyoff and replyon work', async () => {
  await say('admin', '!replyadd hi | Hello');
  await say('admin', '!replyoff 1');
  const off = await say('u1', 'hi');
  assert.strictEqual(off.result.action, 'none');
  await say('admin', '!replyon 1');
  const on = await say('u1', 'hi');
  assert.strictEqual(on.text, 'Hello');
});

test('replyremove deletes a reply', async () => {
  await say('admin', '!replyadd hi | Hello');
  await say('admin', '!replyremove 1');
  assert.strictEqual((await say('u1', 'hi')).result.action, 'none');
  const again = await say('admin', '!replyremove 1');
  assert.ok(again.text.includes('পাওয়া যায়নি'));
});

test('setprefix changes the prefix', async () => {
  const changed = await say('admin', '!setprefix #');
  assert.ok(changed.text.includes('#'));
  const ping = await say('u1', '#ping');
  assert.ok(ping.text.startsWith('🏓'));
  const old = await say('u1', '!ping');
  assert.strictEqual(old.result.action, 'none');
});

test('setprefix rejects a bad prefix', async () => {
  const bad = await say('admin', '!setprefix ab');
  assert.ok(bad.text.includes('প্রিফিক্স'));
  assert.strictEqual(database.getSetting('prefix'), '!');
});

test('prefix command shows the current prefix', async () => {
  const prefix = await say('u1', '!prefix');
  assert.ok(prefix.text.includes('!'));
});

test('autoreply on/off works and validates input', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  await say('admin', '!autoreply off');
  assert.strictEqual((await say('u1', 'hi')).result.reason, 'auto-reply-off');
  await say('admin', '!autoreply on');
  assert.strictEqual((await say('u1', 'hi')).text, 'Hello');
  const bad = await say('admin', '!autoreply maybe');
  assert.ok(bad.text.includes('ব্যবহার'));
});

test('group on/off works and admin can turn it back on', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  await say('admin', '!group off');
  assert.strictEqual(database.getGroup('g1').bot_enabled, 0);
  assert.strictEqual((await say('u1', 'hi')).result.reason, 'group-disabled');
  await say('admin', '!group on');
  assert.strictEqual(database.getGroup('g1').bot_enabled, 1);
  assert.strictEqual((await say('u1', 'hi')).text, 'Hello');
  await say('admin', '!group replies off');
  assert.strictEqual(database.getGroup('g1').replies_enabled, 0);
});

test('maintenance on/off works', async () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  await say('admin', '!maintenance on');
  assert.strictEqual((await say('u1', 'hi')).result.reason, 'maintenance');
  await say('admin', '!maintenance off');
  assert.strictEqual((await say('u1', 'hi')).text, 'Hello');
});

test('groups command differs for users and admins', async () => {
  const user = await say('u1', '!groups');
  assert.ok(user.text.includes('g1'));
  const admin = await say('admin', '!groups');
  assert.ok(admin.text.includes('Simulator Group'));
});
