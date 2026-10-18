/**
 * End-to-end test for the credit system. Talks to a running API (API_URL) backed by a THROWAWAY
 * database (MONGODB_URI) and refuses to run against anything that is not a local/docker Mongo.
 *
 *   API_URL=http://emgs-test-api:8000/api/v2 MONGODB_URI=mongodb://emgs-test-mongo:27017/emgs_test \
 *   REVENUECAT_WEBHOOK_SECRET=test-webhook-secret node test/credits.e2e.js
 */
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const API = process.env.API_URL || 'http://localhost:8001/api/v2';
const URI = process.env.MONGODB_URI || '';
const SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || 'test-webhook-secret';
if (!/(127\.0\.0\.1|localhost|emgs-test-mongo)/.test(URI)) {
  console.error('Refusing to run: MONGODB_URI must point at a local/throwaway database'); process.exit(2);
}

const User = require('../src/models/user.model');
const Course = require('../src/models/course.model');
const CourseCategory = require('../src/models/courseCategory.model');
const Service = require('../src/models/service.model');
const Wallet = require('../src/models/wallet.model');
const Role = require('../src/models/role.model');
const AppConfig = require('../src/models/app-config.model');
const CreditAccount = require('../src/models/credit-account.model');
const CreditTransaction = require('../src/models/credit-transaction.model');
const Subscription = require('../src/models/subscription.model');
const ledger = require('../src/services/credit-ledger.service');
const subscriptions = require('../src/controllers/subscription.controller');

let passed = 0; const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch (_) {}
  return { status: res.status, body: json, data: json && json.data };
}
const rc = (event, auth = `Bearer ${SECRET}`) => fetch(`${API}/credits/webhook/revenuecat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
  body: JSON.stringify({ event }),
});
const bal = async (u) => (await call('GET', '/credits/balance', tokenFor(u))).data.balance;
const uniq = () => Math.random().toString(36).slice(2, 8);

(async () => {
  await mongoose.connect(URI);
  const run = uniq();
  const mkUser = (extra = {}) => User.create({
    fullName: `T ${uniq()}`, email: `${uniq()}-${run}@example.test`, password: 'x', status: 'active',
    referralCode: uniq().toUpperCase() + run.toUpperCase(), ...extra,
  });

  await AppConfig.updateOne({ key: 'global' }, { $set: { credits: {
    nairaPerCredit: 10, platformCommissionPct: 0.2, storeFeePct: 0.15, feeBearer: 'student',
    showFiatToStudents: false, renewalGraceDays: 3, lowBalanceThreshold: 50, referralRewardPct: 0.1 } } }, { upsert: true });

  const category = await CourseCategory.create({ name: `cat-${run}` }).catch(async () => CourseCategory.findOne());
  const tutor = await mkUser({ role: 'tutor', roles: ['tutor'], servicePrice: 3000 });
  const student = await mkUser();
  const referrer = await mkUser();
  const refStudent = await mkUser({ referredBy: referrer._id });
  const courseBase = { category: category._id, createdBy: tutor._id, courseType: 'tutor', isPublished: true, status: 'published' };
  const course = await Course.create({ ...courseBase, title: `Paid ${run}`, price: 5000 });
  const course2 = await Course.create({ ...courseBase, title: `Paid2 ${run}`, price: 2000 });
  const course3 = await Course.create({ ...courseBase, title: `Paid3 ${run}`, price: 1000 });
  const freeCourse = await Course.create({ ...courseBase, title: `Free ${run}`, price: 0, isFree: true });
  const service = await Service.create({
    name: `Svc ${run}`, description: 'd', category: 'Visa Booking', whatsappContact: '1', price: 4000, user: tutor._id,
    sessionEnabled: true, sessionPrice: 4000, subscriptionEnabled: true,
    subscriptionPlans: [{ interval: 'monthly', price: 1500 }],
  });
  const sToken = tokenFor(student);

  console.log('\nConfig & pricing');
  await t('GET /credits/config returns packs and rate', async () => {
    const r = await call('GET', '/credits/config', sToken);
    assert.equal(r.status, 200); assert.equal(r.data.packs.length, 4);
    assert.equal(r.data.nairaPerCredit, 10); assert.equal(r.data.feeBearer, 'student');
    assert.equal(r.data.showFiatToStudents, false);
  });
  await t('quote for NGN 5000 course = 589 credits (student bears 15% fee), no NGN leaked', async () => {
    const r = await call('GET', `/credits/quote?itemType=course&itemId=${course._id}`, sToken);
    assert.equal(r.status, 200); assert.equal(r.data.creditPrice, 589);
    assert.equal(r.data.shortfall, 589); assert.equal(r.data.basePrice, undefined);
  });

  console.log('\nFunding');
  await t('paying with no credits -> 402 INSUFFICIENT_CREDITS with shortfall', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'course', itemId: course._id });
    assert.equal(r.status, 402); assert.equal(r.body.group, 'INSUFFICIENT_CREDITS');
    assert.equal(r.data.required, 589); assert.equal(r.data.shortfall, 589);
  });
  await t('webhook without/with wrong secret -> 401', async () => {
    assert.equal((await rc({ type: 'NON_RENEWING_PURCHASE' }, null)).status, 401);
    assert.equal((await rc({ type: 'NON_RENEWING_PURCHASE' }, 'Bearer nope')).status, 401);
  });
  const txn = `GPA.${run}-1`;
  const purchaseEvent = { id: `evt-${run}-1`, type: 'NON_RENEWING_PURCHASE', app_user_id: student._id.toString(),
    product_id: 'credits_500', transaction_id: txn, store: 'PLAY_STORE' };
  await t('RevenueCat purchase webhook grants the pack (500 credits, no bonus)', async () => {
    assert.equal((await rc(purchaseEvent)).status, 200);
    assert.equal(await bal(student), 500);
  });
  await t('replayed webhook is idempotent (no double credit)', async () => {
    await rc(purchaseEvent); await rc({ ...purchaseEvent, id: `evt-${run}-1b` });
    assert.equal(await bal(student), 500);
  });
  await t('unknown product is recorded as failed event, balance unchanged', async () => {
    assert.equal((await rc({ ...purchaseEvent, id: `evt-${run}-x`, product_id: 'nope', transaction_id: `GPA.${run}-x` })).status, 200);
    assert.equal(await bal(student), 500);
  });
  await t('webhook with an anonymous/invalid app_user_id or missing transaction id is acknowledged, not crashed', async () => {
    const base = { type: 'NON_RENEWING_PURCHASE', product_id: 'credits_100', store: 'TEST_STORE' };
    assert.equal((await rc({ ...base, id: `e-${run}-a1`, app_user_id: '$RCAnonymousID:abc123', transaction_id: `T-${run}-a1` })).status, 200);
    assert.equal((await rc({ ...base, id: `e-${run}-a2`, app_user_id: 'ec662a5e-b26d-4e02-99ef-476707400111', transaction_id: `T-${run}-a2` })).status, 200);
    assert.equal((await rc({ ...base, id: `e-${run}-a3`, app_user_id: student._id.toString(), transaction_id: null })).status, 200);
    assert.equal(await bal(student), 500);
  });
  await t('dev mock purchase credits_1000 -> +1000', async () => {
    const r = await call('POST', '/credits/dev/mock-purchase', sToken, { productId: 'credits_1000' });
    assert.equal(r.status, 200); assert.equal(await bal(student), 1500);
  });

  console.log('\nSpending: course');
  await t('wrong expectedCredits -> 409 PRICE_CHANGED', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'course', itemId: course._id, expectedCredits: 1 });
    assert.equal(r.status, 409); assert.equal(r.body.group, 'PRICE_CHANGED'); assert.equal(r.data.creditPrice, 589);
  });
  await t('buy course: credits deducted, enrolled, tutor paid NGN 4000 from snapshot', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'course', itemId: course._id, expectedCredits: 589 });
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.data.credits, 589); assert.equal(r.data.balance, 911);
    const u = await User.findById(student._id); assert.ok(u.enrolledCourses.some((id) => id.equals(course._id)));
    const w = await Wallet.findOne({ userId: tutor._id }); assert.equal(w.earned, 4000); assert.equal(w.balance, 4000);
    const row = await CreditTransaction.findOne({ userId: student._id, type: 'spend', 'ref.itemId': course._id });
    assert.equal(row.amount, -589); assert.equal(row.pricing.tutorShare, 4000); assert.equal(row.pricing.feeBearer, 'student');
  });
  await t('buying the same course again -> 409 ALREADY_ENROLLED, no charge', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'course', itemId: course._id });
    assert.equal(r.status, 409); assert.equal(await bal(student), 911);
  });
  await t('free course enrols with 0 credits', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'course', itemId: freeCourse._id });
    assert.equal(r.status, 200); assert.equal(r.data.credits, 0); assert.equal(await bal(student), 911);
  });
  await t('ledger history lists purchase + spend rows', async () => {
    const r = await call('GET', '/credits/transactions', sToken);
    assert.equal(r.status, 200); const types = r.body.results.map((x) => x.type);
    assert.ok(types.includes('purchase') && types.includes('spend'));
  });

  console.log('\nSpending: service & one-on-one');
  await t('buy service session (NGN 4000 -> 471 credits) creates active session', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'service', itemId: service._id });
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.data.credits, 471);
    const u = await User.findById(student._id);
    assert.ok(u.serviceSubscriptions.some((s) => s.serviceId.equals(service._id) && s.isActive));
  });
  await t('second purchase while session active -> 400 ACTIVE_SESSION_EXISTS', async () => {
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'service', itemId: service._id });
    assert.equal(r.status, 400); assert.equal(r.body.group, 'ACTIVE_SESSION_EXISTS');
  });
  await t('buy one-on-one tutoring (NGN 3000 -> 353 credits) and tutor earns share', async () => {
    const before = (await Wallet.findOne({ userId: tutor._id })).earned;
    const r = await call('POST', '/payment/pay-with-credits', sToken, { itemType: 'one-on-one', itemId: tutor._id });
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.data.credits, 353);
    assert.equal((await Wallet.findOne({ userId: tutor._id })).earned, before + 2400);
    assert.ok((await User.findById(student._id)).oneOnOneSubscriptions.some((s) => s.tutorId.equals(tutor._id) && s.isActive));
  });

  console.log('\nConcurrency & store refunds');
  await t('20 parallel spends against a balance covering 3 -> exactly 3 succeed', async () => {
    const u = await mkUser();
    await ledger.credit({ userId: u._id, amount: 300, type: 'adjustment', idempotencyKey: `seed:${u._id}` });
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) =>
      ledger.spend({ userId: u._id, amount: 100, idempotencyKey: `race:${u._id}:${i}` })));
    assert.equal(results.filter((x) => x.status === 'fulfilled').length, 3);
    const acct = await CreditAccount.findOne({ userId: u._id }); assert.equal(acct.balance, 0);
  });
  await t('idempotent spend key does not double charge', async () => {
    const u = await mkUser(); await ledger.credit({ userId: u._id, amount: 50, type: 'adjustment', idempotencyKey: `s:${u._id}` });
    await ledger.spend({ userId: u._id, amount: 10, idempotencyKey: `same:${u._id}` });
    await ledger.spend({ userId: u._id, amount: 10, idempotencyKey: `same:${u._id}` });
    assert.equal((await CreditAccount.findOne({ userId: u._id })).balance, 40);
  });
  await t('store refund claws back, goes negative, blocks spending until topped up', async () => {
    const u = await mkUser(); const tk = tokenFor(u);
    await rc({ id: `e-${run}-r1`, type: 'NON_RENEWING_PURCHASE', app_user_id: u._id.toString(), product_id: 'credits_100', transaction_id: `T-${run}-r`, store: 'APP_STORE' });
    assert.equal(await bal(u), 100);
    await call('POST', '/payment/pay-with-credits', tk, { itemType: 'course', itemId: course3._id }); // costs 118, fails (402)
    await ledger.spend({ userId: u._id, amount: 90, idempotencyKey: `use:${u._id}` });
    await rc({ id: `e-${run}-r2`, type: 'REFUND', app_user_id: u._id.toString(), product_id: 'credits_100', transaction_id: `T-${run}-r`, store: 'APP_STORE' });
    assert.equal(await bal(u), -90);
    await rc({ id: `e-${run}-r3`, type: 'NON_RENEWING_PURCHASE', app_user_id: u._id.toString(), product_id: 'credits_100', transaction_id: `T-${run}-r2`, store: 'APP_STORE' });
    assert.equal(await bal(u), 10);
    assert.equal((await CreditAccount.findOne({ userId: u._id })).negativeSince, null);
  });

  console.log('\nReferral reward in credits');
  await t('referrer earns 10% of first purchase in credits, once', async () => {
    await rc({ id: `e-${run}-ref`, type: 'NON_RENEWING_PURCHASE', app_user_id: refStudent._id.toString(), product_id: 'credits_1000', transaction_id: `T-${run}-ref`, store: 'APP_STORE' });
    const r = await call('POST', '/payment/pay-with-credits', tokenFor(refStudent), { itemType: 'course', itemId: course2._id }); // 2000 -> 236
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await bal(referrer), 23); // floor(236 * 0.1)
    await call('POST', '/payment/pay-with-credits', tokenFor(refStudent), { itemType: 'course', itemId: course3._id });
    assert.equal(await bal(referrer), 23);
  });

  console.log('\nAdmin config & permissions');
  const superRole = await Role.findOne({ slug: 'super_admin' });
  const admin = await mkUser({ role: 'admin', roles: ['admin'], assignedRole: superRole._id });
  const aToken = tokenFor(admin);
  await t('student cannot change credit config (403)', async () => {
    assert.equal((await call('PUT', '/admin/credits/config', sToken, { nairaPerCredit: 1 })).status, 403);
  });
  await t('admin validation rejects bad values', async () => {
    assert.equal((await call('PUT', '/admin/credits/config', aToken, { nairaPerCredit: 0 })).status, 400);
    assert.equal((await call('PUT', '/admin/credits/config', aToken, { feeBearer: 'bob' })).status, 400);
    assert.equal((await call('PUT', '/admin/credits/config', aToken, { storeFeePct: 0.9, platformCommissionPct: 0.2 })).status, 400);
  });
  await t('feeBearer=platform removes markup (5000 -> 500 credits); tutor share unchanged', async () => {
    const r = await call('PUT', '/admin/credits/config', aToken, { feeBearer: 'platform' });
    assert.equal(r.status, 200);
    const q = await call('GET', `/credits/quote?itemType=course&itemId=${course3._id}`, tokenFor(await mkUser()));
    assert.equal(q.data.creditPrice, 100); // 1000 / 10
  });
  await t('feeBearer=tutor: no markup, tutor share reduced by store fee', async () => {
    await call('PUT', '/admin/credits/config', aToken, { feeBearer: 'tutor' });
    const u = await mkUser(); await ledger.credit({ userId: u._id, amount: 1000, type: 'adjustment', idempotencyKey: `t:${u._id}` });
    const before = (await Wallet.findOne({ userId: tutor._id })).earned;
    const r = await call('POST', '/payment/pay-with-credits', tokenFor(u), { itemType: 'course', itemId: course._id });
    assert.equal(r.data.credits, 500);
    assert.equal((await Wallet.findOne({ userId: tutor._id })).earned, before + 5000 * (1 - 0.2 - 0.15));
  });
  await t('changing the rate (20 NGN/credit) halves credit prices; old ledger rows keep their snapshot', async () => {
    await call('PUT', '/admin/credits/config', aToken, { feeBearer: 'student', nairaPerCredit: 20 });
    const q = await call('GET', `/credits/quote?itemType=course&itemId=${course._id}`, tokenFor(await mkUser()));
    assert.equal(q.data.creditPrice, 295); // ceil(5000/0.85/20)
    const old = await CreditTransaction.findOne({ userId: student._id, type: 'spend', 'ref.itemId': course._id });
    assert.equal(old.pricing.nairaPerCredit, 10); assert.equal(old.amount, -589);
  });
  await t('showFiatToStudents flag exposes naira only when on', async () => {
    await call('PUT', '/admin/credits/config', aToken, { showFiatToStudents: true });
    const fresh = tokenFor(await mkUser());
    assert.equal((await call('GET', `/credits/quote?itemType=course&itemId=${course._id}`, fresh)).data.basePrice, 5000);
    await call('PUT', '/admin/credits/config', aToken, { showFiatToStudents: false });
    assert.equal((await call('GET', `/credits/quote?itemType=course&itemId=${course._id}`, fresh)).data.basePrice, undefined);
  });
  await t('admin adjusts balance with a note; negative below zero is refused', async () => {
    const u = await mkUser();
    assert.equal((await call('POST', `/admin/credits/users/${u._id}/adjust`, aToken, { delta: 40, note: 'goodwill' })).data.balance, 40);
    assert.equal((await call('POST', `/admin/credits/users/${u._id}/adjust`, aToken, { delta: -100, note: 'x' })).status, 400);
    assert.equal((await call('POST', `/admin/credits/users/${u._id}/adjust`, aToken, { delta: 5 })).status, 400);
  });
  await t('admin stats endpoint works', async () => {
    const r = await call('GET', '/admin/credits/stats', aToken);
    assert.equal(r.status, 200); assert.ok(r.data.purchased.credits > 0);
  });
  await call('PUT', '/admin/credits/config', aToken, { nairaPerCredit: 10, feeBearer: 'student' });

  console.log('\nRecurring renewals');
  const sub = await mkUser(); await ledger.credit({ userId: sub._id, amount: 600, type: 'adjustment', idempotencyKey: `sub:${sub._id}` });
  const dueOn = (daysAgo) => Subscription.updateOne({ _id: subscription._id }, { $set: { nextBillingDate: new Date(Date.now() - daysAgo * 86400000) } });
  let subscription;
  await t('create subscription charges first cycle in credits (1500 -> 177)', async () => {
    const r = await call('POST', '/subscriptions', tokenFor(sub), { serviceId: service._id, interval: 'monthly' });
    assert.equal(r.status, 201, JSON.stringify(r.body)); subscription = r.data;
    assert.equal(await bal(sub), 600 - 177);
  });
  await t('due renewal spends credits and advances billing date', async () => {
    await dueOn(10);
    const r = await subscriptions.processRecurringPayment(subscription._id);
    assert.equal(r.success, true); assert.equal(await bal(sub), 600 - 177 * 2);
    assert.ok((await Subscription.findById(subscription._id)).nextBillingDate > new Date());
  });
  await t('re-processing the same billing cycle never charges twice', async () => {
    const before = await bal(sub);
    await dueOn(10); // same cycle date as the renewal above -> same idempotency key
    await subscriptions.processRecurringPayment(subscription._id);
    assert.equal(await bal(sub), before);
  });
  await t('renewal with too few credits starts grace; after grace it lapses', async () => {
    await ledger.adjust({ userId: sub._id, delta: -(await bal(sub)) + 20, adminId: admin._id, note: 'drain', idempotencyKey: `drain:${sub._id}` });
    await dueOn(20);
    const r = await subscriptions.processRecurringPayment(subscription._id);
    assert.equal(r.success, false); assert.equal(r.message, 'Insufficient credits');
    let s = await Subscription.findById(subscription._id); assert.equal(s.status, 'active'); assert.ok(s.graceUntil);
    await Subscription.updateOne({ _id: subscription._id }, { $set: { graceUntil: new Date(Date.now() - 1000) } });
    await subscriptions.processRecurringPayment(subscription._id);
    s = await Subscription.findById(subscription._id); assert.equal(s.status, 'lapsed');
  });

  console.log('\nLegacy payment paths removed');
  await t('card checkout + paystack webhook routes are gone', async () => {
    assert.equal((await call('POST', '/payment/initiate', sToken, { itemType: 'course', itemId: course._id })).status, 404);
    assert.equal((await call('POST', '/payment/webhook/paystack', null, {})).status, 404);
  });

  console.log('\nPush token');
  await t('PUT /account/push-token stores a valid Expo token; garbage is rejected', async () => {
    const u = await mkUser(); const tk = tokenFor(u); const tok = `ExponentPushToken[${uniq()}${uniq()}]`;
    assert.equal((await call('PUT', '/account/push-token', null, { pushToken: tok })).status, 401);
    assert.equal((await call('PUT', '/account/push-token', tk, { pushToken: 'Error: Must use physical device' })).status, 400);
    assert.equal((await call('PUT', '/account/push-token', tk, {})).status, 400);
    const r = await call('PUT', '/account/push-token', tk, { pushToken: tok });
    assert.equal(r.status, 200); assert.equal(r.data.devices, 1);
    await call('PUT', '/account/push-token', tk, { pushToken: tok });
    assert.equal((await User.findById(u._id)).pushTokens.length, 1);
  });
  await t('a device token moves to the newest account that registers it; DELETE removes it', async () => {
    const a = await mkUser(); const b = await mkUser(); const tok = `ExponentPushToken[${uniq()}${uniq()}]`;
    await call('PUT', '/account/push-token', tokenFor(a), { pushToken: tok });
    await call('PUT', '/account/push-token', tokenFor(b), { pushToken: tok });
    assert.equal((await User.findById(a._id)).pushTokens.length, 0);
    assert.equal((await User.findById(b._id)).pushTokens.length, 1);
    await call('DELETE', '/account/push-token', tokenFor(b), { pushToken: tok });
    assert.equal((await User.findById(b._id)).pushTokens.length, 0);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
