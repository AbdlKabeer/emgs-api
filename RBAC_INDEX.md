# RBAC Documentation Index

Complete documentation for the Role-Based Access Control system.

## 📚 Available Documents

### 1. [Quick Start Guide](./RBAC_QUICKSTART.md) ⚡
**Start here!** Get the RBAC system running in 5 minutes.
- Installation steps
- First-time setup
- Basic usage examples
- Common tasks

**Perfect for**: First-time setup, quick reference

---

### 2. [Complete Documentation](./RBAC_DOCUMENTATION.md) 📖
Comprehensive guide covering all aspects of the RBAC system.
- Architecture overview
- Permission structure (68 permissions)
- Predefined roles (6 roles)
- Middleware usage
- Best practices
- Troubleshooting
- Database schema

**Perfect for**: Understanding the system, advanced configuration

---

### 3. [cURL API Examples](./RBAC_CURL_EXAMPLES.md) 🔧
Ready-to-use cURL commands for all RBAC endpoints.
- **Role Management** (9 endpoints)
  - Create, update, delete roles
  - Manage role permissions
  - View role users
- **Permission Management** (8 endpoints)
  - View and filter permissions
  - Create custom permissions
  - Permission statistics
- **User-Role Assignment** (3 endpoints)
  - Assign roles to users
  - View user permissions
- Testing workflow
- Common errors & solutions

**Perfect for**: API testing, integration, development

---

## 🚀 Quick Navigation

**I want to...**

- ✅ **Set up RBAC for the first time**
  → Go to [RBAC_QUICKSTART.md](./RBAC_QUICKSTART.md)

- 📖 **Understand how RBAC works**
  → Go to [RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md)

- 🔧 **Test the API endpoints**
  → Go to [RBAC_CURL_EXAMPLES.md](./RBAC_CURL_EXAMPLES.md)

- 🛡️ **Protect my routes with permissions**
  → See [Middleware Usage](./RBAC_DOCUMENTATION.md#-middleware-usage)

- 👥 **Create custom roles**
  → See [Create Role](./RBAC_CURL_EXAMPLES.md#1-create-a-new-role)

- 🔑 **Assign roles to users**
  → See [User-Role Assignment](./RBAC_CURL_EXAMPLES.md#-user-role-assignment)

---

## 📋 Quick Reference

### System Overview
- **68 Permissions** across **17 modules**
- **6 Predefined Roles** (Super Admin, Admin, Content Manager, Finance Manager, Support Manager, Tutor Manager)
- **Module-based permissions**: `module.action` format (e.g., `courses.create`, `users.read`)

### Key Files Created
```
src/
├── models/
│   ├── permission.model.js
│   ├── role.model.js
│   └── user.model.js (updated)
├── middleware/
│   └── permission.middleware.js
├── controllers/
│   ├── role.controller.js
│   └── permission.controller.js
├── routes/
│   ├── role.routes.js
│   └── permission.routes.js
└── scripts/
    └── seedRolesPermissions.js
```

### API Base URLs
```
Roles:       /api/v2/admin/roles
Permissions: /api/v2/admin/permissions
```

### Quick Commands
```bash
# Seed the database
npm run seed:roles

# Get all roles
GET /api/v2/admin/roles

# Get all permissions grouped by module
GET /api/v2/admin/permissions/modules

# Assign role to user
POST /api/v2/admin/roles/users/:userId/role
```

---

## 🎯 Common Use Cases

### Use Case 1: New Admin User Setup
1. User registers/is created with admin role
2. Super Admin assigns appropriate role via API
3. User can now access features based on role permissions

**See**: [Quick Start - Step 2](./RBAC_QUICKSTART.md#step-2-assign-roles-to-existing-admin-users)

---

### Use Case 2: Create a Custom Marketing Team Role
1. Create new role with specific permissions
2. Assign permissions: `courses.read`, `faqs.create`, `notifications.broadcast`
3. Assign role to marketing team members

**See**: [cURL Examples - Create Role](./RBAC_CURL_EXAMPLES.md#1-create-a-new-role)

---

### Use Case 3: Protect Admin Routes
Replace generic admin checks with specific permission checks:

```javascript
// Before
router.delete('/courses/:id', authenticate, isAdmin, controller.deleteCourse);

// After
router.delete('/courses/:id', authenticate, checkPermission('courses.delete'), controller.deleteCourse);
```

**See**: [Documentation - Middleware Usage](./RBAC_DOCUMENTATION.md#-middleware-usage)

---

## 🆘 Troubleshooting

### Common Issues

| Error | Solution | Documentation |
|-------|----------|---------------|
| "No role assigned" | Assign role to user | [Quick Start](./RBAC_QUICKSTART.md#step-2-assign-roles-to-existing-admin-users) |
| "Required permission: X" | Add permission to role | [cURL Examples](./RBAC_CURL_EXAMPLES.md#6-add-permissions-to-role) |
| "Cannot modify system role" | Create custom role instead | [Documentation](./RBAC_DOCUMENTATION.md#2-role-model) |
| 401 Unauthorized | Check authentication token | [cURL Examples](./RBAC_CURL_EXAMPLES.md#-authentication) |

---

## 📞 Support Flow

1. **Check** the relevant documentation section
2. **Review** curl examples for correct API usage
3. **Test** with provided curl commands
4. **Verify** database state (roles, permissions, user assignments)
5. **Contact** development team if issue persists

---

## 🔄 Version Information

- **Version**: 1.0.0
- **Last Updated**: March 12, 2026
- **Database**: MongoDB with Mongoose ODM
- **Framework**: Express.js with JWT authentication

---

## 📌 Next Steps

1. ✅ Read the [Quick Start Guide](./RBAC_QUICKSTART.md)
2. ✅ Run `npm run seed:roles`
3. ✅ Test endpoints using [cURL examples](./RBAC_CURL_EXAMPLES.md)
4. ✅ Review [full documentation](./RBAC_DOCUMENTATION.md) for advanced features

---

**Ready to get started?** → [RBAC_QUICKSTART.md](./RBAC_QUICKSTART.md) ⚡
