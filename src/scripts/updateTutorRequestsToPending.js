const mongoose = require('mongoose');
const TutorRequest = require('../models/tutorRequest.model');
const User = require('../models/user.model');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI;

async function updateTutorRequestsToPending(email) {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to database...\n');

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

    // Find all tutor requests for this user
    const tutorRequests = await TutorRequest.find({ user: user._id });

    if (tutorRequests.length === 0) {
      console.log('📋 No tutor requests found for this user.\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Found ${tutorRequests.length} tutor request(s)\n`);
    console.log('🔄 Updating all requests to PENDING status...\n');

    let updatedCount = 0;
    const updates = [];

    for (const request of tutorRequests) {
      const oldStatus = request.status;
      
      // Update to pending
      request.status = 'pending';
      request.rejectionMessage = null; // Clear rejection message
      request.reviewedBy = null; // Clear reviewer
      request.reviewedAt = null; // Clear review date
      
      await request.save();
      updatedCount++;

      updates.push({
        requestId: request._id,
        oldStatus: oldStatus,
        newStatus: 'pending',
        name: request.fullName,
        email: request.email
      });

      console.log(`✅ Updated Request #${updatedCount}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Request ID: ${request._id}`);
      console.log(`Name: ${request.fullName}`);
      console.log(`Old Status: ${oldStatus.toUpperCase()}`);
      console.log(`New Status: PENDING`);
      console.log(`Cleared: Rejection Message, Reviewer, Review Date`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Summary
    console.log('📊 Update Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Requests Updated: ${updatedCount}`);
    console.log(`All requests are now: PENDING ⏳`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from database.');
    console.log('✅ All tutor requests have been updated to PENDING status.\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'crownstephen384@gmail.com';

console.log(`\n🔄 Updating tutor requests to PENDING for: ${email}\n`);

updateTutorRequestsToPending(email).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
