const mongoose = require('mongoose');

// const lessonSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     description: { type: String },
//     courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
//     videoUrl: { type: String },
//     audioUrl: { type: String }, // Added for audio lessons
//     duration: { type: Number }, // in minutes
//     order: { type: Number, required: true }, // position in course
//     resources: [{ type: String }], // additional resources for the lesson
//     isPublished: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );


// const Lesson = mongoose.model('Lesson', lessonSchema);
// module.exports = Lesson;


const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
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

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;