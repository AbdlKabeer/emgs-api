const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Module = require('../../models/module.model');
const Quiz = require('../../models/quiz.model');
const Bookmark = require('../../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../../utils/custom_response/responses');



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
      .select('title description category thumbnail isFree price tutorId enrolledUsers ratings averageRating createdBy')
      .populate('createdBy', 'fullName email profilePicture bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // 🔥 deep populate modules and their lessons
      .populate({
        path: 'modules',
        options: { sort: { order: 1 } }, // keep module order
        populate: {
          path: 'lessons',
          options: { sort: { order: 1 } } // keep lesson order
        }
      });

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

        courseObj.enrolledStudentsCount = course.enrolledUsers ? course.enrolledUsers.length : 0;

        // Add lesson count (from populated lessons)
        const lessonCount = courseObj.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
        courseObj.lessonCount = lessonCount;

        // Add progress and isCompleted
        if (userId) {
          const totalLessons = lessonCount;
          const completedLessonsForCourse = courseObj.modules?.reduce((sum, m) =>
            sum + (m.lessons?.filter(l => completedLessons.includes(l._id.toString())).length || 0),
            0
          ) || 0;

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
    console.error(error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Create Course
exports.createCourse = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { 
      title, 
      description, 
      category, 
      isFree, 
      price, 
      isPublished, 
      thumbnail, 
      goals, 
      notes 
    } = req.body;
    
    // Validation
    if (!title || !description || !category) {
      return errorResponse('Title, description, and category are required', 'VALIDATION_ERROR', 400, res);
    }

    if (!isFree && (!price || price <= 0)) {
      return errorResponse('Price must be greater than 0 for paid courses', 'VALIDATION_ERROR', 400, res);
    }

    const course = new Course({
      title,
      description,
      category,
      isFree,
      price: isFree ? 0 : price,
      thumbnail,
      goals: goals || [],
      notes: notes || [],
      createdBy: userId,
      status: 'draft',
      isPublished: false
    });
    
    await course.save();
    
    return successResponse(
      {
        id: course._id,
        title: course.title
      },
      res,
      201,
      'Course created successfully'
    );
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update Course
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const course = await Course.findById(courseId).populate(
      'createdBy',
      'fullName email profilePicture bio'
    );

    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    // Apply updates
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        course[key] = updateData[key];
      }
    });

    await course.save();

    // 1️⃣ Fetch related modules
    const modules = await Module.find({ courseId })
      .sort({ order: 1 })
      .lean();

    // 2️⃣ Fetch related lessons
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } })
      .sort({ order: 1 })
      .lean();

    // 3️⃣ Fetch related quizzes
    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } }).lean();

    // 4️⃣ Structure nested response
    const structuredModules = modules.map((module) => {
      const moduleLessons = lessons.filter(
        (lesson) => lesson.moduleId.toString() === module._id.toString()
      );

      const moduleQuizzes = quizzes.filter(
        (quiz) => quiz.moduleId.toString() === module._id.toString()
      );

      return {
        ...module,
        lessons: moduleLessons,
        quizzes: moduleQuizzes,
      };
    });

    // 5️⃣ Final response
    return successResponse(
      {
        ...course.toObject(),
        modules: structuredModules,
      },
      res,
      200,
      'Course updated successfully'
    );
  } catch (error) {
    console.error(error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};



// Submit Course for Review
exports.submitCourseForReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findOne({ _id: courseId, createdBy: userId });
    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    // Check if course has at least one lesson
    const lessonCount = await Lesson.countDocuments({ courseId });
    if (lessonCount === 0) {
      return errorResponse('Course must have at least one lesson before submission', 'VALIDATION_ERROR', 400, res);
    }

    course.status = 'review';
    await course.save();

    return successResponse({
      message: 'Course submitted for review successfully',
      courseId: course._id
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


exports.createLesson = async (req, res) => {
  try {
    const { moduleId, title, description, order, duration, content } = req.body;
    const userId = req.user.id;

    // Verify module ownership via course
    const module = await Module.findById(moduleId).populate('courseId');
    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    if (module.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    }

    // Auto-assign order if not provided
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ moduleId }).sort({ order: -1 });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    const lesson = new Lesson({
      title,
      description,
      moduleId,
      order: lessonOrder,
      duration: duration || 0,
      content: content || {}
    });

    await lesson.save();

    return successResponse({
      message: 'Lesson created successfully',
      lesson
    }, res, 201);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Update Lesson
exports.updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const lesson = await Lesson.findById(lessonId)
      .populate({
        path: 'moduleId',
        populate: { path: 'courseId' }
      });

    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    if (lesson.moduleId.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    }

    // Handle nested content updates properly
    if (updateData.content) {
      lesson.content = { ...lesson.content.toObject(), ...updateData.content };
      delete updateData.content;
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        lesson[key] = updateData[key];
      }
    });

    await lesson.save();

    return successResponse({
      message: 'Lesson updated successfully',
      lesson
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// ====================== MODULE CONTROLLER ======================

// Create Module
exports.createModule = async (req, res) => {
  try {
    const { courseId, title, description, order } = req.body;
    const userId = req.user.id;

    // Verify course ownership
    const course = await Course.findOne({ _id: courseId, createdBy: userId });
    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    // Auto-assign order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const lastModule = await Module.findOne({ courseId }).sort({ order: -1 });
      moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }

    const module = new Module({
      title,
      description,
      courseId,
      order: moduleOrder
    });

    await module.save();

    return successResponse(module, res, 201,'Module created successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update Module
exports.updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const module = await Module.findById(moduleId).populate('courseId');

    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    // console.log(module.courseId.createdBy._id.toString())
    // console.log(userId)
    // if (module.courseId.createdBy.toString() !== userId) {
    //   return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    // }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        module[key] = updateData[key];
      }
    });

    await module.save();

    return successResponse(module, res, 200,'Module updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// // Update Module
// exports.updateModule = async (req, res) => {
//   try {
//     const { moduleId } = req.params;
//     const userId = req.user.id;
//     const updateData = req.body;

//     const module = await Module.findById(moduleId)
//       .populate({
//         path: 'lessonId',
//         populate: { path: 'courseId' }
//       });

//     if (!module) {
//       return errorResponse('Module not found', 'NOT_FOUND', 404, res);
//     }

//     if (module.lessonId.courseId.createdBy.toString() !== userId) {
//       return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
//     }

//     // Handle content updates properly
//     if (updateData.content) {
//       module.content = { ...module.content.toObject(), ...updateData.content };
//       delete updateData.content;
//     }

//     Object.keys(updateData).forEach(key => {
//       if (updateData[key] !== undefined) {
//         module[key] = updateData[key];
//       }
//     });

//     await module.save();

//     return successResponse({
//       message: 'Module updated successfully',
//       module
//     }, res, 200);
//   } catch (error) {
//     return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
//   }
// };

// Quiz Controller (controllers/quizController.js)
// Create Quiz
exports.createQuiz = async (req, res) => {
  try {
    const { 
      moduleId, 
      title, 
      description, 
      useTimer, 
      timeLimit, 
      passingScore, 
      questions 
    } = req.body;
    const userId = req.user.id;

    // Verify module ownership
    const module = await Module.findById(moduleId)
      .populate({
        path: 'lessonId',
        populate: { path: 'courseId' }
      });

    if (!module) {
      return errorResponse('Module not found', 'NOT_FOUND', 404, res);
    }

    if (module.lessonId.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    }

    const quiz = new Quiz({
      title,
      description,
      moduleId,
      useTimer,
      timeLimit,
      passingScore,
      questions: questions || []
    });

    await quiz.save();

    return successResponse({
      message: 'Quiz created successfully',
      quiz
    }, res, 201);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Add Question to Quiz
exports.addQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question, type, options, correctAnswer, explanation, points } = req.body;
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

    if (quiz.moduleId.lessonId.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    }

    const newQuestion = {
      question,
      type,
      options: options || [],
      correctAnswer,
      explanation,
      points: points || 1
    };

    quiz.questions.push(newQuestion);
    await quiz.save();

    return successResponse({
      message: 'Question added successfully',
      quiz
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get Course with all details
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    const course = await Course.findById(courseId)
      .populate('createdBy', 'fullName email profilePicture bio'); // optional author details

    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    const modules = await Module.find({ courseId })
      .sort({ order: 1 })
      .lean();

    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } })
      .sort({ order: 1 })
      .lean();

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } }).lean();

    const structuredModules = modules.map(module => {
      const moduleLessons = lessons.filter(lesson =>
        lesson.moduleId.toString() === module._id.toString()
      );

      const moduleQuizzes = quizzes.filter(quiz =>
        quiz.moduleId.toString() === module._id.toString()
      );

      return {
        ...module,
        lessons: moduleLessons,
        quizzes: moduleQuizzes
      };
    });

    return successResponse({
        ...course.toObject(),
        modules: structuredModules
    }, res, 200);

  } catch (error) {
    console.error(error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};







