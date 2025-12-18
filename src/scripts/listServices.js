const mongoose = require('mongoose');
const Service = require('../models/service.model');
const User = require('../models/user.model');
require('dotenv').config();

const listServicesWithUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Fetch all services with user details
    const services = await Service.find()
      .populate('user', 'fullName email phone role tutorType')
      .sort({ createdAt: -1 });

    if (services.length === 0) {
      console.log('No services found in the database.');
      return;
    }

    console.log(`📋 Total Services: ${services.length}\n`);
    console.log('='.repeat(80));

    services.forEach((service, index) => {
      console.log(`\n${index + 1}. Service: ${service.name}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Price: ${service.price ? `₦${service.price}` : 'N/A'}`);
      console.log(`   Status: ${service.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   WhatsApp: ${service.whatsappContact}`);
      console.log(`   Enrolled Users: ${service.enrolledUsers.length}`);
      
      if (service.user) {
        console.log(`   👤 Assigned User:`);
        console.log(`      - Name: ${service.user.fullName}`);
        console.log(`      - Email: ${service.user.email}`);
        console.log(`      - Phone: ${service.user.phone || 'N/A'}`);
        console.log(`      - Role: ${service.user.role}`);
        console.log(`      - Tutor Type: ${service.user.tutorType || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No user assigned`);
      }
      
      console.log(`   Created: ${service.createdAt.toLocaleDateString()}`);
      console.log('-'.repeat(80));
    });

    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
listServicesWithUsers();
