'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const database = require('../Script/database/database');
const { findReply } = require('../Script/replyEngine');
const { startServer } = require('../dashboard/server');
const { ensureAdminUser, verifyLogin } = require('../dashboard/adminUsers');
const { SimulatorAdapter } = require('../adapters/simulatorAdapter');

const USER = 'boss';
const PASS = 'strong-pass-123';
let server;
let base;

beforeEach(async () => {
  database.init(':memory:');
  ensureAdminUser(USER, PASS);
  server = await startServer({
    port: 0,
    adapter: new SimulatorAdapter(),
    sessionSecret: 'test-secret-test-secret'
  });
  base = `http://127.0.0.1:${server.port}`;
});

afterEach(async () => {
  await server.close();
  database.close();
});

async function request(method, path, { body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const response = await fetch(base + path, { method, headers, body: payload });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  return { status: response.status, data, response };
}

async function login(username = USER, password = PASS) {
  const result = await request('POST', '/api/auth/login', { body: { username, password } });
  const cookies = result.response.headers.getSetCookie();
  result.cookie = cookies.map((item) => item.split(';')[0]).join('; ');
  result.rawCookies = cookies.join(';');
  return result;
}

function rawRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: server.port, method, path, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('health check is public', async () => {
  const result = await request('GET', '/health');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.data.status, 'ok');
});

test('API needs login', async () => {
  assert.strictEqual((await request('GET', '/api/replies')).status, 401);
  assert.strictEqual((await request('GET', '/api/settings')).status, 401);
  assert.strictEqual((await request('GET', '/api/overview')).status, 401);
  assert.strictEqual((await request('GET', '/api/groups')).status, 401);
  const post = await request('POST', '/api/replies', { body: { trigger: 'x', replies: ['y'] } });
  assert.strictEqual(post.status, 401);
});

test('wrong login is rejected', async () => {
  assert.strictEqual((await login(USER, 'wrong-password')).status, 401);
  assert.strictEqual((await login('nobody', PASS)).status, 401);
  const missing = await request('POST', '/api/auth/login', { body: {} });
  assert.strictEqual(missing.status, 400);
});

test('login works and session cookie is safe', async () => {
  const result = await login();
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.data.ok, true);
  assert.ok(result.cookie.includes('salim.sid'));
  assert.ok(result.rawCookies.includes('HttpOnly'));
  assert.ok(result.rawCookies.includes('SameSite=Lax'));

  const me = await request('GET', '/api/auth/me', { cookie: result.cookie });
  assert.strictEqual(me.data.authenticated, true);
  assert.strictEqual(me.data.username, USER);
  const anon = await request('GET', '/api/auth/me');
  assert.strictEqual(anon.data.authenticated, false);
});

test('password is stored hashed', () => {
  const row = database
    .getDb()
    .prepare('SELECT password_hash FROM admin_users WHERE username = ?')
    .get(USER);
  assert.notStrictEqual(row.password_hash, PASS);
  assert.ok(row.password_hash.startsWith('$2'));
});

test('logout ends the session', async () => {
  const { cookie } = await login();
  assert.strictEqual((await request('GET', '/api/replies', { cookie })).status, 200);
  assert.strictEqual((await request('POST', '/api/auth/logout', { cookie, body: {} })).status, 200);
  assert.strictEqual((await request('GET', '/api/replies', { cookie })).status, 401);
});

test('login is rate limited', async () => {
  for (let i = 0; i < 10; i += 1) {
    const attempt = await login(USER, 'wrong-password');
    assert.strictEqual(attempt.status, 401);
  }
  const blocked = await login(USER, 'wrong-password');
  assert.strictEqual(blocked.status, 429);
  const correct = await login();
  assert.strictEqual(correct.status, 429);
});

test('reply manager API works end to end', async () => {
  const { cookie } = await login();
  const created = await request('POST', '/api/replies', {
    cookie,
    body: { trigger: 'hi', replies: ['Hello', 'Hey'], matchType: 'exact' }
  });
  assert.strictEqual(created.status, 201);
  const id = created.data.reply.id;
  assert.ok(['Hello', 'Hey'].includes(findReply({ text: 'hi' }).reply));

  const off = await request('PUT', `/api/replies/${id}`, { cookie, body: { enabled: false } });
  assert.strictEqual(off.status, 200);
  assert.strictEqual(off.data.reply.enabled, false);
  assert.strictEqual(findReply({ text: 'hi' }), null);

  await request('PUT', `/api/replies/${id}`, { cookie, body: { enabled: true, replies: ['Yo'] } });
  assert.strictEqual(findReply({ text: 'hi' }).reply, 'Yo');

  assert.strictEqual((await request('GET', '/api/replies?search=hi', { cookie })).data.replies.length, 1);
  assert.strictEqual((await request('GET', '/api/replies?search=zzz', { cookie })).data.replies.length, 0);
  assert.strictEqual((await request('GET', '/api/replies?enabled=false', { cookie })).data.replies.length, 0);

  const empty = await request('POST', '/api/replies', { cookie, body: { trigger: '', replies: ['x'] } });
  assert.strictEqual(empty.status, 400);
  const duplicate = await request('POST', '/api/replies', { cookie, body: { trigger: 'HI', replies: ['x'] } });
  assert.strictEqual(duplicate.status, 400);

  assert.strictEqual((await request('PUT', '/api/replies/999', { cookie, body: {} })).status, 404);
  assert.strictEqual((await request('DELETE', '/api/replies/999', { cookie })).status, 404);
  assert.strictEqual((await request('DELETE', `/api/replies/${id}`, { cookie })).status, 200);
  assert.strictEqual((await request('GET', '/api/replies', { cookie })).data.replies.length, 0);
});

test('settings API validates and saves', async () => {
  const { cookie } = await login();
  const current = await request('GET', '/api/settings', { cookie });
  assert.strictEqual(current.data.settings.prefix, '!');

  const saved = await request('PUT', '/api/settings', {
    cookie,
    body: { prefix: '#', auto_reply: 'off', reply_delay_ms: 500 }
  });
  assert.strictEqual(saved.status, 200);
  assert.strictEqual(database.getSetting('prefix'), '#');
  assert.strictEqual(database.getSetting('auto_reply'), 'off');
  assert.strictEqual(database.getSetting('reply_delay_ms'), '500');

  const badPrefix = await request('PUT', '/api/settings', { cookie, body: { prefix: 'ab' } });
  assert.strictEqual(badPrefix.status, 400);
  const badDelay = await request('PUT', '/api/settings', { cookie, body: { reply_delay_ms: 99999 } });
  assert.strictEqual(badDelay.status, 400);

  const partial = await request('PUT', '/api/settings', {
    cookie,
    body: { bot_name: 'Changed', prefix: 'ab' }
  });
  assert.strictEqual(partial.status, 400);
  assert.strictEqual(database.getSetting('bot_name'), 'SALIM CHAT BOT');
});

test('groups API works', async () => {
  const { cookie } = await login();
  database.ensureGroup('g1', 'Test Group');
  const list = await request('GET', '/api/groups', { cookie });
  assert.strictEqual(list.data.groups.length, 1);
  assert.strictEqual(list.data.groups[0].name, 'Test Group');

  const updated = await request('PUT', '/api/groups/g1', {
    cookie,
    body: { bot_enabled: false, replies_enabled: false }
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(database.getGroup('g1').bot_enabled, 0);
  assert.strictEqual(database.getGroup('g1').replies_enabled, 0);
  assert.strictEqual((await request('PUT', '/api/groups/nope', { cookie, body: {} })).status, 404);
});

test('overview shows stats and honest connection status', async () => {
  const { cookie } = await login();
  const result = await request('GET', '/api/overview', { cookie });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.data.status, 'ONLINE');
  assert.strictEqual(result.data.stats.total, 0);
  assert.ok(result.data.connection.includes('সংযুক্ত নয়'));
  assert.ok(Array.isArray(result.data.recent));
});

test('cross-site and non-JSON requests are blocked', async () => {
  const { cookie } = await login();
  const body = JSON.stringify({ trigger: 'x', replies: ['y'] });
  const evil = await rawRequest(
    'POST',
    '/api/replies',
    { cookie, origin: 'http://evil.example', 'content-type': 'application/json' },
    body
  );
  assert.strictEqual(evil.status, 403);
  const plain = await rawRequest('POST', '/api/replies', { cookie, 'content-type': 'text/plain' }, body);
  assert.strictEqual(plain.status, 415);
  const same = await rawRequest(
    'POST',
    '/api/replies',
    { cookie, origin: `http://127.0.0.1:${server.port}`, 'content-type': 'application/json' },
    body
  );
  assert.strictEqual(same.status, 201);
});

test('security headers are set and private files are not exposed', async () => {
  const health = await request('GET', '/health');
  assert.strictEqual(health.response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(health.response.headers.get('content-security-policy').includes("default-src 'self'"));
  assert.strictEqual(health.response.headers.get('x-powered-by'), null);
  for (const path of ['/package.json', '/data/salim-bot.db', '/Script/database/schema.sql', '/.env']) {
    const response = await fetch(base + path);
    assert.strictEqual(response.status, 404, path);
  }
});

test('admin password can be changed and weak input is rejected', async () => {
  assert.throws(() => ensureAdminUser('ab', 'long-enough-password'));
  assert.throws(() => ensureAdminUser('newadmin', 'short'));
  assert.strictEqual(ensureAdminUser(USER, 'new-password-456'), 'updated');
  assert.strictEqual(await verifyLogin(USER, PASS), null);
  assert.strictEqual(await verifyLogin(USER, 'new-password-456'), USER);
});
