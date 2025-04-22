// routes/wallet.routes.js
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate, isAdmin, isTutor } = require('../middleware/auth.middleware');
const {
    withdrawalValidator,
  } = require('../validators/wallet.validator');

// Get wallet info and transactions
router.get('/', authenticate, walletController.getWallet);

// Initiate withdrawal
router.post('/withdraw', authenticate, withdrawalValidator, walletController.initiateWithdrawal);

// Confirm withdrawal
router.post('/withdraw/:withdrawalId/confirm', [authenticate,isAdmin], walletController.confirmWithdrawal);

// Get withdrawal details
router.get('/withdraw/:withdrawalId', authenticate, walletController.getWithdrawalDetails);

// Get transaction details
router.get('/transactions/:transactionId', authenticate, walletController.getTransactionDetails);

module.exports = router;