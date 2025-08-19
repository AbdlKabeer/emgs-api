// Fixed Module Model (Parent of Lesson)
const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Module = mongoose.model('Module', moduleSchema);
module.exports = Module;



// Routes (add these to your routes file)
/*
// In your routes file (e.g., courseRoutes.js)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth'); // Optional auth middleware

// Get all courses
router.get('/courses', authenticate, getAllCourses);

// Get all modules for a course
router.get('/courses/:courseId/modules', authenticate, getCourseModules);

// Get all lessons for a module
router.get('/modules/:moduleId/lessons', authenticate, getModuleLessons);

module.exports = router;
*/