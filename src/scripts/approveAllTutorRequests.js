const mongoose = require('mongoose');
const TutorRequest = require('../models/tutorRequest.model');
const User = require('../models/user.model');
const dbUri = process.env.MONGODB_URI;

async function approveAllTutorRequests() {
  await mongoose.connect(dbUri);
  // Find all pending tutor requests
  const requests = await TutorRequest.find({ status: 'pending' });
  let approvedCount = 0;
  for (const req of requests) {
    // Approve the request
    req.status = 'approved';
    req.rejectionMessage = null;
    await req.save();
    // Update user roles and role
    const user = await User.findById(req.user);
    if (user) {
      if (!user.roles.includes('tutor')) user.roles.push('tutor');
      user.role = 'tutor';
      user.bio = req.bio || user.bio;
      user.preferredLanguage = req.preferredLanguage || user.preferredLanguage;
      await user.save();
      approvedCount++;
    }
  }
  console.log(`Approved and updated ${approvedCount} tutor requests/users.`);
  await mongoose.disconnect();
}

approveAllTutorRequests().catch(err => {
  console.error('Error approving tutor requests:', err);
  process.exit(1);
});
