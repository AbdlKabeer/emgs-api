const express = require('express');
const crmController = require('../controllers/crm.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { inquiryStatusValidator } = require('../validators/crm.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v2/crm/services:
 *   get:
 *     summary: Get all active services
 *     description: Fetches all active services (Admin only)
 *     tags:
 *       - CRM
 *     responses:
 *       200:
 *         description: List of services
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/services', [authenticate, isAdmin], crmController.getAllServices);
// CRM Chat Endpoints
/**
 * @swagger
 * /api/v2/crm/chat/send:
 *   post:
 *     summary: Send a message to a student
 *     description: CRM sends a message to a student (Admin only)
 *     tags:
 *       - CRM
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/chat/send', [authenticate, isAdmin], crmController.sendMessageToStudent);

/**
 * @swagger
 * /api/v2/crm/chat/{studentId}:
 *   get:
 *     summary: Get chat history with a student
 *     description: Fetch chat history between CRM and a student (Admin only)
 *     tags:
 *       - CRM
 *     parameters:
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: No conversation found
 *       500:
 *         description: Internal server error
 */

router.get('/chat/:studentId', [authenticate, isAdmin], crmController.getChatWithStudent);

/**
 * @swagger
 * /api/v2/crm/inquiries:
 *   get:
 *     summary: Get all inquiries (Admin only)
 *     description: Fetches all customer inquiries. Only accessible by admins.
 *     tags:
 *       - CRM
 *     responses:
 *       200:
 *         description: List of inquiries
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/inquiries', [authenticate, isAdmin], crmController.getAllInquiries);

/**
 * @swagger
 * /api/v2/crm/inquiries/{id}:
 *   get:
 *     summary: Get a specific inquiry
 *     description: Fetches an inquiry by its ID. Admins can access all, users can access their own.
 *     tags:
 *       - CRM
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the inquiry to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry details
 *       401:
 *         description: Unauthorized, user must be logged in
 *       403:
 *         description: Forbidden, admin access required for others' inquiries
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Internal server error
 */
router.get('/inquiries/:id', authenticate, crmController.getInquiryById);

/**
 * @swagger
 * /api/v2/crm/inquiries/{id}:
 *   put:
 *     summary: Update the status of an inquiry (Admin only)
 *     description: Allows admins to update the status of an inquiry by its ID.
 *     tags:
 *       - CRM
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the inquiry to update
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
 *                 description: The new status of the inquiry (e.g., 'resolved', 'pending')
 *     responses:
 *       200:
 *         description: Inquiry status updated
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Internal server error
 */
router.put('/inquiries/:id', [authenticate, isAdmin],inquiryStatusValidator, crmController.updateInquiryStatus);

/**
 * @swagger
 * /api/v2/crm/inquiries/{id}/response:
 *   post:
 *     summary: Add a response to an inquiry (Admin only)
 *     description: Allows admins to add a response to an inquiry.
 *     tags:
 *       - CRM
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the inquiry to respond to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *                 description: The response to the inquiry
 *     responses:
 *       200:
 *         description: Response successfully added
 *       400:
 *         description: Invalid response data
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Internal server error
 */
router.post('/inquiries/:id/response', [authenticate, isAdmin], crmController.addInquiryResponse);

/**
 * @swagger
 * /api/v2/crm/followups:
 *   get:
 *     summary: Get follow-up inquiries (Admin only)
 *     description: Fetches all follow-up inquiries. Only accessible by admins.
 *     tags:
 *       - CRM
 *     responses:
 *       200:
 *         description: List of follow-up inquiries
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/followups', [authenticate, isAdmin], crmController.getFollowupInquiries);

/**
 * @swagger
 * /api/v2/crm/analytics:
 *   get:
 *     summary: Get CRM analytics (Admin only)
 *     description: Fetches analytics data related to the CRM. Only accessible by admins.
 *     tags:
 *       - CRM
 *     responses:
 *       200:
 *         description: CRM analytics data
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', [authenticate, isAdmin], crmController.getCRMAnalytics);

/**
 * @swagger
 * /api/v2/crm/user/inquiries:
 *   get:
 *     summary: Get inquiries by the authenticated user
 *     description: Fetches all inquiries made by the currently authenticated user.
 *     tags:
 *       - CRM
 *     responses:
 *       200:
 *         description: List of user inquiries
 *       401:
 *         description: Unauthorized, user must be logged in
 *       500:
 *         description: Internal server error
 */
router.get('/user/inquiries', authenticate, crmController.getUserInquiries);

module.exports = router;
