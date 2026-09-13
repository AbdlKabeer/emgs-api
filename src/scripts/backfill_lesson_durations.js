const mongoose = require('mongoose');
const Course = require('../models/course.model');

const MONGO_URI = 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function backfillDurations() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses`);

    const promises = courses.map(course => {
      // 50% chance of being one-time, 50% chance of subscription
      const isOneTime = Math.random() > 0.5;

      if (isOneTime) {
        return Course.updateOne(
          { _id: course._id },
          { $set: { paymentType: 'one-time', subscriptionDuration: null } }
        );
      } else {
        const weeksOptions = [4, 6, 8, 12];
        const randomWeeks = weeksOptions[Math.floor(Math.random() * weeksOptions.length)];
        return Course.updateOne(
          { _id: course._id },
          { $set: { subscriptionDuration: randomWeeks, paymentType: 'subscription' } }
        );
      }
    });
    
    await Promise.all(promises);
    console.log(`Successfully updated ${courses.length} courses with random subscription durations in weeks.`);
  } catch (error) {
    console.error('Error backfilling durations:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

backfillDurations();
