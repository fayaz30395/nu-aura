# API Specifications

## 1. Overview

### 1.1 Base Configuration

| Property | Value |
|----------|-------|
| Base URL | `/api/v1` |
| Protocol | HTTPS (TLS 1.2+) |
| Content Type | `application/json` |
| Authentication | Bearer Token (JWT) |
| Documentation | `/swagger-ui.html` |
| OpenAPI Spec | `/v3/api-docs` |

### 1.2 Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token for authentication |
| `X-Tenant-ID` | Yes | UUID identifying the tenant |
| `Content-Type` | Yes | `application/json` for request body |
| `Accept` | No | `application/json` (default) |
| `X-Request-ID` | No | Correlation ID for tracing |

*Not required for `/auth/login` and public endpoints

---

## 2. Authentication API

### 2.1 Login

**POST** `/auth/login`

Authenticate user and obtain JWT tokens.

#### Request
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["EMPLOYEE", "MANAGER"],
      "tenantId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Error Responses
| Code | Description |
|------|-------------|
| 401 | Invalid credentials |
| 423 | Account locked |
| 429 | Too many login attempts |

---

### 2.2 Google SSO Login

**POST** `/auth/google`

Authenticate via Google OAuth token.

#### Request
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

#### Response
Same as standard login response.

---

### 2.3 Refresh Token

**POST** `/auth/refresh`

Obtain new access token using refresh token.

#### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

---

### 2.4 Logout

**POST** `/auth/logout`

Invalidate current session.

#### Request
No body required. Token in Authorization header.

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Logged out successfully"
}
```

---

### 2.5 Change Password

**POST** `/auth/change-password`

Change user's password.

#### Request
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Password changed successfully"
}
```

---

## 3. Employee API

### 3.1 List Employees

**GET** `/employees`

Retrieve paginated list of employees.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number (0-indexed) |
| size | int | 20 | Page size (max 100) |
| sort | string | createdAt,desc | Sort field and direction |
| search | string | - | Search by name, email, or ID |
| departmentId | UUID | - | Filter by department |
| locationId | UUID | - | Filter by location |
| status | enum | ACTIVE | ACTIVE, INACTIVE, ON_LEAVE |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "employeeId": "EMP001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@company.com",
        "phone": "+1234567890",
        "department": {
          "id": "dept-001",
          "name": "Engineering"
        },
        "designation": {
          "id": "des-001",
          "name": "Software Engineer"
        },
        "manager": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Jane Smith"
        },
        "joiningDate": "2024-01-15",
        "status": "ACTIVE",
        "avatarUrl": "https://storage.example.com/avatars/emp001.jpg"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  }
}
```

---

### 3.2 Get Employee by ID

**GET** `/employees/{id}`

Retrieve complete employee details.

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Employee ID |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "phone": "+1234567890",
    "personalEmail": "john.personal@email.com",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "bloodGroup": "O+",
    "maritalStatus": "SINGLE",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "postalCode": "94102"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "department": {
      "id": "dept-001",
      "name": "Engineering"
    },
    "designation": {
      "id": "des-001",
      "name": "Software Engineer"
    },
    "manager": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Jane Smith"
    },
    "location": {
      "id": "loc-001",
      "name": "San Francisco Office"
    },
    "joiningDate": "2024-01-15",
    "confirmationDate": "2024-07-15",
    "employmentType": "FULL_TIME",
    "status": "ACTIVE",
    "workEmail": "john.doe@company.com",
    "slackId": "@johndoe",
    "bankDetails": {
      "accountNumber": "****1234",
      "bankName": "Chase Bank",
      "ifscCode": "CHAS0001234"
    },
    "documents": [
      {
        "id": "doc-001",
        "type": "ID_PROOF",
        "name": "Passport",
        "url": "https://storage.example.com/docs/passport.pdf"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-06-20T14:45:00Z"
  }
}
```

---

### 3.3 Create Employee

**POST** `/employees`

Create a new employee record.

#### Request
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "departmentId": "dept-001",
  "designationId": "des-001",
  "managerId": "550e8400-e29b-41d4-a716-446655440002",
  "locationId": "loc-001",
  "joiningDate": "2024-01-15",
  "employmentType": "FULL_TIME",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postalCode": "94102"
  }
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "code": 201,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com"
  },
  "message": "Employee created successfully"
}
```

---

### 3.4 Update Employee

**PUT** `/employees/{id}`

Update employee information.

#### Request
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "departmentId": "dept-002",
  "designationId": "des-002"
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "firstName": "John",
    "lastName": "Doe"
  },
  "message": "Employee updated successfully"
}
```

---

### 3.5 Delete Employee

**DELETE** `/employees/{id}`

Soft delete an employee (sets status to INACTIVE).

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Employee deleted successfully"
}
```

---

### 3.6 Employee Directory

**GET** `/employees/directory`

Search employee directory.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (name, email, department) |
| limit | int | Maximum results (default: 10) |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john.doe@company.com",
      "phone": "+1234567890",
      "department": "Engineering",
      "designation": "Software Engineer",
      "avatarUrl": "https://storage.example.com/avatars/emp001.jpg"
    }
  ]
}
```

---

### 3.7 Bulk Import Employees

**POST** `/employees/import`

Import multiple employees from CSV/Excel.

#### Request (multipart/form-data)
| Field | Type | Description |
|-------|------|-------------|
| file | file | CSV or Excel file |
| dryRun | boolean | Validate without importing |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "totalRecords": 50,
    "successCount": 48,
    "failedCount": 2,
    "errors": [
      {
        "row": 15,
        "field": "email",
        "message": "Duplicate email: john@example.com"
      },
      {
        "row": 32,
        "field": "departmentId",
        "message": "Invalid department ID"
      }
    ]
  }
}
```

---

## 4. Attendance API

### 4.1 Check-In

**POST** `/attendance/check-in`

Record employee check-in.

#### Request
```json
{
  "source": "WEB",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "notes": "Working from office"
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "att-001",
    "employeeId": "550e8400-e29b-41d4-a716-446655440001",
    "checkInTime": "2026-01-11T09:00:00Z",
    "source": "WEB",
    "status": "PRESENT"
  },
  "message": "Check-in recorded successfully"
}
```

---

### 4.2 Check-Out

**POST** `/attendance/check-out`

Record employee check-out.

#### Request
```json
{
  "source": "WEB",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "att-001",
    "employeeId": "550e8400-e29b-41d4-a716-446655440001",
    "checkInTime": "2026-01-11T09:00:00Z",
    "checkOutTime": "2026-01-11T18:00:00Z",
    "totalHours": 9.0,
    "status": "PRESENT"
  }
}
```

---

### 4.3 Get Attendance Calendar

**GET** `/attendance/calendar`

Get attendance records for a date range.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | UUID | Employee ID (optional, defaults to current user) |
| startDate | date | Start date (YYYY-MM-DD) |
| endDate | date | End date (YYYY-MM-DD) |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "date": "2026-01-10",
      "status": "PRESENT",
      "checkIn": "09:00",
      "checkOut": "18:00",
      "totalHours": 9.0,
      "overtime": 0
    },
    {
      "date": "2026-01-11",
      "status": "PRESENT",
      "checkIn": "09:15",
      "checkOut": null,
      "totalHours": null,
      "overtime": null,
      "remarks": "Late arrival"
    },
    {
      "date": "2026-01-12",
      "status": "WEEKEND",
      "checkIn": null,
      "checkOut": null
    }
  ]
}
```

---

### 4.4 Attendance Summary

**GET** `/attendance/summary`

Get attendance statistics.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | UUID | Employee ID |
| month | int | Month (1-12) |
| year | int | Year |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "totalDays": 22,
    "presentDays": 20,
    "absentDays": 1,
    "halfDays": 1,
    "leaveDays": 0,
    "averageWorkingHours": 8.5,
    "totalOvertime": 10,
    "lateArrivals": 3,
    "earlyDepartures": 1
  }
}
```

---

### 4.5 Attendance Regularization Request

**POST** `/attendance/regularization`

Request attendance correction.

#### Request
```json
{
  "date": "2026-01-10",
  "type": "MISSED_CHECKOUT",
  "requestedCheckOut": "18:00:00",
  "reason": "Forgot to check out due to emergency"
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "reg-001",
    "status": "PENDING",
    "requestedAt": "2026-01-11T10:00:00Z"
  },
  "message": "Regularization request submitted"
}
```

---

## 5. Leave API

### 5.1 Get Leave Types

**GET** `/leave/types`

Get available leave types.

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "lt-001",
      "name": "Casual Leave",
      "code": "CL",
      "description": "For personal matters",
      "defaultBalance": 12,
      "carryOverLimit": 5,
      "encashable": false
    },
    {
      "id": "lt-002",
      "name": "Sick Leave",
      "code": "SL",
      "description": "For health-related absence",
      "defaultBalance": 12,
      "carryOverLimit": 0,
      "encashable": false,
      "requiresDocument": true,
      "documentThresholdDays": 3
    },
    {
      "id": "lt-003",
      "name": "Earned Leave",
      "code": "EL",
      "description": "Planned vacations",
      "defaultBalance": 15,
      "carryOverLimit": 15,
      "encashable": true
    }
  ]
}
```

---

### 5.2 Get Leave Balances

**GET** `/leave/balances`

Get employee's leave balances.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | UUID | Employee ID (optional) |
| year | int | Year (default: current) |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "year": 2026,
    "balances": [
      {
        "leaveTypeId": "lt-001",
        "leaveTypeName": "Casual Leave",
        "code": "CL",
        "opening": 12,
        "accrued": 0,
        "used": 3,
        "pending": 1,
        "available": 8
      },
      {
        "leaveTypeId": "lt-002",
        "leaveTypeName": "Sick Leave",
        "code": "SL",
        "opening": 12,
        "accrued": 0,
        "used": 2,
        "pending": 0,
        "available": 10
      },
      {
        "leaveTypeId": "lt-003",
        "leaveTypeName": "Earned Leave",
        "code": "EL",
        "opening": 5,
        "accrued": 7.5,
        "used": 0,
        "pending": 0,
        "available": 12.5
      }
    ]
  }
}
```

---

### 5.3 Apply for Leave

**POST** `/leave/requests`

Submit leave application.

#### Request
```json
{
  "leaveTypeId": "lt-001",
  "startDate": "2026-01-20",
  "endDate": "2026-01-22",
  "startDayType": "FULL_DAY",
  "endDayType": "FULL_DAY",
  "reason": "Family vacation",
  "contactNumber": "+1234567890",
  "handoverTo": "550e8400-e29b-41d4-a716-446655440002"
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "lr-001",
    "leaveType": "Casual Leave",
    "startDate": "2026-01-20",
    "endDate": "2026-01-22",
    "totalDays": 3,
    "status": "PENDING",
    "approver": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Smith"
    }
  },
  "message": "Leave request submitted successfully"
}
```

---

### 5.4 Get Leave Requests

**GET** `/leave/requests`

List leave requests.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | UUID | Filter by employee |
| status | enum | PENDING, APPROVED, REJECTED, CANCELLED |
| startDate | date | Filter by date range start |
| endDate | date | Filter by date range end |
| page | int | Page number |
| size | int | Page size |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "content": [
      {
        "id": "lr-001",
        "employee": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "John Doe"
        },
        "leaveType": {
          "id": "lt-001",
          "name": "Casual Leave"
        },
        "startDate": "2026-01-20",
        "endDate": "2026-01-22",
        "totalDays": 3,
        "status": "PENDING",
        "reason": "Family vacation",
        "appliedAt": "2026-01-11T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5
  }
}
```

---

### 5.5 Approve/Reject Leave

**POST** `/leave/requests/{id}/approve`

Approve a leave request.

#### Request
```json
{
  "comments": "Approved. Enjoy your vacation!"
}
```

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "message": "Leave request approved"
}
```

**POST** `/leave/requests/{id}/reject`

Reject a leave request.

#### Request
```json
{
  "comments": "Project deadline conflict. Please reschedule."
}
```

---

## 6. Payroll API

### 6.1 Get Payslips

**GET** `/payroll/payslips`

List employee payslips.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | UUID | Employee ID |
| year | int | Year filter |
| month | int | Month filter |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "ps-001",
      "month": 12,
      "year": 2025,
      "grossSalary": 100000,
      "totalDeductions": 15000,
      "netSalary": 85000,
      "status": "GENERATED",
      "paidOn": "2025-12-31"
    }
  ]
}
```

---

### 6.2 Get Payslip Details

**GET** `/payroll/payslips/{id}`

Get detailed payslip breakdown.

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "ps-001",
    "employee": {
      "id": "emp-001",
      "name": "John Doe",
      "employeeId": "EMP001",
      "department": "Engineering",
      "designation": "Software Engineer"
    },
    "period": {
      "month": 12,
      "year": 2025,
      "workingDays": 22,
      "daysWorked": 22,
      "lossOfPayDays": 0
    },
    "earnings": [
      { "component": "Basic Salary", "amount": 50000 },
      { "component": "HRA", "amount": 20000 },
      { "component": "Special Allowance", "amount": 25000 },
      { "component": "Conveyance", "amount": 3000 },
      { "component": "Medical", "amount": 2000 }
    ],
    "deductions": [
      { "component": "Provident Fund", "amount": 6000 },
      { "component": "Professional Tax", "amount": 200 },
      { "component": "TDS", "amount": 8800 }
    ],
    "summary": {
      "grossEarnings": 100000,
      "totalDeductions": 15000,
      "netPay": 85000
    },
    "ytd": {
      "grossEarnings": 1200000,
      "pf": 72000,
      "tds": 105600
    }
  }
}
```

---

### 6.3 Download Payslip PDF

**GET** `/payroll/payslips/{id}/pdf`

Download payslip as PDF.

#### Response
Content-Type: `application/pdf`

---

### 6.4 Process Payroll Run

**POST** `/payroll/runs`

Initiate payroll processing.

#### Request
```json
{
  "month": 1,
  "year": 2026,
  "departmentIds": ["dept-001", "dept-002"],
  "processType": "REGULAR"
}
```

#### Response (202 Accepted)
```json
{
  "status": "SUCCESS",
  "data": {
    "runId": "run-001",
    "status": "PROCESSING",
    "employeeCount": 150
  },
  "message": "Payroll processing initiated"
}
```

---

## 7. Project API

### 7.1 List Projects

**GET** `/projects`

Get list of projects.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| status | enum | ACTIVE, COMPLETED, ON_HOLD |
| managerId | UUID | Filter by project manager |
| clientId | UUID | Filter by client |
| page | int | Page number |
| size | int | Page size |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "content": [
      {
        "id": "proj-001",
        "name": "E-commerce Platform",
        "code": "ECOM",
        "client": {
          "id": "client-001",
          "name": "Acme Corp"
        },
        "manager": {
          "id": "emp-002",
          "name": "Jane Smith"
        },
        "status": "ACTIVE",
        "startDate": "2025-06-01",
        "endDate": "2026-06-01",
        "progress": 45,
        "budget": 500000,
        "spent": 225000,
        "teamSize": 8
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 10
  }
}
```

---

### 7.2 Create Project

**POST** `/projects`

Create new project.

#### Request
```json
{
  "name": "Mobile App Development",
  "code": "MOBILE",
  "description": "Native mobile application for iOS and Android",
  "clientId": "client-001",
  "managerId": "emp-002",
  "startDate": "2026-02-01",
  "endDate": "2026-08-01",
  "budget": 300000,
  "type": "CLIENT",
  "billable": true
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "proj-002",
    "name": "Mobile App Development",
    "code": "MOBILE",
    "status": "ACTIVE"
  },
  "message": "Project created successfully"
}
```

---

### 7.3 Get Project Tasks

**GET** `/projects/{projectId}/tasks`

Get project tasks.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| status | enum | TODO, IN_PROGRESS, REVIEW, DONE |
| assigneeId | UUID | Filter by assignee |
| priority | enum | LOW, MEDIUM, HIGH, CRITICAL |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "task-001",
      "title": "Setup development environment",
      "description": "Configure CI/CD pipeline",
      "status": "DONE",
      "priority": "HIGH",
      "assignee": {
        "id": "emp-001",
        "name": "John Doe"
      },
      "startDate": "2026-02-01",
      "dueDate": "2026-02-05",
      "estimatedHours": 16,
      "loggedHours": 14,
      "subtasks": [
        {
          "id": "subtask-001",
          "title": "Setup Git repository",
          "status": "DONE"
        }
      ]
    }
  ]
}
```

---

### 7.4 Create Task

**POST** `/projects/{projectId}/tasks`

Create project task.

#### Request
```json
{
  "title": "Implement user authentication",
  "description": "OAuth2 and JWT implementation",
  "assigneeId": "emp-001",
  "priority": "HIGH",
  "startDate": "2026-02-10",
  "dueDate": "2026-02-20",
  "estimatedHours": 40,
  "parentTaskId": null
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "task-002",
    "title": "Implement user authentication",
    "status": "TODO"
  }
}
```

---

### 7.5 Log Time

**POST** `/projects/{projectId}/time-logs`

Log time against project task.

#### Request
```json
{
  "taskId": "task-001",
  "date": "2026-01-11",
  "hours": 4,
  "description": "Worked on API integration",
  "billable": true
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "id": "log-001",
    "hours": 4,
    "date": "2026-01-11"
  },
  "message": "Time logged successfully"
}
```

---

## 8. Benefits API

### 8.1 Get Available Plans

**GET** `/benefits/plans`

Get available benefit plans.

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "plan-001",
      "name": "Health Insurance - Individual",
      "type": "HEALTH",
      "coverage": "INDIVIDUAL",
      "monthlyPremium": 500,
      "employerContribution": 400,
      "employeeContribution": 100,
      "description": "Comprehensive health coverage",
      "features": [
        "Hospitalization coverage up to $500,000",
        "Outpatient coverage",
        "Dental included"
      ]
    }
  ]
}
```

---

### 8.2 Enroll in Benefit

**POST** `/benefits/enrollments`

Enroll employee in benefit plan.

#### Request
```json
{
  "planId": "plan-001",
  "startDate": "2026-02-01",
  "dependents": [
    {
      "name": "Jane Doe",
      "relationship": "SPOUSE",
      "dateOfBirth": "1992-03-20"
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "status": "SUCCESS",
  "data": {
    "enrollmentId": "enroll-001",
    "status": "ACTIVE",
    "startDate": "2026-02-01"
  },
  "message": "Enrolled successfully"
}
```

---

## 9. Analytics API

### 9.1 Dashboard Metrics

**GET** `/analytics/dashboard`

Get dashboard metrics based on user role.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| role | enum | EXECUTIVE, MANAGER, EMPLOYEE |

#### Response (200 OK) - Executive
```json
{
  "status": "SUCCESS",
  "data": {
    "headcount": {
      "total": 500,
      "active": 485,
      "onLeave": 10,
      "newHires": 15,
      "exits": 5
    },
    "attendance": {
      "averageRate": 94.5,
      "todayPresent": 460,
      "todayAbsent": 25
    },
    "leave": {
      "pendingApprovals": 12,
      "onLeaveToday": 10
    },
    "recruitment": {
      "openPositions": 8,
      "activeCandidates": 45,
      "offersExtended": 3
    },
    "performance": {
      "avgRating": 3.8,
      "topPerformers": 50,
      "needsImprovement": 15
    }
  }
}
```

---

### 9.2 Workforce Analytics

**GET** `/analytics/workforce`

Get workforce composition analytics.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| groupBy | enum | DEPARTMENT, LOCATION, GENDER, AGE |

#### Response (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "groupBy": "DEPARTMENT",
    "breakdown": [
      { "label": "Engineering", "count": 150, "percentage": 30 },
      { "label": "Sales", "count": 100, "percentage": 20 },
      { "label": "Marketing", "count": 75, "percentage": 15 },
      { "label": "Operations", "count": 100, "percentage": 20 },
      { "label": "HR", "count": 75, "percentage": 15 }
    ],
    "trends": {
      "growth": 5.2,
      "attrition": 2.1
    }
  }
}
```

---

## 10. Common Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 202 | Accepted | Request accepted for processing |
| 204 | No Content | Successful with no response body |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 11. Rate Limiting

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Authentication | 5 requests | 1 minute |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 30 requests | 1 minute |
| Bulk Operations | 5 requests | 1 minute |
| Report Generation | 10 requests | 1 minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704978000
```

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
