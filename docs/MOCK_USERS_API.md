# Mock Users & API Documentation

This document provides comprehensive documentation for testing the HRMS application using the pre-seeded mock data.

## Table of Contents
- [Mock User Credentials](#mock-user-credentials)
- [API Endpoints](#api-endpoints)
- [Testing Scenarios](#testing-scenarios)
- [Sample API Requests](#sample-api-requests)

---

## Mock User Credentials

### Admin User
| Field | Value |
|-------|-------|
| Email | admin@nulogic.io |
| Password | password |
| Role | Super Admin |

### HR Manager
| Field | Value |
|-------|-------|
| Email | priya.sharma@nulogic.io |
| Password | password |
| Role | HR Manager |
| Name | Priya Sharma |

### HR Staff (4 Users)
| Name | Email | Password |
|------|-------|----------|
| Neha Gupta | neha.gupta@nulogic.io | password |
| Amit Kumar | amit.kumar@nulogic.io | password |
| Sneha Reddy | sneha.reddy@nulogic.io | password |
| Rahul Verma | rahul.verma@nulogic.io | password |

### Project Managers (3 Users)
| Name | Email | Password | Project |
|------|-------|----------|---------|
| Rajesh Kumar | rajesh.kumar@nulogic.io | password | NuAura HRMS |
| Sunita Patel | sunita.patel@nulogic.io | password | E-Commerce Platform |
| Vikram Singh | vikram.singh@nulogic.io | password | Mobile Banking App |

### Developers (10 Users)
| Name | Email | Password |
|------|-------|----------|
| Ankit Sharma | ankit.sharma@nulogic.io | password |
| Meera Nair | meera.nair@nulogic.io | password |
| Sanjay Gupta | sanjay.gupta@nulogic.io | password |
| Kavitha Menon | kavitha.menon@nulogic.io | password |
| Arun Krishnan | arun.krishnan@nulogic.io | password |
| Divya Iyer | divya.iyer@nulogic.io | password |
| Karthik Rajan | karthik.rajan@nulogic.io | password |
| Pooja Hegde | pooja.hegde@nulogic.io | password |
| Manoj Pillai | manoj.pillai@nulogic.io | password |
| Lakshmi Nambiar | lakshmi.nambiar@nulogic.io | password |

---

## Mock Projects

| Project Code | Project Name | Manager | Status |
|--------------|--------------|---------|--------|
| HRMS-001 | NuAura HRMS | Rajesh Kumar | IN_PROGRESS |
| ECOM-001 | E-Commerce Platform | Sunita Patel | IN_PROGRESS |
| BANK-001 | Mobile Banking App | Vikram Singh | IN_PROGRESS |
| CRM-001 | CRM System | Rajesh Kumar | PLANNING |
| AI-001 | AI Analytics Dashboard | Sunita Patel | PLANNING |

---

## API Endpoints

### Authentication

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@nulogic.io",
  "password": "password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "admin@nulogic.io",
  "fullName": "Admin User"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
X-Refresh-Token: {refreshToken}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

---

### Employees

#### Get All Employees
```http
GET /api/v1/employees?page=0&size=20
Authorization: Bearer {accessToken}
```

#### Get Employee by ID
```http
GET /api/v1/employees/{employeeId}
Authorization: Bearer {accessToken}
```

#### Create Employee
```http
POST /api/v1/employees
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "employeeCode": "EMP999",
  "firstName": "New",
  "lastName": "Employee",
  "workEmail": "new.employee@nulogic.io",
  "designation": "Software Engineer",
  "departmentId": "uuid",
  "joiningDate": "2025-01-15"
}
```

---

### Attendance

#### Check In
```http
POST /api/v1/attendance/check-in
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "employeeId": "uuid",
  "source": "WEB",
  "location": "Office - Bangalore"
}
```

#### Check Out
```http
POST /api/v1/attendance/check-out
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "employeeId": "uuid",
  "source": "WEB"
}
```

#### Get My Attendance
```http
GET /api/v1/attendance/my-attendance?employeeId={uuid}&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {accessToken}
```

---

### Leave Management

#### Get Leave Types
```http
GET /api/v1/leave-types
Authorization: Bearer {accessToken}
```

#### Get Leave Balance
```http
GET /api/v1/leave-balances/employee/{employeeId}
Authorization: Bearer {accessToken}
```

#### Apply for Leave
```http
POST /api/v1/leave-requests
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "employeeId": "uuid",
  "leaveTypeId": "uuid",
  "startDate": "2025-02-10",
  "endDate": "2025-02-12",
  "reason": "Family vacation",
  "halfDay": false
}
```

#### Approve/Reject Leave
```http
POST /api/v1/leave-requests/{requestId}/approve
Authorization: Bearer {accessToken}

POST /api/v1/leave-requests/{requestId}/reject
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "reason": "Team capacity constraints"
}
```

---

### Dashboard Analytics

#### Get Dashboard Data (Role-based)
```http
GET /api/v1/dashboards/analytics
Authorization: Bearer {accessToken}
```

Returns different data based on user role:
- **Admin**: Organization-wide analytics
- **Manager**: Team-specific analytics
- **Employee**: Personal dashboard

---

### Payroll

#### Get Salary Structure
```http
GET /api/v1/payroll/salary-structures/employee/{employeeId}
Authorization: Bearer {accessToken}
```

#### Get Payslips
```http
GET /api/v1/payroll/payslips/employee/{employeeId}?year=2025
Authorization: Bearer {accessToken}
```

---

## Testing Scenarios

### 1. Admin User Flow
1. Login as admin@nulogic.io
2. View organization dashboard
3. Access all employees
4. Approve/Reject leave requests
5. Run payroll

### 2. Manager User Flow
1. Login as rajesh.kumar@nulogic.io
2. View team dashboard
3. See team members' attendance
4. Approve team leave requests
5. View team performance

### 3. Employee User Flow
1. Login as ankit.sharma@nulogic.io
2. View personal dashboard
3. Mark attendance (check-in/out)
4. Apply for leave
5. View payslips

### 4. HR Manager Flow
1. Login as priya.sharma@nulogic.io
2. Manage employee records
3. Process onboarding
4. Handle exit management
5. Generate HR reports

---

## Sample cURL Commands

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nulogic.io","password":"password"}'
```

### Get All Employees (with token)
```bash
curl -X GET "http://localhost:8080/api/v1/employees?page=0&size=10" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"
```

### Check In
```bash
curl -X POST http://localhost:8080/api/v1/attendance/check-in \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"{EMPLOYEE_UUID}","source":"WEB"}'
```

### Apply Leave
```bash
curl -X POST http://localhost:8080/api/v1/leave-requests \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "{EMPLOYEE_UUID}",
    "leaveTypeId": "{LEAVE_TYPE_UUID}",
    "startDate": "2025-02-15",
    "endDate": "2025-02-17",
    "reason": "Personal work"
  }'
```

---

## Quick Start Testing Guide

### Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:3000`
- Database seeded with mock data

### Step-by-Step

1. **Start Backend**
   ```bash
   cd hrms-backend
   ./gradlew bootRun
   ```

2. **Start Frontend**
   ```bash
   cd hrms-frontend
   npm run dev
   ```

3. **Access Application**
   - Open `http://localhost:3000`
   - Login with any credentials from above

4. **Run E2E Tests**
   ```bash
   cd hrms-frontend
   npm run test:e2e
   ```

---

## Environment Variables

For testing, set these environment variables:

```env
# Backend
SPRING_PROFILES_ACTIVE=dev
JWT_SECRET=your-256-bit-secret-key-for-testing-purposes

# Frontend
VITE_API_BASE_URL=http://localhost:8080
```

---

## Notes

1. All passwords are set to `password` for testing convenience
2. Leave balances are pre-seeded for all employees
3. Attendance records exist for the past 30 days
4. The mock data resets when the database is reinitialized
