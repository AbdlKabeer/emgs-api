const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // Format: module.action (e.g., "courses.create", "users.read")
  },
  module: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // e.g., "courses", "users", "payments", "tutors", etc.
  },
  action: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // e.g., "create", "read", "update", "delete", "approve", "export"
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSystemPermission: {
    type: Boolean,
    default: false,
    // System permissions cannot be deleted
  }
}, {
  timestamps: true,
});

// Index for faster queries
permissionSchema.index({ module: 1, action: 1 });
permissionSchema.index({ name: 1 });
permissionSchema.index({ isActive: 1 });

// Static method to get all permissions grouped by module
permissionSchema.statics.getGroupedByModule = async function() {
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$module',
        permissions: {
          $push: {
            id: '$_id',
            name: '$name',
            action: '$action',
            description: '$description'
          }
        }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

module.exports = mongoose.model('Permission', permissionSchema);
