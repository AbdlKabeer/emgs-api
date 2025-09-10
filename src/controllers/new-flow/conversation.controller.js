const Conversation = require('../../models/conversation.model');
const Message = require('../../models/message.model');
const User = require('../../models/user.model');
const { successResponse, errorResponse, badRequestResponse,internalServerErrorResponse, paginationResponse } = require('../../utils/custom_response/responses');

exports.createConversation = async (req, res) => {
  try {
    const { participants, type, title, description, courseId } = req.body;
    const userId = req.user.id; // Assuming user is authenticated


    console.log(req.body)

    // Validate participants
    if (!participants || participants.length === 0) {
      return badRequestResponse( 'At least one participant is required',null, 400,res);
    }

    // Add current user to participants if not included
    const allParticipants = [...new Set([userId, ...participants])];
    console.log(allParticipants)
    // For direct messages, limit to 2 participants
    if (type === 'direct' && allParticipants.length > 2) {
      return badRequestResponse('Direct messages can only have 2 participants',null, 400,res);
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = await Conversation.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 }
      });
      
      if (existingConversation) {
        return successResponse( existingConversation,res,200, 'Conversation already exists');
      }
    }

    const conversation = new Conversation({
      participants: allParticipants,
      type,
      title,
      description,
      courseId,
      createdBy: userId
    });


    console.log(conversation)
    console.log(conversation)
    console.log(conversation)

    await conversation.save();
    await conversation.populate('participants', 'name email avatar');

    return successResponse( conversation,res,200, 'Conversation created successfully');
  } catch (error) {
    console.log(error)
    console.log(error)
    console.log(error)
    console.log(error)
    return internalServerErrorResponse(error.message, res, 500);
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const query = {
      participants: userId,
      isActive: true
    };

    if (type) {
      query.type = type; 
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Conversation.countDocuments(query);

    const conversations = await Conversation.find(query)
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: 'participants', select: 'fullName email profilePicture' },
        { path: 'lastMessage', select: 'content messageType createdAt sender' },
        { path: 'courseId', select: 'title' }
      ]);

    return paginationResponse(conversations, total, parseInt(page), parseInt(limit), res);
  } catch (error) {
    console.log(error);
    return internalServerErrorResponse(error.message,res, 500);
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId
    }).populate('participants', 'fullName email profilePicture')
      .populate('lastMessage')
      .populate('courseId', 'title');

    if (!conversation) {
      return badRequestResponse(res, 'Conversation not found', 404);
    }

    return successResponse( conversation,res,200, 'Conversation retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { participants } = req.body;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId
    });

    if (!conversation) {
      return badRequestResponse(res, 'Conversation not found', 404);
    }

    if (conversation.type === 'direct') {
      return badRequestResponse(res, 'Cannot add participants to direct messages', 400);
    }

    // Add new participants
    const newParticipants = participants.filter(p => !conversation.participants.includes(p));
    conversation.participants.push(...newParticipants);
    await conversation.save();

    await conversation.populate('participants', 'name email avatar');

    return successResponse(res, conversation, 'Participants added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.leaveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId
    });

    if (!conversation) {
      return badRequestResponse(res, 'Conversation not found', 404);
    }

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId
    );

    // If no participants left, mark as inactive
    if (conversation.participants.length === 0) {
      conversation.isActive = false;
    }

    await conversation.save();

    return successResponse(res, null, 'Left conversation successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};