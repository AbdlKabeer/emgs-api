const cron = require('node-cron');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');

// Run daily at midnight
const SCHEDULE = '0 0 * * *'; 

let scheduledTask;

const getDurationInDays = (durationWeeks) => {
  if (durationWeeks === null || isNaN(Number(durationWeeks))) return null;
  return Number(durationWeeks) * 7;
};

const checkAndRevokeExpiredCourses = async () => {
  try {
    console.log('[CourseExpiryJob] Starting check for expired course subscriptions...');

    // Find all subscription courses
    const courses = await Course.find({ paymentType: 'subscription', subscriptionDuration: { $ne: null } });

    for (const course of courses) {
      const durationDays = getDurationInDays(course.subscriptionDuration);
      if (!durationDays) continue;

      // Check each enrolled user
      for (const userId of course.enrolledUsers) {
        // Find their latest successful payment for this course
        const latestPayment = await Payment.findOne({
          userId: userId,
          itemId: course._id,
          itemType: 'course',
          status: 'completed'
        }).sort({ createdAt: -1 });

        if (latestPayment) {
          const purchaseDate = new Date(latestPayment.createdAt);
          const expiryDate = new Date(purchaseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
          const now = new Date();

          if (now > expiryDate) {
            console.log(`[CourseExpiryJob] User ${userId} subscription for Course ${course._id} has expired. Revoking access.`);
            
            // Remove from course's enrolledUsers
            await Course.findByIdAndUpdate(course._id, {
              $pull: { enrolledUsers: userId }
            });

            // Remove from user's enrolledCourses
            await User.findByIdAndUpdate(userId, {
              $pull: { enrolledCourses: course._id }
            });
          }
        }
      }
    }
    
    console.log('[CourseExpiryJob] Completed check for expired course subscriptions.');
  } catch (error) {
    console.error('[CourseExpiryJob] Error running expiry job:', error);
  }
};

const startCourseExpiryJob = () => {
  if (scheduledTask) {
    console.log('Course expiry job is already scheduled.');
    return;
  }

  scheduledTask = cron.schedule(SCHEDULE, checkAndRevokeExpiredCourses);
  console.log('Course expiry job scheduled to run daily at midnight.');
};

const stopCourseExpiryJob = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Course expiry job stopped.');
  }
};

module.exports = {
  startCourseExpiryJob,
  stopCourseExpiryJob,
  checkAndRevokeExpiredCourses
};
