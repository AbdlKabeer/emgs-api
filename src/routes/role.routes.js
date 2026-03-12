const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isSuperAdmin, checkPermission, isAdmin } = require('../middleware/permission.middleware');

// ==================== ROLE ROUTES ====================

/**
 * @route   POST /api/admin/roles
 * @desc    Create a new role
 * @access  Super Admin
 */
router.post(
  '/',
  authenticate,
  isSuperAdmin(),
  roleController.createRole
);

/**
 * @route   GET /api/admin/roles
 * @desc    Get all roles
 * @access  Admin (with roles.read permission)
 */
router.get(
  '/',
  authenticate,
  checkPermission('roles.read'),
  roleController.getAllRoles
);

/**
 * @route   GET /api/admin/roles/:id
 * @desc    Get role by ID
 * @access  Admin (with roles.read permission)
 */
router.get(
  '/:id',
  authenticate,
  checkPermission('roles.read'),
  roleController.getRoleById
);

/**
 * @route   PUT /api/admin/roles/:id
 * @desc    Update role
 * @access  Super Admin
 */
router.put(
  '/:id',
  authenticate,
  isSuperAdmin(),
  roleController.updateRole
);

/**
 * @route   DELETE /api/admin/roles/:id
 * @desc    Delete role
 * @access  Super Admin
 */
router.delete(
  '/:id',
  authenticate,
  isSuperAdmin(),
  roleController.deleteRole
);

/**
 * @route   POST /api/admin/roles/:id/permissions
 * @desc    Add permissions to role
 * @access  Super Admin
 */
router.post(
  '/:id/permissions',
  authenticate,
  isSuperAdmin(),
  roleController.addPermissionsToRole
);

/**
 * @route   DELETE /api/admin/roles/:id/permissions/:permissionId
 * @desc    Remove permission from role
 * @access  Super Admin
 */
router.delete(
  '/:id/permissions/:permissionId',
  authenticate,
  isSuperAdmin(),
  roleController.removePermissionFromRole
);

/**
 * @route   GET /api/admin/roles/:id/permissions
 * @desc    Get permissions for a role
 * @access  Admin (with roles.read permission)
 */
router.get(
  '/:id/permissions',
  authenticate,
  checkPermission('roles.read'),
  roleController.getRolePermissions
);

/**
 * @route   GET /api/admin/roles/:id/users
 * @desc    Get users assigned to a role
 * @access  Admin (with roles.read permission)
 */
router.get(
  '/:id/users',
  authenticate,
  checkPermission('roles.read'),
  roleController.getUsersByRole
);

// ==================== USER-ROLE ASSIGNMENT ROUTES ====================

/**
 * @route   POST /api/admin/users/:userId/role
 * @desc    Assign role to user
 * @access  Admin (with users.update permission)
 */
router.post(
  '/users/:userId/role',
  authenticate,
  checkPermission('users.update'),
  roleController.assignRoleToUser
);

/**
 * @route   DELETE /api/admin/users/:userId/role
 * @desc    Remove role from user
 * @access  Admin (with users.update permission)
 */
router.delete(
  '/users/:userId/role',
  authenticate,
  checkPermission('users.update'),
  roleController.removeRoleFromUser
);

/**
 * @route   GET /api/admin/users/:userId/permissions
 * @desc    Get user's effective permissions
 * @access  Admin (with users.read permission)
 */
router.get(
  '/users/:userId/permissions',
  authenticate,
  checkPermission('users.read'),
  roleController.getUserPermissions
);

module.exports = router;
