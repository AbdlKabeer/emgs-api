// src/validators/course.validator.js
const { body, validationResult } = require('express-validator');

const createCourseValidator = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('isFree').isBoolean().withMessage('isFree must be a boolean'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('paymentType')
    .optional()
    .isIn(['one-time', 'subscription']).withMessage('Invalid payment type'),
  body('subscriptionDuration')
    .optional()
    .custom((value) => {
      if (value === null || (Number.isInteger(Number(value)) && Number(value) > 0)) {
        return true;
      }
      throw new Error('Subscription duration must be a positive number of weeks');
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const updateCourseValidator = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('isFree').optional().isBoolean().withMessage('isFree must be a boolean'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('paymentType')
    .optional()
    .isIn(['one-time', 'subscription']).withMessage('Invalid payment type'),
  body('subscriptionDuration')
    .optional()
    .custom((value) => {
      if (value === null || (Number.isInteger(Number(value)) && Number(value) > 0)) {
        return true;
      }
      throw new Error('Subscription duration must be a positive number of weeks');
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  createCourseValidator,
  updateCourseValidator,
};