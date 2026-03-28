# Recurring Payments Implementation Guide

## Overview
This guide explains how to implement and use recurring payments for services in the EMGS app.

## What Was Added

### 1. **New Models**
- **Subscription Model** (`src/models/subscription.model.js`)
  - Tracks recurring payment subscriptions
  - Stores payment method authorization codes
  - Manages billing cycles (daily, weekly, monthly, quarterly, yearly)
  - Handles subscription states (active, cancelled, paused, expired, failed)

### 2. **Updated Models**
- **Service Model** - Added fields:
  - `subscriptionEnabled`: Boolean flag to enable subscriptions
  - `subscriptionPlans`: Array of subscription plan options with intervals and prices
  
- **User Model** - Added field:
  - `activeSubscriptions`: References to user's active subscription records

### 3. **New Controllers**
- **Subscription Controller** (`src/controllers/subscription.controller.js`)
  - Create subscription
  - Get user subscriptions
  - Get subscription details
  - Cancel subscription
  - Pause/Resume subscription
  - Process recurring payments (automated)

### 4. **New Routes**
- **Subscription Routes** (`src/routes/subscription.routes.js`)
  - `POST /api/v2/subscriptions` - Create new subscription
  - `GET /api/v2/subscriptions` - Get user's subscriptions (with pagination)
  - `GET /api/v2/subscriptions/:id` - Get subscription details
  - `POST /api/v2/subscriptions/:id/cancel` - Cancel subscription
  - `POST /api/v2/subscriptions/:id/pause` - Pause subscription
  - `POST /api/v2/subscriptions/:id/resume` - Resume subscription
  - `POST /api/v2/subscriptions/process/due` - Process due subscriptions (cron/admin)

### 5. **Scheduler**
- **Subscription Scheduler** (`src/utils/subscription.scheduler.js`)
  - Automatically processes recurring payments
  - Runs daily at 2:00 AM by default
  - Configurable cron schedule

## Installation

### Install Required Dependencies
```bash
npm install node-cron
```

The scheduler has already been configured and will start automatically with the server.

## How It Works

### Flow for Creating a Subscription

1. **User Makes Initial Payment**
   - User selects a service with subscription enabled
   - User completes payment via Paystack
   - Paystack returns authorization code for recurring charges

2. **Subscription Creation**
   ```javascript
   POST /api/v2/subscriptions
   {
     "serviceId": "SERVICE_ID",
     "interval": "monthly",
     "paymentReference": "PAYSTACK_REFERENCE"
   }
   ```

3. **Automated Billing**
   - Scheduler runs daily checking for due subscriptions
   - For each due subscription:
     - Charges the saved payment method
     - Creates payment record
     - Updates next billing date
     - Handles failed payments (retry/cancel after 3 attempts)

### Subscription States

- **active**: Subscription is active and billing normally
- **paused**: User paused subscription (no charges until resumed)
- **cancelled**: User cancelled subscription (no future charges)
- **expired**: Subscription ended naturally
- **failed**: Subscription failed after multiple payment attempts

## Usage Examples

### 1. Enable Subscription for a Service
```javascript
// Update service to support subscriptions
await Service.findByIdAndUpdate(serviceId, {
  subscriptionEnabled: true,
  subscriptionPlans: [
    {
      interval: 'monthly',
      price: 5000,
      description: 'Monthly subscription'
    },
    {
      interval: 'yearly',
      price: 50000,
      description: 'Annual subscription (save 15%)'
    }
  ]
});
```

### 2. Create a Subscription (Frontend Flow)
```javascript
// Step 1: User pays via Paystack
const paystack = PaystackPop.setup({
  key: 'your-paystack-public-key',
  email: user.email,
  amount: 5000 * 100, // Amount in kobo
  metadata: {
    serviceId: 'SERVICE_ID',
    userId: 'USER_ID',
    type: 'subscription'
  },
  onSuccess: (transaction) => {
    // Step 2: Create subscription
    fetch('/api/v2/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serviceId: 'SERVICE_ID',
        interval: 'monthly',
        paymentReference: transaction.reference
      })
    });
  }
});

paystack.openIframe();
```

### 3. Get User's Subscriptions
```javascript
GET /api/v2/subscriptions?page=1&limit=10&status=active
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Cancel a Subscription
```javascript
POST /api/v2/subscriptions/SUBSCRIPTION_ID/cancel
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "No longer need the service"
}
```

### 5. Pause/Resume Subscription
```javascript
// Pause
POST /api/v2/subscriptions/SUBSCRIPTION_ID/pause
Authorization: Bearer YOUR_JWT_TOKEN

// Resume
POST /api/v2/subscriptions/SUBSCRIPTION_ID/resume
Authorization: Bearer YOUR_JWT_TOKEN
```

## Testing

### Manual Testing
```bash
# Process subscriptions manually (for testing)
curl -X POST http://localhost:5001/api/v2/subscriptions/process/due \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Change Scheduler Timing (for testing)
In `src/utils/subscription.scheduler.js`, change the SCHEDULE constant:
```javascript
// Test every 5 minutes
const SCHEDULE = '*/5 * * * *';

// Test every hour
const SCHEDULE = '0 * * * *';

// Production: Daily at 2 AM
const SCHEDULE = '0 2 * * *';
```

## Monitoring

### Check Subscription Status
```javascript
GET /api/v2/subscriptions/SUBSCRIPTION_ID
```

Response includes:
- Current status
- Next billing date
- Billing history
- Failed payment attempts
- Payment method info

### View Billing History
Each subscription has a `billingHistory` array with references to all payment records.

## Error Handling

### Failed Payments
- System attempts to charge saved payment method
- If payment fails:
  - `failedPaymentAttempts` counter increases
  - After 3 failed attempts, subscription status changes to `failed`
  - User needs to create a new subscription

### Webhook Integration (Optional)
For real-time payment updates, set up Paystack webhooks:
```javascript
// In your webhook handler
app.post('/api/v2/webhooks/paystack', async (req, res) => {
  const event = req.body;
  
  if (event.event === 'charge.success') {
    // Handle successful recurring charge
    const subscriptionId = event.data.metadata.subscriptionId;
    // Update subscription record
  }
  
  res.sendStatus(200);
});
```

## Environment Variables
Ensure these are set:
```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
MONGODB_URI=your_mongodb_connection_string
```

## Database Indexes
The subscription model includes indexes for efficient queries:
- `{ userId: 1, serviceId: 1, status: 1 }`
- `{ nextBillingDate: 1, status: 1 }`

## Security Considerations

1. **Authorization Codes**: Stored securely in database, never exposed to frontend
2. **Authentication**: All endpoints require valid JWT token
3. **Authorization**: Users can only access their own subscriptions
4. **Payment Processing**: Only server-side with Paystack secret key

## Future Enhancements

Consider adding:
- Email notifications before billing
- SMS reminders
- Grace period for failed payments
- Proration for plan changes
- Usage-based billing
- Coupon/discount codes for subscriptions
- Analytics dashboard for subscription metrics

## Troubleshooting

### Subscriptions Not Processing
1. Check if scheduler is running: Look for "Starting subscription scheduler..." in logs
2. Verify cron format is correct
3. Check Paystack API credentials
4. Review database connections

### Failed Payments
1. Verify authorization code is valid
2. Check card hasn't expired
3. Ensure sufficient balance
4. Review Paystack dashboard for detailed error messages

## Support

For issues or questions:
1. Check subscription logs in server console
2. Review Paystack dashboard for payment details
3. Check MongoDB for subscription records
4. Test endpoints with Postman/curl

## Summary

Recurring payments are now fully implemented! The system will:
- ✅ Store payment authorization securely
- ✅ Automatically charge customers on schedule
- ✅ Handle failed payments gracefully
- ✅ Allow users to manage their subscriptions
- ✅ Track billing history
- ✅ Support multiple billing intervals

Start the server and the scheduler will automatically begin processing subscriptions daily at 2 AM.
