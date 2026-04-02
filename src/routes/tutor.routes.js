// src/routes/tutor.routes.js
const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutor.controller');



const {
    registerValidator,
  } = require('../validators/tutor.validator');
const { authenticate, isAdmin, isTutor } = require('../middleware/auth.middleware');


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


// Register a new tutor
router.post('/register',registerValidator, tutorController.registerTutor);

// Update tutor profile (protected route)
router.put('/profile/:userId',[ authenticate,isTutor], tutorController.updateTutorProfile);

// Get tutor profile
router.get('/profile/:userId', tutorController.getTutorProfile);


// Admin route to add an EMGS verified tutor
router.post('/admin/add-emgs-tutor', [authenticate, isAdmin], tutorController.addEmgsTutor);

// List all active one-on-one sessions for the logged-in tutor
router.get('/me/active-sessions', authenticate, isTutor, tutorController.getMyActiveSessions);

// List all completed one-on-one sessions for the logged-in tutor
router.get('/me/completed-sessions', authenticate, isTutor, tutorController.getMyCompletedSessions);

// Tutor marks a user's session as completed
router.post('/me/complete-session', authenticate, isTutor, tutorController.markSessionCompleted);



// List all active service sessions for the logged-in tutor (service provider)
router.get('/me/active-service-sessions', authenticate, isTutor, tutorController.getMyActiveServiceSessions);

// List all completed service sessions for the logged-in tutor (service provider)
router.get('/me/completed-service-sessions', authenticate, isTutor, tutorController.getMyCompletedServiceSessions);

// Tutor marks a user's service session as completed
router.post('/me/complete-service-session', authenticate, isTutor, tutorController.markServiceSessionCompleted);


module.exports = router;