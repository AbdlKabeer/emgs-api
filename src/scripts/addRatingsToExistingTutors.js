const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model'); // Adjust path if needed

async function addRatingsToExistingTutors() {
  try {
    await mongoose.connect('mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017/your-db-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all users who can rate (you can filter further if needed)
    const ratingUsers = await User.find({ role: 'user' });

    if (ratingUsers.length < 5) {
      throw new Error('⚠️ Not enough users in the DB to generate ratings. Add more users first.');
    }

    // Get all tutors you want to add ratings to (you can limit or filter by type)
    const tutors = await User.find({ role: 'tutor', tutorType: 'partner' }); // Or remove tutorType filter if not needed

    console.log(`🔍 Found ${tutors.length} tutors to rate`);

    for (const tutor of tutors) {
      // Generate 3–5 ratings from random users
      const numRatings = Math.floor(Math.random() * 3) + 3; // 3–5
      const selectedUsers = ratingUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, numRatings);

      const newRatings = selectedUsers.map((user, index) => {
        const ratingValue = Math.floor(Math.random() * 3) + 3; // 3 to 5
        return {
          userId: user._id,
          rating: ratingValue,
          review: `Auto-generated review ${index + 1} by ${user.fullName}`,
          createdAt: new Date()
        };
      });

      // Combine existing ratings with new ones
      tutor.ratings = [...(tutor.ratings || []), ...newRatings];

      // Recalculate average rating
      const allRatings = tutor.ratings;
      const averageRating =
        allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

      tutor.averageRating = parseFloat(averageRating.toFixed(1));

      await tutor.save();
      console.log(`✅ Updated ${tutor.fullName} with ${newRatings.length} new ratings`);
    }

    console.log('🎉 All tutors updated with ratings!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding ratings to tutors:', err);
    process.exit(1);
  }
}

addRatingsToExistingTutors();
