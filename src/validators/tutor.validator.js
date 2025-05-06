const { body } = require('express-validator');

const { validateRequest } = require('../middleware/validate-request');


exports.registerValidator = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone').optional().isString().withMessage('Please provide a valid phone number'),
  body('bio').notEmpty().withMessage('Bio is required'),
  body('preferredLanguage').notEmpty().withMessage('preferredLanguage is required'),
  body('proficiency')
  .notEmpty()
  .isIn(['beginner', 'intermediate', 'advance'])
  .withMessage('User type must be either beginner, intermediate or advance'),

  body('certificateType')
    .notEmpty()
    // .isIn(['bsc', 'master', 'oLevel'])
    .withMessage('User type must be either bsc, master or oLevel'),

  body('certificate').isURL().withMessage('certificate is required and should be a link '
  ),
  body('introduction').isURL().withMessage('introduction is required and should be a link to the user introduction'
  ),
  validateRequest
];
