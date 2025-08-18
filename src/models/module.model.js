const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  content: {
    video: {
      url: String,
      duration: Number, // in seconds
      thumbnail: String
    },
    audio: {
      url: String,
      duration: Number // in seconds
    },
    materials: [{
      type: {
        type: String,
        enum: ['pdf', 'doc', 'image', 'link', 'text']
      },
      title: String,
      url: String,
      description: String
    }],
    textContent: {
      type: String
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Module = mongoose.model('Module', moduleSchema);
module.exports = Module;