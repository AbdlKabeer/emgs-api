const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['direct', 'group', 'course', 'support'],
    default: 'direct'
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    muteNotifications: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      mutedUntil: Date
    }]
  }
}, {
  timestamps: true
});


// Indexes for better performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ courseId: 1 });
conversationSchema.index({ type: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
