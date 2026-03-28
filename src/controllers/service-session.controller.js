const User = require('../models/user.model');
const Service = require('../models/service.model');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const Notification = require('../models/notification.model');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse,
  paginationResponse
} = require('../utils/custom_response/responses');

/**
 * Get all pending service sessions (Admin/Staff only)
 * Shows users who have purchased service sessions but haven't completed them yet
 */
exports.getPendingServiceSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, serviceId, userId } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const matchStage = {
      'serviceSubscriptions': { $exists: true, $not: { $size: 0 } }
    };

    // Get users with active service subscriptions
    const users = await User.aggregate([
      // Unwind the service subscriptions array
      { $unwind: '$serviceSubscriptions' },
      
      // Filter for active sessions only
      {
        $match: {
          'serviceSubscriptions.isActive': true,
          $or: [
            { 'serviceSubscriptions.expiry': null },
            { 'serviceSubscriptions.expiry': { $gte: new Date() } }
          ]
        }
      },

      // Optional: filter by specific service
      ...(serviceId ? [{ $match: { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) } }] : []),
      
      // Optional: filter by specific user
      ...(userId ? [{ $match: { _id: require('mongoose').Types.ObjectId(userId) } }] : []),

      // Lookup service details
      {
        $lookup: {
          from: 'services',
          localField: 'serviceSubscriptions.serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },

      // Lookup payment details
      {
        $lookup: {
          from: 'payments',
          localField: 'serviceSubscriptions.paymentId',
          foreignField: '_id',
          as: 'paymentDetails'
        }
      },
      { $unwind: { path: '$paymentDetails', preserveNullAndEmptyArrays: true } },

      // Project only needed fields
      {
        $project: {
          userId: '$_id',
          userName: '$fullName',
          userEmail: '$email',
          userPhone: '$phone',
          serviceId: '$serviceDetails._id',
          serviceName: '$serviceDetails.name',
          serviceCategory: '$serviceDetails.category',
          serviceProvider: '$serviceDetails.user',
          sessionPurchasedAt: '$serviceSubscriptions.purchasedAt',
          sessionExpiry: '$serviceSubscriptions.expiry',
          sessionIsActive: '$serviceSubscriptions.isActive',
          paymentAmount: '$paymentDetails.amount',
          paymentId: '$paymentDetails._id',
          paymentStatus: '$paymentDetails.status'
        }
      },

      // Sort by purchase date (newest first)
      { $sort: { sessionPurchasedAt: -1 } },

      // Pagination
      { $skip: skip },
      { $limit: limitNum }
    ]);

    // Get total count
    const totalPipeline = [
      { $unwind: '$serviceSubscriptions' },
      {
        $match: {
          'serviceSubscriptions.isActive': true,
          $or: [
            { 'serviceSubscriptions.expiry': null },
            { 'serviceSubscriptions.expiry': { $gte: new Date() } }
          ]
        }
      },
      ...(serviceId ? [{ $match: { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) } }] : []),
      ...(userId ? [{ $match: { _id: require('mongoose').Types.ObjectId(userId) } }] : []),
      { $count: 'total' }
    ];

    const totalResult = await User.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return paginationResponse(
      users,
      total,
      pageNum,
      limitNum,
      res,
      'Pending service sessions fetched successfully'
    );

  } catch (error) {
    console.error('Error fetching pending service sessions:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

/**
 * Mark service session as complete (Admin/Staff only)
 * This completes the service session and pays the service provider
 */
exports.completeServiceSession = async (req, res) => {
  try {
    const { userId, serviceId } = req.params;
    const { notes } = req.body;
    const staffId = req.user.id; // Admin/Staff who is marking it complete

    if (!userId || !serviceId) {
      return badRequestResponse('User ID and Service ID are required', 'MISSING_PARAMS', 400, res);
    }

    const user = await User.findById(userId);
    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    const service = await Service.findById(serviceId).populate('user', 'fullName email');
    if (!service) {
      return badRequestResponse('Service not found', 'NOT_FOUND', 404, res);
    }

    // Find active subscription with this service
    const subscriptionIndex = user.serviceSubscriptions.findIndex(sub =>
      sub.serviceId.toString() === serviceId &&
      sub.isActive &&
      (!sub.expiry || new Date(sub.expiry) > new Date())
    );

    if (subscriptionIndex === -1) {
      return badRequestResponse(
        'No active service session found for this user',
        'NOT_FOUND',
        404,
        res
      );
    }

    // Mark subscription as inactive (completed)
    user.serviceSubscriptions[subscriptionIndex].isActive = false;

    // Log session completion
    user.completedServiceSessions = user.completedServiceSessions || [];
    user.completedServiceSessions.push({
      serviceId: service._id,
      completedAt: new Date(),
      completedBy: staffId,
      notes: notes || ''
    });

    await user.save();

    // Award service provider their payment
    const serviceProvider = await User.findById(service.user);
    if (serviceProvider) {
      const sessionPrice = service.sessionPrice || service.price || 0;
      
      let wallet = await Wallet.findOne({ userId: service.user });
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = new Wallet({
          userId: service.user,
          balance: 0
        });
      }
      
      wallet.balance += sessionPrice;
      await wallet.save();
      
      // Log transaction
      const transaction = new Transaction({
        userId: service.user,
        type: 'earnings',
        walletId: wallet._id,
        amount: sessionPrice,
        status: 'completed',
        description: `Earnings from ${service.name} session with ${user.fullName}`,
        date: new Date()
      });

      await transaction.save();

      // Notify service provider about payment
      const providerNotification = new Notification({
        userId: service.user,
        title: 'Service Session Completed',
        message: `Your ${service.name} session with ${user.fullName} has been completed. ₦${sessionPrice.toFixed(2)} has been added to your wallet.`,
        type: 'service',
        relatedItemId: service._id
      });

      await providerNotification.save();
    }

    // Notify user about session completion
    const userNotification = new Notification({
      userId: user._id,
      title: 'Service Session Completed',
      message: `Your ${service.name} session has been marked as complete by our staff.`,
      type: 'service',
      relatedItemId: service._id
    });

    await userNotification.save();

    return successResponse(
      {
        userId: user._id,
        userName: user.fullName,
        serviceId: service._id,
        serviceName: service.name,
        completedAt: new Date(),
        completedBy: staffId
      },
      res,
      200,
      'Service session marked as complete successfully'
    );

  } catch (error) {
    console.error('Error completing service session:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

/**
 * Get completed service sessions (Admin/Staff only)
 */
exports.getCompletedServiceSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, serviceId, userId, startDate, endDate } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build match conditions
    const matchConditions = {
      'completedServiceSessions': { $exists: true, $not: { $size: 0 } }
    };

    const users = await User.aggregate([
      // Unwind completed service sessions
      { $unwind: '$completedServiceSessions' },

      // Optional: filter by date range
      ...(startDate || endDate ? [{
        $match: {
          'completedServiceSessions.completedAt': {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        }
      }] : []),

      // Optional: filter by service
      ...(serviceId ? [{
        $match: { 'completedServiceSessions.serviceId': require('mongoose').Types.ObjectId(serviceId) }
      }] : []),

      // Optional: filter by user
      ...(userId ? [{
        $match: { _id: require('mongoose').Types.ObjectId(userId) }
      }] : []),

      // Lookup service details
      {
        $lookup: {
          from: 'services',
          localField: 'completedServiceSessions.serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },

      // Lookup staff who completed it
      {
        $lookup: {
          from: 'users',
          localField: 'completedServiceSessions.completedBy',
          foreignField: '_id',
          as: 'staffDetails'
        }
      },
      { $unwind: { path: '$staffDetails', preserveNullAndEmptyArrays: true } },

      // Project
      {
        $project: {
          userId: '$_id',
          userName: '$fullName',
          userEmail: '$email',
          serviceId: '$serviceDetails._id',
          serviceName: '$serviceDetails.name',
          serviceCategory: '$serviceDetails.category',
          serviceProvider: '$serviceDetails.user',
          completedAt: '$completedServiceSessions.completedAt',
          completedBy: '$completedServiceSessions.completedBy',
          completedByName: '$staffDetails.fullName',
          notes: '$completedServiceSessions.notes'
        }
      },

      // Sort by completion date (newest first)
      { $sort: { completedAt: -1 } },

      // Pagination
      { $skip: skip },
      { $limit: limitNum }
    ]);

    // Get total count
    const totalPipeline = [
      { $unwind: '$completedServiceSessions' },
      ...(startDate || endDate ? [{
        $match: {
          'completedServiceSessions.completedAt': {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        }
      }] : []),
      ...(serviceId ? [{
        $match: { 'completedServiceSessions.serviceId': require('mongoose').Types.ObjectId(serviceId) }
      }] : []),
      ...(userId ? [{
        $match: { _id: require('mongoose').Types.ObjectId(userId) }
      }] : []),
      { $count: 'total' }
    ];

    const totalResult = await User.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return paginationResponse(
      users,
      total,
      pageNum,
      limitNum,
      res,
      'Completed service sessions fetched successfully'
    );

  } catch (error) {
    console.error('Error fetching completed service sessions:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

/**
 * Get service session details for a specific user
 */
exports.getUserServiceSessions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('fullName email serviceSubscriptions completedServiceSessions')
      .populate('serviceSubscriptions.serviceId', 'name category price sessionPrice')
      .populate('completedServiceSessions.serviceId', 'name category')
      .populate('completedServiceSessions.completedBy', 'fullName email');

    if (!user) {
      return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
    }

    // Filter active sessions
    const activeSessions = user.serviceSubscriptions.filter(sub => 
      sub.isActive && (!sub.expiry || new Date(sub.expiry) > new Date())
    );

    // Filter expired but not completed sessions
    const expiredSessions = user.serviceSubscriptions.filter(sub =>
      sub.isActive && sub.expiry && new Date(sub.expiry) <= new Date()
    );

    return successResponse(
      {
        user: {
          id: user._id,
          name: user.fullName,
          email: user.email
        },
        activeSessions,
        expiredSessions,
        completedSessions: user.completedServiceSessions,
        totalActive: activeSessions.length,
        totalCompleted: user.completedServiceSessions.length
      },
      res,
      200,
      'User service sessions fetched successfully'
    );

  } catch (error) {
    console.error('Error fetching user service sessions:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

/**
 * Get all users who have purchased a specific service (Admin/Staff only)
 * Shows both active and completed sessions for a service
 */
exports.getServiceUsers = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { page = 1, limit = 20, status = 'all' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return badRequestResponse('Service not found', 'NOT_FOUND', 404, res);
    }

    let matchConditions = {};

    // Build match based on status filter
    if (status === 'active') {
      matchConditions = {
        'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId),
        'serviceSubscriptions.isActive': true,
        $or: [
          { 'serviceSubscriptions.expiry': null },
          { 'serviceSubscriptions.expiry': { $gte: new Date() } }
        ]
      };
    } else if (status === 'completed') {
      matchConditions = {
        'completedServiceSessions.serviceId': require('mongoose').Types.ObjectId(serviceId)
      };
    } else {
      // 'all' - get users with either active or completed sessions
      matchConditions = {
        $or: [
          { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) },
          { 'completedServiceSessions.serviceId': require('mongoose').Types.ObjectId(serviceId) }
        ]
      };
    }

    // Aggregate to get unique users
    const users = await User.aggregate([
      { $match: matchConditions },
      
      // Project user details and filter sessions for this service
      {
        $project: {
          userId: '$_id',
          userName: '$fullName',
          userEmail: '$email',
          userPhone: '$phone',
          activeSessions: {
            $filter: {
              input: '$serviceSubscriptions',
              as: 'sub',
              cond: {
                $and: [
                  { $eq: ['$$sub.serviceId', require('mongoose').Types.ObjectId(serviceId)] },
                  { $eq: ['$$sub.isActive', true] },
                  {
                    $or: [
                      { $eq: ['$$sub.expiry', null] },
                      { $gte: ['$$sub.expiry', new Date()] }
                    ]
                  }
                ]
              }
            }
          },
          completedSessions: {
            $filter: {
              input: '$completedServiceSessions',
              as: 'session',
              cond: { $eq: ['$$session.serviceId', require('mongoose').Types.ObjectId(serviceId)] }
            }
          }
        }
      },

      // Add counts
      {
        $addFields: {
          activeSessionsCount: { $size: '$activeSessions' },
          completedSessionsCount: { $size: '$completedSessions' },
          totalSessions: { 
            $add: [
              { $size: '$activeSessions' }, 
              { $size: '$completedSessions' }
            ] 
          }
        }
      },

      // Sort by total sessions (most active users first)
      { $sort: { totalSessions: -1, userName: 1 } },

      // Pagination
      { $skip: skip },
      { $limit: limitNum }
    ]);

    // Get total count
    const totalResult = await User.countDocuments(matchConditions);

    return paginationResponse(
      users,
      totalResult,
      pageNum,
      limitNum,
      res,
      'Service users fetched successfully'
    );

  } catch (error) {
    console.error('Error fetching service users:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

/**
 * Get service session statistics (Admin/Staff only)
 * Provides overview of all service sessions
 */
exports.getServiceSessionStats = async (req, res) => {
  try {
    const { serviceId } = req.query;

    // Build match for service filter if provided
    const serviceMatch = serviceId 
      ? { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) }
      : {};

    // Get pending sessions count
    const pendingPipeline = [
      { $unwind: '$serviceSubscriptions' },
      {
        $match: {
          'serviceSubscriptions.isActive': true,
          $or: [
            { 'serviceSubscriptions.expiry': null },
            { 'serviceSubscriptions.expiry': { $gte: new Date() } }
          ],
          ...(serviceId && { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) })
        }
      },
      { $count: 'total' }
    ];

    const pendingResult = await User.aggregate(pendingPipeline);
    const pendingCount = pendingResult.length > 0 ? pendingResult[0].total : 0;

    // Get completed sessions count
    const completedPipeline = [
      { $unwind: '$completedServiceSessions' },
      {
        $match: {
          ...(serviceId && { 'completedServiceSessions.serviceId': require('mongoose').Types.ObjectId(serviceId) })
        }
      },
      { $count: 'total' }
    ];

    const completedResult = await User.aggregate(completedPipeline);
    const completedCount = completedResult.length > 0 ? completedResult[0].total : 0;

    // Get expired sessions count
    const expiredPipeline = [
      { $unwind: '$serviceSubscriptions' },
      {
        $match: {
          'serviceSubscriptions.isActive': true,
          'serviceSubscriptions.expiry': { $lt: new Date() },
          ...(serviceId && { 'serviceSubscriptions.serviceId': require('mongoose').Types.ObjectId(serviceId) })
        }
      },
      { $count: 'total' }
    ];

    const expiredResult = await User.aggregate(expiredPipeline);
    const expiredCount = expiredResult.length > 0 ? expiredResult[0].total : 0;

    // Get stats by service if no specific service requested
    let serviceBreakdown = null;
    if (!serviceId) {
      const serviceStats = await User.aggregate([
        { $unwind: '$serviceSubscriptions' },
        {
          $match: {
            'serviceSubscriptions.isActive': true,
            $or: [
              { 'serviceSubscriptions.expiry': null },
              { 'serviceSubscriptions.expiry': { $gte: new Date() } }
            ]
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: 'serviceSubscriptions.serviceId',
            foreignField: '_id',
            as: 'service'
          }
        },
        { $unwind: '$service' },
        {
          $group: {
            _id: '$service._id',
            serviceName: { $first: '$service.name' },
            serviceCategory: { $first: '$service.category' },
            pendingCount: { $sum: 1 }
          }
        },
        { $sort: { pendingCount: -1 } },
        { $limit: 10 }
      ]);

      serviceBreakdown = serviceStats;
    }

    const stats = {
      pending: pendingCount,
      completed: completedCount,
      expired: expiredCount,
      total: pendingCount + completedCount,
      ...(serviceBreakdown && { topServices: serviceBreakdown })
    };

    return successResponse(
      stats,
      res,
      200,
      'Service session statistics fetched successfully'
    );

  } catch (error) {
    console.error('Error fetching service session stats:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

module.exports = exports;
