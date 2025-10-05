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
  internalServerErrorResponse 
} = require('../utils/custom_response/responses');



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
      return badRequestResponse('Payment already initiated',"NOT_AVAILABLE",400,res );

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
            
            // Check if user is already enrolled
            const user = await User.findById(userId);
            if (user.enrolledServices.includes(paymentId)) {
              return badRequestResponse('User already enrolled in this service', 'BAD_REQUEST', 400, res);
            }
            
            // Update user and course
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
    const { itemType, itemId, callbackUrl } = req.body;
    const userId = req.user.id;

    let progress = await Payment.findOne({ userId, itemId, itemType, status: 'completed' });

    if (progress) {
      return badRequestResponse('Payment already initiated', res);
    }

    // Helper to get Paystack headers
    const paystackHeaders = () => ({
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    });

    if (itemType == 'course') {
      const course = await Course.findById(itemId);
      if (!course) {
        return badRequestResponse('Course not found', 'NOT_FOUND', 404, res);
      }

      // if (!course.isPublished) {
      //   return badRequestResponse('Cannot enroll for an unpublished course', 'BAD_REQUEST', 400, res);
      // }

      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount: 100,
        status: "pending",
      });

      await payment.save();

      const metadata = {
        transactionRef: payment._id,
        itemId,
        itemType
      };

      const payload = {
        amount: 10 * 100, // Paystack expects amount in kobo
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
        console.log(data);

        return successResponse(data, res, 200, 'Payment initialization successful');
      } else {
        return badRequestResponse("Card tokenization can't be completed at the moment", 'INIT_FAILED', 400, res);
      }

    } else if (itemType == 'service') {
      const service = await Service.findById(itemId);
      if (!service) {
        return badRequestResponse('service not found', 'NOT_FOUND', 404, res);
      }

      let payment = new Payment({
        userId,
        itemId,
        itemType,
        amount: 100,
        status: "pending",
      });

      await payment.save();

      const metadata = {
        transactionRef: payment._id,
        itemId,
        itemType
      };

      const payload = {
        amount: 10 * 100,
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
        console.log(data);

        return successResponse(data, res, 200, 'Payment initialization successful');
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




