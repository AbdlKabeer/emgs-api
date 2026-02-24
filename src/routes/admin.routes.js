const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require admin access
router.use(authenticate);
// router.use(authenticate, isAdmin);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get Dashboard Stats
 *     description: Retrieves the statistics for the admin dashboard.
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Dashboard statistics successfully fetched
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get System Analytics
 *     description: Retrieves analytics data for the system.
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: System analytics successfully fetched
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', adminController.getSystemAnalytics);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get All Users
 *     description: Retrieves a list of all users in the system.
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: List of users successfully fetched
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/users', adminController.getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get User by ID
 *     description: Retrieves a specific user by their ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the user to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details successfully fetched
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update User by ID
 *     description: Updates the details of a specific user by their ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/users/:id', adminController.updateUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete User by ID
 *     description: Deletes a user by their ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User successfully deleted
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.delete('/users/:id', adminController.deleteUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/tutor-type:
 *   patch:
 *     summary: Update Tutor Type
 *     description: Updates the tutorType for a tutor user by their ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the tutor to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tutorType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tutor type successfully updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Tutor not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.patch('/users/:id/tutor-type', adminController.updateTutorType);

/**
 * @swagger
 * /api/v1/admin/payments:
 *   get:
 *     summary: Get All Payments
 *     description: Retrieves all payments in the system.
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: List of payments successfully fetched
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/payments', adminController.getAllPayments);

/**
 * @swagger
 * /api/v1/admin/payments/{id}:
 *   put:
 *     summary: Update Payment Status by ID
 *     description: Updates the payment status of a specific payment.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the payment to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status successfully updated
 *       404:
 *         description: Payment not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/payments/:id', adminController.updatePaymentStatus);

/**
 * @swagger
 * /api/v1/admin/notifications:
 *   post:
 *     summary: Send Notification
 *     description: Sends a notification to users or admins.
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification successfully sent
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.post('/notifications', adminController.sendNotification);

module.exports = router;
