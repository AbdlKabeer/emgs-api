const Subscription = require('../models/subscription.model');
const Payment = require('../models/payment.model');
const Service = require('../models/service.model');
const User = require('../models/user.model');
const axios = require('axios');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse,
  paginationResponse
} = require('../utils/custom_response/responses');

// Create a new subscription
exports.createSubscription = async (req, res) => {
  try {
    const { serviceId, interval, paymentReference } = req.body;
    const userId = req.user.id;

    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      return badRequestResponse('Service not found', 'NOT_FOUND', 404, res);
    }

    // Check if service price is set
    if (!service.price) {
      return badRequestResponse('This service does not support subscriptions', 'BAD_REQUEST', 400, res);
    }

    // Check for existing active subscription
    const existingSubscription = await Subscription.findOne({
      userId,
      serviceId,
      status: 'active'
    });

    if (existingSubscription) {
      return badRequestResponse('You already have an active subscription for this service', 'ALREADY_EXISTS', 409, res);
    }

    // Verify initial payment with Paystack
    const headers = {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    };

    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${paymentReference}`,
      { headers }
    );

    const transactionData = paystackResponse.data.data;
    
    if (transactionData.status !== 'success') {
      return badRequestResponse('Payment verification failed', 'PAYMENT_FAILED', 400, res);
    }

    // Extract authorization code for recurring charges
    const authorization = transactionData.authorization;

    // Calculate next billing date
    const startDate = new Date();
    const nextBillingDate = calculateNextDate(startDate, interval);

    // Create subscription
    const subscription = new Subscription({
      userId,
      serviceId,
      plan: {
        interval,
        amount: service.price,
        currency: 'NGN'
      },
      status: 'active',
      paymentMethod: {
        type: 'card',
        authorizationCode: authorization?.authorization_code,
        cardLast4: authorization?.last4,
        cardBrand: authorization?.brand,
        bank: authorization?.bank
      },
      startDate,
      nextBillingDate,
      paystackCustomerCode: transactionData.customer?.customer_code
    });

    await subscription.save();

    // Create initial payment record
    const payment = new Payment({
      userId,
      amount: service.price,
      currency: 'NGN',
      status: 'completed',
      paymentMethod: 'card',
      paymentGatewayId: transactionData.reference,
      itemType: 'service',
      itemId: serviceId,
      metadata: {
        subscriptionId: subscription._id,
        isRecurring: true,
        billingCycle: interval
      }
    });

    await payment.save();

    // Add payment to subscription history
    subscription.billingHistory.push(payment._id);
    subscription.lastBillingDate = new Date();
    await subscription.save();

    // Enroll user in service if not already enrolled
    const user = await User.findById(userId);
    if (!user.enrolledServices.includes(serviceId)) {
      await User.findByIdAndUpdate(userId, { $push: { enrolledServices: serviceId } });
      await Service.findByIdAndUpdate(serviceId, { $push: { enrolledUsers: userId } });
    }

    return successResponse(
      subscription, 
      res, 
      201, 
      'Subscription created successfully'
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    return internalServerErrorResponse(error.message, res);
  }
};

// Get user's subscriptions
exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page = 1, limit = 10, status } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('serviceId', 'name description category price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscription.countDocuments(filter)
    ]);

    return paginationResponse(
      subscriptions, 
      total, 
      page, 
      limit, 
      res, 
      'Subscriptions fetched successfully'
    );
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get subscription details
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ _id: id, userId })
      .populate('serviceId', 'name description category price features')
      .populate('billingHistory');

    if (!subscription) {
      return badRequestResponse('Subscription not found', 'NOT_FOUND', 404, res);
    }

    return successResponse(subscription, res, 200, 'Subscription details fetched successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({ _id: id, userId });

    if (!subscription) {
      return badRequestResponse('Subscription not found', 'NOT_FOUND', 404, res);
    }

    if (subscription.status === 'cancelled') {
      return badRequestResponse('Subscription is already cancelled', 'BAD_REQUEST', 400, res);
    }

    subscription.status = 'cancelled';
    subscription.endDate = new Date();
    subscription.cancelReason = reason || 'User requested cancellation';
    subscription.metadata.autoRenew = false;

    await subscription.save();

    return successResponse(subscription, res, 200, 'Subscription cancelled successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Pause subscription
exports.pauseSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ _id: id, userId });

    if (!subscription) {
      return badRequestResponse('Subscription not found', 'NOT_FOUND', 404, res);
    }

    if (subscription.status !== 'active') {
      return badRequestResponse('Only active subscriptions can be paused', 'BAD_REQUEST', 400, res);
    }

    subscription.status = 'paused';
    await subscription.save();

    return successResponse(subscription, res, 200, 'Subscription paused successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Resume subscription
exports.resumeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ _id: id, userId });

    if (!subscription) {
      return badRequestResponse('Subscription not found', 'NOT_FOUND', 404, res);
    }

    if (subscription.status !== 'paused') {
      return badRequestResponse('Only paused subscriptions can be resumed', 'BAD_REQUEST', 400, res);
    }

    subscription.status = 'active';
    // Recalculate next billing date from now
    subscription.nextBillingDate = calculateNextDate(new Date(), subscription.plan.interval);
    await subscription.save();

    return successResponse(subscription, res, 200, 'Subscription resumed successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Process recurring payment (called by cron job)
exports.processRecurringPayment = async (subscriptionId) => {
  try {
    const subscription = await Subscription.findById(subscriptionId)
      .populate('serviceId')
      .populate('userId');

    if (!subscription || subscription.status !== 'active') {
      return { success: false, message: 'Subscription not active' };
    }

    if (!subscription.isDueForBilling()) {
      return { success: false, message: 'Billing not due yet' };
    }

    const headers = {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    };

    // Charge authorization using Paystack
    const chargeData = {
      authorization_code: subscription.paymentMethod.authorizationCode,
      email: subscription.userId.email,
      amount: subscription.plan.amount * 100, // Paystack expects amount in kobo
      metadata: {
        subscriptionId: subscription._id,
        serviceId: subscription.serviceId._id,
        billingCycle: subscription.plan.interval
      }
    };

    const chargeResponse = await axios.post(
      'https://api.paystack.co/transaction/charge_authorization',
      chargeData,
      { headers }
    );

    const transactionData = chargeResponse.data.data;

    if (transactionData.status === 'success') {
      // Create payment record
      const payment = new Payment({
        userId: subscription.userId._id,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency,
        status: 'completed',
        paymentMethod: 'card',
        paymentGatewayId: transactionData.reference,
        itemType: 'service',
        itemId: subscription.serviceId._id,
        metadata: {
          subscriptionId: subscription._id,
          isRecurring: true,
          billingCycle: subscription.plan.interval
        }
      });

      await payment.save();

      // Update subscription
      subscription.billingHistory.push(payment._id);
      subscription.lastBillingDate = new Date();
      subscription.nextBillingDate = subscription.calculateNextBillingDate();
      subscription.failedPaymentAttempts = 0;
      await subscription.save();

      return { success: true, message: 'Payment processed successfully', payment };
    } else {
      // Payment failed
      subscription.failedPaymentAttempts += 1;
      
      // Cancel subscription after 3 failed attempts
      if (subscription.failedPaymentAttempts >= 3) {
        subscription.status = 'failed';
        subscription.endDate = new Date();
      }
      
      await subscription.save();
      
      return { success: false, message: 'Payment failed', attempts: subscription.failedPaymentAttempts };
    }

  } catch (error) {
    console.error('Error processing recurring payment:', error);
    
    // Update failed attempts
    if (subscriptionId) {
      await Subscription.findByIdAndUpdate(subscriptionId, {
        $inc: { failedPaymentAttempts: 1 }
      });
    }
    
    return { success: false, message: error.message };
  }
};

// Process all due subscriptions (called by cron job)
exports.processDueSubscriptions = async (req, res) => {
  try {
    // Find all active subscriptions that are due for billing
    const dueSubscriptions = await Subscription.find({
      status: 'active',
      nextBillingDate: { $lte: new Date() }
    });

    console.log(`Processing ${dueSubscriptions.length} due subscriptions...`);

    const results = {
      total: dueSubscriptions.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const subscription of dueSubscriptions) {
      const result = await exports.processRecurringPayment(subscription._id);
      
      if (result.success) {
        results.successful += 1;
      } else {
        results.failed += 1;
      }
      
      results.details.push({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        ...result
      });
    }

    console.log('Subscription processing complete:', results);

    if (res) {
      return successResponse(results, res, 200, 'Subscriptions processed');
    }
    
    return results;
  } catch (error) {
    console.error('Error processing due subscriptions:', error);
    if (res) {
      return internalServerErrorResponse(error.message, res);
    }
    throw error;
  }
};

// Helper function to calculate next billing date
function calculateNextDate(fromDate, interval) {
  const date = new Date(fromDate);
  
  switch(interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to monthly
  }
  
  return date;
}

module.exports = exports;
