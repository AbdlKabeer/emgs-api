const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');

exports.initiatePaymentValidator = [
  body('itemId').notEmpty().withMessage(
    'itemId is required'
  ),

  body('itemType').isIn(['course', 'service','oneOnOne','one-on-one']).withMessage(
    'itemType must be either course or service'
  ),
  body('callbackUrl').notEmpty().withMessage(
    'callbackUrl is required'
  ),
  validateRequest
];



exports.verifyPaymentValidator = [
  body('transactionRef').notEmpty().withMessage(
    'transactionRef is required'
  ),
  validateRequest
];

