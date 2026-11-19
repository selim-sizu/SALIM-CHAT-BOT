'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const database = require('../Script/database/database');
const manager = require('../Script/replyManager');
const { findReply } = require('../Script/replyEngine');
const { ValidationError } = require('../utils/validation');

beforeEach(() => {
  database.init(':memory:');
});

afterEach(() => {
  database.close();
});

const isValidationError = (error) => error instanceof ValidationError;

test('exact reply ignores case and punctuation', () => {
  manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  assert.strictEqual(findReply({ text: 'HI!' }).reply, 'Hello');
  assert.strictEqual(findReply({ text: 'hi there' }), null);
});

test('keyword reply matches whole words only', () => {
  manager.addReply({ trigger: 'price, দাম', replies: ['Inbox me'], matchType: 'keyword' });
  assert.strictEqual(findReply({ text: 'ভাই দাম কত?' }).reply, 'Inbox me');
  assert.strictEqual(findReply({ text: 'what is the price' }).reply, 'Inbox me');
  assert.strictEqual(findReply({ text: 'priceless' }), null);
});

test('contains reply matches part of text', () => {
  manager.addReply({ trigger: 'good', replies: ['Nice'], matchType: 'contains' });
  assert.strictEqual(findReply({ text: 'this is goodness' }).reply, 'Nice');
});

test('random and fixed reply modes', () => {
  manager.addReply({ trigger: 'a', replies: ['A', 'B', 'C'], replyMode: 'random' });
  manager.addReply({ trigger: 'b', replies: ['X', 'Y'], replyMode: 'fixed' });
  assert.strictEqual(findReply({ text: 'a', random: () => 0 }).reply, 'A');
  assert.strictEqual(findReply({ text: 'a', random: () => 0.99 }).reply, 'C');
  assert.strictEqual(findReply({ text: 'b', random: () => 0.99 }).reply, 'X');
});

test('Bangla trigger works', () => {
  manager.addReply({ trigger: 'আসসালামু আলাইকুম', replies: ['ওয়ালাইকুম আসসালাম!'] });
  const result = findReply({ text: 'আসসালামু  আলাইকুম!' });
  assert.strictEqual(result.reply, 'ওয়ালাইকুম আসসালাম!');
});

test('Banglish trigger works', () => {
  manager.addReply({ trigger: 'kemon acho', replies: ['valo achi'] });
  assert.strictEqual(findReply({ text: 'Kemon Acho??' }).reply, 'valo achi');
});

test('emoji trigger works', () => {
  manager.addReply({ trigger: '❤️', replies: ['Love you too'] });
  assert.strictEqual(findReply({ text: '❤' }).reply, 'Love you too');
});

test('group-specific reply wins inside its group only', () => {
  manager.addReply({ trigger: 'hi', replies: ['Global hello'] });
  manager.addReply({ trigger: 'hi', replies: ['Group hello'], groupId: 'g1' });
  assert.strictEqual(findReply({ text: 'hi', groupId: 'g1' }).reply, 'Group hello');
  assert.strictEqual(findReply({ text: 'hi', groupId: 'g2' }).reply, 'Global hello');
  assert.strictEqual(findReply({ text: 'hi' }).reply, 'Global hello');
});

test('higher priority wins when many triggers match', () => {
  manager.addReply({ trigger: 'hi', replies: ['Low'], priority: 0 });
  manager.addReply({ trigger: 'hi', replies: ['High'], matchType: 'contains', priority: 5, groupId: 'g1' });
  manager.addReply({ trigger: 'hi', replies: ['Other'], matchType: 'contains', priority: 5 });
  assert.strictEqual(findReply({ text: 'hi', groupId: 'g1' }).reply, 'High');
});

test('disabled reply is ignored', () => {
  const reply = manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  manager.setEnabled(reply.id, false);
  assert.strictEqual(findReply({ text: 'hi' }), null);
  manager.setEnabled(reply.id, true);
  assert.strictEqual(findReply({ text: 'hi' }).reply, 'Hello');
});

test('duplicate trigger and duplicate variations are prevented', () => {
  manager.addReply({ trigger: 'hi', replies: ['A', 'A', ' A '] });
  assert.strictEqual(manager.getReply(1).replies.length, 1);
  assert.throws(() => manager.addReply({ trigger: 'HI', replies: ['B'] }), isValidationError);
});

test('edit and delete work', () => {
  const reply = manager.addReply({ trigger: 'hi', replies: ['Hello'] });
  manager.updateReply(reply.id, { replies: ['Hey', 'Hola'], priority: 3 });
  assert.deepStrictEqual(manager.getReply(reply.id).replies, ['Hey', 'Hola']);
  assert.strictEqual(manager.getReply(reply.id).priority, 3);
  manager.deleteReply(reply.id);
  assert.strictEqual(manager.getReply(reply.id), null);
  assert.throws(() => manager.deleteReply(reply.id), isValidationError);
});

test('invalid input is rejected', () => {
  assert.throws(() => manager.addReply({ trigger: '  ', replies: ['x'] }), isValidationError);
  assert.throws(() => manager.addReply({ trigger: 'a', replies: [] }), isValidationError);
  assert.throws(() => manager.addReply({ trigger: 'a', replies: ['x'], matchType: 'bad' }), isValidationError);
});

test('search, stats and JSON import work', () => {
  const result = manager.importFromObject({
    hi: { replies: ['Hello'], matchType: 'exact', enabled: true },
    bye: { replies: ['Bye'], enabled: false },
    broken: { replies: [] }
  });
  assert.strictEqual(result.added, 2);
  assert.strictEqual(result.skipped, 1);
  assert.deepStrictEqual(manager.getStats(), { total: 2, enabled: 1, disabled: 1 });
  assert.strictEqual(manager.listReplies({ search: 'hel' }).length, 1);
  assert.strictEqual(manager.listReplies({ enabled: false }).length, 1);
});
