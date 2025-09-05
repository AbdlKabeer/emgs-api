const mongoose = require('mongoose');

const Service = require('../models/service.model');


// Replace with your actual MongoDB connection string
const MONGODB_URI = 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Change to your URI
const USER_ID = '67e058a0d9592e9ccb95af9f';

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB ✅');

    const result = await Service.updateMany({}, { user: USER_ID });

    console.log(`✅ Updated ${result.modifiedCount} services with user ${USER_ID}`);
  } catch (error) {
    console.error('❌ Error updating services:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB 🔌');
  }
})();
