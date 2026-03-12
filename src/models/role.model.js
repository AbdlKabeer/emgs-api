const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // e.g., "Super Admin", "Content Manager", "Finance Manager"
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // e.g., "super_admin", "content_manager"
  },
  description: {
    type: String,
    trim: true,
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
  }],
  isSystemRole: {
    type: Boolean,
    default: false,
    // System roles cannot be deleted (only Super Admin, Admin)
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

// Index for faster queries
roleSchema.index({ isActive: 1 });

// Pre-save hook to generate slug from name
roleSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }
  next();
});

// Static method to get role with permissions populated
roleSchema.statics.getRoleWithPermissions = async function(roleId) {
  return await this.findById(roleId)
    .populate('permissions')
    .populate('createdBy', 'fullName email')
    .populate('updatedBy', 'fullName email');
};

// Instance method to check if role has a specific permission
roleSchema.methods.hasPermission = function(permissionName) {
  return this.permissions.some(p => p.name === permissionName);
};

module.exports = mongoose.model('Role', roleSchema);
