const mongoose = require('mongoose');
const Service = require('../models/service.model');
const User = require('../models/user.model');
require('dotenv').config();

const updateServicesUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all EMGS tutors
    const emgsTutors = await User.find({ 
      role: 'tutor',
      tutorType: 'emgs'
    }).select('fullName email tutorType');

    if (emgsTutors.length === 0) {
      console.log('❌ No EMGS tutors found in the database.');
      return;
    }

    console.log(`📋 Available EMGS Tutors:\n`);
    emgsTutors.forEach((tutor, index) => {
      console.log(`${index + 1}. ${tutor.fullName} (${tutor.email})`);
    });

    console.log(`\n📝 Distributing services among ${emgsTutors.length} EMGS tutors...\n`);

    // Get all services except the first one
    const allServices = await Service.find().sort({ createdAt: -1 });
    
    if (allServices.length <= 1) {
      console.log('❌ Not enough services to update.');
      return;
    }

    // Skip the first service and update the rest
    const servicesToUpdate = allServices.slice(1);
    
    console.log(`📝 Updating ${servicesToUpdate.length} services...\n`);

    // Distribute services among EMGS tutors in round-robin fashion
    for (let i = 0; i < servicesToUpdate.length; i++) {
      const service = servicesToUpdate[i];
      const selectedTutor = emgsTutors[i % emgsTutors.length];
      
      await Service.findByIdAndUpdate(service._id, {
        user: selectedTutor._id
      });
      console.log(`✅ Updated: ${service.name} → ${selectedTutor.fullName}`);
    }

    console.log(`\n✅ Successfully updated ${servicesToUpdate.length} services!`);
    console.log(`   Services distributed among ${emgsTutors.length} EMGS tutors`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
updateServicesUser();
