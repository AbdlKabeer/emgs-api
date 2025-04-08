// src/routes/tutor.routes.js
const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutor.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// Get all tutors - admin only endpoint
router.get('/', authenticate, tutorController.getAllTutors);

// Get specific tutor by ID
router.get('/:id', authenticate, tutorController.getTutorById);

// Get all courses created by a tutor
router.get('/:id/courses', authenticate, tutorController.getTutorCourses);

// Get tutor dashboard overview data
router.get('/:id/overview', authenticate, tutorController.getTutorOverview);

// Get top performing courses for a tutor
router.get('/:id/top-courses', authenticate, tutorController.getTopCourses);

// Get course progress statistics for a tutor
router.get('/:id/course-progress', authenticate, tutorController.getCourseProgress);

router.get('/top-rated', tutorController.getTopRatedTutors);

router.post('/:tutorId/rate', authenticate, tutorController.rateTutor);

module.exports = router;