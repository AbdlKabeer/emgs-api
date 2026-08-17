require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'programmerolakay+11@gmail.com' });
    if (user) {
      console.log('User found:');
      console.log('Email:', user.email);
      console.log('Role (legacy):', user.role);
      console.log('Roles array:', user.roles);
    } else {
      console.log('User not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUser();
