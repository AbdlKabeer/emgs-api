const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['course_purchase', 'withdrawal', 'platform_fee', 'earnings'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed'], 
      default: 'pending' 
    },
    reference: { type: String },
    metadata: {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
      bankName: { type: String },
      accountNumber: { type: String },
      accountName: { type: String },
    },
    description: { type: String },
  },
  { timestamps: true }
);

// Generate transaction ID with prefix
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `TXN-WD${Math.floor(100000 + Math.random() * 900000)}`;
  }
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
