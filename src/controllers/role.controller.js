const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const User = require('../models/user.model');
const { successResponse, errorResponse, validationErrorResponse, paginationResponse } = require('../utils/custom_response/responses');

// ==================== ROLE MANAGEMENT ====================

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return validationErrorResponse('Role name is required', res);
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');

    // Check if role already exists (by name or slug)
    const existingRole = await Role.findOne({ $or: [{ name }, { slug }] });
    if (existingRole) {
      return errorResponse('Role with this name already exists', 'DUPLICATE', 400, res);
    }

    // Verify all permissions exist
    if (permissions && permissions.length > 0) {
      const permissionDocs = await Permission.find({ _id: { $in: permissions } });
      if (permissionDocs.length !== permissions.length) {
        return errorResponse('One or more permissions not found', 'NOT_FOUND', 404, res);
      }
    }

    const role = new Role({
      name,
      slug,
      description,
      permissions: permissions || [],
      createdBy: req.user.id
    });

    await role.save();

    const populatedRole = await Role.getRoleWithPermissions(role._id);

    return successResponse(populatedRole, res, 201, 'Role created successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Search by name
    if (req.query.search) {
      filter.name = new RegExp(req.query.search, 'i');
    }

    const total = await Role.countDocuments(filter);
    const roles = await Role.find(filter)
      .populate('permissions')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginationResponse(roles, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get role by ID
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.getRoleWithPermissions(id);

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    // Get users count with this role
    const usersCount = await User.countDocuments({ assignedRole: id });

    return successResponse({
      ...role.toObject(),
      usersCount
    }, res, 200, 'Role fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    const role = await Role.findById(id);

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    // Prevent updating system roles' core properties
    if (role.isSystemRole && (name || permissions)) {
      return errorResponse('Cannot modify name or permissions of system roles', 'FORBIDDEN', 403, res);
    }

    // Check if new name already exists
    if (name && name !== role.name) {
      const newSlug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
      const existingRole = await Role.findOne({ $or: [{ name }, { slug: newSlug }] });
      if (existingRole) {
        return errorResponse('Role with this name already exists', 'DUPLICATE', 400, res);
      }
      role.name = name;
      role.slug = newSlug;
    }

    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;
    
    if (permissions && permissions.length > 0) {
      // Verify all permissions exist
      const permissionDocs = await Permission.find({ _id: { $in: permissions } });
      if (permissionDocs.length !== permissions.length) {
        return errorResponse('One or more permissions not found', 'NOT_FOUND', 404, res);
      }
      role.permissions = permissions;
    }

    role.updatedBy = req.user.id;
    await role.save();

    const updatedRole = await Role.getRoleWithPermissions(role._id);

    return successResponse(updatedRole, res, 200, 'Role updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return errorResponse('Cannot delete system roles', 'FORBIDDEN', 403, res);
    }

    // Check if any users are assigned this role
    const usersWithRole = await User.countDocuments({ assignedRole: id });
    if (usersWithRole > 0) {
      return errorResponse(`Cannot delete role. ${usersWithRole} user(s) are assigned to this role`, 'BAD_REQUEST', 400, res);
    }

    await Role.findByIdAndDelete(id);

    return successResponse({ message: 'Role deleted successfully' }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add permissions to role
exports.addPermissionsToRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return validationErrorResponse('Permissions array is required', res);
    }

    const role = await Role.findById(id);

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    // Prevent modifying system roles
    if (role.isSystemRole) {
      return errorResponse('Cannot modify permissions of system roles', 'FORBIDDEN', 403, res);
    }

    // Verify all permissions exist
    const permissionDocs = await Permission.find({ _id: { $in: permissions } });
    if (permissionDocs.length !== permissions.length) {
      return errorResponse('One or more permissions not found', 'NOT_FOUND', 404, res);
    }

    // Add only new permissions (avoid duplicates)
    permissions.forEach(permId => {
      if (!role.permissions.includes(permId)) {
        role.permissions.push(permId);
      }
    });

    role.updatedBy = req.user.id;
    await role.save();

    const updatedRole = await Role.getRoleWithPermissions(role._id);

    return successResponse(updatedRole, res, 200, 'Permissions added to role successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Remove permission from role
exports.removePermissionFromRole = async (req, res) => {
  try {
    const { id, permissionId } = req.params;

    const role = await Role.findById(id);

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    // Prevent modifying system roles
    if (role.isSystemRole) {
      return errorResponse('Cannot modify permissions of system roles', 'FORBIDDEN', 403, res);
    }

    // Remove permission
    role.permissions = role.permissions.filter(p => p.toString() !== permissionId);
    role.updatedBy = req.user.id;
    await role.save();

    const updatedRole = await Role.getRoleWithPermissions(role._id);

    return successResponse(updatedRole, res, 200, 'Permission removed from role successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get permissions for a role
exports.getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id).populate('permissions');

    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(role.permissions, res, 200, 'Role permissions fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Assign role to user
exports.assignRoleToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return validationErrorResponse('Role ID is required', res);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    if (!role.isActive) {
      return errorResponse('Cannot assign inactive role', 'BAD_REQUEST', 400, res);
    }

    // Ensure user has admin role
    if (!user.roles.includes('admin')) {
      user.roles.push('admin');
    }

    user.assignedRole = roleId;
    await user.save();

    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('assignedRole');

    return successResponse(updatedUser, res, 200, 'Role assigned to user successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Remove role from user
exports.removeRoleFromUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }


    user.assignedRole = null;

    if (user.roles.includes('admin')) {
      user.roles = user.roles.filter(r => r !== 'admin');
    }
    await user.save();

    const updatedUser = await User.findById(userId).select('-password');

    return successResponse(updatedUser, res, 200, 'Role removed from user successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get user's effective permissions
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate({
      path: 'assignedRole',
      populate: {
        path: 'permissions'
      }
    });

    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }

    const permissions = user.assignedRole ? user.assignedRole.permissions : [];

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles
      },
      assignedRole: user.assignedRole,
      permissions
    }, res, 200, 'User permissions fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get users by role
exports.getUsersByRole = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const role = await Role.findById(id);
    if (!role) {
      return errorResponse('Role not found', 'NOT_FOUND', 404, res);
    }

    const total = await User.countDocuments({ assignedRole: id });
    const users = await User.find({ assignedRole: id })
      .select('-password')
      .populate('assignedRole')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginationResponse(users, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};
