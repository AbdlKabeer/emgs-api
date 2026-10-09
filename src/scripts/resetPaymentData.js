/**
 * Pre-launch cleanup for the move to credits. Wipes payment history, wallet transactions,
 * withdrawals, recurring subscriptions and resets NGN wallet balances. Course/service ENROLMENTS
 * ARE KEPT. Dry-run by default.
 *
 *   node src/scripts/resetPaymentData.js            # dry run: shows counts and target database
 *   node src/scripts/resetPaymentData.js --confirm  # backs up to backend/backups/, then deletes
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Payment = require('../models/payment.model');
const Transaction = require('../models/transaction.model');
const Withdrawal = require('../models/withdrawal.model');
const Subscription = require('../models/subscription.model');
const Wallet = require('../models/wallet.model');

(async () => {
  const confirm = process.argv.includes('--confirm');
  await mongoose.connect(process.env.MONGODB_URI);
  const host = mongoose.connection.host;
  console.log(`Database host: ${host}  name: ${mongoose.connection.name}`);

  const counts = {
    payments: await Payment.countDocuments(),
    transactions: await Transaction.countDocuments(),
    withdrawals: await Withdrawal.countDocuments(),
    subscriptions: await Subscription.countDocuments(),
    wallets: await Wallet.countDocuments(),
  };
  console.log('Would affect:', counts);

  if (!confirm) {
    console.log('Dry run only. Re-run with --confirm to back up and delete.');
    return mongoose.disconnect();
  }

  const dir = path.join(__dirname, '..', '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `payment-reset-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const backup = {
    payments: await Payment.find().lean(),
    transactions: await Transaction.find().lean(),
    withdrawals: await Withdrawal.find().lean(),
    subscriptions: await Subscription.find().lean(),
    wallets: await Wallet.find().lean(),
  };
  fs.writeFileSync(file, JSON.stringify(backup));
  console.log(`Backup written: ${file}`);

  await Payment.deleteMany({});
  await Transaction.deleteMany({});
  await Withdrawal.deleteMany({});
  await Subscription.deleteMany({});
  await Wallet.updateMany({}, { $set: { balance: 0, earned: 0, withdrawn: 0 } });
  console.log('Done. Enrolments untouched.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
