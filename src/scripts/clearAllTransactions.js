require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const dbUri = process.env.MONGODB_URI;

async function clearAllTransactions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    // Count existing transactions
    const count = await Transaction.countDocuments();
    console.log(`📊 Found ${count} transaction(s) in the database`);

    if (count === 0) {
      console.log('ℹ️  No transactions to delete');
      await mongoose.disconnect();
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL transactions!');
    console.log('🗑️  Deleting all transactions...\n');

    // Delete all transactions
    const result = await Transaction.deleteMany({});

    console.log('='.repeat(60));
    console.log('✅ SUCCESS! All transactions deleted');
    console.log('='.repeat(60));
    console.log(`Deleted: ${result.deletedCount} transaction(s)`);
    console.log('='.repeat(60));
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error clearing transactions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearAllTransactions().catch(err => {
  console.error('Error clearing transactions:', err);
  process.exit(1);
});
