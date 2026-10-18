const mongoose = require('mongoose');
const WebhookLog = require('../models/webhook-log.model');
const {
  successResponse, badRequestResponse, internalServerErrorResponse, paginationResponse,
} = require('../utils/custom_response/responses');

const parseJson = (text) => {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return text; }
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /admin/webhook-logs?provider&status&eventType&eventId&from&to&page&limit
exports.list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = {};
    if (req.query.provider) filter.provider = String(req.query.provider);
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.eventType) filter.eventType = String(req.query.eventType);
    if (req.query.eventId) filter.eventId = String(req.query.eventId);
    if (req.query.q) filter.path = new RegExp(escapeRegex(req.query.q), 'i');
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) return badRequestResponse('from is not a valid date', 'VALIDATION', 400, res);
        filter.createdAt.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (Number.isNaN(to.getTime())) return badRequestResponse('to is not a valid date', 'VALIDATION', 400, res);
        filter.createdAt.$lte = to;
      }
    }
    const [rows, total] = await Promise.all([
      // The list leaves out bodies and headers; fetch one entry to see them.
      WebhookLog.find(filter).select('-body -headers -response').sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      WebhookLog.countDocuments(filter),
    ]);
    return paginationResponse(rows, total, page, limit, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

// GET /admin/webhook-logs/summary?hours=24 : counts per provider and outcome
exports.summary = async (req, res) => {
  try {
    const hours = Math.min(24 * 30, Math.max(1, parseInt(req.query.hours, 10) || 24));
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const rows = await WebhookLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { provider: '$provider', status: '$status' }, count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
    ]);
    const byProvider = {};
    for (const r of rows) {
      const p = (byProvider[r._id.provider] ||= { processed: 0, rejected: 0, error: 0, lastAt: null });
      p[r._id.status] = r.count;
      if (!p.lastAt || r.lastAt > p.lastAt) p.lastAt = r.lastAt;
    }
    return successResponse({ hours, since, providers: byProvider }, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};

// GET /admin/webhook-logs/:id : the full entry with parsed headers and body
exports.getOne = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return badRequestResponse('Invalid id', 'VALIDATION', 400, res);
    const row = await WebhookLog.findById(req.params.id).lean();
    if (!row) return badRequestResponse('Webhook log not found', 'NOT_FOUND', 404, res);
    return successResponse({ ...row, headers: parseJson(row.headers), body: parseJson(row.body), response: parseJson(row.response) }, res);
  } catch (e) {
    return internalServerErrorResponse(e.message, res);
  }
};
