const Course = require('../models/course.model');
const Quiz = require('../models/quiz.model');
const QuizProgress = require('../models/quiz-progress.model');
const Question = require('../models/question.model');
const Module = require('../models/module.model');
const { 
  successResponse, 
  paginationResponse,
  badRequestResponse, 
  internalServerErrorResponse 
} = require('../utils/custom_response/responses');



// Controller Functions
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
      courseId,
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



// Update an existing quiz
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

    // Check if user has permission to update this quiz
    if (quiz.createdBy.toString() !== userId) {
      return badRequestResponse('You are not authorized to update this quiz', 'AUTHORIZATION_ERROR', 403, res);
    }

    // Update basic quiz info
    if (title) quiz.title = title;
    if (description) quiz.description = description;

    // Handle question updates if provided
    if (questions && Array.isArray(questions)) {
      // Validate questions format
      if (questions.length === 0) {
        return badRequestResponse('Quiz must have at least one question', 'VALIDATION_ERROR', 400, res);
      }

      // Store existing question IDs before making changes
      const existingQuestionIds = [...quiz.questions];
      
      // Clear existing questions from quiz
      quiz.questions = [];
      
      // Track new questions to link to quiz
      const questionDocs = [];
      
      for (let i = 0; i < questions.length; i++) {
        const questionData = questions[i];
        
        // Validate question based on type
        if (!questionData.question || !questionData.questionType) {
          return badRequestResponse('Each question must have content and a question type', 'VALIDATION_ERROR', 400, res);
        }

        // Detailed validation based on question type
        switch (questionData.questionType) {
          case 'multipleChoice':
            // Multiple choice validation (multiple correct answers allowed)
            if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
              return badRequestResponse('Multiple choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
            }
            
            // Check if at least one option is marked as correct
            const hasCorrectOptionMultiple = questionData.options.some(option => option.isCorrect);
            if (!hasCorrectOptionMultiple) {
              return badRequestResponse('Multiple choice questions must have at least one correct option', 'VALIDATION_ERROR', 400, res);
            }
            break;
          
          case 'singleChoice':
            // Single choice validation (only one correct answer)
            if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
              return badRequestResponse('Single choice questions must have at least two options', 'VALIDATION_ERROR', 400, res);
            }
            
            // Count correct options
            const correctOptionsCount = questionData.options.filter(option => option.isCorrect).length;
            if (correctOptionsCount !== 1) {
              return badRequestResponse('Single choice questions must have exactly one correct option', 'VALIDATION_ERROR', 400, res);
            }
            break;
            
          case 'boolean':
            // Boolean validation
            if (questionData.booleanAnswer === undefined) {
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
              return badRequestResponse('Fill in the blank questions must have a correct answer string', 'VALIDATION_ERROR', 400, res);
            }
            
            // For fillInBlank, options might be empty or could contain potential answers
            if (!questionData.options) {
              questionData.options = [];
            }
            break;
            
          default:
            return badRequestResponse('Invalid question type. Must be multipleChoice, singleChoice, boolean, or fillInBlank', 'VALIDATION_ERROR', 400, res);
        }

        // Check if question has an ID (meaning it's an existing question)
        let question;
        if (questionData._id) {
          // Update existing question
          question = await Question.findById(questionData._id);
          if (!question || question.quizId.toString() !== quizId) {
            return badRequestResponse(`Question with ID ${questionData._id} not found or doesn't belong to this quiz`, 'NOT_FOUND', 404, res);
          }
          
          question.question = questionData.question;
          question.questionType = questionData.questionType;
          question.options = questionData.options || [];
          question.correctAnswer = questionData.correctAnswer;
          question.booleanAnswer = questionData.booleanAnswer;
          question.order = i + 1;
          
          await question.save();
        } else {
          // Create new question
          question = new Question({
            quizId: quiz._id,
            question: questionData.question,
            questionType: questionData.questionType,
            options: questionData.options || [],
            correctAnswer: questionData.correctAnswer,
            booleanAnswer: questionData.booleanAnswer,
            order: i + 1
          });
          
          await question.save();
        }
        
        questionDocs.push(question);
      }
      
      // Update the quiz with the question IDs
      quiz.questions = questionDocs.map(q => q._id);
      
      // Delete questions that are no longer part of the quiz
      const newQuestionIds = new Set(quiz.questions.map(id => id.toString()));
      const questionsToDelete = existingQuestionIds.filter(id => !newQuestionIds.has(id.toString()));
      
      if (questionsToDelete.length > 0) {
        await Question.deleteMany({ _id: { $in: questionsToDelete } });
      }
    }
    
    await quiz.save();
    
    // Fetch the complete updated quiz with populated questions
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

    return successResponse(populatedQuiz, res, 200, 'Quiz updated successfully');
  } catch (error) {
    console.log(error);
    return internalServerErrorResponse(error.message, res);
  }
};


// Admin: Update an existing quiz
exports.updateQuiz1 = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, description, questions } = req.body;
    const userId = req.user.id;
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is allowed to update this quiz
    if (quiz.createdBy.toString() !== userId && req.user.role !== 'admin') {
      return badRequestResponse('Not authorized to update this quiz', 'UNAUTHORIZED', 403, res);
    }
    
    // Update basic quiz fields
    if (title) quiz.title = title;
    if (description) quiz.description = description;
    
    // If questions are updated
    if (questions && Array.isArray(questions)) {
      // First, delete all existing questions for this quiz
      await Question.deleteMany({ quizId });
      
      // Create new questions
      const newQuestions = [];
      
      for (let i = 0; i < questions.length; i++) {
        const questionData = questions[i];
        
        // Apply the same validation as in createQuiz
        if (!questionData.question || !questionData.questionType) {
          return badRequestResponse('Each question must have content and a question type', 'VALIDATION_ERROR', 400, res);
        }
        
        // Similar validation as createQuiz for each question type
        // ...
        
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
        newQuestions.push(savedQuestion);
      }
      
      // Update quiz with new question IDs
      quiz.questions = newQuestions.map(q => q._id);
    }
    
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
    
    // Check if user is allowed to delete this quiz
    if (quiz.createdBy.toString() !== userId && req.user.role !== 'admin') {
      return badRequestResponse('Not authorized to delete this quiz', 'UNAUTHORIZED', 403, res);
    }
    
    // Delete all questions belonging to this quiz
    await Question.deleteMany({ quizId });
    
    // Delete progress records for this quiz
    await QuizProgress.deleteMany({ quizId });
    
    // Delete the quiz itself
    await Quiz.findByIdAndDelete(quizId);
    
    return successResponse(null, res, 200, 'Quiz and all related questions deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get all quizzes (admin can see all, regular users see only published)
exports.getAllCourseQuizzesOld = async (req, res) => {

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

// Get all quizzes (admin can see all, regular users see only published)
exports.getAllCourseQuizzes = async (req, res) => {
  const { courseId } = req.params;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query based on search terms
    let query = { courseId };
    
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const total = await Quiz.countDocuments(query);
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
// Get a single quiz by ID (with questions but without correct answers)
exports.getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    const isTeacher = req.user.role === 'teacher';
    
    let quizQuery = Quiz.findById(quizId)
      .populate('createdBy', 'name email');
    
    // If user is a student, hide correct answers
    if (!isTeacher) {
      quizQuery = quizQuery.populate({
        path: 'questions',
        select: 'question questionType options order',
        options: { sort: { order: 1 } },
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
    } else {
      // For teachers, show everything
      quizQuery = quizQuery.populate({
        path: 'questions',
        options: { sort: { order: 1 } }
      });
    }
    
    const quiz = await quizQuery;
    
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Get user's progress for this quiz if they're a student
    if (!isTeacher) {
      const progress = await QuizProgress.findOne({ userId, quizId });
      if (progress) {
        return successResponse({
          quiz,
          progress: {
            score: progress.score,
            attempts: progress.attempts,
            lastAttemptDate: progress.lastAttemptDate
          }
        }, res);
      }
    }
    
    return successResponse({ quiz }, res);
  } catch (error) {
    console.error('Get quiz error:', error);
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
exports.submitQuizOld = async (req, res) => {
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

exports.submitQuizk = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    
    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      return badRequestResponse('Answers must be provided as an array', 'VALIDATION_ERROR', 400, res);
    }
    
    // Get the quiz with questions
    const quiz = await Quiz.findById(quizId)
      .populate({
        path: 'questions',
        options: { sort: { order: 1 } } // Make sure questions are in order
      });
      
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
    const processedAnswers = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const questionId = question._id;
      const questionType = question.questionType;
      
      let isCorrect = false;
      let answerDetails = { questionId };
      
      switch (questionType) {
        case 'singleChoice':
          // Handle single choice (radio button selection)
          if (typeof answer.selectedOptionIndex !== 'number') {
            throw new Error(`Question ${index + 1}: Invalid answer format for single choice question`);
          }
          
          // Validate indices
          if (
            answer.selectedOptionIndex < 0 || 
            answer.selectedOptionIndex >= question.options.length
          ) {
            throw new Error(`Question ${index + 1}: Invalid option index`);
          }
          
          // Check if the selected option is correct
          isCorrect = question.options[answer.selectedOptionIndex].isCorrect;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndex: answer.selectedOptionIndex
          };
          break;
          
        case 'multipleChoice':
          // Handle multiple choice (checkbox selections)
          if (!Array.isArray(answer.selectedOptionIndices)) {
            throw new Error(`Question ${index + 1}: Invalid answer format for multiple choice question`);
          }
          
          // Validate indices
          for (const optionIndex of answer.selectedOptionIndices) {
            if (optionIndex < 0 || optionIndex >= question.options.length) {
              throw new Error(`Question ${index + 1}: Invalid option index ${optionIndex}`);
            }
          }
          
          // Calculate correctness:
          // 1. All correct options must be selected
          // 2. No incorrect options can be selected
          const correctOptionIndices = question.options
            .map((option, idx) => option.isCorrect ? idx : -1)
            .filter(idx => idx !== -1);
            
          const selectedCorrectly = correctOptionIndices.every(idx => 
            answer.selectedOptionIndices.includes(idx)
          );
          
          const noIncorrectSelections = answer.selectedOptionIndices.every(idx => 
            question.options[idx].isCorrect
          );
          
          isCorrect = selectedCorrectly && noIncorrectSelections;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndices: answer.selectedOptionIndices,
            correctOptionIndices: correctOptionIndices
          };
          break;
          
        case 'boolean':
          // Handle boolean (true/false) questions
          if (typeof answer.booleanAnswer !== 'boolean') {
            throw new Error(`Question ${index + 1}: Invalid answer format for boolean question`);
          }
          
          isCorrect = answer.booleanAnswer === question.booleanAnswer;
          answerDetails = {
            ...answerDetails,
            selectedAnswer: answer.booleanAnswer
          };
          break;
          
        case 'fillInBlank':
          // Handle fill in the blank (text input)
          if (typeof answer.textAnswer !== 'string') {
            throw new Error(`Question ${index + 1}: Invalid answer format for fill in the blank question`);
          }
          
          // Case insensitive comparison and trim whitespace
          const userAnswer = answer.textAnswer.trim().toLowerCase();
          const correctAnswer = question.correctAnswer.trim().toLowerCase();
          
          isCorrect = userAnswer === correctAnswer;
          answerDetails = {
            ...answerDetails,
            submittedAnswer: answer.textAnswer,
            correctAnswer: question.correctAnswer
          };
          break;
          
        default:
          throw new Error(`Question ${index + 1}: Unsupported question type: ${questionType}`);
      }
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        questionIndex: index,
        questionType,
        isCorrect,
        ...answerDetails
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



exports.submitQuizp = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    
    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      return badRequestResponse('Answers must be provided as an array', 'VALIDATION_ERROR', 400, res);
    }
    
    // Get the quiz with questions
    const quiz = await Quiz.findById(quizId)
      .populate({
        path: 'questions',
        options: { sort: { order: 1 } } // Make sure questions are in order
      });


    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    
    console.log(quiz.questions)
    console.log(quiz.questions.length)
    console.log(answers.length)
    console.log(answers)
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
    const processedAnswers = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const questionId = question._id;
      const questionType = question.questionType;
      
      let isCorrect = false;
      let answerDetails = { questionId };
      
      switch (questionType) {
        case 'singleChoice':
          // Handle single choice (radio button selection)
          if (typeof answer.selectedOptionIndex !== 'number') {
            throw new Error(`Question ${index + 1}: Invalid answer format for single choice question`);
          }
          
          // Validate indices
          if (
            answer.selectedOptionIndex < 0 || 
            answer.selectedOptionIndex >= question.options.length
          ) {
            throw new Error(`Question ${index + 1}: Invalid option index`);
          }
          
          // Check if the selected option is correct
          isCorrect = question.options[answer.selectedOptionIndex].isCorrect;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndex: answer.selectedOptionIndex
          };
          break;
          
        case 'multipleChoice':
          // Handle multiple choice (checkbox selections)
          if (!Array.isArray(answer.selectedOptionIndices)) {
            throw new Error(`Question ${index + 1}: Invalid answer format for multiple choice question`);
          }
          
          // Validate indices
          for (const optionIndex of answer.selectedOptionIndices) {
            if (optionIndex < 0 || optionIndex >= question.options.length) {
              throw new Error(`Question ${index + 1}: Invalid option index ${optionIndex}`);
            }
          }
          
          // Calculate correctness:
          // 1. All correct options must be selected
          // 2. No incorrect options can be selected
          const correctOptionIndices = question.options
            .map((option, idx) => option.isCorrect ? idx : -1)
            .filter(idx => idx !== -1);
            
          const selectedCorrectly = correctOptionIndices.every(idx => 
            answer.selectedOptionIndices.includes(idx)
          );
          
          const noIncorrectSelections = answer.selectedOptionIndices.every(idx => 
            question.options[idx].isCorrect
          );
          
          isCorrect = selectedCorrectly && noIncorrectSelections;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndices: answer.selectedOptionIndices,
            correctOptionIndices: correctOptionIndices
          };
          break;
          
        case 'boolean':
          // Handle boolean (true/false) questions
          if (typeof answer.booleanAnswer !== 'boolean') {
            throw new Error(`Question ${index + 1}: Invalid answer format for boolean question`);
          }
          
          isCorrect = answer.booleanAnswer === question.booleanAnswer;
          answerDetails = {
            ...answerDetails,
            selectedAnswer: answer.booleanAnswer
          };
          break;
          
        case 'fillInBlank':
          // Handle fill in the blank (text input)
          if (typeof answer.textAnswer !== 'string') {
            throw new Error(`Question ${index + 1}: Invalid answer format for fill in the blank question`);
          }
          
          // Case insensitive comparison and trim whitespace
          const userAnswer = answer.textAnswer.trim().toLowerCase();
          const correctAnswer = question.correctAnswer.trim().toLowerCase();
          
          isCorrect = userAnswer === correctAnswer;
          answerDetails = {
            ...answerDetails,
            submittedAnswer: answer.textAnswer,
            correctAnswer: question.correctAnswer
          };
          break;
          
        default:
          throw new Error(`Question ${index + 1}: Unsupported question type: ${questionType}`);
      }
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        questionIndex: index,
        questionType,
        isCorrect,
        ...answerDetails
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


exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    
    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      return badRequestResponse('Answers must be provided as an array', 'VALIDATION_ERROR', 400, res);
    }
    
    // Get the quiz with questions
    const quiz = await Quiz.findById(quizId)
      .populate({
        path: 'questions',
        options: { sort: { order: 1 } } // Make sure questions are in order
      });

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


    console.log(quiz.questions)
    
    // Process the answers and calculate score
    let correctAnswers = 0;
    const processedAnswers = [];

    // Map to convert client-side question IDs to indices for matching with quiz.questions
    const questionIdToIndexMap = quiz.questions.reduce((map, question, index) => {
      map[question._id.toString()] = index;
      return map;
    }, {});
    
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const questionId = answer.questionId;
      
      // Find corresponding question using the question ID
      const questionIndex = questionIdToIndexMap[questionId];
      
      if (questionIndex === undefined) {
        throw new Error(`Question with ID ${questionId} not found in quiz`);
      }
      
      const question = quiz.questions[questionIndex];
      const questionType = question.questionType;
      
      let isCorrect = false;
      let answerDetails = { questionId };
      
      switch (questionType) {
        case 'singleChoice':
          // Handle single choice with selectedOptionId
          if (!answer.selectedOptionId) {
            throw new Error(`Question ${questionIndex + 1}: Missing selectedOptionId for single choice question`);
          }
          
          // Find option index based on selectedOptionId
          const selectedOptionIndex = question.options.findIndex(
            option => option._id.toString() === answer.selectedOptionId
          );
          
          if (selectedOptionIndex === -1) {
            throw new Error(`Question ${questionIndex + 1}: Invalid option ID`);
          }
          
          // Check if the selected option is correct
          isCorrect = question.options[selectedOptionIndex].isCorrect;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndex,
            selectedOptionId: answer.selectedOptionId
          };
          break;
          
        case 'multipleChoice':
          // Handle multiple choice with selectedOptionIds array
          if (!Array.isArray(answer.selectedOptionIds)) {
            throw new Error(`Question ${questionIndex + 1}: Invalid answer format for multiple choice question`);
          }
          
          // Map selected option IDs to indices
          const selectedOptionIndices = answer.selectedOptionIds.map(optionId => {
            const index = question.options.findIndex(
              option => option._id.toString() === optionId
            );
            if (index === -1) {
              throw new Error(`Question ${questionIndex + 1}: Invalid option ID ${optionId}`);
            }
            return index;
          });
          
          // Calculate correctness:
          // 1. All correct options must be selected
          // 2. No incorrect options can be selected
          const correctOptionIndices = question.options
            .map((option, idx) => option.isCorrect ? idx : -1)
            .filter(idx => idx !== -1);
            
          const selectedCorrectly = correctOptionIndices.every(idx => 
            selectedOptionIndices.includes(idx)
          );
          
          const noIncorrectSelections = selectedOptionIndices.every(idx => 
            question.options[idx].isCorrect
          );
          
          isCorrect = selectedCorrectly && noIncorrectSelections;
          answerDetails = {
            ...answerDetails,
            selectedOptionIndices,
            selectedOptionIds: answer.selectedOptionIds,
            correctOptionIndices
          };
          break;
          
        case 'boolean':
          // Handle boolean (true/false) questions with answer property
          if (typeof answer.answer !== 'boolean') {
            throw new Error(`Question ${questionIndex + 1}: Invalid answer format for boolean question`);
          }
          
          isCorrect = answer.answer === question.booleanAnswer;
          answerDetails = {
            ...answerDetails,
            selectedAnswer: answer.answer
          };
          break;
          
        case 'fillInBlank':
          // Handle fill in the blank with answer property
          if (typeof answer.answer !== 'string') {
            throw new Error(`Question ${questionIndex + 1}: Invalid answer format for fill in the blank question`);
          }
          
          // Case insensitive comparison and trim whitespace
          const userAnswer = answer.answer.trim().toLowerCase();
          const correctAnswer = question.correctAnswer.trim().toLowerCase();
          
          isCorrect = userAnswer === correctAnswer;
          answerDetails = {
            ...answerDetails,
            submittedAnswer: answer.answer,
            correctAnswer: question.correctAnswer
          };
          break;
          
        default:
          throw new Error(`Question ${questionIndex + 1}: Unsupported question type: ${questionType}`);
      }
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      processedAnswers.push({
        questionIndex,
        questionType,
        isCorrect,
        ...answerDetails
      });
    }
    
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
    console.error('Quiz submission error:', error);
    return internalServerErrorResponse(error.message, res);
  }
};


// Get all quizzes for a course
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const quizzes = await Quiz.find({ courseId })
      .select('title description createdAt')
      .populate('createdBy', 'name email');
    
    return successResponse(quizzes, res);
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


exports.getQuizStats = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return badRequestResponse('Quiz not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is authorized to see stats (creator or admin)
    if (quiz.createdBy.toString() !== userId && req.user.role !== 'admin') {
      return badRequestResponse('Not authorized to view quiz statistics', 'UNAUTHORIZED', 403, res);
    }
    
    // Get all progress records for this quiz
    const allProgress = await QuizProgress.find({ quizId })
      .populate('userId', 'name email');
    
    // Calculate overall statistics
    const totalAttempts = allProgress.reduce((sum, p) => sum + p.attempts, 0);
    const averageScore = allProgress.reduce((sum, p) => sum + p.score, 0) / (allProgress.length || 1);
    
    // Calculate per-question statistics
    const questionStats = [];
    
    // First get all questions for this quiz
    const questions = await Question.find({ quizId }).sort({ order: 1 });
    
    for (const question of questions) {
      const questionId = question._id;
      
      // Find all answers for this specific question
      const questionAnswers = allProgress.flatMap(p => 
        p.answers.filter(a => a.questionId.toString() === questionId.toString())
      );
      
      const correctCount = questionAnswers.filter(a => a.isCorrect).length;
      const incorrectCount = questionAnswers.length - correctCount;
      const correctPercentage = (correctCount / (questionAnswers.length || 1)) * 100;
      
      questionStats.push({
        questionId,
        questionText: question.question,
        questionType: question.questionType,
        correctCount,
        incorrectCount,
        correctPercentage,
        totalAnswers: questionAnswers.length
      });
    }
    
    return successResponse({
      quizTitle: quiz.title,
      totalStudents: allProgress.length,
      totalAttempts,
      averageScore,
      questionStats
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};