const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');

exports.createLessonValidator = [
  body('title').notEmpty().withMessage(
    'Title is required'
  ),
  body('description').notEmpty().withMessage(
    'Description is required'
  ),
  body('courseId') .notEmpty().withMessage( 'Course is required'
  ),
  // body('videoUrl').isURL().withMessage('Video URL is required'
  // ),
  body('isPublished').isBoolean().default(true),
  body('order').isNumeric().default(1),
  validateRequest
];


exports.updateLessonValidator = [
  // Validate title field to ensure it's not empty
  body('title').notEmpty().withMessage('Title is required'),

  // Validate description field to ensure it's not empty
  body('description').notEmpty().withMessage('Description is required'),

  // Validate videoUrl field to ensure it's a valid URL and not empty
  body('videoUrl').notEmpty().withMessage('Video URL is required')
    .isURL().withMessage('Video URL must be a valid URL'),

  // Validate isPublished field to ensure it's a boolean
  body('isPublished').isBoolean().optional({ checkFalsy: true }),

  // Validate order field to ensure it's a numeric value
  body('order').isNumeric().optional({ checkFalsy: true }),

  // Run the validation middleware
  validateRequest
];
