// const mongoose = require('mongoose');

// const lessonSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   moduleId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Module',
//     required: true
//   },
//   order: {
//     type: Number,
//     required: true
//   },
//   duration: {
//     type: Number, // in minutes
//     default: 0
//   },
//   content: {
//     video: {
//       url: String,
//       duration: Number, // in seconds
//       thumbnail: String
//     },
//     audio: {
//       url: String,
//       duration: Number // in seconds
//     },
//     materials: [{
//       type: {
//         type: String,
//         enum: ['pdf', 'doc', 'image', 'link', 'text']
//       },
//       title: String,
//       url: String,
//       description: String
//     }],
//     textContent: {
//       type: String
//     }
//   },
//   isPublished: {
//     type: Boolean,
//     default: false
//   }
// }, {
//   timestamps: true
// });

// const Lesson = mongoose.model('Lesson', lessonSchema);
// module.exports = Lesson;

const mongoose = require('mongoose');

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

// ✅ Virtual populate: get course from lesson (via module → course)
lessonSchema.virtual('course', {
  ref: 'Course',
  localField: 'moduleId',         // lesson.moduleId
  foreignField: '_id',            // matches Module._id
  justOne: true,
  options: {
    populate: { path: 'courseId' } // this makes it traverse to the course
  }
});

lessonSchema.set('toObject', { virtuals: true });
lessonSchema.set('toJSON', { virtuals: true });

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;
