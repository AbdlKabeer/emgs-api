const axios = require('axios');

const WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/5XIdFXDRQ28s6Xcd6Qfe/webhook-trigger/ca005381-6005-4060-bd00-4c0a93b55efa';

exports.sendWebhook = async (eventType, data) => {
  // Local/test runs set DISABLE_OUTBOUND_WEBHOOKS=true so fake data never reaches the real CRM
  if (process.env.DISABLE_OUTBOUND_WEBHOOKS === 'true') return;
  try {
    const payload = {
      event_type: eventType,
      data
    };

    await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Webhook sent for event: ${eventType}`);
  } catch (error) {
    console.error('Failed to send webhook:', error.message);
  }
};