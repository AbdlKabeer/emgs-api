const Conversation = require('../../models/conversation.model');
const Message = require('../../models/message.model');
const User = require('../../models/user.model');
const { successResponse, errorResponse, badRequestResponse, paginationResponse, internalServerErrorResponse } = require('../../utils/custom_response/responses');


exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType, replyTo } = req.body;
    const userId = req.user.id;

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return badRequestResponse('Conversation not found or access denied',null, 404,res);
    }

    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content,
      messageType: messageType || 'text',
      replyTo
    });

    await message.save();

    // Update conversation's last message and activity
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate message data
    await message.populate('sender', 'name avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    return successResponse(message,res,200, 'Message sent successfully');
  } catch (error) {
    console.log(error)
    return internalServerErrorResponse( error.message,res, 500);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // ✅ Check if user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return badRequestResponse( 'Conversation not found or access denied',null, 404,res);
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ✅ Count total messages
    const total = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: false
    });

    // ✅ Fetch messages with pagination
    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false
    })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parsedLimit)
      .populate([
        { path: 'sender', select: 'name avatar' },
        { path: 'replyTo', select: 'content sender' }
      ]);

    // ✅ Respond using same paginationResponse format
    return paginationResponse(messages, total, parsedPage, parsedLimit, res);

  } catch (error) {
    console.error(error);
    return internalServerErrorResponse(res, error.message, 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return badRequestResponse(res, 'Conversation not found or access denied', 404);
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        'readBy.user': { $ne: userId },
        sender: { $ne: userId } // Don't mark own messages as read
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    return successResponse(res, null, 'Messages marked as read');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false
    });

    if (!message) {
      return badRequestResponse(res, 'Message not found or access denied', 404);
    }

    // Add to edit history
    message.editHistory.push({
      content: message.content.text,
      editedAt: new Date()
    });

    message.content.text = content;
    message.isEdited = true;
    await message.save();

    return successResponse(res, message, 'Message updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return badRequestResponse(res, 'Message not found or access denied', 404);
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return successResponse(res, null, 'Message deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return badRequestResponse(res, 'Message not found', 404);
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === userId && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        user: userId,
        emoji,
        createdAt: new Date()
      });
    }

    await message.save();
    return successResponse(res, message.reactions, 'Reaction updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
