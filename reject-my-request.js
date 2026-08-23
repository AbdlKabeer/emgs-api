require('dotenv').config();
const mongoose = require('mongoose');
const TutorRequest = require('./src/models/tutorRequest.model');
const Notification = require('./src/models/notification.model');
const User = require('./src/models/user.model');

async function rejectMyRequest() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI environment variable.');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database.');

    const email = 'programmerolakay+10@gmail.com'; // Extracted from your screenshot
    
    // Find User
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return;
    }
    
    console.log(`Found user: ${user._id}`);

    // Find and update the TutorRequest
    const request = await TutorRequest.findOne({ user: user._id, status: 'pending' }).sort({ createdAt: -1 });
    
    if (!request) {
      console.log('No pending tutor request found for this user.');
      return;
    }

    request.status = 'rejected';
    request.rejectionMessage = 'Your experience does not meet our minimum requirements (Test Rejection).';
    request.reviewedAt = new Date();
    await request.save();
    
    console.log('Tutor request successfully set to REJECTED.');

    // Create Notification
    const notification = new Notification({
      user: user._id,
      title: 'Tutor Application Update',
      message: `Your application to become a tutor was not approved. Reason: ${request.rejectionMessage}`,
      type: 'account',
      read: false
    });
    await notification.save();
    console.log('Notification successfully created.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

rejectMyRequest();
