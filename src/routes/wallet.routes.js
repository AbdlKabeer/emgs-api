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


router.post('/withdraw/:withdrawalId/retry', authenticate, walletController.retryWithdrawal);

// Get withdrawal details
router.get('/withdraw/:withdrawalId', authenticate, walletController.getWithdrawalDetails);

// Get transaction history with filters
router.get('/transactions', authenticate, walletController.getTransactionHistory);

// Get transaction statistics
router.get('/stats', authenticate, walletController.getTransactionStats);

// Get withdrawal history
router.get('/withdrawals', authenticate, walletController.getWithdrawalHistory);

// Retry failed withdrawal
router.post('/withdraw/:withdrawalId/retry', authenticate, walletController.retryWithdrawal);

router.post('/wallet/credit-all', walletController.creditAllWallets);

module.exports = router;