const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isSuperAdmin, checkPermission } = require('../middleware/permission.middleware');

// ==================== PERMISSION ROUTES ====================

/**
 * @route   GET /api/admin/permissions
 * @desc    Get all permissions
 * @access  Admin (with permissions.read)
 */
router.get(
  '/',
  authenticate,
  checkPermission('permissions.read'),
  permissionController.getAllPermissions
);

/**
 * @route   GET /api/admin/permissions/modules
 * @desc    Get permissions grouped by module
 * @access  Admin (with permissions.read)
 */
router.get(
  '/modules',
  authenticate,
  checkPermission('permissions.read'),
  permissionController.getPermissionsByModule
);

/**
 * @route   GET /api/admin/permissions/modules/list
 * @desc    Get all unique modules
 * @access  Admin (with permissions.read)
 */
router.get(
  '/modules/list',
  authenticate,
  checkPermission('permissions.read'),
  permissionController.getAllModules
);

/**
 * @route   GET /api/admin/permissions/stats
 * @desc    Get permission statistics
 * @access  Admin (with permissions.read)
 */
router.get(
  '/stats',
  authenticate,
  checkPermission('permissions.read'),
  permissionController.getPermissionStats
);

/**
 * @route   GET /api/admin/permissions/:id
 * @desc    Get permission by ID
 * @access  Admin (with permissions.read)
 */
router.get(
  '/:id',
  authenticate,
  checkPermission('permissions.read'),
  permissionController.getPermissionById
);

/**
 * @route   POST /api/admin/permissions
 * @desc    Create a new permission
 * @access  Super Admin only
 */
router.post(
  '/',
  authenticate,
  isSuperAdmin(),
  permissionController.createPermission
);

/**
 * @route   PUT /api/admin/permissions/:id
 * @desc    Update permission
 * @access  Super Admin only
 */
router.put(
  '/:id',
  authenticate,
  isSuperAdmin(),
  permissionController.updatePermission
);

/**
 * @route   DELETE /api/admin/permissions/:id
 * @desc    Delete permission
 * @access  Super Admin only
 */
router.delete(
  '/:id',
  authenticate,
  isSuperAdmin(),
  permissionController.deletePermission
);

module.exports = router;
