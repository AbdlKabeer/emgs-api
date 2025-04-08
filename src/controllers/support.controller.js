// src/controllers/service.controller.js - continued
const Service = require('../models/service.model');
const User = require('../models/user.model');
const Inquiry = require('../models/inquiry.model');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');
const Support = require('../models/support.model');



// Submit a new support request
exports.submitSupportRequest = async (req, res) => {
  try {
    const { name, email, description } = req.body;
    
    // Validate required fields
    if (!name || !email || !description) {
      return badRequestResponse(
        'Please provide name, email, and description', 
        'VALIDATION_ERROR', 
        400, 
        res
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse(
        'Please provide a valid email address', 
        'VALIDATION_ERROR', 
        400, 
        res
      );
    }
    
    // Create support request
    const supportRequest = new Support({
      name,
      email,
      description,
      userId: req.user ? req.user.id : null // Add user ID if logged in
    });
    
    await supportRequest.save();
    
    // Send notification email to support team
    try {
      await sendEmail({
        to: process.env.SUPPORT_EMAIL || 'support@yourapp.com',
        subject: 'New Support Request',
        text: `
          New support request from ${name} (${email})
          
          Description:
          ${description}
          
          Request ID: ${supportRequest._id}
        `
      });
    } catch (emailError) {
      console.error('Failed to send support notification email:', emailError);
      // Continue processing even if email fails
    }
    
    // Send confirmation email to user
    try {
      await sendEmail({
        to: email,
        subject: 'Your Support Request Has Been Received',
        text: `
          Hi ${name},
          
          Thank you for contacting our support team. We've received your request and will get back to you as soon as possible.
          
          Your Request:
          ${description}
          
          Reference ID: ${supportRequest._id}
          
          Best regards,
          The Support Team
        `
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue processing even if email fails
    }
    
    return successResponse(
      { requestId: supportRequest._id },
      res,
      201,
      'Your support request has been submitted successfully. We will contact you soon.'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get all support requests (for admin/support staff)
exports.getAllSupportRequests = async (req, res) => {
  try {
    // Check if user has permission (admin or support staff)
    if (!req.user || !['admin', 'support'].includes(req.user.role)) {
      return badRequestResponse(
        'Not authorized to access support requests', 
        'UNAUTHORIZED', 
        403, 
        res
      );
    }
    
    // Query params for filtering
    const { status, priority, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Paginate results
    const skip = (page - 1) * limit;
    
    const supportRequests = await Support.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');
      
    const totalCount = await Support.countDocuments(query);
    
    return successResponse({
      requests: supportRequests,
      pagination: {
        totalRecords: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        limit: parseInt(limit)
      }
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get support requests by user ID (for logged-in users to see their requests)
exports.getUserSupportRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const supportRequests = await Support.find({ userId })
      .sort({ createdAt: -1 });
      
    return successResponse({ requests: supportRequests }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Update support request (for admin/support)
exports.updateSupportRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, priority, assignedTo, responseMessage } = req.body;
    
    // Check if user has permission
    if (!req.user || !['admin', 'support'].includes(req.user.role)) {
      return badRequestResponse(
        'Not authorized to update support requests', 
        'UNAUTHORIZED', 
        403, 
        res
      );
    }
    
    const supportRequest = await Support.findById(requestId);
    if (!supportRequest) {
      return badRequestResponse('Support request not found', 'NOT_FOUND', 404, res);
    }
    
    // Update fields if provided
    if (status) supportRequest.status = status;
    if (priority) supportRequest.priority = priority;
    if (assignedTo) supportRequest.assignedTo = assignedTo;
    
    // Add response if provided
    if (responseMessage) {
      supportRequest.responseDetails.push({
        respondedBy: req.user.id,
        message: responseMessage,
        timestamp: new Date()
      });
      
      // Send email to user about the response
      try {
        await sendEmail({
          to: supportRequest.email,
          subject: `Update on your Support Request`,
          text: `
            Hi ${supportRequest.name},
            
            We have an update on your support request:
            
            "${responseMessage}"
            
            Request Status: ${status || supportRequest.status}
            
            Reference ID: ${supportRequest._id}
            
            If you have any further questions, please reply to this email or submit a new request.
            
            Best regards,
            The Support Team
          `
        });
      } catch (emailError) {
        console.error('Failed to send update email:', emailError);
      }
    }
    
    await supportRequest.save();
    
    return successResponse(supportRequest, res, 200, 'Support request updated successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};