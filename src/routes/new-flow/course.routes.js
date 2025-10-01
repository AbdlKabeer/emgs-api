const express = require('express');
const courseController = require('../../controllers/new-flow/course.controller');
const { authenticate, isTutor } = require('../../middleware/auth.middleware');
const { createCourseValidator, createCourseWithContentValidator } = require('../../validators/course.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/new-flow/courses:
 *   get:
 *     summary: Get all courses (new flow)
 *     description: Fetch a list of all available courses with enhanced structure.
 *     tags:
 *       - New Flow - Courses
 *     responses:
 *       200:
 *         description: List of courses
 *       500:
 *         description: Internal server error
 */
router.get('/', courseController.getAllCourses);

/**
 * @swagger
 * /api/v1/new-flow/courses:
 *   post:
 *     summary: Create a new course (basic)
 *     description: Create a new course with basic information.
 *     tags:
 *       - New Flow - Courses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isFree:
 *                 type: boolean
 *               price:
 *                 type: number
 *               thumbnail:
 *                 type: string
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, isTutor], courseController.createCourse);

/**
 * @swagger
 * /api/v1/new-flow/courses/with-content:
 *   post:
 *     summary: Create a comprehensive course with modules, lessons, and quizzes
 *     description: Create a complete course structure including modules, lessons, and quizzes in one request.
 *     tags:
 *       - New Flow - Courses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - modules
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Introduction to Java 4"
 *               description:
 *                 type: string
 *                 example: "Learn the basics of Java programming"
 *               category:
 *                 type: string
 *                 example: "IELTS"
 *               isFree:
 *                 type: boolean
 *                 example: false
 *               price:
 *                 type: number
 *                 example: 49.99
 *               thumbnail:
 *                 type: string
 *                 example: "https://example.com/thumbnail.jpg"
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Understand JS basics", "Build simple projects"]
 *               notes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Requires basic HTML knowledge"]
 *               modules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     order:
 *                       type: number
 *                     lessons:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           order:
 *                             type: number
 *                           html_content:
 *                             type: string
 *                           quizzes:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 title:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 useTimer:
 *                                   type: boolean
 *                                 passingScore:
 *                                   type: number
 *                                 questions:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       question:
 *                                         type: string
 *                                       questionType:
 *                                         type: string
 *                                         enum: [singleChoice, multipleChoice, boolean, fillInBlank]
 *                                       options:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             option:
 *                                               type: string
 *                                             isCorrect:
 *                                               type: boolean
 *     responses:
 *       201:
 *         description: Course with content created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/with-content', [authenticate, isTutor], courseController.createCourseWithContent);

/**
 * @swagger
 * /api/v1/new-flow/courses/{id}:
 *   put:
 *     summary: Update a course
 *     description: Update course information.
 *     tags:
 *       - New Flow - Courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', [authenticate, isTutor], courseController.updateCourse);

/**
 * @swagger
 * /api/v1/new-flow/courses/{id}/submit-review:
 *   post:
 *     summary: Submit course for review
 *     description: Submit a course for admin review.
 *     tags:
 *       - New Flow - Courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course submitted for review successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/submit-review', [authenticate, isTutor], courseController.submitCourseForReview);

/**
 * @swagger
 * /api/v1/new-flow/courses/{id}/details:
 *   get:
 *     summary: Get detailed course information
 *     description: Get comprehensive course details including modules, lessons, and quizzes.
 *     tags:
 *       - New Flow - Courses
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/details', courseController.getCourseDetails);

// Module routes
router.post('/modules', [authenticate, isTutor], courseController.createModule);
router.put('/modules/:id', [authenticate, isTutor], courseController.updateModule);

// Lesson routes
router.post('/lessons', [authenticate, isTutor], courseController.createLesson);
router.put('/lessons/:id', [authenticate, isTutor], courseController.updateLesson);

// Quiz routes
router.post('/quizzes', [authenticate, isTutor], courseController.createQuiz);
router.post('/quizzes/with-questions', [authenticate, isTutor], courseController.createQuizAdded);
router.post('/quizzes/:quizId/questions', [authenticate, isTutor], courseController.addQuizQuestion);

module.exports = router;