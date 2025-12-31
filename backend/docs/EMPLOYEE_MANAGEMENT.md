# Company & Employee Management API Documentation

## Overview

Complete role-based employee management system with hierarchical company structure. Only company owners (BOSS role) can register and manage employees.

## Architecture

### Database Schema

- **Role Enum**: BOSS, EMPLOYEE
- **User Fields**:
  - Standard: id, email, username, password, firstName, lastName
  - Role: role (BOSS/EMPLOYEE)
  - Company: companyId, company relation
  - Employee Fields: skills[], achievements, attendance
  - 2FA: isTwoFAEnabled, twoFASecret, backupCodes (BOSS only)

### Hierarchy

```
Company Owner (BOSS)
    ↓
    Company
    ↓
    Employees (EMPLOYEE role)
```

---

## API Endpoints

### 1. Authentication

#### Register (BOSS Only)

```http
POST /auth/register
Content-Type: application/json

{
  "email": "owner@company.com",
  "username": "boss123",
  "password": "SecurePass123!",
  "companyName": "Tech Solutions Inc",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "cuid_here",
    "email": "owner@company.com",
    "username": "boss123",
    "role": "BOSS",
    "companyId": "company_cuid"
  }
}
```

**Notes:**

- Creates BOSS user with company
- Company name must be unique
- Password must include upper, lower, number, and symbol
- Minimum 8 characters

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "owner@company.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "cuid_here",
    "email": "owner@company.com",
    "role": "BOSS"
  }
}
```

---

### 2. Profile Management (Authenticated)

#### Get Profile

```http
GET /users/me/profile
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "id": "cuid_here",
  "email": "owner@company.com",
  "username": "boss123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "BOSS",
  "skills": [],
  "achievements": null,
  "attendance": 0,
  "company": {
    "id": "company_id",
    "name": "Tech Solutions Inc",
    "createdAt": "2025-12-25T10:00:00Z"
  },
  "ownedCompanies": [
    {
      "id": "company_id",
      "name": "Tech Solutions Inc",
      "isActive": true,
      "_count": {
        "employees": 5
      }
    }
  ]
}
```

#### Update Company Name (BOSS Only)

```http
PATCH /users/me/company-name
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "companyName": "Tech Solutions International"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Company name updated successfully",
  "company": {
    "id": "company_id",
    "name": "Tech Solutions International",
    "updatedAt": "2025-12-25T11:00:00Z"
  }
}
```

#### Change Password

```http
PATCH /users/me/password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password changed successfully. Please login again."
}
```

**Notes:**

- All sessions are revoked after password change
- Must re-login with new password

---

### 3. Employee Management (BOSS Only)

#### Create Employee

```http
POST /employees
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "password": "EmpPass123!",
  "skills": ["frontend", "backend", "react"],
  "achievements": "Led 3 successful projects",
  "attendance": 95
}
```

**Response:**

```json
{
  "success": true,
  "message": "Employee created successfully",
  "employee": {
    "id": "emp_cuid",
    "email": "jane@company.com",
    "username": "jane_1735123456789",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE",
    "skills": ["frontend", "backend", "react"],
    "achievements": "Led 3 successful projects",
    "attendance": 95,
    "isActive": true,
    "createdAt": "2025-12-25T11:30:00Z",
    "company": {
      "id": "company_id",
      "name": "Tech Solutions Inc"
    }
  }
}
```

**Field Details:**

- `name` (required): Full name of employee
- `email` (required): Unique email address
- `password` (required): Must meet security requirements
- `skills` (optional): Array of skill strings
- `achievements` (optional): Employee accomplishments
- `attendance` (optional): Default is 0

**Auto-generated:**

- `username`: Generated from email + timestamp
- `companyId`: Set to BOSS's company
- `createdBy`: Set to BOSS's user ID
- `role`: Always set to EMPLOYEE

#### Get All Employees

```http
GET /employees?skip=0&take=20
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "employees": [
    {
      "id": "emp_cuid_1",
      "email": "jane@company.com",
      "username": "jane_1735123456789",
      "firstName": "Jane",
      "lastName": "Smith",
      "skills": ["frontend", "backend"],
      "achievements": "Led 3 projects",
      "attendance": 95,
      "isActive": true,
      "lastLogin": "2025-12-25T10:00:00Z",
      "createdAt": "2025-12-25T09:00:00Z",
      "updatedAt": "2025-12-25T10:00:00Z"
    }
  ],
  "total": 10,
  "skip": 0,
  "take": 20,
  "company": {
    "id": "company_id",
    "name": "Tech Solutions Inc"
  }
}
```

**Query Parameters:**

- `skip`: Number of records to skip (default: 0)
- `take`: Number of records to return (default: 20)

#### Get Single Employee

```http
GET /employees/{employeeId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "id": "emp_cuid",
  "email": "jane@company.com",
  "username": "jane_1735123456789",
  "firstName": "Jane",
  "lastName": "Smith",
  "skills": ["frontend", "backend", "react"],
  "achievements": "Led 3 successful projects",
  "attendance": 95,
  "isActive": true,
  "isEmailVerified": false,
  "lastLogin": "2025-12-25T10:00:00Z",
  "createdAt": "2025-12-25T09:00:00Z",
  "updatedAt": "2025-12-25T10:00:00Z",
  "company": {
    "id": "company_id",
    "name": "Tech Solutions Inc"
  },
  "createdByUser": {
    "id": "boss_id",
    "email": "owner@company.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Update Employee

```http
PUT /employees/{employeeId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jane Smith Updated",
  "email": "jane.smith@company.com",
  "skills": ["frontend", "backend", "react", "ai/ml"],
  "achievements": "Led 5 successful projects, promoted to senior",
  "attendance": 98
}
```

**Optional Fields:**

- `name`: Full name
- `email`: New email (must be unique)
- `password`: New password
- `firstName`: First name separately
- `lastName`: Last name separately
- `skills`: Updated skills array
- `achievements`: Updated achievements
- `attendance`: Updated attendance count

**Response:**

```json
{
  "success": true,
  "message": "Employee updated successfully",
  "employee": {
    "id": "emp_cuid",
    "email": "jane.smith@company.com",
    "firstName": "Jane",
    "lastName": "Smith Updated",
    "skills": ["frontend", "backend", "react", "ai/ml"],
    "achievements": "Led 5 successful projects, promoted to senior",
    "attendance": 98,
    "updatedAt": "2025-12-25T12:00:00Z"
  }
}
```

#### Remove/Delete Employee

```http
DELETE /employees/{employeeId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Employee removed successfully"
}
```

**Notes:**

- Soft delete (deactivates user, doesn't delete from database)
- Sets `isActive` to false
- Removes `companyId` (detaches from company)
- Employee data is preserved for audit purposes

---

## Security Features

### Role-Based Access Control (RBAC)

- **BOSS**: Can create/update/delete employees, manage company
- **EMPLOYEE**: Can only login and view own profile

### Guards

- `JwtAuthGuard`: Protects all authenticated routes
- `RolesGuard`: Restricts routes by role
- All employee management routes require BOSS role

### Audit Logging

- Company audit logs for all employee operations:
  - EMPLOYEE_CREATED
  - EMPLOYEE_UPDATED
  - EMPLOYEE_REMOVED

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Only company owners can add employees",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Employee not found or does not belong to your company",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Company name already exists",
  "error": "Conflict"
}
```

---

## Real-Time Data

All endpoints return **real-time data** directly from the PostgreSQL database:

- No caching layer
- Immediate consistency
- All CRUD operations update database instantly
- Company hierarchy enforced at database level

---

## Example Workflows

### 1. Company Owner Registration

```
1. POST /auth/register (with company name)
   → Creates BOSS user + Company
   → Returns auth tokens

2. GET /users/me/profile
   → View profile with company details
```

### 2. Adding Employees

```
1. POST /employees (with employee details)
   → Creates EMPLOYEE user
   → Links to BOSS's company
   → Auto-generates username

2. GET /employees
   → View all company employees
```

### 3. Managing Employees

```
1. GET /employees/{id}
   → View specific employee details

2. PUT /employees/{id}
   → Update employee information
   → Update skills, attendance, achievements

3. DELETE /employees/{id}
   → Soft delete employee
   → Removes from company
```

### 4. Profile Management

```
1. PATCH /users/me/company-name
   → Update company name (BOSS only)

2. PATCH /users/me/password
   → Change password
   → All sessions revoked
```

---

## Database Structure

### Tables

- **companies**: Company information
- **users**: Both BOSS and EMPLOYEE users
- **company_audit_logs**: All company operations
- **audit_logs**: User authentication logs
- **sessions**: Active user sessions
- **refresh_tokens**: JWT refresh tokens

### Indexes

- email (unique)
- username (unique)
- companyId (for fast employee lookups)
- createdBy (for tracking who created employees)
- company name (unique)

---

## Testing Endpoints

### Using Postman/Thunder Client

1. **Register as BOSS:**

   ```
   POST http://localhost:3000/auth/register
   Body: { email, username, password, companyName }
   ```

2. **Login:**

   ```
   POST http://localhost:3000/auth/login
   Body: { email, password }
   Save: accessToken from response
   ```

3. **Add Employee:**

   ```
   POST http://localhost:3000/employees
   Header: Authorization: Bearer {accessToken}
   Body: { name, email, password, skills?, attendance?, achievements? }
   ```

4. **Get Employees:**

   ```
   GET http://localhost:3000/employees
   Header: Authorization: Bearer {accessToken}
   ```

5. **Update Employee:**
   ```
   PUT http://localhost:3000/employees/{id}
   Header: Authorization: Bearer {accessToken}
   Body: { fields to update }
   ```

---

## Validation Rules

### Registration

- Email: Valid email format
- Username: 3-20 characters
- Password: 8+ chars, upper+lower+number+symbol
- Company Name: 2-100 characters

### Employee Creation

- Name: 2+ characters
- Email: Valid email format
- Password: Same as registration
- Skills: Array of strings (optional)
- Attendance: Integer ≥ 0 (optional)
- Achievements: String (optional)

---

## Features Summary

✅ **Registration**: Only BOSS can register with company name  
✅ **Profile Management**: Update company name, change password  
✅ **Employee Management**: Full CRUD operations  
✅ **Role-Based Access**: BOSS-only employee routes  
✅ **Real-Time Data**: Direct database queries  
✅ **Hierarchical Structure**: Company → Employees  
✅ **Audit Logging**: All company operations tracked  
✅ **Security**: Password requirements, JWT auth, role guards  
✅ **Soft Delete**: Employee data preserved  
✅ **Pagination**: Skip/take for large datasets  
✅ **Auto-Generation**: Username from email

---

## Next Steps

1. Start the backend: `npm run start:dev`
2. Test registration endpoint
3. Add employees
4. Test all CRUD operations
5. Check audit logs in database
6. Implement frontend employee management UI
