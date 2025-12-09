const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false
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
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },
  preview: {
    type: String,
    default: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  goals: [{ type: String }],
  notes: [{ type: String }],
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
  ratings: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      score: {
        type: Number,
        required: true
      },
      comment: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  aboutCourse: {
    imageVideo: {
      type: String,
      default: ''
    },
    descriptionText: {
      type: String,
      default: ''
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
    }
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

// 🔥 Virtual populate for modules
courseSchema.virtual('modules', {
  ref: 'Module',
  localField: '_id',
  foreignField: 'courseId'
});

// allow virtuals in JSON responses
courseSchema.set('toObject', { virtuals: true });
courseSchema.set('toJSON', { virtuals: true });

courseSchema.methods.calculateAverageRating = function () {
  const totalRatings = this.ratings.length;
  const totalScore = this.ratings.reduce((sum, r) => sum + r.score, 0);
  const average = totalRatings === 0 ? 0 : totalScore / totalRatings;

  this.rating.average = parseFloat(average.toFixed(1));
  this.rating.count = totalRatings;
};


const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
