const express = require('express');
const credit = require('../controllers/credit.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { logWebhook } = require('../middleware/webhook-log.middleware');

const router = express.Router();

// RevenueCat webhook: authenticated by shared secret header, not a user token.
// Every call is recorded (see WebhookLog); add logWebhook(<provider>) to any new webhook route.
router.post('/webhook/revenuecat',
  logWebhook('revenuecat', (req) => ({ eventType: req.body?.event?.type, eventId: req.body?.event?.id })),
  credit.revenueCatWebhook);

router.get('/config', authenticate, credit.getConfig);
router.get('/balance', authenticate, credit.getBalance);
router.get('/transactions', authenticate, credit.getTransactions);
router.get('/quote', authenticate, credit.getQuote);
router.post('/purchase/claim', authenticate, credit.claimPurchases);
router.post('/dev/mock-purchase', authenticate, credit.mockPurchase);

module.exports = router;
