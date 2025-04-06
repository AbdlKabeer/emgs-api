// Create a new routes file: src/routes/tutor.routes.js
const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutor.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Get all tutors route
router.get('/', tutorController.getAllTutors);

// Get specific tutor by ID
router.get('/:id', tutorController.getTutorById);

module.exports = router;