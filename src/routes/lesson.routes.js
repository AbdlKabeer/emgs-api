const express = require('express');
const lessonController = require('../controllers/lesson.controller');
const { authenticate, isTutor } = require('../middleware/auth.middleware');
const { 
    createLessonValidator,
    updateLessonValidator 
} = require('../validators/lesson.validator');

const router = express.Router();


/**
 * @swagger
 * /api/v1/lessons:
 *   post:
 *     summary: Create a new lesson
 *     description: Allows admins to create a new lesson for a course.
 *     tags:
 *       - Lessons
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the lesson
 *               description:
 *                 type: string
 *                 description: Description of the lesson
 *               videoUrl:
 *                 type: string
 *                 description: Content or body of the lesson
 *               isPublished:
 *                 type: boolean
 *                 description: Is the lesson published
 *               order:
 *                 type: number
 *                 description: Order of the lesson
 *               courseId:
 *                 type: string
 *                 description: The ID of the course to which the lesson belongs
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized, admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/', [authenticate, isTutor],lessonController.createLesson);


/**
 * @swagger
 * /api/v1/lessons/course/{courseId}:
 *   get:
 *     summary: Get all lessons for a specific course
 *     description: Fetches all lessons associated with a given course.
 *     tags:
 *       - Lessons
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course whose lessons need to be fetched
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of lessons for the course
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/course/:courseId', lessonController.getLessonsForCourse);

/**
 * @swagger
 * /api/v1/lessons/lesson/{id}:
 *   get:
 *     summary: Get a specific lesson by its ID
 *     description: Fetches the details of a specific lesson by its ID.
 *     tags:
 *       - Lessons
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the lesson to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson details
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.get('/lesson/:id', lessonController.getLessonById);



/**
 * @swagger
 * /api/v1/lessons/lesson/{id}:
 *   put:
 *     summary: Update an existing lesson
 *     description: Allows admins to update the details of an existing lesson.
 *     tags:
 *       - Lessons
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the lesson to update
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
 *                 description: New title for the lesson
 *               content:
 *                 type: string
 *                 description: New content for the lesson
 *               courseId:
 *                 type: string
 *                 description: The ID of the course to which the lesson belongs
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       400:
 *         description: Invalid data provided
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.put('/lesson/:id', [authenticate, isTutor],updateLessonValidator, lessonController.updateLesson);

/**
 * @swagger
 * /api/v1/lessons/lesson/{id}:
 *   delete:
 *     summary: Delete an existing lesson
 *     description: Allows admins to delete a lesson by its ID.
 *     tags:
 *       - Lessons
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the lesson to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       401:
 *         description: Unauthorized, admin access required
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.delete('/lesson/:id', [authenticate, isTutor], lessonController.deleteLesson);

module.exports = router;
