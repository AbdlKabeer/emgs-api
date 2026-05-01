const express = require('express');
const serviceController = require('../controllers/service.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { serviceCreateValidator } = require('../validators/service.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v2/services:
 *   get:
 *     summary: Get all services
 *     description: Fetches all available services.
 *     tags:
 *       - Services
 *     responses:
 *       200:
 *         description: List of all services
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, serviceController.getAllServices);
router.get('/flat',authenticate, serviceController.getAllServicesFlat);

/**
 * @swagger
 * /api/v2/services/{id}:
 *   get:
 *     summary: Get a specific service by ID
 *     description: Fetches the details of a specific service by its ID.
 *     tags:
 *       - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', serviceController.getServiceById);

/**
 * @swagger
 * /api/v2/services/category/{category}:
 *   get:
 *     summary: Get services by category
 *     description: Fetches services based on a specific category.
 *     tags:
 *       - Services
 *     parameters:
 *       - name: category
 *         in: path
 *         required: true
 *         description: The category to filter services by
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services by category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.get('/category/:category', serviceController.getServicesByCategory);

/**
 * @swagger
 * /api/v2/services:
 *   post:
 *     summary: Create a new service
 *     description: Allows admins to create a new service.
 *     tags:
 *       - Services
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the service
 *               description:
 *                 type: string
 *                 description: Detailed description of the service
 *               category:
 *                 type: string
 *                 description: Category of the service
 *               price:
 *                 type: number
 *                 description: Price of the service
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, isAdmin],serviceCreateValidator, serviceController.createService);

/**
 * @swagger
 * /api/v2/services/{id}:
 *   put:
 *     summary: Update an existing service
 *     description: Allows admins to update the details of an existing service.
 *     tags:
 *       - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to update
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
 *                 description: New name for the service
 *               description:
 *                 type: string
 *                 description: New description for the service
 *               category:
 *                 type: string
 *                 description: New category of the service
 *               price:
 *                 type: number
 *                 description: New price of the service
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [authenticate, isAdmin],serviceCreateValidator, serviceController.updateService);

/**
 * @swagger
 * /api/v2/services/{id}:
 *   delete:
 *     summary: Delete a specific service
 *     description: Allows admins to delete a service by its ID.
 *     tags:
 *       - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Service not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', [authenticate, isAdmin], serviceController.deleteService);

/**
 * @swagger
 * /api/v2/services/inquiry:
 *   post:
 *     summary: Create a service inquiry
 *     description: Allows users to create an inquiry for a specific service.
 *     tags:
 *       - Services
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service for which the inquiry is being created
 *               message:
 *                 type: string
 *                 description: Inquiry message from the user
 *     responses:
 *       201:
 *         description: Inquiry created successfully
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Internal server error
 */
router.post('/inquiry', authenticate, serviceController.createInquiry);

// ==================== USER SERVICE MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /api/v2/services/my-services:
 *   get:
 *     summary: Get all services created by the authenticated user
 *     description: Retrieves all services that belong to the currently authenticated user.
 *     tags:
 *       - User Services
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User services retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/my-services', authenticate, serviceController.getUserServices);

/**
 * @swagger
 * /api/v2/services/my-services:
 *   post:
 *     summary: Create a new service for the authenticated user
 *     description: Allows authenticated users to create their own service.
 *     tags:
 *       - User Services
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - whatsappContact
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the service
 *               description:
 *                 type: string
 *                 description: Detailed description of the service
 *               category:
 *                 type: string
 *                 enum: ['Job Application', 'IELTS Masterclass', 'Parcel Services', 'Flight Booking', 'Visa Booking', 'Loan Services', 'NCLEX Services', 'CBT Services', 'OET Services', 'OSCE Services', 'Proof of Funds']
 *                 description: Category of the service
 *               whatsappContact:
 *                 type: string
 *                 description: WhatsApp contact number
 *               price:
 *                 type: number
 *                 description: Price of the service
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of service features
 *               autoResponderMessage:
 *                 type: string
 *                 description: Auto-responder message for inquiries
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/my-services', authenticate, serviceCreateValidator, serviceController.createUserService);

/**
 * @swagger
 * /api/v2/services/my-services/{id}:
 *   put:
 *     summary: Update user's own service
 *     description: Allows authenticated users to update their own service.
 *     tags:
 *       - User Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to update
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
 *                 description: Name of the service
 *               description:
 *                 type: string
 *                 description: Description of the service
 *               category:
 *                 type: string
 *                 description: Category of the service
 *               whatsappContact:
 *                 type: string
 *                 description: WhatsApp contact number
 *               price:
 *                 type: number
 *                 description: Price of the service
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of service features
 *               isActive:
 *                 type: boolean
 *                 description: Whether the service is active
 *               autoResponderMessage:
 *                 type: string
 *                 description: Auto-responder message
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found or permission denied
 *       500:
 *         description: Internal server error
 */
router.put('/my-services/:id', authenticate, serviceController.updateUserService);

/**
 * @swagger
 * /api/v2/services/my-services/{id}:
 *   delete:
 *     summary: Delete user's own service
 *     description: Allows authenticated users to delete their own service.
 *     tags:
 *       - User Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found or permission denied
 *       500:
 *         description: Internal server error
 */
router.delete('/my-services/:id', authenticate, serviceController.deleteUserService);

/**
 * @swagger
 * /api/v2/services/my-services/{id}/price:
 *   patch:
 *     summary: Update the price of user's own service
 *     description: Allows authenticated users to update only the price of their own service.
 *     tags:
 *       - User Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the service to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *                 description: New price for the service
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Service price updated successfully
 *       400:
 *         description: Invalid price provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found or permission denied
 *       500:
 *         description: Internal server error
 */
router.patch('/my-services/:id/price', authenticate, serviceController.updateUserServicePrice);

module.exports = router;
