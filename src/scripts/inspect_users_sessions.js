require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI =  'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
async function main() {
  const uri = MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI environment variable is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const User = require('../models/user.model');

  const users = await User.find({}, {
    fullName: 1,
    email: 1,
    serviceSubscriptions: 1,
    serviceInquiries: 1
  }).lean();

  users.forEach(user => {
    console.log('---');
    console.log('Name:', user.fullName);
    console.log('Email:', user.email);
    console.log('Service Subscriptions:', JSON.stringify(user.serviceSubscriptions, null, 2));
    console.log('Service Inquiries:', JSON.stringify(user.serviceInquiries, null, 2));
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
