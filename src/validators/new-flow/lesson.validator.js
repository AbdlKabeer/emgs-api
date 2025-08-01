// src/validators/lesson.validator.js
const { body, validationResult } = require('express-validator');

const createLessonValidator = [
  body('courseId').isMongoId().withMessage('Valid courseId is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const updateLessonValidator = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('order').optional().isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  createLessonValidator,
  updateLessonValidator,
};