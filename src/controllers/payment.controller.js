const Payment = require('../models/payment.model');
const {
  paginationResponse,
  internalServerErrorResponse,
} = require('../utils/custom_response/responses');

// Card/Paystack/Flutterwave/Stripe checkout was removed: every purchase is paid with credits
// (see credit.controller.js#payWithCredits). Only payment history remains here.

// Get payment history for authenticated user (paginated)
exports.getUserPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ userId })
    ]);

    return paginationResponse(payments, total, page, limit, res, 'Payment history fetched successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};
