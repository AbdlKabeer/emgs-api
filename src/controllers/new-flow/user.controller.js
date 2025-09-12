const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Enrollment = require('../../models/enrollment.model');
const Module = require('../../models/module.model');
const Progress = require('../../models/progress.model');
const QuizAttempt = require('../../models/quizAttempt.model');
const Bookmark = require('../../models/bookmark.model');
const User = require('../../models/user.model');
const Quiz = require('../../models/quiz.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse, internalServerErrorResponse } = require('../../utils/custom_response/responses');




// exports.getAllCourses1 = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       category,
//       search,
//       isFree,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//       courseType = ''
//     } = req.query;

//     const query = {
//       // isPublished: true,
//       // status: 'published'
//     };

//     const skip = (page - 1) * limit;

//     // Add filters
//     if (category) query.category = category;
//     if (courseType) query.courseType = courseType;
//     if (isFree !== undefined) query.isFree = isFree === 'true';
//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const sortOptions = {};
//     sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;


//     console.log(query)
    
//     const total = await Course.countDocuments(query);

//     let courses = await Course.find(query)
//       .populate({
//         path: 'createdBy',
//         select: 'firstName lastName profilePicture'
//       })
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(parseInt(limit));

//     // Add enrollment count and lesson count for each course
//     const formattedCourses = await Promise.all(
//       courses.map(async (course) => {
//         const enrollmentCount = await Enrollment.countDocuments({ courseId: course._id });
//         const lessonCount = await Lesson.countDocuments({ courseId: course._id });
//         return {
//           id: course._id,
//           ...course.toObject(),
//           enrollmentCount,
//           lessonCount,
//           averageRating: 0 // Placeholder
//         };
//       })
//     );

//     return paginationResponse(formattedCourses, total, parseInt(page), parseInt(limit), res);
//   } catch (error) {
//     console.log(error)
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };

// exports.getAllCourses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       category,
//       search,
//       isFree,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//       courseType = 'tutor'
//     } = req.query;
//     const userId = req.user ? req.user.id : null;
//     const skip = (parseInt(page) - 1) * parseInt(limit);
    
//     let query = { isPublished: true };
//     if (category) query.category = category;
//     if (courseType) query.courseType = courseType;
//     if (isFree !== undefined) query.isFree = isFree === 'true';
//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } }
//       ];
//     }
    
//     const sortOptions = {};
//     sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

//     const total = await Course.countDocuments(query);

//     const courses = await Course.find(query)
//       .select('title description category thumbnail isFree courseType price tutorId lessons enrolledUsers ratings averageRating')
//       .populate('createdBy', 'fullName email profilePicture bio')   
//       // .sort({ createdAt: -1 }) 
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(limit);

//     // Get bookmarks and completed lessons for authenticated user
//     let bookmarks = [];
//     let completedLessons = [];
//     if (userId) {
//       const [bookmarkDocs, user] = await Promise.all([
//         Bookmark.find({ userId }).select('courseId'),
//         User.findById(userId).select('completedLessons'),
//       ]);

//       bookmarks = bookmarkDocs;
//       completedLessons = user?.completedLessons.map(id => id.toString()) || [];
//     }

//     // Enhance courses
//     const enhancedCourses = await Promise.all(
//       courses.map(async (course) => {
//         const courseObj = course.toObject();

//         // Add isBookmarked
//         courseObj.isBookmarked = bookmarks.some(bookmark =>
//           bookmark.courseId.toString() === course._id.toString()
//         );

//         // Add isEnrolled
//         courseObj.isEnrolled = userId
//           ? course.enrolledUsers?.some(id => id.toString() === userId.toString())
//           : false;


//         courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

//         courseObj.lessonCount = course.lessons ? course.lessons.length : 0;

//         // Add progress and isCompleted
//         if (userId) {
//           const totalLessons = await Lesson.countDocuments({
//             courseId: course._id,
//             isPublished: true,
//           });

//           const completedLessonsForCourse = await Lesson.countDocuments({
//             courseId: course._id,
//             isPublished: true,
//             _id: { $in: completedLessons },
//           });

//           courseObj.progress = totalLessons > 0
//             ? Math.round((completedLessonsForCourse / totalLessons) * 100)
//             : 0;

//           courseObj.isCompleted = totalLessons > 0 &&
//             completedLessonsForCourse === totalLessons;
//         } else {
//           courseObj.progress = 0;
//           courseObj.isCompleted = false;
//         }

//         return courseObj;
//       })
//     );

//     return paginationResponse(enhancedCourses, total, page, limit, res);
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };

// Get Course Details (for non-enrolled students)
exports.getCoursePreview = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ 
      _id: courseId, 
      // isPublished: true, 
      status: 'published' 
    }).populate('createdBy', 'firstName lastName profilePicture bio ratings averageRating');

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
          select: 'firstName lastName ratings averageRating'
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
      .populate('createdBy', 'firstName lastName profilePicture ratings averageRating');

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
          select: 'firstName lastName fullName email profilePicture bio tutorType ratings averageRating'
        }
      },
      sort: { createdAt: -1 }
    };

    const bookmarks = await Bookmark.paginate({ userId }, options);

    const bookmarkedCourses = await Promise.all(
      bookmarks.docs.map(async (bookmark) => {
        const course = bookmark.courseId;

        if (!course || !course._id) return null; // Skip if course is deleted or not populated

        const courseObj = course.toObject();
        courseObj.isBookmarked = true;

        // Get enrolled count
        courseObj.enrolledStudentsCount = course.enrolledUsers?.length || 0;

        // Module count
        const moduleCount = await Module.countDocuments({
          courseId: course._id,
          isPublished: true,
        });
        courseObj.moduleCount = moduleCount;

        // Lesson count
        const modules = await Module.find({
          courseId: course._id,
          isPublished: true,
        }).select('_id');

        const moduleIds = modules.map(m => m._id);

        const totalLessons = await Lesson.countDocuments({
          moduleId: { $in: moduleIds },
          isPublished: true,
        });
        courseObj.lessonCount = totalLessons;

        // Get user completed lessons
        const user = await User.findById(userId).select('completedLessons');
        const completedLessons = user?.completedLessons.map(id => id.toString()) || [];

        const completedLessonsForCourse = await Lesson.countDocuments({
          moduleId: { $in: moduleIds },
          isPublished: true,
          _id: { $in: completedLessons },
        });

        courseObj.progress = totalLessons > 0
          ? Math.round((completedLessonsForCourse / totalLessons) * 100)
          : 0;

        courseObj.isCompleted = totalLessons > 0 &&
          completedLessonsForCourse === totalLessons;

        courseObj.isEnrolled = course.enrolledUsers?.some(id => id.toString() === userId.toString());

        return courseObj;
      })
    );

    // Filter out nulls (in case of deleted courses)
    const filteredCourses = bookmarkedCourses.filter(Boolean);

    return paginationResponse(filteredCourses, bookmarks.totalDocs, bookmarks.page, bookmarks.limit, res);
  } catch (error) {
    return internalServerErrorResponse(error.message,res, 500);
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



// Get All Lessons for a Course
exports.getCourseLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user ? req.user.id : null;
    const { page = 1, limit = 10 } = req.query;

    const course = await Course.findOne({ 
      _id: courseId, 
      isPublished: true 
    });

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ 
        userId, 
        courseId, 
        status: 'active' 
      });
      isEnrolled = !!enrollment;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Lesson.countDocuments({ courseId, isPublished: true });

    const lessons = await Lesson.find({ 
      courseId, 
      isPublished: true 
    })
    .select(isEnrolled ? '' : 'title description order duration thumbnail isPublished') // Limit fields for non-enrolled users
    .sort({ order: 1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Add progress information for enrolled users
    const enhancedLessons = await Promise.all(
      lessons.map(async (lesson) => {
        const lessonObj = lesson.toObject();
        
        if (isEnrolled && userId) {
          // Get module count and completion status
          const totalModules = await Module.countDocuments({ 
            lessonId: lesson._id 
          });
          
          const progress = await Progress.findOne({ userId, courseId });
          const completedModules = progress ? progress.completedModules : [];
          
          const completedModulesInLesson = await Module.countDocuments({
            lessonId: lesson._id,
            _id: { $in: completedModules }
          });

          lessonObj.moduleCount = totalModules;
          lessonObj.completedModules = completedModulesInLesson;
          lessonObj.isCompleted = totalModules > 0 && completedModulesInLesson === totalModules;
          lessonObj.progressPercentage = totalModules > 0 
            ? Math.round((completedModulesInLesson / totalModules) * 100) 
            : 0;
        } else {
          lessonObj.moduleCount = await Module.countDocuments({ lessonId: lesson._id });
        }

        return lessonObj;
      })
    );

    return paginationResponse(enhancedLessons, total, parseInt(page), parseInt(limit), res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get All Modules for a Lesson
exports.getLessonModules = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user ? req.user.id : null;
    const { page = 1, limit = 10 } = req.query;

    const lesson = await Lesson.findOne({ 
      _id: lessonId, 
      isPublished: true 
    }).populate('courseId', '_id');

    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ 
        userId, 
        courseId: lesson.courseId._id, 
        status: 'active' 
      });
      isEnrolled = !!enrollment;
    }

    // If not enrolled, only show basic module info
    if (!isEnrolled) {
      const moduleCount = await Module.countDocuments({ lessonId });
      return successResponse({
        message: 'Enroll in the course to access module content',
        moduleCount,
        lessonTitle: lesson.title
      }, res, 200);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Module.countDocuments({ lessonId });

    const modules = await Module.find({ lessonId })
      .sort({ order: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add completion status for enrolled users
    const progress = await Progress.findOne({ 
      userId, 
      courseId: lesson.courseId._id 
    });
    
    const completedModules = progress ? progress.completedModules.map(id => id.toString()) : [];

    const enhancedModules = modules.map(module => {
      const moduleObj = module.toObject();
      moduleObj.isCompleted = completedModules.includes(module._id.toString());
      return moduleObj;
    });

    return paginationResponse(enhancedModules, total, parseInt(page), parseInt(limit), res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get All Quizzes for a Lesson
exports.getLessonQuizzes = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user ? req.user.id : null;
    const { page = 1, limit = 10 } = req.query;

    const lesson = await Lesson.findOne({ 
      _id: lessonId, 
      isPublished: true 
    }).populate('courseId', '_id');

    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ 
        userId, 
        courseId: lesson.courseId._id, 
        status: 'active' 
      });
      isEnrolled = !!enrollment;
    }

    // Get all modules for this lesson first
    const modules = await Module.find({ lessonId }).select('_id');
    const moduleIds = modules.map(module => module._id);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Quiz.countDocuments({ moduleId: { $in: moduleIds } });

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } })
      .populate('moduleId', 'title lessonId')
      .select(isEnrolled ? '' : 'title description moduleId duration questionCount passingScore') // Limit for non-enrolled
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add attempt information for enrolled users
    const enhancedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        const quizObj = quiz.toObject();
        
        if (isEnrolled && userId) {
          // Get user's best attempt
          const bestAttempt = await QuizAttempt.findOne({ 
            userId, 
            quizId: quiz._id 
          }).sort({ score: -1 });

          const attemptCount = await QuizAttempt.countDocuments({ 
            userId, 
            quizId: quiz._id 
          });

          quizObj.bestScore = bestAttempt ? bestAttempt.score : null;
          quizObj.passed = bestAttempt ? bestAttempt.passed : false;
          quizObj.attemptCount = attemptCount;
          quizObj.lastAttempt = bestAttempt ? bestAttempt.completedAt : null;
          
          // Check if quiz is completed (passed)
          const progress = await Progress.findOne({ 
            userId, 
            courseId: lesson.courseId._id 
          });
          quizObj.isCompleted = progress ? 
            progress.completedQuizzes.includes(quiz._id.toString()) : false;
        } else {
          quizObj.questionCount = quiz.questions ? quiz.questions.length : 0;
        }

        return quizObj;
      })
    );

    return paginationResponse(enhancedQuizzes, total, parseInt(page), parseInt(limit), res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get All Quizzes for a Module
exports.getModuleQuizzes = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user ? req.user.id : null;
    const { page = 1, limit = 10 } = req.query;

    const module = await Module.findById(moduleId)
      .populate({
        path: 'lessonId',
        populate: { path: 'courseId', select: '_id' }
      });

    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ 
        userId, 
        courseId: module.lessonId.courseId._id, 
        status: 'active' 
      });
      isEnrolled = !!enrollment;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Quiz.countDocuments({ moduleId });

    const quizzes = await Quiz.find({ moduleId })
      .select(isEnrolled ? '' : 'title description duration questionCount passingScore') // Limit for non-enrolled
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add attempt information for enrolled users
    const enhancedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        const quizObj = quiz.toObject();
        
        if (isEnrolled && userId) {
          // Get user's quiz attempts
          const attempts = await QuizAttempt.find({ 
            userId, 
            quizId: quiz._id 
          }).sort({ score: -1 });

          const bestAttempt = attempts[0];
          
          quizObj.bestScore = bestAttempt ? bestAttempt.score : null;
          quizObj.passed = bestAttempt ? bestAttempt.passed : false;
          quizObj.attemptCount = attempts.length;
          quizObj.lastAttempt = bestAttempt ? bestAttempt.completedAt : null;
          
          // Check if quiz is completed
          const progress = await Progress.findOne({ 
            userId, 
            courseId: module.lessonId.courseId._id 
          });
          quizObj.isCompleted = progress ? 
            progress.completedQuizzes.includes(quiz._id.toString()) : false;
        } else {
          quizObj.questionCount = quiz.questions ? quiz.questions.length : 0;
        }

        return quizObj;
      })
    );

    return paginationResponse(enhancedQuizzes, total, parseInt(page), parseInt(limit), res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// exports.getCourseById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user ? req.user.id : null;

//     const course = await Course.findOne({ _id: id})
//     // const course = await Course.findOne({ _id: id, isPublished: true })
//       .select('title description category thumbnail preview isFree courseType price goals tutorId enrolledUsers ratings averageRating createdBy lessons')
//       .populate('createdBy', 'fullName email profilePicture bio tutorType ratings averageRating');

//     if (!course) {
//       return errorResponse('Course not found', 'NOT_FOUND', 404, res);
//     }

//     const courseObj = course.toObject();

//     // Get bookmarks and completed lessons
//     let bookmarks = [];
//     let completedLessons = [];

//     if (userId) {
//       const [bookmarkDocs, user] = await Promise.all([
//         Bookmark.find({ userId }).select('courseId'),
//         User.findById(userId).select('completedLessons'),
//       ]);

//       bookmarks = bookmarkDocs;
//       completedLessons = user?.completedLessons.map(id => id.toString()) || [];
//     }

//     // Enrichment
//     courseObj.isBookmarked = bookmarks.some(
//       bookmark => bookmark.courseId.toString() === course._id.toString()
//     );

//     courseObj.isEnrolled = userId
//       ? course.enrolledUsers?.some(id => id.toString() === userId.toString())
//       : false;

//     courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

//     // Modules and lessons
//     const modules = await Module.find({
//       courseId: course._id,
//       isPublished: true,
//     }).select('_id');

//     const moduleIds = modules.map(m => m._id);

//     const totalLessons = await Lesson.countDocuments({
//       moduleId: { $in: moduleIds },
//       isPublished: true,
//     });

//     courseObj.moduleCount = modules.length;
//     courseObj.lessonCount = totalLessons;

//     if (userId) {
//       const completedLessonsForCourse = await Lesson.countDocuments({
//         moduleId: { $in: moduleIds },
//         isPublished: true,
//         _id: { $in: completedLessons },
//       });

//       courseObj.progress = totalLessons > 0
//         ? Math.round((completedLessonsForCourse / totalLessons) * 100)
//         : 0;

//       courseObj.isCompleted = totalLessons > 0 &&
//         completedLessonsForCourse === totalLessons;
//     } else {
//       courseObj.progress = 0;
//       courseObj.isCompleted = false;
//     }

//     return successResponse(courseObj,res,200,"")
//     // return res.status(200).json({
//     //   success: true,
//     //   data: courseObj,
//     // });
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };


// Updated getAllCourses endpoint with proper Module/Lesson relationship

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const course = await Course.findOne({ _id: id })
      .select('title description category thumbnail preview isFree courseType price goals tutorId enrolledUsers ratings averageRating createdBy lessons rating')
      .populate('createdBy', 'fullName email profilePicture bio tutorType ratings averageRating');

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    const courseObj = course.toObject();

    // ⭐ Add rating summary
    courseObj.averageRating = course.rating?.average || 0;
    courseObj.totalRatings = course.rating?.count || 0;

    // Get bookmarks and completed lessons
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

    // Enrichment
    courseObj.isBookmarked = bookmarks.some(
      bookmark => bookmark.courseId.toString() === course._id.toString()
    );

    courseObj.isEnrolled = userId
      ? course.enrolledUsers?.some(id => id.toString() === userId.toString())
      : false;

    courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

    // Modules and lessons
    const modules = await Module.find({
      courseId: course._id,
      isPublished: true,
    }).select('_id');

    const moduleIds = modules.map(m => m._id);

    const totalLessons = await Lesson.countDocuments({
      moduleId: { $in: moduleIds },
      isPublished: true,
    });

    courseObj.moduleCount = modules.length;
    courseObj.lessonCount = totalLessons;

    if (userId) {
      const completedLessonsForCourse = await Lesson.countDocuments({
        moduleId: { $in: moduleIds },
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

    return successResponse(courseObj, res, 200, '');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



exports.getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      isFree,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      courseType = 'tutor' // will match tutorType of createdBy
    } = req.query;

    const userId = req.user ? req.user.id : null;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { isPublished: true };
    if (category) query.category = category;
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

    // Fetch all matching courses (before pagination)
    const allCourses = await Course.find(query)
      .select('title description category thumbnail isFree courseType preview price tutorId enrolledUsers ratings averageRating createdBy lessons')
      .populate('createdBy', 'fullName email profilePicture bio tutorType ratings averageRating')
      .sort(sortOptions);

    // ✅ Filter courses by tutorType
    const filteredCourses = allCourses.filter(course => {


      if(courseType == 'tutor' || courseType == 'partner'){
        return course.createdBy?.tutorType === 'partner'
      }else if(courseType == 'emgs'){
        return course.createdBy?.tutorType === 'emgs'
      }

      return true

    }
      
    );

    const total = filteredCourses.length;

    // Paginate
    const paginatedCourses = filteredCourses.slice(skip, skip + parseInt(limit));

    // Get bookmarks and completed lessons
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
      paginatedCourses.map(async (course) => {
        const courseObj = course.toObject();

        courseObj.isBookmarked = bookmarks.some(
          bookmark => bookmark.courseId.toString() === course._id.toString()
        );

        courseObj.isEnrolled = userId
          ? course.enrolledUsers?.some(id => id.toString() === userId.toString())
          : false;

        courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

        // Get module count
        const moduleCount = await Module.countDocuments({
          courseId: course._id,
          isPublished: true,
        });
        courseObj.moduleCount = moduleCount;

        // Get all modules
        const modules = await Module.find({
          courseId: course._id,
          isPublished: true,
        }).select('_id');

        const moduleIds = modules.map(m => m._id);

        // Get lesson count
        const totalLessons = await Lesson.countDocuments({
          moduleId: { $in: moduleIds },
          isPublished: true,
        });
        courseObj.lessonCount = totalLessons;

        // Calculate progress
        if (userId) {
          const completedLessonsForCourse = await Lesson.countDocuments({
            moduleId: { $in: moduleIds },
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


exports.getCompletedCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      courseType = 'tutor',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user completed courses IDs
    const user = await User.findById(userId).select('completedCourses completedLessons');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Base query: only completed courses by user
    let query = { _id: { $in: user.completedCourses }, isPublished: true };

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch all matching completed courses (before pagination)
    const allCompletedCourses = await Course.find(query)
      .select('title description category thumbnail isFree courseType preview price tutorId enrolledUsers ratings averageRating createdBy lessons')
      .populate('createdBy', 'fullName email profilePicture bio tutorType ratings averageRating')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

    // Filter by tutorType
    const filteredCourses = allCompletedCourses.filter(course => {
      if (courseType === 'tutor' || courseType === 'partner') {
        return course.createdBy?.tutorType === 'partner';
      } else if (courseType === 'emgs') {
        return course.createdBy?.tutorType === 'emgs';
      }
      return true;
    });

    const total = filteredCourses.length;

    // Paginate
    const paginatedCourses = filteredCourses.slice(skip, skip + parseInt(limit));

    // Enhance courses with progress info
    const enhancedCourses = await Promise.all(
      paginatedCourses.map(async (course) => {
        const courseObj = course.toObject();

        courseObj.isBookmarked = false; // Could add bookmarks if needed

        courseObj.isEnrolled = course.enrolledUsers?.some(id => id.toString() === userId.toString()) || false;

        courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

        // Get module count
        const moduleCount = await Module.countDocuments({
          courseId: course._id,
          isPublished: true,
        });
        courseObj.moduleCount = moduleCount;

        // Get all modules
        const modules = await Module.find({
          courseId: course._id,
          isPublished: true,
        }).select('_id');

        const moduleIds = modules.map(m => m._id);

        // Get lesson count
        const totalLessons = await Lesson.countDocuments({
          moduleId: { $in: moduleIds },
          isPublished: true,
        });
        courseObj.lessonCount = totalLessons;

        // Calculate progress based on user's completedLessons
        const completedLessons = user.completedLessons.map(id => id.toString());

        const completedLessonsForCourse = await Lesson.countDocuments({
          moduleId: { $in: moduleIds },
          isPublished: true,
          _id: { $in: completedLessons },
        });

        courseObj.progress = totalLessons > 0
          ? Math.round((completedLessonsForCourse / totalLessons) * 100)
          : 0;

        courseObj.isCompleted = totalLessons > 0 &&
          completedLessonsForCourse === totalLessons;

        return courseObj;
      })
    );

    return paginationResponse(enhancedCourses, total, page, limit, res);

  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};


// Get all modules for a specific course
exports.getCourseModulesOld = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify course exists and user has access
    const course = await Course.findOne({ 
      _id: courseId, 
      isPublished: true 
    });

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled (if course is not free)
    const userId = req.user ? req.user.id : null;
    if (!course.isFree && userId) {
      const isEnrolled = course.enrolledUsers?.some(id => 
        id.toString() === userId.toString()
      );
      if (!isEnrolled) {
        return errorResponse('Access denied. Please enroll in the course.', 'FORBIDDEN', 403, res);
      }
    }

    const total = await Module.countDocuments({
      courseId,
      isPublished: true
    });

    const modules = await Module.find({
      courseId,
      isPublished: true
    })
    .select('title description order createdAt')
    .sort({ order: 1, createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Enhance modules with lesson count
    const enhancedModules = await Promise.all(
      modules.map(async (module) => {
        const moduleObj = module.toObject();
        
        const lessonCount = await Lesson.countDocuments({
          moduleId: module._id,
          isPublished: true
        });
        
        moduleObj.lessonCount = lessonCount;
        return moduleObj;
      })
    );

    return paginationResponse(enhancedModules, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all lessons for a specific module
exports.getModuleLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user ? req.user.id : null;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify module exists and get course info
    const module = await Module.findOne({ 
      _id: moduleId, 
      isPublished: true 
    }).populate('courseId', 'isFree enrolledUsers');

    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    // Check if user has access to the course
    if (!module.courseId.isFree && userId) {
      const isEnrolled = module.courseId.enrolledUsers?.some(id => 
        id.toString() === userId.toString()
      );
      if (!isEnrolled) {
        return errorResponse('Access denied. Please enroll in the course.', 'FORBIDDEN', 403, res);
      }
    }

    // Get user's completed lessons
    let completedLessons = [];
    if (userId) {
      const user = await User.findById(userId).select('completedLessons');
      completedLessons = user?.completedLessons.map(id => id.toString()) || [];
    }

    const total = await Lesson.countDocuments({
      moduleId,
      isPublished: true
    });

    const lessons = await Lesson.find({
      moduleId,
      isPublished: true
    })
    .select('title description order duration content createdAt')
    .sort({ order: 1, createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Enhance lessons with completion status
    const enhancedLessons = lessons.map(lesson => {
      const lessonObj = lesson.toObject();
      lessonObj.isCompleted = completedLessons.includes(lesson._id.toString());
      return lessonObj;
    });

    return paginationResponse(enhancedLessons, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Mark Lesson as Completed
exports.markLessonCompleted = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // 1. Get the lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return badRequestResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    // 2. Get the module
    const module = await Module.findById(lesson.moduleId);
    if (!module) {
      return badRequestResponse('Module not found for this lesson', 'MODULE_NOT_FOUND', 404, res);
    }

    // 3. Get the course
    const courseId = module.courseId;
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found for this lesson', 'COURSE_NOT_FOUND', 404, res);
    }

    // 4. Update completed lessons for user
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { completedLessons: lessonId } } // only adds if not already present
    );

    // 5. Get all modules for the course
    const allModules = await Module.find({ courseId: course._id, isPublished: true }).select('_id');
    const moduleIds = allModules.map(mod => mod._id);

    // 6. Get all lessons for the course
    const allLessons = await Lesson.find({
      moduleId: { $in: moduleIds },
      isPublished: true
    }).select('_id');
    const allLessonIds = allLessons.map(lesson => lesson._id.toString());

    // 7. Get user’s completed lessons and courses
    const user = await User.findById(userId).select('completedLessons completedCourses');
    const completedLessons = user.completedLessons.map(id => id.toString());

    // 8. Check if user has completed all lessons in this course
    const hasCompletedAll = allLessonIds.every(id => completedLessons.includes(id));

    if (hasCompletedAll && !user.completedCourses.includes(courseId)) {
      user.completedCourses.push(courseId);
      await user.save();
    }

    return successResponse({}, res, 200, 'Lesson marked as completed successfully');
  } catch (error) {
    console.error('Error marking lesson completed:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// exports.markCourseCompleted = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const userId = req.user.id;

//     // Check if course exists
//     const course = await Course.findById(courseId).populate('lessons');
//     if (!course) {
//       return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
//     }

//     // Fetch the user
//     const user = await User.findById(userId);
//     if (!user) {
//       return badRequestResponse('User not found', 'USER_NOT_FOUND', 404, res);
//     }

//     // Check if all lessons in the course are marked as completed
//     const lessonIds = course.lessons.map(lesson => lesson._id.toString());
//     const completedLessons = user.completedLessons.map(id => id.toString());

//     const allLessonsCompleted = lessonIds.every(id => completedLessons.includes(id));

//     if (!allLessonsCompleted) {
//       return badRequestResponse('Not all lessons are completed yet', 'LESSONS_INCOMPLETE', 400, res);
//     }

//     // Add to completedCourses if not already present
//     if (!user.completedCourses.includes(courseId)) {
//       await User.findByIdAndUpdate(
//         userId,
//         { $addToSet: { completedCourses: courseId } } // Avoid duplicates
//       );
//     }

//     return successResponse({}, res, 200, 'Course marked as completed successfully');
//   } catch (error) {
//     console.error('Error marking course completed:', error);
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };


// exports.getLessonById = async (req, res) => {
//   try {
//     const { lessonId } = req.params;
//     const userId = req.user ? req.user.id : null;

//     // Find the lesson
//     const lesson = await Lesson.findOne({
//       _id: lessonId,
//       isPublished: true
//     }).populate({
//       path: 'moduleId',
//       populate: {
//         path: 'courseId',
//         select: 'isFree enrolledUsers',
//       }
//     });

//     if (!lesson) {
//       return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
//     }

//     const course = lesson.moduleId?.courseId;

//     // Check access
//     if (course && !course.isFree && userId) {
//       const isEnrolled = course.enrolledUsers?.some(id =>
//         id.toString() === userId.toString()
//       );
//       if (!isEnrolled) {
//         return errorResponse('Access denied. Please enroll in the course.', 'FORBIDDEN', 403, res);
//       }
//     }

//     // Check if user completed the lesson
//     let isCompleted = false;
//     if (userId) {
//       const user = await User.findById(userId).select('completedLessons');
//       isCompleted = user?.completedLessons.includes(lesson._id);
//     }

//     const lessonObj = lesson.toObject();
//     lessonObj.isCompleted = isCompleted;

//     return successResponse(lessonObj,res,200,'')
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };



exports.markCourseCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // 1. Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // 2. Get the user
    const user = await User.findById(userId).select('completedLessons completedCourses enrolledCourses');
    if (!user) {
      return badRequestResponse('User not found', 'USER_NOT_FOUND', 404, res);
    }

    // ✅ 3. Validate enrollment
    const isEnrolled = user.enrolledCourses.some(
      enrolledCourseId => enrolledCourseId.toString() === courseId
    );

    if (!isEnrolled) {
      return badRequestResponse('You must be enrolled in this course to mark it as completed.', 'NOT_ENROLLED', 403, res);
    }

    // 4. Get all modules for the course
    const modules = await Module.find({ courseId }).select('_id');
    const moduleIds = modules.map(mod => mod._id);

    // 5. Get all lessons under those modules
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).select('_id');
    const lessonIds = lessons.map(lesson => lesson._id.toString());

    // 6. Add all course lessons to completedLessons (no duplicates)
    const updatedCompletedLessons = new Set([
      ...user.completedLessons.map(id => id.toString()),
      ...lessonIds
    ]);

    user.completedLessons = Array.from(updatedCompletedLessons);

    // 7. Add course to completedCourses if not already there
    const alreadyCompleted = user.completedCourses.some(
      completedCourseId => completedCourseId.toString() === courseId
    );
    if (!alreadyCompleted) {
      user.completedCourses.push(courseId);
    }

    await user.save();

    return successResponse({}, res, 200, 'Course and lessons marked as completed successfully');

  } catch (error) {
    console.error('Error marking course completed:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user ? req.user.id : null;

    // 1. Find the lesson
    const lesson = await Lesson.findOne({
      _id: lessonId,
      isPublished: true
    }).populate({
      path: 'moduleId',
      populate: {
        path: 'courseId',
        select: 'isFree enrolledUsers',
      }
    });

    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    const module = lesson.moduleId;
    const course = module?.courseId;

    // 2. Check access
    if (course && !course.isFree && userId) {
      const isEnrolled = course.enrolledUsers?.some(id =>
        id.toString() === userId.toString()
      );
      if (!isEnrolled) {
        return errorResponse('Access denied. Please enroll in the course.', 'FORBIDDEN', 403, res);
      }
    }

    // 3. Fetch completed lessons of user (once)
    const completedLessonIds = new Set();
    if (userId) {
      const user = await User.findById(userId).select('completedLessons');
      user?.completedLessons?.forEach(id => completedLessonIds.add(id.toString()));
    }

    // 4. Get all modules in course (ordered)
    const allModules = await Module.find({ courseId: course._id, isPublished: true })
      .sort({ order: 1, createdAt: 1 })
      .select('_id order');

    const moduleIdOrderMap = allModules.reduce((acc, mod, index) => {
      acc[mod._id.toString()] = index;
      return acc;
    }, {});

    const moduleIds = allModules.map(m => m._id);

    // 5. Get all lessons in course
    const allLessons = await Lesson.find({
      moduleId: { $in: moduleIds },
      isPublished: true
    }).sort({ createdAt: 1, order: 1 });

    // 6. Sort lessons by module order → lesson order
    const globallySortedLessons = allLessons.sort((a, b) => {
      const moduleOrderA = moduleIdOrderMap[a.moduleId.toString()] ?? 999;
      const moduleOrderB = moduleIdOrderMap[b.moduleId.toString()] ?? 999;

      if (moduleOrderA !== moduleOrderB) return moduleOrderA - moduleOrderB;
      return (a.order || 0) - (b.order || 0);
    });

    // 7. Find current index
    const currentIndex = globallySortedLessons.findIndex(
      l => l._id.toString() === lessonId
    );

    const previousLesson = currentIndex > 0 ? globallySortedLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < globallySortedLessons.length - 1 ? globallySortedLessons[currentIndex + 1] : null;

    // 8. Build lesson response
    const lessonObj = lesson.toObject();
    lessonObj.isCompleted = completedLessonIds.has(lesson._id.toString());

    // Attach minimal previous/next lesson info
    lessonObj.previousLessonId = previousLesson
      ? previousLesson._id
      : null;

    lessonObj.nextLessonId = nextLesson
      ? nextLesson._id
      : null;

    return successResponse(lessonObj, res, 200, '');
  } catch (error) {
    console.error('Error getting lesson by ID:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user ? req.user.id : null;

    // Verify course exists
    const course = await Course.findOne({ 
      _id: courseId, 
      isPublished: true 
    });

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is enrolled if course is not free
    if (!course.isFree && userId) {
      const isEnrolled = course.enrolledUsers?.some(id => 
        id.toString() === userId.toString()
      );
      if (!isEnrolled) {
        return errorResponse('Access denied. Please enroll in the course.', 'FORBIDDEN', 403, res);
      }
    }

    // Get user's completed lessons
    let completedLessons = [];
    if (userId) {
      const user = await User.findById(userId).select('completedLessons');
      completedLessons = user?.completedLessons.map(id => id.toString()) || [];
    }

    // Fetch and paginate modules
    const total = await Module.countDocuments({
      courseId,
      isPublished: true
    });

    const modules = await Module.find({
      courseId,
      isPublished: true
    })
    .select('title description order createdAt')
    .sort({ order: 1, createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Enhance modules with lessons and lessonCount
    const enhancedModules = await Promise.all(
      modules.map(async (module) => {
        const moduleObj = module.toObject();

        // Get all lessons for the module
        const lessons = await Lesson.find({
          moduleId: module._id,
          isPublished: true
        })
        .select('title description order duration content createdAt')
        .sort({ order: 1, createdAt: 1 });

        // Add completion status to each lesson
        const enrichedLessons = lessons.map(lesson => {
          const lessonObj = lesson.toObject();
          lessonObj.isCompleted = completedLessons.includes(lesson._id.toString());
          return lessonObj;
        });

        moduleObj.lessons = enrichedLessons;
        moduleObj.lessonCount = enrichedLessons.length;

        return moduleObj;
      })
    );

    return paginationResponse(enhancedModules, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.getAllTutors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      tutorType,   // optional: 'emgs' or 'partner'
      search       // optional: fullName search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      role: 'tutor',
    };

    if (tutorType) {
      query.tutorType = tutorType;
    }

    if (search) {
      query.fullName = { $regex: search, $options: 'i' };
    }

    const total = await User.countDocuments(query);

    const tutors = await User.find(query)
      .select('fullName email phone profilePicture tutorType bio servicePrice averageRating preferredLanguage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return paginationResponse(tutors, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Rate a tutor
exports.rateTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return badRequestResponse('Rating must be between 1 and 5', 'BAD_REQUEST', 400, res);
    }
    
    // Find the tutor
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user has enrolled in any of the tutor's courses
    const hasEnrolled = await Course.exists({
      createdBy: tutorId,
      enrolledUsers: userId
    });
    
    // if (!hasEnrolled) {
    //   return badRequestResponse('You must be enrolled in at least one of the tutor\'s courses to rate them', 'BAD_REQUEST', 400, res);
    // }
    
    // Check if user has already rated this tutor
    const existingRatingIndex = tutor.ratings?.findIndex(r => r.userId.toString() === userId);
    
    if (existingRatingIndex !== -1) {
      // Update existing rating
      tutor.ratings[existingRatingIndex] = {
        userId,
        rating,
        review: review || tutor.ratings[existingRatingIndex].review,
        createdAt: new Date()
      };
    } else {
      // Initialize ratings array if it doesn't exist
      if (!tutor.ratings) {
        tutor.ratings = [];
      }
      
      // Add new rating
      tutor.ratings.push({
        userId,
        rating,
        review,
        createdAt: new Date()
      });
    }
    
    // Calculate new average rating
    tutor.averageRating = tutor.calculateAverageRating();
    
    await tutor.save();
    
    return successResponse({ 
      averageRating: tutor.averageRating 
    }, res, 200, 'Tutor rated successfully');
  } catch (error) {
    console.error('Error rating tutor:', error);
    return internalServerErrorResponse('Server error while rating tutor', res, 500);
  }
};

// Get tutor ratings
exports.getTutorRatings = async (req, res) => {
  try {
    const { tutorId } = req.params;
    
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' })
      .select('ratings averageRating')
      .populate('ratings.userId', 'fullName profilePicture');
    
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({
      averageRating: tutor.averageRating || 0,
      totalRatings: tutor.ratings?.length || 0,
      ratings: tutor.ratings || []
    }, res, 200, 'Tutor ratings fetched successfully');
  } catch (error) {
    console.error('Error getting tutor ratings:', error);
    return internalServerErrorResponse('Server error while fetching tutor ratings', res, 500);
  }
};


exports.rateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;

    // 1. Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return badRequestResponse('Rating must be between 1 and 5', 'BAD_REQUEST', 400, res);
    }

    // 2. Fetch course
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // 3. Check if user has already rated
    const existingRatingIndex = course.ratings.findIndex(
      (r) => r.userId.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      course.ratings[existingRatingIndex].score = rating;
      course.ratings[existingRatingIndex].comment = review || '';
      course.ratings[existingRatingIndex].createdAt = new Date();
    } else {
      // Add new rating
      course.ratings.push({
        userId,
        score: rating,
        comment: review || ''
      });
    }

    // 4. Recalculate average rating
    const totalRatings = course.ratings.length;
    const totalScore = course.ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = parseFloat((totalScore / totalRatings).toFixed(1));

    course.rating = {
      average: averageRating,
      count: totalRatings
    };

    await course.save();

    return successResponse(
      {
        averageRating: course.rating.average,
        totalRatings: course.rating.count
      },
      res,
      200,
      'Course rated successfully'
    );
  } catch (error) {
    console.error('Error rating course:', error);
    return internalServerErrorResponse('Server error while rating course', res, 500);
  }
};




exports.getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .select('ratings rating')
      .populate('ratings.userId', 'fullName profilePicture');

    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    return successResponse({
      averageRating: course.rating?.average || 0,
      totalRatings: course.rating?.count || 0,
      ratings: course.ratings || []
    }, res, 200, 'Course ratings fetched successfully');
  } catch (error) {
    console.error('Error fetching course ratings:', error); 
    return internalServerErrorResponse('Server error while fetching course ratings', res, 500);
  }
};

