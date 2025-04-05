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