# Role-Based Access Control (RBAC) System

## Overview
This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented in the EMGS application.

## 🏗️ Architecture

### Core Components
1. **Permission Model** - Defines individual permissions (e.g., `courses.create`)
2. **Role Model** - Groups permissions into roles (e.g., `Super Admin`, `Content Manager`)
3. **User Model** - Extended with `assignedRole` field for RBAC
4. **Permission Middleware** - Validates user permissions before executing actions
5. **Controllers & Routes** - Manage roles, permissions, and user assignments

---

## 📋 Permissions Structure

### Format
Permissions follow the format: `module.action`
- **Module**: The resource being accessed (e.g., `courses`, `users`, `payments`)
- **Action**: The operation being performed (e.g., `create`, `read`, `update`, `delete`)

### Available Modules
- `courses` - Course management
- `users` - User management
- `tutors` - Tutor management
- `payments` - Payment operations
- `lessons` - Lesson management
- `services` - Service management
- `inquiries` - Inquiry handling
- `enrollments` - Enrollment management
- `analytics` - Analytics & reporting
- `notifications` - Notification system
- `faqs` - FAQ management
- `settings` - System settings
- `roles` - Role management
- `permissions` - Permission management
- `waitlist` - Waitlist management
- `wallet` - Wallet operations

### Common Actions
- `create` - Create new records
- `read` - View/retrieve records
- `update` - Modify existing records
- `delete` - Remove records
- `approve` - Approve requests (courses, tutors)
- `reject` - Reject requests
- `publish` - Publish content
- `export` - Export data
- `broadcast` - Send bulk notifications

---

## 👥 Predefined Roles

### 1. Super Admin
- **Description**: Full system access with all permissions
- **Key Features**: 
  - Bypasses all permission checks
  - Can create/modify/delete roles and permissions
  - Cannot be deleted (system role)
- **Use Case**: System administrators

### 2. Admin
- **Description**: General admin access without role/permission management
- **Permissions**: Most operations except role and permission management
- **Use Case**: General administrators

### 3. Content Manager
- **Description**: Manage courses, lessons, and FAQs
- **Key Permissions**:
  - All course operations (CRUD + publish)
  - All lesson operations (CRUD)
  - All FAQ operations (CRUD)
  - View users, enrollments, analytics
- **Use Case**: Content team members

### 4. Finance Manager
- **Description**: Manage payments and financial operations
- **Key Permissions**:
  - All payment operations (CRUD + refund)
  - Wallet operations (read, update)
  - View users
  - View and export analytics
- **Use Case**: Finance team members

### 5. Support Manager
- **Description**: Handle user inquiries and support
- **Key Permissions**:
  - Manage inquiries (read, update, delete)
  - Create and broadcast notifications
  - Manage FAQs
  - View users
  - Manage waitlist
- **Use Case**: Customer support team

### 6. Tutor Manager
- **Description**: Manage tutor accounts and approvals
- **Key Permissions**:
  - All tutor operations (CRUD + approve/reject)
  - Approve/reject courses
  - View courses, users, analytics
- **Use Case**: Tutor management team

---

## 🚀 Setup & Installation

### 1. Run Seed Script
```bash
# Navigate to scripts directory
cd src/scripts

# Run the seed script
node seedRolesPermissions.js
```

This will:
- Create all default permissions (68 permissions across 17 modules)
- Create 6 predefined roles with appropriate permissions
- Display summary and list any admin users without assigned roles

### 2. Assign Roles to Existing Admins
After seeding, assign roles to existing admin users:

**API Endpoint:**
```
POST /api/v2/admin/roles/users/:userId/role
```

**Request Body:**
```json
{
  "roleId": "65f1234567890abcdef12345"
}
```

---

## 📚 API Endpoints

For complete curl examples of all endpoints, see **[RBAC_CURL_EXAMPLES.md](./RBAC_CURL_EXAMPLES.md)**

### Role Management

#### Create Role
```http
POST /api/v2/admin/roles
Authorization: Bearer {token}
Permission: Super Admin only

Body:
{
  "name": "Custom Manager",
  "description": "Manages custom operations",
  "permissions": ["courses.read", "users.read"]
}
```

#### Get All Roles
```http
GET /api/v2/admin/roles?page=1&limit=20&isActive=true
Authorization: Bearer {token}
Permission: roles.read
```

#### Get Role by ID
```http
GET /api/v2/admin/roles/:roleId
Authorization: Bearer {token}
Permission: roles.read
```

#### Update Role
```http
PUT /api/v2/admin/roles/:roleId
Authorization: Bearer {token}
Permission: Super Admin only

Body:
{
  "description": "Updated description",
  "permissions": ["courses.read", "courses.update"],
  "isActive": true
}
```

#### Delete Role
```http
DELETE /api/v2/admin/roles/:roleId
Authorization: Bearer {token}
Permission: Super Admin only
```

#### Add Permissions to Role
```http
POST /api/v2/admin/roles/:roleId/permissions
Authorization: Bearer {token}
Permission: Super Admin only

Body:
{
  "permissions": ["analytics.read", "analytics.export"]
}
```

#### Remove Permission from Role
```http
DELETE /api/v2/admin/roles/:roleId/permissions/:permissionId
Authorization: Bearer {token}
Permission: Super Admin only
```

---

### Permission Management

#### Get All Permissions
```http
GET /api/v2/admin/permissions?module=courses&isActive=true
Authorization: Bearer {token}
Permission: permissions.read
```

#### Get Permissions Grouped by Module
```http
GET /api/v2/admin/permissions/modules
Authorization: Bearer {token}
Permission: permissions.read
```

#### Get All Modules
```http
GET /api/v2/admin/permissions/modules/list
Authorization: Bearer {token}
Permission: permissions.read
```

#### Get Permission Statistics
```http
GET /api/v2/admin/permissions/stats
Authorization: Bearer {token}
Permission: permissions.read
```

#### Create Permission (Custom)
```http
POST /api/v2/admin/permissions
Authorization: Bearer {token}
Permission: Super Admin only

Body:
{
  "module": "reports",
  "action": "generate",
  "description": "Generate custom reports"
}
```

#### Update Permission
```http
PUT /api/v2/admin/permissions/:permissionId
Authorization: Bearer {token}
Permission: Super Admin only

Body:
{
  "description": "Updated description",
  "isActive": false
}
```

#### Delete Permission
```http
DELETE /api/v2/admin/permissions/:permissionId
Authorization: Bearer {token}
Permission: Super Admin only
```

---

### User-Role Assignment

#### Assign Role to User
```http
POST /api/v2/admin/roles/users/:userId/role
Authorization: Bearer {token}
Permission: users.update

Body:
{
  "roleId": "65f1234567890abcdef12345"
}
```

#### Remove Role from User
```http
DELETE /api/v2/admin/roles/users/:userId/role
Authorization: Bearer {token}
Permission: users.update
```

#### Get User's Permissions
```http
GET /api/v2/admin/roles/users/:userId/permissions
Authorization: Bearer {token}
Permission: users.read
```

#### Get Users by Role
```http
GET /api/v2/admin/roles/:roleId/users?page=1&limit=20
Authorization: Bearer {token}
Permission: roles.read
```

---

## 🛡️ Middleware Usage

### Available Middleware Functions

#### 1. `isSuperAdmin()`
Checks if user is a Super Admin (bypasses all permission checks)

```javascript
router.post('/roles',
  authenticate,
  isSuperAdmin(),
  roleController.createRole
);
```

#### 2. `checkPermission(permission)`
Checks if user has a specific permission

```javascript
router.get('/courses',
  authenticate,
  checkPermission('courses.read'),
  courseController.getAllCourses
);
```

#### 3. `checkAnyPermission([permissions])`
Checks if user has ANY of the specified permissions

```javascript
router.get('/content',
  authenticate,
  checkAnyPermission(['courses.read', 'lessons.read', 'faqs.read']),
  contentController.getContent
);
```

#### 4. `checkAllPermissions([permissions])`
Checks if user has ALL of the specified permissions

```javascript
router.post('/publish-course',
  authenticate,
  checkAllPermissions(['courses.update', 'courses.publish']),
  courseController.publishCourse
);
```

#### 5. `isAdmin()`
Checks if user has admin role (backward compatibility)

```javascript
router.get('/dashboard',
  authenticate,
  isAdmin(),
  adminController.getDashboard
);
```

---

## 🔐 Protecting Existing Routes

### Example: Protecting Admin Controller Routes

```javascript
// Before (old way)
router.get('/users',
  authenticate,
  isAdmin,
  adminController.getAllUsers
);

// After (with RBAC)
router.get('/users',
  authenticate,
  checkPermission('users.read'),
  adminController.getAllUsers
);

router.put('/users/:id',
  authenticate,
  checkPermission('users.update'),
  adminController.updateUser
);

router.delete('/users/:id',
  authenticate,
  checkPermission('users.delete'),
  adminController.deleteUser
);
```

---

## 🔄 Migration Strategy

### Phase 1: Setup (Current)
✅ Create Permission & Role models
✅ Update User model with `assignedRole`
✅ Create permission middleware
✅ Create controllers & routes
✅ Run seed script

### Phase 2: Gradual Migration
1. Keep existing `isAdmin` middleware for backward compatibility
2. Gradually replace with `checkPermission()` on specific routes
3. Assign roles to existing admin users
4. Test thoroughly in development

### Phase 3: Full Migration
1. Replace all `isAdmin` with specific permission checks
2. Remove legacy `isAdmin` middleware (optional)
3. Ensure all admin users have assigned roles

---

## 📝 Best Practices

### 1. Principle of Least Privilege
- Assign only necessary permissions to roles
- Create specialized roles for specific tasks
- Avoid giving unnecessary access

### 2. Regular Audits
- Review user role assignments periodically
- Check for inactive roles and permissions
- Remove unused custom permissions

### 3. Documentation
- Document custom roles and their purpose
- Keep track of permission changes
- Maintain clear naming conventions

### 4. Testing
- Test permission checks thoroughly
- Verify Super Admin bypass works correctly
- Test edge cases (inactive roles, missing permissions)

---

## 🐛 Troubleshooting

### Issue: "Access denied. No role assigned."
**Solution**: Assign a role to the user
```http
POST /api/v2/admin/roles/users/:userId/role
Body: { "roleId": "..." }
```

### Issue: "Access denied. Required permission: X"
**Solution**: 
1. Check if user's role has the required permission
2. Add permission to role if needed:
```http
POST /api/v2/admin/roles/:roleId/permissions
Body: { "permissions": ["X"] }
```

### Issue: Cannot modify system role
**Solution**: System roles (Super Admin, Admin) cannot be modified. Create a custom role instead.

### Issue: Cannot delete role in use
**Solution**: First remove the role from all users, then delete:
```http
DELETE /api/v2/admin/roles/users/:userId/role
```

---

## 📊 Database Schema

### Permission Collection
```javascript
{
  _id: ObjectId,
  name: String,          // "courses.create"
  module: String,        // "courses"
  action: String,        // "create"
  description: String,   // "Create new courses"
  isActive: Boolean,     // true
  isSystemPermission: Boolean, // true for seeded permissions
  createdAt: Date,
  updatedAt: Date
}
```

### Role Collection
```javascript
{
  _id: ObjectId,
  name: String,          // "Content Manager"
  slug: String,          // "content_manager"
  description: String,   // "Manage courses, lessons..."
  permissions: [ObjectId], // Array of Permission IDs
  isSystemRole: Boolean, // true for predefined roles
  isActive: Boolean,     // true
  createdBy: ObjectId,   // User ID
  updatedBy: ObjectId,   // User ID
  createdAt: Date,
  updatedAt: Date
}
```

### User Collection (Extended)
```javascript
{
  _id: ObjectId,
  // ... existing fields ...
  roles: [String],       // ['user', 'tutor', 'admin'] - legacy
  assignedRole: ObjectId, // Role ID for RBAC
  // ... other fields ...
}
```

---

## 📞 Support

For questions or issues with the RBAC system:
1. Check this documentation first
2. Review the code in `/src/middleware/permission.middleware.js`
3. Test with the seed data
4. Contact the development team

---

**Last Updated**: March 12, 2026
**Version**: 1.0.0
