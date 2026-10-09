const express = require('express');
const paymentController = require('../controllers/payment.controller');
const creditController = require('../controllers/credit.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All purchases are paid with credits. Card/Paystack/Flutterwave/Stripe checkout was removed
// to comply with App Store guideline 3.1.1 (see CREDIT_SYSTEM_PLAN.md).
router.post('/pay-with-credits', authenticate, creditController.payWithCredits);
router.get('/history', authenticate, paymentController.getUserPaymentHistory);

module.exports = router;
