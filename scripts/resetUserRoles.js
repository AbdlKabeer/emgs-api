// scripts/resetUserRoles.js

const mongoose = require('mongoose');
const User = require('../src/models/user.model'); // Adjust path if needed

const MONGODB_URI = 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017/your-db-name';

async function resetUserRoles(email, newRoles = []) {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  user.roles = newRoles; // or set to default roles, e.g. ['user']
  await user.save();

  console.log(`Roles for ${email} have been reset to:`, user.roles);
  mongoose.disconnect();
}

// Usage: node scripts/resetUserRoles.js user@example.com '["user"]'
const [,, email, rolesJson] = process.argv;
if (!email) {
  console.log('Usage: node scripts/resetUserRoles.js <email> [rolesJson]');
  process.exit(1);
}
const roles = rolesJson ? JSON.parse(rolesJson) : [];

resetUserRoles(email, roles);
