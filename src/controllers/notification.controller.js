const Notification = require('../models/notification.model');
const notificationEmitter = require('../utils/notificationEmitter');
const {
  successResponse,
  badRequestResponse,
  paginationResponse,
  internalServerErrorResponse
} = require('../utils/custom_response/responses');

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    const total = await Notification.countDocuments({ userId });
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Use the new paginationResponse function
    return paginationResponse(
      notifications,
      total,
      page,
      limit,
      res,
      'Notifications retrieved successfully'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get a single notification by ID
exports.getNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return badRequestResponse('Notification not found', 'NOT_FOUND', 404, res);
    }

    // Mark as read if it wasn't already
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    return successResponse(notification, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return badRequestResponse('Notification not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(notification, res, 200, 'Notification marked as read');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return successResponse(null, res, 200, 'All notifications marked as read');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return badRequestResponse('Notification not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(null, res, 204, 'Notification deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Delete all notifications for a user
exports.deleteAllNotifications = async (req, res) => {
  try {
    // const userId = req.user.id;

    // await Notification.deleteMany({ userId });

    return successResponse(null, res, 204, "Notification deleted successfully");
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Create a notification (for admin/system use)
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, relatedItemId } = req.body;

    const notification = new Notification({
      userId,
      title,
      message,
      type: type || 'system',
      relatedItemId,
      isRead: false
    });

    await notification.save();

    // Emit notification for real-time updates
    notificationEmitter.emit('new-notification', notification);

    return successResponse(notification, res, 201, 'Notification created successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// SSE Stream for notifications
exports.getNotificationStream = async (req, res) => {
  const userId = req.user.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`SSE: User ${userId} connected to notification stream`);

  // Send initial unread notifications
  try {
    const unreadNotifications = await Notification.find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(50);

    res.write(`data: ${JSON.stringify({ type: 'initial', notifications: unreadNotifications })}\n\n`);
  } catch (error) {
    console.error('SSE Error sending initial notifications:', error);
  }

  // Handler for new notifications
  const onNewNotification = (notification) => {
    if (notification.userId.toString() === userId.toString()) {
      res.write(`data: ${JSON.stringify({ type: 'new', notification })}\n\n`);
    }
  };

  // Subscribe to emitter
  notificationEmitter.on('new-notification', onNewNotification);

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Handle client disconnection
  req.on('close', () => {
    console.log(`SSE: User ${userId} disconnected from notification stream`);
    notificationEmitter.removeListener('new-notification', onNewNotification);
    clearInterval(heartbeat);
    res.end();
  });
};