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
router.get('/tutor-requests', adminController.getAllTutorRequests);


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
router.put('/tutor-requests/:id/approve', adminController.approveTutorRequest);

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
router.put('/tutor-requests/:id/reject', adminController.rejectTutorRequest);


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
router.put('/tutors/:tutorId/approve', adminController.approveTutor);

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
router.put('/tutors/:tutorId/reject', adminController.rejectTutor);


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
router.get('/tutors', adminController.getAllTutors);

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
router.get('/tutors/:id', adminController.getTutorById);

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
router.get('/tutors/:tutorId/courses', adminController.getTutorCourses);

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
router.put('/courses/:courseId/approve', adminController.approveTutorCourse);

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
router.put('/courses/:courseId/reject', adminController.rejectTutorCourse);


module.exports = router;
