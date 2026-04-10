// test-resend-email.js
require('dotenv').config();
const { sendResendEmail } = require('./src/services/resend.service');

// Usage: node test-resend-email.js recipient@example.com
const recipient = process.argv[2];

if (!recipient) {
  console.error('Usage: node test-resend-email.js recipient@example.com');
  process.exit(1);
}

(async () => {
  const subject = 'Test Email from Resend Integration';
  const html = '<h1>Hello from Resend!</h1><p>This is a test email.</p>';
  const text = 'Hello from Resend! This is a test email.';

  const result = await sendResendEmail(recipient, subject, html, text);
  if (result && result.id) {
    console.log('Email sent successfully! ID:', result.id);
  } else {
    console.error('Failed to send email. Result:', result);
  }
})();
