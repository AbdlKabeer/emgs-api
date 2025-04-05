const Course = require('../models/course.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const Progress = require('../models/progress.model');

const Bookmark = require('../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../utils/custom_response/responses');


// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user ? req.user.id : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = { isPublished: true };
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
          .select('title description category thumbnail isFree price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
    
    // const courses1 = await Course.find(query)
    //   .select('title description category thumbnail isFree price')
    //   .sort({ createdAt: -1 });
    
    // Add progress information if user is authenticated
    if (userId) {
      const progressRecords = await Progress.find({ userId });
      
      const coursesWithProgress = courses.map(course => {
        const courseObj = course.toObject();
        const progressRecord = progressRecords.find(
          p => p.courseId.toString() === course._id.toString()
        );
        
        if (progressRecord) {
          courseObj.progress = progressRecord.progress;
          courseObj.isCompleted = progressRecord.isCompleted;
        } else {
          courseObj.progress = 0;
          courseObj.isCompleted = false;
        }
        
        return courseObj;
      });
      
      return paginationResponse(
          coursesWithProgress, 
          total,
          page,
          limit,
          res
        );
      // return successResponse(coursesWithProgress, res);
    }
    
    return paginationResponse(
      courses, 
      total,
      page,
      limit,
      res
    );
    // return successResponse(courses, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get single course by ID
exports.getCourseById = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    console.log(userId)
    
    const course = await Course.findById(req.params.id)
      .populate('lessons')
      .populate('quizzes');
      // .populate('assignments');
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Add progress information if user is authenticated
    if (userId) {
      const progress = await Progress.findOne({ 
        userId, 
        courseId: req.params.id 
      }).populate('lastAccessedLesson');
      if (progress) {
        const courseObj = course.toObject();
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
        
        return successResponse(courseObj, res);
      }
    }
    
    return successResponse(course, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Create new course (admin only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, isFree, price, isPublished } = req.body;
    
    const course = new Course({
      title,
      description,
      category,
      isFree,
      price,
      createdBy: req.user.id,
      isPublished: isPublished || false,
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

// Delete course (admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
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
      .select('title description category thumbnail isFree price averageRating');
    
    return successResponse(courses, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update course thumbnail
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