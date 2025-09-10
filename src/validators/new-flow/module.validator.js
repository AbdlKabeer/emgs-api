// src/validators/module.validator.js
const { body, validationResult } = require('express-validator');

const createModuleValidator = [
  body('courseId').isMongoId().withMessage('Valid courseId is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  body('content').optional().isObject().withMessage('Content must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const updateModuleValidator = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  body('content').optional().isObject().withMessage('Content must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  createModuleValidator,
  updateModuleValidator,
};