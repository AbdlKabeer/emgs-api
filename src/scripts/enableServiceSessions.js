/**
 * Migration Script: Enable Session-Based Services
 * 
 * This script helps you enable session-based (one-time payment) support for services.
 * Similar to one-on-one tutor sessions, but for services.
 * 
 * Usage:
 * node src/scripts/enableServiceSessions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/service.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Enable session-based services for all services
 */
async function enableSessionsForAllServices() {
  try {
    console.log('🔄 Enabling session-based services for all services...\n');

    const services = await Service.find({});
    console.log(`Found ${services.length} services\n`);

    for (const service of services) {
      // Only update if price is set and sessions not already enabled
      if (service.price && !service.sessionEnabled) {
        service.sessionEnabled = true;
        service.sessionPrice = service.price; // Use existing price as session price
        service.sessionValidityDays = 30; // Default 30 days validity

        await service.save();
        console.log(`✅ Enabled sessions for: ${service.name}`);
        console.log(`   Category: ${service.category}`);
        console.log(`   Session Price: ₦${service.sessionPrice}`);
        console.log(`   Validity: ${service.sessionValidityDays} days\n`);
      } else if (!service.price) {
        console.log(`⚠️  Skipped ${service.name} - No price set`);
      } else {
        console.log(`ℹ️  ${service.name} - Already enabled`);
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

/**
 * Enable session-based service for a specific service by ID or name
 */
async function enableSessionForService(identifier, customPrice = null, validityDays = 30) {
  try {
    console.log(`🔄 Looking for service: ${identifier}...\n`);

    // Try to find by ID or name
    const service = await Service.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(identifier) ? identifier : null },
        { name: new RegExp(identifier, 'i') }
      ]
    });

    if (!service) {
      console.log(`❌ Service not found: ${identifier}`);
      return;
    }

    if (!service.price && !customPrice) {
      console.log(`❌ Service "${service.name}" has no price set. Provide a price or set service.price first.`);
      return;
    }

    if (service.sessionEnabled) {
      console.log(`ℹ️  Service "${service.name}" already has sessions enabled.`);
      console.log(`   Current Session Price: ₦${service.sessionPrice}`);
      console.log(`   Current Validity: ${service.sessionValidityDays} days`);
      return;
    }

    service.sessionEnabled = true;
    service.sessionPrice = customPrice || service.price;
    service.sessionValidityDays = validityDays;

    await service.save();

    console.log(`✅ Enabled sessions for: ${service.name}`);
    console.log(`   Category: ${service.category}`);
    console.log(`   Session Price: ₦${service.sessionPrice}`);
    console.log(`   Validity: ${service.sessionValidityDays} days`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

/**
 * Disable session-based service (revert to regular enrollment)
 */
async function disableSessionForService(identifier) {
  try {
    const service = await Service.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(identifier) ? identifier : null },
        { name: new RegExp(identifier, 'i') }
      ]
    });

    if (!service) {
      console.log(`❌ Service not found: ${identifier}`);
      return;
    }

    service.sessionEnabled = false;
    await service.save();

    console.log(`✅ Disabled sessions for: ${service.name}`);
    console.log(`   Service will now use regular enrollment mode`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

/**
 * Update session pricing for all services
 */
async function updateAllSessionPrices(percentage) {
  try {
    console.log(`🔄 Updating all session prices by ${percentage}%...\n`);

    const services = await Service.find({ sessionEnabled: true });
    console.log(`Found ${services.length} session-enabled services\n`);

    for (const service of services) {
      const oldPrice = service.sessionPrice;
      service.sessionPrice = Math.round(oldPrice * (1 + percentage / 100));
      await service.save();

      console.log(`✅ Updated ${service.name}`);
      console.log(`   Old: ₦${oldPrice} → New: ₦${service.sessionPrice}\n`);
    }

    console.log('\n✅ All prices updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// ========================================
// RUN SCRIPT
// ========================================

const args = process.argv.slice(2);
const command = args[0];
const param1 = args[1];
const param2 = args[2];

if (command === 'all') {
  // Enable sessions for all services
  enableSessionsForAllServices();
} else if (command === 'enable' && param1) {
  // Enable session for specific service
  // Usage: node script.js enable "Service Name" [customPrice] [validityDays]
  const customPrice = param2 ? parseFloat(param2) : null;
  const validityDays = args[3] ? parseInt(args[3]) : 30;
  enableSessionForService(param1, customPrice, validityDays);
} else if (command === 'disable' && param1) {
  // Disable session for specific service
  disableSessionForService(param1);
} else if (command === 'update-prices' && param1) {
  // Update all session prices by percentage
  // Usage: node script.js update-prices 10 (increases by 10%)
  updateAllSessionPrices(parseFloat(param1));
} else {
  console.log(`
📖 Usage:
  
  Enable sessions for all services:
    node src/scripts/enableServiceSessions.js all
  
  Enable session for a specific service:
    node src/scripts/enableServiceSessions.js enable "Service Name"
    node src/scripts/enableServiceSessions.js enable SERVICE_ID
    node src/scripts/enableServiceSessions.js enable "Service Name" 5000 30
  
  Disable session for a service:
    node src/scripts/enableServiceSessions.js disable "Service Name"
  
  Update all session prices by percentage:
    node src/scripts/enableServiceSessions.js update-prices 10

Examples:
  node src/scripts/enableServiceSessions.js all
  node src/scripts/enableServiceSessions.js enable "IELTS Masterclass"
  node src/scripts/enableServiceSessions.js enable "IELTS Masterclass" 7500 45
  node src/scripts/enableServiceSessions.js disable "Parcel Services"
  node src/scripts/enableServiceSessions.js update-prices 15
  `);
  mongoose.connection.close();
}
