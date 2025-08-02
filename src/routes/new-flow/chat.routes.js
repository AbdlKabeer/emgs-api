const express = require('express');
const router = express.Router();
const conversationController = require('../../controllers/new-flow/conversation.controller');
const messageController = require('../../controllers/new-flow/message.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// Conversation routes
router.post('/conversations', authenticate, conversationController.createConversation);
router.get('/conversations', authenticate, conversationController.getUserConversations);
router.get('/conversations/:id', authenticate, conversationController.getConversation);
router.put('/conversations/:id/participants', authenticate, conversationController.addParticipants);
router.delete('/conversations/:id/leave', authenticate, conversationController.leaveConversation);

// Message routes
router.post('/conversations/:conversationId/messages', authenticate, messageController.sendMessage);
router.get('/conversations/:conversationId/messages', authenticate, messageController.getMessages);
router.put('/conversations/:conversationId/read', authenticate, messageController.markAsRead);
router.put('/messages/:messageId', authenticate, messageController.editMessage);
router.delete('/messages/:messageId', authenticate, messageController.deleteMessage);
router.post('/messages/:messageId/react', authenticate, messageController.reactToMessage);

module.exports = router;