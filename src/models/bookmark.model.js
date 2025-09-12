// const mongoose = require('mongoose');

// const bookmarkSchema = new mongoose.Schema(
//   {
//     userId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'User',
//       required: true 
//     },
//     courseId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'Course',
//       required: true 
//     },
//     createdAt: { 
//       type: Date, 
//       default: Date.now 
//     }
//   },
//   { timestamps: true }
// );

// // Create a compound index to ensure a user can bookmark a course only once
// bookmarkSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
// module.exports = Bookmark;

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    courseId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Course',
      required: true 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { timestamps: true }
);

// Create a compound index to ensure a user can bookmark a course only once
bookmarkSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// ✅ Add the pagination plugin
bookmarkSchema.plugin(mongoosePaginate);

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
module.exports = Bookmark;
