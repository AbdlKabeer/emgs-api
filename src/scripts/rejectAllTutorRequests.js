const mongoose = require('mongoose');
const TutorRequest = require('../models/tutorRequest.model');
const dbUri = process.env.MONGODB_URI ;

async function rejectAllTutorRequests() {
  await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await TutorRequest.updateMany(
    { status: 'pending' },
    { $set: { status: 'rejected', rejectionMessage: 'Rejected by admin (bulk operation)' } }
  );
  console.log(`Rejected ${result.modifiedCount} tutor requests.`);
  await mongoose.disconnect();
}

rejectAllTutorRequests().catch(err => {
  console.error('Error rejecting tutor requests:', err);
  process.exit(1);
});
