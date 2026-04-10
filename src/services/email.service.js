const transporter = require('../config/email.config');
const { sendResendEmail } = require('./resend.service');
const emailTemplates = require('../utils/templates/email.templates');

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content (fallback)
 * @returns {Promise} - Email sending result
 */
/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 * @returns {Promise} - Email sending result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Try Resend first if API key is set, else fallback to nodemailer
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_ADDRESS) {
    const result = await sendResendEmail({ to, subject, html, text });
    if (result) return result;
    // If Resend fails, fallback to nodemailer
  }

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text
    };
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw error, just log it to prevent app crashes
    return null;
  }
};

// Export sendEmail so it can be used in other controllers
exports.sendEmail = sendEmail;

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} token - Verification token
 * @returns {Promise} - Email sending result
 */
exports.sendVerificationEmail = async (to, name, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const { subject, html, text } = emailTemplates.getVerificationEmailTemplate(name, verificationLink);
  
  return await sendEmail({ to, subject, html, text });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} token - Password reset token
 * @returns {Promise} - Email sending result
 */
exports.sendPasswordResetEmail = async (to, name, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const { subject, html, text } = emailTemplates.getPasswordResetEmailTemplate(name, resetLink);
  
  return await sendEmail({ to, subject, html, text });
};



/**
 * Send verification code email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise} - Email sending result
 */
exports.sendVerificationCodeEmail = async (to, name, verificationCode) => {
  const { subject, html, text } = emailTemplates.getVerificationCodeEmailTemplate(name, verificationCode);
  
  return await sendEmail({ to, subject, html, text });
};

/**
 * Send purchase success email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} itemName - Name of the item purchased
 * @param {number} amount - Amount paid
 * @param {string} transactionRef - Transaction reference
 * @returns {Promise} - Email sending result
 */
exports.sendPurchaseSuccessEmail = async (to, name, itemName, amount, transactionRef) => {
  const { subject, html, text } = emailTemplates.getPurchaseSuccessEmailTemplate(name, itemName, amount, transactionRef);
  
  return await sendEmail({ to, subject, html, text });
};