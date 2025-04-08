const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true
    },
    description: { 
      type: String, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'in-progress', 'resolved'], 
      default: 'pending' 
    },
    assignedTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null // Nullable for non-logged in users
    },
    // Additional fields for internal tracking
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    responseDetails: [{
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: { type: String },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

const Support = mongoose.model('Support', supportSchema);

module.exports = Support;