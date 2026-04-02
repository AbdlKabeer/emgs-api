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

exports.validatePayment = async (req, res) => {
  try {
    const { reference: transactionRef } = req.body;
    const userId = req.user.id; 
    
    const headers = {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    };

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${transactionRef}`,
        { headers }
      );

      const data = response.data; 
      console.log(data?.data?.status == 'success')
      if (data?.data?.status == 'success'){
        
        let metadata = data?.data?.metadata;

        console.log(metadata)
        let id = metadata?.transactionRef;
        let itemType = metadata?.itemType;
        let paymentId = metadata?.itemId
        let courseId = metadata?.itemId;
        let payment = await Payment.findById(id);
        
        if(payment){
          if(payment.status == 'completed'){
            return successResponse(null, res, 200, 'Payment already completed');
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
            
            // Mark payment as completed
            payment.status = 'completed';
            await payment.save();
            // create the transaction record for the purchase
            
            let fullAmount  = payment.amount
            // Update tutor earnings
            

            // Process referral reward if user was referred
            if (user.referredBy) {
              const referrer = await User.findById(user.referredBy);
              if (referrer) {
              // if (referrer && !user.referralPointDisbursed) {
                // get 10% of the money paid 
                const referralReward = fullAmount * 0.1;
                const wallet = await Wallet.findOneAndUpdate(
                  { userId },
                  { $inc: { balance:referralReward } },
                  { new: true, upsert: true } // Create wallet if it doesn't exist
                );
                fullAmount = fullAmount - referralReward
                // Add this user to referrer's referrals list
                referrer.referrals.push(user._id);
                user.referralPointDisbursed = true
                await user.save()
                await referrer.save();
              }
            }

            try {
              await walletController.updateEarningsFromPurchase(courseId,fullAmount,payment._id);
            } catch (walletError) {
              console.error('Error updating wallet:', walletError);
              // Continue with enrollment even if wallet update fails
            }
            
            return successResponse(null, res, 200, 'Enrolled in course successfully');
          } else if (itemType == 'service'){
            const service = await Service.findById(paymentId);
            if (!service) {
              return badRequestResponse('service not found', 'NOT_FOUND', 404, res);
            }
            
            const user = await User.findById(userId);
            if (!user) {
              return badRequestResponse('User not found', 'NOT_FOUND', 404, res);
            }

            // Check if service has session-based subscription enabled
            if (true) {
              // Session-based service (similar to one-on-one)
              const sessionValidityDays = service.sessionValidityDays || 30;
              const expiryDate = new Date(Date.now() + sessionValidityDays * 24 * 60 * 60 * 1000);

              // Check if user already has an active session with this service
              const existingSessionIndex = user.serviceSubscriptions.findIndex(sub =>
                sub.serviceId.toString() === service._id.toString() &&
                sub.isActive &&
                (!sub.expiry || new Date(sub.expiry) > new Date())
              );

              if (existingSessionIndex >= 0) {
                // Extend or reactivate existing session
                user.serviceSubscriptions[existingSessionIndex].isActive = true;
                user.serviceSubscriptions[existingSessionIndex].expiry = expiryDate;
                user.serviceSubscriptions[existingSessionIndex].purchasedAt = new Date();
                user.serviceSubscriptions[existingSessionIndex].paymentId = payment._id;
              } else {
                // Add new service session
                user.serviceSubscriptions.push({
                  serviceId: service._id,
                  isActive: true,
                  expiry: expiryDate,
                  purchasedAt: new Date(),
                  paymentId: payment._id
                });
              }

              // Add to enrolledServices if not already there
              if (!user.enrolledServices.includes(paymentId)) {
                user.enrolledServices.push(paymentId);
              }

              await user.save();

              // Update service enrolled users
              if (!service.enrolledUsers.includes(userId)) {
                await Service.findByIdAndUpdate(
                  paymentId,
                  { $push: { enrolledUsers: userId } }
                );
              }

              // Mark payment as completed
              payment.status = 'completed';
              await payment.save();

              // Create notification
              const notification = new Notification({
                userId,
                title: 'Service Session Purchased',
                message: `You have successfully purchased a session for ${service.name}. Valid until ${expiryDate.toLocaleDateString()}. Staff will mark it complete once service is rendered.`,
                type: 'service',
                relatedItemId: paymentId
              });

              await notification.save();

              return successResponse(
                {
                  sessionExpiry: expiryDate,
                  sessionValidityDays: sessionValidityDays,
                  message: 'Service session purchased successfully. Please wait for staff to complete your session.'
                }, 
                res, 
                200, 
                'Service session purchased successfully'
              );

            } else {
              // Regular enrollment (old behavior for non-session services)
              if (user.enrolledServices.includes(paymentId)) {
                return badRequestResponse('User already enrolled in this service', 'BAD_REQUEST', 400, res);
              }
              
              // Update user and service
              await User.findByIdAndUpdate(
                userId,
                { $push: { enrolledServices: paymentId } }
              );
              
              await Service.findByIdAndUpdate(
                paymentId,
                { $push: { enrolledUsers: userId } }
              );
              
              // Create notification
              const notification = new Notification({
                userId,
                title: 'Service Enrollment',
                message: `You have successfully enrolled in ${service.name}`,
                type: 'service',
                relatedItemId: paymentId
              });

              await notification.save();
              
              // Mark payment as completed
              payment.status = 'completed';
              await payment.save();

              return successResponse(null, res, 200, 'Enrolled in service successfully');
            }
          }
          else if (itemType === 'oneOnOne' || itemType === 'one-on-one') {
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
            // Check if subscription already exists for this tutor
            const existingSubscriptionIndex = user.oneOnOneSubscriptions.findIndex(sub =>
              sub.tutorId.toString() === tutor._id.toString()
            );

            if (existingSubscriptionIndex >= 0) {
              // Reactivate / update expiry and isActive
              user.oneOnOneSubscriptions[existingSubscriptionIndex].isActive = true;
              user.oneOnOneSubscriptions[existingSubscriptionIndex].expiry = expiryDate;
            } else {
              // Add new subscription entry
              user.oneOnOneSubscriptions.push({
                tutorId: tutor._id,
                isActive: true,
                expiry: expiryDate,
              });
            }
            await user.save();
            payment.status = 'completed';
            await payment.save();
            // Optionally create notification
            const notification = new Notification({
              userId,
              title: 'One-on-One Tutor Subscription',
              message: `You have successfully subscribed to one-on-one tutoring with ${tutor.fullName}`,
              type: 'service',
              relatedItemId: tutor._id
            });

            await notification.save();

            return successResponse(null, res, 200, 'One-on-one tutoring subscription successful');
          }

          else {
            return badRequestResponse('Invalid payment type', 'BAD_REQUEST', 400, res);
          }
        }
      }
      
      return successResponse({}, res, 200, 'Payment validated successfully');
    } catch (error) {
      if (error.status == 400 || error.status == 404) {
        return badRequestResponse("Invalid transaction ref", 'BAD_REQUEST', 400, res); 
      }
      return internalServerErrorResponse(error.message, res);
    }
  } catch (error) {
    if (error.status == 400){
      return badRequestResponse(error.message, "NOT_AVAILABLE", 400, res);
    }
    return internalServerErrorResponse(error.message, res);
  }
};

exports.initiateCardPayment = async (req, res) => {
  try {
    const { itemType, itemId, callbackUrl, paymentProvider } = req.body;
    const userId = req.user.id;
    const provider = (paymentProvider || 'flutterwave').toLowerCase();

    // let progress = await Payment.findOne({ userId, itemId, itemType, status: 'completed' });

    // if (progress) {
    //   return badRequestResponse('Payment already initiated', res);
    // }

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

    let amount = 0;

    if (itemType == 'course') {
      const course = await Course.findById(itemId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }

      // if (!course.isPublished) {
      //   return badRequestResponse('Cannot enroll for an unpublished course', 'BAD_REQUEST', 400, res);
      // }
      amount = course.price || 100; // default price if not set


      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount: amount,
        status: "pending",
        paymentMethod: provider,
        metadata: {
          courseId: itemId,
          source: 'course',
        }
      });

      await payment.save();

      const metadata = {
        transactionRef: payment._id,
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
                  unit_amount: amount * 100, // Stripe expects amount in kobo
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

    } else if (itemType == 'service') {
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
        transactionRef: payment._id,
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
        // TODO: Implement Flutterwave payment initialization
        // See https://developer.flutterwave.com/docs/collecting-payments/standard/
        return badRequestResponse('Flutterwave integration not implemented yet', 'NOT_IMPLEMENTED', 400, res);
      } else if (provider === 'stripe') {
        // TODO: Implement Stripe payment initialization
        // See https://stripe.com/docs/api/checkout/sessions/create
        return badRequestResponse('Stripe integration not implemented yet', 'NOT_IMPLEMENTED', 400, res);
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
        metadata: {
          tutorId: itemId,
          source: 'one-on-one',
        }
      });


      await payment.save();

      const metadata = {
        transactionRef: payment._id,
        itemId,
        itemType
      };

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

      console.log(response)

      if (response.data.status) {
        const data = response.data.data;
        console.log(data);

        return successResponse(data, res, 200, 'Payment initiated successfully for one-on-one tutoring');
      } else {
        return badRequestResponse("Card tokenization can't be completed at the moment", 'INIT_FAILED', 400, res);
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




