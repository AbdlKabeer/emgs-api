const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Recurring subscription management for services
 */

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - interval
 *               - paymentReference
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service to subscribe to
 *               interval:
 *                 type: string
 *                 enum: [daily, weekly, monthly, quarterly, yearly]
 *                 description: Billing interval
 *               paymentReference:
 *                 type: string
 *                 description: Paystack payment reference for initial payment
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, subscriptionController.createSubscription);

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Get user's subscriptions
 *     tags: [Subscriptions]
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
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, paused, expired, failed]
 *     responses:
 *       200:
 *         description: Subscriptions fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, subscriptionController.getUserSubscriptions);

/**
 * @swagger
 * /subscriptions/{id}:
 *   get:
 *     summary: Get subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription details fetched successfully
 *       404:
 *         description: Subscription not found
 */
router.get('/:id', authenticate, subscriptionController.getSubscriptionById);

/**
 * @swagger
 * /subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       404:
 *         description: Subscription not found
 */
router.post('/:id/cancel', authenticate, subscriptionController.cancelSubscription);

/**
 * @swagger
 * /subscriptions/{id}/pause:
 *   post:
 *     summary: Pause a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription paused successfully
 *       404:
 *         description: Subscription not found
 */
router.post('/:id/pause', authenticate, subscriptionController.pauseSubscription);

/**
 * @swagger
 * /subscriptions/{id}/resume:
 *   post:
 *     summary: Resume a paused subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription resumed successfully
 *       404:
 *         description: Subscription not found
 */
router.post('/:id/resume', authenticate, subscriptionController.resumeSubscription);

/**
 * @swagger
 * /subscriptions/process/due:
 *   post:
 *     summary: Process all due subscriptions (Admin/Cron only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions processed
 *       401:
 *         description: Unauthorized
 */
router.post('/process/due', authenticate, subscriptionController.processDueSubscriptions);

module.exports = router;
