const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const Lesson = require('../../models/lesson.model');
const Module = require('../../models/module.model');
const Quiz = require('../../models/quiz.model');
const QuizProgress = require('../../models/quiz-progress.model');
const Question = require('../../models/question.model');
const Bookmark = require('../../models/bookmark.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse } = require('../../utils/custom_response/responses');



exports.getAllCourses = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user ? req.user.id : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    
    let query = { createdBy: userId };
    // let query = { isPublished: true, createdBy: userId };
    if (category) query.category = category;

    const total = await Course.countDocuments(query);

    const courses = await Course.find(query)
      .select('title description category thumbnail isFree price aboutCourse tutorId enrolledUsers ratings averageRating createdBy')
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

    // if (!isFree && (!price || price <= 0)) {
    //   return errorResponse('Price must be greater than 0 for paid courses', 'VALIDATION_ERROR', 400, res);
    // }

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

exports.createQuizAdded = async (req, res) => {
  try {
    const { title, description, questions, moduleId } = req.body;
    const userId = req.user.id;

    // Validate questions format
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return badRequestResponse('Quiz must have at least one question', 'VALIDATION_ERROR', 400, res);
    }

    // Find course
    const module = await Module.findById(moduleId);
    if (!module) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    // First, create the quiz without questions
    const quiz = new Quiz({
      title,
      description,
      moduleId,
      createdBy: userId,
      questions: [] // Will be populated with question IDs
    });
    
    await quiz.save();
    
    // Now create each question and link to the quiz
    const questionDocs = [];
    
    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      
      // Validate question based on type
      if (!questionData.question || !questionData.questionType) {
        // Delete the quiz we just created since we have an error
        await Quiz.findByIdAndDelete(quiz._id);
        // Delete any questions we've already created
        if (questionDocs.length > 0) {
          const questionIds = questionDocs.map(q => q._id);
          await Question.deleteMany({ _id: { $in: questionIds } });
        }
        return badRequestResponse('Each question must have content and a question type', 'VALIDATION_ERROR', 400, res);
      }

      // Detailed validation based on question type
      switch (questionData.questionType) {
        case 'multipleChoice':
          // Multiple choice validation (multiple correct answers allowed)
          if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Multiple choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
          }
          
          // Check if at least one option is marked as correct
          const hasCorrectOptionMultiple = questionData.options.some(option => option.isCorrect);
          if (!hasCorrectOptionMultiple) {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Multiple choice questions must have at least one correct option', 'VALIDATION_ERROR', 400, res);
          }
          break;
        
        case 'singleChoice':
          // Single choice validation (only one correct answer)
          if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Single choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
          }
          
          // Count correct options
          const correctOptionsCount = questionData.options.filter(option => option.isCorrect).length;
          if (correctOptionsCount !== 1) {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Single choice questions must have exactly one correct option', 'VALIDATION_ERROR', 400, res);
          }
          break;
          
        case 'boolean':
          // Boolean validation
          if (questionData.booleanAnswer === undefined) {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Boolean questions must have a true or false answer', 'VALIDATION_ERROR', 400, res);
          }
          
          // Ensure options are set for boolean questions (True/False)
          questionData.options = [
            { option: 'True', isCorrect: questionData.booleanAnswer === true },
            { option: 'False', isCorrect: questionData.booleanAnswer === false }
          ];
          break;
          
        case 'fillInBlank':
          // Fill in the blank validation
          if (!questionData.correctAnswer || typeof questionData.correctAnswer !== 'string') {
            await Quiz.findByIdAndDelete(quiz._id);
            if (questionDocs.length > 0) {
              const questionIds = questionDocs.map(q => q._id);
              await Question.deleteMany({ _id: { $in: questionIds } });
            }
            return badRequestResponse('Fill in the blank questions must have a correct answer string', 'VALIDATION_ERROR', 400, res);
          }
          
          // For fillInBlank, options might be empty or could contain potential answers
          if (!questionData.options) {
            questionData.options = [];
          }
          break;
          
        default:
          await Quiz.findByIdAndDelete(quiz._id);
          if (questionDocs.length > 0) {
            const questionIds = questionDocs.map(q => q._id);
            await Question.deleteMany({ _id: { $in: questionIds } });
          }
          return badRequestResponse('Invalid question type. Must be multipleChoice, singleChoice, boolean, or fillInBlank', 'VALIDATION_ERROR', 400, res);
      }

      // Create the Question document
      const question = new Question({
        quizId: quiz._id,
        question: questionData.question,
        questionType: questionData.questionType,
        options: questionData.options || [],
        correctAnswer: questionData.correctAnswer,
        booleanAnswer: questionData.booleanAnswer,
        order: i + 1
      });
      
      const savedQuestion = await question.save();
      questionDocs.push(savedQuestion);
    }
    
    // Update the quiz with the question IDs
    quiz.questions = questionDocs.map(q => q._id);
    await quiz.save();
    // Fetch the complete quiz with populated questions
    const populatedQuiz = await Quiz.findById(quiz._id)
    .populate({
      path: 'questions',
      select: 'question questionType options order correctAnswer booleanAnswer',
      // This transform function removes isCorrect from options when sending to client
      transform: doc => {
        if (doc.options && doc.options.length > 0) {
          // Create a deep copy of the document to avoid modifying the database object
          const docCopy = JSON.parse(JSON.stringify(doc));
          docCopy.options = docCopy.options.map(option => ({
            _id: option._id,
            option: option.option
            // isCorrect is intentionally omitted
          }));
          return docCopy;
        }
        return doc;
      }
    })
    .populate('createdBy', 'name email');

    return successResponse(populatedQuiz, res, 201, 'Quiz created successfully');
    } catch (error) {
    console.log(error);
    return internalServerErrorResponse(error.message, res);
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

// Comprehensive course creation endpoint
exports.createCourseWithContent = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { 
      title, 
      description, 
      category, 
      isFree, 
      price, 
      thumbnail, 
      goals, 
      notes,
      modules ,
      aboutCourse
    } = req.body;

    // get the completed value from query param
    const isSaveProgress = req.query.completed === 'false';

    
    // Validation
    if (!title || !description ) {
      return errorResponse('Title, description, and category are required', 'VALIDATION_ERROR', 400, res);
    }

    if (!isFree && (!price || price <= 0)) {
      return errorResponse('Price must be greater than 0 for paid courses', 'VALIDATION_ERROR', 400, res);
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return errorResponse('At least one module is required', 'VALIDATION_ERROR', 400, res);
    }
    // Create the course first
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
      status: isSaveProgress ? 'draft': 'review',
      isPublished: false,
      aboutCourse
    });
    
    await course.save();

    // Create modules, lessons, and quizzes
    const createdModules = [];
    
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
      const moduleData = modules[moduleIndex];
      
      // Create module
      const module = new Module({
        title: moduleData.title,
        description: moduleData.description,
        courseId: course._id,
        order: moduleData.order || moduleIndex + 1,
        isPublished: false
      });
      
      await module.save();
      
      // Create lessons for this module
      const createdLessons = [];
      
      if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
        for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
          const lessonData = moduleData.lessons[lessonIndex];
          
          const lesson = new Lesson({
            title: lessonData.title,
            description: lessonData.description,
            moduleId: module._id,
            order: lessonData.order || lessonIndex + 1,
            html_content: lessonData.html_content || '',
            isPublished: false
          });
          
          await lesson.save();
          
          // Create quizzes for this lesson
          const createdQuizzes = [];
          
          if (lessonData.quizzes && Array.isArray(lessonData.quizzes)) {
            for (let quizIndex = 0; quizIndex < lessonData.quizzes.length; quizIndex++) {
              const quizData = lessonData.quizzes[quizIndex];
              
              const quiz = new Quiz({
                title: quizData.title,
                description: quizData.description,
                moduleId: module._id,
                useTimer: quizData.useTimer || false,
                timeLimit: quizData.timeLimit || 0,
                passingScore: quizData.passingScore || 70,
                createdBy: userId
              });
              
              await quiz.save();
              
              // Create questions for this quiz
              const questionDocs = [];
              
              if (quizData.questions && Array.isArray(quizData.questions)) {
           
                for (let i = 0; i < quizData.questions.length; i++) {
                    const questionData = quizData.questions[i];
                    // console.log(questionData);
                    
                    // Validate question based on type
                    if (!questionData.question || !questionData.questionType) {
                      // Delete the quiz we just created since we have an error
                      await Quiz.findByIdAndDelete(quiz._id);
                      // Delete any questions we've already created
                      if (questionDocs.length > 0) {
                        const questionIds = questionDocs.map(q => q._id);
                        await Question.deleteMany({ _id: { $in: questionIds } });
                        console.log('Deleted questions:', questionIds);
                      }
                      return badRequestResponse('Each question must have content and a question type', 'VALIDATION_ERROR', 400, res);
                    }

                    // Detailed validation based on question type
                    switch (questionData.questionType) {
                      case 'multipleChoice':
                        // Multiple choice validation (multiple correct answers allowed)
                        if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Multiple choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
                        }
                        
                        // Check if at least one option is marked as correct
                        const hasCorrectOptionMultiple = questionData.options.some(option => option.isCorrect);
                        if (!hasCorrectOptionMultiple) {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Multiple choice questions must have at least one correct option', 'VALIDATION_ERROR', 400, res);
                        }
                        break;
                      
                      case 'singleChoice':
                        // Single choice validation (only one correct answer)
                        if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Single choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
                        }
                        
                        // Count correct options
                        const correctOptionsCount = questionData.options.filter(option => option.isCorrect).length;
                        if (correctOptionsCount !== 1) {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Single choice questions must have exactly one correct option', 'VALIDATION_ERROR', 400, res);
                        }
                        break;
                        
                      case 'boolean':
                        // Boolean validation
                        if (questionData.booleanAnswer === undefined) {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Boolean questions must have a true or false answer', 'VALIDATION_ERROR', 400, res);
                        }
                        
                        // Ensure options are set for boolean questions (True/False)
                        questionData.options = [
                          { option: 'True', isCorrect: questionData.booleanAnswer === true },
                          { option: 'False', isCorrect: questionData.booleanAnswer === false }
                        ];
                        break;
                        
                      case 'fillInBlank':
                        // Fill in the blank validation
                        if (!questionData.correctAnswer || typeof questionData.correctAnswer !== 'string') {
                          await Quiz.findByIdAndDelete(quiz._id);
                          if (questionDocs.length > 0) {
                            const questionIds = questionDocs.map(q => q._id);
                            await Question.deleteMany({ _id: { $in: questionIds } });
                          }
                          return badRequestResponse('Fill in the blank questions must have a correct answer string', 'VALIDATION_ERROR', 400, res);
                        }
                        
                        // For fillInBlank, options might be empty or could contain potential answers
                        if (!questionData.options) {
                          questionData.options = [];
                        }
                        break;
                        
                      default:
                        await Quiz.findByIdAndDelete(quiz._id);
                        if (questionDocs.length > 0) {
                          const questionIds = questionDocs.map(q => q._id);
                          await Question.deleteMany({ _id: { $in: questionIds } });
                        }
                        return badRequestResponse('Invalid question type. Must be multipleChoice, singleChoice, boolean, or fillInBlank', 'VALIDATION_ERROR', 400, res);
                    }

                    // Create the Question document
                    const question = new Question({
                      quizId: quiz._id,
                      question: questionData.question,
                      questionType: questionData.questionType,
                      options: questionData.options || [],
                      correctAnswer: questionData.correctAnswer,
                      booleanAnswer: questionData.booleanAnswer,
                      order: i + 1
                    });
                    
                    const savedQuestion = await question.save();
                    questionDocs.push(savedQuestion);
                  }
                  
                // Update the quiz with the question IDs
                quiz.questions = questionDocs.map(q => q._id);
                await quiz.save();
              }
              
              // Record quiz creation summary
              createdQuizzes.push({
                id: quiz._id,
                title: quiz.title,
                questionsCount: questionDocs.length
              });
            }
          }
          
          createdLessons.push({
            id: lesson._id,
            title: lesson.title,
            quizzesCount: createdQuizzes.length
          });
        }
      }
      
      createdModules.push({
        id: module._id,
        title: module.title,
        lessonsCount: createdLessons.length
      });
    }

    const modules_ = await Module.find({ courseId: course._id })
      .sort({ order: 1 })
      .lean();

    const moduleIds = modules_.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } })
      .sort({ order: 1 })
      .lean();

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } }).lean();
    const quizIds = quizzes.map(q => q._id);

    // Fetch all questions for the quizzes
    const questions = await Question.find({ quizId: { $in: quizIds } }).lean();

    // Attach questions to their quizzes
    const quizzesWithQuestions = quizzes.map(quiz => {
      const quizQuestions = questions.filter(q => q.quizId.toString() === quiz._id.toString());
      return {
        ...quiz,
        questions: quizQuestions
      };
    });

    // Now, structure the modules
    const structuredModules = modules_.map(module => {
      const moduleLessons = lessons.filter(lesson =>
        lesson.moduleId.toString() === module._id.toString()
      );

      const moduleQuizzes = quizzesWithQuestions.filter(quiz =>
        quiz.moduleId.toString() === module._id.toString()
      );

      return {
        ...module,
        lessons: moduleLessons,
        quizzes: moduleQuizzes
      };
    });

    return successResponse(
      {
        course: {
          id: course._id,
          title: course.title,
          description: course.description,
          category: course.category,
          isFree: course.isFree,
          price: course.price,
          thumbnail: course.thumbnail,
          goals: course.goals,
          notes: course.notes,
          status: course.status,
          isPublished: course.isPublished,
          createdBy: course.createdBy,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        },
        modules: structuredModules
      },
      res,
      201,
      'Course with content created successfully'
    );
    
  } catch (error) {
    console.error('Course creation error:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};







