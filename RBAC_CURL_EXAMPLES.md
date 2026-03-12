# RBAC API - cURL Request Examples

Complete cURL examples for all Role-Based Access Control endpoints.

**Base URL**: `http://localhost:3000/api/v2/admin`
**Replace** `{token}` with your actual JWT token
**Replace** IDs with actual MongoDB ObjectIds from your database

---

## 🔐 Authentication

All requests require authentication. Get your token first:

```bash
# Login to get token
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

---

## 🎭 ROLE MANAGEMENT

### 1. Create a New Role
**Endpoint**: `POST /api/v2/admin/roles`
**Permission**: Super Admin only

```bash
curl -X POST http://localhost:3000/api/v2/admin/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Marketing Manager",
    "description": "Manages marketing content and campaigns",
    "permissions": [
      "65f1234567890abcdef12345",
      "65f1234567890abcdef12346"
    ]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "_id": "65f1234567890abcdef12347",
    "name": "Marketing Manager",
    "slug": "marketing_manager",
    "description": "Manages marketing content and campaigns",
    "permissions": [...],
    "isSystemRole": false,
    "isActive": true
  }
}
```

---

### 2. Get All Roles
**Endpoint**: `GET /api/v2/admin/roles`
**Permission**: roles.read

```bash
# Basic request
curl -X GET http://localhost:3000/api/v2/admin/roles \
  -H "Authorization: Bearer {token}"

# With pagination
curl -X GET "http://localhost:3000/api/v2/admin/roles?page=1&limit=20" \
  -H "Authorization: Bearer {token}"

# Filter by active status
curl -X GET "http://localhost:3000/api/v2/admin/roles?isActive=true" \
  -H "Authorization: Bearer {token}"

# Search by name
curl -X GET "http://localhost:3000/api/v2/admin/roles?search=manager" \
  -H "Authorization: Bearer {token}"

# Combined filters
curl -X GET "http://localhost:3000/api/v2/admin/roles?page=1&limit=10&isActive=true&search=admin" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 6,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. Get Role by ID
**Endpoint**: `GET /api/v2/admin/roles/:id`
**Permission**: roles.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347 \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Role fetched successfully",
  "data": {
    "_id": "65f1234567890abcdef12347",
    "name": "Marketing Manager",
    "slug": "marketing_manager",
    "description": "Manages marketing content and campaigns",
    "permissions": [...],
    "usersCount": 5,
    "createdBy": {...},
    "isSystemRole": false,
    "isActive": true
  }
}
```

---

### 4. Update Role
**Endpoint**: `PUT /api/v2/admin/roles/:id`
**Permission**: Super Admin only

```bash
# Update description and status
curl -X PUT http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "description": "Updated description for marketing role",
    "isActive": false
  }'

# Update permissions (replaces all existing permissions)
curl -X PUT http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "permissions": [
      "65f1234567890abcdef12345",
      "65f1234567890abcdef12346",
      "65f1234567890abcdef12348"
    ]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {...}
}
```

---

### 5. Delete Role
**Endpoint**: `DELETE /api/v2/admin/roles/:id`
**Permission**: Super Admin only

```bash
curl -X DELETE http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347 \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Note**: Cannot delete system roles or roles assigned to users.

---

### 6. Add Permissions to Role
**Endpoint**: `POST /api/v2/admin/roles/:id/permissions`
**Permission**: Super Admin only

```bash
curl -X POST http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "permissions": [
      "65f1234567890abcdef12349",
      "65f1234567890abcdef12350"
    ]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Permissions added to role successfully",
  "data": {...}
}
```

---

### 7. Remove Permission from Role
**Endpoint**: `DELETE /api/v2/admin/roles/:id/permissions/:permissionId`
**Permission**: Super Admin only

```bash
curl -X DELETE http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347/permissions/65f1234567890abcdef12349 \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Permission removed from role successfully",
  "data": {...}
}
```

---

### 8. Get Role Permissions
**Endpoint**: `GET /api/v2/admin/roles/:id/permissions`
**Permission**: roles.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347/permissions \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Role permissions fetched successfully",
  "data": [
    {
      "_id": "65f1234567890abcdef12345",
      "name": "courses.read",
      "module": "courses",
      "action": "read",
      "description": "View courses",
      "isActive": true
    },
    ...
  ]
}
```

---

### 9. Get Users by Role
**Endpoint**: `GET /api/v2/admin/roles/:id/users`
**Permission**: roles.read

```bash
# Basic request
curl -X GET http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347/users \
  -H "Authorization: Bearer {token}"

# With pagination
curl -X GET "http://localhost:3000/api/v2/admin/roles/65f1234567890abcdef12347/users?page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1234567890abcdef12300",
      "fullName": "John Doe",
      "email": "john@example.com",
      "roles": ["admin"],
      "assignedRole": {...}
    },
    ...
  ],
  "pagination": {...}
}
```

---

## 🔑 PERMISSION MANAGEMENT

### 1. Get All Permissions
**Endpoint**: `GET /api/v2/admin/permissions`
**Permission**: permissions.read

```bash
# Basic request
curl -X GET http://localhost:3000/api/v2/admin/permissions \
  -H "Authorization: Bearer {token}"

# With pagination
curl -X GET "http://localhost:3000/api/v2/admin/permissions?page=1&limit=50" \
  -H "Authorization: Bearer {token}"

# Filter by module
curl -X GET "http://localhost:3000/api/v2/admin/permissions?module=courses" \
  -H "Authorization: Bearer {token}"

# Filter by action
curl -X GET "http://localhost:3000/api/v2/admin/permissions?action=create" \
  -H "Authorization: Bearer {token}"

# Filter by active status
curl -X GET "http://localhost:3000/api/v2/admin/permissions?isActive=true" \
  -H "Authorization: Bearer {token}"

# Search by name or description
curl -X GET "http://localhost:3000/api/v2/admin/permissions?search=course" \
  -H "Authorization: Bearer {token}"

# Combined filters
curl -X GET "http://localhost:3000/api/v2/admin/permissions?module=users&action=read&isActive=true" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1234567890abcdef12345",
      "name": "courses.create",
      "module": "courses",
      "action": "create",
      "description": "Create new courses",
      "isActive": true,
      "isSystemPermission": true
    },
    ...
  ],
  "pagination": {...}
}
```

---

### 2. Get Permissions Grouped by Module
**Endpoint**: `GET /api/v2/admin/permissions/modules`
**Permission**: permissions.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/modules \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Permissions grouped by module fetched successfully",
  "data": [
    {
      "_id": "courses",
      "permissions": [
        {
          "id": "65f1234567890abcdef12345",
          "name": "courses.create",
          "action": "create",
          "description": "Create new courses"
        },
        {
          "id": "65f1234567890abcdef12346",
          "name": "courses.read",
          "action": "read",
          "description": "View courses"
        },
        ...
      ]
    },
    {
      "_id": "users",
      "permissions": [...]
    },
    ...
  ]
}
```

---

### 3. Get All Modules
**Endpoint**: `GET /api/v2/admin/permissions/modules/list`
**Permission**: permissions.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/modules/list \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Modules fetched successfully",
  "data": [
    "analytics",
    "courses",
    "enrollments",
    "faqs",
    "inquiries",
    "lessons",
    "notifications",
    "payments",
    "permissions",
    "roles",
    "services",
    "settings",
    "tutors",
    "users",
    "waitlist",
    "wallet"
  ]
}
```

---

### 4. Get Permission Statistics
**Endpoint**: `GET /api/v2/admin/permissions/stats`
**Permission**: permissions.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/stats \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Permission statistics fetched successfully",
  "data": {
    "total": 68,
    "active": 68,
    "system": 68,
    "custom": 0,
    "byModule": [
      {
        "_id": "courses",
        "count": 7,
        "actions": ["create", "read", "update", "delete", "approve", "reject", "publish"]
      },
      {
        "_id": "users",
        "count": 6,
        "actions": ["create", "read", "update", "delete", "suspend", "verify"]
      },
      ...
    ]
  }
}
```

---

### 5. Get Permission by ID
**Endpoint**: `GET /api/v2/admin/permissions/:id`
**Permission**: permissions.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/65f1234567890abcdef12345 \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Permission fetched successfully",
  "data": {
    "_id": "65f1234567890abcdef12345",
    "name": "courses.create",
    "module": "courses",
    "action": "create",
    "description": "Create new courses",
    "isActive": true,
    "isSystemPermission": true,
    "usedInRoles": [
      {
        "_id": "65f1234567890abcdef12400",
        "name": "Content Manager",
        "slug": "content_manager",
        "description": "Manage courses, lessons, and FAQs"
      },
      ...
    ]
  }
}
```

---

### 6. Create Custom Permission
**Endpoint**: `POST /api/v2/admin/permissions`
**Permission**: Super Admin only

```bash
curl -X POST http://localhost:3000/api/v2/admin/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "module": "reports",
    "action": "generate",
    "description": "Generate custom reports"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "_id": "65f1234567890abcdef12500",
    "name": "reports.generate",
    "module": "reports",
    "action": "generate",
    "description": "Generate custom reports",
    "isActive": true,
    "isSystemPermission": false
  }
}
```

---

### 7. Update Permission
**Endpoint**: `PUT /api/v2/admin/permissions/:id`
**Permission**: Super Admin only

```bash
# Update description
curl -X PUT http://localhost:3000/api/v2/admin/permissions/65f1234567890abcdef12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "description": "Create and publish new courses"
  }'

# Deactivate permission
curl -X PUT http://localhost:3000/api/v2/admin/permissions/65f1234567890abcdef12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "isActive": false
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Permission updated successfully",
  "data": {...}
}
```

**Note**: Cannot modify module, action, or name of system permissions.

---

### 8. Delete Permission
**Endpoint**: `DELETE /api/v2/admin/permissions/:id`
**Permission**: Super Admin only

```bash
curl -X DELETE http://localhost:3000/api/v2/admin/permissions/65f1234567890abcdef12500 \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Permission deleted successfully"
}
```

**Note**: Cannot delete system permissions or permissions used in any role.

---

## 👤 USER-ROLE ASSIGNMENT

### 1. Assign Role to User
**Endpoint**: `POST /api/v2/admin/roles/users/:userId/role`
**Permission**: users.update

```bash
curl -X POST http://localhost:3000/api/v2/admin/roles/users/65f1234567890abcdef12300/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "roleId": "65f1234567890abcdef12347"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Role assigned to user successfully",
  "data": {
    "_id": "65f1234567890abcdef12300",
    "fullName": "John Doe",
    "email": "john@example.com",
    "roles": ["admin"],
    "assignedRole": {
      "_id": "65f1234567890abcdef12347",
      "name": "Marketing Manager",
      "slug": "marketing_manager",
      "permissions": [...]
    }
  }
}
```

---

### 2. Remove Role from User
**Endpoint**: `DELETE /api/v2/admin/roles/users/:userId/role`
**Permission**: users.update

```bash
curl -X DELETE http://localhost:3000/api/v2/admin/roles/users/65f1234567890abcdef12300/role \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "Role removed from user successfully",
  "data": {
    "_id": "65f1234567890abcdef12300",
    "fullName": "John Doe",
    "email": "john@example.com",
    "roles": ["admin"],
    "assignedRole": null
  }
}
```

---

### 3. Get User's Permissions
**Endpoint**: `GET /api/v2/admin/roles/users/:userId/permissions`
**Permission**: users.read

```bash
curl -X GET http://localhost:3000/api/v2/admin/roles/users/65f1234567890abcdef12300/permissions \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "message": "User permissions fetched successfully",
  "data": {
    "user": {
      "id": "65f1234567890abcdef12300",
      "fullName": "John Doe",
      "email": "john@example.com",
      "roles": ["admin"]
    },
    "assignedRole": {
      "_id": "65f1234567890abcdef12347",
      "name": "Marketing Manager",
      "slug": "marketing_manager",
      "description": "Manages marketing content and campaigns"
    },
    "permissions": [
      {
        "_id": "65f1234567890abcdef12345",
        "name": "courses.read",
        "module": "courses",
        "action": "read",
        "description": "View courses"
      },
      {
        "_id": "65f1234567890abcdef12346",
        "name": "faqs.create",
        "module": "faqs",
        "action": "create",
        "description": "Create FAQs"
      },
      ...
    ]
  }
}
```

---

## 🧪 TESTING WORKFLOW

### Step 1: Get All Roles (Find Super Admin Role ID)
```bash
curl -X GET http://localhost:3000/api/v2/admin/roles \
  -H "Authorization: Bearer {token}"
```

### Step 2: Assign Super Admin Role to Your User
```bash
# Replace USER_ID and ROLE_ID with actual IDs from step 1
curl -X POST http://localhost:3000/api/v2/admin/roles/users/USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "roleId": "ROLE_ID"
  }'
```

### Step 3: Verify Your Permissions
```bash
curl -X GET http://localhost:3000/api/v2/admin/roles/users/USER_ID/permissions \
  -H "Authorization: Bearer {token}"
```

### Step 4: Get All Permissions Grouped
```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/modules \
  -H "Authorization: Bearer {token}"
```

### Step 5: Create a Custom Role
```bash
curl -X POST http://localhost:3000/api/v2/admin/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Test Manager",
    "description": "Test role for development",
    "permissions": ["PERMISSION_ID_1", "PERMISSION_ID_2"]
  }'
```

---

## 💡 TIPS

### Save Token as Environment Variable
```bash
# Export token for easier testing
export TOKEN="your_jwt_token_here"

# Then use it in requests
curl -X GET http://localhost:3000/api/v2/admin/roles \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty Print JSON Response
```bash
# Install jq if not already installed: brew install jq

curl -X GET http://localhost:3000/api/v2/admin/roles \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Save Response to File
```bash
curl -X GET http://localhost:3000/api/v2/admin/permissions/modules \
  -H "Authorization: Bearer $TOKEN" \
  -o permissions.json
```

### Test Permission Check
```bash
# Try accessing an endpoint that requires specific permission
# Should fail if you don't have the permission
curl -X GET http://localhost:3000/api/v2/admin/users \
  -H "Authorization: Bearer $TOKEN"

# Error response:
# {
#   "success": false,
#   "error": "Access denied. Required permission: users.read"
# }
```

---

## 🚨 COMMON ERRORS

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```
**Solution**: Include valid JWT token in Authorization header

### 403 Forbidden - No Role Assigned
```json
{
  "success": false,
  "error": "Access denied. No role assigned. Please contact system administrator."
}
```
**Solution**: Assign a role to the user

### 403 Forbidden - Missing Permission
```json
{
  "success": false,
  "error": "Access denied. Required permission: courses.create"
}
```
**Solution**: Add required permission to user's role

### 400 Bad Request - Role Already Exists
```json
{
  "success": false,
  "error": "Role with this name already exists"
}
```
**Solution**: Use a different role name

### 400 Bad Request - Cannot Delete Role in Use
```json
{
  "success": false,
  "error": "Cannot delete role. 5 user(s) are assigned to this role"
}
```
**Solution**: Remove role from all users first

---

## 📝 NOTES

- All IDs (`userId`, `roleId`, `permissionId`) must be valid MongoDB ObjectIds
- Replace `http://localhost:3000` with your actual server URL
- All POST/PUT requests require `Content-Type: application/json` header
- Super Admin role bypasses all permission checks
- System roles (Super Admin, Admin) cannot be modified or deleted
- System permissions cannot be deleted

---

**Happy Testing!** 🚀

For more information, see [RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md)
