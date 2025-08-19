const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model'); // adjust path as needed

async function addEmgsTutors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const tutorsData = [];

    for (let i = 1; i <= 5; i++) {
      tutorsData.push({
        fullName: `EMGS ${i} Tutor ${i}`,
        email: `emgs${i}.tutor${i}@example.com`,
        password: 'password123',  // you can hash it or let pre-save hook handle it
        phone: `+1000000000${i}`,
        role: 'tutor',
        tutorType: 'emgs',
        isVerified: true,
        bio: `This is the bio of EMGS Tutor ${i}`,
        preferredLanguage: 'English',
        referralPoints: 0,
        referralPointDisbursed: false,
        isEmgsTutor: true,
      });
    }

    // Insert tutors in one go
    const createdTutors = await User.insertMany(tutorsData);
    console.log(`Created ${createdTutors.length} EMGS tutors.`);

    process.exit(0);
  } catch (err) {
    console.error('Error adding EMGS tutors:', err);
    process.exit(1);
  }
}

addEmgsTutors();
