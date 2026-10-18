const WebhookLog = require('../models/webhook-log.model');

/**
 * Records every inbound webhook: who sent it (provider), what it said, how we answered and how long
 * it took, so payment and sync problems can be traced after the fact.
 *
 *   router.post('/webhook/revenuecat', logWebhook('revenuecat', extract), handler);
 *
 * Rules it follows:
 *  - It never changes the request or the response, and a logging failure never fails the webhook.
 *  - Secrets (auth headers, signatures, tokens, card data) are redacted before storage.
 *  - Rejected calls (4xx) are unauthenticated internet traffic: they get a small body cap, a short
 *    retention and a per-minute budget, so junk requests cannot fill the database.
 */

const DAY = 24 * 60 * 60 * 1000;
const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const limits = () => ({
  bodyMax: num('WEBHOOK_LOG_MAX_BODY_CHARS', 100000),
  rejectedBodyMax: num('WEBHOOK_LOG_REJECTED_BODY_CHARS', 1000),
  keepDays: num('WEBHOOK_LOG_KEEP_DAYS', 90),
  rejectedKeepDays: num('WEBHOOK_LOG_REJECTED_KEEP_DAYS', 7),
  rejectedPerMinute: num('WEBHOOK_LOG_REJECTED_PER_MINUTE', 20),
});

const SENSITIVE_HEADER = /authorization|cookie|api[-_]?key|secret|token|signature|auth|hash/i;
const SENSITIVE_BODY_KEY = /^(pass(word)?|pin|otp|cvv2?|cvc)$|secret|token|authorization|api[-_]?key|card[-_]?(number|no)|credential/i;
const REDACTED = '[redacted]';

function redactHeaders(headers = {}) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    const key = name.replace(/[.$]/g, '_');
    out[key] = SENSITIVE_HEADER.test(name)
      ? `${REDACTED}:${String(value).length} chars`
      : Array.isArray(value) ? value.join(', ') : String(value);
  }
  return out;
}

function redactBody(value, depth = 0) {
  if (depth > 12) return '[too deep]';
  if (Array.isArray(value)) return value.map((v) => redactBody(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_BODY_KEY.test(k) ? REDACTED : redactBody(v, depth + 1);
    return out;
  }
  return value;
}

function serialize(body, cap) {
  let text;
  try {
    text = body === undefined || (typeof body === 'object' && body !== null && !Object.keys(body).length)
      ? '' : JSON.stringify(redactBody(body));
  } catch (_) {
    text = '[unserialisable body]';
  }
  const bytes = Buffer.byteLength(text || '');
  const truncated = text.length > cap;
  return { text: truncated ? text.slice(0, cap) : text, bytes, truncated };
}

// Simple fixed-window budget for rejected-call logging.
const budget = { windowStart: 0, used: 0, dropped: 0 };
function takeRejectedSlot(perMinute, now = Date.now()) {
  if (now - budget.windowStart >= 60000) {
    if (budget.dropped) console.warn(`[WebhookLog] skipped ${budget.dropped} rejected webhook log(s) over the per-minute budget`);
    Object.assign(budget, { windowStart: now, used: 0, dropped: 0 });
  }
  if (budget.used >= perMinute) { budget.dropped++; return false; }
  budget.used++;
  return true;
}

const statusFor = (code) => (code >= 500 ? 'error' : code >= 400 ? 'rejected' : 'processed');

function logWebhook(provider, extract = () => ({})) {
  return (req, res, next) => {
    const started = Date.now();
    let meta = {};
    try { meta = extract(req) || {}; } catch (_) { /* a bad extractor must not break the webhook */ }

    // First line of defence: visible in the host's log stream even if the process dies mid-request.
    console.log(`[webhook] ${provider} received ${req.method} ${req.originalUrl}`
      + `${meta.eventType ? ` type=${meta.eventType}` : ''}${meta.eventId ? ` id=${meta.eventId}` : ''}`);

    let responseText = '';
    const originalSend = res.send;
    res.send = function patchedSend(chunk) {
      try {
        if (chunk !== undefined && chunk !== null) responseText = Buffer.isBuffer(chunk) ? '[binary]' : String(chunk).slice(0, 1000);
      } catch (_) { /* ignore */ }
      return originalSend.apply(this, arguments);
    };

    let recorded = false;
    const record = (statusCode, error) => {
      if (recorded) return;
      recorded = true;
      try {
        const cfg = limits();
        const status = error ? 'error' : statusFor(statusCode);
        if (status === 'rejected' && !takeRejectedSlot(cfg.rejectedPerMinute)) return;
        const { text, bytes, truncated } = serialize(req.body, status === 'rejected' ? cfg.rejectedBodyMax : cfg.bodyMax);
        const keepMs = (status === 'rejected' ? cfg.rejectedKeepDays : cfg.keepDays) * DAY;
        new WebhookLog({
          provider,
          method: req.method,
          path: req.originalUrl ? req.originalUrl.split('?')[0] : req.path,
          query: req.query && Object.keys(req.query).length ? JSON.stringify(redactBody(req.query)) : undefined,
          ip: req.ip,
          headers: JSON.stringify(redactHeaders(req.headers)),
          body: text,
          bodyBytes: bytes,
          bodyTruncated: truncated,
          eventType: meta.eventType ? String(meta.eventType).slice(0, 120) : undefined,
          eventId: meta.eventId ? String(meta.eventId).slice(0, 200) : undefined,
          status,
          statusCode,
          durationMs: Date.now() - started,
          response: responseText,
          error,
          expiresAt: new Date(Date.now() + keepMs),
        }).save().catch((e) => console.error(`[WebhookLog] could not record ${provider} webhook:`, e.message));
      } catch (e) {
        console.error(`[WebhookLog] could not record ${provider} webhook:`, e.message);
      }
    };

    res.on('finish', () => record(res.statusCode));
    // The sender hung up (or we crashed) before a response was sent.
    res.on('close', () => {
      if (!res.writableEnded) record(res.headersSent ? res.statusCode : undefined, 'connection closed before a response was sent');
    });
    next();
  };
}

module.exports = { logWebhook, redactHeaders, redactBody, takeRejectedSlot, _budget: budget };
