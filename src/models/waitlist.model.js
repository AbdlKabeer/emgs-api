const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    interests: {
      type: [String],
      default: [],
    },
    referralSource: {
      type: String,
      trim: true,
    },
    additionalInfo: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'invited', 'registered'],
      default: 'pending',
    },
    invitedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;