require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const User = require('../models/user.model');

// Define all permissions by module
const permissionsData = [
  // ==================== COURSES ====================
  { module: 'courses', action: 'create', description: 'Create new courses' },
  { module: 'courses', action: 'read', description: 'View courses' },
  { module: 'courses', action: 'update', description: 'Update course details' },
  { module: 'courses', action: 'delete', description: 'Delete courses' },
  { module: 'courses', action: 'approve', description: 'Approve tutor courses' },
  { module: 'courses', action: 'reject', description: 'Reject tutor courses' },
  { module: 'courses', action: 'publish', description: 'Publish courses' },

  // ==================== USERS ====================
  { module: 'users', action: 'create', description: 'Create new users' },
  { module: 'users', action: 'read', description: 'View users' },
  { module: 'users', action: 'update', description: 'Update user details' },
  { module: 'users', action: 'delete', description: 'Delete users' },
  { module: 'users', action: 'suspend', description: 'Suspend user accounts' },
  { module: 'users', action: 'verify', description: 'Verify user accounts' },

  // ==================== TUTORS ====================
  { module: 'tutors', action: 'create', description: 'Create tutor accounts' },
  { module: 'tutors', action: 'read', description: 'View tutors' },
  { module: 'tutors', action: 'update', description: 'Update tutor details' },
  { module: 'tutors', action: 'delete', description: 'Delete tutor accounts' },
  { module: 'tutors', action: 'approve', description: 'Approve tutor requests' },
  { module: 'tutors', action: 'reject', description: 'Reject tutor requests' },

  // ==================== PAYMENTS ====================
  { module: 'payments', action: 'create', description: 'Create payment records' },
  { module: 'payments', action: 'read', description: 'View payments' },
  { module: 'payments', action: 'update', description: 'Update payment status' },
  { module: 'payments', action: 'delete', description: 'Delete payment records' },
  { module: 'payments', action: 'refund', description: 'Process refunds' },

  // ==================== LESSONS ====================
  { module: 'lessons', action: 'create', description: 'Create new lessons' },
  { module: 'lessons', action: 'read', description: 'View lessons' },
  { module: 'lessons', action: 'update', description: 'Update lesson content' },
  { module: 'lessons', action: 'delete', description: 'Delete lessons' },

  // ==================== SERVICES ====================
  { module: 'services', action: 'create', description: 'Create new services' },
  { module: 'services', action: 'read', description: 'View services' },
  { module: 'services', action: 'update', description: 'Update service details' },
  { module: 'services', action: 'delete', description: 'Delete services' },

  // ==================== INQUIRIES ====================
  { module: 'inquiries', action: 'create', description: 'Create inquiries' },
  { module: 'inquiries', action: 'read', description: 'View inquiries' },
  { module: 'inquiries', action: 'update', description: 'Update inquiry status' },
  { module: 'inquiries', action: 'delete', description: 'Delete inquiries' },

  // ==================== ENROLLMENTS ====================
  { module: 'enrollments', action: 'create', description: 'Enroll users in courses' },
  { module: 'enrollments', action: 'read', description: 'View enrollments' },
  { module: 'enrollments', action: 'update', description: 'Update enrollment status' },
  { module: 'enrollments', action: 'delete', description: 'Remove enrollments' },

  // ==================== ANALYTICS ====================
  { module: 'analytics', action: 'read', description: 'View analytics and reports' },
  { module: 'analytics', action: 'export', description: 'Export analytics data' },

  // ==================== NOTIFICATIONS ====================
  { module: 'notifications', action: 'create', description: 'Create notifications' },
  { module: 'notifications', action: 'read', description: 'View notifications' },
  { module: 'notifications', action: 'update', description: 'Update notifications' },
  { module: 'notifications', action: 'delete', description: 'Delete notifications' },
  { module: 'notifications', action: 'broadcast', description: 'Send broadcast notifications' },

  // ==================== FAQS ====================
  { module: 'faqs', action: 'create', description: 'Create FAQs' },
  { module: 'faqs', action: 'read', description: 'View FAQs' },
  { module: 'faqs', action: 'update', description: 'Update FAQs' },
  { module: 'faqs', action: 'delete', description: 'Delete FAQs' },

  // ==================== SETTINGS ====================
  { module: 'settings', action: 'read', description: 'View system settings' },
  { module: 'settings', action: 'update', description: 'Update system settings' },

  // ==================== ROLES ====================
  { module: 'roles', action: 'create', description: 'Create new roles' },
  { module: 'roles', action: 'read', description: 'View roles' },
  { module: 'roles', action: 'update', description: 'Update roles' },
  { module: 'roles', action: 'delete', description: 'Delete roles' },

  // ==================== PERMISSIONS ====================
  { module: 'permissions', action: 'read', description: 'View permissions' },
  { module: 'permissions', action: 'update', description: 'Assign permissions to roles' },

  // ==================== WAITLIST ====================
  { module: 'waitlist', action: 'create', description: 'Add to waitlist' },
  { module: 'waitlist', action: 'read', description: 'View waitlist' },
  { module: 'waitlist', action: 'update', description: 'Update waitlist entries' },
  { module: 'waitlist', action: 'delete', description: 'Remove from waitlist' },

  // ==================== WALLET ====================
  { module: 'wallet', action: 'create', description: 'Create wallet transactions' },
  { module: 'wallet', action: 'read', description: 'View wallet details' },
  { module: 'wallet', action: 'update', description: 'Update wallet balance' },
  { module: 'wallet', action: 'delete', description: 'Delete wallet transactions' },
];

// Define predefined roles with their permissions
const rolesData = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: 'ALL' // Will be assigned all permissions
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'General admin access without role/permission management',
    isSystemRole: true,
    permissions: [
      'courses.read', 'courses.update', 'courses.approve', 'courses.reject', 'courses.publish',
      'users.read', 'users.update', 'users.suspend', 'users.verify',
      'tutors.read', 'tutors.approve', 'tutors.reject',
      'payments.read', 'payments.update',
      'lessons.read', 'lessons.update',
      'services.read', 'services.update',
      'inquiries.read', 'inquiries.update',
      'enrollments.read',
      'analytics.read',
      'notifications.create', 'notifications.read', 'notifications.broadcast',
      'faqs.read', 'faqs.update',
      'settings.read',
      'waitlist.read'
    ]
  },
  {
    name: 'Content Manager',
    slug: 'content_manager',
    description: 'Manage courses, lessons, and FAQs',
    isSystemRole: false,
    permissions: [
      'courses.create', 'courses.read', 'courses.update', 'courses.delete', 'courses.publish',
      'lessons.create', 'lessons.read', 'lessons.update', 'lessons.delete',
      'faqs.create', 'faqs.read', 'faqs.update', 'faqs.delete',
      'users.read',
      'enrollments.read',
      'analytics.read'
    ]
  },
  {
    name: 'Finance Manager',
    slug: 'finance_manager',
    description: 'Manage payments and financial operations',
    isSystemRole: false,
    permissions: [
      'payments.create', 'payments.read', 'payments.update', 'payments.refund',
      'wallet.read', 'wallet.update',
      'users.read',
      'analytics.read', 'analytics.export'
    ]
  },
  {
    name: 'Support Manager',
    slug: 'support_manager',
    description: 'Handle user inquiries and support',
    isSystemRole: false,
    permissions: [
      'inquiries.read', 'inquiries.update', 'inquiries.delete',
      'notifications.create', 'notifications.read', 'notifications.broadcast',
      'users.read',
      'faqs.create', 'faqs.read', 'faqs.update', 'faqs.delete',
      'waitlist.read', 'waitlist.update'
    ]
  },
  {
    name: 'Tutor Manager',
    slug: 'tutor_manager',
    description: 'Manage tutor accounts and approvals',
    isSystemRole: false,
    permissions: [
      'tutors.create', 'tutors.read', 'tutors.update', 'tutors.delete', 'tutors.approve', 'tutors.reject',
      'courses.read', 'courses.approve', 'courses.reject',
      'users.read',
      'analytics.read'
    ]
  }
];

// Seed function
const seedRolesAndPermissions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('\n🗑️  Clearing existing permissions and roles...');
    await Permission.deleteMany({});
    await Role.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create permissions
    console.log('\n📝 Creating permissions...');
    const createdPermissions = [];
    
    for (const permData of permissionsData) {
      const permission = new Permission({
        name: `${permData.module}.${permData.action}`,
        module: permData.module,
        action: permData.action,
        description: permData.description,
        isSystemPermission: true,
        isActive: true
      });
      await permission.save();
      createdPermissions.push(permission);
    }
    
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Create roles
    console.log('\n👥 Creating roles...');
    const allPermissionIds = createdPermissions.map(p => p._id);
    
    for (const roleData of rolesData) {
      let rolePermissions = [];
      
      if (roleData.permissions === 'ALL') {
        rolePermissions = allPermissionIds;
      } else {
        // Find permission IDs by name
        rolePermissions = createdPermissions
          .filter(p => roleData.permissions.includes(p.name))
          .map(p => p._id);
      }

      const role = new Role({
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        permissions: rolePermissions,
        isSystemRole: roleData.isSystemRole,
        isActive: true
      });
      
      await role.save();
      console.log(`  ✅ Created role: ${roleData.name} (${rolePermissions.length} permissions)`);
    }

    console.log('\n✅ Roles and permissions seeded successfully!');
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`  - Total Permissions: ${createdPermissions.length}`);
    console.log(`  - Total Roles: ${rolesData.length}`);
    console.log(`  - Modules: ${[...new Set(permissionsData.map(p => p.module))].join(', ')}`);
    
    // Check if there are any admin users without assigned roles
    console.log('\n👤 Checking admin users...');
    const adminUsers = await User.find({ roles: 'admin', assignedRole: null });
    if (adminUsers.length > 0) {
      console.log(`\n⚠️  Found ${adminUsers.length} admin user(s) without assigned roles:`);
      adminUsers.forEach(user => {
        console.log(`  - ${user.fullName} (${user.email})`);
      });
      console.log('\n💡 To assign roles to these users, use the API:');
      console.log('   POST /api/admin/roles/users/:userId/role');
      console.log('   Body: { "roleId": "<role_id>" }');
    } else {
      console.log('✅ No admin users without roles found');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles and permissions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedRolesAndPermissions();
