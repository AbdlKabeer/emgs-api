// const mongoose = require('mongoose');
// const Quiz = require('../models/quiz.model');

// const courseSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     category: { 
//       type: String, 
//       enum: ['IELTS', 'CV', 'NCLEX', 'CBT', 'OET', 'OSCE'], 
//       required: true 
//     },
//     thumbnail: { type: String },
//     lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
//     quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
//     assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }],
//     enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//     isFree: { type: Boolean, default: false },
//     price: { type: Number, default: 0 },
//     isPublished: { type: Boolean, default: false },
//     ratings: [{
//       userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//       rating: { type: Number, required: true, min: 1, max: 5 },
//       review: { type: String },
//       createdAt: { type: Date, default: Date.now }
//     }],
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     averageRating: { type: Number, default: 0 },
//   },
//   { timestamps: true }

  
// );






const mongoose = require('mongoose');
const Quiz = require('./quiz.model');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['IELTS', 'CV', 'NCLEX', 'CBT', 'OET', 'OSCE'], 
      required: true 
    },
    thumbnail: { type: String },
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }],
    enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isFree: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    ratings: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      review: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    averageRating: { type: Number, default: 0 },
    
    // New fields for course creation features
    goals: [{ type: String }],
    notes: [{ type: String }],
    benefits: [{ type: String }], // What students will get from the course
    completedCreationSections: [{ type: String }], // Track which sections are complete during creation
    resources: [{
      url: { type: String, required: true },
      title: { type: String },
      description: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

courseSchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) return 0;
  
  const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
  return totalRating / this.ratings.length;
};

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;