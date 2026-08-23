const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');

// Validator for creating a new quiz
exports.createQuizValidator = [
  body('courseId') .notEmpty().withMessage( 'Course is required'
    ),
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*.question')
    .notEmpty()
    .withMessage('Question text is required'),
  body('questions.*.options')
    .isArray({ min: 2 })
    .withMessage('Each question must have at least two options'),
  body('questions.*.options.*.option')
    .notEmpty()
    .withMessage('Option text is required'),
  body('questions.*.options.*.isCorrect')
    .isBoolean()
    .withMessage('isCorrect must be a boolean value'),
  body('questions')
    .custom(questions => {
      // Check if at least one option is marked as correct for each question
      for (const question of questions) {
        const hasCorrectOption = question.options.some(option => option.isCorrect);
        if (!hasCorrectOption) {
          throw new Error('Each question must have at least one correct option');
        }
      }
      return true;
    }),
  validateRequest
];

// Validator for updating an existing quiz
exports.updateQuizValidator = [
  param('quizId')
    .isMongoId()
    .withMessage('Invalid quiz ID format'),
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty if provided'),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Description cannot be empty if provided'),
  body('questions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one question is required if provided'),
  body('questions.*.question')
    .optional()
    .notEmpty()
    .withMessage('Question text is required'),
  body('questions.*.options')
    .optional()
    .isArray({ min: 2 })
    .withMessage('Each question must have at least two options'),
  body('questions.*.options.*.option')
    .optional()
    .notEmpty()
    .withMessage('Option text is required'),
  body('questions.*.options.*.isCorrect')
    .optional()
    .isBoolean()
    .withMessage('isCorrect must be a boolean value'),
  body('questions')
    .optional()
    .custom(questions => {
      if (!questions) return true;
      
      // Check if at least one option is marked as correct for each question
      for (const question of questions) {
        const hasCorrectOption = question.options.some(option => option.isCorrect);
        if (!hasCorrectOption) {
          throw new Error('Each question must have at least one correct option');
        }
      }
      return true;
    }),
  validateRequest
];

// Validator for submitting quiz answers
exports.submitQuizValidator = [
  param('quizId')
    .isMongoId()
    .withMessage('Invalid quiz ID format'),
  body('answers')
    .isArray()
    .withMessage('Answers must be provided as an array'),
  body('answers.*.questionId')
    .isMongoId()
    .withMessage('Question ID must be a valid Mongo ID'),
  body('answers.*.questionType')
    .isIn(['singleChoice', 'multipleChoice', 'boolean', 'fillInBlank'])
    .withMessage('Invalid question type'),
  validateRequest
];

// Validator for fetching a quiz by ID
exports.getQuizValidator = [
  param('quizId')
    .isMongoId()
    .withMessage('Invalid quiz ID format'),
  validateRequest
];

// Validator for fetching quiz progress
exports.getQuizProgressValidator = [
  param('quizId')
    .isMongoId()
    .withMessage('Invalid quiz ID format'),
  validateRequest
];

// Validator for fetching quiz statistics
exports.getQuizStatisticsValidator = [
  param('quizId')
    .isMongoId()
    .withMessage('Invalid quiz ID format'),
  validateRequest
];