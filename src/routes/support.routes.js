const express = require('express');
const supportController = require('../controllers/support.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { serviceCreateValidator } = require('../validators/service.validator');

const router = express.Router();

// Public route - allows anyone to submit a support request
router.post('/submit', supportController.submitSupportRequest);

router.get('/user', authenticate, supportController.getUserSupportRequests);
router.get('/all', [authenticate, isAdmin], supportController.getAllSupportRequests);

// Contact info — public read, admin write
router.get('/contact-info', supportController.getContactInfo);
router.put('/contact-info', [authenticate, isAdmin], supportController.updateContactInfo);

router.get('/:requestId', [authenticate,isAdmin], supportController.updateSupportRequest);

module.exports = router;