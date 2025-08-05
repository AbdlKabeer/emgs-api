const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Enrollment = require('../../models/enrollment.model');
const Module = require('../../models/module.model');
const Progress = require('../../models/progress.model');
const QuizAttempt = require('../../models/quizAttempt.model');
const Bookmark = require('../../models/bookmark.model');
const Quiz = require('../../models/quiz.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../../utils/custom_response/responses');



// exports.getAllCourses = async (req, res) => {
//     try {
//         const { page, limit } = req.query;
//         const options = {
//             page: page ? parseInt(page) : 1,
//             limit: limit ? parseInt(limit) : 10,
//             sort: { createdAt: -1 },
//             populate: ['user', 'category']
//         };
//         const courses = await Course.paginate({}, options);
//         return paginationResponse(res, courses, 'courses');
//     } catch (error) {
//             return errorResponse(res, error.message, 500);
//     }
    
// };

// exports.getCoursesByPrice = async (req, res) => {
//     try {
//         const { minPrice, maxPrice } = req.query;
//         const options = {
//             sort: { createdAt: -1 },
//             populate: ['user', 'category']
//             };
//         const courses = await Course.find({
//                 price: { $gte: minPrice, $lte: maxPrice }
//                 }).populate(options);
//         return successResponse(res, courses, 'courses');
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.getCourse = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const course = await Course.findById(id).populate('user', 'name').populate('category',
//             'name').populate('lessons').populate('quizzes').populate('bookmarks');
//         if (!course) {
//                 return badRequestResponse(res, 'Course not found', 404);
//         }
//         return successResponse(res, course, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.getCourseModules = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const course = await Course.findById(id).populate('lessons').populate('quizzes');
//         if (!course) {
//             return badRequestResponse(res, 'Course not found', 404);
//         }
//         return successResponse(res, course, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.getLessonQuizzes = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const lesson = await Lesson.findById(id).populate('quizzes');
//         if (!lesson) {
//             return badRequestResponse(res, 'Lesson not found', 404);
//         }
//         return successResponse(res, lesson, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.getUserBookmarks = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const user = await User.findById(id).populate('bookmarks');
//         if (!user) {
//             return badRequestResponse(res, 'User not found', 404);
//             }
//             return successResponse(res, user.bookmarks, 200);
//             } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.bookmarkCourse = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const user = await User.findById(id);
//         if (!user) {
//             return badRequestResponse(res, 'User not found', 404);
//         }
//         const course = await Course.findById(req.body.courseId);
//         if (!course) {
//             return badRequestResponse(res, 'Course not found', 404);
//         }
//         user.bookmarks.push(course);
//         await user.save();
//         return successResponse(res, user.bookmarks, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };

// exports.reviewCourse = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const user = await User.findById(id);
//         if (!user) {
//             return badRequestResponse(res, 'User not found', 404);
//         }
//         const course = await Course.findById(req.body.courseId);
//         if (!course) {
//             return badRequestResponse(res, 'Course not found', 404);
//         }
//         const review = await Review.findOne({ user: user._id, course: course._id });
//         if (review) {
//             return badRequestResponse(res, 'You have already reviewed this course', 400);
//         }
//         const newReview = new Review({
//             user: user._id,
//             course: course._id,
//             rating: req.body.rating,
//             review: req.body.review
//             });
//         await newReview.save();
//         return successResponse(res, newReview, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };


// exports.getAllCourseReviews = async (req, res) => {
//     try {
//         const page = req.query.page;
//         const limit = req.query.limit;
//         const course = await Course.findById(req.params.id);
//         if (!course) {
//             return badRequestResponse(res, 'Course not found', 404);
//             }
//             const reviews = await Review.paginate({ course: course._id }, { page, limit });

//         return successResponse(res, reviews, 200);
//     } catch (error) {
//         return errorResponse(res, error.message, 500);
//     }
// };









// Get All Published Courses (Browse/Search)
exports.getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      isFree, 
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { 
      isPublished: true, 
      status: 'published' 
    };

    // Add filters
    if (category) query.category = category;
    if (isFree !== undefined) query.isFree = isFree === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: {
        path: 'createdBy',
        select: 'firstName lastName profilePicture'
      }
    };

    const courses = await Course.paginate(query, options);

    // Add enrollment count and rating for each course
    const coursesWithStats = await Promise.all(
      courses.docs.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({ courseId: course._id });
        const lessonCount = await Lesson.countDocuments({ courseId: course._id });
        
        return {
          ...course.toObject(),
          enrollmentCount,
          lessonCount,
          // You can add average rating here if you have a rating system
          averageRating: 0 // Placeholder
        };
      })
    );

    return paginationResponse({
      docs: coursesWithStats,
      totalDocs: courses.totalDocs,
      limit: courses.limit,
      page: courses.page,
      totalPages: courses.totalPages,
      hasNextPage: courses.hasNextPage,
      hasPrevPage: courses.hasPrevPage
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Course Details (for non-enrolled students)
exports.getCoursePreview = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ 
      _id: courseId, 
      isPublished: true, 
      status: 'published' 
    }).populate('createdBy', 'firstName lastName profilePicture bio');

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Get course structure (lessons and modules without content)
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
    const lessonIds = lessons.map(lesson => lesson._id);
    const modules = await Module.find({ lessonId: { $in: lessonIds } })
      .select('title description lessonId order')
      .sort({ order: 1 });

    const enrollmentCount = await Enrollment.countDocuments({ courseId });
    
    // Structure lessons with modules
    const structuredLessons = lessons.map(lesson => {
      const lessonModules = modules.filter(module => 
        module.lessonId.toString() === lesson._id.toString()
      );
      return {
        ...lesson.toObject(),
        modules: lessonModules
      };
    });

    return successResponse({
      course: {
        ...course.toObject(),
        lessons: structuredLessons,
        enrollmentCount
      }
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Enroll in Course
exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findOne({ 
      _id: courseId, 
      isPublished: true, 
      status: 'published' 
    });

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ 
      userId, 
      courseId 
    });

    if (existingEnrollment) {
      return errorResponse('Already enrolled in this course', 'ALREADY_ENROLLED', 400, res);
    }

    // For paid courses, you might want to check payment here
    if (!course.isFree) {
      // Payment verification logic would go here
      // For now, we'll assume payment is handled elsewhere
    }

    const enrollment = new Enrollment({
      userId,
      courseId,
      enrolledAt: new Date(),
      status: 'active'
    });

    await enrollment.save();

    return successResponse({
      message: 'Successfully enrolled in course',
      enrollment
    }, res, 201);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Student's Enrolled Courses
exports.getMyEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: {
        path: 'courseId',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      },
      sort: { enrolledAt: -1 }
    };

    const enrollments = await Enrollment.paginate(query, options);

    // Add progress information
    const enrollmentsWithProgress = await Promise.all(
      enrollments.docs.map(async (enrollment) => {
        const progress = await Progress.findOne({ 
          userId, 
          courseId: enrollment.courseId._id 
        });

        return {
          ...enrollment.toObject(),
          progress: progress ? progress.progressPercentage : 0,
          lastAccessed: progress ? progress.lastAccessed : enrollment.enrolledAt
        };
      })
    );

    return paginationResponse({
      docs: enrollmentsWithProgress,
      totalDocs: enrollments.totalDocs,
      limit: enrollments.limit,
      page: enrollments.page,
      totalPages: enrollments.totalPages,
      hasNextPage: enrollments.hasNextPage,
      hasPrevPage: enrollments.hasPrevPage
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Enrolled Course Content
exports.getEnrolledCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      userId, 
      courseId, 
      status: 'active' 
    });

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 'NOT_ENROLLED', 403, res);
    }

    const course = await Course.findById(courseId)
      .populate('createdBy', 'firstName lastName profilePicture');

    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
    const lessonIds = lessons.map(lesson => lesson._id);

    const modules = await Module.find({ lessonId: { $in: lessonIds } }).sort({ order: 1 });
    const moduleIds = modules.map(module => module._id);

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } });

    // Get user progress
    const progress = await Progress.findOne({ userId, courseId }) || {
      completedModules: [],
      completedQuizzes: [],
      progressPercentage: 0
    };

    // Structure the data with progress information
    const structuredLessons = lessons.map(lesson => {
      const lessonModules = modules.filter(module => 
        module.lessonId.toString() === lesson._id.toString()
      ).map(module => {
        const moduleQuizzes = quizzes.filter(quiz => 
          quiz.moduleId.toString() === module._id.toString()
        ).map(quiz => ({
          ...quiz.toObject(),
          isCompleted: progress.completedQuizzes.includes(quiz._id.toString())
        }));

        return {
          ...module.toObject(),
          quizzes: moduleQuizzes,
          isCompleted: progress.completedModules.includes(module._id.toString())
        };
      });

      return {
        ...lesson.toObject(),
        modules: lessonModules
      };
    });

    // Update last accessed
    await Progress.findOneAndUpdate(
      { userId, courseId },
      { 
        userId, 
        courseId, 
        lastAccessed: new Date() 
      },
      { upsert: true }
    );

    return successResponse({
      course: {
        ...course.toObject(),
        lessons: structuredLessons
      },
      progress: progress.progressPercentage || 0
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Mark Module as Complete
exports.markModuleComplete = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;

    const module = await Module.findById(moduleId)
      .populate({
        path: 'lessonId',
        populate: { path: 'courseId' }
      });

    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    const courseId = module.lessonId.courseId._id;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      userId, 
      courseId, 
      status: 'active' 
    });

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 'NOT_ENROLLED', 403, res);
    }

    // Update progress
    let progress = await Progress.findOne({ userId, courseId });
    
    if (!progress) {
      progress = new Progress({
        userId,
        courseId,
        completedModules: [],
        completedQuizzes: [],
        progressPercentage: 0
      });
    }

    if (!progress.completedModules.includes(moduleId)) {
      progress.completedModules.push(moduleId);
      
      // Calculate progress percentage
      const totalModules = await Module.countDocuments({ 
        lessonId: { $in: await Lesson.find({ courseId }).select('_id') }
      });
      
      progress.progressPercentage = Math.round((progress.completedModules.length / totalModules) * 100);
      progress.lastAccessed = new Date();
      
      await progress.save();
    }

    return successResponse({
      message: 'Module marked as complete',
      progressPercentage: progress.progressPercentage
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Take Quiz
exports.takeQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId)
      .populate({
        path: 'moduleId',
        populate: {
          path: 'lessonId',
          populate: { path: 'courseId' }
        }
      });

    if (!quiz) {
      return errorResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }

    const courseId = quiz.moduleId.lessonId.courseId._id;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      userId, 
      courseId, 
      status: 'active' 
    });

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 'NOT_ENROLLED', 403, res);
    }

    // Return quiz without correct answers
    const quizForStudent = {
      ...quiz.toObject(),
      questions: quiz.questions.map(q => ({
        _id: q._id,
        question: q.question,
        type: q.type,
        options: q.options,
        points: q.points
        // Exclude correctAnswer and explanation
      }))
    };

    return successResponse({
      quiz: quizForStudent
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Submit Quiz
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId)
      .populate({
        path: 'moduleId',
        populate: {
          path: 'lessonId',
          populate: { path: 'courseId' }
        }
      });

    if (!quiz) {
      return errorResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }

    const courseId = quiz.moduleId.lessonId.courseId._id;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ 
      userId, 
      courseId, 
      status: 'active' 
    });

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 'NOT_ENROLLED', 403, res);
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const results = quiz.questions.map(question => {
      const userAnswer = answers[question._id.toString()];
      const isCorrect = userAnswer === question.correctAnswer;
      
      totalPoints += question.points;
      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question.points;
      }

      return {
        questionId: question._id,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        points: question.points,
        earnedPoints: isCorrect ? question.points : 0
      };
    });

    const scorePercentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = scorePercentage >= (quiz.passingScore || 70);

    // Save quiz attempt
    const quizAttempt = new QuizAttempt({
      userId,
      quizId,
      answers,
      score: scorePercentage,
      passed,
      completedAt: new Date(),
      results
    });

    await quizAttempt.save();

    // Update progress if passed
    if (passed) {
      let progress = await Progress.findOne({ userId, courseId });
      
      if (!progress) {
        progress = new Progress({
          userId,
          courseId,
          completedModules: [],
          completedQuizzes: [],
          progressPercentage: 0
        });
      }

      if (!progress.completedQuizzes.includes(quizId)) {
        progress.completedQuizzes.push(quizId);
        progress.lastAccessed = new Date();
        await progress.save();
      }
    }

    return successResponse({
      message: passed ? 'Quiz completed successfully!' : 'Quiz completed, but passing score not achieved',
      results: {
        score: scorePercentage,
        passed,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        earnedPoints,
        totalPoints,
        passingScore: quiz.passingScore || 70,
        questions: results
      }
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Quiz Attempts
exports.getQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const attempts = await QuizAttempt.find({ 
      userId, 
      quizId 
    }).sort({ completedAt: -1 });

    return successResponse({
      attempts
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Bookmark Course
exports.toggleBookmark = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const existingBookmark = await Bookmark.findOne({ userId, courseId });

    if (existingBookmark) {
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      return successResponse({
        message: 'Course removed from bookmarks',
        bookmarked: false
      }, res, 200);
    } else {
      const bookmark = new Bookmark({ userId, courseId });
      await bookmark.save();
      return successResponse({
        message: 'Course bookmarked successfully',
        bookmarked: true
      }, res, 201);
    }
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Bookmarked Courses
exports.getBookmarkedCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: {
        path: 'courseId',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      },
      sort: { createdAt: -1 }
    };

    const bookmarks = await Bookmark.paginate({ userId }, options);

    return paginationResponse({
      docs: bookmarks.docs,
      totalDocs: bookmarks.totalDocs,
      limit: bookmarks.limit,
      page: bookmarks.page,
      totalPages: bookmarks.totalPages,
      hasNextPage: bookmarks.hasNextPage,
      hasPrevPage: bookmarks.hasPrevPage
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Student Dashboard Data
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get enrolled courses count
    const enrolledCoursesCount = await Enrollment.countDocuments({ 
      userId, 
      status: 'active' 
    });

    // Get completed courses count
    const completedCoursesCount = await Progress.countDocuments({ 
      userId, 
      progressPercentage: 100 
    });

    // Get recent enrollments with progress
    const recentEnrollments = await Enrollment.find({ userId, status: 'active' })
      .populate('courseId', 'title thumbnail')
      .sort({ enrolledAt: -1 })
      .limit(5);

    const enrollmentsWithProgress = await Promise.all(
      recentEnrollments.map(async (enrollment) => {
        const progress = await Progress.findOne({ 
          userId, 
          courseId: enrollment.courseId._id 
        });
        return {
          ...enrollment.toObject(),
          progress: progress ? progress.progressPercentage : 0
        };
      })
    );

    // Get recent quiz attempts
    const recentQuizAttempts = await QuizAttempt.find({ userId })
      .populate({
        path: 'quizId',
        populate: {
          path: 'moduleId',
          populate: {
            path: 'lessonId',
            populate: { 
              path: 'courseId',
              select: 'title'
            }
          }
        }
      })
      .sort({ completedAt: -1 })
      .limit(5);

    return successResponse({
      dashboard: {
        stats: {
          enrolledCoursesCount,
          completedCoursesCount,
          bookmarksCount: await Bookmark.countDocuments({ userId })
        },
        recentEnrollments: enrollmentsWithProgress,
        recentQuizAttempts
      }
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};