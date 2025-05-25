const Course = require('../models/course.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const Progress = require('../models/progress.model');
const Lesson = require('../models/lesson.model');
const Quiz = require('../models/quiz.model');
const Bookmark = require('../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../utils/custom_response/responses');


const mongoose = require('mongoose');

async function clearCompletedCourses() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Remove all completed courses from all users
    const result = await User.updateMany(
      {}, // No filter: update all users
      { $set: { completedCourses: [] } } // Set completedCourses to an empty array
    );

    console.log(`Successfully updated ${result.modifiedCount} users.`);
    process.exit(); // Exit after completion

  } catch (error) {
    console.error('Error clearing completed courses:', error);
    process.exit(1); // Exit on error
  }
}

// clearCompletedCourses();


// // Get all courses
// exports.getAllCourses = async (req, res) => {
//   try {
//     const { category } = req.query;
//     const userId = req.user ? req.user.id : null;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     let query = { isPublished: true };

//     // Filter by category if provided
//     if (category) {
//       query.category = category;
//     }

//     const total = await Course.countDocuments(query);
//     const courses = await Course.find(query)
//       .select('title description category thumbnail isFree price tutorId lessons enrolledUsers ratings averageRating')
//       .populate('createdBy', 'fullName email profilePicture bio')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     // Get bookmarks if user is authenticated
//     let bookmarks = [];
//     if (userId) {
//       bookmarks = await Bookmark.find({ userId }).select('courseId');
//     }


//     return paginationResponse(
//       enhancedCourses,
//       total,
//       page,
//       limit,
//       res
//     );
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };

// exports.getAllCourses = async (req, res) => {
//   try {
//     const { category } = req.query;
//     const userId = req.user ? req.user.id : null;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     let query = { isPublished: true };

//     // Filter by category if provided
//     if (category) {
//       query.category = category;
//     }

//     const total = await Course.countDocuments(query);
//     const courses = await Course.find(query)
//       .select('title description category thumbnail isFree price tutorId lessons enrolledUsers ratings averageRating')
//       .populate('createdBy', 'fullName email profilePicture bio')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     // Get bookmarks if user is authenticated
//     let bookmarks = [];
//     if (userId) {
//       bookmarks = await Bookmark.find({ userId }).select('courseId');
//     }

//     // Get user's completed lessons if authenticated
//     let completedLessons = [];
//     if (userId) {
//       const user = await User.findById(userId).select('completedLessons');
//       completedLessons = user ? user.completedLessons.map(id => id.toString()) : [];
//     }


//     // Add progress and bookmark information if user is authenticated
//     if (userId) {
//       // Check if user is enrolled in the course
//       courseObj.isEnrolled = course.enrolledUsers && 
//         course.enrolledUsers.some(enrolledId => enrolledId.toString() === userId.toString());
      
//       // Get progress information
//       const progress = await Progress.findOne({ 
//         userId, 
//         courseId: req.params.id 
//       }).populate('lastAccessedLesson');

//       if (progress) {
//         courseObj.progress = progress.progress;
//         courseObj.isCompleted = progress.isCompleted;
//         courseObj.lastAccessedLesson = progress.lastAccessedLesson;

//         // Add completion status to lessons
//         if (courseObj.lessons && courseObj.lessons.length > 0) {
//           courseObj.lessons = courseObj.lessons.map(lesson => {
//             lesson.isCompleted = progress.completedLessons.includes(lesson._id);
//             return lesson;
//           });
//         }
//       } else {
//         courseObj.progress = 0;
//         courseObj.isCompleted = false;
//       }
      
//       // Check if course is bookmarked
//       const bookmark = await Bookmark.findOne({ 
//         userId, 
//         courseId: req.params.id 
//       });
      
//       courseObj.isBookmarked = !!bookmark;
//     }


//     // Enhance courses with progress and isCompleted
//     const enhancedCourses = await Promise.all(
//       courses.map(async (course) => {
//         const courseObj = course.toObject();

//         // Add bookmark status
//         courseObj.isBookmarked = bookmarks.some(bookmark => 
//           bookmark.courseId.toString() === course._id.toString()
//         );

//         // Calculate progress and isCompleted
//         if (userId) {
//           // Get total lessons for the course
//           const totalLessons = await Lesson.countDocuments({ 
//             courseId: course._id, 
//             isPublished: true 
//           });

//           // Count completed lessons for this course
//           const completedLessonsForCourse = await Lesson.countDocuments({
//             courseId: course._id,
//             isPublished: true,
//             _id: { $in: completedLessons }
//           });

//           // Calculate progress as a percentage
//           courseObj.progress = totalLessons > 0 
//             ? Math.round((completedLessonsForCourse / totalLessons) * 100) 
//             : 0;

//           // Check if course is completed
//           courseObj.isCompleted = totalLessons > 0 && completedLessonsForCourse === totalLessons;
//         } else {
//           // For unauthenticated users, set progress and isCompleted to default values
//           courseObj.progress = 0;
//           courseObj.isCompleted = false;
//         }

//         return courseObj;
//       })
//     );

//     return paginationResponse(
//       enhancedCourses,
//       total,
//       page,
//       limit,
//       res
//     );
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };

exports.getAllCourses = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user ? req.user.id : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { isPublished: true };
    if (category) query.category = category;

    const total = await Course.countDocuments(query);

    const courses = await Course.find(query)
      .select('title description category thumbnail isFree price tutorId lessons enrolledUsers ratings averageRating')
      .populate('createdBy', 'fullName email profilePicture bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get bookmarks and completed lessons for authenticated user
    let bookmarks = [];
    let completedLessons = [];
    if (userId) {
      const [bookmarkDocs, user] = await Promise.all([
        Bookmark.find({ userId }).select('courseId'),
        User.findById(userId).select('completedLessons'),
      ]);

      bookmarks = bookmarkDocs;
      completedLessons = user?.completedLessons.map(id => id.toString()) || [];
    }

    // Enhance courses
    const enhancedCourses = await Promise.all(
      courses.map(async (course) => {
        const courseObj = course.toObject();

        // Add isBookmarked
        courseObj.isBookmarked = bookmarks.some(bookmark =>
          bookmark.courseId.toString() === course._id.toString()
        );

        // Add isEnrolled
        courseObj.isEnrolled = userId
          ? course.enrolledUsers?.some(id => id.toString() === userId.toString())
          : false;

        // Add progress and isCompleted
        if (userId) {
          const totalLessons = await Lesson.countDocuments({
            courseId: course._id,
            isPublished: true,
          });

          const completedLessonsForCourse = await Lesson.countDocuments({
            courseId: course._id,
            isPublished: true,
            _id: { $in: completedLessons },
          });

          courseObj.progress = totalLessons > 0
            ? Math.round((completedLessonsForCourse / totalLessons) * 100)
            : 0;

          courseObj.isCompleted = totalLessons > 0 &&
            completedLessonsForCourse === totalLessons;
        } else {
          courseObj.progress = 0;
          courseObj.isCompleted = false;
        }

        return courseObj;
      })
    );

    return paginationResponse(enhancedCourses, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Get single course by ID
exports.getCourseById = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    console.log(userId);

    const course = await Course.findById(req.params.id)
      .populate('lessons')
      .populate('quizzes')
      .populate('createdBy', 'fullName email profilePicture bio');

    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Add lesson count to course
    const courseObj = course.toObject();
    courseObj.lessonCount = course.lessons.length;
    
    // Calculate total duration
    courseObj.duration = course.lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
    
    // Add instructor details
    courseObj.instructor = course.tutorId ? {
      fullName: course.tutorId.fullName,
      email: course.tutorId.email,
      profilePicture: course.tutorId.profilePicture
    } : null;
    
    // Add ratings information
    courseObj.averageRating = course.averageRating || 0;
    courseObj.totalRatings = course.ratings ? course.ratings.length : 0;
    
    // Add enrolled students count
    courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

    // Add progress and bookmark information if user is authenticated
    if (userId) {
      // Check if user is enrolled in the course
      courseObj.isEnrolled = course.enrolledUsers && 
        course.enrolledUsers.some(enrolledId => enrolledId.toString() === userId.toString());
      
      // Get progress information
      const progress = await Progress.findOne({ 
        userId, 
        courseId: req.params.id 
      }).populate('lastAccessedLesson');

      if (progress) {
        courseObj.progress = progress.progress;
        courseObj.isCompleted = progress.isCompleted;
        courseObj.lastAccessedLesson = progress.lastAccessedLesson;

        // Add completion status to lessons
        if (courseObj.lessons && courseObj.lessons.length > 0) {
          courseObj.lessons = courseObj.lessons.map(lesson => {
            lesson.isCompleted = progress.completedLessons.includes(lesson._id);
            return lesson;
          });
        }
      } else {
        courseObj.progress = 0;
        courseObj.isCompleted = false;
      }
      
      // Check if course is bookmarked
      const bookmark = await Bookmark.findOne({ 
        userId, 
        courseId: req.params.id 
      });
      
      courseObj.isBookmarked = !!bookmark;
    }


    const quizzes = await Quiz.find({courseId:req.params.id})
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        // Populate the questions array with full question objects
        .populate({
          path: 'questions',
          select: 'question questionType options order correctAnswer booleanAnswer',
          // Remove isCorrect from the options to hide correct answers
          transform: doc => {
            if (doc.options && doc.options.length > 0) {
              doc.options = doc.options.map(option => ({
                _id: option._id,
                option: option.option
                // isCorrect is intentionally omitted
              }));
            }
            return doc;
          }
        });
    
    courseObj.quizzes = quizzes
    return successResponse(courseObj, res);

  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};




// Toggle bookmark (add or remove)
exports.toggleBookmarkNew = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({ userId, courseId });
    
    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      return successResponse({ isBookmarked: false }, res, 200, 'Bookmark removed successfully');
    } else {
      // Add bookmark
      const newBookmark = new Bookmark({
        userId,
        courseId
      });
      
      await newBookmark.save();
      return successResponse({ isBookmarked: true }, res, 200, 'Course bookmarked successfully');
    }
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return badRequestResponse('You have already bookmarked this course', 'BAD_REQUEST', 400, res);
    }
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get user's bookmarked courses
exports.getBookmarkedCoursesNew = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookmarks = await Bookmark.find({ userId })
      .sort({ createdAt: -1 });
    
    const courseIds = bookmarks.map(bookmark => bookmark.courseId);
    
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('title description category thumbnail isFree price tutorId lessons enrolledUsers ratings averageRating')
      .populate('tutorId', 'fullName email profilePicture');
    
    // Map course data with additional information
    const enhancedCourses = await Promise.all(courses.map(async (course) => {
      const courseObj = course.toObject();
      
      // Add lesson count
      courseObj.lessonCount = course.lessons ? course.lessons.length : 0;
      
      // Calculate total duration
      const lessonIds = course.lessons || [];
      const lessonsData = await Lesson.find({ _id: { $in: lessonIds } }).select('duration');
      courseObj.duration = lessonsData.reduce((total, lesson) => total + (lesson.duration || 0), 0);
      
      // Add instructor details
      courseObj.instructor = course.tutorId ? {
        fullName: course.tutorId.fullName,
        email: course.tutorId.email,
        profilePicture: course.tutorId.profilePicture
      } : null;
      
      // Add ratings information
      courseObj.averageRating = course.averageRating || 0;
      courseObj.totalRatings = course.ratings ? course.ratings.length : 0;
      
      // Add enrolled students count
      courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;
      
      // Set bookmarked status
      courseObj.isBookmarked = true;
      
      // Add progress information
      const progressRecord = await Progress.findOne({ 
        userId, 
        courseId: course._id 
      });
      
      if (progressRecord) {
        courseObj.progress = progressRecord.progress;
        courseObj.isCompleted = progressRecord.isCompleted;
      } else {
        courseObj.progress = 0;
        courseObj.isCompleted = false;
      }

      return courseObj;
    }));
    
    return successResponse(enhancedCourses, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Create new course (admin only)
exports.createCourse = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { title, description, category, isFree, price, isPublished , thumbnail, goals, notes } = req.body;
    

    // if (goals && !Array.isArray(goals) || goals.length === 0) {
    //   return badRequestResponse('Valid goals array is required', 'BAD_REQUEST', 400, res);
    // }

    // if (notes && !Array.isArray(notes) || notes.length === 0) {
    //   return badRequestResponse('Valid notes array is required', 'BAD_REQUEST', 400, res);
    // }


    const course = new Course({
      title,
      description,
      category,
      isFree,
      price,
      thumbnail,
      goals: goals || [],
      notes: notes || [],
      createdBy: req.user.id,
      status: 'review'
    });
    
    await course.save();
    
    return successResponse({
      message: 'Course created successfully',
      courseId: course._id
    }, res, 201);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update course (admin only)
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, category, isFree, price, isPublished } = req.body;
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        isFree,
        price,
        isPublished
      },
      { new: true }
    );
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({ course
    }, res,200,'Course updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.publishCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        status: 'published',
        isPublished: true
      },
      { new: true }
    );

    if (!updatedCourse) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({}, res, 200, 'Course published successfully');
    
  } catch (error) {
    console.error('Error publishing course:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Delete course (admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    if (course.isPublished) {
      return badRequestResponse('Cannot delete a published course', 'FORBIDDEN', 403, res);
    }

    await Course.findByIdAndDelete(req.params.id);
    
    return successResponse(null, res,204,'Course deleted successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Enroll user in course
exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is already enrolled
    const user = await User.findById(userId);
    if (user.enrolledCourses.includes(courseId)) {
      return badRequestResponse('User already enrolled in this course', 'BAD_REQUEST', 400, res);
    }
    
    // Check if course is free or payment has been made
    if (!course.isFree) {
      // You would check payment status here
      // For now, just allow enrollment
    }
    
    // Update user and course
    await User.findByIdAndUpdate(
      userId,
      { $push: { enrolledCourses: courseId } }
    );
    
    await Course.findByIdAndUpdate(
      courseId,
      { $push: { enrolledUsers: userId } }
    );
    
    // Create notification
    const notification = new Notification({
      userId,
      title: 'Course Enrollment',
      message: `You have successfully enrolled in ${course.title}`,
      type: 'course',
      relatedItemId: courseId
    });
    
    await notification.save();
    
    return successResponse({ message: 'Enrolled in course successfully' }, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get user's enrolled courses
exports.getUserCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .populate('enrolledCourses');
    
    return successResponse(user.enrolledCourses, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Track course progress
exports.trackProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    
    // Add lesson to completed lessons
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { completedLessons: lessonId } }
    );
    
    return successResponse({}, res,200,'Progress tracked successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Mark Course and All Lessons as Completed
exports.markCourseAndLessonsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params; // Get courseId from URL parameters
    const userId = req.user.id; // Get userId from authenticated user (req.user)

    // Find the course to check if it exists
    const course = await Course.findById(courseId).populate('lessons'); // Assuming 'lessons' is an array of lesson IDs
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Find the user to check if they are enrolled in the course
    const user = await User.findById(userId);

    // Check if user is enrolled in the course
    if (!user.enrolledCourses.includes(courseId)) {
      return badRequestResponse('User must be enrolled in the course to mark it as completed', 'FORBIDDEN', 403, res);
    }

    // Mark all lessons as completed for the user
    const lessonIds = course.lessons.map(lesson => lesson._id); // Get all lesson IDs for the course

    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { completedLessons: { $each: lessonIds } }, // $addToSet ensures lessons aren't added multiple times
        $addToSet: { completedCourses: courseId } // Add course to completed courses
      }
    );

    // Optionally, send a notification or update course completion status here

    return successResponse({}, res, 200, 'Course and lessons marked as completed successfully');
  } catch (error) {
    console.error('Error marking course and lessons as completed:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Mark Lesson as Completed
exports.markLessonCompleted = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    // Find the lesson to check if it exists
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return badRequestResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    // Find the course that the lesson belongs to
    const user = await User.findById(userId);

    // Check if user is enrolled in the course
    if (!user.enrolledCourses.includes(courseId)) {
      return badRequestResponse('User must be enrolled in the course to mark lessons as completed', 'FORBIDDEN', 403, res);
    }

    // Add lesson to completed lessons
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { completedLessons: lessonId } } // $addToSet ensures the lesson isn't added multiple times
    );

    // Optionally, you can check if the course is completed (e.g., if all lessons are completed)

    return successResponse({}, res, 200, 'Lesson marked as completed successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Toggle bookmark (add or remove)
exports.toggleBookmark = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({ userId, courseId });
    
    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      return successResponse({ }, res,200, 'Bookmark removed successfully' );
    } else {
      // Add bookmark
      const newBookmark = new Bookmark({
        userId,
        courseId
      });
      
      await newBookmark.save();
      return successResponse({}, res,200,'Course bookmarked successfully');
    }
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return badRequestResponse('You have already bookmarked this course', 'BAD_REQUEST', 400, res);
    }
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get user's bookmarked courses
exports.getBookmarkedCourses = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    const bookmarks = await Bookmark.find({ userId })
      .sort({ createdAt: -1 });
    
    const courseIds = bookmarks.map(bookmark => bookmark.courseId);
    
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('title description category thumbnail isFree price lessons ratings averageRating')
      .populate('createdBy', 'fullName email profilePicture')
    
    return successResponse(courses, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// exports.getCompletedCourses = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const user = await User.findById(userId)
//       .populate({
//         path: 'completedCourses',
//         populate: { path: 'lessons' }
//       }
//     );

//     if (!user) {
//       return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
//     }

//     if (!user.completedCourses || user.completedCourses.length === 0) {
//       return successResponse([], res, 200, 'No completed courses found');
//     }

//     return successResponse(user.completedCourses, res, 200, 'Completed courses retrieved successfully');
//   } catch (error) {
//     console.error('Error fetching completed courses:', error);
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };


// Update course thumbnail


exports.getCompletedCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('User ID:', userId);
    

    // Check if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return badRequestResponse('Invalid user ID', 'INVALID_ID', 400, res);
    }

    const user = await User.findById(userId)
      .populate({
        path: 'completedCourses',
        populate: { path: 'lessons' }
      });

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    if (!user.completedCourses || user.completedCourses.length === 0) {
      return successResponse([], res, 200, 'No completed courses found');
    }

    return successResponse(user.completedCourses, res, 200, 'Completed courses retrieved successfully');
  } catch (error) {
    console.error('Error fetching completed courses:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.updateCourseThumbnail = async (req, res) => {
  try {
    const { thumbnailUrl } = req.body;
    
    if (!thumbnailUrl) {
      return badRequestResponse('Thumbnail URL is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { thumbnail: thumbnailUrl },
      { new: true }
    );
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({ course }, res, 200, 'Course thumbnail updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Rate a course
exports.rateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return badRequestResponse('Rating must be between 1 and 5', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is enrolled in the course
    if (!course.enrolledUsers.includes(userId)) {
      return badRequestResponse('You must be enrolled in the course to rate it', 'BAD_REQUEST', 400, res);
    }
    
    // Check if user has already rated this course
    const existingRatingIndex = course.ratings.findIndex(r => r.userId.toString() === userId);
    
    if (existingRatingIndex !== -1) {
      // Update existing rating
      course.ratings[existingRatingIndex] = {
        userId,
        rating,
        review: review || course.ratings[existingRatingIndex].review,
        createdAt: new Date()
      };
    } else {
      // Add new rating
      course.ratings.push({
        userId,
        rating,
        review,
        createdAt: new Date()
      });
    }
    
    // Calculate new average rating
    const averageRating = course.calculateAverageRating();
    
    // Update the course's average rating
    course.averageRating = averageRating;
    
    await course.save();
    
    return successResponse({ averageRating: course.averageRating
    }, res,200,'Course rated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId)
      .populate('ratings.userId', 'name profileImage'); // Populate user details
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({
      averageRating: course.averageRating,
      totalRatings: course.ratings.length,
      ratings: course.ratings
    }, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Add video content to a course
exports.addCourseVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { videoUrl, title, description } = req.body;
    
    if (!videoUrl) {
      return badRequestResponse('Video URL is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Create a new lesson with the video
    const newLesson = new Lesson({
      title: title || 'Untitled Video',
      description: description || '',
      courseId: id,
      videoUrl,
      order: course.lessons.length + 1,
      isPublished: true
    });
    
    const savedLesson = await newLesson.save();
    
    // Add the lesson to the course
    course.lessons.push(savedLesson._id);
    await course.save();
    
    return successResponse(
      { lesson: savedLesson },
      res, 
      201, 
      'Video added successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add audio content to a course
exports.addCourseAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { audioUrl, title, description } = req.body;
    
    if (!audioUrl) {
      return badRequestResponse('Audio URL is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Create a new lesson with the audio
    const newLesson = new Lesson({
      title: title || 'Untitled Audio',
      description: description || '',
      courseId: id,
      audioUrl: audioUrl, // You might need to add this field to your Lesson model
      order: course.lessons.length + 1,
      isPublished: true
    });
    
    const savedLesson = await newLesson.save();
    
    // Add the lesson to the course
    course.lessons.push(savedLesson._id);
    await course.save();
    
    return successResponse(
      { lesson: savedLesson },
      res, 
      201, 
      'Audio added successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update course price
exports.updateCoursePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isFree } = req.body;
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Update price related info
    course.isFree = !!isFree;
    if (!isFree && price !== undefined) {
      course.price = price;
    }
    
    // // Add benefits if provided
    // if (benefits && Array.isArray(benefits)) {
    //   course.benefits = benefits;
    // }
    
    await course.save();
    
    return successResponse(
      { course },
      res, 
      200, 
      'Course price updated successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add quiz/questions to a course
exports.addCourseQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return badRequestResponse('Valid questions array is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Create a new quiz
    const newQuiz = new Quiz({
      title: title || 'Untitled Quiz',
      description: description || '',
      courseId: id,
      duration: duration || 30, // Default 30 minutes
      questions: questions.map((q, index) => ({
        question: q.question,
        questionType: q.questionType || 'multiple_choice',
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        order: index + 1,
        marks: q.marks || 1
      }))
    });
    
    const savedQuiz = await newQuiz.save();
    
    // Add the quiz to the course
    course.quizzes.push(savedQuiz._id);
    await course.save();
    
    return successResponse(
      { quiz: savedQuiz },
      res, 
      201, 
      'Quiz added successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add goals to a course
exports.addCourseGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals } = req.body;
    
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return badRequestResponse('Valid goals array is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Add the goals to the course
    course.goals = goals;
    await course.save();
    
    return successResponse(
      { goals: course.goals },
      res, 
      200, 
      'Course goals updated successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add notes to a course
exports.addCourseNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return badRequestResponse('Valid notes array is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Add the notes to the course
    course.notes = notes;
    await course.save();
    
    return successResponse(
      { notes: course.notes },
      res, 
      200, 
      'Course notes updated successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Upload resources/documents to a course
exports.uploadCourseResources = async (req, res) => {
  try {
    const { id } = req.params;
    const { resourceUrls, titles, descriptions } = req.body;
    
    if (!resourceUrls || !Array.isArray(resourceUrls) || resourceUrls.length === 0) {
      return badRequestResponse('Resource URLs are required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Initialize resources array if it doesn't exist
    if (!course.resources) {
      course.resources = [];
    }
    
    // Add new resources
    resourceUrls.forEach((url, index) => {
      course.resources.push({
        url,
        title: titles && titles[index] ? titles[index] : `Resource ${course.resources.length + 1}`,
        description: descriptions && descriptions[index] ? descriptions[index] : '',
        uploadedAt: new Date()
      });
    });
    
    await course.save();
    
    return successResponse(
      { resources: course.resources },
      res, 
      200, 
      'Course resources uploaded successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Save course progress (for tracking completion during creation)
exports.saveCourseProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { completedSections, isComplete } = req.body;
    
    const course = await Course.findById(id);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Update course creation progress
    if (completedSections && Array.isArray(completedSections)) {
      course.completedCreationSections = completedSections;
    }
    
    // Mark course as complete if specified
    if (isComplete === true) {
      course.isPublished = true;
    }
    
    await course.save();
    
    return successResponse(
      { course },
      res, 
      200, 
      'Course progress saved successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};