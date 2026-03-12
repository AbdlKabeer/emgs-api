const mongoose = require('mongoose');
const TutorRequest = require('../models/tutorRequest.model');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const Service = require('../models/service.model');
const Inquiry = require('../models/inquiry.model');
const Payment = require('../models/payment.model');
const Notification = require('../models/notification.model');
const { successResponse, errorResponse, validationErrorResponse , paginationResponse} = require('../utils/custom_response/responses');



// Get all tutor requests (admin only)
exports.getAllTutorRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const total = await TutorRequest.countDocuments(filter);
    const requests = await TutorRequest.find(filter)
      .populate('user', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return paginationResponse(requests, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Approve tutor request (admin only)
exports.approveTutorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const tutorRequest = await TutorRequest.findById(id);
    if (!tutorRequest) {
      return errorResponse('Tutor request not found', 'NOT_FOUND', 404, res);
    }

    if (tutorRequest.status !== 'pending') {
      return errorResponse('Request already processed', 'BAD_REQUEST', 400, res);
    }

    // Find user properly (FIXED HERE)
    const user = await User.findById(tutorRequest.user);
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Initialize roles if missing
    if (!user.roles || !Array.isArray(user.roles)) {
      user.roles = ['user'];
    }

    if (user.roles.includes('tutor')) {
      return errorResponse('User is already a tutor', 'BAD_REQUEST', 400, res);
    }

    // Update tutor request
    tutorRequest.status = 'approved';
    tutorRequest.reviewedBy = adminId;
    tutorRequest.reviewedAt = new Date();

    await tutorRequest.save();

    // Update user
    user.roles.push('tutor');
    user.isVerified = true;

    await user.save();

    return successResponse(tutorRequest, res, 200, 'Tutor request approved');

  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};
// Reject tutor request (admin only)
exports.rejectTutorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionMessage } = req.body;
    const adminId = req.user._id;
    const tutorRequest = await TutorRequest.findById(id);
    if (!tutorRequest) {
      return errorResponse('Tutor request not found', 'NOT_FOUND', 404, res);
    }
    if (tutorRequest.status !== 'pending') {
      return errorResponse('Request already processed', 'BAD_REQUEST', 400, res);
    }
    tutorRequest.status = 'rejected';
    tutorRequest.rejectionMessage = rejectionMessage || null;
    tutorRequest.reviewedBy = adminId;
    tutorRequest.reviewedAt = new Date();
    await tutorRequest.save();
    return successResponse(tutorRequest, res, 200, 'Tutor request rejected');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Approve tutor directly by user ID (admin only)
exports.approveTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const user = await User.findById(tutorId);
    
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    
    // Initialize roles array if it doesn't exist
    if (!user.roles || !Array.isArray(user.roles)) {
      user.roles = ['user'];
    }
    
    // Check if user has tutor role
    if (!user.roles.includes('tutor')) {
      return errorResponse('User is not a tutor', 'BAD_REQUEST', 400, res);
    }
    
    // Verify/approve the tutor
    user.isVerified = true;
    await user.save();
    
    // Send notification to tutor
    const notification = new Notification({
      user: user._id,
      title: 'Tutor Account Approved',
      message: 'Your tutor account has been verified and approved by the admin.',
      type: 'system'
    });
    await notification.save();
    
    return successResponse({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles,
      isVerified: user.isVerified,
      tutorType: user.tutorType
    }, res, 200, 'Tutor approved successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Reject/suspend tutor directly by user ID (admin only)
exports.rejectTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { reason, action } = req.body; // action: 'suspend' or 'revoke'
    
    const user = await User.findById(tutorId);
    
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    
    // Initialize roles array if it doesn't exist
    if (!user.roles || !Array.isArray(user.roles)) {
      user.roles = [user.role];
    }
    
    // Check if user has tutor role
    if (!user.roles.includes('tutor')) {
      return errorResponse('User is not a tutor', 'BAD_REQUEST', 400, res);
    }
    
    let message = '';
    
    if (action === 'revoke') {
      // Remove tutor role completely
      user.roles = user.roles.filter(role => role !== 'tutor');
      
      // If active role was tutor, switch to user
      if (user.role === 'tutor') {
        user.role = 'user';
      }
      
      message = `Your tutor role has been revoked. Reason: ${reason || 'Administrative decision'}`;
    } else {
      // Default: suspend (unverify)
      user.isVerified = false;
      message = `Your tutor account has been suspended. Reason: ${reason || 'Under review'}`;
    }
    
    await user.save();
    
    // Send notification to tutor
    const notification = new Notification({
      user: user._id,
      title: action === 'revoke' ? 'Tutor Role Revoked' : 'Tutor Account Suspended',
      message,
      type: 'system'
    });
    await notification.save();
    
    return successResponse({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles,
      isVerified: user.isVerified,
      action: action || 'suspend',
      reason: reason || null
    }, res, 200, action === 'revoke' ? 'Tutor role revoked successfully' : 'Tutor suspended successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    // Course stats
    const totalCourses = await Course.countDocuments();
    const totalLessons = await Lesson.countDocuments();
    
    // Enrollment stats
    const totalEnrollments = await Course.aggregate([
      {
        $project: {
          enrollmentCount: { $size: '$enrolledUsers' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$enrollmentCount' }
        }
      }
    ]);
    
    // Service stats
    const totalServices = await Service.countDocuments();
    const totalInquiries = await Inquiry.countDocuments();
    const pendingInquiries = await Inquiry.countDocuments({ status: 'new' });
    
    // Payment stats
    const totalPayments = await Payment.countDocuments({ status: 'completed' });
    const totalRevenue = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    return successResponse({
      users: {
        total: totalUsers,
        newToday: newUsersToday
      },
      courses: {
        total: totalCourses,
        lessons: totalLessons,
        enrollments: totalEnrollments.length > 0 ? totalEnrollments[0].total : 0
      },
      services: {
        total: totalServices,
        inquiries: totalInquiries,
        pending: pendingInquiries
      },
      payments: {
        total: totalPayments,
        revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      }
    }, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build search and filter query
    const filter = {};
    
    // Search functionality - search by name, email, or phone
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i'); // case-insensitive
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Filter by role
    if (req.query.role && ['user', 'tutor', 'admin'].includes(req.query.role)) {
      filter.roles = req.query.role;
    }

    // Filter by verification status
    if (req.query.isVerified) {
      filter.isVerified = req.query.isVerified === 'true';
    }

    // Filter by tutor type
    if (req.query.tutorType && ['emgs', 'partner'].includes(req.query.tutorType)) {
      filter.tutorType = req.query.tutorType;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await User.countDocuments(filter);

    // Sort options
    let sortOption = { createdAt: -1 }; // default: newest first
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'name':
          sortOption = { fullName: 1 };
          break;
        case 'email':
          sortOption = { email: 1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const users = await User.find(filter)
      .select('-password')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    return paginationResponse(users, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses');
    
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse(user, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName,
        lastName,
        email,
        phone,
        role,
        isVerified
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse(user, res,200, 'User updated successfully',);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({ message: 'User deleted successfully' }, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update tutorType for a tutor (admin only)
exports.updateTutorType = async (req, res) => {
  try {
    const { tutorType } = req.body;
    if (!tutorType) {
      return validationErrorResponse('tutorType is required', res);
    }
    // Find user and ensure they are a tutor
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }
    if (user.role !== 'tutor') {
      return errorResponse('User is not a tutor', 'BAD_REQUEST', 400, res);
    }
    user.tutorType = tutorType;
    await user.save();
    return successResponse(user, res, 200, 'Tutor type updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all payments (admin only)
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments();

    const payments = await Payment.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Convert _id to id in each payment
    const formattedPayments = payments.map(payment => {
      const paymentObj = payment.toObject();
      return {
        id: paymentObj._id,
        ...paymentObj
      };
    });

    return paginationResponse(formattedPayments, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};


// Get all payments for a specific user (admin only)
exports.getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Build filter
    const filter = { userId };
    if (req.query.status && ['pending', 'completed', 'failed', 'refunded'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.itemType && ['course', 'service', 'oneOnOne', 'one-on-one'].includes(req.query.itemType)) {
      filter.itemType = req.query.itemType;
    }

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('userId', 'fullName email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total revenue for this user
    const totalRevenue = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture
      },
      payments,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, res, 200, 'User payments fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Update payment status (admin only)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!payment) {
      return errorResponse('Payment not found', 'NOT_FOUND', 404, res);
    }
    
    // Notify user about payment status update
    const notification = new Notification({
      userId: payment.userId,
      title: 'Payment Update',
      message: `Your payment of ${payment.amount} ${payment.currency} has been ${status}`,
      type: 'payment',
      relatedItemId: payment._id
    });
    
    await notification.save();
    
    return successResponse(payment, res,200,'Payment status updated successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Send notification to users (admin only)
exports.sendNotification = async (req, res) => {
  try {
    const { users, title, message, type } = req.body;
    
    if (!users || !users.length) {
      return errorResponse('No users specified', 'BAD_REQUEST', 400, res);
    }
    
    // Create notifications for each user
    const notifications = users.map(userId => ({
      userId,
      title,
      message,
      type: type || 'system'
    }));
    
    await Notification.insertMany(notifications);
    
    return successResponse({
      message: 'Notifications sent successfully',
      count: notifications.length
    }, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get system analytics (admin only)
exports.getSystemAnalytics = async (req, res) => {
  try {
    // User growth over time
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Course enrollments over time
    const enrollmentTrend = await Course.aggregate([
      {
        $unwind: '$enrolledUsers'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'enrolledUsers',
          foreignField: '_id',
          as: 'userDocs'
        }
      },
      {
        $unwind: '$userDocs'
      },
      {
        $group: {
          _id: {
            year: { $year: '$userDocs.createdAt' },
            month: { $month: '$userDocs.createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Service inquiries by category
    const serviceInquiries = await Inquiry.aggregate([
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      {
        $unwind: '$service'
      },
      {
        $group: {
          _id: '$service.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { 'count': -1 } }
    ]);
    
    // Revenue by month
    const revenueByMonth = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    return successResponse({
      analytics: {
        userGrowth: userGrowth.map(item => ({
          year: item._id.year,
          month: item._id.month,
          count: item.count
        })),
        enrollmentTrend: enrollmentTrend.map(item => ({
          year: item._id.year,
          month: item._id.month,
          count: item.count
        })),
        serviceInquiries: serviceInquiries.map(item => ({
          category: item._id,
          count: item.count
        })),
        revenueByMonth: revenueByMonth.map(item => ({
          year: item._id.year,
          month: item._id.month,
          totalRevenue: item.total
        }))
      }
    }, res);

  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all tutors with optional filter by tutorType
exports.getAllTutors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { roles: 'tutor' };
    if (req.query.tutorType && ['emgs', 'partner'].includes(req.query.tutorType)) {
      filter.tutorType = req.query.tutorType;
    }
    
    // Filter by verification status
    if (req.query.status) {
      if (req.query.status === 'verified') {
        filter.isVerified = true;
      } else if (req.query.status === 'unverified') {
        filter.isVerified = false;
      }
      // If status is 'all' or any other value, don't add filter (show all)
    }
    
    const total = await User.countDocuments(filter);
    const tutors = await User.find(filter)
      .select('-password -verificationCode -verificationCodeExpiry -passwordVerificationCode -passwordVerificationCodeExpiry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return paginationResponse(tutors, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get single tutor by ID
exports.getTutorById = async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await User.findById(id)
      .select('-password -verificationCode -verificationCodeExpiry -passwordVerificationCode -passwordVerificationCodeExpiry')
      .populate('enrolledCourses', 'title thumbnail')
      .populate('completedCourses', 'title thumbnail');
    // Initialize roles array if it doesn't exist
    if (!tutor.roles || !Array.isArray(tutor.roles)) {
      tutor.roles = ['user'];
    }
    
    
    if (!tutor) {
      return errorResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    if (!tutor.roles.includes('tutor')) {
      return errorResponse('User is not a tutor', 'BAD_REQUEST', 400, res);
    }
    
    // Get courses created by this tutor
    const createdCourses = await Course.find({ createdBy: id })
      .select('title description thumbnail status enrollmentCount rating createdAt');
    
    return successResponse({
      tutor,
      createdCourses
    }, res, 200, 'Tutor fetched successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Get all courses of a specific tutor
exports.getTutorCourses = async (req, res) => {
  try {
    const { tutorId } = req.params;
    // Initialize roles array if it doesn't exist
    if (!tutor.roles || !Array.isArray(tutor.roles)) {
      tutor.roles = ['user'];
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Verify tutor exists
    const tutor = await User.findById(tutorId);
    if (!tutor) {
      return errorResponse('Tutor not found', 'NOT_FOUND', 404, res);
    }
    
    if (!tutor.roles.includes('tutor')) {
      return errorResponse('User is not a tutor', 'BAD_REQUEST', 400, res);
    }
    
    // Build filter
    const filter = { createdBy: tutorId };
    if (req.query.status && ['draft', 'review', 'published', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    
    const total = await Course.countDocuments(filter);
    const courses = await Course.find(filter)
      .populate('createdBy', 'fullName email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return paginationResponse(courses, total, page, limit, res);
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Approve and publish a tutor course
exports.approveTutorCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Update course status to published
    course.status = 'published';
    course.isPublished = true;
    course.rejectionMessage = null; // Clear any previous rejection message
    await course.save();
    
    // Optionally send notification to tutor
    try{
       const notification = new Notification({
        user: course.createdBy,
        title: 'Course Approved',
        message: `Your course "${course.title}" has been approved and published.`,
        type: 'course_approval'
      });
      await notification.save();
    }catch(err){
      console.error('Failed to send course approval notification:', err);
    }
   
    return successResponse(course, res, 200, 'Course approved and published successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};

// Reject a tutor course with rejection reason
exports.rejectTutorCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rejectionMessage } = req.body;
    
    if (!rejectionMessage) {
      return errorResponse('Rejection message is required', 'BAD_REQUEST', 400, res);
    }
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404, res);
    }
    
    // Update course status to rejected
    course.status = 'rejected';
    course.isPublished = false;
    course.rejectionMessage = rejectionMessage;
    await course.save();
    
    // Send notification to tutor
    try{
      const notification = new Notification({
        user: course.createdBy,
        title: 'Course Rejected',
        message: `Your course "${course.title}" has been rejected. Reason: ${rejectionMessage}`,
        type: 'system'
      });
      await notification.save();
    }catch(err){
      console.error('Failed to send course rejection notification:', err);
    }
    
    
    return successResponse(course, res, 200, 'Course rejected successfully');
  } catch (error) {
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500, res);
  }
};