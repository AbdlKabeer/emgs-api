const CreditAccount = require('../models/credit-account.model');
const CreditTransaction = require('../models/credit-transaction.model');

class InsufficientCreditsError extends Error {
  constructor(required, balance) {
    super('Insufficient credits');
    this.code = 'INSUFFICIENT_CREDITS';
    this.required = required;
    this.balance = balance;
    this.shortfall = Math.max(0, required - balance);
  }
}

const APPLIED_KEYS_KEPT = 100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAccount(userId) {
  return CreditAccount.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: 0 } },
    { new: true, upsert: true }
  );
}

async function getBalance(userId) {
  const acct = await CreditAccount.findOne({ userId }).lean();
  return acct ? acct.balance : 0;
}

async function findByKey(key) {
  return CreditTransaction.findOne({ idempotencyKey: key });
}

// Duplicate-key on the idempotency key means another call already wrote this row. Any other
// duplicate-key error is a real problem and must surface instead of silently dropping the row.
async function writeRow(fields) {
  try {
    return await CreditTransaction.create(fields);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await findByKey(fields.idempotencyKey);
      if (existing) return existing;
    }
    throw err;
  }
}

// Reject a row the schema would refuse before the balance moves, so a bad row can never leave a
// balance change without a ledger entry.
async function validateRow(fields) {
  await new CreditTransaction({ ...fields, balanceAfter: 0 }).validate();
}

/**
 * Apply a balance change exactly once per idempotencyKey. The key guard and the $inc are a single
 * atomic single-document update, so of any number of concurrent calls with the same key only one
 * matches. Returns the updated account, or null when the key was already applied or `filter`
 * (e.g. "balance covers the spend") did not match.
 */
function applyOnce(userId, key, inc, filter = {}) {
  return CreditAccount.findOneAndUpdate(
    { userId, appliedKeys: { $ne: key }, ...filter },
    { $inc: inc, $push: { appliedKeys: { $each: [key], $slice: -APPLIED_KEYS_KEPT } } },
    { new: true }
  );
}

async function wasApplied(userId, key) {
  return !!(await CreditAccount.exists({ userId, appliedKeys: key }));
}

/**
 * A duplicate of an already-applied key. The winning call is about to write (or has written) the
 * ledger row, so wait briefly for it. If it never appears the winner crashed between moving the
 * balance and writing the row; write the row now so the ledger heals on the retry.
 */
async function replay(userId, key, rowFields) {
  for (let i = 0; i < 5; i++) {
    const row = await findByKey(key);
    if (row) return { applied: false, transaction: row, balance: row.balanceAfter };
    await sleep(40);
  }
  const balance = await getBalance(userId);
  const note = `${rowFields.note || ''} [recovered]`.trim();
  const transaction = await writeRow({ ...rowFields, balanceAfter: balance, note });
  return { applied: false, transaction, balance };
}

/**
 * Add credits. Idempotent on idempotencyKey. `type` is purchase | bonus | referral | adjustment | refund.
 * Returns { applied, transaction, balance }.
 */
async function credit({ userId, amount, type, idempotencyKey, store, ref, pricing, note, createdBy }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('credit amount must be a positive integer');
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  const row = { userId, type, amount, idempotencyKey, store, ref, pricing, note, createdBy };
  await validateRow(row);
  await getAccount(userId);

  const inc = { balance: amount };
  if (type === 'purchase') inc.lifetimePurchased = amount;
  const acct = await applyOnce(userId, idempotencyKey, inc);
  if (!acct) return replay(userId, idempotencyKey, row);

  if (acct.balance >= 0 && acct.negativeSince) {
    await CreditAccount.updateOne({ userId }, { $set: { negativeSince: null } });
  }
  const transaction = await writeRow({ ...row, balanceAfter: acct.balance });
  return { applied: true, transaction, balance: acct.balance };
}

/**
 * Atomically remove credits. Fails with InsufficientCreditsError if the balance does not cover it
 * (or the account is in a negative state from a store refund).
 */
async function spend({ userId, amount, type = 'spend', idempotencyKey, ref, pricing, note }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('spend amount must be a positive integer');
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  const row = { userId, type, amount: -amount, idempotencyKey, ref, pricing, note };
  await validateRow(row);
  await getAccount(userId);

  const acct = await applyOnce(
    userId, idempotencyKey, { balance: -amount, lifetimeSpent: amount },
    { balance: { $gte: amount }, negativeSince: null }
  );
  if (!acct) {
    if (await wasApplied(userId, idempotencyKey)) return replay(userId, idempotencyKey, row);
    throw new InsufficientCreditsError(amount, await getBalance(userId));
  }
  const transaction = await writeRow({ ...row, balanceAfter: acct.balance });
  return { applied: true, transaction, balance: acct.balance };
}

// The refund row must not carry the purchase's storeTransactionId: that field is unique across
// the ledger, so a clawback reusing it would collide with the purchase row it is reversing.
function refundStore(store) {
  if (!store) return store;
  const { storeTransactionId, ...rest } = store;
  return { ...rest, refundOfTransactionId: storeTransactionId };
}

// Store refund: always applies, may take the balance negative and blocks spending until topped up.
async function clawback({ userId, amount, idempotencyKey, store, note }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('clawback amount must be a positive integer');
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  const row = { userId, type: 'clawback', amount: -amount, idempotencyKey, store: refundStore(store), note };
  await validateRow(row);
  await getAccount(userId);

  const acct = await applyOnce(userId, idempotencyKey, { balance: -amount });
  if (!acct) return replay(userId, idempotencyKey, row);

  if (acct.balance < 0 && !acct.negativeSince) {
    await CreditAccount.updateOne({ userId }, { $set: { negativeSince: new Date() } });
  }
  const transaction = await writeRow({ ...row, balanceAfter: acct.balance });
  return { applied: true, transaction, balance: acct.balance };
}

// Admin-initiated delta (positive or negative); negative cannot go below zero.
async function adjust({ userId, delta, adminId, note, idempotencyKey }) {
  if (delta > 0) {
    return credit({ userId, amount: delta, type: 'adjustment', idempotencyKey, note, createdBy: adminId });
  }
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  const amount = Math.abs(delta);
  const row = { userId, type: 'adjustment', amount: -amount, idempotencyKey, note, createdBy: adminId };
  await validateRow(row);
  await getAccount(userId);

  const acct = await applyOnce(userId, idempotencyKey, { balance: -amount }, { balance: { $gte: amount } });
  if (!acct) {
    if (await wasApplied(userId, idempotencyKey)) return replay(userId, idempotencyKey, row);
    throw new InsufficientCreditsError(amount, await getBalance(userId));
  }
  const transaction = await writeRow({ ...row, balanceAfter: acct.balance });
  return { applied: true, transaction, balance: acct.balance };
}

module.exports = { InsufficientCreditsError, getAccount, getBalance, credit, spend, clawback, adjust };
