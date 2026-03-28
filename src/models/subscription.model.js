const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    serviceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Service', 
      required: true 
    },
    plan: {
      interval: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], 
        required: true 
      },
      amount: { type: Number, required: true },
      currency: { type: String, default: 'NGN' }
    },
    status: { 
      type: String, 
      enum: ['active', 'cancelled', 'paused', 'expired', 'failed'], 
      default: 'active',
      index: true
    },
    paymentMethod: {
      type: { type: String, enum: ['card', 'bank_account', 'wallet'] },
      authorizationCode: { type: String }, // For Paystack recurring charges
      cardLast4: { type: String },
      cardBrand: { type: String },
      bank: { type: String }
    },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date, required: true },
    lastBillingDate: { type: Date },
    endDate: { type: Date }, // For cancelled subscriptions
    trialEndDate: { type: Date }, // Optional trial period
    paystackSubscriptionCode: { type: String }, // Paystack subscription reference
    paystackCustomerCode: { type: String }, // Paystack customer reference
    billingHistory: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Payment' 
    }],
    failedPaymentAttempts: { type: Number, default: 0 },
    cancelReason: { type: String },
    metadata: {
      autoRenew: { type: Boolean, default: true },
      sendReminders: { type: Boolean, default: true },
      reminderDaysBefore: { type: Number, default: 3 }
    }
  },
  { timestamps: true }
);

// Index for efficient queries
subscriptionSchema.index({ userId: 1, serviceId: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, status: 1 });

// Method to calculate next billing date
subscriptionSchema.methods.calculateNextBillingDate = function() {
  const current = this.nextBillingDate || new Date();
  const next = new Date(current);
  
  switch(this.plan.interval) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  
  return next;
};

// Method to check if subscription is due for billing
subscriptionSchema.methods.isDueForBilling = function() {
  return this.status === 'active' && 
         this.nextBillingDate && 
         new Date() >= this.nextBillingDate;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
