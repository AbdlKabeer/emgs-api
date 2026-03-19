const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI;

async function getUserByEmail(email) {
  try {
    await mongoose.connect(dbUri);
    console.log('✅ Connected to database...\n');

    // Find user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      await mongoose.disconnect();
      return;
    }

    console.log('👤 User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${user.fullName}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Phone: ${user.phone || 'N/A'}`);
    console.log(`Role: ${user.role}`);
    console.log(`Roles: ${user.roles ? user.roles.join(', ') : 'N/A'}`);
    console.log(`Status: ${user.status}`);
    console.log(`Tutor Type: ${user.tutorType || 'N/A'}`);
    console.log(`Verified: ${user.isVerified ? 'Yes' : 'No'}`);
    console.log(`Bio: ${user.bio || 'N/A'}`);
    console.log(`Profile Picture: ${user.profilePicture || 'N/A'}`);
    console.log(`Preferred Language: ${user.preferredLanguage || 'N/A'}`);
    console.log(`Created At: ${user.createdAt}`);
    console.log(`Updated At: ${user.updatedAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Display full user object as JSON
    console.log('📄 Full User Object (JSON):');
    console.log(JSON.stringify(user, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument, or use default
const email = process.argv[2] || 'crownstephen384@gmail.com';

console.log(`🔍 Searching for user: ${email}\n`);
getUserByEmail(email);
