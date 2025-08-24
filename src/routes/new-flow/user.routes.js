const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const studentCourseController = require('../../controllers/new-flow/user.controller');


const { body, param, query } = require('express-validator');

// Validation middlewares
const enrollmentValidation = [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
];

const moduleCompleteValidation = [
  param('moduleId').isMongoId().withMessage('Invalid module ID'),
];

const quizSubmissionValidation = [
  param('quizId').isMongoId().withMessage('Invalid quiz ID'),
  body('answers').isObject().withMessage('Answers must be an object'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

const courseSearchValidation = [
  ...paginationValidation,
  query('category').optional().isString().withMessage('Category must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('isFree').optional().isBoolean().withMessage('isFree must be a boolean'),
  query('sortBy').optional().isIn(['createdAt', 'title', 'price', 'enrollmentCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

// ===================
// COURSE DISCOVERY ROUTES
// ===================


router.get('/tutors', 
  authenticate,
  studentCourseController.getAllTutors
);


/**
 * @route   GET /api/student/courses
 * @desc    Get all published courses with search and filters
 * @access  Public (can be accessed without authentication for browsing)
 */
router.get('/courses', 
  authenticate,
  courseSearchValidation,
  studentCourseController.getAllCourses
);

/**
 * @route   GET /api/v2/student/courses/:courseId/preview
 * @desc    Get course preview (without full content)
 * @access  Public
 */
router.get('/courses/:courseId/preview',
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  authenticate,
  studentCourseController.getCoursePreview
);

// ===================
// ENROLLMENT ROUTES
// ===================

/**
 * @route   POST /api/v2/student/courses/:courseId/enroll
 * @desc    Enroll in a course
 * @access  Private (Student)
 */
router.post('/courses/:courseId/enroll',
  authenticate,
  enrollmentValidation,
  studentCourseController.enrollInCourse
);

/**
 * @route   GET /api/v2/student/my-courses
 * @desc    Get student's enrolled courses
 * @access  Private (Student)
 */
router.get('/my-courses',
  authenticate,
  paginationValidation,
  query('status').optional().isIn(['active', 'completed', 'suspended']).withMessage('Invalid status'),
  studentCourseController.getMyEnrolledCourses
);

// ===================
// LEARNING ROUTES
// ===================

/**
 * @route   GET /api/v2/student/courses/:courseId/content
 * @desc    Get enrolled course full content
 * @access  Private (Student - Must be enrolled)
 */
router.get('/courses/:courseId/content',
  authenticate,
  studentCourseController.getEnrolledCourseContent
);


router.get('/courses/:id', authenticate, studentCourseController.getCourseById);


/**
 * @route   POST /api/student/modules/:moduleId/complete
 * @desc    Mark module as complete
 * @access  Private (Student)
 */
router.post('/modules/:moduleId/complete',
  authenticate,
  moduleCompleteValidation,
  studentCourseController.markModuleComplete
);

// ===================
// QUIZ ROUTES
// ===================

/**
 * @route   GET /api/student/quizzes/:quizId
 * @desc    Get quiz questions (for taking the quiz)
 * @access  Private (Student - Must be enrolled in course)
 */
router.get('/quizzes/:quizId',
  authenticate,
  param('quizId').isMongoId().withMessage('Invalid quiz ID'),
  studentCourseController.takeQuiz
);

/**
 * @route   POST /api/student/quizzes/:quizId/submit
 * @desc    Submit quiz answers and get results
 * @access  Private (Student)
 */
router.post('/quizzes/:quizId/submit',
  authenticate,
  quizSubmissionValidation,
  studentCourseController.submitQuiz
);

/**
 * @route   GET /api/student/quizzes/:quizId/attempts
 * @desc    Get student's quiz attempts
 * @access  Private (Student)
 */
router.get('/quizzes/:quizId/attempts',
  authenticate,
  param('quizId').isMongoId().withMessage('Invalid quiz ID'),
  studentCourseController.getQuizAttempts
);

// ===================
// BOOKMARK ROUTES
// ===================

/**
 * @route   POST /api/student/courses/:courseId/bookmark
 * @desc    Toggle course bookmark
 * @access  Private (Student)
 */
router.post('/courses/:courseId/bookmark',
  authenticate,
  enrollmentValidation,
  studentCourseController.toggleBookmark
);

/**
 * @route   GET /api/student/bookmarks
 * @desc    Get bookmarked courses
 * @access  Private (Student)
 */
router.get('/bookmarks',
  authenticate,
  paginationValidation,
  studentCourseController.getBookmarkedCourses
);

// ===================
// DASHBOARD ROUTE
// ===================

/**
 * @route   GET /api/student/dashboard
 * @desc    Get student dashboard data
 * @access  Private (Student)
 */
router.get('/dashboard',
  authenticate,
  studentCourseController.getDashboard
);

// ===================
// PROGRESS ROUTES (Additional)
// ===================

/**
 * @route   GET /api/student/courses/:courseId/progress
 * @desc    Get detailed progress for a specific course
 * @access  Private (Student)
 */
router.get('/courses/:courseId/progress',
  authenticate,
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;
      
      const Progress = require('../models/progress.model');
      const Enrollment = require('../models/enrollment.model');
      
      // Verify enrollment
      const enrollment = await Enrollment.findOne({ 
        userId, 
        courseId, 
        status: 'active' 
      });

      if (!enrollment) {
        return errorResponse('Not enrolled in this course', 'NOT_ENROLLED', 403, res);
      }

      const progress = await Progress.findOne({ userId, courseId })
        .populate('completedModules')
        .populate('completedQuizzes');

      return successResponse({
        progress: progress || {
          userId,
          courseId,
          completedModules: [],
          completedQuizzes: [],
          progressPercentage: 0,
          lastAccessed: enrollment.enrolledAt
        }
      }, res, 200);
    } catch (error) {
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  }
);

// ===================
// CATEGORIES ROUTE (Helper)
// ===================

/**
 * @route   GET /api/student/categories
 * @desc    Get all course categories
 * @access  Public
 */
router.get('/categories',
  async (req, res) => {
    try {
      const Course = require('../models/course.model');
      const { successResponse } = require('../utils/custom_response/responses');
      
      const categories = await Course.distinct('category', { 
        isPublished: true, 
        status: 'published' 
      });
      
      return successResponse({
        categories: categories.filter(cat => cat) // Remove null/undefined values
      }, res, 200);
    } catch (error) {
      const { errorResponse } = require('../utils/custom_response/responses');
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  }
);

// ===================
// INSTRUCTOR INFO ROUTE
// ===================

/**
 * @route   GET /api/student/instructors/:instructorId
 * @desc    Get instructor profile and their courses
 * @access  Public
 */
router.get('/instructors/:instructorId',
  param('instructorId').isMongoId().withMessage('Invalid instructor ID'),
  paginationValidation,
  async (req, res) => {
    try {
      const { instructorId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const User = require('../models/user.model');
      const Course = require('../models/course.model');
      const { successResponse, errorResponse } = require('../utils/custom_response/responses');
      
      const instructor = await User.findById(instructorId)
        .select('firstName lastName profilePicture bio');
      
      if (!instructor) {
        return errorResponse('Instructor not found', 'NOT_FOUND', 404, res);
      }
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      };
      
      const courses = await Course.paginate({
        createdBy: instructorId,
        isPublished: true,
        status: 'published'
      }, options);
      
      return successResponse({
        instructor,
        courses: {
          docs: courses.docs,
          totalDocs: courses.totalDocs,
          limit: courses.limit,
          page: courses.page,
          totalPages: courses.totalPages,
          hasNextPage: courses.hasNextPage,
          hasPrevPage: courses.hasPrevPage
        }
      }, res, 200);
    } catch (error) {
      const { errorResponse } = require('../utils/custom_response/responses');
      return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
    }
  }
);





// Get all modules for a course
router.get('/courses/:courseId/modules', authenticate, studentCourseController.getCourseModules);

// Get all lessons for a module
router.get('/modules/:moduleId/lessons', authenticate, studentCourseController.getModuleLessons);



router.get('/lessons/:lessonId', authenticate, studentCourseController.getLessonById);

/**
 * @route   GET /api/student/lessons/:lessonId/quizzes
 * @desc    Get all quizzes for a lesson
 * @access  Private (Student - Must be enrolled in course)
 */
router.get('/lessons/:lessonId/quizzes',
  authenticate,
  param('lessonId').isMongoId().withMessage('Invalid lesson ID'),
  paginationValidation,
  studentCourseController.getLessonQuizzes
);

/**
 * @route   GET /api/student/modules/:moduleId/quizzes
 * @desc    Get all quizzes for a module
 * @access  Private (Student - Must be enrolled in course)
 */
router.get('/modules/:moduleId/quizzes',
  authenticate,
  param('moduleId').isMongoId().withMessage('Invalid module ID'),
  paginationValidation,
  studentCourseController.getModuleQuizzes
);


module.exports = router;