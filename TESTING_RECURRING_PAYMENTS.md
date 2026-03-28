# Testing Recurring Payments

This document provides test scenarios for the recurring payments feature.

## Prerequisites

1. Install required dependency:
```bash
npm install node-cron
```

2. Start the server:
```bash
npm run dev
```

3. Have a test Paystack account with test keys in your `.env`:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

## Test Scenarios

### 1. Enable Subscriptions for Services

First, enable subscriptions for your services:

```bash
# Enable for all services
node src/scripts/enableServiceSubscriptions.js all

# Or enable for a specific service
node src/scripts/enableServiceSubscriptions.js "IELTS Masterclass"
```

### 2. Create a Test Subscription

**Step 1: Make initial payment via Paystack**

Use Paystack test card:
- Card number: `4084084084084081`
- Expiry: Any future date
- CVV: `408`

**Step 2: Create subscription via API**

```bash
curl -X POST http://localhost:5001/api/v2/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "serviceId": "SERVICE_ID",
    "interval": "monthly",
    "paymentReference": "PAYSTACK_REFERENCE_FROM_STEP1"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "_id": "SUBSCRIPTION_ID",
    "status": "active",
    "nextBillingDate": "2026-04-28T...",
    "plan": {
      "interval": "monthly",
      "amount": 5000,
      "currency": "NGN"
    }
  }
}
```

### 3. Get User Subscriptions

```bash
curl -X GET "http://localhost:5001/api/v2/subscriptions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Specific Subscription

```bash
curl -X GET http://localhost:5001/api/v2/subscriptions/SUBSCRIPTION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Pause Subscription

```bash
curl -X POST http://localhost:5001/api/v2/subscriptions/SUBSCRIPTION_ID/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Resume Subscription

```bash
curl -X POST http://localhost:5001/api/v2/subscriptions/SUBSCRIPTION_ID/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Cancel Subscription

```bash
curl -X POST http://localhost:5001/api/v2/subscriptions/SUBSCRIPTION_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reason": "Testing cancellation"
  }'
```

### 8. Test Recurring Payment Processing

**Option A: Manually trigger processing**

```bash
curl -X POST http://localhost:5001/api/v2/subscriptions/process/due \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option B: Set scheduler to run frequently for testing**

Edit `src/utils/subscription.scheduler.js`:
```javascript
// Change schedule to run every 2 minutes
const SCHEDULE = '*/2 * * * *';
```

Then restart the server and wait 2 minutes.

**Option C: Manually set nextBillingDate in past**

Using MongoDB Compass or mongo shell:
```javascript
db.subscriptions.updateOne(
  { _id: ObjectId("SUBSCRIPTION_ID") },
  { $set: { nextBillingDate: new Date("2026-03-27") } }
)
```

Then trigger the processing endpoint.

## Test Checklist

- [ ] Service has subscriptionEnabled = true
- [ ] Service has subscriptionPlans array populated
- [ ] Can create subscription with valid payment
- [ ] Cannot create duplicate active subscription
- [ ] Subscription stores authorization code
- [ ] Can retrieve user's subscriptions
- [ ] Can get specific subscription details
- [ ] Can pause active subscription
- [ ] Can resume paused subscription
- [ ] Can cancel subscription
- [ ] Cannot pause/resume cancelled subscription
- [ ] Recurring payment charges card successfully
- [ ] Failed payment increments failedPaymentAttempts
- [ ] Subscription cancelled after 3 failed attempts
- [ ] nextBillingDate updates after successful charge
- [ ] Payment record created for each billing
- [ ] billingHistory array updated

## Frontend Integration Example

```javascript
// 1. Get service details
const service = await fetch('/api/v2/services/SERVICE_ID').then(r => r.json());

// 2. Check if subscriptions are enabled
if (service.data.subscriptionEnabled) {
  // Show subscription options
  service.data.subscriptionPlans.forEach(plan => {
    console.log(`${plan.interval}: ₦${plan.price}`);
  });
}

// 3. Initialize Paystack payment
const paystack = PaystackPop.setup({
  key: 'pk_test_xxxxx',
  email: userEmail,
  amount: selectedPlan.price * 100, // kobo
  metadata: {
    custom_fields: [
      {
        display_name: "Subscription",
        variable_name: "subscription",
        value: "true"
      }
    ]
  },
  onSuccess: async (transaction) => {
    // 4. Create subscription
    const response = await fetch('/api/v2/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serviceId: service.data._id,
        interval: selectedPlan.interval,
        paymentReference: transaction.reference
      })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Subscription created successfully!');
      // Show next billing date
      console.log('Next billing:', result.data.nextBillingDate);
    }
  },
  onClose: () => {
    alert('Payment cancelled');
  }
});

paystack.openIframe();
```

## Monitoring Subscriptions

### Check Logs
When the server starts, you should see:
```
🔄 Starting subscription scheduler...
📅 Schedule: 0 2 * * *
✅ Subscription scheduler started successfully
```

When processing runs:
```
⏰ [2026-03-28T02:00:00.000Z] Running scheduled subscription processing...
✅ Subscription processing completed:
   - Total: 5
   - Successful: 4
   - Failed: 1
```

### Query Database

```javascript
// Get all active subscriptions
db.subscriptions.find({ status: 'active' })

// Get subscriptions due for billing
db.subscriptions.find({
  status: 'active',
  nextBillingDate: { $lte: new Date() }
})

// Get subscription with billing history
db.subscriptions.aggregate([
  { $match: { _id: ObjectId("SUBSCRIPTION_ID") } },
  {
    $lookup: {
      from: 'payments',
      localField: 'billingHistory',
      foreignField: '_id',
      as: 'payments'
    }
  }
])
```

## Common Issues & Solutions

### Issue: Authorization code not saved
**Solution**: Ensure Paystack response includes `authorization` object. Use reusable authorization.

### Issue: Payment fails with "invalid authorization code"
**Solution**: Card authorization may have expired or been revoked. User needs to create new subscription.

### Issue: Scheduler not running
**Solution**: 
1. Check for "Starting subscription scheduler" log
2. Verify node-cron is installed
3. Check cron schedule format
4. Restart server

### Issue: Duplicate charges
**Solution**: 
1. Check `nextBillingDate` is being updated correctly
2. Verify only one scheduler instance is running
3. Check `lastBillingDate` is set after successful charge

## Next Steps

After testing:
1. Switch to production Paystack keys
2. Set production schedule (daily at 2 AM)
3. Set up email notifications
4. Monitor failed payments
5. Set up webhook handlers for real-time updates
6. Implement retry logic for failed payments
7. Add grace period before cancellation
8. Create admin dashboard for subscription monitoring

## Support

For Paystack test cards and testing guide:
https://paystack.com/docs/payments/test-payments/
