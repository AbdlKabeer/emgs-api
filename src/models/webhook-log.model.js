const mongoose = require('mongoose');

/**
 * One row per inbound webhook request, written when the request finishes.
 * `body` and `headers` are stored as JSON text (not Mixed) because providers send keys Mongo
 * dislikes, e.g. RevenueCat subscriber_attributes use names like "$email".
 * Secrets are redacted before anything reaches this model (see middleware/webhook-log.middleware.js).
 */
const webhookLogSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    method: String,
    path: String,
    query: String,
    ip: String,
    headers: String,
    body: String,
    bodyBytes: Number,
    bodyTruncated: { type: Boolean, default: false },
    eventType: String,
    eventId: String,
    // processed = 2xx, rejected = 4xx (bad secret/signature, bad input), error = 5xx or dropped connection
    status: { type: String, enum: ['processed', 'rejected', 'error'], required: true },
    statusCode: Number,
    durationMs: Number,
    response: String,
    error: String,
    // Rejected calls come from anyone on the internet, so they are kept for a much shorter time.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

webhookLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
webhookLogSchema.index({ provider: 1, createdAt: -1 });
webhookLogSchema.index({ status: 1, createdAt: -1 });
webhookLogSchema.index({ eventId: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
