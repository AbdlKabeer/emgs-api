// const { body, param } = require('express-validator');
// const { validateRequest } = require('../middleware/validate-request');

// exports.createCourseValidator = [
//   body('title').notEmpty().withMessage(
//     'Title is required'
//   ),
//   body('description').notEmpty().withMessage(
//     'Description is required'
//   ),
//   body('category')
//     .notEmpty()
//     .withMessage(
//       'Category is required'
//     ),
//   body('isFree').isBoolean().default(true),
//   body('isPublished').isBoolean().default(true),
//   body('price').isNumeric().default(0),
//   validateRequest
// ];


const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');

exports.createCourseValidator = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['IELTS', 'CV', 'NCLEX', 'CBT', 'OET', 'OSCE'])
    .withMessage('Category must be one of: IELTS, CV, NCLEX, CBT, OET, OSCE'),
  
  body('thumbnail')
    .notEmpty()
    .isString()
    .withMessage('Thumbnail must be a string')
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  
  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
  
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value, { req }) => {
      if (req.body.isFree === false && (!value || value <= 0)) {
        throw new Error('Price is required and must be greater than 0 for paid courses');
      }
      return true;
    }),
  
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
  
  validateRequest
];

exports.updateThumbnailValidator = [
  body('thumbnailUrl')
    .notEmpty()
    .withMessage('Thumbnail URL is required')
    .isString()
    .withMessage('Thumbnail URL must be a string')
    .isURL()
    .withMessage('Thumbnail URL must be a valid URL'),
  
  validateRequest
];

exports.createCourseWithContentValidator = [
  // Course level validation
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['IELTS', 'CV', 'NCLEX', 'CBT', 'OET', 'OSCE'])
    .withMessage('Category must be one of: IELTS, CV, NCLEX, CBT, OET, OSCE'),
  
  body('thumbnail')
    .notEmpty()
    .withMessage('Thumbnail is required')
    .isString()
    .withMessage('Thumbnail must be a string')
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  
  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
  
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value, { req }) => {
      if (!req.body.isFree && (!value || value <= 0)) {
        throw new Error('Price must be greater than 0 for paid courses');
      }
      return true;
    }),
  
  body('goals')
    .optional()
    .isArray()
    .withMessage('Goals must be an array'),
  
  body('goals.*')
    .optional()
    .isString()
    .withMessage('Each goal must be a string'),
  
  body('notes')
    .optional()
    .isArray()
    .withMessage('Notes must be an array'),
  
  body('notes.*')
    .optional()
    .isString()
    .withMessage('Each note must be a string'),
  
  // Modules validation
  body('modules')
    .notEmpty()
    .withMessage('At least one module is required')
    .isArray({ min: 1 })
    .withMessage('Modules must be an array with at least one module'),
  
  body('modules.*.title')
    .notEmpty()
    .withMessage('Module title is required')
    .isString()
    .withMessage('Module title must be a string'),
  
  body('modules.*.description')
    .notEmpty()
    .withMessage('Module description is required')
    .isString()
    .withMessage('Module description must be a string'),
  
  body('modules.*.order')
    .notEmpty()
    .withMessage('Module order is required')
    .isInt({ min: 1 })
    .withMessage('Module order must be a positive integer'),
  
  // Lessons validation
  body('modules.*.lessons')
    .optional()
    .isArray()
    .withMessage('Lessons must be an array'),
  
  body('modules.*.lessons.*.title')
    .optional()
    .isString()
    .withMessage('Lesson title must be a string'),
  
  body('modules.*.lessons.*.description')
    .optional()
    .isString()
    .withMessage('Lesson description must be a string'),
  
  body('modules.*.lessons.*.order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lesson order must be a positive integer'),
  
  body('modules.*.lessons.*.html_content')
    .optional()
    .isString()
    .withMessage('HTML content must be a string'),
  
  // Quizzes validation
  body('modules.*.lessons.*.quizzes')
    .optional()
    .isArray()
    .withMessage('Quizzes must be an array'),
  
  body('modules.*.lessons.*.quizzes.*.title')
    .optional()
    .isString()
    .withMessage('Quiz title must be a string'),
  
  body('modules.*.lessons.*.quizzes.*.description')
    .optional()
    .isString()
    .withMessage('Quiz description must be a string'),
  
  body('modules.*.lessons.*.quizzes.*.useTimer')
    .optional()
    .isBoolean()
    .withMessage('useTimer must be a boolean'),
  
  body('modules.*.lessons.*.quizzes.*.passingScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100'),
  
  // Questions validation
  body('modules.*.lessons.*.quizzes.*.questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
  
  body('modules.*.lessons.*.quizzes.*.questions.*.question')
    .optional()
    .isString()
    .withMessage('Question text must be a string'),
  
  body('modules.*.lessons.*.quizzes.*.questions.*.questionType')
    .optional()
    .isIn(['multipleChoice', 'singleChoice', 'boolean', 'fillInBlank'])
    .withMessage('Question type must be one of: multipleChoice, singleChoice, boolean, fillInBlank'),
  
  body('modules.*.lessons.*.quizzes.*.questions.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  
  body('modules.*.lessons.*.quizzes.*.questions.*.options.*.option')
    .optional()
    .isString()
    .withMessage('Option text must be a string'),
  
  body('modules.*.lessons.*.quizzes.*.questions.*.options.*.isCorrect')
    .optional()
    .isBoolean()
    .withMessage('isCorrect must be a boolean'),
  
  validateRequest
];