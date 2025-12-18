# API Reference

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

All requests (except `/auth/login`) require:

```
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_uuid>
```

---

## Authentication APIs

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@demo.com",
  "password": "password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "admin@demo.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOi..."
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

---

## Employee APIs

### List Employees

```http
GET /employees?page=0&size=20
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "employeeCode": "EMP001",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "departmentName": "Engineering",
      "designation": "CEO",
      "status": "ACTIVE"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 20,
  "number": 0
}
```

### Get Employee

```http
GET /employees/{id}
```

### Create Employee

```http
POST /employees
Content-Type: application/json

{
  "employeeCode": "EMP006",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "departmentId": "uuid",
  "designation": "Developer",
  "hireDate": "2025-01-01"
}
```

### Update Employee

```http
PUT /employees/{id}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### Delete Employee

```http
DELETE /employees/{id}
```

---

## Attendance APIs

### Check In

```http
POST /attendance/check-in
Content-Type: application/json

{
  "employeeId": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "locationId": "uuid"
}
```

### Check Out

```http
POST /attendance/check-out
Content-Type: application/json

{
  "employeeId": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

### Get Calendar

```http
GET /attendance/calendar?employeeId={id}&month=12&year=2025
```

**Response:**
```json
{
  "employeeId": "uuid",
  "month": 12,
  "year": 2025,
  "records": [
    {
      "date": "2025-12-01",
      "status": "PRESENT",
      "checkIn": "09:00:00",
      "checkOut": "18:00:00",
      "workHours": 8.5
    }
  ],
  "summary": {
    "present": 20,
    "absent": 2,
    "leaves": 3,
    "holidays": 2
  }
}
```

---

## Leave APIs

### Apply Leave

```http
POST /leave/requests
Content-Type: application/json

{
  "leaveTypeId": "uuid",
  "startDate": "2025-01-15",
  "endDate": "2025-01-17",
  "reason": "Family vacation"
}
```

### Approve Leave

```http
POST /leave/requests/{id}/approve
Content-Type: application/json

{
  "comments": "Approved"
}
```

### Reject Leave

```http
POST /leave/requests/{id}/reject
Content-Type: application/json

{
  "reason": "Project deadline conflict"
}
```

### Get Balances

```http
GET /leave/balances?employeeId={id}
```

**Response:**
```json
{
  "employeeId": "uuid",
  "year": 2025,
  "balances": [
    {
      "leaveTypeName": "Annual Leave",
      "opening": 20,
      "accrued": 0,
      "used": 5,
      "carryForward": 3,
      "current": 18
    }
  ]
}
```

---

## Payroll APIs

### Create Payroll Run

```http
POST /payroll/runs
Content-Type: application/json

{
  "payPeriodStart": "2025-12-01",
  "payPeriodEnd": "2025-12-31"
}
```

### Process Payroll

```http
POST /payroll/runs/{id}/process
```

### Approve Payroll

```http
POST /payroll/runs/{id}/approve
```

### Get Payslips

```http
GET /payroll/payslips?employeeId={id}
```

### Download Payslip PDF

```http
GET /payroll/payslips/{id}/pdf
Accept: application/pdf
```

---

## Analytics APIs

### Dashboard

```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "headcount": {
    "total": 150,
    "active": 145,
    "onLeave": 5,
    "newHires": 8,
    "attrition": 2
  },
  "attendance": {
    "presentToday": 140,
    "absentToday": 5,
    "onLeave": 5,
    "averageHours": 8.2
  },
  "leave": {
    "pendingApprovals": 12,
    "approvedThisMonth": 45
  },
  "payroll": {
    "currentMonth": {
      "grossSalary": 15000000,
      "netSalary": 12500000,
      "totalDeductions": 2500000
    }
  },
  "departmentDistribution": [
    {"name": "Engineering", "count": 50},
    {"name": "Sales", "count": 30}
  ],
  "upcomingEvents": {
    "birthdays": [],
    "anniversaries": [],
    "holidays": []
  }
}
```

---

## Announcements APIs

### List Announcements

```http
GET /announcements?page=0&size=20
```

### Get Pinned

```http
GET /announcements/pinned
```

### Create Announcement

```http
POST /announcements
Content-Type: application/json

{
  "title": "Company Update",
  "content": "Important announcement content...",
  "category": "GENERAL",
  "priority": "HIGH",
  "targetAudience": "ALL_EMPLOYEES",
  "isPinned": false,
  "requiresAcceptance": true
}
```

### Mark as Read

```http
POST /announcements/{id}/read
```

### Accept Announcement

```http
POST /announcements/{id}/accept
```

---

## Benefits APIs

### List Plans

```http
GET /benefits/plans
```

### Get Active Plans

```http
GET /benefits/plans/active
```

### Enroll Employee

```http
POST /benefits-enhanced/enrollments
Content-Type: application/json

{
  "benefitPlanId": "uuid",
  "employeeId": "uuid",
  "coverageLevel": "FAMILY",
  "effectiveDate": "2025-01-01"
}
```

### Get Employee Enrollments

```http
GET /benefits-enhanced/enrollments/employee/{employeeId}
```

### Submit Claim

```http
POST /benefits-enhanced/claims
Content-Type: application/json

{
  "enrollmentId": "uuid",
  "claimType": "MEDICAL",
  "claimAmount": 5000,
  "serviceDate": "2025-12-01",
  "serviceProvider": "Hospital Name",
  "description": "Doctor consultation"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "must not be blank"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Employee not found with id: uuid"
}
```

### 500 Internal Server Error

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Pagination

All list endpoints support pagination:

```
GET /employees?page=0&size=20&sort=firstName,asc
```

**Parameters:**
- `page`: Page number (0-indexed)
- `size`: Page size (default: 20, max: 100)
- `sort`: Sort field and direction

---

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per minute per tenant

---

**Last Updated**: December 8, 2025
