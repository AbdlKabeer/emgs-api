const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'], 
      default: 'pending' 
    },
    paymentMethod: { type: String },
    paymentGatewayId: { type: String }, // Transaction ID from payment gateway
    itemType: { type: String, enum: ['course', 'service','oneOnOne','one-on-one'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to course or service
    invoiceNumber: { type: String },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;