// Create a new controller file: src/controllers/tutor.controller.js
const User = require('../models/user.model');
const Course = require('../models/course.model');
const mongoose = require('mongoose');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');
// Get all tutors
exports.getAllTutors = async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' })
      .select('-password -verificationCode -verificationCodeExpiry')
      .sort({ fullName: 1 });

    return successResponse(tutors, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching tutors:', error);

    return internalServerErrorResponse('Server error when fetching tutors', res,500);
  }
};

// Get tutor by ID
exports.getTutorById = async (req, res) => {
  try {
    const tutor = await User.findOne({ 
      _id: req.params.id,
      role: 'tutor'
    }).select('-password -verificationCode -verificationCodeExpiry');
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }
    
    return successResponse(tutor, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching tutor:', error);

    return internalServerErrorResponse('Server error when fetching tutor', res,500);
  }
};


exports.getTutorCourses = async (req, res) => {
  try {
    const tutorId = req.params.id;
    
    // Validate request parameters
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return badRequestResponse('Invalid tutor ID format', 'BAD_REQUEST', 400, res);
     
    }

    // Check if the tutor exists
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }

    // Optional query parameters for filtering
    const { isPublished, category, sort } = req.query;
    
    // Build query
    const query = { createdBy: tutorId };
    
    // Add optional filters
    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }
    
    if (category) {
      query.category = category;
    }
    
    // Define sort options
    let sortOptions = {};
    if (sort) {
      switch (sort) {
        case 'recent':
          sortOptions = { createdAt: -1 };
          break;
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'popular':
          sortOptions = { 'enrolledUsers.length': -1 };
          break;
        case 'rating':
          sortOptions = { averageRating: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
    } else {
      sortOptions = { createdAt: -1 }; // Default sort by most recent
    }

    const courses = await Course.find(query)
      .sort(sortOptions)
      .populate('lessons', 'title duration')
      .populate('quizzes', 'title')
      .select('title description category thumbnail isPublished price averageRating enrolledUsers lessons quizzes createdAt');
    
    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error getting tutor courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tutor courses',
      error: error.message
    });
  }
};

exports.getTutorOverview = async (req, res) => {
  try {
    const tutorId = req.params.id;

    // Validate request parameters
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return badRequestResponse('Invalid tutor ID format', 'BAD_REQUEST', 400, res);
    }

    // Check if req.user is available and has _id
    console.log('req.user:', req.user); // Log user to see if it's populated
    if (!req.user || !req.user.id) {
      return badRequestResponse('User is not authenticated', 'BAD_REQUEST', 400, res);
    }

    // Verify user is requesting their own data or is an admin
    if (req.user.id.toString() !== tutorId && req.user.role !== 'admin') {
      return badRequestResponse('Access denied: You can only view your own dashboard', 'FORBIDDEN', 403, res);
    }

    // Get courses created by the tutor
    const courses = await Course.find({ createdBy: tutorId });

    // Get all enrolled student IDs (with duplicates)
    const allEnrolledStudents = courses.reduce((acc, course) => {
      return acc.concat(course.enrolledUsers);
    }, []);

    console.log('allEnrolledStudents:', allEnrolledStudents); // Log to debug

    // Count unique enrolled students
    const uniqueStudentIds = [...new Set(allEnrolledStudents.map(id => id.toString()))];
    const totalStudents = uniqueStudentIds.length;

    // Get active students (those who have enrolled in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Simplified active/inactive student calculation (adjust logic as needed)
    const activeStudents = Math.floor(totalStudents / 2); // Dummy value
    const inactiveStudents = totalStudents - activeStudents;

    return successResponse({
      totalStudents,
      studentStats: {
        active: activeStudents,
        inactive: inactiveStudents
      },
      totalCourses: courses.length,
      publishedCourses: courses.filter(course => course.isPublished).length,
      draftCourses: courses.filter(course => !course.isPublished).length
    }, res, 200, 'Success');

  } catch (error) {
    console.error('Error getting tutor overview:', error);
    return internalServerErrorResponse('Server error while fetching tutor overview data', res, 500);
  }
};


exports.getTopCourses = async (req, res) => {
  try {
    const tutorId = req.params.id;
    
    // Validate request parameters
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return badRequestResponse('Invalid tutor ID format', 'BAD_REQUEST', 400, res);
    }

    // Get courses created by the tutor
    const topCourses = await Course.find({ createdBy: tutorId, isPublished: true })
      .sort({ averageRating: -1, 'enrolledUsers.length': -1 })
      .limit(5)
      .select('title category thumbnail averageRating enrolledUsers');
    
    return successResponse(topCourses, res, 200, 'Top courses fetched successfully');
  } catch (error) {
    console.error('Error getting top courses:', error);
    return internalServerErrorResponse('Server error while fetching top courses', res, 500);
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const tutorId = req.params.id;
    
    // Validate request parameters
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return badRequestResponse('Invalid tutor ID format', 'BAD_REQUEST', 400, res);
    }

    // Verify user is requesting their own data or is an admin
    if (req.user.id.toString() !== tutorId && req.user.role !== 'admin') {
      return badRequestResponse('Access denied: You can only view your own course progress', 'FORBIDDEN', 403, res);
    }

    // This would require a more complex system to track student progress
    // The following is a simplified version based on the UI screenshot
    
    const courses = await Course.find({ createdBy: tutorId, isPublished: true });
    
    // This is dummy data - in a real application, you would query a progress tracking collection
    const progressStats = {
      inProgress: {
        count: 87,
        percentage: 55.0
      },
      dropped: {
        count: 21,
        percentage: 23.0
      },
      completed: {
        count: 21,
        percentage: 75.0
      }
    };
    
    return successResponse(progressStats, res, 200, 'Course progress fetched successfully');
  } catch (error) {
    console.error('Error getting course progress:', error);
    return internalServerErrorResponse('Server error while fetching course progress', res, 500);
  }
};