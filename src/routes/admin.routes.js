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
router.get('/dashboard',
authenticate,
  isAdmin, 
  adminController.getDashboardStats);

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
router.get('/analytics', authenticate, isAdmin, adminController.getSystemAnalytics);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get All Users
 *     description: Retrieves a paginated list of all users with search and filter capabilities.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - name: role
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [user, tutor, admin]
 *         description: Filter by role
 *       - name: isVerified
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - name: tutorType
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [emgs, partner]
 *         description: Filter by tutor type
 *       - name: startDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created from this date
 *       - name: endDate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created until this date
 *       - name: sortBy
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [name, email, newest, oldest]
 *         description: Sort users by field
 *     responses:
 *       200:
 *         description: List of users successfully fetched
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/users', authenticate, isAdmin, adminController.getAllUsers);

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
router.get('/users/:id', authenticate, isAdmin, adminController.getUserById);

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
router.put('/users/:id', authenticate, isAdmin, adminController.updateUser);

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
router.delete('/users/:id', authenticate, isAdmin, adminController.deleteUser);

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
router.patch('/users/:id/tutor-type', authenticate, isAdmin, adminController.updateTutorType);

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
router.get('/payments', authenticate, isAdmin, adminController.getAllPayments);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/payments:
 *   get:
 *     summary: Get All Payments for a User
 *     description: Retrieves a paginated list of all payments made by a specific user. Optionally filter by status or item type.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: The ID of the user
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: Filter by payment status
 *       - name: itemType
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [course, service, oneOnOne, one-on-one]
 *         description: Filter by item type
 *     responses:
 *       200:
 *         description: User payments successfully fetched
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/users/:userId/payments', adminController.getUserPayments);

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
router.put('/payments/:id', authenticate, isAdmin, adminController.updatePaymentStatus);

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
router.post('/notifications', authenticate, isAdmin, adminController.sendNotification);


/**
 * @swagger
 * /api/v1/admin/tutor-requests:
 *   get:
 *     summary: Get All Tutor Requests
 *     description: Retrieves a paginated list of all tutor requests. Optionally filter by status.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by request status
 *     responses:
 *       200:
 *         description: List of tutor requests
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/tutor-requests', authenticate, isAdmin, adminController.getAllTutorRequests);


/**
 * @swagger
 * /api/v1/admin/tutor-requests/{id}/approve:
 *   put:
 *     summary: Approve Tutor Request
 *     description: Approves a pending tutor request by ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the tutor request to approve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tutor request approved
 *       404:
 *         description: Tutor request not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/tutor-requests/:id/approve', authenticate, isAdmin, adminController.approveTutorRequest);

/**
 * @swagger
 * /api/v1/admin/tutor-requests/{id}/reject:
 *   put:
 *     summary: Reject Tutor Request
 *     description: Rejects a pending tutor request by ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the tutor request to reject
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tutor request rejected
 *       404:
 *         description: Tutor request not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/tutor-requests/:id/reject', authenticate, isAdmin, adminController.rejectTutorRequest);


/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/approve:
 *   put:
 *     summary: Approve Tutor
 *     description: Approves and verifies an existing tutor directly by their user ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: tutorId
 *         in: path
 *         required: true
 *         description: The ID of the tutor to approve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tutor approved successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: User is not a tutor
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/tutors/:tutorId/approve', authenticate, isAdmin, adminController.approveTutor);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/reject:
 *   put:
 *     summary: Reject/Suspend Tutor
 *     description: Rejects, suspends, or revokes an existing tutor's status by their user ID.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: tutorId
 *         in: path
 *         required: true
 *         description: The ID of the tutor to reject/suspend
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection or suspension
 *               action:
 *                 type: string
 *                 enum: [suspend, revoke]
 *                 description: Action to take - suspend (unverify) or revoke (remove tutor role)
 *     responses:
 *       200:
 *         description: Tutor suspended or revoked successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: User is not a tutor
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/tutors/:tutorId/reject', authenticate, isAdmin, adminController.rejectTutor);


/**
 * @swagger
 * /api/v1/admin/tutors:
 *   get:
 *     summary: Get All Tutors
 *     description: Retrieves a paginated list of all tutors. Optionally filter by tutorType and verification status.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - name: tutorType
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [emgs, partner]
 *         description: Filter by tutor type
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [verified, unverified, all]
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: List of tutors
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/tutors', authenticate, isAdmin, adminController.getAllTutors);

/**
 * @swagger
 * /api/v1/admin/tutors/{id}:
 *   get:
 *     summary: Get Single Tutor
 *     description: Retrieves a specific tutor by ID along with their created courses.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the tutor to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tutor details successfully fetched
 *       404:
 *         description: Tutor not found
 *       400:
 *         description: User is not a tutor
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/tutors/:id', authenticate, isAdmin, adminController.getTutorById);

router.delete('/tutors/:id', authenticate, isAdmin, adminController.deleteTutor);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/courses:
 *   get:
 *     summary: Get All Courses of a Tutor
 *     description: Retrieves a paginated list of all courses created by a specific tutor. Optionally filter by status.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: tutorId
 *         in: path
 *         required: true
 *         description: The ID of the tutor
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, review, published, rejected]
 *         description: Filter by course status
 *     responses:
 *       200:
 *         description: List of tutor courses
 *       404:
 *         description: Tutor not found
 *       400:
 *         description: User is not a tutor
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/tutors/:tutorId/courses', authenticate, isAdmin, adminController.getTutorCourses);

router.get('/courses', authenticate, isAdmin, adminController.getAllCourses);

/**
 * @swagger
 * /api/v1/admin/courses/{courseId}/approve:
 *   put:
 *     summary: Approve and Publish Tutor Course
 *     description: Approves a tutor's course and publishes it to make it available to students.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to approve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course approved and published successfully
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/courses/:courseId/approve', authenticate, isAdmin, adminController.approveTutorCourse);

/**
 * @swagger
 * /api/v1/admin/courses/{courseId}/reject:
 *   put:
 *     summary: Reject Tutor Course
 *     description: Rejects a tutor's course with a rejection reason.
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to reject
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionMessage
 *             properties:
 *               rejectionMessage:
 *                 type: string
 *                 description: Reason for rejecting the course
 *     responses:
 *       200:
 *         description: Course rejected successfully
 *       404:
 *         description: Course not found
 *       400:
 *         description: Bad request - rejection message required
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/courses/:courseId/reject', authenticate, isAdmin, adminController.rejectTutorCourse);


// ==================== SERVICE MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /api/v1/admin/services:
 *   get:
 *     summary: Get all services
 *     description: Retrieves all services with pagination, filtering, and search capabilities.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by name or description
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/services', authenticate, isAdmin, adminController.getAllServices);

/**
 * @swagger
 * /api/v1/admin/services/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: Retrieves detailed information about a specific service.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Service ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/services/:id', authenticate, isAdmin, adminController.getServiceById);

/**
 * @swagger
 * /api/v1/admin/services:
 *   post:
 *     summary: Create a new service
 *     description: Allows admins to create a new service.
 *     tags:
 *       - Admin - Services
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
 *                 description: Service name
 *               description:
 *                 type: string
 *                 description: Service description
 *               category:
 *                 type: string
 *                 enum: ['Job Application', 'IELTS Masterclass', 'Parcel Services', 'Flight Booking', 'Visa Booking', 'Loan Services', 'NCLEX Services', 'CBT Services', 'OET Services', 'OSCE Services', 'Proof of Funds']
 *                 description: Service category
 *               whatsappContact:
 *                 type: string
 *                 description: WhatsApp contact number
 *               price:
 *                 type: number
 *                 description: Service price
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Service features
 *               autoResponderMessage:
 *                 type: string
 *                 description: Auto-responder message
 *               userId:
 *                 type: string
 *                 description: User ID to assign service to (optional, defaults to admin)
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.post('/services', authenticate, isAdmin, adminController.createService);

/**
 * @swagger
 * /api/v1/admin/services/{id}:
 *   put:
 *     summary: Update a service
 *     description: Allows admins to update any service.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Service ID
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
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               whatsappContact:
 *                 type: string
 *               price:
 *                 type: number
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               autoResponderMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.put('/services/:id', authenticate, isAdmin, adminController.updateService);

/**
 * @swagger
 * /api/v1/admin/services/{id}/price:
 *   patch:
 *     summary: Update service price
 *     description: Allows admins to update only the price of a service.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Service ID
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
 *                 description: New service price
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Service price updated successfully
 *       400:
 *         description: Invalid price
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.patch('/services/:id/price', authenticate, isAdmin, adminController.updateServicePrice);

/**
 * @swagger
 * /api/v1/admin/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     description: Allows admins to permanently delete a service.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Service ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.delete('/services/:id', authenticate, isAdmin, adminController.deleteService);

/**
 * @swagger
 * /api/v1/admin/services/{id}/toggle-status:
 *   patch:
 *     summary: Toggle service active status
 *     description: Allows admins to activate or deactivate a service.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Service ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service status toggled successfully
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.patch('/services/:id/toggle-status', authenticate, isAdmin, adminController.toggleServiceStatus);

/**
 * @swagger
 * /api/v1/admin/services/inquiries:
 *   get:
 *     summary: Get service inquiries
 *     description: Retrieves all service inquiries with filtering options.
 *     tags:
 *       - Admin - Services
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - name: serviceId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by service ID
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by inquiry status
 *     responses:
 *       200:
 *         description: Inquiries retrieved successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.get('/services/inquiries', authenticate, isAdmin, adminController.getServiceInquiries);


module.exports = router;
