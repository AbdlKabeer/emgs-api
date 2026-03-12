// scripts/assignSuperAdminRole.js
// Script to assign the Super Admin role to a specific user
// Usage: node scripts/assignSuperAdminRole.js <email>

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Role = require('../src/models/role.model');
const Permission = require('../src/models/permission.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.CONNECTION_STRING || 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function assignSuperAdminRole(email) {
  try {
    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('Usage: node scripts/assignSuperAdminRole.js <email>');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the Super Admin role
    console.log('🔍 Finding Super Admin role...');
    const superAdminRole = await Role.findOne({ slug: 'super_admin' }).populate('permissions');
    
    if (!superAdminRole) {
      console.error('❌ Super Admin role not found in database!');
      console.log('💡 Please run the seed script first: npm run seed:roles');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found Super Admin role: ${superAdminRole.name}`);
    console.log(`   - Role ID: ${superAdminRole._id}`);
    console.log(`   - Total Permissions: ${superAdminRole.permissions.length}`);
    console.log('');

    // Find the user by email
    console.log(`🔍 Finding user with email: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.fullName} (${user.email})`);
    console.log(`   - User ID: ${user._id}`);
    console.log(`   - Current role: ${user.role || 'None'}`);
    console.log(`   - Current roles array: ${user.roles?.join(', ') || 'None'}`);
    console.log(`   - Current assigned role: ${user.assignedRole || 'None'}`);
    console.log('');

    // Check if user already has Super Admin role
    if (user.assignedRole && user.assignedRole.toString() === superAdminRole._id.toString()) {
      console.log('ℹ️  User already has Super Admin role assigned!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Assign Super Admin role
    console.log('📝 Assigning Super Admin role to user...');
    
    user.assignedRole = superAdminRole._id;
    
    // Ensure they have admin in their roles array
    if (!user.roles) {
      user.roles = [];
    }
    if (!user.roles.includes('admin')) {
      user.roles.push('admin');
    }
    
    // Set role field to admin
    user.role = 'admin';
    
    await user.save();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ SUCCESS! Super Admin role assigned');
    console.log('='.repeat(60));
    console.log(`User: ${user.fullName} (${user.email})`);
    console.log(`Role: ${superAdminRole.name}`);
    console.log(`Permissions: ${superAdminRole.permissions.length} (ALL PERMISSIONS)`);
    console.log('='.repeat(60));
    console.log('');
    console.log(`🎉 ${user.fullName} now has full system access with all permissions!`);
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error assigning Super Admin role:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line arguments
const [,, email] = process.argv;
assignSuperAdminRole(email);
