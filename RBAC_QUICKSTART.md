# RBAC System - Quick Start Guide

## ✅ What Has Been Implemented

### 📁 New Files Created

1. **Models**
   - `/src/models/permission.model.js` - Permission schema
   - `/src/models/role.model.js` - Role schema
   - `/src/models/user.model.js` - Updated with `assignedRole` field

2. **Middleware**
   - `/src/middleware/permission.middleware.js` - Permission checking functions

3. **Controllers**
   - `/src/controllers/role.controller.js` - Role management
   - `/src/controllers/permission.controller.js` - Permission management

4. **Routes**
   - `/src/routes/role.routes.js` - Role endpoints
   - `/src/routes/permission.routes.js` - Permission endpoints

5. **Scripts**
   - `/src/scripts/seedRolesPermissions.js` - Database seeding

6. **Documentation**
   - `/RBAC_DOCUMENTATION.md` - Complete RBAC guide

---

## 🚀 Quick Start (5 Steps)

### Step 1: Run the Seed Script
This creates all permissions and predefined roles in your database.

```bash
npm run seed:roles
```

**Output:**
- 68 permissions created across 17 modules
- 6 predefined roles created
- Lists any admin users without assigned roles

---

### Step 2: Assign Roles to Existing Admin Users

If you have existing admin users, assign them roles:

**Using API:**
```bash
# Example: Assign Super Admin role to user
POST /api/v2/admin/roles/users/:userId/role
Authorization: Bearer {your_admin_token}

Body:
{
  "roleId": "{super_admin_role_id}"
}
```

**Note:** You'll get the `roleId` from the seed script output or by calling:
```bash
GET /api/v2/admin/roles
```

---

### Step 3: Test the RBAC System

#### Test Permission Check:
```bash
# This should work if user has 'courses.read' permission
GET /api/v2/admin/courses

# This requires 'users.update' permission
PUT /api/v2/admin/users/:id
```

#### Test Role Management:
```bash
# Get all roles
GET /api/v2/admin/roles

# Get all permissions grouped by module
GET /api/v2/admin/permissions/modules

# Get specific role details
GET /api/v2/admin/roles/:roleId
```

---

### Step 4: Create Your First Custom Role (Optional)

```bash
POST /api/v2/admin/roles
Authorization: Bearer {super_admin_token}

Body:
{
  "name": "Marketing Manager",
  "description": "Manages marketing content and analytics",
  "permissions": [
    "courses.read",
    "faqs.create",
    "faqs.read",
    "faqs.update",
    "analytics.read",
    "notifications.create",
    "notifications.broadcast"
  ]
}
```

---

### Step 5: Protect Your Existing Routes

Update your existing routes to use permission checks:

**Before:**
```javascript
router.get('/users',
  authenticate,
  isAdmin,
  adminController.getAllUsers
);
```

**After:**
```javascript
router.get('/users',
  authenticate,
  checkPermission('users.read'),
  adminController.getAllUsers
);
```

---

## 📊 System Overview

### Predefined Roles

| Role | Description | Key Permissions | Use Case |
|------|-------------|-----------------|----------|
| **Super Admin** | Full system access | ALL permissions | System administrators |
| **Admin** | General admin access | Most permissions except role management | General administrators |
| **Content Manager** | Manage content | Courses, lessons, FAQs (CRUD) | Content team |
| **Finance Manager** | Financial operations | Payments, wallet, analytics | Finance team |
| **Support Manager** | User support | Inquiries, notifications, FAQs | Support team |
| **Tutor Manager** | Tutor management | Tutors, course approvals | Tutor admin |

### Permission Modules

```
courses       lessons        services      inquiries
users         tutors         payments      enrollments
analytics     notifications  faqs          settings
roles         permissions    waitlist      wallet
```

### Actions Per Module

```
create    read    update    delete
approve   reject  publish   export
broadcast suspend verify   refund
```

---

## 🔧 Common Tasks

### Check User's Permissions
```bash
GET /api/v2/admin/roles/users/:userId/permissions
```

### Add Permission to Role
```bash
POST /api/v2/admin/roles/:roleId/permissions
Body: {
  "permissions": ["analytics.export", "settings.update"]
}
```

### Remove Permission from Role
```bash
DELETE /api/v2/admin/roles/:roleId/permissions/:permissionId
```

### Get All Users with Specific Role
```bash
GET /api/v2/admin/roles/:roleId/users
```

### Deactivate a Role
```bash
PUT /api/v2/admin/roles/:roleId
Body: {
  "isActive": false
}
```

---

## 🛠️ Middleware Examples

### Import the Middleware
```javascript
const { 
  isSuperAdmin, 
  checkPermission, 
  checkAnyPermission, 
  checkAllPermissions 
} = require('../middleware/permission.middleware');
```

### Usage Examples

**1. Super Admin Only:**
```javascript
router.post('/roles', 
  authenticate, 
  isSuperAdmin(), 
  roleController.createRole
);
```

**2. Specific Permission:**
```javascript
router.delete('/courses/:id', 
  authenticate, 
  checkPermission('courses.delete'), 
  courseController.deleteCourse
);
```

**3. Any of Multiple Permissions:**
```javascript
router.get('/content', 
  authenticate, 
  checkAnyPermission(['courses.read', 'lessons.read']), 
  contentController.getAll
);
```

**4. All Permissions Required:**
```javascript
router.post('/publish', 
  authenticate, 
  checkAllPermissions(['courses.update', 'courses.publish']), 
  courseController.publish
);
```

---

## 📝 Next Steps

1. ✅ **Run seed script** - `npm run seed:roles`
2. ✅ **Assign roles** to existing admin users
3. ✅ **Test endpoints** with different roles
4. 📋 **Update existing routes** with permission checks (gradually)
5. 📋 **Create custom roles** as needed
6. 📋 **Train your team** on the new system

---

## 🐛 Troubleshooting

### "Access denied. No role assigned."
- **Cause**: User has admin role but no assigned RBAC role
- **Fix**: Assign a role to the user via API

### "Permission not found"
- **Cause**: Seed script not run or permission deleted
- **Fix**: Re-run seed script

### "Cannot modify system role"
- **Cause**: Trying to edit Super Admin or Admin roles
- **Fix**: Create a custom role instead

### Routes still accessible without permission
- **Cause**: Route not protected with permission middleware
- **Fix**: Add `checkPermission()` middleware to route

---

## 📖 Full Documentation

For detailed information:
- **[RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md)** - Complete guide & architecture
- **[RBAC_CURL_EXAMPLES.md](./RBAC_CURL_EXAMPLES.md)** - All API endpoints with curl commands

---

## 🎉 You're All Set!

Your RBAC system is now fully implemented. Start by running the seed script and assigning roles to your admin users.

```bash
# Start here:
npm run seed:roles
```

Good luck! 🚀
