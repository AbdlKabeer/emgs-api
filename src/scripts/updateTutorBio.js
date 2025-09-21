const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model'); // Adjust path as needed

const sampleBios = [
  "With a passion for helping students succeed, I specialize in personalized learning methods and academic excellence.",
  "Experienced tutor with a background in language instruction and a dedication to student growth and confidence.",
  "Helping learners achieve their goals with structured sessions and real-world applications.",
  "Enthusiastic educator with a focus on engagement and interactive lessons for better understanding.",
  "I believe every student has potential — I’m here to help unlock it with patience and proven strategies."
];

async function updateTutorBios({ onlyEmgs = false } = {}) {
  try {
    await mongoose.connect('mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017/your-db-name', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
    console.log('Connected to MongoDB ✅');

    const query = { role: 'tutor' };

    const tutors = await User.find(query);

    if (tutors.length === 0) {
      console.log('No tutors found to update.');
      return process.exit(0);
    }

    for (let i = 0; i < tutors.length; i++) {
      const tutor = tutors[i];
      const bioIndex = i % sampleBios.length;

      tutor.bio = sampleBios[bioIndex];
      await tutor.save();

      console.log(`Updated bio for: ${tutor.fullName}`);
    }

    console.log(`✅ Successfully updated bios for ${tutors.length} tutors.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating tutor bios:', err);
    process.exit(1);
  }
}

updateTutorBios({ onlyEmgs: false }); // Set to `true` to target only EMGS tutors
