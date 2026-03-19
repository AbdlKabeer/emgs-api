const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validate-request');
const mongoose = require('mongoose');

exports.createCategoryValidator = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isString()
    .withMessage('Category name must be a string')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters')
    .trim(),
  
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
  
  validateRequest
];

exports.updateCategoryValidator = [
  param('id')
    .notEmpty()
    .withMessage('Category ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),
  
  body('name')
    .optional()
    .isString()
    .withMessage('Category name must be a string')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters')
    .trim(),
  
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
  
  validateRequest
];

exports.deleteCategoryValidator = [
  param('id')
    .notEmpty()
    .withMessage('Category ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),
  
  validateRequest
];

exports.getCategoryValidator = [
  param('id')
    .notEmpty()
    .withMessage('Category ID or slug is required')
    .trim(),
  
  validateRequest
];
