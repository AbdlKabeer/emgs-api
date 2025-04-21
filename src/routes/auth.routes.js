const express = require('express');
const authController = require('../controllers/auth.controller');
const {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    resendVerificationCodeValidator,
    verifyEmailValidator
  } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user in the system.
 *     tags:
 *       - Authentication
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Bad request, invalid input
 *       500:
 *         description: Internal server error
 */
router.post('/register', registerValidator, authController.register);


/**
 * @swagger
 * /api/v1/auth/register-tutor:
 *   post:
 *     summary: Register a new tutor
 *     description: Creates a new tutor account in the system with additional tutor-specific information.
 *     tags:
 *       - Authentication
 *       - Tutors
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: string
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               teachingLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tutor successfully registered
 *       400:
 *         description: Bad request, invalid input
 *       500:
 *         description: Internal server error
 */
router.post('/register-tutor', registerValidator, authController.registerTutor);



/**
 * @swagger
 * /api/v1/auth/verify/{token}:
 *   get:
 *     summary: Verify user email
 *     description: Verifies the email of the user using a token sent to their email.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         description: The token for email verification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email successfully verified
 *       400:
 *         description: Invalid token or request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/verify/:token', authController.verifyEmailToken);


/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login a user
 *     description: Authenticates the user and provides a JWT token for further requests.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully logged in and token returned
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', loginValidator, authController.login);


/**
 * @swagger
 * /api/v1/auth/google-login:
 *   get:
 *     summary: Redirect to Google login
 *     description: Initiates the Google OAuth 2.0 login flow.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: redirect_url
 *         in: query
 *         required: true
 *         description: The URL to which the user will be redirected after successful authentication.
 *         schema:
 *           type: string
 *           example: http://localhost:8000/dashboard
 *     responses:
 *       302:
 *         description: Redirects to Google's login page
 *       400:
 *         description: Bad request if the redirect_url parameter is missing
 */
router.get('/google-login', authController.googleLogin);

/**
 * @swagger
 * /api/v1/auth/google-login-callback:
 *   get:
 *     summary: Handle Google login callback
 *     description: Handles the Google login callback, retrieves the user's information, and issues tokens.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: code
 *         in: query
 *         required: true
 *         description: The authorization code returned by Google.
 *         schema:
 *           type: string
 *       - name: state
 *         in: query
 *         required: true
 *         description: The state parameter passed during the Google login initiation.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful authentication and user info retrieved
 *       400:
 *         description: Invalid authorization code or state parameter
 *       500:
 *         description: Internal server error if something goes wrong during the authentication process
 */
router.get('/google-login-callback', authController.googleCallback);


/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     description: Sends a password reset email to the user.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       400:
 *         description: Invalid email address
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password
 *     description: Resets the user's password using a valid token.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         description: The token to reset the password
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password successfully reset
 *       400:
 *         description: Invalid token or password
 *       404:
 *         description: Token expired or not found
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password/verify', resetPasswordValidator, authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify user email with 6-digit code
 *     description: Verifies the email of the user using a 6-digit verification code.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to verify
 *               verificationCode:
 *                 type: string
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Email successfully verified
 *       400:
 *         description: Invalid verification code or user
 *       500:
 *         description: Internal server error
 */
router.post('/verify-email', verifyEmailValidator, authController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-verification-code:
 *   post:
 *     summary: Resend email verification code
 *     description: Generates and sends a new 6-digit verification code to the user's email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user requesting a new verification code
 *     responses:
 *       200:
 *         description: New verification code sent successfully
 *       400:
 *         description: Invalid user or unable to send code
 *       500:
 *         description: Internal server error
 */
router.post('/resend-verification-code', resendVerificationCodeValidator, authController.resendVerificationCode);



module.exports = router;
