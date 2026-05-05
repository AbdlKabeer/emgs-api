const cron = require('node-cron');
const paymentController = require('../controllers/payment.controller');

/**
 * Abandoned Checkout Scheduler
 * Automatically checks for pending payments older than 1 hour 
 * and notifies GHL via webhook.
 */

// Run every 30 minutes
const SCHEDULE = '*/30 * * * *'; 

let scheduledTask;

/**
 * Start the abandoned checkout scheduler
 */
function startAbandonedCheckoutScheduler() {
  console.log('🔄 Starting abandoned checkout scheduler...');
  console.log(`📅 Schedule: ${SCHEDULE}`);
  
  scheduledTask = cron.schedule(SCHEDULE, async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Running abandoned checkout check...`);
    
    try {
      const results = await paymentController.processAbandonedPayments();
      if (results.totalProcessed > 0) {
        console.log(`✅ Abandoned checkout check completed. Processed: ${results.totalProcessed}`);
      }
    } catch (error) {
      console.error(`❌ Error in abandoned checkout scheduler:`, error.message);
    }
  });

  console.log('✅ Abandoned checkout scheduler started successfully');
  return scheduledTask;
}

/**
 * Stop the scheduler
 */
function stopAbandonedCheckoutScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Abandoned checkout scheduler stopped');
  }
}

module.exports = {
  startAbandonedCheckoutScheduler,
  stopAbandonedCheckoutScheduler
};
