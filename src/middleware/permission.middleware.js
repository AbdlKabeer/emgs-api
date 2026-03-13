const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const { errorResponse } = require('../utils/custom_response/responses');

/**
 * Check if user has Super Admin role (bypasses all permission checks)
 */
const isSuperAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse('Authentication required', 'UNAUTHORIZED', 401, res);
      }

      console.log('Checking Super Admin access for user:', req.user.email);

      // Check if user has admin role
      if (!req.user.role || req.user.role !== 'admin') {
        return errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN', 403, res);
      }

      // If user has assignedRole, check if it's super_admin
      if (req.user.assignedRole) {
        const role = await Role.findById(req.user.assignedRole);
        if (role && role.slug === 'super_admin') {
          return next();
        }
      }

      return errorResponse('Access denied. Super Admin privileges required.', 'FORBIDDEN', 403, res);
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  };
};

/**
 * Check if user has a specific permission
 * @param {string} requiredPermission - Permission name (e.g., "courses.create")
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse('Authentication required', 'UNAUTHORIZED', 401, res);
      }

      // Check if user has admin role
      if (!req.user.role || req.user.role !== 'admin') {
        return errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN', 403, res);
      }

      console.log(`Checking permission "${requiredPermission}" for user: ${req.user.email}`);
      console.log(`User's assigned role ID: ${req.user.assignedRole}`);
      // If no assignedRole, deny access (legacy admins need to be assigned roles)
      if (!req.user.assignedRole) {
        return errorResponse('Access denied. No role assigned. Please contact system administrator.', 'FORBIDDEN', 403, res);
      }

      // Get user's role with permissions
      const role = await Role.findById(req.user.assignedRole).populate('permissions');
      
      if (!role) {
        return errorResponse('Access denied. Role not found.', 'FORBIDDEN', 403, res);
      }

      if (!role.isActive) {
        return errorResponse('Access denied. Role is inactive.', 'FORBIDDEN', 403, res);
      }

      // Super Admin bypass - has all permissions
      if (role.slug === 'super_admin') {
        return next();
      }

      // Check if user has the required permission
      const hasPermission = role.permissions.some(
        p => p.name === requiredPermission && p.isActive
      );

      if (!hasPermission) {
        return errorResponse(
          `Access denied. Required permission: ${requiredPermission}`,
          'FORBIDDEN',
          403,
          res
        );
      }

      next();
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  };
};

/**
 * Check if user has ANY of the specified permissions
 * @param {string[]} permissions - Array of permission names
 */
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse('Authentication required', 'UNAUTHORIZED', 401, res);
      }

      if (!req.user.roles || !req.user.roles.includes('admin')) {
        return errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN', 403, res);
      }

      if (!req.user.assignedRole) {
        return errorResponse('Access denied. No role assigned.', 'FORBIDDEN', 403, res);
      }

      const role = await Role.findById(req.user.assignedRole).populate('permissions');
      
      if (!role || !role.isActive) {
        return errorResponse('Access denied. Role not found or inactive.', 'FORBIDDEN', 403, res);
      }

      // Super Admin bypass
      if (role.slug === 'super_admin') {
        return next();
      }

      // Check if user has ANY of the required permissions
      const hasAnyPermission = permissions.some(requiredPerm =>
        role.permissions.some(p => p.name === requiredPerm && p.isActive)
      );

      if (!hasAnyPermission) {
        return errorResponse(
          `Access denied. Required permissions (any): ${permissions.join(', ')}`,
          'FORBIDDEN',
          403,
          res
        );
      }

      next();
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  };
};

/**
 * Check if user has ALL of the specified permissions
 * @param {string[]} permissions - Array of permission names
 */
const checkAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse('Authentication required', 'UNAUTHORIZED', 401, res);
      }

      if (!req.user.roles || !req.user.roles.includes('admin')) {
        return errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN', 403, res);
      }

      if (!req.user.assignedRole) {
        return errorResponse('Access denied. No role assigned.', 'FORBIDDEN', 403, res);
      }

      const role = await Role.findById(req.user.assignedRole).populate('permissions');
      
      if (!role || !role.isActive) {
        return errorResponse('Access denied. Role not found or inactive.', 'FORBIDDEN', 403, res);
      }

      // Super Admin bypass
      if (role.slug === 'super_admin') {
        return next();
      }

      // Check if user has ALL of the required permissions
      const hasAllPermissions = permissions.every(requiredPerm =>
        role.permissions.some(p => p.name === requiredPerm && p.isActive)
      );

      if (!hasAllPermissions) {
        return errorResponse(
          `Access denied. Required permissions (all): ${permissions.join(', ')}`,
          'FORBIDDEN',
          403,
          res
        );
      }

      next();
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  };
};

/**
 * Check if user is an admin (with or without specific role)
 * Use this for backward compatibility with existing admin checks
 */
const isAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse('Authentication required', 'UNAUTHORIZED', 401, res);
      }

      if (!req.user.role || req.user.role !== 'admin') {
        return errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN', 403, res);
      }

      next();
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  };
};

module.exports = {
  isSuperAdmin,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  isAdmin
};
