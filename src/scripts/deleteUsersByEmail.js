// scripts/deleteUsersByEmail.js
// Usage: node scripts/deleteUsersByEmail.js email1@example.com,email2@example.com

const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function deleteUsersByEmails(emails) {
  if (!emails || emails.length === 0) {
    console.error('Please provide at least one email.');
    process.exit(1);
  }

  await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to database...\n');

  const result = await User.deleteMany({ email: { $in: emails } });
  console.log(`🗑️  Deleted ${result.deletedCount} user(s) with emails: ${emails.join(', ')}`);

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from database.');
}

// Get emails from command line argument (comma-separated)
const emailsArg = process.argv[2];
if (!emailsArg) {
  console.error('Usage: node scripts/deleteUsersByEmail.js email1@example.com,email2@example.com');
  process.exit(1);
}
const emails = emailsArg.split(',').map(e => e.trim()).filter(Boolean);

deleteUsersByEmails(emails).catch(err => {
  console.error('Error deleting users:', err);
  process.exit(1);
});
