const express = require('express');
const controller = require('../controllers/webhook-log.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isSuperAdmin } = require('../middleware/permission.middleware');

const router = express.Router();

// Webhook payloads contain payment details, so only super admins (role-based check) can read them.
router.use(authenticate, isSuperAdmin());

router.get('/summary', controller.summary);
router.get('/', controller.list);
router.get('/:id', controller.getOne);

module.exports = router;
