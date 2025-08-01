const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Quiz = require('../../models/quiz.model');
const Bookmark = require('../../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../../utils/custom_response/responses');




// ==================== MODELS ====================





// Lesson Model (models/Lesson.js)



// // Module Model (models/Module.js)
// const moduleSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   lessonId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Lesson',
//     required: true
//   },
//   order: {
//     type: Number,
//     required: true
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

// const Module = mongoose.model('Module', moduleSchema);

// // Quiz Model (models/Quiz.js)
// const quizSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String
//   },
//   moduleId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Module',
//     required: true
//   },
//   useTimer: {
//     type: Boolean,
//     default: false
//   },
//   timeLimit: {
//     type: Number, // in minutes
//     default: 30
//   },
//   passingScore: {
//     type: Number,
//     default: 80,
//     min: 0,
//     max: 100
//   },
//   questions: [{
//     question: {
//       type: String,
//       required: true
//     },
//     type: {
//       type: String,
//       enum: ['multiple_choice', 'true_false', 'fill_blank'],
//       required: true
//     },
//     options: [{
//       text: String,
//       isCorrect: Boolean
//     }],
//     correctAnswer: String, // for fill_blank type
//     explanation: String,
//     points: {
//       type: Number,
//       default: 1
//     }
//   }],
//   isPublished: {
//     type: Boolean,
//     default: false
//   }
// }, {
//   timestamps: true
// });





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
    
    return successResponse({
      message: 'Course created successfully',
      course: {
        id: course._id,
        title: course.title,
        status: course.status
      }
    }, res, 201);
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

    const course = await Course.findOne({ _id: courseId, createdBy: userId });
    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        course[key] = updateData[key];
      }
    });

    await course.save();

    return successResponse({
      message: 'Course updated successfully',
      course
    }, res, 200);
  } catch (error) {
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

// Lesson Controller (controllers/lessonController.js)
// Create Lesson
exports.createLesson = async (req, res) => {
  try {
    const { courseId, title, description, order } = req.body;
    const userId = req.user.id;

    // Verify course ownership
    const course = await Course.findOne({ _id: courseId, createdBy: userId });
    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    // Auto-assign order if not provided
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ courseId }).sort({ order: -1 });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    const lesson = new Lesson({
      title,
      description,
      courseId,
      order: lessonOrder
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

    const lesson = await Lesson.findById(lessonId).populate('courseId');
    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    if (lesson.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
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

// Module Controller (controllers/moduleController.js)
// Create Module
exports.createModule = async (req, res) => {
  try {
    const { lessonId, title, description, order, content } = req.body;
    const userId = req.user.id;

    // Verify lesson ownership
    const lesson = await Lesson.findById(lessonId).populate('courseId');
    if (!lesson) {
      return errorResponse('Lesson not found', 'NOT_FOUND', 404, res);
    }

    if (lesson.courseId.createdBy.toString() !== userId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 403, res);
    }

    // Auto-assign order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const lastModule = await Module.findOne({ lessonId }).sort({ order: -1 });
      moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }

    const module = new Module({
      title,
      description,
      lessonId,
      order: moduleOrder,
      content: content || {}
    });

    await module.save();

    return successResponse({
      message: 'Module created successfully',
      module
    }, res, 201);
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

    // Handle content updates properly
    if (updateData.content) {
      module.content = { ...module.content.toObject(), ...updateData.content };
      delete updateData.content;
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        module[key] = updateData[key];
      }
    });

    await module.save();

    return successResponse({
      message: 'Module updated successfully',
      module
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

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
    const userId = req.user.id;

    const course = await Course.findOne({ 
      _id: courseId, 
      createdBy: userId 
    });

    if (!course) {
      return errorResponse('Course not found or unauthorized', 'NOT_FOUND', 404, res);
    }

    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
    const lessonIds = lessons.map(lesson => lesson._id);

    const modules = await Module.find({ lessonId: { $in: lessonIds } }).sort({ order: 1 });
    const moduleIds = modules.map(module => module._id);

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } });

    // Structure the data
    const structuredLessons = lessons.map(lesson => {
      const lessonModules = modules.filter(module => 
        module.lessonId.toString() === lesson._id.toString()
      ).map(module => {
        const moduleQuizzes = quizzes.filter(quiz => 
          quiz.moduleId.toString() === module._id.toString()
        );
        return {
          ...module.toObject(),
          quizzes: moduleQuizzes
        };
      });

      return {
        ...lesson.toObject(),
        modules: lessonModules
      };
    });

    return successResponse({
      course: {
        ...course.toObject(),
        lessons: structuredLessons
      }
    }, res, 200);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};






