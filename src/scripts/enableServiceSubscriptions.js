/**
 * Migration Script: Enable Subscriptions for Services
 * 
 * This script helps you enable subscription support for existing services.
 * You can run this to update all or specific services.
 * 
 * Usage:
 * node src/scripts/enableServiceSubscriptions.js
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
 * Enable subscriptions for all services
 */
async function enableSubscriptionsForAllServices() {
  try {
    console.log('🔄 Enabling subscriptions for all services...\n');

    const services = await Service.find({});
    console.log(`Found ${services.length} services\n`);

    for (const service of services) {
      // Only update if price is set and subscriptions not already enabled
      if (service.price && !service.subscriptionEnabled) {
        service.subscriptionEnabled = true;
        service.subscriptionPlans = [
          {
            interval: 'monthly',
            price: service.price,
            description: `Monthly subscription for ${service.name}`
          },
          {
            interval: 'quarterly',
            price: Math.round(service.price * 3 * 0.9), // 10% discount
            description: `Quarterly subscription for ${service.name} (Save 10%)`
          },
          {
            interval: 'yearly',
            price: Math.round(service.price * 12 * 0.85), // 15% discount
            description: `Annual subscription for ${service.name} (Save 15%)`
          }
        ];

        await service.save();
        console.log(`✅ Enabled subscriptions for: ${service.name}`);
        console.log(`   Category: ${service.category}`);
        console.log(`   Base Price: ₦${service.price}`);
        console.log(`   Plans: Monthly, Quarterly, Yearly\n`);
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
 * Enable subscription for a specific service by ID or name
 */
async function enableSubscriptionForService(identifier) {
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

    if (!service.price) {
      console.log(`❌ Service "${service.name}" has no price set. Set a price first.`);
      return;
    }

    if (service.subscriptionEnabled) {
      console.log(`ℹ️  Service "${service.name}" already has subscriptions enabled.`);
      return;
    }

    service.subscriptionEnabled = true;
    service.subscriptionPlans = [
      {
        interval: 'monthly',
        price: service.price,
        description: `Monthly subscription for ${service.name}`
      },
      {
        interval: 'quarterly',
        price: Math.round(service.price * 3 * 0.9),
        description: `Quarterly subscription for ${service.name} (Save 10%)`
      },
      {
        interval: 'yearly',
        price: Math.round(service.price * 12 * 0.85),
        description: `Annual subscription for ${service.name} (Save 15%)`
      }
    ];

    await service.save();

    console.log(`✅ Enabled subscriptions for: ${service.name}`);
    console.log(`   Category: ${service.category}`);
    console.log(`   Base Price: ₦${service.price}`);
    console.log(`\n   Subscription Plans:`);
    service.subscriptionPlans.forEach(plan => {
      console.log(`   - ${plan.interval}: ₦${plan.price} (${plan.description})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

/**
 * Custom subscription setup
 * Use this to create custom subscription plans for a service
 */
async function setupCustomSubscription(serviceName, plans) {
  try {
    const service = await Service.findOne({ name: new RegExp(serviceName, 'i') });

    if (!service) {
      console.log(`❌ Service not found: ${serviceName}`);
      return;
    }

    service.subscriptionEnabled = true;
    service.subscriptionPlans = plans;
    await service.save();

    console.log(`✅ Custom subscription setup completed for: ${service.name}`);
    console.log(`   Plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.interval}: ₦${plan.price}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// ========================================
// RUN SCRIPT
// ========================================

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'all') {
  // Enable for all services
  enableSubscriptionsForAllServices();
} else if (command && command !== 'custom') {
  // Enable for specific service
  enableSubscriptionForService(command);
} else if (command === 'custom') {
  // Example: Custom setup
  // Modify this section for your needs
  setupCustomSubscription('IELTS Masterclass', [
    {
      interval: 'weekly',
      price: 2000,
      description: 'Weekly IELTS coaching'
    },
    {
      interval: 'monthly',
      price: 7000,
      description: 'Monthly IELTS coaching (Save 12%)'
    }
  ]);
} else {
  console.log(`
📖 Usage:
  
  Enable subscriptions for all services:
    node src/scripts/enableServiceSubscriptions.js all
  
  Enable subscription for a specific service:
    node src/scripts/enableServiceSubscriptions.js "Service Name"
    node src/scripts/enableServiceSubscriptions.js SERVICE_ID
  
  Custom setup (edit script first):
    node src/scripts/enableServiceSubscriptions.js custom

Examples:
  node src/scripts/enableServiceSubscriptions.js all
  node src/scripts/enableServiceSubscriptions.js "IELTS Masterclass"
  node src/scripts/enableServiceSubscriptions.js 60f7b3c4d5e8a2b4c8d9e0f1
  `);
  mongoose.connection.close();
}
