const mongoose = require('mongoose');
const TutorRequest = require('../src/models/tutorRequest.model');
const User = require('../src/models/user.model');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI;

async function resetTutorRequestsByEmail(email, requireConfirm = true) {
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

    console.log('📧 User Found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${user.fullName}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Safety confirmation
    if (requireConfirm && process.argv[3] !== 'confirm') {
      console.log('⚠️  This will reset ALL tutor requests for this user to PENDING.');
      console.log('👉 Run again with "confirm" at the end to proceed.');
      console.log(`Example: node script.js ${email} confirm\n`);
      await mongoose.disconnect();
      return;
    }

    // Reset tutor requests
    const updateResult = await TutorRequest.updateMany(
      { user: user._id },
      {
        $set: {
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          rejectionMessage: null
        }
      }
    );

    console.log(`🔄 ${updateResult.modifiedCount} request(s) reset to PENDING.\n`);

    // Fetch updated requests
    const updatedRequests = await TutorRequest.find({ user: user._id })
      .sort({ createdAt: -1 });

    if (updatedRequests.length === 0) {
      console.log('📋 No tutor requests found.\n');
    } else {
      console.log(`📋 Updated Tutor Requests (${updatedRequests.length} total):\n`);

      updatedRequests.forEach((request, index) => {
        console.log(`Request #${index + 1}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Status: ${request.status.toUpperCase()}`);
        console.log(`Request ID: ${request._id}`);
        console.log(`Created At: ${request.createdAt}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      });
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from database.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'crownstephen384@gmail.com';

console.log(`\n🔍 Resetting tutor requests for: ${email}\n`);

resetTutorRequestsByEmail(email).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});