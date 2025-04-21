const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');

exports.registerValidator = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  // add user type field or student, tutor, admin
  body('userType')
    .notEmpty()
    .isIn(['user', 'tutor', 'admin'])
    .withMessage('User type must be either user or tutor'),
  validateRequest
];

exports.loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

exports.forgotPasswordValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  validateRequest
];

exports.resetPasswordValidator = [
  body('code').notEmpty().withMessage('code is required'),
  body('userId').notEmpty().withMessage('userId is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  validateRequest
];


// New validators for email verification
exports.verifyEmailValidator = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('verificationCode')
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
    .isNumeric()
    .withMessage('Verification code must be numeric')
];

exports.resendVerificationCodeValidator = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format')
];