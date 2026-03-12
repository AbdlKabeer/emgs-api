const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const { successResponse, errorResponse, validationErrorResponse, paginationResponse } = require('../utils/custom_response/responses');

// ==================== PERMISSION MANAGEMENT ====================

// Get all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filter by module
    if (req.query.module) {
      filter.module = req.query.module.toLowerCase();
    }

    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action.toLowerCase();
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Search by name or description
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    const total = await Permission.countDocuments(filter);
    const permissions = await Permission.find(filter)
      .sort({ module: 1, action: 1 })
      .skip(skip)
      .limit(limit);

    return paginationResponse(permissions, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get permissions grouped by module
exports.getPermissionsByModule = async (req, res) => {
  try {
    const groupedPermissions = await Permission.getGroupedByModule();

    return successResponse(groupedPermissions, res, 200, 'Permissions grouped by module fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all unique modules
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Permission.distinct('module', { isActive: true });
    
    return successResponse(modules.sort(), res, 200, 'Modules fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get permission by ID
exports.getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);

    if (!permission) {
      return errorResponse('Permission not found', 'NOT_FOUND', 404, res);
    }

    // Get roles that have this permission
    const rolesWithPermission = await Role.find({ permissions: id })
      .select('name slug description');

    return successResponse({
      ...permission.toObject(),
      usedInRoles: rolesWithPermission
    }, res, 200, 'Permission fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Create a new permission (Super Admin only)
exports.createPermission = async (req, res) => {
  try {
    const { module, action, description } = req.body;

    if (!module || !action || !description) {
      return validationErrorResponse('Module, action, and description are required', res);
    }

    const name = `${module.toLowerCase()}.${action.toLowerCase()}`;

    // Check if permission already exists
    const existingPermission = await Permission.findOne({ name });
    if (existingPermission) {
      return errorResponse('Permission already exists', 'DUPLICATE', 400, res);
    }

    const permission = new Permission({
      name,
      module: module.toLowerCase(),
      action: action.toLowerCase(),
      description,
      isSystemPermission: false
    });

    await permission.save();

    return successResponse(permission, res, 201, 'Permission created successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update permission (Super Admin only)
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, isActive } = req.body;

    const permission = await Permission.findById(id);

    if (!permission) {
      return errorResponse('Permission not found', 'NOT_FOUND', 404, res);
    }

    // Cannot modify system permissions' core properties
    if (permission.isSystemPermission && (req.body.module || req.body.action || req.body.name)) {
      return errorResponse('Cannot modify module, action, or name of system permissions', 'FORBIDDEN', 403, res);
    }

    if (description !== undefined) permission.description = description;
    if (isActive !== undefined) permission.isActive = isActive;

    await permission.save();

    return successResponse(permission, res, 200, 'Permission updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Delete permission (Super Admin only)
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);

    if (!permission) {
      return errorResponse('Permission not found', 'NOT_FOUND', 404, res);
    }

    // Cannot delete system permissions
    if (permission.isSystemPermission) {
      return errorResponse('Cannot delete system permissions', 'FORBIDDEN', 403, res);
    }

    // Check if permission is used in any role
    const rolesUsingPermission = await Role.countDocuments({ permissions: id });
    if (rolesUsingPermission > 0) {
      return errorResponse(`Cannot delete permission. It is used by ${rolesUsingPermission} role(s)`, 'BAD_REQUEST', 400, res);
    }

    await Permission.findByIdAndDelete(id);

    return successResponse({ message: 'Permission deleted successfully' }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get permissions statistics
exports.getPermissionStats = async (req, res) => {
  try {
    const totalPermissions = await Permission.countDocuments();
    const activePermissions = await Permission.countDocuments({ isActive: true });
    const systemPermissions = await Permission.countDocuments({ isSystemPermission: true });
    const customPermissions = await Permission.countDocuments({ isSystemPermission: false });

    const permissionsByModule = await Permission.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
          actions: { $addToSet: '$action' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return successResponse({
      total: totalPermissions,
      active: activePermissions,
      system: systemPermissions,
      custom: customPermissions,
      byModule: permissionsByModule
    }, res, 200, 'Permission statistics fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};
