const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/v2/notifications:
 *   get:
 *     summary: Get all user notifications
 *     description: Retrieves all notifications for the authenticated user with pagination
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, notificationController.getUserNotifications);

/**
 * @swagger
 * /api/v2/notifications/stream:
 *   get:
 *     summary: Get notifications stream (SSE)
 *     description: Real-time notification stream using Server-Sent Events
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream established
 *       401:
 *         description: Unauthorized
 */
router.get('/stream', authenticate, notificationController.getNotificationStream);

/**
 * @swagger
 * /api/v2/notifications/{notificationId}:
 *   get:
 *     summary: Get a single notification
 *     description: Retrieves a specific notification by ID and marks it as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: ID of the notification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.get('/:notificationId', authenticate, notificationController.getNotification);

/**
 * @swagger
 * /api/v2/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     description: Marks a specific notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: ID of the notification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.put('/:notificationId/read', authenticate, notificationController.markAsRead);

/**
 * @swagger
 * /api/v2/notifications/read/all:
 *   put:
 *     summary: Mark all notifications as read
 *     description: Marks all user notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/read/all', authenticate, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/v2/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Deletes a specific notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: ID of the notification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:notificationId', authenticate, notificationController.deleteNotification);

/**
 * @swagger
 * /api/v2/notifications:
 *   delete:
 *     summary: Delete all notifications
 *     description: Deletes all notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/', authenticate, notificationController.deleteAllNotifications);

/**
 * @swagger
 * /api/v2/notifications:
 *   post:
 *     summary: Create a notification
 *     description: Creates a new notification (admin only)
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to receive the notification
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [course, service, payment, system]
 *                 default: system
 *                 description: Type of notification
 *               relatedItemId:
 *                 type: string
 *                 description: ID of related item (course, service, etc.)
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/', isAdmin, notificationController.createNotification);

module.exports = router;