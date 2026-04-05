# NU-AURA API Contracts

Complete API contract documentation for the top 10 controllers. All endpoints require JWT
authentication unless noted otherwise. Tenant isolation is enforced via `X-Tenant-ID` header or JWT
claim.

**Base URL:** `/api/v1`

**Common Headers:**

- `Authorization: Bearer <jwt_token>` (except public endpoints)
- `Content-Type: application/json`
- `X-Tenant-ID: <uuid>` (resolved from JWT if not provided)
- `X-XSRF-TOKEN: <csrf_token>` (required for mutating requests when CSRF is enabled)

**Common Pagination Parameters (Spring Pageable):**

- `page` (int, default 0) -- zero-indexed page number
- `size` (int, default 20) -- page size
- `sort` (string) -- e.g., `createdAt,DESC`

**Standard Error Response:**

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation error details",
  "timestamp": "2026-03-19T12:00:00"
}
```

---

## 1. AuthController

**Base Path:** `/api/v1/auth`
**Security:** Public (no RBAC required)

### POST /api/v1/auth/login

Login with email and password. Sets httpOnly cookies for access and refresh tokens.

**Request Body (`LoginRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | Yes | `@NotBlank`, `@Email` |
| `password` | String | Yes | `@NotBlank` |
| `tenantId` | UUID | No | Used for multi-tenant login |

**Response Body (`AuthResponse`):**
| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | String | JWT access token (1hr TTL) |
| `refreshToken` | String | JWT refresh token (24hr TTL) |
| `tokenType` | String | Always `"Bearer"` |
| `expiresIn` | Long | Token expiry in milliseconds |
| `userId` | UUID | Authenticated user ID |
| `employeeId` | UUID | Linked employee ID |
| `tenantId` | UUID | Resolved tenant ID |
| `email` | String | User email |
| `fullName` | String | User display name |
| `profilePictureUrl` | String | Avatar URL |

**Status Codes:** `200 OK`, `401 Unauthorized`

**Cookies Set:**

- `access_token` (httpOnly, Secure, SameSite=Strict, path=/, maxAge=3600)
- `refresh_token` (httpOnly, Secure, SameSite=Strict, path=/api/v1/auth, maxAge=86400)

---

### POST /api/v1/auth/google

Login with Google OAuth token.

**Request Body (`GoogleLoginRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `credential` | String | Yes | `@NotBlank`, `@SkipSanitization` |
| `tenantId` | UUID | No | |
| `isAccessToken` | boolean | No | Default `false`. If true, credential is OAuth access token;
otherwise Google ID token |

**Response:** Same as `/login` (`AuthResponse`).
**Status Codes:** `200 OK`, `401 Unauthorized`

---

### POST /api/v1/auth/mfa-login

Complete MFA second-factor after initial password auth.

**Request Body (`MfaLoginRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `userId` | UUID | Yes | `@NotBlank` |
| `code` | String | Yes | `@NotBlank`. 6-digit TOTP or longer backup code |

**Response:** `AuthResponse` (same as login).
**Status Codes:** `200 OK`, `401 Unauthorized` (invalid code)

---

### POST /api/v1/auth/refresh

Refresh the access token using a refresh token.

**Headers / Cookies:**

- `X-Refresh-Token` header OR `refresh_token` cookie (cookie preferred)

**Response:** `AuthResponse` with new tokens.
**Status Codes:** `200 OK`, `400 Bad Request` (missing token)

---

### POST /api/v1/auth/logout

Revoke tokens and clear authentication cookies.

**Headers / Cookies:**

- `Authorization: Bearer <token>` OR `access_token` cookie
- `refresh_token` cookie

**Response:** `204 No Content` (body is empty with 200 status in implementation)
**Status Codes:** `200 OK`

---

### POST /api/v1/auth/change-password

Change password for the currently authenticated user.

**Request Body (`ChangePasswordRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentPassword` | String | Yes | `@NotBlank` |
| `newPassword` | String | Yes | `@NotBlank`, `@Size(min=8)` |
| `confirmPassword` | String | Yes | `@NotBlank` |

**Response:** `200 OK` (empty body)

---

### POST /api/v1/auth/forgot-password

Request a password reset email.

**Request Body (`ForgotPasswordRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | Yes | `@NotBlank`, `@Email` |

**Response:**
`{ "message": "If an account exists with this email, a password reset link has been sent." }`
**Status Codes:** `200 OK` (always returns 200 to prevent email enumeration)

---

### POST /api/v1/auth/reset-password

Reset password using token from email.

**Request Body (`ResetPasswordRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `token` | String | Yes | `@NotBlank` |
| `newPassword` | String | Yes | `@NotBlank`, `@Size(min=8)` |
| `confirmPassword` | String | Yes | `@NotBlank` |

**Response:** `{ "message": "Password has been reset successfully." }`
**Status Codes:** `200 OK`, `400 Bad Request`

---

## 2. EmployeeController

**Base Path:** `/api/v1/employees`

### POST /api/v1/employees

Create a new employee with user account.

**Permission:** `employee.create`

**Request Body (`CreateEmployeeRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `employeeCode` | String | Yes | `@NotBlank`, `@Size(2-50)`, `@Pattern(^[A-Za-z0-9_-]+$)` |
| `firstName` | String | Yes | `@NotBlank`, `@Size(1-100)` |
| `middleName` | String | No | `@Size(max=100)` |
| `lastName` | String | No | `@Size(max=100)` |
| `workEmail` | String | Yes | `@NotBlank`, `@Email`, `@Size(max=255)` |
| `personalEmail` | String | No | `@Email`, `@Size(max=255)` |
| `phoneNumber` | String | No | `@Pattern(^[+]?[0-9\s-]{7,20}$)` |
| `emergencyContactNumber` | String | No | `@Pattern(^[+]?[0-9\s-]{7,20}$)` |
| `dateOfBirth` | LocalDate | No | `@Past` |
| `gender` | Enum | No | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |
| `address` | String | No | `@Size(max=500)` |
| `city` | String | No | |
| `state` | String | No | |
| `postalCode` | String | No | |
| `country` | String | No | |
| `joiningDate` | LocalDate | Yes | `@NotNull`, `@PastOrPresent` |
| `confirmationDate` | LocalDate | No | `@FutureOrPresent` |
| `departmentId` | UUID | No | |
| `designation` | String | Yes | `@NotBlank` |
| `managerId` | UUID | No | |
| `dottedLineManager1Id` | UUID | No | |
| `dottedLineManager2Id` | UUID | No | |
| `selfManaged` | Boolean | No | |
| `employmentType` | Enum | Yes | `@NotNull`. Values: `FULL_TIME`, `PART_TIME`, `CONTRACT`,
`INTERN`, `CONSULTANT` |
| `bankAccountNumber` | String | No | |
| `bankName` | String | No | |
| `bankIfscCode` | String | No | |
| `taxId` | String | No | |
| `password` | String | Yes | `@NotBlank` |

**Response Body (`EmployeeResponse`):**
| Field | Type |
|-------|------|
| `id` | UUID |
| `employeeCode` | String |
| `firstName` | String |
| `middleName` | String |
| `lastName` | String |
| `fullName` | String |
| `workEmail` | String |
| `personalEmail` | String |
| `phoneNumber` | String |
| `emergencyContactNumber` | String |
| `dateOfBirth` | LocalDate |
| `gender` | Enum |
| `address` | String |
| `city` | String |
| `state` | String |
| `postalCode` | String |
| `country` | String |
| `joiningDate` | LocalDate |
| `confirmationDate` | LocalDate |
| `exitDate` | LocalDate |
| `departmentId` | UUID |
| `departmentName` | String |
| `officeLocationId` | UUID |
| `locationName` | String |
| `designation` | String |
| `level` | Enum |
| `jobRole` | Enum |
| `managerId` | UUID |
| `managerName` | String |
| `dottedLineManager1Id` | UUID |
| `dottedLineManager1Name` | String |
| `dottedLineManager2Id` | UUID |
| `dottedLineManager2Name` | String |
| `teamId` | UUID |
| `employmentType` | Enum |
| `status` | Enum |
| `bankAccountNumber` | String |
| `bankName` | String |
| `bankIfscCode` | String |
| `taxId` | String |
| `createdAt` | LocalDateTime |
| `updatedAt` | LocalDateTime |
| `subordinates` | List&lt;EmployeeResponse&gt; |

**Status Codes:** `201 Created`, `400 Bad Request`, `409 Conflict`

---

### GET /api/v1/employees

Get all employees (paginated).

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team` |
`employee.view_self`

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| `page` | int | 0 |
| `size` | int | 20 |
| `sortBy` | String | `createdAt` |
| `sortDirection` | String | `DESC` |

**Response:** `Page<EmployeeResponse>`

---

### GET /api/v1/employees/search

Search employees by name, email, or employee code.

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team` |
`employee.view_self`

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| `query` | String | Yes |
| `page` | int | No (default 0) |
| `size` | int | No (default 20) |

**Response:** `Page<EmployeeResponse>`

---

### GET /api/v1/employees/me

Get the authenticated user's own employee profile.

**Permission:** `employee.view_self`
**Response:** `EmployeeResponse`
**Status Codes:** `200 OK`, `404 Not Found`

---

### GET /api/v1/employees/{id}

Get employee by UUID.

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team` |
`employee.view_self`
**Response:** `EmployeeResponse`
**Status Codes:** `200 OK`, `404 Not Found`

---

### GET /api/v1/employees/{id}/hierarchy

Get employee with full reporting hierarchy.

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team`
**Response:** `EmployeeResponse` (with populated `subordinates` tree)

---

### GET /api/v1/employees/{id}/subordinates

Get direct reports of an employee.

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team`
**Response:** `List<EmployeeResponse>`

---

### GET /api/v1/employees/managers

Get employees at LEAD level and above (for manager-picker dropdowns).

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team` |
`employee.view_self`
**Response:** `List<EmployeeResponse>`

---

### GET /api/v1/employees/{id}/dotted-reports

Get dotted-line reports of a manager.

**Permission:** `employee.view_all` | `employee.view_department` | `employee.view_team`
**Response:** `List<EmployeeResponse>`

---

### PUT /api/v1/employees/{id}

Update an existing employee (PATCH semantics -- only supplied fields are updated).

**Permission:** `employee.update`

**Request Body (`UpdateEmployeeRequest`):** All fields optional. Same as `CreateEmployeeRequest`
minus `workEmail` and `password`, with `level`, `jobRole`, and `status` added. Validation
constraints enforced on provided values.

**Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`

---

### DELETE /api/v1/employees/{id}

Soft-delete an employee record.

**Permission:** `employee.delete`
**Status Codes:** `204 No Content`, `404 Not Found`

---

## 3. LeaveRequestController

**Base Path:** `/api/v1/leave-requests`

### POST /api/v1/leave-requests

Create a new leave request.

**Permission:** `leave.request`

**Request Body (`LeaveRequestRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `employeeId` | UUID | Yes | `@NotNull` |
| `leaveTypeId` | UUID | Yes | `@NotNull` |
| `startDate` | LocalDate | Yes | `@NotNull`, `@FutureOrPresent` |
| `endDate` | LocalDate | Yes | `@NotNull`, must be >= startDate (`@DateRangeValid`) |
| `totalDays` | BigDecimal | Yes | `@NotNull`, `@DecimalMin(0.5)`, `@DecimalMax(365)` |
| `isHalfDay` | Boolean | No | Default `false` |
| `halfDayPeriod` | String | No | `FIRST_HALF` or `SECOND_HALF` |
| `reason` | String | Yes | `@NotBlank`, `@Size(10-1000)` |
| `documentPath` | String | No | `@Size(max=500)` |

**Response Body (`LeaveRequestResponse`):**
| Field | Type |
|-------|------|
| `id` | UUID |
| `employeeId` | UUID |
| `leaveTypeId` | UUID |
| `requestNumber` | String |
| `startDate` | LocalDate |
| `endDate` | LocalDate |
| `totalDays` | BigDecimal |
| `isHalfDay` | Boolean |
| `halfDayPeriod` | String |
| `reason` | String |
| `status` | String (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) |
| `documentPath` | String |
| `appliedOn` | LocalDateTime |
| `approvedBy` | UUID |
| `approverName` | String |
| `approvedOn` | LocalDateTime |
| `rejectionReason` | String |
| `cancelledOn` | LocalDateTime |
| `cancellationReason` | String |
| `comments` | String |
| `approverId` | UUID |
| `pendingApproverName` | String |

**Status Codes:** `201 Created`, `400 Bad Request`, `409 Conflict`

---

### GET /api/v1/leave-requests/{id}

**Permission:** `leave.view_all` | `leave.view_team` | `leave.view_self`
**Scope Enforcement:** Validates access based on user's scope hierarchy (ALL > LOCATION >
DEPARTMENT > TEAM > SELF > CUSTOM).
**Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

---

### GET /api/v1/leave-requests

Get all leave requests (paginated, scope-filtered).

**Permission:** `leave.view_all` | `leave.view_team`
**Response:** `Page<LeaveRequestResponse>`

---

### GET /api/v1/leave-requests/employee/{employeeId}

Get leave requests for a specific employee.

**Permission:** `leave.view_all` | `leave.view_team` | `leave.view_self`
**Scope Enforcement:** Yes.
**Response:** `Page<LeaveRequestResponse>`

---

### GET /api/v1/leave-requests/status/{status}

Filter leave requests by status.

**Permission:** `leave.view_all` | `leave.view_team`
**Path Variable:** `status` -- `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
**Response:** `Page<LeaveRequestResponse>`

---

### POST /api/v1/leave-requests/{id}/approve

Approve a pending leave request.

**Permission:** `leave.approve`
**Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

---

### POST /api/v1/leave-requests/{id}/reject

Reject a pending leave request.

**Permission:** `leave.reject`
**Query Parameters:** `reason` (String, required, `@NotBlank`, max 1000 chars)
**Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

---

### POST /api/v1/leave-requests/{id}/cancel

Cancel a pending or approved leave request.

**Permission:** `leave.cancel`
**Query Parameters:** `reason` (String, required, `@NotBlank`, max 1000 chars)
**Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

---

### PUT /api/v1/leave-requests/{id}

Update a pending leave request (only owner can update).

**Permission:** `leave.request`
**Request Body:** Same as POST (`LeaveRequestRequest`).
**Status Codes:** `200 OK`, `400`, `403`, `404`, `409`

---

## 4. LeaveBalanceController

**Base Path:** `/api/v1/leave-balances`

### GET /api/v1/leave-balances/employee/{employeeId}

Get all leave balances for an employee.

**Permission:** `leave.view_all` | `leave.view_team` | `leave.view_self`

**Response Body (`List<LeaveBalanceResponse>`):**
| Field | Type |
|-------|------|
| `id` | UUID |
| `employeeId` | UUID |
| `leaveTypeId` | UUID |
| `year` | Integer |
| `openingBalance` | BigDecimal |
| `accrued` | BigDecimal |
| `used` | BigDecimal |
| `pending` | BigDecimal |
| `available` | BigDecimal |
| `carriedForward` | BigDecimal |
| `encashed` | BigDecimal |
| `lapsed` | BigDecimal |
| `lastAccrualDate` | LocalDate |

---

### GET /api/v1/leave-balances/employee/{employeeId}/year/{year}

Get leave balances for an employee for a specific year.

**Permission:** `leave.view_all` | `leave.view_team` | `leave.view_self`
**Response:** `List<LeaveBalanceResponse>`

---

## 5. AttendanceController

**Base Path:** `/api/v1/attendance`

### POST /api/v1/attendance/check-in

Record employee check-in.

**Permission:** `attendance.mark`

**Request Body (`CheckInRequest`):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `employeeId` | UUID | Yes | `@NotNull` |
| `checkInTime` | LocalDateTime | No | Defaults to now |
| `source` | String | No | Default `"WEB"` |
| `location` | String | No | |
| `ip` | String | No | |
| `attendanceDate` | LocalDate | No | Client's local date for timezone handling |
| `latitude` | BigDecimal | No | GPS for geofencing |
| `longitude` | BigDecimal | No | GPS for geofencing |
| `skipGeofenceValidation` | Boolean | No | Default `false` |

**Response Body (`AttendanceResponse`):**
| Field | Type |
|-------|------|
| `id` | UUID |
| `employeeId` | UUID |
| `shiftId` | UUID |
| `attendanceDate` | LocalDate |
| `checkInTime` | LocalDateTime |
| `checkOutTime` | LocalDateTime |
| `checkInSource` | String |
| `checkOutSource` | String |
| `status` | String |
| `workDurationMinutes` | Integer |
| `breakDurationMinutes` | Integer |
| `overtimeMinutes` | Integer |
| `isLate` | Boolean |
| `lateByMinutes` | Integer |
| `isEarlyDeparture` | Boolean |
| `earlyDepartureMinutes` | Integer |
| `regularizationRequested` | Boolean |
| `regularizationApproved` | Boolean |
| `regularizationReason` | String |

**Status Codes:** `201 Created`, `400 Bad Request`, `403 Forbidden`

---

### POST /api/v1/attendance/check-out

Record employee check-out.

**Permission:** `attendance.mark`

**Request Body (`CheckOutRequest`):** Same structure as `CheckInRequest` but with `checkOutTime`
instead of `checkInTime`.

**Status Codes:** `200 OK`, `400`, `403`

---

### GET /api/v1/attendance/my-attendance

Get the authenticated user's attendance records.

**Permission:** `attendance.view_self`

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| `startDate` | LocalDate (ISO) | Yes |
| `endDate` | LocalDate (ISO) | Yes |

**Response:** `List<AttendanceResponse>`

---

### GET /api/v1/attendance/my-time-entries

Get authenticated user's time entries for a specific date.

**Permission:** `attendance.view_self`

**Query Parameters:** `date` (LocalDate, ISO, required)

**Response Body (`List<TimeEntryResponse>`):**
| Field | Type |
|-------|------|
| `id` | UUID |
| `attendanceRecordId` | UUID |
| `entryType` | String |
| `checkInTime` | LocalDateTime |
| `checkOutTime` | LocalDateTime |
| `checkInSource` | String |
| `checkOutSource` | String |
| `durationMinutes` | Integer |
| `sequenceNumber` | Integer |
| `notes` | String |
| `open` | boolean |

---

### POST /api/v1/attendance/multi-check-in / multi-check-out

Break tracking endpoints for multiple check-ins/outs within a day.

**Permission:** `attendance.mark`

---

### POST /api/v1/attendance/bulk-check-in / bulk-check-out

Bulk operations for marking attendance for multiple employees.

**Permission:** `attendance.view_all`
**Response:** `BulkAttendanceResponse` with `successCount`, `failureCount`, `successful[]`,
`failed[]`

---

### GET /api/v1/attendance/employee/{employeeId}

Get employee attendance (paginated, scope-enforced).

**Permission:** `attendance.view_all` | `attendance.view_team`

---

### GET /api/v1/attendance/employee/{employeeId}/range

Get attendance for date range.

**Permission:** `attendance.view_all` | `attendance.view_team`
**Query Parameters:** `startDate`, `endDate` (LocalDate, ISO)

---

### POST /api/v1/attendance/{id}/request-regularization

Request attendance regularization.

**Permission:** `attendance.regularize`
**Query Parameters:** `reason` (String, required, `@NotBlank`, max 1000)
**Status Codes:** `200 OK`, `404`, `409`

---

### POST /api/v1/attendance/{id}/approve-regularization

**Permission:** `attendance.approve`

### POST /api/v1/attendance/{id}/reject-regularization

**Permission:** `attendance.approve`
**Query Parameters:** `reason` (String, optional, max 1000)

---

### GET /api/v1/attendance/all

Get all attendance (scope-filtered, paginated).

**Permission:** `attendance.view_all` | `attendance.view_team`

---

### POST /api/v1/attendance/import

Bulk import attendance from Excel file.

**Permission:** `attendance.approve`
**Content-Type:** `multipart/form-data`
**Request:** `file` (MultipartFile, `.xlsx` or `.xls`)

**Response Body (`BulkAttendanceImportResponse`):**
| Field | Type |
|-------|------|
| `totalRecords` | int |
| `successCount` | int |
| `failureCount` | int |
| `errors[]` | `{ rowNumber, errorMessage }` |

---

## 6. PayrollController

**Base Path:** `/api/v1/payroll`

### Payroll Run Endpoints

| Method | Path                        | Permission         | Description                                                      |
|--------|-----------------------------|--------------------|------------------------------------------------------------------|
| POST   | `/runs`                     | `payroll.process`  | Create payroll run (REPEATABLE_READ isolation, pessimistic lock) |
| PUT    | `/runs/{id}`                | `payroll.process`  | Update payroll run (blocked if LOCKED)                           |
| GET    | `/runs/{id}`                | `payroll.view_all` | Get payroll run by ID                                            |
| GET    | `/runs`                     | `payroll.view_all` | Get all payroll runs (paginated)                                 |
| GET    | `/runs/period?year=&month=` | `payroll.view_all` | Get by period                                                    |
| GET    | `/runs/year/{year}`         | `payroll.view_all` | Get all runs for a year                                          |
| GET    | `/runs/status/{status}`     | `payroll.view_all` | Filter by status (paginated)                                     |
| POST   | `/runs/{id}/process`        | `payroll.process`  | Transition DRAFT -> PROCESSED                                    |
| POST   | `/runs/{id}/approve`        | `payroll.approve`  | Transition PROCESSED -> APPROVED                                 |
| POST   | `/runs/{id}/lock`           | `payroll.approve`  | Transition APPROVED -> LOCKED                                    |
| DELETE | `/runs/{id}`                | `payroll.process`  | Delete run (blocked if LOCKED)                                   |

**PayrollRun Status State Machine:** `DRAFT -> PROCESSED -> APPROVED -> LOCKED`

---

### Payslip Endpoints

| Method | Path                                              | Permission         | Description                  |
|--------|---------------------------------------------------|--------------------|------------------------------|
| POST   | `/payslips`                                       | `payroll.process`  | Create payslip               |
| PUT    | `/payslips/{id}`                                  | `payroll.process`  | Update payslip               |
| GET    | `/payslips/{id}`                                  | `payroll.view_all` | Get payslip by ID            |
| GET    | `/payslips`                                       | `payroll.view_all` | Get all payslips (paginated) |
| GET    | `/payslips/employee/{employeeId}`                 | `payroll.view_all` | `payroll.view_self`          | Employee payslips (paginated) |
| GET    | `/payslips/employee/{id}/period?year=&month=`     | `payroll.view_all` | `payroll.view_self`          | Single payslip by period |
| GET    | `/payslips/employee/{id}/year/{year}`             | `payroll.view_all` | `payroll.view_self`          | All payslips for year |
| GET    | `/payslips/run/{payrollRunId}`                    | `payroll.view_all` | Payslips for a run           |
| GET    | `/payslips/{id}/pdf`                              | `payroll.view_all` | `payroll.view_self`          | Download payslip PDF |
| GET    | `/payslips/employee/{id}/period/pdf?year=&month=` | `payroll.view_all` | `payroll.view_self`          | Download PDF by period |
| DELETE | `/payslips/{id}`                                  | `payroll.process`  | Delete payslip               |

---

### Salary Structure Endpoints

| Method | Path                                            | Permission         | Description                       |
|--------|-------------------------------------------------|--------------------|-----------------------------------|
| POST   | `/salary-structures`                            | `payroll.process`  | Create salary structure           |
| PUT    | `/salary-structures/{id}`                       | `payroll.process`  | Update salary structure           |
| GET    | `/salary-structures/{id}`                       | `payroll.view_all` | Get by ID                         |
| GET    | `/salary-structures`                            | `payroll.view_all` | Get all (paginated)               |
| GET    | `/salary-structures/employee/{id}`              | `payroll.view_all` | `payroll.view_self`               | Employee structures |
| GET    | `/salary-structures/employee/{id}/active?date=` | `payroll.view_all` | `payroll.view_self`               | Active structure |
| GET    | `/salary-structures/active`                     | `payroll.view_all` | All active structures (paginated) |
| POST   | `/salary-structures/{id}/deactivate`            | `payroll.process`  | Deactivate structure              |
| DELETE | `/salary-structures/{id}`                       | `payroll.process`  | Delete structure                  |

---

## 7. RecruitmentController

**Base Path:** `/api/v1/recruitment`

### Job Openings

| Method | Path                            | Permission           | Description         |
|--------|---------------------------------|----------------------|---------------------|
| POST   | `/job-openings`                 | `recruitment.create` | Create job opening  |
| PUT    | `/job-openings/{id}`            | `recruitment.update` | Update job opening  |
| GET    | `/job-openings/{id}`            | `recruitment.view`   | Get by ID           |
| GET    | `/job-openings`                 | `recruitment.view`   | Get all (paginated) |
| GET    | `/job-openings/status/{status}` | `recruitment.view`   | Filter by status    |
| DELETE | `/job-openings/{id}`            | `recruitment.delete` | Delete              |

**Request Body (`JobOpeningRequest`):**
| Field | Type | Required |
|-------|------|----------|
| `jobCode` | String | No |
| `jobTitle` | String | No |
| `departmentId` | UUID | No |
| `location` | String | No |
| `employmentType` | Enum | No -- `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN` |
| `experienceRequired` | String | No |
| `minSalary` | BigDecimal | No |
| `maxSalary` | BigDecimal | No |
| `numberOfOpenings` | Integer | No |
| `jobDescription` | String | No |
| `requirements` | String | No |
| `skillsRequired` | String | No |
| `hiringManagerId` | UUID | No |
| `status` | Enum | No -- `DRAFT`, `OPEN`, `ON_HOLD`, `CLOSED`, `CANCELLED` |
| `postedDate` | LocalDate | No |
| `closingDate` | LocalDate | No |
| `priority` | Enum | No -- `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `isActive` | Boolean | No |

**Response Body (`JobOpeningResponse`):**
All request fields plus: `id`, `tenantId`, `departmentName`, `hiringManagerName`, `candidateCount`,
`createdAt`, `updatedAt`, `createdBy`, `lastModifiedBy`, `version`.

---

### Candidates

| Method | Path                                     | Permission           | Description                  |
|--------|------------------------------------------|----------------------|------------------------------|
| POST   | `/candidates`                            | `recruitment.create` | Create candidate             |
| PUT    | `/candidates/{id}`                       | `recruitment.update` | Update candidate             |
| GET    | `/candidates/{id}`                       | `candidate.view`     | Get by ID                    |
| GET    | `/candidates`                            | `candidate.view`     | Get all (paginated)          |
| GET    | `/candidates/job-opening/{jobOpeningId}` | `candidate.view`     | Candidates for a job opening |
| PUT    | `/candidates/{id}/stage`                 | `recruitment.update` | Move candidate to stage      |
| POST   | `/candidates/{id}/offer`                 | `recruitment.update` | Create offer                 |
| POST   | `/candidates/{id}/accept-offer`          | `recruitment.update` | Accept offer                 |
| POST   | `/candidates/{id}/decline-offer`         | `recruitment.update` | Decline offer                |
| DELETE | `/candidates/{id}`                       | `recruitment.delete` | Delete                       |

**MoveStageRequest:**
`{ "stage": "SCREENING|PHONE_SCREEN|INTERVIEW|TECHNICAL|OFFER|HIRED|REJECTED", "notes": "..." }`

**CreateOfferRequest:**
| Field | Type |
|-------|------|
| `offeredSalary` | BigDecimal |
| `positionTitle` | String |
| `joiningDate` | LocalDate |
| `offerExpiryDate` | LocalDate |
| `notes` | String |

---

### Interviews

| Method | Path                                  | Permission           | Description              |
|--------|---------------------------------------|----------------------|--------------------------|
| GET    | `/interviews`                         | `recruitment.view`   | Get all (paginated)      |
| POST   | `/interviews`                         | `recruitment.create` | Schedule interview       |
| PUT    | `/interviews/{id}`                    | `recruitment.update` | Update interview         |
| GET    | `/interviews/{id}`                    | `recruitment.view`   | Get by ID                |
| GET    | `/interviews/candidate/{candidateId}` | `recruitment.view`   | Interviews for candidate |
| DELETE | `/interviews/{id}`                    | `recruitment.delete` | Delete                   |

**InterviewRequest:**
| Field | Type |
|-------|------|
| `candidateId` | UUID |
| `jobOpeningId` | UUID |
| `interviewRound` | Enum (`ROUND_1`, `ROUND_2`, etc.) |
| `interviewType` | Enum (`IN_PERSON`, `VIDEO`, `PHONE`, `PANEL`) |
| `scheduledAt` | LocalDateTime |
| `durationMinutes` | Integer |
| `interviewerId` | UUID |
| `location` | String |
| `meetingLink` | String |
| `status` | Enum |
| `feedback` | String |
| `rating` | Integer |
| `result` | Enum |
| `notes` | String |
| `createGoogleMeet` | boolean |
| `googleAccessToken` | String |

---

## 8. PerformanceReviewController + PerformanceRevolutionController

### PerformanceReviewController

**Base Path:** `/api/v1/reviews`

| Method | Path                           | Permission       | Description                      |
|--------|--------------------------------|------------------|----------------------------------|
| POST   | `/`                            | `review.create`  | Create review                    |
| GET    | `/`                            | `review.view`    | Get all (paginated)              |
| GET    | `/{id}`                        | `review.view`    | Get by ID                        |
| GET    | `/employee/{employeeId}`       | `review.view`    | Get employee reviews             |
| GET    | `/employee/{employeeId}/paged` | `review.view`    | Get employee reviews (paginated) |
| GET    | `/pending/{reviewerId}`        | `review.view`    | Get pending reviews for reviewer |
| GET    | `/pending/{reviewerId}/paged`  | `review.view`    | Pending reviews (paginated)      |
| PUT    | `/{id}`                        | `review.create`  | Update review                    |
| PUT    | `/{id}/submit`                 | `review.submit`  | Submit review                    |
| PUT    | `/{id}/complete`               | `review.approve` | Complete/approve review          |
| POST   | `/competencies`                | `review.create`  | Add competency to review         |
| GET    | `/{reviewId}/competencies`     | `review.view`    | Get competencies for review      |

### PerformanceRevolutionController

**Base Path:** `/api/v1/performance/revolution`

| Method | Path                   | Permission    | Description                       |
|--------|------------------------|---------------|-----------------------------------|
| GET    | `/okr-graph`           | `okr.view`    | Get organization-wide OKR graph   |
| GET    | `/spider/{employeeId}` | `review.view` | Get performance spider chart data |

**OKRGraphResponse / PerformanceSpiderResponse:** Returns graph/chart data structures for
visualization.

---

## 9. UserController + RoleController

### UserController

**Base Path:** `/api/v1/users`

| Method | Path          | Permission    | Description          |
|--------|---------------|---------------|----------------------|
| GET    | `/`           | `user.view`   | Get all users        |
| PUT    | `/{id}/roles` | `user.manage` | Assign roles to user |

**AssignRolesRequest:** `{ "roleCodes": ["HR_ADMIN", "EMPLOYEE"] }` (`@NotEmpty`)

**UserResponse:**
| Field | Type |
|-------|------|
| `id` | UUID |
| `email` | String |
| `firstName` | String |
| `lastName` | String |
| `userStatus` | String |
| `roles` | Set&lt;RoleResponse&gt; |
| `lastLoginAt` | LocalDateTime |
| `createdAt` | LocalDateTime |

---

### RoleController

**Base Path:** `/api/v1/roles`

All endpoints require `role.manage` permission.

| Method | Path                                       | Description                                      |
|--------|--------------------------------------------|--------------------------------------------------|
| GET    | `/`                                        | Get all roles                                    |
| GET    | `/{id}`                                    | Get role by ID                                   |
| POST   | `/`                                        | Create role                                      |
| PUT    | `/{id}`                                    | Update role                                      |
| DELETE | `/{id}`                                    | Delete role                                      |
| PUT    | `/{id}/permissions`                        | Replace all permissions                          |
| POST   | `/{id}/permissions`                        | Add permissions                                  |
| DELETE | `/{id}/permissions`                        | Remove permissions                               |
| PUT    | `/{id}/permissions-with-scope`             | Assign permissions with scopes (Keka-style RBAC) |
| PATCH  | `/{id}/permissions/{permissionCode}/scope` | Update scope for a single permission             |

**CreateRoleRequest:**
| Field | Type | Required |
|-------|------|----------|
| `code` | String | Yes -- `@NotBlank`, `@Size(max=50)` |
| `name` | String | Yes -- `@NotBlank`, `@Size(max=100)` |
| `description` | String | No -- `@Size(max=500)` |
| `permissionCodes` | Set&lt;String&gt; | No |

**RoleResponse:**
| Field | Type |
|-------|------|
| `id` | UUID |
| `code` | String |
| `name` | String |
| `description` | String |
| `isSystemRole` | Boolean |
| `tenantId` | UUID |
| `permissions` | Set&lt;PermissionResponse&gt; |
| `createdAt` | LocalDateTime |
| `updatedAt` | LocalDateTime |

**PermissionResponse:**
| Field | Type |
|-------|------|
| `id` | UUID |
| `code` | String |
| `name` | String |
| `description` | String |
| `resource` | String |
| `action` | String |
| `scope` | Enum -- `ALL`, `LOCATION`, `DEPARTMENT`, `TEAM`, `SELF`, `CUSTOM` |
| `customTargets` | Set&lt;CustomTargetResponse&gt; -- only for CUSTOM scope |

**AssignPermissionsWithScopeRequest:**

```json
{
  "permissions": [
    {
      "permissionCode": "leave.view_all",
      "scope": "DEPARTMENT",
      "customTargets": null
    },
    {
      "permissionCode": "attendance.view_all",
      "scope": "CUSTOM",
      "customTargets": [
        { "targetType": "DEPARTMENT", "targetId": "uuid" },
        { "targetType": "EMPLOYEE", "targetId": "uuid" }
      ]
    }
  ],
  "replaceAll": false
}
```

**UpdatePermissionScopeRequest:**
| Field | Type | Required |
|-------|------|----------|
| `scope` | Enum | Yes -- `ALL`, `LOCATION`, `DEPARTMENT`, `TEAM`, `SELF`, `CUSTOM` |
| `customTargets` | Set&lt;CustomTargetRequest&gt; | Required when scope is CUSTOM |

---

## 10. FeatureFlagController

**Base Path:** `/api/v1/feature-flags`

| Method | Path                   | Permission      | Description                                                      |
|--------|------------------------|-----------------|------------------------------------------------------------------|
| GET    | `/`                    | (authenticated) | Get all feature flags for current tenant                         |
| GET    | `/map`                 | (authenticated) | Get flags as `Map<String, Boolean>`                              |
| GET    | `/enabled`             | (authenticated) | Get list of enabled feature key strings                          |
| GET    | `/check/{featureKey}`  | (authenticated) | Check single feature: `{ "featureKey": "...", "enabled": true }` |
| GET    | `/category/{category}` | (authenticated) | Get flags by category                                            |
| POST   | `/`                    | `system.admin`  | Create/update flag                                               |
| POST   | `/{featureKey}/toggle` | `system.admin`  | Toggle flag on/off                                               |

**FeatureFlagRequest (record):**
| Field | Type | Required |
|-------|------|----------|
| `featureKey` | String | Yes -- `@NotBlank` |
| `enabled` | boolean | No |
| `name` | String | No |
| `description` | String | No |
| `category` | String | No |

---

## 11. WallController

**Base Path:** `/api/v1/wall`

### Posts

| Method | Path                              | Permission  | Description                              |
|--------|-----------------------------------|-------------|------------------------------------------|
| POST   | `/posts`                          | `wall.post` | Create post/poll/praise                  |
| GET    | `/posts`                          | `wall.view` | Get all posts (paginated, max size 50)   |
| GET    | `/posts/type/{type}`              | `wall.view` | Filter by type: `POST`, `POLL`, `PRAISE` |
| GET    | `/posts/{postId}`                 | `wall.view` | Get post by ID                           |
| PUT    | `/posts/{postId}`                 | `wall.post` | `wall.manage`                            | Update post |
| DELETE | `/posts/{postId}`                 | `wall.post` | `wall.manage`                            | Delete post |
| PATCH  | `/posts/{postId}/pin?pinned=true` | `wall.pin`  | Pin/unpin post                           |

**CreatePostRequest:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | Enum | Yes | `POST`, `POLL`, `PRAISE` |
| `content` | String | Yes | `@NotBlank`, `@Size(max=5000)` |
| `praiseRecipientId` | UUID | No | Required for PRAISE type |
| `imageUrl` | String | No | |
| `visibility` | Enum | No | Default `ORGANIZATION` |
| `celebrationType` | String | No | Badge type for praise |
| `pollOptions` | List&lt;String&gt; | No | `@Size(2-10)`. Required for POLL type |

**WallPostResponse:**
| Field | Type |
|-------|------|
| `id` | UUID |
| `type` | Enum |
| `content` | String |
| `author` | AuthorInfo `{ id, employeeId, fullName, designation, department, avatarUrl }` |
| `praiseRecipient` | AuthorInfo |
| `imageUrl` | String |
| `pinned` | boolean |
| `visibility` | Enum |
| `pollOptions` | List&lt;PollOptionResponse&gt; `{ id, text, voteCount, votePercentage }` |
| `likeCount` | int |
| `commentCount` | int |
| `reactionCounts` | Map&lt;String, Integer&gt; |
| `hasReacted` | boolean |
| `userReactionType` | String |
| `hasVoted` | boolean |
| `userVotedOptionId` | UUID |
| `celebrationType` | String |
| `recentReactors` | List&lt;ReactorInfo&gt; |
| `totalReactorCount` | int |
| `createdAt` | LocalDateTime |
| `updatedAt` | LocalDateTime |

### Reactions

| Method | Path                                | Permission   |
|--------|-------------------------------------|--------------|
| POST   | `/posts/{postId}/reactions`         | `wall.react` |
| GET    | `/posts/{postId}/reactions/details` | `wall.view`  |
| DELETE | `/posts/{postId}/reactions`         | `wall.react` |

**ReactionRequest:** `{ "reactionType": "LIKE|LOVE|CELEBRATE|INSIGHTFUL|CURIOUS" }`

### Comments

| Method | Path                            | Permission     |
|--------|---------------------------------|----------------|
| POST   | `/posts/{postId}/comments`      | `wall.comment` |
| GET    | `/posts/{postId}/comments`      | `wall.view`    |
| GET    | `/comments/{commentId}/replies` | `wall.view`    |
| DELETE | `/comments/{commentId}`         | `wall.comment` |

**CreateCommentRequest:** `{ "content": "...", "parentCommentId": null }` (parentCommentId for
replies)

**CommentResponse:**
| Field | Type |
|-------|------|
| `id` | UUID |
| `postId` | UUID |
| `author` | AuthorInfo |
| `content` | String |
| `parentCommentId` | UUID |
| `replies` | List&lt;CommentResponse&gt; |
| `replyCount` | int |
| `likesCount` | int |
| `createdAt` | LocalDateTime |
| `updatedAt` | LocalDateTime |

### Polls

| Method | Path                   | Permission   |
|--------|------------------------|--------------|
| POST   | `/posts/{postId}/vote` | `wall.react` |
| DELETE | `/posts/{postId}/vote` | `wall.react` |

**VoteRequest:** `{ "optionId": "<uuid>" }`

### Praise

| Method | Path                            | Permission  |
|--------|---------------------------------|-------------|
| GET    | `/praise/employee/{employeeId}` | `wall.view` |
