const mongoose = require('mongoose');
const TutorRequest = require('../models/tutorRequest.model');

const dotenv = require('dotenv');
dotenv.config();

const dbUri  = process.env.MONGODB_URI || process.env.CONNECTION_STRING || 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
// const dbUri = process.env.MONGODB_URI;

async function clearAllTutorRequests() {
  await mongoose.connect(dbUri);
  
  console.log('⚠️  WARNING: This will delete ALL tutor requests from the database.');
  console.log('Proceeding in 3 seconds...');
  
  // Give a brief moment to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Delete all tutor requests
  const result = await TutorRequest.deleteMany({});
  
  console.log(`✅ Successfully deleted ${result.deletedCount} tutor request(s).`);
  
  await mongoose.disconnect();
}

clearAllTutorRequests().catch(err => {
  console.error('❌ Error clearing tutor requests:', err);
  process.exit(1);
});
