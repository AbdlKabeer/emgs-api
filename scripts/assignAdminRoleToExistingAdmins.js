// scripts/assignAdminRoleToExistingAdmins.js
// Script to assign the Admin role to all existing admin users
// Usage: node scripts/assignAdminRoleToExistingAdmins.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Role = require('../src/models/role.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function assignAdminRoleToExistingAdmins() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');

    // Find the Admin role
    console.log('🔍 Finding Admin role...');
    const adminRole = await Role.findOne({ slug: 'admin' });
    
    if (!adminRole) {
      console.error('❌ Admin role not found in database!');
      console.log('💡 Please run the seed script first: npm run seed:roles');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found Admin role: ${adminRole.name} (${adminRole._id})\n`);

    // Find all users who are admins but don't have assignedRole set
    console.log('🔍 Finding admin users without assigned role...');
    const adminUsers = await User.find({ 
      role: 'admin', 
    });

    console.log(`✅ Found ${adminUsers.length} admin user(s) without assigned role.\n`);

    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found without assigned role.');
      console.log('✅ All admin users already have roles assigned!\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📋 Found ${adminUsers.length} admin user(s) without assigned role:\n`);
    
    // Display users before update
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.email})`);
      console.log(`   - Current role: ${user.role}`);
      console.log(`   - Current roles array: ${user.roles.join(', ')}`);
      console.log(`   - Assigned Role: ${user.assignedRole || 'None'}`);
      console.log('');
    });

    // Update all admin users
    console.log('📝 Assigning Admin role to all admin users...\n');
    
    const updateResults = [];
    for (const user of adminUsers) {
      try {
        user.assignedRole = adminRole._id;
        
        // Ensure they have admin in their roles array
        if (!user.roles.includes('admin')) {
          user.roles.push('admin');
        }
        
        // Ensure their role field is set to admin
        if (user.role !== 'admin') {
          user.role = 'admin';
        }
        
        await user.save();
        updateResults.push({ success: true, user });
        console.log(`✅ Updated: ${user.fullName} (${user.email})`);
      } catch (error) {
        updateResults.push({ success: false, user, error: error.message });
        console.log(`❌ Failed to update: ${user.fullName} (${user.email}) - ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    const successCount = updateResults.filter(r => r.success).length;
    const failCount = updateResults.filter(r => !r.success).length;
    
    console.log(`Total admin users found: ${adminUsers.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('='.repeat(60) + '\n');

    if (failCount > 0) {
      console.log('❌ Failed updates:');
      updateResults
        .filter(r => !r.success)
        .forEach(({ user, error }) => {
          console.log(`   - ${user.fullName} (${user.email}): ${error}`);
        });
      console.log('');
    }

    console.log('✅ Script completed successfully!\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
assignAdminRoleToExistingAdmins();
