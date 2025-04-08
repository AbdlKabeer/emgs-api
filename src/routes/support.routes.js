const express = require('express');
const supportController = require('../controllers/support.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { serviceCreateValidator } = require('../validators/service.validator');

const router = express.Router();

// Public route - allows anyone to submit a support request
router.post('/submit', supportController.submitSupportRequest);

router.get('/user', authenticate, supportController.getUserSupportRequests);
router.get('/all', [authenticate, isAdmin], supportController.getAllSupportRequests);
router.get('/:requestId', [authenticate,isAdmin], supportController.updateSupportRequest);

// router.get('/all', authenticate, authorize(['admin', 'support']), supportController.getAllSupportRequests);
// router.put('/:requestId', authenticate, authorize(['admin', 'support']), supportController.updateSupportRequest);

module.exports = router;