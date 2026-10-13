const Subscription = require('../models/subscription.model');
const Payment = require('../models/payment.model');
const Service = require('../models/service.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const ledger = require('../services/credit-ledger.service');
const pricing = require('../services/credit-pricing.service');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse,
  paginationResponse
} = require('../utils/custom_response/responses');

// Create a new subscription, paid with credits (first cycle is charged immediately)
exports.createSubscription = async (req, res) => {
  try {
    const { serviceId, interval } = req.body;
    const userId = req.user.id;

    const service = await Service.findById(serviceId);
    if (!service) {
      return badRequestResponse('Service not found', 'NOT_FOUND', 404, res);
    }

    const plan = (service.subscriptionPlans || []).find((p) => p.interval === interval);
    const basePrice = plan?.price || service.price;
    if (!basePrice) {
      return badRequestResponse('This service does not support subscriptions', 'BAD_REQUEST', 400, res);
    }

    const existing = await Subscription.findOne({ userId, serviceId, status: { $in: ['active', 'paused'] } });
    if (existing) {
      return badRequestResponse('You already have an active subscription for this service', 'ALREADY_EXISTS', 409, res);
    }

    const cfg = await pricing.getCreditConfig();
    const q = pricing.quote(basePrice, cfg);
    if (req.body.expectedCredits !== undefined && Number(req.body.expectedCredits) !== q.creditPrice) {
      return badRequestResponse('The price has changed', 'PRICE_CHANGED', 409, res, { creditPrice: q.creditPrice });
    }

    const startDate = new Date();
    const subscription = await Subscription.create({
      userId,
      serviceId,
      plan: { interval, amount: basePrice, credits: q.creditPrice, currency: 'NGN' },
      status: 'active',
      paymentMethod: { type: 'credits' },
      startDate,
      nextBillingDate: calculateNextDate(startDate, interval),
    });

    const payment = await Payment.create({
      userId, itemId: serviceId, itemType: 'service', amount: basePrice, currency: 'NGN',
      status: 'pending', paymentMethod: 'credits', credits: q.creditPrice, pricing: q,
      metadata: { subscriptionId: subscription._id, isRecurring: true, billingCycle: interval },
    });

    try {
      await ledger.spend({
        userId, amount: q.creditPrice, type: 'spend', idempotencyKey: `sub-create:${subscription._id}`,
        ref: { itemType: 'subscription', itemId: serviceId, itemName: service.name, paymentId: payment._id, subscriptionId: subscription._id },
        pricing: q, note: `${service.name} (${interval})`,
      });
    } catch (e) {
      await Subscription.deleteOne({ _id: subscription._id });
      payment.status = 'failed';
      await payment.save();
      if (e.code === 'INSUFFICIENT_CREDITS') {
        return badRequestResponse('Insufficient credits', 'INSUFFICIENT_CREDITS', 402, res,
          { required: e.required, balance: e.balance, shortfall: e.shortfall });
      }
      throw e;
    }

    payment.status = 'completed';
    await payment.save();
    subscription.billingHistory.push(payment._id);
    subscription.lastBillingDate = new Date();
    await subscription.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { enrolledServices: serviceId } });
    await Service.findByIdAndUpdate(serviceId, { $addToSet: { enrolledUsers: userId } });

    return successResponse(subscription, res, 201, 'Subscription created successfully');
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
    const subscription = await Subscription.findById(subscriptionId).populate('serviceId');
    if (!subscription || subscription.status !== 'active') {
      return { success: false, message: 'Subscription not active' };
    }
    if (!subscription.isDueForBilling()) {
      return { success: false, message: 'Billing not due yet' };
    }

    const cfg = await pricing.getCreditConfig();
    // Re-quote each cycle so rate changes apply to renewals; the cycle snapshot is kept on the ledger row
    const q = pricing.quote(subscription.plan.amount, cfg);
    const cycleKey = new Date(subscription.nextBillingDate).toISOString().slice(0, 10);

    try {
      const payment = await Payment.create({
        userId: subscription.userId, itemId: subscription.serviceId._id, itemType: 'service',
        amount: subscription.plan.amount, currency: 'NGN', status: 'pending', paymentMethod: 'credits',
        credits: q.creditPrice, pricing: q,
        metadata: { subscriptionId: subscription._id, isRecurring: true, billingCycle: subscription.plan.interval },
      });
      await ledger.spend({
        userId: subscription.userId, amount: q.creditPrice, type: 'renewal',
        idempotencyKey: `renewal:${subscription._id}:${cycleKey}`,
        ref: { itemType: 'subscription', itemId: subscription.serviceId._id, itemName: subscription.serviceId.name, paymentId: payment._id, subscriptionId: subscription._id },
        pricing: q, note: `${subscription.serviceId.name} renewal`,
      });
      payment.status = 'completed';
      await payment.save();

      subscription.billingHistory.push(payment._id);
      subscription.lastBillingDate = new Date();
      subscription.nextBillingDate = subscription.calculateNextBillingDate();
      subscription.plan.credits = q.creditPrice;
      subscription.failedPaymentAttempts = 0;
      subscription.graceUntil = undefined;
      await subscription.save();
      return { success: true, message: 'Renewed with credits', payment };
    } catch (e) {
      if (e.code !== 'INSUFFICIENT_CREDITS') throw e;
      // Not enough credits: start (or continue) the grace window, then lapse
      const graceDays = cfg.renewalGraceDays;
      if (!subscription.graceUntil) {
        subscription.graceUntil = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
        await Notification.create({
          userId: subscription.userId, title: 'Top up to keep your service',
          message: `Your ${subscription.serviceId.name} renewal needs ${q.creditPrice} credits (you have ${e.balance}). Top up within ${graceDays} days to keep access.`,
          type: 'service', relatedItemId: subscription.serviceId._id,
        });
      }
      subscription.failedPaymentAttempts += 1;
      if (new Date() >= subscription.graceUntil) {
        subscription.status = 'lapsed';
        subscription.endDate = new Date();
        await Notification.create({
          userId: subscription.userId, title: 'Subscription lapsed',
          message: `Your ${subscription.serviceId.name} subscription lapsed because your credits ran out.`,
          type: 'service', relatedItemId: subscription.serviceId._id,
        });
      }
      await subscription.save();
      return { success: false, message: 'Insufficient credits', attempts: subscription.failedPaymentAttempts, status: subscription.status };
    }
  } catch (error) {
    console.error('Error processing recurring payment:', error);
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
