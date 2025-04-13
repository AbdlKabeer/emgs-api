const express = require('express');
const courseController = require('../controllers/course.controller');
const { authenticate, isTutor, isAdmin } = require('../middleware/auth.middleware');
const { createCourseValidator } = require('../validators/course.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses
 *     description: Fetch a list of all available courses.
 *     tags:
 *       - Courses
 *     responses:
 *       200:
 *         description: List of courses
 *       500:
 *         description: Internal server error
 */
router.get('/',authenticate, courseController.getAllCourses);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get a specific course
 *     description: Fetch a course by its ID.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The course details
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id',authenticate, courseController.getCourseById);


/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     description: Only accessible to tutors. Creates a new course.
 *     tags:
 *       - Courses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: ['IELTS', 'CV', 'NCLEX', 'CBT', 'OET', 'OSCE']
 *               thumbnail:
 *                 type: string
 *               isFree:
 *                 type: boolean
 *               price:
 *                 type: number
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Course successfully created
 *       400:
 *         description: Invalid course data
 *       403:
 *         description: Forbidden, only tutors can create courses
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, isTutor], createCourseValidator, courseController.createCourse);


/**
 * @swagger
 * /api/v1/courses/{id}/thumbnail:
 *   patch:
 *     summary: Update course thumbnail
 *     description: Only accessible to tutors. Updates a course's thumbnail by its ID.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnailUrl:
 *                 type: string
 *                 required: true
 *                 description: URL to the thumbnail image
 *     responses:
 *       200:
 *         description: Course thumbnail successfully updated
 *       400:
 *         description: Invalid thumbnail URL
 *       403:
 *         description: Forbidden, only tutors can update courses
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/thumbnail', [authenticate, isTutor], courseController.updateCourseThumbnail);



/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Update an existing course
 *     description: Only accessible to admins. Updates a course by its ID.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: string
 *               level:
 *                 type: string
 *               instructor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course successfully updated
 *       400:
 *         description: Invalid course data
 *       403:
 *         description: Forbidden, only admin can update courses
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [authenticate, isTutor], courseController.updateCourse);


router.put('/:id/goals', [authenticate, isTutor], courseController.addCourseGoals);


router.put('/:id/notes', [authenticate, isTutor], courseController.addCourseNotes);


/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Delete a course
 *     description: Only accessible to admins. Deletes a course by its ID.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course to be deleted
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course successfully deleted
 *       403:
 *         description: Forbidden, only admin can delete courses
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', [authenticate, isTutor], courseController.deleteCourse);


/**
 * @swagger
 * /api/v1/courses/{id}/resources:
 *   post:
 *     summary: Upload resources/documents to a course
 *     description: Only accessible to tutors. Uploads resources/documents to a course.
 *     tags:
 *       - Course Content
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resourceUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               titles:
 *                 type: array
 *                 items:
 *                   type: string
 *               descriptions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Course resources uploaded successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/resources', [authenticate, isTutor], courseController.uploadCourseResources);

/**
 * @swagger
 * /api/v1/courses/{id}/progress:
 *   post:
 *     summary: Save course creation progress
 *     description: Only accessible to tutors. Saves course creation progress.
 *     tags:
 *       - Course Content
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completedSections:
 *                 type: array
 *                 items:
 *                   type: string
 *               isComplete:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course progress saved successfully
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/progress', [authenticate, isTutor], courseController.saveCourseProgress);



/**
 * @swagger
 * /api/v1/courses/{courseId}/enroll:
 *   post:
 *     summary: Enroll a user in a course
 *     description: Allows authenticated users to enroll in a course.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to enroll in
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully enrolled in the course
 *       400:
 *         description: Invalid course ID or user data
 *       401:
 *         description: Unauthorized, user must be logged in
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/enroll', authenticate, courseController.enrollInCourse);


router.put('/courses/:courseId/completed', authenticate, courseController.markCourseAndLessonsCompleted);

/**
 * @swagger
 * /api/v1/courses/user/enrolled:
 *   get:
 *     summary: Get all courses a user is enrolled in
 *     description: Fetches all courses the currently authenticated user is enrolled in.
 *     tags:
 *       - Courses
 *     responses:
 *       200:
 *         description: List of enrolled courses
 *       401:
 *         description: Unauthorized, user must be logged in
 *       500:
 *         description: Internal server error
 */
router.get('/user/enrolled', authenticate, courseController.getUserCourses);

/**
 * @swagger
 * /api/v1/courses/lesson/{lessonId}/progress:
 *   post:
 *     summary: Track user progress for a lesson
 *     description: Allows authenticated users to track their progress in a lesson.
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         description: The ID of the lesson to track progress for
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *                 description: The percentage of progress the user has made in the lesson
 *     responses:
 *       200:
 *         description: Progress successfully updated
 *       400:
 *         description: Invalid lesson ID or progress data
 *       401:
 *         description: Unauthorized, user must be logged in
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/lesson/:lessonId/progress', authenticate, courseController.markLessonCompleted);

router.put('/:courseId/lessons/:lessonId/completed', authenticate, courseController.markLessonCompleted);


/**
 * @swagger
 * /api/v1/courses/{courseId}/rate:
 *   post:
 *     summary: Rate a course
 *     description: Allows enrolled users to rate and review a course
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to rate
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 description: Rating between 1 and 5
 *               review:
 *                 type: string
 *                 description: Optional review text
 *     responses:
 *       200:
 *         description: Course rated successfully
 *       400:
 *         description: Invalid rating data or user not enrolled
 *       401:
 *         description: Unauthorized, user must be logged in
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/rate', authenticate, courseController.rateCourse);

/**
 * @swagger
 * /api/v1/courses/{courseId}/ratings:
 *   get:
 *     summary: Get course ratings
 *     description: Retrieve all ratings and reviews for a course
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course ratings and reviews
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId/ratings', courseController.getCourseRatings);

/**
 * @swagger
 * /api/v1/courses/{courseId}/bookmark:
 *   post:
 *     summary: Bookmark or unbookmark a course
 *     description: Allows users to bookmark or remove bookmark from a course
 *     tags:
 *       - Courses
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to bookmark
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course bookmarked or unbookmarked successfully
 *       401:
 *         description: Unauthorized, user must be logged in
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/bookmark', authenticate, courseController.toggleBookmark);

/**
 * @swagger
 * /api/v1/courses/user/bookmarked:
 *   get:
 *     summary: Get user's bookmarked courses
 *     description: Retrieves all courses bookmarked by the authenticated user
 *     tags:
 *       - Courses
 *     responses:
 *       200:
 *         description: List of bookmarked courses
 *       401:
 *         description: Unauthorized, user must be logged in
 *       500:
 *         description: Internal server error
 */
router.get('/user/bookmarked', authenticate, courseController.getBookmarkedCourses);


module.exports = router;
