/**
 * Card checkout for the website (Flutterwave / Stripe). The mobile app stays credit-only; web
 * students pay in naira. After the provider confirms the charge, the shared fulfilment service
 * enrols the student and pays the tutor, same as a credits purchase.
 */
const axios = require('axios');
const Payment = require('../models/payment.model');
const items = require('../services/credit-items.service');
const pricing = require('../services/credit-pricing.service');
const fulfilment = require('../services/fulfilment.service');
const {
  successResponse, badRequestResponse, internalServerErrorResponse,
} = require('../utils/custom_response/responses');

const PROVIDERS = ['flutterwave', 'stripe'];
const STRIPE_MIN_NGN = 1000;

const allowedCallbackOrigins = () => {
  const origins = new Set([
    'https://emgs.global', 'https://learn.emgs.global', 'https://emgs-learn.vercel.app', 'https://emgs-dash.vercel.app',
    process.env.FRONTEND_URL, process.env.CLIENT_URL,
    ...(process.env.CARD_CALLBACK_ORIGINS || '').split(','),
  ].map((o) => (o || '').trim().replace(/\/+$/, '')).filter(Boolean));
  return origins;
};

function validCallbackUrl(raw) {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)) return true;
    return allowedCallbackOrigins().has(url.origin);
  } catch (_) {
    return false;
  }
}

// Tutor share for a card payment: commission only. The app-store fee never applies to card payments.
function cardPricing(basePrice, cfg) {
  const q = pricing.quote(basePrice, cfg);
  const tutorShare = pricing.round2(q.basePrice * (1 - cfg.platformCommissionPct));
  return { ...q, tutorShare, platformShare: pricing.round2(q.basePrice - tutorShare) };
}

const itemErrorResponse = (e, res) => badRequestResponse(e.message, e.code || 'BAD_REQUEST', e.status || 400, res);

// POST /payment/initiate  { itemType, itemId, callbackUrl, paymentProvider }
exports.initiateCardPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemType, itemId, callbackUrl } = req.body;
    const provider = String(req.body.paymentProvider || 'flutterwave').toLowerCase();
    if (!itemType || !itemId) return badRequestResponse('itemType and itemId are required', 'BAD_REQUEST', 400, res);
    if (!PROVIDERS.includes(provider)) return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);

    const item = await items.resolveItem(userId, itemType, itemId);
    const cfg = await pricing.getCreditConfig();
    const snapshot = cardPricing(item.basePrice, cfg);

    // Free items need no checkout
    if (item.basePrice <= 0) {
      const payment = await Payment.create({
        userId, itemId: item.itemId, itemType: item.itemType, amount: 0, currency: 'NGN',
        status: 'pending', paymentMethod: 'free', pricing: snapshot,
      });
      await fulfilment.fulfil(payment);
      payment.status = 'completed';
      await payment.save();
      return successResponse({ autoEnrolled: true, paymentId: payment._id }, res, 200, 'Enrolled');
    }

    if (!validCallbackUrl(callbackUrl)) {
      return badRequestResponse('A valid callbackUrl is required', 'BAD_CALLBACK_URL', 400, res);
    }
    if (provider === 'stripe' && item.basePrice < STRIPE_MIN_NGN) {
      return badRequestResponse(`Stripe needs an amount of at least ₦${STRIPE_MIN_NGN}`, 'INIT_FAILED', 400, res);
    }

    const payment = await Payment.create({
      userId, itemId: item.itemId, itemType: item.itemType, amount: item.basePrice, currency: 'NGN',
      status: 'pending', paymentMethod: provider, pricing: snapshot,
    });
    const txRef = payment._id.toString();
    const meta = { transactionRef: txRef, itemId: String(item.itemId), itemType: item.itemType };

    try {
      if (provider === 'flutterwave') {
        const { data } = await axios.post('https://api.flutterwave.com/v3/payments', {
          tx_ref: txRef, amount: item.basePrice, currency: 'NGN', redirect_url: callbackUrl,
          customer: { email: req.user.email, name: req.user.fullName || req.user.email },
          meta, payment_options: 'card',
        }, { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 });
        if (data.status !== 'success') throw new Error('Flutterwave initialization failed');
        return successResponse({
          ...data.data, authorization_url: data.data.link, reference: txRef, transactionRef: txRef, paymentId: payment._id,
        }, res, 200, 'Payment initialization successful (Flutterwave)');
      }
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: 'ngn', product_data: { name: item.itemName }, unit_amount: Math.round(item.basePrice * 100) }, quantity: 1 }],
        mode: 'payment',
        success_url: `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: callbackUrl,
        metadata: meta,
        customer_email: req.user.email,
      });
      return successResponse({
        url: session.url, authorization_url: session.url, id: session.id, reference: session.id, transactionRef: txRef, paymentId: payment._id,
      }, res, 200, 'Payment initialization successful (Stripe)');
    } catch (e) {
      payment.status = 'failed';
      await payment.save();
      console.error('[Card] initialize failed:', e.response?.data || e.message);
      return badRequestResponse('Could not start the payment. Please try again.', 'INIT_FAILED', 400, res);
    }
  } catch (e) {
    if (e.code && e.status) return itemErrorResponse(e, res);
    console.error('[Card] initiate error:', e);
    return internalServerErrorResponse(e.message, res);
  }
};

// Ask the provider whether the charge went through. Returns { ok, txRef, paidAmount, reason }.
async function checkWithProvider(provider, body) {
  if (provider === 'flutterwave') {
    const id = body.transaction_id;
    if (!id) return { ok: false, reason: 'transaction_id is required' };
    const { data } = await axios.get(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(id)}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }, timeout: 15000,
    });
    const ok = data.status === 'success' && data.data?.status === 'successful' && data.data?.currency === 'NGN';
    return { ok, txRef: data.data?.tx_ref, paidAmount: Number(data.data?.amount), reason: 'Flutterwave payment not successful' };
  }
  const sessionId = body.session_id;
  if (!sessionId) return { ok: false, reason: 'session_id is required' };
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    ok: session.payment_status === 'paid' && String(session.currency).toLowerCase() === 'ngn',
    txRef: session.metadata?.transactionRef,
    paidAmount: Number(session.amount_total) / 100,
    reason: 'Stripe payment not successful',
  };
}

// POST /payment/verify  { paymentProvider, transaction_id | session_id }
exports.verifyCardPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const provider = String(req.body.paymentProvider || '').toLowerCase();
    if (!PROVIDERS.includes(provider)) return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);

    let check;
    try {
      check = await checkWithProvider(provider, req.body);
    } catch (e) {
      console.error('[Card] provider verify failed:', e.response?.data || e.message);
      return badRequestResponse('Invalid transaction reference', 'BAD_REQUEST', 400, res);
    }
    if (!check.ok) return badRequestResponse(check.reason, 'NOT_SUCCESSFUL', 400, res);

    const payment = check.txRef && /^[a-f\d]{24}$/i.test(check.txRef) ? await Payment.findById(check.txRef) : null;
    if (!payment || payment.userId.toString() !== String(userId) || payment.paymentMethod !== provider) {
      return badRequestResponse('Payment record not found for this transaction', 'NOT_FOUND', 404, res);
    }
    if (payment.status === 'completed') return successResponse({ paymentId: payment._id }, res, 200, 'Payment already completed');
    if (!(check.paidAmount >= payment.amount)) {
      return badRequestResponse('Amount paid does not match the price', 'AMOUNT_MISMATCH', 400, res);
    }

    // Claim the payment atomically so a double verify cannot fulfil twice
    const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { status: 'processing' }, { new: true });
    if (!claimed) return badRequestResponse('This payment is already being processed', 'IN_PROGRESS', 409, res);

    try {
      const result = await fulfilment.fulfil(claimed);
      claimed.status = 'completed';
      await claimed.save();
      return successResponse({ paymentId: claimed._id, ...result }, res, 200, 'Payment verified');
    } catch (e) {
      claimed.status = 'pending'; // money was taken: leave it retryable rather than lost
      await claimed.save();
      if (e.status) return itemErrorResponse(e, res);
      throw e;
    }
  } catch (e) {
    console.error('[Card] verify error:', e);
    return internalServerErrorResponse(e.message, res);
  }
};
