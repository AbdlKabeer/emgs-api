const express = require('express');
const accountController = require('../controllers/account.controller');
const {authenticate} = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware'); 

const router = express.Router();

/**
 * @swagger
 * /api/v1/account/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves the current user's profile information
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticate, accountController.getUserProfile);

/**
 * @swagger
 * /api/v1/account/profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates the current user's profile information
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated user profile
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.put('/profile', authenticate, accountController.updateUserProfile);

/**
 * @swagger
 * /api/v1/account/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     description: Uploads and updates the user's profile picture
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully uploaded profile picture
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Internal server error
 */
router.post(
  '/profile-picture', 
  authenticate, 
  uploadMiddleware.single('profilePicture'), 
  accountController.updateProfilePicture
);

/**
 * @swagger
 * /api/v1/account/profile-picture:
 *   delete:
 *     summary: Delete profile picture
 *     description: Removes the user's current profile picture
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully deleted profile picture
 *       500:
 *         description: Internal server error
 */
router.delete('/profile-picture', authenticate, accountController.deleteProfilePicture);

/**
 * @swagger
 * /api/v1/account/language:
 *   put:
 *     summary: Update language preference
 *     description: Updates the user's preferred language
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: ['English', 'German', 'Spanish', 'French', 'Dutch']
 *     responses:
 *       200:
 *         description: Successfully updated language preference
 *       400:
 *         description: Invalid language
 *       500:
 *         description: Internal server error
 */
router.put('/language', authenticate, accountController.updateLanguagePreference);

/**
 * @swagger
 * /api/v1/account/notifications:
 *   put:
 *     summary: Toggle notifications
 *     description: Enables or disables user notifications
 *     tags:
 *       - Account Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableNotifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated notification preferences
 *       500:
 *         description: Internal server error
 */
router.put('/notifications', authenticate, accountController.toggleNotifications);



router.put('/internal-delete',  accountController.deleteUserByEmail);

module.exports = router;