const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

const chatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    // Join user to their conversations
    socket.on('join-conversations', async (userId) => {
      try {
        const conversations = await Conversation.find({
          participants: userId,
          isActive: true
        }).select('_id');

        conversations.forEach(conv => {
          socket.join(conv._id.toString());
        });
      } catch (error) {
        console.error('Error joining conversations:', error);
      }
    });

    // Handle sending messages.   
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content, messageType, replyTo } = data;
        const userId = socket.userId;

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isActive: true
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        const message = new Message({
          conversation: conversationId,
          sender: userId,
          content,
          messageType: messageType || 'text',
          replyTo
        });

        await message.save();
        await message.populate('sender', 'name avatar');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        // Emit to all participants
        io.to(conversationId).emit('new-message', message);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      socket.to(data.conversationId).emit('user-typing', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(data.conversationId).emit('user-stopped-typing', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    });

    // Handle message reactions
    socket.on('react-message', async (data) => {
      try {
        const { messageId, emoji } = data;
        const userId = socket.userId;

        const message = await Message.findById(messageId);
        if (!message) return;

        const existingReaction = message.reactions.find(
          r => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
          message.reactions = message.reactions.filter(
            r => !(r.user.toString() === userId && r.emoji === emoji)
          );
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        io.to(message.conversation.toString()).emit('message-reaction', {
          messageId,
          reactions: message.reactions
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to react to message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
    });
  });
};

module.exports = chatSocket;