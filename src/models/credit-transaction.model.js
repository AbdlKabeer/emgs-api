const mongoose = require('mongoose');

/**
 * Append-only credit ledger. Rows are never edited or deleted; corrections are new rows.
 * `amount` is signed (+ adds credits, - removes them).
 */
const creditTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['purchase', 'spend', 'refund', 'clawback', 'adjustment', 'bonus', 'renewal', 'referral'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    store: {
      platform: String,
      productId: String,
      // Purchase rows only: this is unique, so refund rows must reference the purchase via refundOfTransactionId.
      storeTransactionId: String,
      refundOfTransactionId: String,
      eventId: String,
    },
    ref: {
      itemType: String,
      itemId: { type: mongoose.Schema.Types.ObjectId },
      itemName: String,
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
      subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    },
    pricing: {
      basePrice: Number,
      creditPrice: Number,
      nairaPerCredit: Number,
      commissionPct: Number,
      storeFeePct: Number,
      feeBearer: String,
      tutorShare: Number,
      platformShare: Number,
    },
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditTransactionSchema.index({ 'store.storeTransactionId': 1 }, { unique: true, sparse: true });
creditTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
