// Resend email utility
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 * @returns {Promise} - Email sending result
 */
async function sendResendEmail({ to, subject, html, text }) {
  try {
    // Use default Resend sender if no custom domain is set
    const from = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev';
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text
    });
    return result;
  } catch (error) {
    console.error('Resend email failed:', error);
    return null;
  }
}

module.exports = { sendResendEmail };

