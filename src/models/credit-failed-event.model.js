const mongoose = require('mongoose');

// Webhook events we could not apply (unknown product/user etc.), kept for manual review.
const creditFailedEventSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'revenuecat' },
    eventId: String,
    reason: String,
    payload: mongoose.Schema.Types.Mixed,
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditFailedEvent', creditFailedEventSchema);
