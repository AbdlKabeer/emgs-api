const AppConfig = require('../models/app-config.model');
const CreditPack = require('../models/credit-pack.model');
const CreditAccount = require('../models/credit-account.model');
const CreditTransaction = require('../models/credit-transaction.model');
const CreditFailedEvent = require('../models/credit-failed-event.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const ledger = require('../services/credit-ledger.service');
const pricing = require('../services/credit-pricing.service');
const {
  successResponse, badRequestResponse, internalServerErrorResponse, paginationResponse,
} = require('../utils/custom_response/responses');

const NUMERIC = ['nairaPerCredit', 'platformCommissionPct', 'storeFeePct', 'renewalGraceDays', 'lowBalanceThreshold', 'referralRewardPct'];

exports.getConfig = async (req, res) => {
  try {
    return successResponse(await pricing.getCreditConfig(), res);
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.updateConfig = async (req, res) => {
  try {
    const current = await pricing.getCreditConfig();
    const next = { ...current };
    for (const k of NUMERIC) {
      if (req.body[k] === undefined) continue;
      const v = Number(req.body[k]);
      if (!Number.isFinite(v) || v < 0) return badRequestResponse(`${k} must be a non-negative number`, 'VALIDATION', 400, res);
      next[k] = v;
    }
    if (next.nairaPerCredit <= 0) return badRequestResponse('nairaPerCredit must be greater than 0', 'VALIDATION', 400, res);
    for (const k of ['platformCommissionPct', 'storeFeePct', 'referralRewardPct']) {
      if (next[k] >= 1) return badRequestResponse(`${k} must be a fraction below 1 (e.g. 0.15 for 15%)`, 'VALIDATION', 400, res);
    }
    if (next.platformCommissionPct + next.storeFeePct >= 1) {
      return badRequestResponse('Commission plus store fee must stay below 100%', 'VALIDATION', 400, res);
    }
    if (req.body.feeBearer !== undefined) {
      if (!['student', 'tutor', 'platform'].includes(req.body.feeBearer)) {
        return badRequestResponse('feeBearer must be student, tutor or platform', 'VALIDATION', 400, res);
      }
      next.feeBearer = req.body.feeBearer;
    }
    if (req.body.showFiatToStudents !== undefined) next.showFiatToStudents = !!req.body.showFiatToStudents;

    await AppConfig.findOneAndUpdate({ key: 'global' }, { $set: { credits: next } }, { upsert: true });

    // Margin sanity check against the supplied (or optional) pack price per credit
    const packPrice = Number(req.body.cheapestPackPricePerCredit);
    const warning = Number.isFinite(packPrice) && packPrice > 0 ? pricing.marginWarning(packPrice, next) : null;
    return successResponse({ config: next, warning }, res, 200, 'Credit config updated');
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.listPacks = async (req, res) => {
  try {
    return successResponse(await CreditPack.find().sort({ sortOrder: 1, credits: 1 }), res);
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.createPack = async (req, res) => {
  try {
    const { productId, credits, bonusCredits, label, badge, sortOrder, isActive } = req.body;
    if (!productId || !Number.isInteger(credits) || credits <= 0) {
      return badRequestResponse('productId and a positive integer credits are required', 'VALIDATION', 400, res);
    }
    const pack = await CreditPack.create({ productId, credits, bonusCredits, label, badge, sortOrder, isActive });
    return successResponse(pack, res, 201, 'Pack created');
  } catch (e) {
    if (e.code === 11000) return badRequestResponse('A pack with this productId already exists', 'DUPLICATE', 409, res);
    return internalServerErrorResponse(e.message, res);
  }
};

exports.updatePack = async (req, res) => {
  try {
    const allowed = ['credits', 'bonusCredits', 'label', 'badge', 'sortOrder', 'isActive'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const pack = await CreditPack.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!pack) return badRequestResponse('Pack not found', 'NOT_FOUND', 404, res);
    return successResponse(pack, res, 200, 'Pack updated');
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.deletePack = async (req, res) => {
  try {
    // Soft-delete: purchases reference productId, so deactivate instead of removing
    const pack = await CreditPack.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    if (!pack) return badRequestResponse('Pack not found', 'NOT_FOUND', 404, res);
    return successResponse(pack, res, 200, 'Pack deactivated');
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.getUserCredits = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('fullName email role');
    if (!user) return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    const account = await ledger.getAccount(user._id);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const [rows, total] = await Promise.all([
      CreditTransaction.find({ userId: user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CreditTransaction.countDocuments({ userId: user._id }),
    ]);
    return successResponse({ user, account, transactions: rows, total, page, limit }, res);
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.adjust = async (req, res) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isInteger(delta) || delta === 0) return badRequestResponse('delta must be a non-zero integer', 'VALIDATION', 400, res);
    if (!req.body.note) return badRequestResponse('A note explaining the adjustment is required', 'VALIDATION', 400, res);
    const r = await ledger.adjust({
      userId: req.params.id, delta, adminId: req.user.id, note: req.body.note,
      idempotencyKey: `adjust:${req.params.id}:${req.body.requestId || Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    });
    return successResponse({ balance: r.balance }, res, 200, 'Balance adjusted');
  } catch (e) {
    if (e.code === 'INSUFFICIENT_CREDITS') return badRequestResponse('Balance cannot go below zero', 'INSUFFICIENT_CREDITS', 400, res);
    return internalServerErrorResponse(e.message, res);
  }
};

// Refund the credits of a completed credit payment (e.g. cancelled service session)
exports.refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment || payment.paymentMethod !== 'credits') return badRequestResponse('Credit payment not found', 'NOT_FOUND', 404, res);
    if (payment.status !== 'completed') return badRequestResponse(`Payment is ${payment.status}, cannot refund`, 'BAD_REQUEST', 400, res);
    if (!(payment.credits > 0)) return badRequestResponse('Nothing to refund', 'BAD_REQUEST', 400, res);
    const r = await ledger.credit({
      userId: payment.userId, amount: payment.credits, type: 'refund', idempotencyKey: `admin-refund:${payment._id}`,
      ref: { itemType: payment.itemType, itemId: payment.itemId, paymentId: payment._id },
      note: req.body.note || 'Refund by admin', createdBy: req.user.id,
    });
    payment.status = 'refunded';
    await payment.save();
    if (payment.itemType === 'service') {
      await User.updateOne(
        { _id: payment.userId, 'serviceSubscriptions.paymentId': payment._id },
        { $set: { 'serviceSubscriptions.$.isActive': false } });
    }
    return successResponse({ balance: r.balance }, res, 200, 'Payment refunded');
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.stats = async (req, res) => {
  try {
    const [sold, spent, outstanding, failed] = await Promise.all([
      CreditTransaction.aggregate([{ $match: { type: 'purchase' } }, { $group: { _id: null, credits: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      CreditTransaction.aggregate([{ $match: { type: 'spend' } }, { $group: { _id: null, credits: { $sum: { $abs: '$amount' } }, tutorShare: { $sum: '$pricing.tutorShare' }, platformShare: { $sum: '$pricing.platformShare' }, count: { $sum: 1 } } }]),
      CreditAccount.aggregate([{ $group: { _id: null, credits: { $sum: '$balance' } } }]),
      CreditFailedEvent.countDocuments({ resolved: false }),
    ]);
    return successResponse({
      purchased: { credits: sold[0]?.credits || 0, count: sold[0]?.count || 0 },
      spent: {
        credits: spent[0]?.credits || 0, count: spent[0]?.count || 0,
        tutorShareNGN: spent[0]?.tutorShare || 0, platformShareNGN: spent[0]?.platformShare || 0,
      },
      outstandingCredits: outstanding[0]?.credits || 0,
      unresolvedFailedEvents: failed,
    }, res);
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};

exports.failedEvents = async (req, res) => {
  try {
    const rows = await CreditFailedEvent.find({ resolved: false }).sort({ createdAt: -1 }).limit(100).lean();
    return successResponse(rows, res);
  } catch (e) { return internalServerErrorResponse(e.message, res); }
};
