# Admin Service Sessions API Documentation

## Overview

This document provides comprehensive documentation for the Admin Service Sessions API endpoints. These endpoints allow administrators and staff to manage session-based service subscriptions - viewing pending sessions, marking them as complete, and tracking completed sessions.

## Base URL

```
http://localhost:5001/api/v2/admin/service-sessions
```

Production:
```
https://your-domain.com/api/v2/admin/service-sessions
```

## Authentication

All endpoints require:
- **Authentication**: Valid JWT token in Authorization header
- **Authorization**: Admin or Staff role

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. Get Pending Service Sessions

Retrieves all service sessions that have been purchased but not yet completed by staff.

**Endpoint:**
```
GET /api/v2/admin/service-sessions/pending
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 20 | Number of items per page |
| serviceId | string | No | - | Filter by specific service ID |
| userId | string | No | - | Filter by specific user ID |

**Example Request:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/pending?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Request with Filters:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/pending?serviceId=65f7b3c4d5e8a2b4c8d9e0f1&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "65abc123def456789012345",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "userPhone": "+1234567890",
      "serviceId": "65f7b3c4d5e8a2b4c8d9e0f1",
      "serviceName": "Visa Booking",
      "serviceCategory": "Visa Booking",
      "serviceProvider": "65xyz789abc123456789012",
      "sessionPurchasedAt": "2026-03-15T10:30:00.000Z",
      "sessionExpiry": "2026-04-14T10:30:00.000Z",
      "sessionIsActive": true,
      "paymentAmount": 15000,
      "paymentId": "65payment123456789012345",
      "paymentStatus": "completed"
    },
    {
      "userId": "65user456def789012345678",
      "userName": "Jane Smith",
      "userEmail": "jane@example.com",
      "userPhone": "+0987654321",
      "serviceId": "65service789abc123456789",
      "serviceName": "Flight Booking",
      "serviceCategory": "Flight Booking",
      "serviceProvider": "65provider123xyz456789",
      "sessionPurchasedAt": "2026-03-20T14:15:00.000Z",
      "sessionExpiry": "2026-04-19T14:15:00.000Z",
      "sessionIsActive": true,
      "paymentAmount": 25000,
      "paymentId": "65payment789012345678901",
      "paymentStatus": "completed"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "message": "Pending service sessions fetched successfully"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "success": false,
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Error fetching pending service sessions"
}
```

**Use Cases:**
- Dashboard view showing all pending service requests
- Assigning pending sessions to staff members
- Tracking workload and service delivery status
- Identifying overdue or expiring sessions

---

### 2. Mark Service Session as Complete

Marks a service session as complete, pays the service provider, and notifies both the customer and provider.

**Endpoint:**
```
POST /api/v2/admin/service-sessions/:userId/:serviceId/complete
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | ID of the user whose session to complete |
| serviceId | string | Yes | ID of the service |

**Request Body:**

```json
{
  "notes": "Optional completion notes from staff"
}
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| notes | string | No | Staff notes about the session completion |

**Example Request:**

```bash
curl -X POST "http://localhost:5001/api/v2/admin/service-sessions/65abc123def456789012345/65f7b3c4d5e8a2b4c8d9e0f1/complete" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Visa booking completed successfully. Documents sent to customer via email."
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "65abc123def456789012345",
    "userName": "John Doe",
    "serviceId": "65f7b3c4d5e8a2b4c8d9e0f1",
    "serviceName": "Visa Booking",
    "completedAt": "2026-03-28T15:30:00.000Z",
    "completedBy": "65admin789xyz123456789"
  },
  "message": "Service session marked as complete successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing Parameters
{
  "success": false,
  "message": "User ID and Service ID are required",
  "code": "MISSING_PARAMS"
}

// 404 Not Found - User Not Found
{
  "success": false,
  "message": "User not found",
  "code": "NOT_FOUND"
}

// 404 Not Found - Service Not Found
{
  "success": false,
  "message": "Service not found",
  "code": "NOT_FOUND"
}

// 404 Not Found - No Active Session
{
  "success": false,
  "message": "No active service session found for this user",
  "code": "NOT_FOUND"
}

// 401 Unauthorized
{
  "success": false,
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Error completing service session"
}
```

**What Happens When Session is Completed:**

1. ✅ Session marked as inactive (`isActive: false`)
2. 📝 Completion logged with staff ID, timestamp, and notes
3. 💰 Service provider's wallet credited with session price
4. 💳 Transaction record created in provider's account
5. 🔔 Provider notified about payment
6. 🔔 Customer notified about session completion

**Use Cases:**
- Mark service as delivered after completion
- Add staff notes for record keeping
- Trigger automatic payment to service provider
- Update customer and provider with completion status

---

### 3. Get Completed Service Sessions

Retrieves all service sessions that have been marked as complete by staff.

**Endpoint:**
```
GET /api/v2/admin/service-sessions/completed
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 20 | Number of items per page |
| serviceId | string | No | - | Filter by specific service ID |
| userId | string | No | - | Filter by specific user ID |
| startDate | string | No | - | Filter by start date (YYYY-MM-DD) |
| endDate | string | No | - | Filter by end date (YYYY-MM-DD) |

**Example Request:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/completed?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Request with Date Range:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/completed?startDate=2026-03-01&endDate=2026-03-31&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Request with Service Filter:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/completed?serviceId=65f7b3c4d5e8a2b4c8d9e0f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "65abc123def456789012345",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "serviceId": "65f7b3c4d5e8a2b4c8d9e0f1",
      "serviceName": "Visa Booking",
      "serviceCategory": "Visa Booking",
      "serviceProvider": "65xyz789abc123456789012",
      "completedAt": "2026-03-20T14:30:00.000Z",
      "completedBy": "65admin789xyz123456789",
      "completedByName": "Admin Staff",
      "notes": "Visa booking completed successfully. Documents sent to customer."
    },
    {
      "userId": "65user456def789012345678",
      "userName": "Jane Smith",
      "userEmail": "jane@example.com",
      "serviceId": "65service789abc123456789",
      "serviceName": "Flight Booking",
      "serviceCategory": "Flight Booking",
      "serviceProvider": "65provider123xyz456789",
      "completedAt": "2026-03-22T10:15:00.000Z",
      "completedBy": "65staff123abc456789012",
      "completedByName": "Sarah Admin",
      "notes": "Flight tickets booked and emailed to customer."
    }
  ],
  "pagination": {
    "total": 128,
    "page": 1,
    "limit": 20,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "message": "Completed service sessions fetched successfully"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "success": false,
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Error fetching completed service sessions"
}
```

**Use Cases:**
- Generate reports on completed services
- Track staff performance and productivity
- Analyze service completion times
- Audit service delivery history
- Export data for accounting or analytics

---

### 4. Get User's Service Sessions

Retrieves all service sessions (active, expired, and completed) for a specific user.

**Endpoint:**
```
GET /api/v2/admin/service-sessions/user/:userId
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | ID of the user |

**Example Request:**

```bash
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/user/65abc123def456789012345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65abc123def456789012345",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "activeSessions": [
      {
        "serviceId": {
          "_id": "65service123abc456789012",
          "name": "Visa Booking",
          "category": "Visa Booking",
          "price": 15000,
          "sessionPrice": 15000
        },
        "isActive": true,
        "expiry": "2026-04-15T00:00:00.000Z",
        "purchasedAt": "2026-03-16T10:00:00.000Z",
        "paymentId": "65payment123456789012"
      }
    ],
    "expiredSessions": [
      {
        "serviceId": {
          "_id": "65service456def789012345",
          "name": "Flight Booking",
          "category": "Flight Booking",
          "price": 25000,
          "sessionPrice": 25000
        },
        "isActive": true,
        "expiry": "2026-03-10T00:00:00.000Z",
        "purchasedAt": "2026-02-10T10:00:00.000Z",
        "paymentId": "65payment456789012345"
      }
    ],
    "completedSessions": [
      {
        "serviceId": {
          "_id": "65service789xyz123456789",
          "name": "IELTS Masterclass",
          "category": "IELTS Masterclass"
        },
        "completedAt": "2026-03-05T14:30:00.000Z",
        "completedBy": {
          "_id": "65admin123xyz456789012",
          "fullName": "Admin Staff",
          "email": "admin@emgs.com"
        },
        "notes": "Session completed successfully"
      },
      {
        "serviceId": {
          "_id": "65service321abc987654321",
          "name": "Job Application",
          "category": "Job Application"
        },
        "completedAt": "2026-02-28T11:20:00.000Z",
        "completedBy": {
          "_id": "65staff456def789012345",
          "fullName": "Sarah Admin",
          "email": "sarah@emgs.com"
        },
        "notes": "Job application submitted"
      }
    ],
    "totalActive": 1,
    "totalCompleted": 2
  },
  "message": "User service sessions fetched successfully"
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "success": false,
  "message": "User not found",
  "code": "NOT_FOUND"
}

// 401 Unauthorized
{
  "success": false,
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Error fetching user service sessions"
}
```

**Use Cases:**
- View complete service history for a customer
- Customer support and inquiry resolution
- Identify expired sessions that need follow-up
- Check pending services for a specific user
- Verify user's service usage and payments

---

## Common Workflows

### Workflow 1: Processing Pending Sessions

```bash
# Step 1: Get all pending sessions
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/pending" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 2: Staff renders the service to customer

# Step 3: Mark session as complete
curl -X POST "http://localhost:5001/api/v2/admin/service-sessions/USER_ID/SERVICE_ID/complete" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Service delivered successfully"}'
```

### Workflow 2: Generating Monthly Report

```bash
# Get all completed sessions for March 2026
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/completed?startDate=2026-03-01&endDate=2026-03-31&limit=100" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Workflow 3: Customer Support Inquiry

```bash
# Step 1: Get user's all sessions
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/user/USER_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 2: Check if they have pending sessions
# Step 3: Check completed sessions history
# Step 4: Identify any issues or expired sessions
```

### Workflow 4: Service-Specific Analysis

```bash
# Get all completed sessions for a specific service
curl -X GET "http://localhost:5001/api/v2/admin/service-sessions/completed?serviceId=SERVICE_ID&limit=100" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Response Data Models

### Pending Session Object

```typescript
{
  userId: string;              // MongoDB ObjectId
  userName: string;            // User's full name
  userEmail: string;           // User's email
  userPhone: string;           // User's phone number
  serviceId: string;           // Service MongoDB ObjectId
  serviceName: string;         // Service name
  serviceCategory: string;     // Service category
  serviceProvider: string;     // Provider's user ID
  sessionPurchasedAt: string;  // ISO 8601 date string
  sessionExpiry: string;       // ISO 8601 date string
  sessionIsActive: boolean;    // Active status
  paymentAmount: number;       // Amount paid in smallest currency unit
  paymentId: string;           // Payment record ID
  paymentStatus: string;       // "completed", "pending", etc.
}
```

### Completed Session Object

```typescript
{
  userId: string;              // MongoDB ObjectId
  userName: string;            // User's full name
  userEmail: string;           // User's email
  serviceId: string;           // Service MongoDB ObjectId
  serviceName: string;         // Service name
  serviceCategory: string;     // Service category
  serviceProvider: string;     // Provider's user ID
  completedAt: string;         // ISO 8601 date string
  completedBy: string;         // Staff/Admin user ID
  completedByName: string;     // Staff/Admin name
  notes: string;               // Completion notes
}
```

### User Sessions Response

```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
  };
  activeSessions: Array<{
    serviceId: {
      _id: string;
      name: string;
      category: string;
      price: number;
      sessionPrice: number;
    };
    isActive: boolean;
    expiry: string;
    purchasedAt: string;
    paymentId: string;
  }>;
  expiredSessions: Array<...>; // Same structure as activeSessions
  completedSessions: Array<{
    serviceId: {
      _id: string;
      name: string;
      category: string;
    };
    completedAt: string;
    completedBy: {
      _id: string;
      fullName: string;
      email: string;
    };
    notes: string;
  }>;
  totalActive: number;
  totalCompleted: number;
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| MISSING_PARAMS | 400 | Required parameters missing |
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Admin access required |
| INTERNAL_SERVER_ERROR | 500 | Server error |

---

## Rate Limiting

- **Rate Limit**: 100 requests per minute per IP
- **Burst Limit**: 20 requests per second

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711632000
```

---

## Best Practices

### 1. Pagination
Always use pagination for list endpoints to avoid overwhelming responses:
```bash
?page=1&limit=20
```

### 2. Filtering
Use filters to narrow down results:
```bash
?serviceId=SERVICE_ID&startDate=2026-03-01&endDate=2026-03-31
```

### 3. Error Handling
Always check response status and handle errors appropriately:
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error: ${error.message}`);
  }
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Network error:', error);
}
```

### 4. Authentication Token Management
- Store tokens securely
- Refresh tokens before expiry
- Never expose tokens in logs or URLs

### 5. Notes Documentation
When completing sessions, always add meaningful notes:
```json
{
  "notes": "Visa booking completed. Reference: VB-2026-03-123. Documents sent via email on 2026-03-28."
}
```

---

## Testing with Postman

### Collection Setup

1. Create environment variables:
   - `baseUrl`: `http://localhost:5001/api/v2/admin`
   - `adminToken`: Your admin JWT token

2. Set authorization header:
   - Type: Bearer Token
   - Token: `{{adminToken}}`

3. Test endpoints:

**Get Pending:**
```
GET {{baseUrl}}/service-sessions/pending?page=1&limit=10
```

**Complete Session:**
```
POST {{baseUrl}}/service-sessions/{{userId}}/{{serviceId}}/complete
Body: {"notes": "Test completion"}
```

**Get Completed:**
```
GET {{baseUrl}}/service-sessions/completed?page=1
```

**Get User Sessions:**
```
GET {{baseUrl}}/service-sessions/user/{{userId}}
```

---

## Integration Examples

### JavaScript/TypeScript

```typescript
const BASE_URL = 'http://localhost:5001/api/v2/admin/service-sessions';
const ADMIN_TOKEN = 'your-jwt-token';

// Get pending sessions
async function getPendingSessions(page = 1, limit = 20) {
  const response = await fetch(
    `${BASE_URL}/pending?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    }
  );
  return await response.json();
}

// Complete a session
async function completeSession(userId, serviceId, notes) {
  const response = await fetch(
    `${BASE_URL}/${userId}/${serviceId}/complete`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes })
    }
  );
  return await response.json();
}

// Get user's sessions
async function getUserSessions(userId) {
  const response = await fetch(
    `${BASE_URL}/user/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    }
  );
  return await response.json();
}
```

### Python

```python
import requests

BASE_URL = 'http://localhost:5001/api/v2/admin/service-sessions'
ADMIN_TOKEN = 'your-jwt-token'

headers = {
    'Authorization': f'Bearer {ADMIN_TOKEN}',
    'Content-Type': 'application/json'
}

# Get pending sessions
def get_pending_sessions(page=1, limit=20):
    response = requests.get(
        f'{BASE_URL}/pending',
        params={'page': page, 'limit': limit},
        headers=headers
    )
    return response.json()

# Complete a session
def complete_session(user_id, service_id, notes):
    response = requests.post(
        f'{BASE_URL}/{user_id}/{service_id}/complete',
        json={'notes': notes},
        headers=headers
    )
    return response.json()

# Get user's sessions
def get_user_sessions(user_id):
    response = requests.get(
        f'{BASE_URL}/user/{user_id}',
        headers=headers
    )
    return response.json()
```

---

## Support & Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**
- **Cause**: Invalid or expired JWT token
- **Solution**: Re-authenticate and get a new token

**Issue: 403 Forbidden**
- **Cause**: User doesn't have admin privileges
- **Solution**: Verify user role is 'admin' in database

**Issue: 404 Not Found on Complete**
- **Cause**: No active session for user + service combination
- **Solution**: Check if session exists in pending list first

**Issue: Session not in pending list**
- **Cause**: Session may be expired or already completed
- **Solution**: Check user's sessions with GET /user/:userId endpoint

### Getting Help

- **Email**: support@emgs.com
- **Documentation**: [SESSION_BASED_SERVICES_GUIDE.md](SESSION_BASED_SERVICES_GUIDE.md)
- **API Issue Tracker**: GitHub Issues

---

## Changelog

### Version 1.0.0 (March 2026)
- Initial release
- Added pending sessions endpoint
- Added complete session endpoint
- Added completed sessions endpoint
- Added user sessions endpoint
- Full pagination support
- Date range filtering
- Swagger documentation

---

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Role-Based Access**: Only admin users can access these endpoints
3. **Input Validation**: All user inputs are validated and sanitized
4. **SQL Injection Protection**: Using MongoDB with parameterized queries
5. **Rate Limiting**: Prevents abuse and DDoS attacks
6. **HTTPS Only**: Always use HTTPS in production
7. **Token Expiry**: JWT tokens expire after configured period
8. **Audit Trail**: All completions logged with staff ID and timestamp

---

## Appendix

### Date Format Standards

All dates follow ISO 8601 format:
- `2026-03-28T15:30:00.000Z` (Full timestamp)
- `2026-03-28` (Date only for query parameters)

### Currency Format

All amounts are in smallest currency unit (kobo for NGN):
- ₦150.00 = 15000 kobo
- ₦1,500.00 = 150000 kobo

### MongoDB ObjectId Format

ObjectIds are 24-character hexadecimal strings:
- Example: `65f7b3c4d5e8a2b4c8d9e0f1`

---

**Last Updated**: March 28, 2026  
**API Version**: 1.0.0  
**Maintainer**: EMGS Development Team
