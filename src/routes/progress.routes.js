const express = require('express');
const progressController = require('../controllers/progress.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/v2/progress/course/{courseId}:
 *   get:
 *     summary: Get user progress for a specific course
 *     description: Retrieves the user's progress for a specified course
 *     tags:
 *       - Progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to get progress for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/course/:courseId', authenticate, progressController.getUserCourseProgress);

/**
 * @swagger
 * /api/v2/progress/lesson/{lessonId}/complete:
 *   post:
 *     summary: Mark a lesson as completed
 *     description: Marks a specific lesson as completed for the authenticated user
 *     tags:
 *       - Progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         description: The ID of the lesson to mark as completed
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson marked as completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.post('/lesson/:lessonId/complete', authenticate, progressController.markLessonCompleted);

/**
 * @swagger
 * /api/v1/progress:
 *   get:
 *     summary: Get all user's course progress
 *     description: Retrieves progress for all courses the user has started
 *     tags:
 *       - Progress
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all course progress records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, progressController.getAllUserProgress);

/**
 * @swagger
 * /api/v2/progress/course/{courseId}/reset:
 *   put:
 *     summary: Reset progress for a course
 *     description: Resets all progress for a specific course
 *     tags:
 *       - Progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: The ID of the course to reset progress for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress reset successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/course/:courseId/reset', authenticate, progressController.resetCourseProgress);

module.exports = router;