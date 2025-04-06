// Create a new controller file: src/controllers/tutor.controller.js
const User = require('../models/user.model');
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