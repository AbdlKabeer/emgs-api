exports.getVerificationEmailTemplate = (userName, verificationLink) => {
    return {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <p>
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>If the button doesn't work, you can also click on the link below or copy it into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>Thank you!</p>
        </div>
      `,
      text: `Hello ${userName},\n\nThank you for registering. Please verify your email address by clicking on the following link:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nThank you!`
    };
  };
  
  exports.getPasswordResetEmailTemplate = (userName, resetLink) => {
    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p>
            <a href="${resetLink}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, you can also click on the link below or copy it into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          <p>Thank you!</p>
        </div>
      `,
      text: `Hello ${userName},\n\nWe received a request to reset your password. Please click on the following link to create a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you didn't request this, please ignore this email.\n\nThank you!`
    };
  };




  exports.getVerificationCodeEmailTemplate = (userName, verificationCode) => {
    return {
      subject: 'Your Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${userName},</p>
          <p>Your verification code is:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 10px; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px;">
              ${verificationCode}
            </span>
          </div>
          <p>This code will expire in 15 minutes. Do not share this code with anyone.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Thank you!</p>
        </div>
      `,
      text: `Hello ${userName},\n\nYour verification code is: ${verificationCode}\n\nThis code will expire in 15 minutes. Do not share this code with anyone.\n\nIf you did not request this verification, please ignore this email.\n\nThank you!`
    };
  };

  exports.getPurchaseSuccessEmailTemplate = (userName, itemName, amount, transactionRef) => {
    return {
      subject: `Purchase Confirmation: ${itemName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #4CAF50;">Purchase Successful!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for your purchase. Your payment for <strong>${itemName}</strong> has been confirmed.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Item:</strong> ${itemName}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${amount}</p>
            <p style="margin: 5px 0;"><strong>Transaction Ref:</strong> ${transactionRef}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>You can now access your purchase through your dashboard.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Thank you for choosing EMGS!</p>
        </div>
      `,
      text: `Hello ${userName},\n\nThank you for your purchase. Your payment for ${itemName} has been confirmed.\n\nPurchase Details:\nItem: ${itemName}\nAmount: ₦${amount}\nTransaction Ref: ${transactionRef}\nDate: ${new Date().toLocaleDateString()}\n\nYou can now access your purchase through your dashboard.\n\nThank you for choosing EMGS!`
    };
  };