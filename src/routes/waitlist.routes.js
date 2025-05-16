const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');
const { authenticate, isAdmin, isTutor } = require('../middleware/auth.middleware');


/**
 * @swagger
 * /api/v1/waitlist:
 *   post:
 *     summary: Add an email to the waitlist
 *     description: Add a new user to the application waitlist
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User's interests
 *               referralSource:
 *                 type: string
 *                 description: How the user found out about the application
 *               additionalInfo:
 *                 type: string
 *                 description: Any additional information provided by the user
 *     responses:
 *       201:
 *         description: Successfully added to waitlist
 *       400:
 *         description: Email is required
 *       409:
 *         description: Email already exists in waitlist
 *       500:
 *         description: Server error
 */
router.post('/', waitlistController.addToWaitlist);

/**
 * @swagger
 * /api/v1/waitlist/status/{email}:
 *   get:
 *     summary: Check waitlist status by email
 *     description: Check the status of a waitlist entry by email
 *     tags: [Waitlist]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User's email address
 *     responses:
 *       200:
 *         description: Waitlist status information
 *       404:
 *         description: Email not found in waitlist
 *       500:
 *         description: Server error
 */
router.get('/status/:email', waitlistController.checkWaitlistStatus);

/**
 * @swagger
 * /api/v1/waitlist:
 *   get:
 *     summary: List all waitlist entries
 *     description: Admin only - retrieve all waitlist entries with optional filtering
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, contacted, invited, registered]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of waitlist entries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, isAdmin, waitlistController.getAllWaitlistEntries);

/**
 * @swagger
 * /api/v1/waitlist/{id}:
 *   patch:
 *     summary: Update waitlist entry status
 *     description: Admin only - update the status of a waitlist entry
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Waitlist entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, contacted, invited, registered]
 *     responses:
 *       200:
 *         description: Waitlist status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Waitlist entry not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', authenticate, isAdmin, waitlistController.updateWaitlistStatus);

/**
 * @swagger
 * /api/v1/waitlist/{id}:
 *   delete:
 *     summary: Delete waitlist entry
 *     description: Admin only - delete a waitlist entry
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Waitlist entry ID
 *     responses:
 *       200:
 *         description: Waitlist entry deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Waitlist entry not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, isAdmin, waitlistController.deleteWaitlistEntry);

module.exports = router;