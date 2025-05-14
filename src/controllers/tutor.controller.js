// Create a new controller file: src/controllers/tutor.controller.js
const User = require('../models/user.model');
const Course = require('../models/course.model');
const mongoose = require('mongoose');
const emailService = require('../services/email.service');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');



// Get all tutors
// exports.getAllTutors = async (req, res) => {
//   try {
//     const tutors = await User.find({ role: 'tutor' })
//       .select('-password -verificationCode -verificationCodeExpiry')
//       .sort({ fullName: 1 });

//     // Add rating information to each tutor
//     const tutorsWithRatings = tutors.map(tutor => {
//       const tutorObj = tutor.toObject();
//       tutorObj.averageRating = tutor.averageRating || 0;
//       tutorObj.totalRatings = tutor.ratings?.length || 0;
//       return tutorObj;
//     });

//     return successResponse(tutorsWithRatings, res, 200, 'Success');
//   } catch (error) {
//     console.error('Error fetching tutors:', error);

//     return internalServerErrorResponse('Server error when fetching tutors', res, 500);
//   }
// };
exports.getAllTutors = async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' })
      .select(`
        fullName email phone role profilePicture isVerified preferredLanguage
        notificationsEnabled enrolledCourses completedLessons completedCourses
        certificates certificateType certificate notifications serviceInquiries
        referralCode referralPointDisbursed referralPoints referrals
        averageRating isEmgsTutor ratings createdAt updatedAt bio
      `) // explicitly include fields
      .sort({ fullName: 1 });

    // Add rating info
    const tutorsWithRatings = tutors.map(tutor => {
      const tutorObj = tutor.toObject();
      tutorObj.averageRating = tutor.averageRating || 0;
      tutorObj.totalRatings = tutor.ratings?.length || 0;
      return tutorObj;
    });

    return successResponse(tutorsWithRatings, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return internalServerErrorResponse('Server error when fetching tutors', res, 500);
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
    
    // Add rating information to the tutor object
    const tutorWithRatings = tutor.toObject();
    tutorWithRatings.averageRating = tutor.averageRating || 0;
    tutorWithRatings.totalRatings = tutor.ratings?.length || 0;
    
    return successResponse(tutorWithRatings, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching tutor:', error);

    return internalServerErrorResponse('Server error when fetching tutor', res, 500);
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

exports.getCourseProgressold = async (req, res) => {
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

    // Get all published courses created by this tutor
    const courses = await Course.find({ createdBy: tutorId, isPublished: true });
    
    if (!courses || courses.length === 0) {
      return successResponse({ 
        inProgress: { count: 0, percentage: 0 },
        dropped: { count: 0, percentage: 0 },
        completed: { count: 0, percentage: 0 },
        totalStudents: 0,
        courses: []
      }, res, 200, 'No courses found for this tutor');
    }
    
    const courseIds = courses.map(course => course._id);
    
    // Find all users who are enrolled in any of these courses
    // We'll use aggregation to efficiently gather this data
    const enrolledUsers = await User.find(
      { enrolledCourses: { $in: courseIds } },
      'enrolledCourses completedLessons lastActive'
    );
    
    if (!enrolledUsers || enrolledUsers.length === 0) {
      return successResponse({ 
        inProgress: { count: 0, percentage: 0 },
        dropped: { count: 0, percentage: 0 },
        completed: { count: 0, percentage: 0 },
        totalStudents: 0,
        courses: courses.map(course => ({
          _id: course._id,
          title: course.title,
          studentsCount: 0,
          completionRate: 0
        }))
      }, res, 200, 'No students enrolled in courses by this tutor');
    }
    
    // Calculate progress metrics for each course and overall
    let inProgressCount = 0;
    let completedCount = 0;
    let droppedCount = 0;
    
    // Process course-specific stats
    const courseStats = await Promise.all(courses.map(async (course) => {
      // Find users enrolled in this specific course
      const courseEnrolledUsers = enrolledUsers.filter(user => 
        user.enrolledCourses.some(id => id.toString() === course._id.toString())
      );
      
      const studentsCount = courseEnrolledUsers.length;
      
      if (studentsCount === 0) {
        return {
          _id: course._id,
          title: course.title,
          studentsCount: 0,
          completionRate: 0
        };
      }
      
      let courseCompletedCount = 0;
      
      // Get all lessons for this course
      const courseLessons = course.lessons || [];
      
      // Check completion status for each enrolled user
      courseEnrolledUsers.forEach(user => {
        // If no lessons in course, we can't determine completion
        if (courseLessons.length === 0) return;
        
        // Check how many lessons the user has completed for this course
        const completedLessonsInCourse = user.completedLessons.filter(lessonId => 
          courseLessons.some(courseLesson => courseLesson.toString() === lessonId.toString())
        );
        
        const completionPercentage = (completedLessonsInCourse.length / courseLessons.length) * 100;
        
        // Consider a course completed if all lessons are completed
        if (completionPercentage === 100) {
          courseCompletedCount++;
          completedCount++;
        } 
        // If user hasn't been active in the last 30 days, consider them dropped
        else if (user.lastActive && (new Date() - user.lastActive) > (30 * 24 * 60 * 60 * 1000)) {
          droppedCount++;
        } 
        // Otherwise, they're in progress
        else {
          inProgressCount++;
        }
      });
      
      return {
        _id: course._id,
        title: course.title,
        studentsCount,
        completionRate: studentsCount > 0 ? (courseCompletedCount / studentsCount) * 100 : 0
      };
    }));
    
    // Count unique enrolled users across all courses
    // A user might be enrolled in multiple courses by the same tutor
    const uniqueEnrolledUserIds = new Set();
    enrolledUsers.forEach(user => {
      uniqueEnrolledUserIds.add(user._id.toString());
    });
    const totalStudents = uniqueEnrolledUserIds.size;
    
    // Calculate percentages
    const progressStats = {
      inProgress: {
        count: inProgressCount,
        percentage: totalStudents > 0 ? (inProgressCount / totalStudents) * 100 : 0
      },
      dropped: {
        count: droppedCount,
        percentage: totalStudents > 0 ? (droppedCount / totalStudents) * 100 : 0
      },
      completed: {
        count: completedCount,
        percentage: totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0
      },
      totalStudents,
      courses: courseStats
    };
    
    return successResponse(progressStats, res, 200, 'Course progress fetched successfully');
  } catch (error) {
    console.error('Error getting course progress:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};
// Get tutor by ID
exports.getTutorByIdNew = async (req, res) => {
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

    // Get the count of courses created by this tutor
    const courseCount = await Course.countDocuments({ createdBy: req.params.id });
    
    // Add courseCount and ensure rating info is included in response
    const tutorData = tutor.toObject();
    tutorData.courseCount = courseCount;
    tutorData.averageRating = tutor.averageRating || 0;
    tutorData.totalRatings = tutor.ratings?.length || 0;
    
    return successResponse(tutorData, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching tutor:', error);

    return internalServerErrorResponse('Server error when fetching tutor', res, 500);
  }
};


// Rate a tutor
exports.rateTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return badRequestResponse('Rating must be between 1 and 5', 'BAD_REQUEST', 400, res);
    }
    
    // Find the tutor
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user has enrolled in any of the tutor's courses
    const hasEnrolled = await Course.exists({
      createdBy: tutorId,
      enrolledUsers: userId
    });
    
    if (!hasEnrolled) {
      return badRequestResponse('You must be enrolled in at least one of the tutor\'s courses to rate them', 'BAD_REQUEST', 400, res);
    }
    
    // Check if user has already rated this tutor
    const existingRatingIndex = tutor.ratings?.findIndex(r => r.userId.toString() === userId);
    
    if (existingRatingIndex !== -1) {
      // Update existing rating
      tutor.ratings[existingRatingIndex] = {
        userId,
        rating,
        review: review || tutor.ratings[existingRatingIndex].review,
        createdAt: new Date()
      };
    } else {
      // Initialize ratings array if it doesn't exist
      if (!tutor.ratings) {
        tutor.ratings = [];
      }
      
      // Add new rating
      tutor.ratings.push({
        userId,
        rating,
        review,
        createdAt: new Date()
      });
    }
    
    // Calculate new average rating
    tutor.averageRating = tutor.calculateAverageRating();
    
    await tutor.save();
    
    return successResponse({ 
      averageRating: tutor.averageRating 
    }, res, 200, 'Tutor rated successfully');
  } catch (error) {
    console.error('Error rating tutor:', error);
    return internalServerErrorResponse('Server error while rating tutor', res, 500);
  }
};

// Get tutor ratings
exports.getTutorRatings = async (req, res) => {
  try {
    const { tutorId } = req.params;
    
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' })
      .select('ratings averageRating')
      .populate('ratings.userId', 'fullName profilePicture');
    
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({
      averageRating: tutor.averageRating || 0,
      totalRatings: tutor.ratings?.length || 0,
      ratings: tutor.ratings || []
    }, res, 200, 'Tutor ratings fetched successfully');
  } catch (error) {
    console.error('Error getting tutor ratings:', error);
    return internalServerErrorResponse('Server error while fetching tutor ratings', res, 500);
  }
};


// Get top-rated tutors
exports.getTopRatedTutors = async (req, res) => {
  try {
    // Find tutors with ratings, sort by averageRating (highest first)
    const topTutors = await User.find({ 
      role: 'tutor',
      averageRating: { $gt: 0 } // only tutors with ratings
    })
    .select('fullName profilePicture bio averageRating')
    .sort({ averageRating: -1, 'ratings.length': -1 })
    .limit(5);
    
    return successResponse(topTutors, res, 200, 'Top tutors fetched successfully');
  } catch (error) {
    console.error('Error getting top tutors:', error);
    return internalServerErrorResponse('Server error while fetching top tutors', res, 500);
  }
};


// Helper function to generate a verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate a unique referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase() + 
         Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Register new tutor
exports.registerTutor = async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password, 
      phone, 
      bio, 
      preferredLanguage, 
      proficiency,
      certificateType,
      certificate,
      introduction,
      referralCode 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return badRequestResponse('User already exists with this email', 'BAD_REQUEST', 400, res);
    }

    // Create new tutor
    const tutor = new User({
      fullName,
      email,
      password,
      phone,
      bio,
      preferredLanguage,
      proficiency,
      certificateType,
      certificate,
      introduction,
      role: 'tutor',
      referralCode: generateReferralCode(),
    });

    // Handle referral if provided
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        tutor.referredBy = referrer._id;
      }
    }

    // // Generate verification code
    // const verificationCode = generateVerificationCode();
    // tutor.verificationCode = verificationCode;
    // tutor.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await tutor.save();

    // // Send verification email with code
    // try {
    //   await emailService.sendVerificationCodeEmail(tutor.email, tutor.fullName, verificationCode);
    // } catch (error) {
    //   console.error('Error sending verification email:', error);
    // }

    return successResponse(
      { userId: tutor._id}, 
      res, 
      201, 
      'Tutor registered successfully.'
    );
  } catch (error) {
    console.error(error);
    return internalServerErrorResponse(error.message, res);
  }
};

// Update tutor profile
exports.updateTutorProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      bio, 
      preferredLanguage, 
      profilePicture
    } = req.body;

    // Find the tutor
    const tutor = await User.findById(userId);
    
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }

    if (tutor.role !== 'tutor') {
      return badRequestResponse('User is not a tutor', 'UNAUTHORIZED', 401, res);
    }

    // Update fields
    if (bio) tutor.bio = bio;
    if (preferredLanguage) tutor.preferredLanguage = preferredLanguage;
    if (profilePicture) tutor.profilePicture = profilePicture;

    await tutor.save();

    return successResponse(
      { tutor: { 
        _id: tutor._id,
        fullName: tutor.fullName,
        email: tutor.email,
        bio: tutor.bio,
        preferredLanguage: tutor.preferredLanguage,
        profilePicture: tutor.profilePicture,
        averageRating: tutor.averageRating
      }}, 
      res, 
      200, 
      'Tutor profile updated successfully'
    );
  } catch (error) {
    console.error(error);
    return internalServerErrorResponse(error.message, res);
  }
};

// Get tutor profile
exports.getTutorProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const tutor = await User.findById(userId)
      .select('-password -verificationCode -verificationCodeExpiry');
    
    if (!tutor) {
      return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }

    if (tutor.role !== 'tutor') {
      return badRequestResponse('User is not a tutor', 'UNAUTHORIZED', 401, res);
    }

    return successResponse({ tutor }, res, 200, 'Tutor profile retrieved successfully');
  } catch (error) {
    console.error(error);
    return internalServerErrorResponse(error.message, res);
  }
};


/**
 * Add an EMGS verified tutor (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addEmgsTutor = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      bio,
      preferredLanguage,
      // Add other fields as needed
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Create new EMGS tutor user
    const newEmgsTutor = new User({
      fullName,
      email,
      password,
      phone,
      role: 'tutor',
      bio: bio || '',
      preferredLanguage: preferredLanguage || 'English',
      isEmgsTutor: true, // Mark as EMGS tutor
      isVerified: true, // Auto-verify EMGS tutors
      // No verification code needed for admin-added tutors
    });

    await newEmgsTutor.save();

    return successResponse(
      {
        userId: newEmgsTutor._id,
        email: newEmgsTutor.email,
        fullName: newEmgsTutor.fullName,
        isEmgsTutor: true
      }, 
      res, 
      201, 
      'EMGS Tutor added successfully'
    );
  } catch (error) {
    console.error('Error adding EMGS tutor:', error);
    return internalServerErrorResponse(
      'Server error while adding EMGS tutor', 
      res, 
      500
    );
  }
};