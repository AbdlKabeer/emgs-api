const express = require('express');
const credit = require('../controllers/credit.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// RevenueCat webhook: authenticated by shared secret header, not a user token
router.post('/webhook/revenuecat', credit.revenueCatWebhook);

router.get('/config', authenticate, credit.getConfig);
router.get('/balance', authenticate, credit.getBalance);
router.get('/transactions', authenticate, credit.getTransactions);
router.get('/quote', authenticate, credit.getQuote);
router.post('/purchase/claim', authenticate, credit.claimPurchases);
router.post('/dev/mock-purchase', authenticate, credit.mockPurchase);

module.exports = router;
