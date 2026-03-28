const cron = require('node-cron');
const subscriptionController = require('../controllers/subscription.controller');

/**
 * Subscription Scheduler
 * Automatically processes recurring payments for active subscriptions
 */

// Run every day at 2:00 AM
const SCHEDULE = '0 2 * * *'; // Cron format: minute hour day month dayOfWeek

// Alternative schedules you can use:
// '*/30 * * * *'  - Every 30 minutes (for testing)
// '0 * * * *'     - Every hour
// '0 */6 * * *'   - Every 6 hours
// '0 2 * * *'     - Every day at 2:00 AM
// '0 2 * * 0'     - Every Sunday at 2:00 AM

let scheduledTask;

/**
 * Start the subscription processing scheduler
 */
function startSubscriptionScheduler() {
  console.log('🔄 Starting subscription scheduler...');
  console.log(`📅 Schedule: ${SCHEDULE}`);
  
  scheduledTask = cron.schedule(SCHEDULE, async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Running scheduled subscription processing...`);
    
    try {
      const results = await subscriptionController.processDueSubscriptions();
      
      console.log(`✅ Subscription processing completed:`);
      console.log(`   - Total: ${results.total}`);
      console.log(`   - Successful: ${results.successful}`);
      console.log(`   - Failed: ${results.failed}`);
      
      // Log failed subscriptions for debugging
      if (results.failed > 0) {
        const failed = results.details.filter(d => !d.success);
        console.log(`\n❌ Failed subscriptions:`);
        failed.forEach(f => {
          console.log(`   - Subscription ${f.subscriptionId}: ${f.message}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error in subscription scheduler:`, error);
    }
  });

  console.log('✅ Subscription scheduler started successfully');
  return scheduledTask;
}

/**
 * Stop the subscription processing scheduler
 */
function stopSubscriptionScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Subscription scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    isRunning: scheduledTask ? true : false,
    schedule: SCHEDULE,
    nextRun: scheduledTask ? 'Check cron schedule' : null
  };
}

module.exports = {
  startSubscriptionScheduler,
  stopSubscriptionScheduler,
  getSchedulerStatus
};
