// src/controllers/crm.controller.js
const Inquiry = require('../models/inquiry.model');
const User = require('../models/user.model');
const Service = require('../models/service.model');
const Notification = require('../models/notification.model');
const { sendWhatsAppMessage } = require('../services/whatsapp.service');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse ,
  paginationResponse
} = require('../utils/custom_response/responses');

// CRM Chat Endpoints
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');


// Get all active services (CRM)
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });
    return successResponse(services, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Send a message from CRM to a student
exports.sendMessageToStudent = async (req, res) => {
  try {
    const { studentId, content } = req.body;
    if (!studentId || !content) {
      return res.status(400).json({ message: 'studentId and content are required.' });
    }

    // Find or create a conversation between CRM and the student
    let conversation = await Conversation.findOne({
      participants: { $all: [studentId, 'CRM'] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [studentId, 'CRM'],
      });
    }

    // Create the message
    const message = await Message.create({
      conversation: conversation._id,
      sender: 'CRM',
      receiver: studentId,
      content,
      sentAt: new Date(),
    });

    res.status(201).json({ message: 'Message sent', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Get chat history between CRM and a student
exports.getChatWithStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required.' });
    }

    const conversation = await Conversation.findOne({
      participants: { $all: [studentId, 'CRM'] },
    });
    if (!conversation) {
      return res.status(404).json({ message: 'No conversation found.' });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ sentAt: 1 });

    res.json({ conversationId: conversation._id, messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chat', error: error.message });
  }
};

exports.getAllInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, serviceId } = req.query;
    
    let query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by service if provided
    if (serviceId) {
      query.serviceId = serviceId;
    }
    
    const total = await Inquiry.countDocuments(query);
    const inquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 });
    
    return paginationResponse(
      inquiries,
      total,
      page,
      limit,
      res,
      'Inquiries retrieved successfully'
      );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    
    if (!inquiry) {
      return badRequestResponse('Inquiry not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if user is admin or the owner of the inquiry
    if (req.user.role !== 'admin' && inquiry.userId.toString() !== req.user.id) {
      return badRequestResponse('Not authorized to view this inquiry', 'FORBIDDEN', 403, res);
    }
    
    return successResponse(inquiry, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, assignedTo, followupNeeded, followupDate } = req.body;
    
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      {
        status,
        assignedTo,
        followupNeeded,
        followupDate
      },
      { new: true }
    );
    
    if (!inquiry) {
      return badRequestResponse('Inquiry not found', 'NOT_FOUND', 404, res);
    }
    
    // If status changed to "in-progress", calculate response time
    if (status === 'in-progress' && inquiry.status !== 'in-progress') {
      const responseTime = Math.floor((Date.now() - inquiry.createdAt) / (1000 * 60)); // in minutes
      inquiry.responseTime = responseTime;
      await inquiry.save();
    }
    
    // Notify user about status change
    if (inquiry.userId) {
      const notification = new Notification({
        userId: inquiry.userId,
        title: 'Inquiry Status Update',
        message: `Your inquiry about ${inquiry.serviceName} has been updated to "${status}"`,
        type: 'service',
        relatedItemId: inquiry._id
      });
      
      await notification.save();
    }
    
    return successResponse({
      inquiry
    }, res,200,'Inquiry status updated successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


exports.getUserInquiries = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const inquiries = await Inquiry.find({ userId })
      .sort({ createdAt: -1 });
    
    return successResponse(inquiries, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};


exports.addInquiryResponse = async (req, res) => {
  try {
    const { response } = req.body;
    const inquiryId = req.params.id;
    
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return badRequestResponse('Inquiry not found', 'NOT_FOUND', 404, res);
    }
    

    inquiry.responses = inquiry.responses || [];
    inquiry.responses.push({
      message: response,
      timestamp: Date.now(),
      adminId: req.user.id
    });
    
    await inquiry.save();


    const user = await User.findById(inquiry.userId);
    if (user && user.phone) {
      await sendWhatsAppMessage(
        user.phone,
        `Response to your inquiry about ${inquiry.serviceName}: ${response}`
      );
    }
    
    return successResponse({
      inquiry
    }, res,200,'Response added successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get inquiries requiring follow-up (admin only)
exports.getFollowupInquiries = async (req, res) => {
  try {
    const currentDate = new Date();
    
    const inquiries = await Inquiry.find({
      followupNeeded: true,
      followupDate: { $lte: currentDate },
      status: { $ne: 'closed' }
    }).sort({ followupDate: 1 });
    
    return successResponse(inquiries, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get CRM analytics (admin only)
exports.getCRMAnalytics = async (req, res) => {
  try {
    // Total inquiries
    const totalInquiries = await Inquiry.countDocuments();
    
    // Inquiries by status
    const newInquiries = await Inquiry.countDocuments({ status: 'new' });
    const inProgressInquiries = await Inquiry.countDocuments({ status: 'in-progress' });
    const resolvedInquiries = await Inquiry.countDocuments({ status: 'resolved' });
    const closedInquiries = await Inquiry.countDocuments({ status: 'closed' });
    
    // Inquiries by service category
    const inquiriesByService = await Inquiry.aggregate([
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
      }
    ]);
    
    // Average response time
    const avgResponseTime = await Inquiry.aggregate([
      {
        $match: { responseTime: { $exists: true } }
      },
      {
        $group: {
          _id: null,
          averageTime: { $avg: '$responseTime' }
        }
      }
    ]);
    
    return successResponse({
      totalInquiries,
      byStatus: {
        new: newInquiries,
        inProgress: inProgressInquiries,
        resolved: resolvedInquiries,
        closed: closedInquiries
      },
      byService: inquiriesByService,
      averageResponseTime: avgResponseTime.length > 0 ? avgResponseTime[0].averageTime : 0
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};