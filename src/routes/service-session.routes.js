const express = require('express');
const router = express.Router();
const serviceSessionController = require('../controllers/service-session.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/permission.middleware');

/**
 * @swagger
 * tags:
 *   name: Service Sessions
 *   description: Staff/Admin endpoints for managing service sessions
 */

/**
 * @swagger
 * /service-sessions/pending:
 *   get:
 *     summary: Get all pending service sessions (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Filter by specific service
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by specific user
 *     responses:
 *       200:
 *         description: Pending service sessions fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/pending', authenticate, isAdmin, serviceSessionController.getPendingServiceSessions);

/**
 * @swagger
 * /service-sessions/{userId}/{serviceId}/complete:
 *   post:
 *     summary: Mark a service session as complete (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user whose session to complete
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the session completion
 *     responses:
 *       200:
 *         description: Service session marked as complete successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User or service not found, or no active session
 */
router.post('/:userId/:serviceId/complete', authenticate, isAdmin, serviceSessionController.completeServiceSession);

/**
 * @swagger
 * /service-sessions/completed:
 *   get:
 *     summary: Get all completed service sessions (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Completed service sessions fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/completed', authenticate, isAdmin, serviceSessionController.getCompletedServiceSessions);

/**
 * @swagger
 * /service-sessions/user/{userId}:
 *   get:
 *     summary: Get all service sessions for a specific user (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User service sessions fetched successfully
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', authenticate, isAdmin, serviceSessionController.getUserServiceSessions);

/**
 * @swagger
 * /service-sessions/service/{serviceId}/users:
 *   get:
 *     summary: Get all users who have purchased a specific service (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, completed]
 *           default: all
 *         description: Filter by session status
 *     responses:
 *       200:
 *         description: Service users fetched successfully
 *       404:
 *         description: Service not found
 */
router.get('/service/:serviceId/users', authenticate, isAdmin, serviceSessionController.getServiceUsers);

/**
 * @swagger
 * /service-sessions/stats:
 *   get:
 *     summary: Get service session statistics (Admin/Staff only)
 *     tags: [Service Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Optional service ID to filter stats
 *     responses:
 *       200:
 *         description: Statistics fetched successfully
 */
router.get('/stats', authenticate, isAdmin, serviceSessionController.getServiceSessionStats);

module.exports = router;
