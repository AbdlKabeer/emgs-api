const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    videoUrl: { type: String },
    audioUrl: { type: String }, // Added for audio lessons
    duration: { type: Number }, // in minutes
    order: { type: Number, required: true }, // position in course
    resources: [{ type: String }], // additional resources for the lesson
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);


const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;