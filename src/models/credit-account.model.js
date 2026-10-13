const mongoose = require('mongoose');

const creditAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 }, // integer credits
    lifetimePurchased: { type: Number, default: 0 },
    lifetimeSpent: { type: Number, default: 0 },
    // Set when a store refund pushes the balance below zero; blocks spending until cleared
    negativeSince: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditAccount', creditAccountSchema);
