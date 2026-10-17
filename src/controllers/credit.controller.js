const mongoose = require('mongoose');
const Payment = require('../models/payment.model');
const CreditPack = require('../models/credit-pack.model');
const CreditTransaction = require('../models/credit-transaction.model');
const CreditFailedEvent = require('../models/credit-failed-event.model');
const User = require('../models/user.model');
const ledger = require('../services/credit-ledger.service');
const pricing = require('../services/credit-pricing.service');
const items = require('../services/credit-items.service');
const fulfilment = require('../services/fulfilment.service');
const revenuecat = require('../services/revenuecat.service');
const {
  successResponse, badRequestResponse, internalServerErrorResponse, paginationResponse,
} = require('../utils/custom_response/responses');

const publicConfig = (cfg) => ({
  nairaPerCredit: cfg.nairaPerCredit,
  feeBearer: cfg.feeBearer,
  storeFeePct: cfg.storeFeePct,
  showFiatToStudents: cfg.showFiatToStudents,
  lowBalanceThreshold: cfg.lowBalanceThreshold,
  referralRewardPct: cfg.referralRewardPct,
  mockPurchases: process.env.ENABLE_MOCK_PURCHASES === 'true' && process.env.NODE_ENV !== 'production',
});

// GET /credits/config
exports.getConfig = async (req, res) => {
  try {
    const [cfg, packs] = await Promise.all([
      pricing.getCreditConfig(),
      CreditPack.find({ isActive: true }).sort({ sortOrder: 1, credits: 1 }).lean(),
    ]);
    return successResponse({ ...publicConfig(cfg), packs }, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

// GET /credits/balance
exports.getBalance = async (req, res) => {
  try {
    const acct = await ledger.getAccount(req.user.id);
    return successResponse({ balance: acct.balance, blocked: !!acct.negativeSince }, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

// GET /credits/transactions
exports.getTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { userId: req.user.id };
    if (req.query.type) filter.type = req.query.type;
    const [rows, total] = await Promise.all([
      CreditTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select('-store -pricing.tutorShare -pricing.platformShare -createdBy').lean(),
      CreditTransaction.countDocuments(filter),
    ]);
    return paginationResponse(rows, total, page, limit, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

const itemErrorResponse = (e, res) =>
  badRequestResponse(e.message, e.code || 'BAD_REQUEST', e.status || 400, res);

// GET /credits/quote?itemType&itemId
exports.getQuote = async (req, res) => {
  try {
    const { itemType, itemId } = req.query;
    const [item, cfg, balance] = await Promise.all([
      items.resolveItem(req.user.id, itemType, itemId),
      pricing.getCreditConfig(),
      ledger.getBalance(req.user.id),
    ]);
    const q = pricing.quote(item.basePrice, cfg);
    const data = {
      itemType: item.itemType, itemId: item.itemId, itemName: item.itemName,
      creditPrice: q.creditPrice, balance, shortfall: Math.max(0, q.creditPrice - balance),
      isFree: item.isFree,
    };
    if (cfg.showFiatToStudents) data.basePrice = item.basePrice;
    return successResponse(data, res);
  } catch (e) {
    if (e.code && e.status) return itemErrorResponse(e, res);
    return internalServerErrorResponse(e.message, res);
  }
};

// POST /payment/pay-with-credits
exports.payWithCredits = async (req, res) => {
  const userId = req.user.id;
  try {
    const { itemType, itemId, expectedCredits } = req.body;
    if (!itemType || !itemId) return badRequestResponse('itemType and itemId are required', 'BAD_REQUEST', 400, res);

    const item = await items.resolveItem(userId, itemType, itemId);
    const cfg = await pricing.getCreditConfig();
    const q = pricing.quote(item.basePrice, cfg);

    if (expectedCredits !== undefined && Number(expectedCredits) !== q.creditPrice) {
      return badRequestResponse('The price has changed', 'PRICE_CHANGED', 409, res, { creditPrice: q.creditPrice });
    }

    const payment = await Payment.create({
      userId, itemId: item.itemId, itemType: item.itemType, amount: item.basePrice, currency: 'NGN',
      status: 'pending', paymentMethod: 'credits', credits: q.creditPrice, pricing: q,
    });

    let spent = null;
    if (q.creditPrice > 0) {
      try {
        spent = await ledger.spend({
          userId, amount: q.creditPrice, idempotencyKey: `spend:${payment._id}`,
          ref: { itemType: item.itemType, itemId: item.itemId, itemName: item.itemName, paymentId: payment._id },
          pricing: q, note: item.itemName,
        });
      } catch (e) {
        payment.status = 'failed';
        await payment.save();
        if (e.code === 'INSUFFICIENT_CREDITS') {
          return badRequestResponse('Insufficient credits', 'INSUFFICIENT_CREDITS', 402, res,
            { required: e.required, balance: e.balance, shortfall: e.shortfall });
        }
        throw e;
      }
    }

    let result;
    try {
      result = await fulfilment.fulfil(payment);
    } catch (e) {
      payment.status = 'failed';
      await payment.save();
      if (spent) {
        await ledger.credit({
          userId, amount: q.creditPrice, type: 'refund', idempotencyKey: `refund:${payment._id}`,
          ref: { itemType: item.itemType, itemId: item.itemId, itemName: item.itemName, paymentId: payment._id },
          note: `Refund: ${e.message}`,
        });
      }
      if (e.status) return itemErrorResponse(e, res);
      throw e;
    }

    payment.status = 'completed';
    await payment.save();
    const balance = await ledger.getBalance(userId);
    return successResponse({ paymentId: payment._id, credits: q.creditPrice, balance, ...result }, res, 200,
      'Purchase successful');
  } catch (e) {
    if (e.code && e.status) return itemErrorResponse(e, res);
    console.error('[Credits] payWithCredits error:', e);
    return internalServerErrorResponse(e.message, res);
  }
};

// ---- Grants from the stores ----

async function grantPack({ userId, productId, storeTransactionId, platform, eventId }) {
  if (!storeTransactionId) return { ok: false, reason: 'Event has no transaction id' };
  // RevenueCat can send anonymous ids ($RCAnonymousID:...) or test-event UUIDs: never let them throw
  if (!mongoose.Types.ObjectId.isValid(userId) || String(userId).length !== 24) {
    return { ok: false, reason: `app_user_id is not one of our user ids: ${userId}` };
  }
  const pack = await CreditPack.findOne({ productId });
  if (!pack) return { ok: false, reason: `Unknown product ${productId}` };
  const user = await User.findById(userId).select('_id');
  if (!user) return { ok: false, reason: `Unknown user ${userId}` };
  const total = pack.credits + pack.bonusCredits;
  const r = await ledger.credit({
    userId, amount: total, type: 'purchase', idempotencyKey: `store:${storeTransactionId}`,
    store: { platform, productId, storeTransactionId, eventId },
    note: `${pack.label || productId}${pack.bonusCredits ? ` (+${pack.bonusCredits} bonus)` : ''}`,
  });
  return { ok: true, applied: r.applied, credits: total, balance: r.balance };
}

async function recordFailure(eventId, reason, payload) {
  await CreditFailedEvent.create({ eventId, reason, payload });
  console.error(`[Credits] webhook event not applied: ${reason}`);
}

// POST /credits/webhook/revenuecat
exports.revenueCatWebhook = async (req, res) => {
  if (!revenuecat.webhookAuthorized(req)) return res.status(401).json({ message: 'Unauthorized' });
  const event = req.body?.event;
  if (!event) return res.status(200).json({ ok: true });
  try {
    const txnId = event.transaction_id || event.original_transaction_id;
    const platform = event.store;
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        const r = await grantPack({
          userId: event.app_user_id, productId: event.product_id, storeTransactionId: txnId, platform, eventId: event.id,
        });
        if (!r.ok) await recordFailure(event.id, r.reason, req.body);
        break;
      }
      case 'CANCELLATION':
      case 'REFUND': {
        const orig = await CreditTransaction.findOne({ 'store.storeTransactionId': txnId, type: 'purchase' });
        if (!orig) {
          await recordFailure(event.id, `Refund for unknown transaction ${txnId}`, req.body);
          break;
        }
        await ledger.clawback({
          userId: orig.userId, amount: orig.amount, idempotencyKey: `clawback:${txnId}`,
          store: { platform, productId: event.product_id, storeTransactionId: txnId, eventId: event.id },
          note: 'Store refund',
        });
        break;
      }
      default:
        break; // TEST and other event types: acknowledge only
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[Credits] webhook error:', e);
    return res.status(500).json({ message: 'Webhook processing failed' }); // RevenueCat will retry
  }
};

// POST /credits/purchase/claim — sweep this user's RevenueCat purchases and grant any we missed
exports.claimPurchases = async (req, res) => {
  try {
    const userId = req.user.id.toString();
    const purchases = await revenuecat.fetchConsumablePurchases(userId);
    let granted = 0;
    for (const p of purchases) {
      const r = await grantPack({ userId, productId: p.productId, storeTransactionId: p.storeTransactionId, platform: p.store });
      if (r.ok && r.applied) granted += r.credits;
    }
    const balance = await ledger.getBalance(userId);
    return successResponse({ granted, balance }, res);
  } catch (e) {
    if (e.code === 'NOT_CONFIGURED') return badRequestResponse(e.message, 'NOT_CONFIGURED', 503, res);
    console.error('[Credits] claim error:', e.message);
    return internalServerErrorResponse(e.message, res);
  }
};

// POST /credits/dev/mock-purchase — local testing only; simulates a verified store purchase.
exports.mockPurchase = async (req, res) => {
  if (process.env.ENABLE_MOCK_PURCHASES !== 'true' || process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Route not found' });
  }
  try {
    const { productId } = req.body;
    const r = await grantPack({
      userId: req.user.id, productId, storeTransactionId: `mock-${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform: 'MOCK',
    });
    if (!r.ok) return badRequestResponse(r.reason, 'BAD_REQUEST', 400, res);
    return successResponse({ credits: r.credits, balance: r.balance }, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

exports._grantPack = grantPack;
