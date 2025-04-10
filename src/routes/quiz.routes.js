const express = require('express');
const quizController = require('../controllers/quiz.controller');
const { authenticate, isAdmin ,isTutor} = require('../middleware/auth.middleware');
const { 
    createQuizValidator,
    updateQuizValidator,
    getQuizStatisticsValidator,
    submitQuizValidator,
    getQuizValidator ,
    getQuizProgressValidator
} = require('../validators/quiz.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     description: Creates a new quiz with questions and options (admin only)
 *     tags:
 *       - Quizzes
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
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - options
 *                   properties:
 *                     question:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - option
 *                           - isCorrect
 *                         properties:
 *                           option:
 *                             type: string
 *                           isCorrect:
 *                             type: boolean
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate,isTutor, quizController.createQuizAdded);
// router.post('/', authenticate,isTutor,createQuizValidator, quizController.createQuizAdded);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}:
 *   put:
 *     summary: Update a quiz
 *     description: Updates an existing quiz (admin only)
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
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
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option:
 *                             type: string
 *                           isCorrect:
 *                             type: boolean
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.put('/:quizId', authenticate,isTutor,updateQuizValidator, quizController.updateQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}:
 *   delete:
 *     summary: Delete a quiz
 *     description: Deletes a quiz and all associated progress records (admin only)
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:quizId',authenticate, isTutor,getQuizValidator, quizController.deleteQuiz);

/**
 * @swagger
 * /api/v1/quizzes:
 *   get:
 *     summary: Get all quizzes
 *     description: Retrieves all quizzes with pagination
 *     tags:
 *       - Quizzes
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quizzes
 *       500:
 *         description: Internal server error
 */
router.get('/course/:courseId', quizController.getAllCourseQuizzes);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}:
 *   get:
 *     summary: Get a quiz
 *     description: Retrieves a single quiz by ID (without correct answers)
 *     tags:
 *       - Quizzes
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.get('/:quizId',getQuizValidator, quizController.getQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/with-answers:
 *   get:
 *     summary: Get quiz with answers
 *     description: Retrieves a quiz with correct answers (admin only)
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz details with answers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.get('/:quizId/with-answers', authenticate, quizController.getQuizWithAnswers);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     description: Submits user answers for a quiz and calculates score
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionIndex
 *                     - selectedOptionIndex
 *                   properties:
 *                     questionIndex:
 *                       type: integer
 *                     selectedOptionIndex:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.post('/:quizId/submit', authenticate,submitQuizValidator, quizController.submitQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/progress:
 *   get:
 *     summary: Get user's quiz progress
 *     description: Retrieves the authenticated user's progress for a specific quiz
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz progress details
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:quizId/progress', authenticate,getQuizProgressValidator, quizController.getUserQuizProgress);

/**
 * @swagger
 * /api/v1/quizzes/progress/all:
 *   get:
 *     summary: Get all user's quiz progress
 *     description: Retrieves progress records for all quizzes attempted by the user
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of quiz progress records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/progress/all', authenticate, quizController.getAllUserQuizProgress);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/statistics:
 *   get:
 *     summary: Get quiz statistics
 *     description: Retrieves statistics for a quiz (admin only)
 *     tags:
 *       - Quizzes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: quizId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.get('/:quizId/statistics', isTutor,getQuizStatisticsValidator, quizController.getQuizStatistics);

module.exports = router;