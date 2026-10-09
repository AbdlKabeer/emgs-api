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

// Replays of the same idempotencyKey return the original ledger row instead of applying twice.
async function findByKey(key) {
  return CreditTransaction.findOne({ idempotencyKey: key });
}

async function writeRow(fields) {
  try {
    return await CreditTransaction.create(fields);
  } catch (err) {
    if (err.code === 11000) return findByKey(fields.idempotencyKey);
    throw err;
  }
}

/**
 * Add credits. Idempotent on idempotencyKey. `type` is purchase | bonus | referral | adjustment | refund.
 * Returns { applied, transaction, balance }.
 */
async function credit({ userId, amount, type, idempotencyKey, store, ref, pricing, note, createdBy }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('credit amount must be a positive integer');
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  await getAccount(userId);
  const inc = { balance: amount };
  if (type === 'purchase') inc.lifetimePurchased = amount;
  const acct = await CreditAccount.findOneAndUpdate({ userId }, { $inc: inc }, { new: true });
  if (acct.balance >= 0 && acct.negativeSince) {
    await CreditAccount.updateOne({ userId }, { $set: { negativeSince: null } });
  }
  const transaction = await writeRow({
    userId, type, amount, balanceAfter: acct.balance, idempotencyKey, store, ref, pricing, note, createdBy,
  });
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

  await getAccount(userId);
  const acct = await CreditAccount.findOneAndUpdate(
    { userId, balance: { $gte: amount }, negativeSince: null },
    { $inc: { balance: -amount, lifetimeSpent: amount } },
    { new: true }
  );
  if (!acct) throw new InsufficientCreditsError(amount, await getBalance(userId));
  const transaction = await writeRow({
    userId, type, amount: -amount, balanceAfter: acct.balance, idempotencyKey, ref, pricing, note,
  });
  return { applied: true, transaction, balance: acct.balance };
}

// Store refund: always applies, may take the balance negative and blocks spending until topped up.
async function clawback({ userId, amount, idempotencyKey, store, note }) {
  const existing = await findByKey(idempotencyKey);
  if (existing) return { applied: false, transaction: existing, balance: existing.balanceAfter };

  await getAccount(userId);
  const acct = await CreditAccount.findOneAndUpdate({ userId }, { $inc: { balance: -amount } }, { new: true });
  if (acct.balance < 0 && !acct.negativeSince) {
    await CreditAccount.updateOne({ userId }, { $set: { negativeSince: new Date() } });
  }
  const transaction = await writeRow({
    userId, type: 'clawback', amount: -amount, balanceAfter: acct.balance, idempotencyKey, store, note,
  });
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
  await getAccount(userId);
  const acct = await CreditAccount.findOneAndUpdate(
    { userId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
  if (!acct) throw new InsufficientCreditsError(amount, await getBalance(userId));
  const transaction = await writeRow({
    userId, type: 'adjustment', amount: -amount, balanceAfter: acct.balance, idempotencyKey, note, createdBy: adminId,
  });
  return { applied: true, transaction, balance: acct.balance };
}

module.exports = { InsufficientCreditsError, getAccount, getBalance, credit, spend, clawback, adjust };
