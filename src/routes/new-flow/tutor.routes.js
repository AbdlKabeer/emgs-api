// src/routes/course.routes.js
const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/new-flow/course.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { createCourseValidator,updateCourseValidator } = require('../../validators/new-flow/course.validator');
const { createLessonValidator,updateLessonValidator } = require('../../validators/new-flow/lesson.validator'); 
const { createModuleValidator,updateModuleValidator } = require('../../validators/new-flow/module.validator'); 
const { createQuizValidator,addQuestionValidator } = require('../../validators/new-flow/quiz.validator'); 
const tutorController = require('../../controllers/tutor.controller');
const {
    registerValidator,
  } = require('../../validators/tutor.validator');



router.get('/courses',authenticate, courseController.getAllCourses);

// Create a new course
router.post('/courses', authenticate, createCourseValidator, courseController.createCourse);

// Update an existing course
router.put('/courses/:courseId', authenticate, updateCourseValidator, courseController.updateCourse);

// Submit course for review
router.post('/:courseId/submit', authenticate, courseController.submitCourseForReview);

// Get course details with lessons, modules, and quizzes
router.get('/courses/:courseId', [], courseController.getCourseDetails);

router.post('/lessons', authenticate, createLessonValidator, courseController.createLesson);

// Update an existing lesson
router.put('/lessons/:lessonId', authenticate, updateLessonValidator, courseController.updateLesson);

router.post('/modules', authenticate, createModuleValidator, courseController.createModule);

// Update an existing module
router.put('/modules/:moduleId', authenticate, updateModuleValidator, courseController.updateModule);

router.post('/quizzes', authenticate, createQuizValidator, courseController.createQuizAdded);

// Add a question to a quiz
router.post('/quizzes/:quizId/questions', authenticate, addQuestionValidator, courseController.addQuizQuestion);


// Register a new tutor
router.post('/register',registerValidator, tutorController.registerTutor);

module.exports = router;