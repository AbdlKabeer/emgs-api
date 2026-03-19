# Course Category System Documentation

## Overview
The course category system allows admins to create, manage, and organize course categories. Courses now reference categories using ObjectId relationships instead of plain strings.

## Database Schema

### CourseCategory Model
Located at: `src/models/courseCategory.model.js`

**Fields:**
- `name` (String, required, unique) - Category name
- `description` (String) - Category description
- `slug` (String, required, unique) - Auto-generated URL-friendly slug
- `icon` (String) - Icon URL or icon class name
- `isActive` (Boolean) - Whether category is active (default: true)
- `order` (Number) - Display order (default: 0)
- `courseCount` (Number) - Number of courses in category (default: 0)
- `timestamps` - createdAt & updatedAt

### Updated Course Model
The `category` field in the Course model now references CourseCategory:
```javascript
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'CourseCategory',
  required: true
}
```

## API Endpoints

### Public Endpoints

#### Get All Categories
```
GET /api/v2/categories
```
**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `search` (optional) - Search by name
- `isActive` (optional) - Filter by active status (true/false)

**Example Request:**
```bash
curl http://localhost:5000/api/v2/categories?isActive=true
```

#### Get Category by ID or Slug
```
GET /api/v2/categories/:id
```
**Example Request:**
```bash
curl http://localhost:5000/api/v2/categories/507f1f77bcf86cd799439011
# OR
curl http://localhost:5000/api/v2/categories/ielts-preparation
```

### Admin Endpoints (Require Authentication & Admin Role)

#### Create Category
```
POST /api/v2/categories
```
**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "IELTS Preparation",
  "description": "Courses for IELTS exam preparation",
  "icon": "https://example.com/ielts-icon.png",
  "isActive": true,
  "order": 1
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/v2/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NCLEX Preparation",
    "description": "Nursing certification exam courses",
    "isActive": true,
    "order": 2
  }'
```

#### Update Category
```
PUT /api/v2/categories/:id
```
**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Category Name",
  "description": "Updated description",
  "icon": "new-icon-url",
  "isActive": false,
  "order": 5
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:5000/api/v2/categories/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

#### Delete Category
```
DELETE /api/v2/categories/:id
```
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Note:** Category can only be deleted if no courses are using it.

**Example Request:**
```bash
curl -X DELETE http://localhost:5000/api/v2/categories/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get Category Statistics
```
GET /api/v2/categories/stats/all
```
Returns statistics for all categories including course counts.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Example Request:**
```bash
curl http://localhost:5000/api/v2/categories/stats/all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "status": "success",
  "message": "Category statistics fetched successfully",
  "data": {
    "stats": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "IELTS Preparation",
        "slug": "ielts-preparation",
        "isActive": true,
        "totalCourses": 15,
        "publishedCourses": 12,
        "draftCourses": 3
      }
    ]
  }
}
```

## Creating Courses with Categories

When creating or updating a course, you must provide a valid category ObjectId:

```bash
curl -X POST http://localhost:5000/api/v2/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "IELTS Speaking Module",
    "description": "Master IELTS speaking skills",
    "category": "507f1f77bcf86cd799439011",
    "isFree": false,
    "price": 50,
    "thumbnail": "https://example.com/thumb.jpg"
  }'
```

## Migration Script

If you have existing courses with string-based categories, run the migration script:

```bash
node src/scripts/migrateCourseCategories.js
```

This script will:
1. Create CourseCategory documents for all existing string categories
2. Update all courses to reference the new category ObjectIds
3. Preserve all existing data

## Validation Rules

### Category Creation/Update
- **name**: 2-50 characters, required for creation
- **description**: Max 200 characters
- **isActive**: Boolean
- **order**: Positive integer
- **icon**: String (URL or class name)

### Course Category Reference
- Must be a valid MongoDB ObjectId
- Must reference an existing CourseCategory document

## Files Created/Modified

### New Files:
- `src/models/courseCategory.model.js` - Category model
- `src/controllers/category.controller.js` - Category CRUD operations
- `src/routes/category.routes.js` - Category API routes
- `src/validators/category.validator.js` - Input validation
- `src/scripts/migrateCourseCategories.js` - Migration script
- `CATEGORY_DOCUMENTATION.md` - This file

### Modified Files:
- `src/models/course.model.js` - Updated category field to ObjectId reference
- `src/routes/category.routes.js` - Added category routes
- `src/server.js` - Registered category routes
- `src/validators/course.validator.js` - Updated category validation

## Features

✅ Full CRUD operations for categories
✅ Admin-only category management
✅ Public category listing
✅ Category by ID or slug lookup
✅ Soft delete validation (prevents deletion if courses exist)
✅ Auto-generated slugs
✅ Course count tracking
✅ Category statistics endpoint
✅ Input validation
✅ Pagination support
✅ Search functionality
✅ Active/inactive filtering

## Error Handling

The API returns appropriate error messages:
- **400** - Validation errors, duplicate names, or attempting to delete categories with courses
- **404** - Category not found
- **401** - Unauthorized access
- **500** - Internal server errors

## Best Practices

1. **Always create categories before creating courses** - Courses require a valid category reference
2. **Use meaningful names** - Category names should be clear and descriptive
3. **Set display order** - Use the `order` field to control category display sequence
4. **Deactivate instead of delete** - Set `isActive: false` instead of deleting to preserve historical data
5. **Check statistics** - Use the stats endpoint to monitor category usage before making changes

## Testing

### Test Category Creation:
```javascript
// Example using fetch
const createCategory = async () => {
  const response = await fetch('http://localhost:5000/api/v2/categories', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Category',
      description: 'A test category',
      isActive: true,
      order: 1
    })
  });
  
  const data = await response.json();
  console.log(data);
};
```

### Test Category Listing:
```javascript
const getCategories = async () => {
  const response = await fetch('http://localhost:5000/api/v2/categories?isActive=true');
  const data = await response.json();
  console.log(data);
};
```

## Support

For issues or questions about the category system, refer to:
- API documentation at `/api/v2/categories`
- Swagger documentation (if enabled)
- Check server logs for detailed error messages
