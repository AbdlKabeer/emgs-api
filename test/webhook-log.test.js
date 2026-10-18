/**
 * Tests for inbound-webhook logging and the admin log viewer. Runs a real Express app (the real
 * credit routes, the real RevenueCat handler) against a local/throwaway MongoDB; no external services.
 *
 *   docker run -d --name emgs-test-mongo -p 27018:27017 mongo:7      # once
 *   npm run test:webhooks
 *
 * Override the target with WEBHOOK_TEST_MONGODB_URI. Refuses to run against a non-local database.
 */
process.env.DISABLE_OUTBOUND_WEBHOOKS = 'true';
process.env.RESEND_API_KEY = 're_dummy_local';
delete process.env.RESEND_FROM_ADDRESS;
process.env.EMAIL_HOST = '127.0.0.1';
process.env.EMAIL_PORT = '1';
const SECRET = 'test-webhook-secret-DO-NOT-LEAK-12345';
process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
process.env.JWT_SECRET = 'test-jwt-secret';

const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const URI = process.env.WEBHOOK_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/webhook_log_test';
if (!/(127\.0\.0\.1|localhost|emgs-test-mongo)/.test(URI)) {
  console.error('Refusing to run: WEBHOOK_TEST_MONGODB_URI must point at a local/throwaway database');
  process.exit(2);
}

const WebhookLog = require('../src/models/webhook-log.model');
const User = require('../src/models/user.model');
const Role = require('../src/models/role.model');
const CreditAccount = require('../src/models/credit-account.model');
const { logWebhook, redactHeaders, redactBody, _budget } = require('../src/middleware/webhook-log.middleware');
const webhookLogController = require('../src/controllers/webhook-log.controller');

let passed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = () => Math.random().toString(36).slice(2, 8);
// Logging is written after the response finishes, so wait for the row instead of guessing a delay.
async function waitFor(filter, count = 1) {
  for (let i = 0; i < 60; i++) {
    const rows = await WebhookLog.find(filter).sort({ createdAt: 1 }).lean();
    if (rows.length >= count) return rows;
    await sleep(25);
  }
  return WebhookLog.find(filter).lean();
}
const mkRes = () => ({
  code: null, body: null,
  status(c) { this.code = c; return this; },
  json(b) { this.body = b; return this; },
});

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([WebhookLog.init(), User.init(), Role.init(), CreditAccount.init()]);

  // Real routes, plus a few throwaway routes that exercise the middleware directly.
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/v2/credits', require('../src/routes/credit.routes'));
  app.use('/api/v2/admin/webhook-logs', require('../src/routes/webhook-log.routes'));
  const extract = (req) => ({ eventType: req.body?.type, eventId: req.body?.id });
  app.post('/t/ok', logWebhook('testprov', extract), (req, res) => res.status(200).json({ ok: true, echo: 'hello' }));
  app.post('/t/reject', logWebhook('testprov', extract), (req, res) => res.status(401).json({ message: 'Unauthorized' }));
  app.post('/t/boom', logWebhook('testprov', extract), () => { throw new Error('handler exploded'); });
  app.post('/t/badextract', logWebhook('testprov', () => { throw new Error('bad extractor'); }), (req, res) => res.json({ ok: true }));
  app.use((err, req, res, next) => res.status(500).json({ message: err.message })); // eslint-disable-line no-unused-vars
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });

  console.log('\nLogging a RevenueCat webhook end to end');
  await t('a valid webhook is recorded with provider, event, status, timing and our response', async () => {
    const id = `evt-${uniq()}`;
    const res = await post('/api/v2/credits/webhook/revenuecat', { event: { id, type: 'TEST', app_user_id: 'x' } },
      { Authorization: `Bearer ${SECRET}` });
    assert.equal(res.status, 200);
    const [row] = await waitFor({ eventId: id });
    assert.equal(row.provider, 'revenuecat'); assert.equal(row.eventType, 'TEST');
    assert.equal(row.status, 'processed'); assert.equal(row.statusCode, 200);
    assert.equal(row.method, 'POST'); assert.equal(row.path, '/api/v2/credits/webhook/revenuecat');
    assert.ok(row.durationMs >= 0 && Number.isFinite(row.durationMs));
    assert.ok(row.ip); assert.ok(row.response.includes('ok'));
    assert.equal(JSON.parse(row.body).event.id, id);
  });
  await t('a webhook with the wrong secret is recorded as rejected (401) and the secret is never stored', async () => {
    const id = `evt-${uniq()}`;
    const res = await post('/api/v2/credits/webhook/revenuecat', { event: { id, type: 'INITIAL_PURCHASE' } },
      { Authorization: 'Bearer definitely-wrong-secret-value' });
    assert.equal(res.status, 401);
    const [row] = await waitFor({ eventId: id });
    assert.equal(row.status, 'rejected'); assert.equal(row.statusCode, 401);
    const dump = JSON.stringify(row);
    assert.ok(!dump.includes('definitely-wrong-secret-value'), 'wrong secret leaked into the log');
  });
  await t('the real secret never appears anywhere in a stored row; the header only shows it was present', async () => {
    const id = `evt-${uniq()}`;
    await post('/api/v2/credits/webhook/revenuecat', { event: { id, type: 'TEST' } }, { Authorization: SECRET });
    const [row] = await waitFor({ eventId: id });
    assert.ok(!JSON.stringify(row).includes(SECRET), 'webhook secret leaked into the log');
    const headers = JSON.parse(row.headers);
    assert.ok(/^\[redacted\]:\d+ chars$/.test(headers.authorization), headers.authorization);
    assert.ok(headers['content-type']);
  });
  await t('a purchase webhook that actually credits a user is logged as processed and the credit is applied', async () => {
    const user = await User.create({ fullName: 'Buyer', email: `${uniq()}@example.test`, password: 'x', status: 'active', referralCode: uniq().toUpperCase() });
    await require('../src/models/credit-pack.model').updateOne(
      { productId: 'credits_100' }, { $set: { credits: 100, bonusCredits: 0, isActive: true } }, { upsert: true });
    const id = `evt-${uniq()}`;
    const res = await post('/api/v2/credits/webhook/revenuecat', {
      event: { id, type: 'NON_RENEWING_PURCHASE', app_user_id: user._id.toString(), product_id: 'credits_100', transaction_id: `T-${uniq()}`, store: 'APP_STORE' },
    }, { Authorization: `Bearer ${SECRET}` });
    assert.equal(res.status, 200);
    const [row] = await waitFor({ eventId: id });
    assert.equal(row.status, 'processed'); assert.equal(row.eventType, 'NON_RENEWING_PURCHASE');
    assert.equal((await CreditAccount.findOne({ userId: user._id })).balance, 100);
  });

  console.log('\nRedaction and storage safety');
  await t('sensitive body fields are redacted at any depth; ordinary fields stay', async () => {
    await post('/t/ok', { id: 'red-1', type: 'x', password: 'hunter2', nested: { api_key: 'sk_live_abc', deep: [{ cardNumber: '4242424242424242', keep: 'visible' }] }, amount: 500 });
    const [row] = await waitFor({ eventId: 'red-1' });
    const dump = row.body;
    for (const leaked of ['hunter2', 'sk_live_abc', '4242424242424242']) assert.ok(!dump.includes(leaked), `${leaked} leaked`);
    const body = JSON.parse(dump);
    assert.equal(body.password, '[redacted]'); assert.equal(body.nested.api_key, '[redacted]');
    assert.equal(body.nested.deep[0].keep, 'visible'); assert.equal(body.amount, 500);
  });
  await t('signature, cookie and key headers are redacted; plain headers are kept', () => {
    const h = redactHeaders({ 'x-signature': 'abcdef', cookie: 'a=b', 'x-api-key': 'k', 'user-agent': 'RevenueCat/1.0', 'x-forwarded-for': '1.2.3.4' });
    assert.ok(h['x-signature'].startsWith('[redacted]')); assert.ok(h.cookie.startsWith('[redacted]'));
    assert.ok(h['x-api-key'].startsWith('[redacted]'));
    assert.equal(h['user-agent'], 'RevenueCat/1.0'); assert.equal(h['x-forwarded-for'], '1.2.3.4');
    assert.deepEqual(redactBody({ a: 1, b: [1, { token: 't' }] }), { a: 1, b: [1, { token: '[redacted]' }] });
  });
  await t('keys that Mongo dislikes ($email, dotted names) are stored without breaking the log', async () => {
    await post('/t/ok', { id: 'dollar-1', type: 'x', subscriber_attributes: { $email: { value: 'a@b.c' }, 'a.b': 1 } });
    const [row] = await waitFor({ eventId: 'dollar-1' });
    assert.equal(JSON.parse(row.body).subscriber_attributes.$email.value, 'a@b.c');
  });
  await t('a very large accepted body is truncated, flagged, and its real size is recorded', async () => {
    const big = { id: 'big-1', type: 'x', blob: 'x'.repeat(300000) };
    await post('/t/ok', big);
    const [row] = await waitFor({ eventId: 'big-1' });
    assert.equal(row.bodyTruncated, true); assert.equal(row.body.length, 100000);
    assert.ok(row.bodyBytes > 300000);
  });
  await t('a rejected call gets a much smaller body cap and a short retention; an accepted one keeps 90 days', async () => {
    await post('/t/reject', { id: 'rej-small', type: 'x', blob: 'y'.repeat(50000) });
    await post('/t/ok', { id: 'ok-ret', type: 'x' });
    const [rej] = await waitFor({ eventId: 'rej-small' }); const [ok] = await waitFor({ eventId: 'ok-ret' });
    assert.equal(rej.bodyTruncated, true); assert.equal(rej.body.length, 1000);
    const days = (row) => Math.round((new Date(row.expiresAt) - new Date(row.createdAt)) / 86400000);
    assert.equal(days(rej), 7); assert.equal(days(ok), 90);
  });
  await t('a TTL index exists so old rows delete themselves', async () => {
    const idx = await WebhookLog.collection.indexes();
    const ttl = idx.find((i) => i.key.expiresAt === 1);
    assert.ok(ttl && ttl.expireAfterSeconds === 0, JSON.stringify(idx.map((i) => i.key)));
  });

  console.log('\nNever getting in the way of the webhook');
  await t('if the database write fails, the webhook is still answered normally and the failure is logged to the console', async () => {
    const original = WebhookLog.prototype.save; const errors = []; const origErr = console.error;
    WebhookLog.prototype.save = () => Promise.reject(new Error('mongo is down'));
    console.error = (...a) => errors.push(a.join(' '));
    try {
      const res = await post('/t/ok', { id: 'dbdown-1', type: 'x' });
      assert.equal(res.status, 200); assert.equal((await res.json()).echo, 'hello');
      await sleep(100);
    } finally { WebhookLog.prototype.save = original; console.error = origErr; }
    assert.ok(errors.some((e) => e.includes('could not record') && e.includes('mongo is down')), errors.join('|'));
    assert.equal(await WebhookLog.countDocuments({ eventId: 'dbdown-1' }), 0);
  });
  await t('a throwing event extractor does not break the webhook', async () => {
    const res = await post('/t/badextract', { id: 'bx-1' });
    assert.equal(res.status, 200);
    const [row] = await waitFor({ path: '/t/badextract' });
    assert.equal(row.status, 'processed'); assert.equal(row.eventId, undefined);
  });
  await t('a handler that crashes is logged as an error (500) with the response we sent', async () => {
    const res = await post('/t/boom', { id: 'boom-1', type: 'x' });
    assert.equal(res.status, 500);
    const [row] = await waitFor({ eventId: 'boom-1' });
    assert.equal(row.status, 'error'); assert.equal(row.statusCode, 500);
    assert.ok(row.response.includes('handler exploded'));
  });
  await t('a connection dropped before any response is logged as an error', async () => {
    const { EventEmitter } = require('events');
    const req = { method: 'POST', originalUrl: '/t/drop', headers: {}, body: { id: 'drop-1', type: 'x' }, query: {}, ip: '9.9.9.9' };
    const res = Object.assign(new EventEmitter(), { statusCode: 200, headersSent: false, writableEnded: false, send() {} });
    logWebhook('testprov', extract)(req, res, () => {});
    res.emit('close');
    const [row] = await waitFor({ eventId: 'drop-1' });
    assert.equal(row.status, 'error'); assert.equal(row.statusCode, undefined);
    assert.ok(row.error.includes('connection closed'));
  });
  await t('finish and close both firing records the webhook exactly once', async () => {
    const { EventEmitter } = require('events');
    const req = { method: 'POST', originalUrl: '/t/once', headers: {}, body: { id: 'once-1', type: 'x' }, query: {}, ip: '9.9.9.9' };
    const res = Object.assign(new EventEmitter(), { statusCode: 200, headersSent: true, writableEnded: true, send() {} });
    logWebhook('testprov', extract)(req, res, () => {});
    res.emit('finish'); res.emit('close');
    await waitFor({ eventId: 'once-1' }); await sleep(100);
    assert.equal(await WebhookLog.countDocuments({ eventId: 'once-1' }), 1);
  });

  console.log('\nFlood protection for unauthenticated junk');
  await t('rejected calls beyond the per-minute budget are not stored, accepted ones always are', async () => {
    process.env.WEBHOOK_LOG_REJECTED_PER_MINUTE = '3';
    Object.assign(_budget, { windowStart: 0, used: 0, dropped: 0 });
    const warn = console.warn; const warnings = []; console.warn = (...a) => warnings.push(a.join(' '));
    try {
      for (let i = 0; i < 8; i++) await post('/t/reject', { id: `flood-${i}`, type: 'x' });
      for (let i = 0; i < 3; i++) await post('/t/ok', { id: `legit-${i}`, type: 'x' });
      await sleep(300);
      assert.equal(await WebhookLog.countDocuments({ eventId: /^flood-/ }), 3);
      assert.equal(await WebhookLog.countDocuments({ eventId: /^legit-/ }), 3);
      assert.equal(_budget.dropped, 5);
    } finally { console.warn = warn; delete process.env.WEBHOOK_LOG_REJECTED_PER_MINUTE; Object.assign(_budget, { windowStart: 0, used: 0, dropped: 0 }); }
  });

  console.log('\nAdmin log viewer');
  const superRole = await Role.create({ name: 'Super Admin', slug: 'super_admin' });
  const mkUser = (extra = {}) => User.create({ fullName: `U ${uniq()}`, email: `${uniq()}@example.test`, password: 'x', status: 'active', referralCode: uniq().toUpperCase(), ...extra });
  const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const adminUser = await mkUser({ role: 'admin', roles: ['admin'], assignedRole: superRole._id });
  const plainUser = await mkUser();
  const legacyAdmin = await mkUser({ role: 'admin', roles: ['admin'] }); // admin with no assigned RBAC role
  const get = (path, token) => fetch(base + '/api/v2/admin/webhook-logs' + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  await t('no token -> 401, ordinary user -> 403, admin without an assigned role -> 403', async () => {
    assert.equal((await get('')).status, 401);
    assert.equal((await get('', tokenFor(plainUser))).status, 403);
    assert.equal((await get('', tokenFor(legacyAdmin))).status, 403);
  });
  await t('a super admin can list: newest first, paginated, without bodies or headers', async () => {
    const res = await get('?limit=5', tokenFor(adminUser)); const j = await res.json();
    assert.equal(res.status, 200); assert.equal(j.results.length, 5);
    assert.ok(j.metadata.totalItems > 5); assert.equal(j.metadata.itemsPerPage, 5);
    for (const r of j.results) { assert.equal(r.body, undefined); assert.equal(r.headers, undefined); }
    const times = j.results.map((r) => new Date(r.createdAt).getTime());
    assert.deepEqual([...times].sort((a, b) => b - a), times);
  });
  await t('filters work: provider, status, event id, event type, and a date range', async () => {
    const adminT = tokenFor(adminUser);
    const one = async (q) => (await (await get(q, adminT)).json());
    const byProvider = await one('?provider=revenuecat&limit=100');
    assert.ok(byProvider.results.length >= 4 && byProvider.results.every((r) => r.provider === 'revenuecat'));
    const rejected = await one('?status=rejected&limit=100');
    assert.ok(rejected.results.length >= 2 && rejected.results.every((r) => r.status === 'rejected'));
    assert.equal((await one('?eventId=boom-1')).results.length, 1);
    const purchases = await one('?eventType=NON_RENEWING_PURCHASE');
    assert.equal(purchases.results.length, 1);
    assert.equal((await one(`?from=${new Date(Date.now() + 86400000).toISOString()}`)).results.length, 0);
    assert.equal((await get('?from=not-a-date', adminT)).status, 400);
  });
  await t('fetching one entry returns the full parsed body, redacted headers and our response', async () => {
    const [row] = await WebhookLog.find({ eventId: 'red-1' }).lean();
    const res = await get(`/${row._id}`, tokenFor(adminUser)); const j = await res.json();
    assert.equal(res.status, 200);
    assert.equal(j.data.body.password, '[redacted]'); assert.equal(j.data.body.amount, 500);
    assert.equal(j.data.headers['content-type'], 'application/json');
    assert.equal(j.data.response.echo, 'hello');
  });
  await t('unknown or malformed ids give 404 / 400, never a crash', async () => {
    const adminT = tokenFor(adminUser);
    assert.equal((await get(`/${new mongoose.Types.ObjectId()}`, adminT)).status, 404);
    assert.equal((await get('/not-an-id', adminT)).status, 400);
  });
  await t('the summary counts outcomes per provider for the last 24 hours', async () => {
    const j = await (await get('/summary', tokenFor(adminUser))).json();
    const p = j.data.providers;
    assert.ok(p.revenuecat.processed >= 3 && p.revenuecat.rejected >= 1);
    assert.ok(p.testprov.error >= 1 && p.testprov.processed >= 1);
    assert.ok(p.revenuecat.lastAt);
  });
  await t('a regex-special search string is treated as plain text', async () => {
    const res = mkRes();
    await webhookLogController.list({ query: { q: '.*(' } }, res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.equal(res.body.results.length, 0);
  });

  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
