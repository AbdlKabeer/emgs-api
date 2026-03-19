const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { 
  createCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  getCategoryValidator
} = require('../validators/category.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get All Categories
 *     description: Retrieves a paginated list of all course categories
 *     tags:
 *       - Categories
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
 *         description: Search by category name
 *       - name: isActive
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of categories successfully fetched
 *       500:
 *         description: Internal server error
 */
router.get('/', categoryController.getAllCategories);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get Category by ID or Slug
 *     description: Retrieves a specific category by ID or slug
 *     tags:
 *       - Categories
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID or slug of the category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details successfully fetched
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getCategoryValidator, categoryController.getCategoryById);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create Category (Admin Only)
 *     description: Creates a new course category
 *     tags:
 *       - Categories
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Bad request or category already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, isAdmin, createCategoryValidator, categoryController.createCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update Category (Admin Only)
 *     description: Updates an existing course category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the category to update
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
 *               icon:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Bad request or category name already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, isAdmin, updateCategoryValidator, categoryController.updateCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete Category (Admin Only)
 *     description: Deletes a course category if no courses are using it
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the category to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete - category has courses
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, isAdmin, deleteCategoryValidator, categoryController.deleteCategory);

/**
 * @swagger
 * /api/v1/categories/stats/all:
 *   get:
 *     summary: Get Category Statistics (Admin Only)
 *     description: Retrieves statistics for all categories including course counts
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category statistics fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats/all', authenticate, isAdmin, categoryController.getCategoryStats);

module.exports = router;
