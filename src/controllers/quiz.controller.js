const Course = require('../models/course.model');
const Quiz = require('../models/quiz.model');
const QuizProgress = require('../models/quiz-progress.model');
const { 
  successResponse, 
  paginationResponse,
  badRequestResponse, 
  internalServerErrorResponse 
} = require('../utils/custom_response/responses');

// Admin: Create a new quiz
exports.createQuizOld = async (req, res) => {
  try {
    const { title, description, questions, courseId } = req.body;
    const userId = req.user.id;

    // Validate questions format
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return badRequestResponse('Quiz must have at least one question', 'VALIDATION_ERROR', 400, res);
    }

    // Ensure each question has the correct structure
    for (const question of questions) {
      if (!question.question || !question.options || !Array.isArray(question.options) || question.options.length < 2) {
        return badRequestResponse('Each question must have at least two options', 'VALIDATION_ERROR', 400, res);
      }

      // Check if at least one option is marked as correct
      const hasCorrectOption = question.options.some(option => option.isCorrect);
      if (!hasCorrectOption) {
        return badRequestResponse('Each question must have at least one correct option', 'VALIDATION_ERROR', 400, res);
      }
    }

    // Find course
      const course = await Course.findById(courseId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }

    const quiz = new Quiz({
      title,
      description,
      questions,
      courseId,
      createdBy: userId
    });

    await quiz.save();

    return successResponse(quiz, res, 201, 'Quiz created successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};




// Updated createQuiz controller function
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, questions, courseId } = req.body;
    const userId = req.user.id;

    // Validate questions format
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return badRequestResponse('Quiz must have at least one question', 'VALIDATION_ERROR', 400, res);
    }

    // Ensure each question has the correct structure based on its type
    for (const question of questions) {
      if (!question.question || !question.questionType) {
        return badRequestResponse('Each question must have content and a question type', 'VALIDATION_ERROR', 400, res);
      }

      switch (question.questionType) {
        case 'multipleChoice':
          // Multiple choice validation (multiple correct answers allowed)
          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            return badRequestResponse('Multiple choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
          }
          
          // Check if at least one option is marked as correct
          const hasCorrectOptionMultiple = question.options.some(option => option.isCorrect);
          if (!hasCorrectOptionMultiple) {
            return badRequestResponse('Multiple choice questions must have at least one correct option', 'VALIDATION_ERROR', 400, res);
          }
          break;
        
        case 'singleChoice':
          // Single choice validation (only one correct answer)
          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            return badRequestResponse('Single choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
          }
          
          // Count correct options
          const correctOptionsCount = question.options.filter(option => option.isCorrect).length;
          if (correctOptionsCount !== 1) {
            return badRequestResponse('Single choice questions must have exactly one correct option', 'VALIDATION_ERROR', 400, res);
          }
          break;
          
        case 'boolean':
          // Boolean validation
          if (question.booleanAnswer === undefined) {
            return badRequestResponse('Boolean questions must have a true or false answer', 'VALIDATION_ERROR', 400, res);
          }
          
          // Ensure options are set for boolean questions (True/False)
          question.options = [
            { option: 'True', isCorrect: question.booleanAnswer === true },
            { option: 'False', isCorrect: question.booleanAnswer === false }
          ];
          break;
          
        case 'fillInBlank':
          // Fill in the blank validation
          if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
            return badRequestResponse('Fill in the blank questions must have a correct answer string', 'VALIDATION_ERROR', 400, res);
          }
          
          // For fillInBlank, options might be empty or could contain potential answers
          if (!question.options) {
            question.options = [];
          }
          break;
          
        default:
          return badRequestResponse('Invalid question type. Must be multipleChoice, singleChoice, boolean, or fillInBlank', 'VALIDATION_ERROR', 400, res);
      }
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
    }

    const quiz = new Quiz({
      title,
      description,
      questions,
      courseId,
      createdBy: userId
    });

    await quiz.save();

    return successResponse(quiz, res, 201, 'Quiz created successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


// Admin: Update an existing quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, description, questions } = req.body;
    const userId = req.user.id;

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is the creator
    if (quiz.createdBy.toString() !== userId) {
      return badRequestResponse('Unauthorized to update this quiz', 'UNAUTHORIZED', 403, res);
    }

    // Validate questions format if provided
    if (questions) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return badRequestResponse('Quiz must have at least one question', 'VALIDATION_ERROR', 400, res);
      }

      // Ensure each question has the correct structure
      for (const question of questions) {
        if (!question.question || !question.options || !Array.isArray(question.options) || question.options.length < 2) {
          return badRequestResponse('Each question must have at least two options', 'VALIDATION_ERROR', 400, res);
        }

        // Check if at least one option is marked as correct
        const hasCorrectOption = question.options.some(option => option.isCorrect);
        if (!hasCorrectOption) {
          return badRequestResponse('Each question must have at least one correct option', 'VALIDATION_ERROR', 400, res);
        }
      }
    }

    // Update quiz
    quiz.title = title || quiz.title;
    quiz.description = description || quiz.description;
    quiz.questions = questions || quiz.questions;

    await quiz.save();

    return successResponse(quiz, res, 200, 'Quiz updated successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Admin: Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }

    // Check if user is the creator
    if (quiz.createdBy.toString() !== userId) {
      return badRequestResponse('Unauthorized to delete this quiz', 'UNAUTHORIZED', 403, res);
    }

    // Delete the quiz
    await Quiz.findByIdAndDelete(quizId);
    
    // Also delete all related progress records
    await QuizProgress.deleteMany({ quizId });

    return successResponse({
      message: 'Quiz and all related progress records deleted successfully'
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get all quizzes (admin can see all, regular users see only published)
exports.getAllCourseQuizzes = async (req, res) => {

  const { courseId } = req.params;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query based on search terms
    let query = {};
    
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const total = await Quiz.countDocuments({ courseId });
    const quizzes = await Quiz.find({ courseId })
      .select('-questions.options.isCorrect')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');
    
    return paginationResponse(
      quizzes,
      total,
      page,
      limit,
      res,
      'Quizzes retrieved successfully'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get a single quiz by ID (with questions but without correct answers)
exports.getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    const quiz = await Quiz.findById(quizId)
      .select('-questions.options.isCorrect') // Hide correct answers for users taking the quiz
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse(quiz, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get quiz with answers (for admin/creator only)
exports.getQuizWithAnswers = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    const quiz = await Quiz.findById(quizId)
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Only creator can see answers
    if (quiz.createdBy._id.toString() !== userId) {
      return badRequestResponse('Unauthorized to view quiz answers', 'UNAUTHORIZED', 403, res);
    }
    
    return successResponse(quiz, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// User: Submit quiz answers
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // [{ questionIndex: 0, selectedOptionIndex: 1 }, ...]
    const userId = req.user.id;
    
    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      return badRequestResponse('Answers must be provided as an array', 'VALIDATION_ERROR', 400, res);
    }
    
    // Get the quiz with correct answers
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if number of answers matches number of questions
    if (answers.length !== quiz.questions.length) {
      return badRequestResponse(
        `Number of answers (${answers.length}) doesn't match number of questions (${quiz.questions.length})`, 
        'VALIDATION_ERROR', 
        400, 
        res
      );
    }
    
    // Process the answers and calculate score
    let correctAnswers = 0;
    const processedAnswers = answers.map(answer => {
      const { questionIndex, selectedOptionIndex } = answer;
      
      // Validate indices
      if (
        questionIndex < 0 || 
        questionIndex >= quiz.questions.length || 
        selectedOptionIndex < 0 || 
        selectedOptionIndex >= quiz.questions[questionIndex].options.length
      ) {
        throw new Error('Invalid question or option index');
      }
      
      // Check if answer is correct
      const isCorrect = quiz.questions[questionIndex].options[selectedOptionIndex].isCorrect;
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        questionIndex,
        selectedOptionIndex,
        isCorrect
      };
    });
    
    // Calculate score as percentage
    const score = (correctAnswers / quiz.questions.length) * 100;
    
    // Create or update progress record
    let progress = await QuizProgress.findOne({ userId, quizId });
    
    if (progress) {
      // Existing progress - increment attempts and update if score is better
      progress.attempts += 1;
      progress.lastAttemptDate = new Date();
      
      if (score > progress.score) {
        progress.score = score;
        progress.correctAnswers = correctAnswers;
        progress.answers = processedAnswers;
      }
    } else {
      // New progress record
      progress = new QuizProgress({
        userId,
        quizId,
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers,
        completed: true,
        answers: processedAnswers,
        attempts: 1,
        lastAttemptDate: new Date()
      });
    }
    
    await progress.save();
    
    return successResponse({
      quizTitle: quiz.title,
      score,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      attempts: progress.attempts,
      answers: processedAnswers
    }, res, 200, 'Quiz submitted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// User: Get quiz progress
exports.getUserQuizProgress = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    const progress = await QuizProgress.findOne({ userId, quizId })
      .populate('quizId', 'title description');
    
    if (!progress) {
      return successResponse({
        message: 'No progress found for this quiz',
        hasAttempted: false
      }, res);
    }
    
    return successResponse({
      ...progress.toObject(),
      hasAttempted: true
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// User: Get all quiz progress
exports.getAllUserQuizProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const total = await QuizProgress.countDocuments({ userId });
    const progressRecords = await QuizProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('quizId', 'title description');
    
    return paginationResponse(
      progressRecords,
      total,
      page,
      limit,
      res,
      'Quiz progress records retrieved successfully'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Admin: Get quiz statistics
exports.getQuizStatistics = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is the creator
    if (quiz.createdBy.toString() !== userId) {
      return badRequestResponse('Unauthorized to view quiz statistics', 'UNAUTHORIZED', 403, res);
    }
    
    // Get all progress records for this quiz
    const progressRecords = await QuizProgress.find({ quizId })
      .populate('userId', 'name email');
    
    // Calculate statistics
    const totalAttempts = progressRecords.reduce((sum, record) => sum + record.attempts, 0);
    const averageScore = progressRecords.length > 0
      ? progressRecords.reduce((sum, record) => sum + record.score, 0) / progressRecords.length
      : 0;
    
    // Calculate question-specific statistics
    const questionStats = quiz.questions.map((question, questionIndex) => {
      // Count how many people got this question right
      const correctCount = progressRecords.reduce((count, record) => {
        const questionAnswer = record.answers.find(a => a.questionIndex === questionIndex);
        return questionAnswer && questionAnswer.isCorrect ? count + 1 : count;
      }, 0);
      
      // Calculate percentage correct
      const percentageCorrect = progressRecords.length > 0
        ? (correctCount / progressRecords.length) * 100
        : 0;
      
      return {
        question: question.question,
        correctCount,
        totalAttempts: progressRecords.length,
        percentageCorrect
      };
    });
    
    return successResponse({
      quizTitle: quiz.title,
      totalParticipants: progressRecords.length,
      totalAttempts,
      averageScore,
      questionStats,
      participants: progressRecords.map(record => ({
        userId: record.userId._id,
        name: record.userId.name,
        score: record.score,
        attempts: record.attempts,
        lastAttempt: record.lastAttemptDate
      }))
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};