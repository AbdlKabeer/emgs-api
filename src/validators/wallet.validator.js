const { body } = require('express-validator');

const { validateRequest } = require('../middleware/validate-request');


exports.withdrawalValidator = [
  body('amount').notEmpty().withMessage('amount is required'),
  body('bankName').notEmpty().withMessage('bankName is required'),
  body('accountNumber').notEmpty().withMessage('accountNumber is required'),
  body('accountName').notEmpty().withMessage('accountName is required'),
  body('bankName').notEmpty().withMessage('bankName is required'),
  validateRequest
];
