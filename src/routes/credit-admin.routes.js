const express = require('express');
const admin = require('../controllers/credit-admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/config', checkPermission('credits.read'), admin.getConfig);
router.put('/config', checkPermission('credits.manage'), admin.updateConfig);
router.get('/packs', checkPermission('credits.read'), admin.listPacks);
router.post('/packs', checkPermission('credits.manage'), admin.createPack);
router.put('/packs/:id', checkPermission('credits.manage'), admin.updatePack);
router.delete('/packs/:id', checkPermission('credits.manage'), admin.deletePack);
router.get('/stats', checkPermission('credits.read'), admin.stats);
router.get('/failed-events', checkPermission('credits.read'), admin.failedEvents);
router.get('/users/:id', checkPermission('credits.read'), admin.getUserCredits);
router.post('/users/:id/adjust', checkPermission('credits.manage'), admin.adjust);
router.post('/payments/:paymentId/refund', checkPermission('credits.manage'), admin.refundPayment);

module.exports = router;
