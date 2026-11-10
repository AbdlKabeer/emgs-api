const mongoose = require('mongoose');

// One row per RevenueCat webhook event we received (authorised requests only), including the outcome,
// so "did RevenueCat call us, and what did we do?" can be answered from the database.
// Redeliveries of the same event id update the row (attempts, last outcome) instead of adding rows.
const creditWebhookEventSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'revenuecat' },
    eventId: { type: String, index: true },
    type: String,
    environment: String, // SANDBOX | PRODUCTION
    store: String,
    appUserId: String,
    productId: String,
    transactionId: String,
    // applied | duplicate | failed | refunded | refund_duplicate | refund_unknown | ignored | error
    outcome: { type: String, index: true },
    reason: String,
    attempts: { type: Number, default: 1 },
    payload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Keep roughly six months of history
creditWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model('CreditWebhookEvent', creditWebhookEventSchema);
