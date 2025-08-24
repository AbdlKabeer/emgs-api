const mongoose = require('mongoose');
// const Quiz = require('./quiz.model');

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
    
//     // New fields for course creation features
//     goals: [{ type: String }],// What students will get from the course
//     notes: [{ type: String }],
//     completedCreationSections: [{ type: String }], // Track which sections are complete during creation
//     resources: [{
//       url: { type: String, required: true },
//       title: { type: String },
//       description: { type: String },
//       uploadedAt: { type: Date, default: Date.now }
//     }],
//     status: {
//       type: String,
//       enum: ['draft', 'review', 'published'],
//       default: 'draft',
//     }
//   },
//   { timestamps: true }
// );

// courseSchema.methods.calculateAverageRating = function () {
//   if (this.ratings.length === 0) return 0;
  
//   const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
//   return totalRating / this.ratings.length;
// };

// const Course = mongoose.model('Course', courseSchema);
// module.exports = Course;


const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isFree: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return this.isFree || v > 0;
      },
      message: 'Price must be greater than 0 for paid courses'
    }
  },
  thumbnail: {
    type: String,
    default: ''
  },
  preview: {
    type: String,
    default: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  goals: [{
    type: String
  }],
  notes: [{
    type: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'rejected'],
    default: 'draft'
  },
  courseType: {
    type: String,
    enum: ['emgs', 'tutor'],
    default: 'tutor'
  },
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;