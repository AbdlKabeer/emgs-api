const mongoose = require('mongoose');

const creditAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 }, // integer credits
    lifetimePurchased: { type: Number, default: 0 },
    lifetimeSpent: { type: Number, default: 0 },
    // Set when a store refund pushes the balance below zero; blocks spending until cleared
    negativeSince: { type: Date, default: null },
    // Most recent idempotency keys applied to this balance. The key check and the balance change
    // happen in one atomic update, which is what stops concurrent duplicates from both applying.
    appliedKeys: { type: [String], select: false, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditAccount', creditAccountSchema);
