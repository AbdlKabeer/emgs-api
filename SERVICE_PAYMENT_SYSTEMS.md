# Service Payment Systems - Quick Reference

## Two Systems Available

Your EMGS app now supports **two types of service payment systems**:

### 1. 🔄 Recurring Subscriptions
Automated billing that repeats on a schedule.

### 2. 🎫 Session-Based Subscriptions  
One-time payment with staff-controlled completion (like one-on-one tutors).

---

## System Comparison

| Feature | Session-Based | Recurring |
|---------|---------------|-----------|
| **Payment Frequency** | One-time | Daily/Weekly/Monthly/Quarterly/Yearly |
| **Automation** | Manual (staff completes) | Automatic (cron job) |
| **Use Case** | One-time services | Ongoing subscriptions |
| **Completion** | Staff marks complete | Auto-renews until cancelled |
| **Payment to Provider** | After staff marks complete | Immediate on each billing |
| **Validity** | Time-limited (30 days default) | Until cancelled |
| **Storage** | User model (serviceSubscriptions) | Subscription model |
| **Suitable For** | Visa booking, flight booking, job applications | Gym memberships, Netflix-style access |

---

## Quick Setup

### Enable Session-Based Service
```bash
node src/scripts/enableServiceSessions.js enable "Visa Booking" 15000 45
```

Sets:
- `sessionEnabled: true`
- `sessionPrice: 15000`
- `sessionValidityDays: 45`

### Enable Recurring Subscription
```bash
node src/scripts/enableServiceSubscriptions.js enable "IELTS Masterclass"
```

Sets:
- `subscriptionEnabled: true`
- `subscriptionPlans: [monthly, quarterly, yearly]`

---

## API Endpoints

### Session-Based

**Student:**
- `POST /api/v2/payment` - Buy session
- `POST /api/v2/payment/validate` - Confirm payment

**Staff/Admin:**
- `GET /api/v2/service-sessions/pending` - View pending sessions
- `POST /api/v2/service-sessions/:userId/:serviceId/complete` - Mark complete
- `GET /api/v2/service-sessions/completed` - View completed

### Recurring Subscriptions

**Student:**
- `POST /api/v2/subscriptions` - Create subscription
- `GET /api/v2/subscriptions` - View my subscriptions
- `POST /api/v2/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/v2/subscriptions/:id/pause` - Pause subscription
- `POST /api/v2/subscriptions/:id/resume` - Resume subscription

**System:**
- Runs daily at 2 AM automatically charging active subscriptions

---

## Which System Should You Use?

### Use **Session-Based** for:
- ✅ One-time services (visa booking, flight booking)
- ✅ Services that need staff verification before payment
- ✅ Services with a clear completion point
- ✅ Services where you want quality control

**Examples:**
- Visa application services
- Flight/hotel bookings
- Job application services
- Document processing
- One-time consultations

### Use **Recurring** for:
- ✅ Ongoing access/memberships
- ✅ Services with automatic renewal
- ✅ Predictable recurring revenue
- ✅ Services without clear "completion"

**Examples:**
- IELTS coaching subscriptions
- Monthly tutoring access
- Premium content access
- Software licenses
- Gym/fitness memberships

---

## Can Both Be Enabled?

**Yes!** A service can support both:
- `sessionEnabled: true` + `sessionPrice: 5000`
- `subscriptionEnabled: true` + `subscriptionPlans: [...]`

Let students choose:
- Pay ₦5,000 for one session (session-based)
- Subscribe for ₦15,000/month (recurring)

---

## Payment Flow Comparison

### Session-Based Flow
```
Student pays
    ↓
Session created (active)
    ↓
Student waits
    ↓
Staff renders service
    ↓
Staff marks complete
    ↓
Provider gets paid
```

### Recurring Flow
```
Student pays initial
    ↓
Subscription created (active)
    ↓
Access granted immediately
    ↓
System auto-charges monthly
    ↓
Provider paid immediately
    ↓
Continues until cancelled
```

---

## Database Fields

### Service Model
```javascript
{
  // Session-based
  sessionEnabled: Boolean,
  sessionPrice: Number,
  sessionValidityDays: Number,
  
  // Recurring
  subscriptionEnabled: Boolean,
  subscriptionPlans: [{
    interval: String,
    price: Number,
    description: String
  }]
}
```

### User Model
```javascript
{
  // Session-based
  serviceSubscriptions: [{
    serviceId: ObjectId,
    isActive: Boolean,
    expiry: Date,
    purchasedAt: Date,
    paymentId: ObjectId
  }],
  completedServiceSessions: [{
    serviceId: ObjectId,
    completedAt: Date,
    completedBy: ObjectId,
    notes: String
  }],
  
  // Recurring
  activeSubscriptions: [ObjectId] // refs to Subscription model
}
```

---

## Migration Path

### Existing Services
1. **Keep as-is**: Regular enrollment (old system)
2. **Add sessions**: Enable `sessionEnabled`
3. **Add recurring**: Enable `subscriptionEnabled`
4. **Add both**: Enable both for flexibility

All three modes are backward compatible!

---

## Documentation Files

- **SESSION_BASED_SERVICES_GUIDE.md** - Complete session-based guide
- **RECURRING_PAYMENTS_GUIDE.md** - Complete recurring guide
- **TESTING_RECURRING_PAYMENTS.md** - Testing scenarios

---

## Quick Commands Cheat Sheet

```bash
# Session-based
node src/scripts/enableServiceSessions.js all
node src/scripts/enableServiceSessions.js enable "Service Name" 5000 30
node src/scripts/enableServiceSessions.js disable "Service Name"

# Recurring
node src/scripts/enableServiceSubscriptions.js all
node src/scripts/enableServiceSubscriptions.js "Service Name"

# Start server (auto-starts recurring scheduler)
npm run dev
```

---

## Support & Troubleshooting

### Session-Based Issues
- Session not appearing? Check `sessionEnabled: true`
- Can't complete? Verify staff has admin role
- Provider not paid? Check service has `user` field set

### Recurring Issues
- Not auto-charging? Check scheduler is running
- Payment failed? Check Paystack authorization code
- Subscription not created? Verify payment reference

---

## Summary

You now have **two powerful payment systems**:

1. **Session-Based**: Perfect for one-time services with staff control
2. **Recurring**: Perfect for ongoing subscriptions with automation

Choose based on your service type, or enable both for maximum flexibility! 🚀
