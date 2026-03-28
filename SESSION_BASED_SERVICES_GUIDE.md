# Session-Based Service Subscriptions Guide

## Overview

This document explains the **session-based service subscription** system, which works similarly to the one-on-one tutor system but for services. Students pay once for a service session, and staff/admin marks the session as complete when the service is rendered.

## Key Differences from Recurring Subscriptions

| Feature | Session-Based | Recurring Subscriptions |
|---------|---------------|------------------------|
| **Payment** | One-time | Automated recurring |
| **Duration** | Single session + validity period | Until cancelled |
| **Completion** | Staff marks complete | Automatic renewal |
| **Payment Release** | After staff marks complete | Immediate |
| **Use Case** | One-time services | Ongoing subscriptions |

## How It Works

### 1. Enable Session-Based Service

First, enable session support for your services:

```bash
# Enable for all services
node src/scripts/enableServiceSessions.js all

# Enable for specific service
node src/scripts/enableServiceSessions.js enable "IELTS Masterclass"

# Enable with custom price and validity
node src/scripts/enableServiceSessions.js enable "IELTS Masterclass" 7500 45
```

This sets:
- `sessionEnabled: true`
- `sessionPrice: [amount]`
- `sessionValidityDays: [days]` (default: 30)

### 2. Student Purchase Flow

**Step A: Initiate Payment**
```javascript
POST /api/v2/payment
Headers: {
  Authorization: Bearer JWT_TOKEN
}
Body: {
  "itemType": "service",
  "itemId": "SERVICE_ID"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "transactionRef": "PAYMENT_ID",
    "metadata": {
      "transactionRef": "PAYMENT_ID",
      "itemId": "SERVICE_ID",
      "itemType": "service"
    }
  },
  "message": "Payment initiated successfully for service"
}
```

**Step B: Complete Paystack Payment**

Student completes payment via Paystack with the reference.

**Step C: Validate Payment**
```javascript
POST /api/v2/payment/validate
Body: {
  "reference": "PAYSTACK_REFERENCE"
}
```

Response (for session-enabled service):
```json
{
  "success": true,
  "data": {
    "sessionExpiry": "2026-04-27T12:00:00.000Z",
    "sessionValidityDays": 30,
    "message": "Service session purchased successfully. Please wait for staff to complete your session."
  },
  "message": "Service session purchased successfully"
}
```

### 3. Session Storage

When payment is validated, the system creates:

```javascript
user.serviceSubscriptions.push({
  serviceId: SERVICE_ID,
  isActive: true,
  expiry: Date.now() + 30 days,
  purchasedAt: Date.now(),
  paymentId: PAYMENT_ID
});
```

### 4. Staff Management

#### View Pending Sessions

```javascript
GET /api/v2/service-sessions/pending
Headers: {
  Authorization: Bearer ADMIN_JWT_TOKEN
}
Query Parameters:
  ?page=1
  &limit=20
  &serviceId=SERVICE_ID (optional)
  &userId=USER_ID (optional)
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "userId": "USER_ID",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "userPhone": "+1234567890",
      "serviceId": "SERVICE_ID",
      "serviceName": "IELTS Masterclass",
      "serviceCategory": "IELTS Masterclass",
      "sessionPurchasedAt": "2026-03-28T10:00:00.000Z",
      "sessionExpiry": "2026-04-27T10:00:00.000Z",
      "sessionIsActive": true,
      "paymentAmount": 7500,
      "paymentId": "PAYMENT_ID",
      "paymentStatus": "completed"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### Mark Session Complete

```javascript
POST /api/v2/service-sessions/:userId/:serviceId/complete
Headers: {
  Authorization: Bearer ADMIN_JWT_TOKEN
}
Body: {
  "notes": "Session completed successfully. Student received visa booking confirmation."
}
```

This triggers:
1. ✅ Marks session as inactive (isActive: false)
2. 📝 Logs completion with staff ID and notes
3. 💰 Credits service provider's wallet
4. 💳 Creates transaction record
5. 🔔 Notifies service provider
6. 🔔 Notifies student

Response:
```json
{
  "success": true,
  "data": {
    "userId": "USER_ID",
    "userName": "John Doe",
    "serviceId": "SERVICE_ID",
    "serviceName": "IELTS Masterclass",
    "completedAt": "2026-03-28T15:30:00.000Z",
    "completedBy": "STAFF_ID"
  },
  "message": "Service session marked as complete successfully"
}
```

#### View Completed Sessions

```javascript
GET /api/v2/service-sessions/completed
Headers: {
  Authorization: Bearer ADMIN_JWT_TOKEN
}
Query Parameters:
  ?page=1
  &limit=20
  &serviceId=SERVICE_ID (optional)
  &userId=USER_ID (optional)
  &startDate=2026-03-01 (optional)
  &endDate=2026-03-31 (optional)
```

#### View User's Sessions

```javascript
GET /api/v2/service-sessions/user/:userId
Headers: {
  Authorization: Bearer ADMIN_JWT_TOKEN
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "activeSessions": [
      {
        "serviceId": {
          "_id": "SERVICE_ID",
          "name": "Visa Booking",
          "category": "Visa Booking"
        },
        "isActive": true,
        "expiry": "2026-04-15T00:00:00.000Z",
        "purchasedAt": "2026-03-16T10:00:00.000Z"
      }
    ],
    "expiredSessions": [],
    "completedSessions": [
      {
        "serviceId": "SERVICE_ID",
        "completedAt": "2026-03-20T14:30:00.000Z",
        "completedBy": "STAFF_ID",
        "notes": "Service rendered successfully"
      }
    ],
    "totalActive": 1,
    "totalCompleted": 3
  }
}
```

## Database Schema

### User Model Additions

```javascript
serviceSubscriptions: [
  {
    serviceId: ObjectId,        // Reference to Service
    isActive: Boolean,          // false after completion
    expiry: Date,               // Session validity (30 days default)
    purchasedAt: Date,          // When purchased
    paymentId: ObjectId         // Reference to Payment
  }
]

completedServiceSessions: [
  {
    serviceId: ObjectId,        // Reference to Service
    completedAt: Date,          // When staff marked complete
    completedBy: ObjectId,      // Staff/Admin who completed it
    notes: String               // Staff notes
  }
]
```

### Service Model Additions

```javascript
sessionEnabled: Boolean,        // Enable session-based mode
sessionPrice: Number,           // Price per session
sessionValidityDays: Number     // Days before session expires (default: 30)
```

## Payment Flow Diagram

```
Student
  ↓
  1. Initiates payment (POST /api/v2/payment)
  ↓
  2. Completes Paystack payment
  ↓
  3. Validates payment (POST /api/v2/payment/validate)
  ↓
  4. Session created (active, 30-day expiry)
  ↓
  [Student waits for service]
  ↓
Staff/Admin
  ↓
  5. Views pending sessions (GET /api/v2/service-sessions/pending)
  ↓
  6. Renders service to student
  ↓
  7. Marks session complete (POST /api/v2/service-sessions/:userId/:serviceId/complete)
  ↓
Service Provider
  ↓
  8. Gets paid to wallet
  ↓
  9. Receives notification
```

## Business Logic

1. **One Session per Purchase**: Each payment = 1 service session
2. **Time-Limited**: Must be used within validity period (default 30 days)
3. **Staff-Controlled**: Only staff/admin can mark complete
4. **Instant Payout**: Provider paid when staff marks complete
5. **Multiple Pending**: User can have multiple pending sessions for different services

## Testing Scenarios

### Enable Service Session
```bash
node src/scripts/enableServiceSessions.js enable "Visa Booking" 15000 45
```

### Student Purchases Service
```bash
# 1. Initiate
curl -X POST http://localhost:5001/api/v2/payment \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemType":"service","itemId":"SERVICE_ID"}'

# 2. Complete Paystack payment

# 3. Validate
curl -X POST http://localhost:5001/api/v2/payment/validate \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reference":"PAYSTACK_REF"}'
```

### Staff Views Pending
```bash
curl http://localhost:5001/api/v2/service-sessions/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Staff Completes Session
```bash
curl -X POST http://localhost:5001/api/v2/service-sessions/USER_ID/SERVICE_ID/complete \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Flight booked successfully for student"}'
```

## Migration from Old System

If you have services using the old enrollment system:

```bash
# This will enable sessions but keep backward compatibility
node src/scripts/enableServiceSessions.js all
```

Services with `sessionEnabled: false` will continue to work with the old enrollment system.
Services with `sessionEnabled: true` will use the new session-based system.

## Validation Checks

Before completing session:
```javascript
// Staff endpoint checks:
1. User exists
2. Service exists
3. Active session exists for user + service
4. Session not expired
5. Staff has admin permissions
```

## Frontend Integration Example

### Student View
```javascript
// Purchase service session
const purchaseSession = async (serviceId) => {
  // 1. Initiate payment
  const { data } = await axios.post('/api/v2/payment', {
    itemType: 'service',
    itemId: serviceId
  });

  // 2. Open Paystack
  const paystack = PaystackPop.setup({
    key: 'pk_test_xxx',
    email: userEmail,
    amount: service.sessionPrice * 100,
    ref: data.data.transactionRef,
    onSuccess: async (transaction) => {
      // 3. Validate
      await axios.post('/api/v2/payment/validate', {
        reference: transaction.reference
      });
      
      alert('Session purchased! Staff will complete it once service is rendered.');
    }
  });
  
  paystack.openIframe();
};
```

### Staff Dashboard
```javascript
// Get pending sessions
const pendingSessions = await axios.get('/api/v2/service-sessions/pending');

// Mark session complete
const completeSession = async (userId, serviceId, notes) => {
  await axios.post(`/api/v2/service-sessions/${userId}/${serviceId}/complete`, {
    notes
  });
  
  alert('Session marked complete. Service provider has been paid.');
};
```

## Advantages

✅ **Clear workflow**: Student pays → Staff completes → Provider gets paid  
✅ **No recurring billing**: Simple one-time payment  
✅ **Staff control**: Quality assurance before payment release  
✅ **Time limits**: Sessions expire if unused  
✅ **Audit trail**: Complete history of who completed what and when  
✅ **Flexible**: Each service can set own price and validity  

## Common Issues

### Session not showing in pending list
- Check if payment was validated successfully
- Verify `sessionEnabled: true` on service
- Check session hasn't expired

### Can't complete session
- Verify staff has admin role
- Check session is still active
- Ensure session hasn't expired
- Confirm user + service combination exists

### Provider not getting paid
- Check if service has `user` field set (service provider)
- Verify wallet exists for provider
- Review transaction logs

## Next Steps

After implementation:
1. Train staff on completion workflow
2. Set up webhook for payment notifications
3. Create admin dashboard for session management
4. Implement expiry notifications
5. Add session extension feature
6. Create analytics for service performance

## API Endpoints Summary

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/v2/payment` | Student | Initiate payment |
| POST | `/api/v2/payment/validate` | Student | Validate payment |
| GET | `/api/v2/service-sessions/pending` | Admin | View pending sessions |
| POST | `/api/v2/service-sessions/:userId/:serviceId/complete` | Admin | Complete session |
| GET | `/api/v2/service-sessions/completed` | Admin | View completed sessions |
| GET | `/api/v2/service-sessions/user/:userId` | Admin | View user sessions |

The session-based service system provides a clear, staff-controlled workflow for delivering one-time services with proper payment release only after confirmation!
