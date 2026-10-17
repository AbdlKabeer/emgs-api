/**
 * Ledger-level tests for the credit system: idempotency under concurrency and store refunds.
 * Needs only a local/throwaway MongoDB (no API server):
 *
 *   docker run -d --name emgs-test-mongo -p 27018:27017 mongo:7      # once
 *   npm run test:ledger
 *
 * Override the target with LEDGER_TEST_MONGODB_URI. Refuses to run against a non-local database.
 */
const assert = require('assert');
const mongoose = require('mongoose');

const URI = process.env.LEDGER_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/credit_ledger_test';
if (!/(127\.0\.0\.1|localhost|emgs-test-mongo)/.test(URI)) {
  console.error('Refusing to run: LEDGER_TEST_MONGODB_URI must point at a local/throwaway database');
  process.exit(2);
}

const ledger = require('../src/services/credit-ledger.service');
const CreditAccount = require('../src/models/credit-account.model');
const CreditTransaction = require('../src/models/credit-transaction.model');

let passed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const oid = () => new mongoose.Types.ObjectId();
const balanceOf = async (userId) => (await CreditAccount.findOne({ userId })).balance;
const rowsOf = (userId, filter = {}) => CreditTransaction.find({ userId, ...filter }).lean();
const purchase = (userId, txn, amount = 100) => ledger.credit({
  userId, amount, type: 'purchase', idempotencyKey: `store:${txn}`,
  store: { platform: 'APP_STORE', productId: 'credits_100', storeTransactionId: txn },
});
const refund = (userId, txn, amount = 100) => ledger.clawback({
  userId, amount, idempotencyKey: `clawback:${txn}`,
  store: { platform: 'APP_STORE', productId: 'credits_100', storeTransactionId: txn }, note: 'Store refund',
});
const fund = (userId, amount) => ledger.credit({
  userId, amount, type: 'adjustment', idempotencyKey: `fund:${userId}:${Math.random()}`,
});

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await CreditAccount.init();
  await CreditTransaction.init();

  console.log('\nStore refunds');
  await t('a refund writes its own clawback row and leaves the purchase row intact', async () => {
    const u = oid(); await purchase(u, 'T-1');
    const r = await refund(u, 'T-1');
    assert.equal(r.applied, true); assert.ok(r.transaction, 'clawback must return its ledger row');
    assert.equal(await balanceOf(u), 0);
    const rows = await rowsOf(u);
    assert.deepEqual(rows.map((x) => x.type).sort(), ['clawback', 'purchase']);
    const claw = rows.find((x) => x.type === 'clawback');
    assert.equal(claw.amount, -100); assert.equal(claw.store.refundOfTransactionId, 'T-1');
    assert.equal(claw.store.storeTransactionId, undefined);
    assert.equal(rows.find((x) => x.type === 'purchase').store.storeTransactionId, 'T-1');
  });
  await t('a replayed refund event is a no-op', async () => {
    const u = oid(); await purchase(u, 'T-2');
    await refund(u, 'T-2');
    const again = await refund(u, 'T-2');
    assert.equal(again.applied, false);
    assert.equal(await balanceOf(u), 0);
    assert.equal((await rowsOf(u, { type: 'clawback' })).length, 1);
  });
  await t('the same refund delivered 5x concurrently deducts once', async () => {
    const u = oid(); await purchase(u, 'T-3');
    const results = await Promise.all(Array.from({ length: 5 }, () => refund(u, 'T-3')));
    assert.equal(results.filter((x) => x.applied).length, 1);
    assert.equal(await balanceOf(u), 0);
    assert.equal((await rowsOf(u, { type: 'clawback' })).length, 1);
  });
  await t('a refund after spending goes negative, blocks spending, and a top-up clears it', async () => {
    const u = oid(); await purchase(u, 'T-4');
    await ledger.spend({ userId: u, amount: 90, idempotencyKey: `use:${u}` });
    await refund(u, 'T-4');
    assert.equal(await balanceOf(u), -90);
    assert.ok((await CreditAccount.findOne({ userId: u })).negativeSince);
    await assert.rejects(ledger.spend({ userId: u, amount: 1, idempotencyKey: `blocked:${u}` }),
      (e) => e.code === 'INSUFFICIENT_CREDITS');
    await purchase(u, 'T-4b', 100);
    assert.equal(await balanceOf(u), 10);
    assert.equal((await CreditAccount.findOne({ userId: u })).negativeSince, null);
  });

  console.log('\nConcurrent duplicate deliveries');
  await t('one purchase delivered 5x concurrently credits once', async () => {
    const u = oid();
    const results = await Promise.all(Array.from({ length: 5 }, () => purchase(u, 'T-5')));
    assert.equal(results.filter((x) => x.applied).length, 1);
    assert.equal(await balanceOf(u), 100);
    assert.equal((await rowsOf(u)).length, 1);
    assert.equal((await CreditAccount.findOne({ userId: u })).lifetimePurchased, 100);
  });
  await t('every concurrent duplicate returns the same ledger row', async () => {
    const u = oid();
    const results = await Promise.all(Array.from({ length: 5 }, () => purchase(u, 'T-6')));
    const ids = new Set(results.map((x) => String(x.transaction._id)));
    assert.equal(ids.size, 1);
  });
  await t('the same spend key sent 5x concurrently charges once', async () => {
    const u = oid(); await fund(u, 100);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () =>
      ledger.spend({ userId: u, amount: 30, idempotencyKey: `same:${u}` })));
    assert.ok(results.every((x) => x.status === 'fulfilled'));
    assert.equal(await balanceOf(u), 70);
    assert.equal((await rowsOf(u, { type: 'spend' })).length, 1);
  });
  await t('20 parallel distinct spends against a balance covering 3: exactly 3 succeed', async () => {
    const u = oid(); await fund(u, 300);
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) =>
      ledger.spend({ userId: u, amount: 100, idempotencyKey: `race:${u}:${i}` })));
    assert.equal(results.filter((x) => x.status === 'fulfilled').length, 3);
    assert.equal(await balanceOf(u), 0);
    assert.equal((await rowsOf(u, { type: 'spend' })).length, 3);
  });
  await t('a negative admin adjustment sent concurrently applies once', async () => {
    const u = oid(); await fund(u, 100);
    const key = `adj:${u}`;
    await Promise.all(Array.from({ length: 5 }, () =>
      ledger.adjust({ userId: u, delta: -40, adminId: oid(), note: 'x', idempotencyKey: key })));
    assert.equal(await balanceOf(u), 60);
  });

  console.log('\nFailure handling');
  await t('an insufficient-funds spend is not remembered: the same key works after a top-up', async () => {
    const u = oid(); await fund(u, 10);
    const key = `retry:${u}`;
    await assert.rejects(ledger.spend({ userId: u, amount: 50, idempotencyKey: key }), (e) => e.code === 'INSUFFICIENT_CREDITS');
    await fund(u, 100);
    const r = await ledger.spend({ userId: u, amount: 50, idempotencyKey: key });
    assert.equal(r.applied, true); assert.equal(await balanceOf(u), 60);
  });
  await t('a row the schema would reject is refused before the balance moves', async () => {
    const u = oid();
    await assert.rejects(ledger.credit({ userId: u, amount: 100, type: 'not-a-type', idempotencyKey: `bad:${u}` }));
    assert.equal(await ledger.getBalance(u), 0);
  });
  await t('crash recovery: balance moved but the row was never written -> the retry writes the row, no double credit', async () => {
    const u = oid(); const key = 'store:T-crash';
    await ledger.getAccount(u);
    await CreditAccount.updateOne({ userId: u }, { $inc: { balance: 100 }, $push: { appliedKeys: key } });
    const r = await purchase(u, 'T-crash');
    assert.equal(r.applied, false);
    assert.equal(await balanceOf(u), 100);
    const rows = await rowsOf(u);
    assert.equal(rows.length, 1); assert.ok(/recovered/.test(rows[0].note));
  });
  await t('the account keeps only the most recent applied keys and never returns them by default', async () => {
    const u = oid();
    for (let i = 0; i < 120; i++) await ledger.credit({ userId: u, amount: 1, type: 'bonus', idempotencyKey: `b:${u}:${i}` });
    const acct = await CreditAccount.findOne({ userId: u }).select('+appliedKeys');
    assert.equal(acct.appliedKeys.length, 100);
    assert.equal((await CreditAccount.findOne({ userId: u })).appliedKeys, undefined);
    assert.equal(await balanceOf(u), 120);
  });
  await t('a key older than the kept window is still deduplicated by its ledger row', async () => {
    const u = oid();
    await ledger.credit({ userId: u, amount: 5, type: 'bonus', idempotencyKey: `old:${u}` });
    for (let i = 0; i < 120; i++) await ledger.credit({ userId: u, amount: 1, type: 'bonus', idempotencyKey: `n:${u}:${i}` });
    const r = await ledger.credit({ userId: u, amount: 5, type: 'bonus', idempotencyKey: `old:${u}` });
    assert.equal(r.applied, false); assert.equal(await balanceOf(u), 125);
  });

  await mongoose.connection.dropDatabase();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
