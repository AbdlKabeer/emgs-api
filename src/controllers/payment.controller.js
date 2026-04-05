const Payment = require('../models/payment.model');
const Course = require('../models/course.model');
const Service = require('../models/service.model');
const walletController = require('./wallet.controller');
const Notification = require('../models/notification.model');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const { 
  successResponse, 
  badRequestResponse, 
  internalServerErrorResponse, 
  paginationResponse
} = require('../utils/custom_response/responses');


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
        .populate('metadata.courseId', 'title price')
        .populate('metadata.tutorId', 'fullName email')
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

// Get user progress for a specific course
exports.initiatePayment = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    const userId = req.user.id; 

    // check if itemType == "course" not in course or lesson
    // if (itemType === 'service') {
    //   return badRequestResponse('Service payment not available yet',"NOT_AVAILABLE",400,res );
    // }

    let progress = await Payment.findOne({ userId, itemId ,itemType ,status:'completed'})

    if (progress){
      return badRequestResponse('Payment already initiated',res);
    }
 
    if (itemType == 'course') {
      // If no progress record exists, create a new one
      const course = await Course.findById(itemId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }
      
      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount:100,
        status:"pending",
      });
      
      await payment.save();
      return successResponse({
        transactionRef: payment._id,
        metadata: {
          id: payment._id,
          itemId,
          itemType
        }
      }, res,200, 'Payment initiated successfully' );
       
    }
    else if (itemType === 'oneOnOne' || itemType === 'one-on-one') {
      // Find the tutor
      const tutor = await User.findById(itemId);
      if (!tutor || tutor.role !== 'tutor') {
        return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
      }
      
      // Price can be set from tutor's servicePrice or fixed amount
      const amount = tutor.servicePrice || 5000; // example default
      
      let payment = new Payment({
        userId,
        itemId, // tutor id here
        itemType,
        amount,
        status:"pending",
      });
      
      await payment.save();
      return successResponse({
        transactionRef: payment._id,
        metadata: {
          transactionRef: payment._id,
          itemId,
          itemType
        }
      }, res, 200, 'Payment initiated successfully for one-on-one tutoring' );
    }
    else if(itemType == 'service'){
      // Find the service
      const service = await Service.findById(itemId);
      if (!service) {
        return badRequestResponse('Service not found', 'NOT_FOUND', 404, res);
      }

      if (!service.isActive) {
        return badRequestResponse('Service is not active', 'NOT_ACTIVE', 400, res);
      }

      // Determine price based on whether it's session-based or regular
      let amount;
      if (service.sessionEnabled && service.sessionPrice) {
        amount = service.sessionPrice;
      } else if (service.price) {
        amount = service.price;
      } else {
        return badRequestResponse('Service price not set', 'PRICE_NOT_SET', 400, res);
      }

      let payment = new Payment({
        userId,
        itemId, // service id here
        itemType,
        amount,
        status:"pending",
      });
      
      await payment.save();
      
      return successResponse({
        transactionRef: payment._id,
        metadata: {
          transactionRef: payment._id,
          itemId,
          itemType
        }
      }, res, 200, 'Payment initiated successfully for service' );
    }
    
    return successResponse(progress, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Helper to run business logic for all providers
async function handleBusinessLogic(metadata, payment, userId, res) {
  let id = metadata?.transactionRef || metadata?.id;
  let itemType = metadata?.itemType;
  let paymentId = metadata?.itemId;
  let courseId = metadata?.itemId;
  payment = payment || await Payment.findById(id);
  if (payment) {
    if (payment.status == 'completed') {
      return successResponse(null, res, 200, 'Payment already completed');
    }
    if (itemType == 'course') {
      const course = await Course.findById(courseId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }
      const user = await User.findById(userId);
      if (user.enrolledCourses.includes(courseId)) {
        return badRequestResponse('User already enrolled in this course', 'BAD_REQUEST', 400, res);
      }
      await User.findByIdAndUpdate(userId, { $push: { enrolledCourses: courseId } });
      await Course.findByIdAndUpdate(courseId, { $push: { enrolledUsers: userId } });
      const notification = new Notification({
        userId,
        title: 'Course Enrollment',
        message: `You have successfully enrolled in ${course.title}`,
        type: 'course',
        relatedItemId: courseId
      });
      await notification.save();
      payment.status = 'completed';
      await payment.save();
      let fullAmount = payment.amount;
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const referralReward = fullAmount * 0.1;
          await Wallet.findOneAndUpdate(
            { userId },
            { $inc: { balance: referralReward } },
            { new: true, upsert: true }
          );
          fullAmount = fullAmount - referralReward;
          referrer.referrals.push(user._id);
          user.referralPointDisbursed = true;
          await user.save();
          await referrer.save();
        }
      }
      try {
        await walletController.updateEarningsFromPurchase(courseId, fullAmount, payment._id);
      } catch (walletError) {
        console.error('Error updating wallet:', walletError);
      }
      return successResponse(null, res, 200, 'Enrolled in course successfully');
    } else if (itemType == 'service') {
      const service = await Service.findById(paymentId);
      if (!service) {
        return badRequestResponse('service not found', 'NOT_FOUND', 404, res);
      }
      const user = await User.findById(userId);
      if (!user) {
        return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
      }
      const sessionValidityDays = service.sessionValidityDays || 30;
      const expiryDate = new Date(Date.now() + sessionValidityDays * 24 * 60 * 60 * 1000);
      const existingSessionIndex = user.serviceSubscriptions.findIndex(sub =>
        sub.serviceId.toString() === service._id.toString() &&
        sub.isActive &&
        (!sub.expiry || new Date(sub.expiry) > new Date())
      );
      if (existingSessionIndex >= 0) {
        user.serviceSubscriptions[existingSessionIndex].isActive = true;
        user.serviceSubscriptions[existingSessionIndex].expiry = expiryDate;
        user.serviceSubscriptions[existingSessionIndex].purchasedAt = new Date();
        user.serviceSubscriptions[existingSessionIndex].paymentId = payment._id;
      } else {
        user.serviceSubscriptions.push({
          serviceId: service._id,
          isActive: true,
          expiry: expiryDate,
          purchasedAt: new Date(),
          paymentId: payment._id
        });
      }
      if (!user.enrolledServices.includes(paymentId)) {
        user.enrolledServices.push(paymentId);
      }
      await user.save();
      if (!service.enrolledUsers.includes(userId)) {
        await Service.findByIdAndUpdate(paymentId, { $push: { enrolledUsers: userId } });
      }
      payment.status = 'completed';
      await payment.save();
      const notification = new Notification({
        userId,
        title: 'Service Session Purchased',
        message: `You have successfully purchased a session for ${service.name}. Valid until ${expiryDate.toLocaleDateString()}. Staff will mark it complete once service is rendered.`,
        type: 'service',
        relatedItemId: paymentId
      });
      await notification.save();
      return successResponse({
        sessionExpiry: expiryDate,
        sessionValidityDays: sessionValidityDays,
        message: 'Service session purchased successfully.'
      }, res, 200, 'Service session purchased successfully');
    } else if (itemType === 'oneOnOne' || itemType === 'one-on-one') {
      const tutor = await User.findById(paymentId);
      if (!tutor || tutor.role !== 'tutor') {
        return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
      }
      const user = await User.findById(userId);
      if (!user) {
        return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
      }
      const subscriptionDurationDays = 30;
      const expiryDate = new Date(Date.now() + subscriptionDurationDays * 24 * 60 * 60 * 1000);
      const existingSubscriptionIndex = user.oneOnOneSubscriptions.findIndex(sub =>
        sub.tutorId.toString() === tutor._id.toString()
      );
      if (existingSubscriptionIndex >= 0) {
        user.oneOnOneSubscriptions[existingSubscriptionIndex].isActive = true;
        user.oneOnOneSubscriptions[existingSubscriptionIndex].expiry = expiryDate;
      } else {
        user.oneOnOneSubscriptions.push({
          tutorId: tutor._id,
          isActive: true,
          expiry: expiryDate,
        });
      }
      await user.save();
      payment.status = 'completed';
      await payment.save();
      const notification = new Notification({
        userId,
        title: 'One-on-One Tutor Subscription',
        message: `You have successfully subscribed to one-on-one tutoring with ${tutor.fullName}`,
        type: 'service',
        relatedItemId: tutor._id
      });
      await notification.save();
      return successResponse(null, res, 200, 'One-on-one tutoring subscription successful');
    } else {
      return badRequestResponse('Invalid payment type', 'BAD_REQUEST', 400, res);
    }
  }
  return successResponse({}, res, 200, 'Payment validated successfully');
}

exports.validatePayment = async (req, res) => {
  try {
    let {paymentProvider } = req.body;
    const userId = req.user.id;
    let payment;
    // Helper to check for valid ObjectId
    const isValidObjectId = (id) => {
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === id);
    };
    // if (!paymentProvider) {
    //   // Try to infer from payment record
    //   if (isValidObjectId(transactionRef)) {
    //     payment = await Payment.findOne({ _id: transactionRef });
    //   } else {
    //     payment = await Payment.findOne({ transactionRef }) || await Payment.findOne({ 'metadata.transactionRef': transactionRef });
    //   }
    //   paymentProvider = payment?.paymentMethod || 'paystack';
    // }
    paymentProvider = paymentProvider.toLowerCase();


    if (paymentProvider === 'paystack') {
      const { reference: transactionRef } = req.body;

      if (!paymentProvider) {
        // Try to infer from payment record
        if (isValidObjectId(transactionRef)) {
          payment = await Payment.findOne({ _id: transactionRef });
        } else {
          payment = await Payment.findOne({ transactionRef }) || await Payment.findOne({ 'metadata.transactionRef': transactionRef });
        }
        paymentProvider = payment?.paymentMethod || 'paystack';
      }
      const headers = {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      };
      try {
        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${transactionRef}`,
          { headers }
        );
        const data = response.data;
        if (data?.data?.status === 'success') {
          let metadata = data?.data?.metadata;
          return await handleBusinessLogic(metadata, payment, userId, res);
        }
        return badRequestResponse('Paystack payment not successful', 'NOT_SUCCESSFUL', 400, res);
      } catch (error) {
        if (error.status == 400 || error.status == 404) {
          return badRequestResponse("Invalid transaction ref", 'BAD_REQUEST', 400, res);
        }
        return internalServerErrorResponse(error.message, res);
      }
    } else if (paymentProvider === 'flutterwave') {
      const  {transaction_id:transactionRef} = req.body;
        if (isValidObjectId(transactionRef)) {
          payment = await Payment.findOne({ _id: transactionRef });
        } else {
          payment = await Payment.findOne({ transactionRef }) || await Payment.findOne({ 'metadata.transactionRef': transactionRef });
        }
      try {
        const headers = {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        };
        
        const response = await axios.get(
          `https://api.flutterwave.com/v3/transactions/${transactionRef}/verify`,
          { headers }
        );
        const data = response.data;
        if (data.status === 'success' && data.data.status === 'successful') {
          let metadata = data.data.meta || data.data.metaData || {};
          // fallback to data.data.tx_ref if needed
          metadata.transactionRef = data.data.tx_ref;
          
          payment = await Payment.findOne({ _id: metadata.transactionRef }) 
          if (!payment) {
            return badRequestResponse('Payment record not found for this transaction', 'NOT_FOUND', 404, res);
          }

          // check if payment is completed already
          if (payment.status === 'completed') {
            return successResponse(null, res, 200, 'Payment already completed');
          }

          return await handleBusinessLogic(metadata, payment, userId, res);
          return await handleBusinessLogic(metadata, payment, userId, res);
        } else {
          return badRequestResponse('Flutterwave payment not successful', 'NOT_SUCCESSFUL', 400, res);
        }
      } catch (error) {
        return internalServerErrorResponse(error.message, res);
      }
    } else if (paymentProvider === 'stripe') {
      try {
        const { session_id } = req.body;
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session && session.payment_status === 'paid') {
          let metadata = session.metadata || {};
          payment = await Payment.findOne({ _id: metadata.transactionRef }) 
          if (!payment) {
            return badRequestResponse('Payment record not found for this transaction', 'NOT_FOUND', 404, res);
          }

          // check if payment is completed already
          if (payment.status === 'completed') {
            return successResponse(null, res, 200, 'Payment already completed');
          }

          return await handleBusinessLogic(metadata, payment, userId, res);
        } else {
          return badRequestResponse('Stripe payment not successful', 'NOT_SUCCESSFUL', 400, res);
        }
      } catch (error) {
        return internalServerErrorResponse(error.message, res);
      }
    } else {
      return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);
    }
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};
// Webhook stubs for each provider
exports.paystackWebhook = async (req, res) => {
  try {
    const event = req.body;
    if (event.event === 'charge.success' && event.data.status === 'success') {
      let metadata = event.data.metadata;
      await handleBusinessLogic(metadata, null, event.data.customer.id, res);
    }
    res.status(200).send('Paystack webhook processed');
  } catch (error) {
    res.status(500).send('Paystack webhook error');
  }
};

exports.flutterwaveWebhook = async (req, res) => {
  try {
    const event = req.body;
    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      let metadata = event.data.meta || event.data.metaData || {};
      metadata.transactionRef = event.data.tx_ref;
      await handleBusinessLogic(metadata, null, event.data.customer.id, res);
    }
    res.status(200).send('Flutterwave webhook processed');
  } catch (error) {
    res.status(500).send('Flutterwave webhook error');
  }
};

exports.stripeWebhook = async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      let metadata = session.metadata || {};
      metadata.transactionRef = session.id;
      await handleBusinessLogic(metadata, null, session.client_reference_id, res);
    }
    res.status(200).send('Stripe webhook processed');
  } catch (error) {
    res.status(500).send('Stripe webhook error');
  }
};

exports.initiateCardPayment = async (req, res) => {
  try {
    const { itemType, itemId, callbackUrl, paymentProvider } = req.body;
    const userId = req.user.id;
    const provider = (paymentProvider || 'flutterwave').toLowerCase();


    // Helper to get Paystack headers
    const paystackHeaders = () => ({
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    });

    // Helper to get Flutterwave headers
    const flutterwaveHeaders = () => ({
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json'
    });

    // Helper to get Stripe headers
    const stripeHeaders = () => ({
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/json'
    });

    // let progress = await Payment.findOne({ userId, itemId, itemType, status: 'completed' });

    if (itemType == 'service') {
      const service = await Service.findById(itemId);
      if (!service) {
        return badRequestResponse('service not found', 'NOT_FOUND', 404, res);
      }

      if (!service.price) {
        return badRequestResponse('Service price not set', 'BAD_REQUEST', 400, res);
      }

      amount = service.price; // Set amount for service

      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount: amount,
        status: "pending",
        paymentMethod: provider,
      });

      await payment.save();

      const metadata = {
        transactionRef: payment._id.toString(),
        itemId,
        itemType
      };

      if (provider === 'paystack') {
        metadata = {...metadata, courseId: itemId, source: 'course'};
        const payload = {
          amount: 100 * amount, // Paystack expects amount in kobo
          email: req.user.email,
          callback_url: callbackUrl,
          cancel_url: callbackUrl,
          currency: 'NGN',
          channels: ['card'],
          metadata: metadata
        };
        const response = await axios.post(`https://api.paystack.co/transaction/initialize`, payload, {
          headers: paystackHeaders()
        });
        if (response.data.status) {
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initialization successful (Paystack)');
        } else {
          return badRequestResponse("Card tokenization can't be completed at the moment", 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'flutterwave') {
        // Flutterwave expects amount in Naira, not kobo
        const payload = {
          tx_ref: payment._id.toString(),
          amount: amount,
          currency: 'NGN',
          redirect_url: callbackUrl,
          customer: {
            email: req.user.email,
            name: req.user.fullName || req.user.email
          },
          meta: metadata,
          payment_options: 'card',
        };
        const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
          headers: flutterwaveHeaders()
        });
        if (response.data.status === 'success') {
          // Flutterwave returns a link to redirect the user
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initialization successful (Flutterwave)');
        } else {
          return badRequestResponse('Flutterwave payment initialization failed', 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'stripe') {
        // Stripe expects amount in kobo (for NGN) or cents (for USD)
        // We'll use NGN for now
        if (amount < 1000) {
          return badRequestResponse('Stripe payment initialization failed: Amount too low for Stripe minimum. Please enter an amount of at least ₦1000.', 'INIT_FAILED', 400, res);
        }
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'ngn',
                  product_data: {
                    name: itemType + ' payment',
                  },
                  unit_amount: Math.round(amount * 100), // Stripe expects integer in kobo
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: callbackUrl + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: callbackUrl,
            metadata: metadata,
            customer_email: req.user.email,
          });
          return successResponse({ url: session.url, id: session.id }, res, 200, 'Payment initialization successful (Stripe)');
        } catch (err) {
          return badRequestResponse('Stripe payment initialization failed: ' + err.message, 'INIT_FAILED', 400, res);
        }
      } else {
        return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);
      }
    }
    else if (itemType === 'course') {
      // If no progress record exists, create a new one
      const course = await Course.findById(itemId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }
      
      amount = course.price || 100; // Set amount for course

      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount,
        status:"pending",
        paymentMethod: provider,
        metadata: {
          courseId: itemId,
          source: 'course',
        }
      });
      
      await payment.save();

      const metadata = {
        transactionRef: payment._id.toString(),
        itemId,
        itemType
      };

      if (provider === 'paystack') {
        const payload = {
          amount: 100 * amount, // Paystack expects amount in kobo
          email: req.user.email,
          callback_url: callbackUrl,
          cancel_url: callbackUrl,
          currency: 'NGN',
          channels: ['card'],
          metadata: metadata
        };
        const response = await axios.post(`https://api.paystack.co/transaction/initialize`, payload, {
          headers: paystackHeaders()
        });
        if (response.data.status) {
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initialization successful (Paystack)');
        } else {
          return badRequestResponse("Card tokenization can't be completed at the moment", 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'flutterwave') {
        // Flutterwave expects amount in Naira, not kobo
        const payload = {
          tx_ref: payment._id.toString(),
          amount: amount,
          currency: 'NGN',
          redirect_url: callbackUrl,
          customer: {
            email: req.user.email,
            name: req.user.fullName || req.user.email
          },
          meta: metadata,
          payment_options: 'card',
        };
        const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
          headers: flutterwaveHeaders()
        });
        if (response.data.status === 'success') {
          // Flutterwave returns a link to redirect the user
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initialization successful (Flutterwave)');
        } else {
          return badRequestResponse('Flutterwave payment initialization failed', 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'stripe') {
        // Stripe expects amount in kobo (for NGN) or cents (for USD)
        // We'll use NGN for now
        if (amount < 1000) {
          return badRequestResponse('Stripe payment initialization failed: Amount too low for Stripe minimum. Please enter an amount of at least ₦1000.', 'INIT_FAILED', 400, res);
        }
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'ngn',
                  product_data: {
                    name: itemType + ' payment',
                  },
                  unit_amount: Math.round(amount * 100), // Stripe expects integer in kobo
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: callbackUrl + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: callbackUrl,
            metadata: metadata,
            customer_email: req.user.email,
          });
          return successResponse({ url: session.url, id: session.id }, res, 200, 'Payment initialization successful (Stripe)');
        } catch (err) {
          return badRequestResponse('Stripe payment initialization failed: ' + err.message, 'INIT_FAILED', 400, res);
        }
      } else {
        return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);
      }
    }
    else if (itemType === 'oneOnOne' || itemType === 'one-on-one') {
      // Find the tutor
      const tutor = await User.findById(itemId);
      if (!tutor || tutor.role !== 'tutor') {
        return badRequestResponse('Tutor not found', 'NOT_FOUND', 404, res);
      }
      
      // Price can be set from tutor's servicePrice or fixed amount
      amount = tutor.servicePrice || 5000; // example default
      
      let payment = new Payment({
        userId,
        itemId, // tutor id here
        itemType,
        amount,
        status:"pending",
        paymentMethod: provider,
        metadata: {
          tutorId: itemId,
          source: 'one-on-one',
        }
      });

      await payment.save();

      const metadata = {
        transactionRef: payment._id.toString(),
        itemId,
        itemType
      };

      if (provider === 'paystack') {
        const payload = {
          amount: 100 * amount, // Paystack expects amount in kobo
          email: req.user.email,
          callback_url: callbackUrl,
          cancel_url: callbackUrl,
          currency: 'NGN',
          channels: ['card'],
          metadata: metadata
        };
        const response = await axios.post(`https://api.paystack.co/transaction/initialize`, payload, {
          headers: paystackHeaders()
        });
        if (response.data.status) {
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initiated successfully for one-on-one tutoring');
        } else {
          return badRequestResponse("Card tokenization can't be completed at the moment", 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'flutterwave') {
        // Flutterwave expects amount in Naira, not kobo
        const payload = {
          tx_ref: payment._id.toString(),
          amount: amount,
          currency: 'NGN',
          redirect_url: callbackUrl,
          customer: {
            email: req.user.email,
            name: req.user.fullName || req.user.email
          },
          meta: metadata,
          payment_options: 'card',
        };
        const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
          headers: flutterwaveHeaders()
        });
        if (response.data.status === 'success') {
          // Flutterwave returns a link to redirect the user
          const data = response.data.data;
          return successResponse(data, res, 200, 'Payment initialization successful (Flutterwave)');
        } else {
          return badRequestResponse('Flutterwave payment initialization failed', 'INIT_FAILED', 400, res);
        }
      } else if (provider === 'stripe') {
        // Stripe expects amount in kobo (for NGN) or cents (for USD)
        // We'll use NGN for now
        if (amount < 1000) {
          return badRequestResponse('Stripe payment initialization failed: Amount too low for Stripe minimum. Please enter an amount of at least ₦1000.', 'INIT_FAILED', 400, res);
        }
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'ngn',
                  product_data: {
                    name: itemType + ' payment',
                  },
                  unit_amount: Math.round(amount * 100), // Stripe expects integer in kobo
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: callbackUrl + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: callbackUrl,
            metadata: metadata,
            customer_email: req.user.email,
          });
          return successResponse({ url: session.url, id: session.id }, res, 200, 'Payment initialization successful (Stripe)');
        } catch (err) {
          return badRequestResponse('Stripe payment initialization failed: ' + err.message, 'INIT_FAILED', 400, res);
        }
      } else {
        return badRequestResponse('Unsupported payment provider', 'UNSUPPORTED_PROVIDER', 400, res);
      }
    }
  } catch (error) {
    console.error('Error initializing card payment:', error);
    return internalServerErrorResponse('Failed to initiate payment', res);
  }
};



// Get user progress for a specific course
exports.validatePaymentOld = async (req, res) => {
  try {
    const { reference: transactionRef } = req.body;
    const userId = req.user.id; 
    
    const headers = {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    };

    console.log(headers)

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${transactionRef}`,
        { headers }
      );

      const data = response.data; 
      // console.log(data)
      if (data?.data?.status == 'success'){
        
        let metadata = data?.data?.metadata
        let id = metadata?.id
        let itemType = metadata?.metadata?.itemType
        let courseId = metadata?.metadata?.itemId
        let payment = await Payment.findOne({id})
        if(payment){
          if(payment.status == 'completed'){
            return successResponse(null, res,200,'Payment already completed');
          }

          if(itemType == 'course'){
            // Find course
                const course = await Course.findById(courseId);
                if (!course) {
                  return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
                }
                
                // Check if user is already enrolled
                const user = await User.findById(userId);
                if (user.enrolledCourses.includes(courseId)) {
                  return badRequestResponse('User already enrolled in this course', 'BAD_REQUEST', 400, res);
                }
                
                // Update user and course
                await User.findByIdAndUpdate(
                  userId,
                  { $push: { enrolledCourses: courseId } }
                );
                
                await Course.findByIdAndUpdate(
                  courseId,
                  { $push: { enrolledUsers: userId } }
                );
                
                // Create notification
                const notification = new Notification({
                  userId,
                  title: 'Course Enrollment',
                  message: `You have successfully enrolled in ${course.title}`,
                  type: 'course',
                  relatedItemId: courseId
                });
                
                await notification.save();
                
                return successResponse(null, res,200,'Enrolled in course successfully');
          }else{
            return badRequestResponse('Invalid payment type', 'BAD_REQUEST', 400, res);
          }
        }
        
      }
      
      return successResponse({}, res, 200, 'Payment validated successfully');
    } catch (error) {
      // console.log(error)
      if (error.status == 400 || error.status == 404) {
        return badRequestResponse("Invalid transaction ref",group = 'BAD_REQUEST', statusCode = 400, res); 
      }
      return internalServerErrorResponse(error.message, res);
    }
  } catch (error) {
    if (error.status == 400){
      return badRequestResponse(error.message, "NOT_AVAILABLE", 400, res);
    }
    // Handle other unexpected errors
    return internalServerErrorResponse(error.message, res);
  }
};




