// src/validators/quiz.validator.js
const { body, validationResult } = require('express-validator');

const createQuizValidator = [
  body('moduleId').isMongoId().withMessage('Valid moduleId is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('useTimer').isBoolean().withMessage('useTimer must be a boolean'),
  body('timeLimit').optional().isInt({ min: 0 }).withMessage('timeLimit must be a non-negative integer'),
  body('passingScore').optional().isInt({ min: 0, max: 100 }).withMessage('passingScore must be between 0 and 100'),
  body('questions').optional().isArray().withMessage('Questions must be an array'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const addQuestionValidator = [
  body('question').notEmpty().withMessage('Question is required'),
  body('type').notEmpty().withMessage('Question type is required'),
  body('options').optional().isArray().withMessage('Options must be an array'),
  body('correctAnswer').notEmpty().withMessage('Correct answer is required'),
  body('explanation').optional().isString().withMessage('Explanation must be a string'),
  body('points').optional().isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  createQuizValidator,
  addQuestionValidator,
};