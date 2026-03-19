// scripts/createAdminUser.js
// Script to create an admin user in the database
// Usage: node scripts/createAdminUser.js <email> <password>

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const config = require('../config/email.config'); // adjust if you have a db config

const MONGO_URI =  'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminUser(email, password) {
  if (!email || !password) {
    console.error('Usage: node scripts/createAdminUser.js <email> <password>');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const existing = await User.findOne({ email });
  if (existing) {
    console.error('User with this email already exists.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const adminUser = new User({
    fullName: 'Admin User',
    email,
    password: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    // add other required fields if needed
  });

  await adminUser.save();
  console.log('Admin user created:', email);
  await mongoose.disconnect();
}

const [,, email, password] = process.argv;
createAdminUser(email, password).catch(err => {
  console.error('Error creating admin user:', err);
  process.exit(1);
});
