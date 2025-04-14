const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { initiatePaymentValidator,verifyPaymentValidator } = require('../validators/payment.validator');

const router = express.Router();


router.post('/initiate-old', authenticate, initiatePaymentValidator, paymentController.initiatePayment);
router.post('/initiate', authenticate, initiatePaymentValidator, paymentController.initiateCardPayment);
router.post('/verify', authenticate,verifyPaymentValidator, paymentController.validatePayment);

module.exports = router;
