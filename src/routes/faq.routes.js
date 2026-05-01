const express = require('express');
const faqController = require('../controllers/faq.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { 
    faqValidator
} = require('../validators/faq.validator');

const router = express.Router();


/**
 * @swagger
 * /api/v2/faq:
 *   post:
 *     summary: Add a new FAQ
 *     description: Admin only. Creates a new FAQ 
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *         description: ID of the course to add FAQ to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *                 description: The FAQ question
 *               answer:
 *                 type: string
 *                 description: The FAQ answer
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only admins can perform this action
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.post('/', [authenticate, isAdmin, faqValidator],faqValidator, faqController.addFAQ);

/**
 * @swagger
 * /api/v1/faqs/{faqId}:
 *   put:
 *     summary: Update an existing FAQ
 *     description: Admin only. Updates a specific FAQ.
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: faqId
 *         in: path
 *         required: true
 *         description: ID of the FAQ to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 description: The updated FAQ question
 *               answer:
 *                 type: string
 *                 description: The updated FAQ answer
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only admins can perform this action
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.put('/:faqId', [authenticate, isAdmin, faqValidator], faqController.updateFAQ);

/**
 * @swagger
 * /api/v1/faqs/{faqId}:
 *   delete:
 *     summary: Delete an FAQ
 *     description: Admin only. Deletes a specific FAQ.
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: faqId
 *         in: path
 *         required: true
 *         description: ID of the FAQ to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only admins can perform this action
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.delete('/:faqId', [authenticate, isAdmin], faqController.deleteFAQ);

/**
 * @swagger
 * /api/v1/courses/{courseId}/faqs:
 *   get:
 *     summary: Get all FAQs for a course
 *     description: Public endpoint. Retrieves all FAQs for a specific course.
 *     tags:
 *       - FAQs
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         description: ID of the course
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of FAQs for the course
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.get('/', faqController.getCourseFAQs);


module.exports = router;