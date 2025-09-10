const express = require('express');
const serviceController = require('../controllers/service.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { serviceCreateValidator } = require('../validators/service.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/services:
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
router.get('/', serviceController.getAllServices);
router.get('/flst', serviceController.getAllServicesFlat);

/**
 * @swagger
 * /api/v1/services/{id}:
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
 * /api/v1/services/category/{category}:
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
 * /api/v1/services:
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
 * /api/v1/services/{id}:
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
 * /api/v1/services/{id}:
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
 * /api/v1/services/inquiry:
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

module.exports = router;
