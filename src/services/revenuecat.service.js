const axios = require('axios');

function webhookAuthorized(req) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = req.header('Authorization') || '';
  return header === secret || header === `Bearer ${secret}`;
}

/**
 * Fetch a user's non-subscription (consumable) purchases from RevenueCat's REST API.
 * Returns [{ productId, storeTransactionId, store }].
 */
async function fetchConsumablePurchases(appUserId) {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) {
    const err = new Error('RevenueCat is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  const { data } = await axios.get(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 });
  const out = [];
  const nonSubs = data?.subscriber?.non_subscriptions || {};
  for (const [productId, entries] of Object.entries(nonSubs)) {
    for (const e of entries) {
      out.push({ productId, storeTransactionId: e.store_transaction_id || e.id, store: e.store });
    }
  }
  return out;
}

module.exports = { webhookAuthorized, fetchConsumablePurchases };
