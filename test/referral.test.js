/**
 * Tests for the referral system: sign-up code matching and the first-purchase credit reward.
 * Needs only a local/throwaway MongoDB (no API server):
 *
 *   docker run -d --name emgs-test-mongo -p 27018:27017 mongo:7      # once
 *   npm run test:referral
 *
 * Override the target with REFERRAL_TEST_MONGODB_URI. Refuses to run against a non-local database.
 */
// Nothing in here may reach real email or CRM services. Set before any controller is required.
process.env.DISABLE_OUTBOUND_WEBHOOKS = 'true';
process.env.RESEND_API_KEY = 're_dummy_local';
delete process.env.RESEND_FROM_ADDRESS;
process.env.EMAIL_HOST = '127.0.0.1';
process.env.EMAIL_PORT = '1';

const assert = require('assert');
const mongoose = require('mongoose');

const URI = process.env.REFERRAL_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/referral_test';
if (!/(127\.0\.0\.1|localhost|emgs-test-mongo)/.test(URI)) {
  console.error('Refusing to run: REFERRAL_TEST_MONGODB_URI must point at a local/throwaway database');
  process.exit(2);
}

// Sign-up sends a verification email; swap it for a no-op so tests make no network attempts.
require('../src/services/email.service').sendVerificationCodeEmail = async () => null;

const User = require('../src/models/user.model');
const CreditAccount = require('../src/models/credit-account.model');
const CreditTransaction = require('../src/models/credit-transaction.model');
const Notification = require('../src/models/notification.model');
const AppConfig = require('../src/models/app-config.model');
const { normalizeReferralCode } = require('../src/services/referral.service');
const { rewardReferrer } = require('../src/services/fulfilment.service');
const authController = require('../src/controllers/auth.controller');
const tutorController = require('../src/controllers/tutor.controller');
const creditController = require('../src/controllers/credit.controller');

let passed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const uniq = () => Math.random().toString(36).slice(2, 8);
const mkRes = () => ({
  code: null, body: null,
  status(c) { this.code = c; return this; },
  json(b) { this.body = b; return this; },
});
const mkUser = (extra = {}) => User.create({
  fullName: `User ${uniq()}`, email: `${uniq()}@example.test`, password: 'x', status: 'active',
  referralCode: `T${uniq().toUpperCase()}${uniq().toUpperCase()}`.slice(0, 8), ...extra,
});
const balance = async (userId) => (await CreditAccount.findOne({ userId }))?.balance ?? 0;
const referralRows = (userId) => CreditTransaction.find({ userId, type: 'referral' }).lean();

async function register(body) {
  const res = mkRes();
  await authController.register({ body: { password: 'Passw0rd#xyz', phone: '+2348000000000', userType: 'user', ...body } }, res);
  return res;
}
async function registerTutor(body) {
  const res = mkRes();
  await tutorController.registerTutor({ body: { password: 'Passw0rd#xyz', phone: '+2348000000000', ...body } }, res);
  return res;
}

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), CreditAccount.init(), CreditTransaction.init()]);

  console.log('\nCode normalisation');
  await t('uppercases and strips spaces, tabs, newlines, non-breaking and zero-width characters', () => {
    assert.equal(normalizeReferralCode('demostu1'), 'DEMOSTU1');
    assert.equal(normalizeReferralCode('  DemoStu1 \n'), 'DEMOSTU1');
    assert.equal(normalizeReferralCode(' demo​stu1﻿'), 'DEMOSTU1');
    assert.equal(normalizeReferralCode('   '), '');
    assert.equal(normalizeReferralCode(undefined), '');
    assert.equal(normalizeReferralCode(null), '');
    assert.equal(normalizeReferralCode(12345), '');
  });

  console.log('\nStudent sign-up with a referral code');
  const referrer = await mkUser({ referralCode: 'DEMOSTU1' });
  await t('a lowercase code is accepted and links the referrer', async () => {
    const email = `${uniq()}@example.test`;
    const res = await register({ fullName: 'Lower', email, referralCode: 'demostu1' });
    assert.equal(res.code, 201, JSON.stringify(res.body));
    assert.equal(String((await User.findOne({ email })).referredBy), String(referrer._id));
  });
  await t('a code padded with spaces and a non-breaking space is accepted', async () => {
    const email = `${uniq()}@example.test`;
    const res = await register({ fullName: 'Padded', email, referralCode: '   DEMOSTU1  ' });
    assert.equal(res.code, 201, JSON.stringify(res.body));
    assert.equal(String((await User.findOne({ email })).referredBy), String(referrer._id));
  });
  await t('an unknown code is still rejected with 400 and creates no account', async () => {
    const email = `${uniq()}@example.test`;
    const res = await register({ fullName: 'Nope', email, referralCode: 'NOPE1234' });
    assert.equal(res.code, 400);
    assert.equal(res.body.message, 'Invalid referral code');
    assert.equal(await User.countDocuments({ email }), 0);
  });
  await t('a whitespace-only code counts as no code', async () => {
    const email = `${uniq()}@example.test`;
    const res = await register({ fullName: 'Blank', email, referralCode: '   ' });
    assert.equal(res.code, 201, JSON.stringify(res.body));
    assert.equal((await User.findOne({ email })).referredBy, undefined);
  });
  await t('no code at all still registers normally', async () => {
    const email = `${uniq()}@example.test`;
    assert.equal((await register({ fullName: 'None', email })).code, 201);
  });

  console.log('\nTutor sign-up with a referral code');
  await t('a lowercase code links the referrer', async () => {
    const email = `${uniq()}@example.test`;
    const res = await registerTutor({ fullName: 'Tutor Lower', email, referralCode: 'demostu1' });
    assert.equal(res.code, 201, JSON.stringify(res.body));
    assert.equal(String((await User.findOne({ email })).referredBy), String(referrer._id));
  });
  await t('an unknown code is ignored (tutor sign-up still succeeds, nobody is credited)', async () => {
    const email = `${uniq()}@example.test`;
    const res = await registerTutor({ fullName: 'Tutor Nope', email, referralCode: 'NOPE1234' });
    assert.equal(res.code, 201, JSON.stringify(res.body));
    assert.equal((await User.findOne({ email })).referredBy, undefined);
  });

  console.log('\nFirst-purchase reward');
  await t('pays 10% of the first purchase in credits, records the referral, and notifies the referrer', async () => {
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id, fullName: 'Fran' });
    await rewardReferrer(f, 236);
    assert.equal(await balance(r._id), 23);
    const rows = await referralRows(r._id);
    assert.equal(rows.length, 1); assert.equal(rows[0].amount, 23);
    assert.equal(rows[0].idempotencyKey, `referral:${f._id}`);
    const fresh = await User.findById(f._id); assert.equal(fresh.referralPointDisbursed, true);
    assert.ok((await User.findById(r._id)).referrals.some((id) => id.equals(f._id)));
    assert.equal(await Notification.countDocuments({ userId: r._id, title: 'Referral reward' }), 1);
  });
  await t('pays only once: a second purchase, even with a stale in-memory user, adds nothing', async () => {
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id });
    const stale = await User.findById(f._id);
    await rewardReferrer(f, 236);
    await rewardReferrer(await User.findById(f._id), 589);
    await rewardReferrer(stale, 589);
    assert.equal(await balance(r._id), 23);
    assert.equal((await referralRows(r._id)).length, 1);
    assert.equal(await Notification.countDocuments({ userId: r._id, title: 'Referral reward' }), 1);
  });
  await t('a first purchase too small to earn a whole credit leaves the referral open', async () => {
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id });
    await rewardReferrer(f, 6);
    assert.equal(await balance(r._id), 0);
    assert.equal((await User.findById(f._id)).referralPointDisbursed, false);
    assert.equal((await User.findById(r._id)).referrals.length, 0);
    await rewardReferrer(await User.findById(f._id), 236);
    assert.equal(await balance(r._id), 23);
    assert.equal((await User.findById(f._id)).referralPointDisbursed, true);
    assert.equal((await User.findById(r._id)).referrals.length, 1);
  });
  await t('five concurrent first purchases pay once, notify once, and record the referral once', async () => {
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id });
    const docs = await Promise.all(Array.from({ length: 5 }, () => User.findById(f._id)));
    await Promise.all(docs.map((d) => rewardReferrer(d, 236)));
    assert.equal(await balance(r._id), 23);
    assert.equal((await referralRows(r._id)).length, 1);
    assert.equal(await Notification.countDocuments({ userId: r._id, title: 'Referral reward' }), 1);
    assert.equal((await User.findById(r._id)).referrals.length, 1);
  });
  await t('a user nobody referred triggers nothing', async () => {
    const f = await mkUser();
    await rewardReferrer(f, 236);
    assert.equal((await User.findById(f._id)).referralPointDisbursed, false);
    assert.equal((await referralRows(f._id)).length, 0);
  });
  await t('a referrer whose account is gone does not break the purchase and leaves the referral open', async () => {
    const f = await mkUser({ referredBy: new mongoose.Types.ObjectId() });
    await rewardReferrer(f, 236);
    assert.equal((await User.findById(f._id)).referralPointDisbursed, false);
  });
  await t('a reward rate of 0 pays nothing and leaves the referral open', async () => {
    await AppConfig.updateOne({ key: 'global' }, { $set: { 'credits.referralRewardPct': 0 } }, { upsert: true });
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id });
    await rewardReferrer(f, 236);
    assert.equal(await balance(r._id), 0);
    assert.equal((await User.findById(f._id)).referralPointDisbursed, false);
    await AppConfig.updateOne({ key: 'global' }, { $unset: { 'credits.referralRewardPct': '' } });
  });
  await t('the reward follows the configured rate', async () => {
    await AppConfig.updateOne({ key: 'global' }, { $set: { 'credits.referralRewardPct': 0.25 } }, { upsert: true });
    const r = await mkUser(); const f = await mkUser({ referredBy: r._id });
    await rewardReferrer(f, 236);
    assert.equal(await balance(r._id), 59); // floor(236 * 0.25)
    await AppConfig.updateOne({ key: 'global' }, { $unset: { 'credits.referralRewardPct': '' } });
  });

  console.log('\nPublic credit config');
  await t('GET /credits/config exposes the referral reward rate so the app can describe it', async () => {
    const res = mkRes();
    await creditController.getConfig({}, res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.referralRewardPct, 0.1);
  });

  await mongoose.connection.dropDatabase();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
