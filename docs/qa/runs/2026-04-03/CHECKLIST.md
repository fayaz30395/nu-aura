# NU-AURA QA & Deployment Checklist — 2026-04-03

> **Last updated:** 2026-04-03 | **Source:** QA Run #3 + JUnit Generation Pass
> Legend: ✅ Done · ⏳ In Progress · ❌ Failing · ⚠️ Needs Fix · 🔵 Skipped · 📋 Pending

---

## Overall Status

| Category          | Total   | Done                   | Pending | Failing                            |
|-------------------|---------|------------------------|---------|------------------------------------|
| Use Cases (JUnit) | 318     | **264**                | 54      | 0                                  |
| Bugs Found        | 43      | **38 fixed**           | —       | 5 open                             |
| P0 Bugs           | 2       | ✅ 2 fixed              | —       | 0                                  |
| P1 Bugs           | 8       | 8 fixed (all P1s done) | —       | 0                                  |
| P2 Bugs           | 33      | 30 fixed               | —       | 3 open (QA2-003, QA2-005, QA2-011) |
| Backend Compile   | —       | ✅ Clean                | —       | —                                  |
| Frontend Build    | —       | ✅ Clean                | —       | —                                  |
| Flyway Migrations | V0–V112 | ✅ Applied              | —       | —                                  |

---

## Bug Tracker

### 🔴 P0 — Release Blockers

| Bug         | Description                               | Status                                            |
|-------------|-------------------------------------------|---------------------------------------------------|
| BUG-004     | RBAC failure — V96 wiped role_permissions | ✅ FIXED — V107 repopulates all roles              |
| BUG-QA3-001 | Permission prefix mismatch (HRMS: prefix) | ✅ FIXED — normalizePermissionCode() strips prefix |

### 🟠 P1 — Major Functional Issues

| Bug         | Endpoint                           | Description                          | Status                                                                              |
|-------------|------------------------------------|--------------------------------------|-------------------------------------------------------------------------------------|
| BUG-001     | POST /auth/mfa/verify              | Missing `verified` field in response | ✅ FIXED                                                                             |
| BUG-002     | POST /auth/refresh                 | JWT refresh always 401               | ✅ FIXED — validateRefreshToken()                                                    |
| BUG-005     | POST /loans                        | Loan creation 500                    | ✅ FIXED — null guard employeeId                                                     |
| BUG-006     | POST /travel/requests              | Travel creation 500                  | ✅ FIXED — null guard employeeId                                                     |
| BUG-QA3-002 | POST /auth/login                   | Account lockout not enforced         | ✅ FIXED — AccountLockoutService wired                                               |
| BUG-QA2-009 | PUT /employees/{id}/deactivate     | Deactivation 500 NPE                 | ✅ FIXED — gate userRepository.save() behind firstName/lastName check (LazyInit fix) |
| BUG-QA2-010 | POST /assets                       | Asset creation 500                   | ✅ FIXED — V112 adds `version` column                                                |
| BUG-QA2-012 | POST /self-service/profile-updates | Profile update 500                   | ✅ FIXED — null guard on getCurrentEmployeeId()                                      |
| BUG-QA2-003 | POST /letters/generate             | Letter saved then 404 on GET         | ⚠️ OPEN                                                                             |

### 🟡 P2 — Significant Issues

| Bug         | Description                                                | Status                                                                                                                                                  |
|-------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| BUG-007     | Backend OOM — heap 92-96% of Xmx400m                       | ✅ FIXED — Xmx1024m, ZGC                                                                                                                                 |
| BUG-014     | Announcement creation 500                                  | ✅ FIXED — V109 wall_post_id                                                                                                                             |
| BUG-QA3-003 | /employees/me has @RequiresPermission (MY SPACE violation) | ✅ FIXED — removed annotation                                                                                                                            |
| BUG-QA3-004 | No NEW_JOINER seed user                                    | ✅ FIXED — V110 newjoiner@nulogic.io                                                                                                                     |
| BUG-QA3-006 | EMPLOYEE cannot submit referrals                           | ✅ FIXED — V110 adds REFERRAL perms                                                                                                                      |
| BUG-QA3-007 | Interview scheduling 500                                   | ✅ FIXED — null guards in InterviewService                                                                                                               |
| BUG-QA3-008 | Job requisition creation 400                               | ✅ FIXED — auto-generate job code                                                                                                                        |
| BUG-QA3-009 | Referral creation 500 for SUPER_ADMIN                      | ✅ FIXED — null guards + validation                                                                                                                      |
| BUG-QA4-001 | Review cycle activate 500                                  | ✅ FIXED — V108 start_date/end_date columns                                                                                                              |
| BUG-QA4-002 | Self-review 403 for all non-admin                          | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA4-003 | 360 feedback 400 DB violation                              | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA4-004 | OKR creation 400 DB violation                              | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA4-005 | Survey creation 400 DB violation                           | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA4-006 | Dashboard 403 for non-admin                                | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA4-008 | 1-on-1 meeting creation 400                                | ✅ FIXED (via BUG-004 V107)                                                                                                                              |
| BUG-QA2-002 | Contract creation null `terms` 500                         | ✅ FIXED — null guard in createVersion()                                                                                                                 |
| BUG-QA3-005 | Document upload 404 (path mismatch)                        | ✅ FIXED — new EmployeeDocumentController delegates to FileStorageService                                                                                |
| BUG-QA2-001 | Leave field aliases (`name`, `maxDaysPerYear`)             | ✅ FIXED — @JsonAlias added; totalDays now optional (computed from dates)                                                                                |
| BUG-QA2-004 | Probation `durationMonths` required but undocumented       | ✅ FIXED — defaults to 3 months when omitted                                                                                                             |
| BUG-003     | Salary structure per-employee vs templates (design gap)    | ⚠️ OPEN — architectural                                                                                                                                 |
| BUG-008     | Report endpoint GET vs POST mismatch                       | ✅ RESOLVED — frontend report.service.ts uses POST; backend @PostMapping matches                                                                         |
| BUG-009     | Feature flag path /admin prefix mismatch                   | ✅ RESOLVED — frontend calls /feature-flags; backend serves at /api/v1/feature-flags (match)                                                             |
| BUG-010     | FnF endpoint path/field mismatch                           | ✅ RESOLVED — frontend fnf.service.ts BASE=/exit matches FnFController paths                                                                             |
| BUG-011     | Leave request endpoint path mismatch                       | ✅ RESOLVED — frontend calls /leave-requests; backend at /api/v1/leave-requests (match)                                                                  |
| BUG-012     | Refresh token cookie path too restrictive                  | ✅ RESOLVED — cookie path /api/v1/auth covers all sub-paths including /api/v1/auth/refresh (HTTP cookie path prefix semantics)                           |
| BUG-013     | Statutory endpoint paths wrong in spec                     | ✅ RESOLVED — ProvidentFundController at /statutory/pf, ESIController at /statutory/esi, ProfessionalTaxController at /statutory/pt — all match frontend |
| BUG-QA2-005 | Platform /applications endpoint 500                        | ⚠️ OPEN                                                                                                                                                 |
| BUG-QA2-006 | Shift roster blocked by SQL injection false-positive       | ✅ FIXED — SQL injection pattern tightened; JSON arrays with double quotes no longer blocked                                                             |
| BUG-QA2-007 | Half-day leave enum mismatch (MORNING vs FIRST_HALF)       | ✅ FIXED — LeaveRequestController normalizes MORNING→FIRST_HALF, AFTERNOON→SECOND_HALF                                                                   |
| BUG-QA2-008 | Retroactive leave blocked by @FutureOrPresent              | ✅ FIXED — @FutureOrPresent removed; retroactive leave allowed (BUG-QA2-008 comment in LeaveRequestRequest.java)                                         |
| BUG-QA2-011 | Resource pool endpoints missing (404)                      | ⚠️ OPEN                                                                                                                                                 |
| BUG-QA4-007 | Certificate generation pipeline incomplete                 | ⚠️ OPEN — feature gap                                                                                                                                   |

---

## Use Case Test Coverage

### 🔐 Auth (UC-AUTH-001 to 007)

| UC          | Description                    | Test      | Bug       |
|-------------|--------------------------------|-----------|-----------|
| UC-AUTH-001 | Email/password login + lockout | ✅ WRITTEN | —         |
| UC-AUTH-002 | Google OAuth login             | ✅ WRITTEN | —         |
| UC-AUTH-003 | MFA setup & verify             | ✅ WRITTEN | BUG-001 ✅ |
| UC-AUTH-004 | Logout + token blacklist       | ✅ WRITTEN | —         |
| UC-AUTH-005 | Token refresh                  | ✅ WRITTEN | BUG-002 ✅ |
| UC-AUTH-006 | Password reset flow            | ✅ WRITTEN | —         |
| UC-AUTH-007 | Rate limiting (429)            | ✅ WRITTEN | —         |

### 💰 Payroll (UC-PAY-001 to 016)

| UC                | Description             | Test       | Bug        |
|-------------------|-------------------------|------------|------------|
| UC-PAY-001        | Create salary structure | ✅ WRITTEN  | BUG-003 ⚠️ |
| UC-PAY-002        | Initiate payroll run    | ✅ WRITTEN  | —          |
| UC-PAY-003        | SpEL formula evaluation | ✅ WRITTEN  | —          |
| UC-PAY-004        | Payslip PDF generation  | ✅ WRITTEN  | —          |
| UC-PAY-005        | Lock payroll run        | ✅ WRITTEN  | —          |
| UC-PAY-006        | Payroll adjustments     | ✅ WRITTEN  | —          |
| UC-PAY-007 to 016 | Extended payroll UCs    | 📋 PENDING | —          |

### ✅ Approvals (UC-APPR-001 to 005)

| UC          | Description                        | Test      | Bug |
|-------------|------------------------------------|-----------|-----|
| UC-APPR-001 | Leave approval chain               | ✅ WRITTEN | —   |
| UC-APPR-002 | Leave rejection with reason        | ✅ WRITTEN | —   |
| UC-APPR-003 | Expense approval chain             | ✅ WRITTEN | —   |
| UC-APPR-004 | Overtime approval / wrong approver | ✅ WRITTEN | —   |
| UC-APPR-005 | Escalation on timeout              | ✅ WRITTEN | —   |

### 🧾 FnF Settlement (UC-FNF-001 to 005)

| UC         | Description             | Test      |
|------------|-------------------------|-----------|
| UC-FNF-001 | Pro-rata calculation    | ✅ WRITTEN |
| UC-FNF-002 | Leave encashment in FnF | ✅ WRITTEN |
| UC-FNF-003 | Pending expense in FnF  | ✅ WRITTEN |
| UC-FNF-004 | Loan deduction in FnF   | ✅ WRITTEN |
| UC-FNF-005 | Final payslip PDF       | ✅ WRITTEN |

### ⚡ Performance Benchmarks (UC-PERF-001 to 008)

| UC          | Description                     | Test      |
|-------------|---------------------------------|-----------|
| UC-PERF-001 | Dashboard < 3000ms              | ✅ WRITTEN |
| UC-PERF-002 | Employee list 500 rows < 5000ms | ✅ WRITTEN |
| UC-PERF-003 | Payroll run < 60s               | ✅ WRITTEN |
| UC-PERF-004 | API median < 300ms              | ✅ WRITTEN |
| UC-PERF-005 | Leave submit < 500ms            | ✅ WRITTEN |
| UC-PERF-006 | 1000-row export < 30s           | ✅ WRITTEN |
| UC-PERF-007 | WebSocket notification < 500ms  | ✅ WRITTEN |
| UC-PERF-008 | 5 concurrent requests all 200   | ✅ WRITTEN |

### 👤 Employees (UC-EMP-001 to 018)

| UC                | Description            | Test       | Bug           |
|-------------------|------------------------|------------|---------------|
| UC-EMP-001        | Create employee        | ✅ WRITTEN  | —             |
| UC-EMP-002        | Update employee fields | ✅ WRITTEN  | —             |
| UC-EMP-003        | Bulk import            | ✅ WRITTEN  | —             |
| UC-EMP-004        | Employment change      | ✅ WRITTEN  | —             |
| UC-EMP-005        | Org chart              | ✅ WRITTEN  | —             |
| UC-EMP-006 to 011 | Extended employee UCs  | 📋 PENDING | —             |
| UC-EMP-012        | Deactivate employee    | ✅ WRITTEN  | BUG-QA2-009 ✅ |
| UC-EMP-013 to 018 | Further employee UCs   | 📋 PENDING | —             |

### 🕐 Attendance (UC-ATT-001 to 012)

| UC                | Description             | Test       |
|-------------------|-------------------------|------------|
| UC-ATT-001        | Check-in / check-out    | ✅ WRITTEN  |
| UC-ATT-002        | Regularization flow     | ✅ WRITTEN  |
| UC-ATT-003        | Shift assignment        | ✅ WRITTEN  |
| UC-ATT-004 to 012 | Extended attendance UCs | 📋 PENDING |

### 🏖️ Leave (UC-LEAVE-001 to 015)

| UC                  | Description           | Test       | Bug               |
|---------------------|-----------------------|------------|-------------------|
| UC-LEAVE-001        | Apply leave           | ✅ WRITTEN  | BUG-QA2-001 ⏳     |
| UC-LEAVE-002        | Carry-forward balance | ✅ WRITTEN  | —                 |
| UC-LEAVE-003        | Leave encashment      | ✅ WRITTEN  | —                 |
| UC-LEAVE-004 to 015 | Extended leave UCs    | 📋 PENDING | BUG-QA2-007/008 ✅ |

### 🎁 Benefits (UC-BEN-001 to 008)

| UC                | Description          | Test       |
|-------------------|----------------------|------------|
| UC-BEN-001        | Benefit enrollment   | ✅ WRITTEN  |
| UC-BEN-002        | Auto-enrollment      | ✅ WRITTEN  |
| UC-BEN-003 to 008 | Extended benefit UCs | 📋 PENDING |

### 💻 Assets (UC-ASSET-001 to 005+)

| UC                  | Description          | Test       | Bug                |
|---------------------|----------------------|------------|--------------------|
| UC-ASSET-001        | Assign asset         | ✅ WRITTEN  | —                  |
| UC-ASSET-002        | Return asset         | ✅ WRITTEN  | —                  |
| UC-ASSET-003 to 005 | Create/update assets | 📋 PENDING | BUG-QA2-010 ✅ V112 |

### 🏢 Departments (UC-DEPT-001)

| UC          | Description          | Test      |
|-------------|----------------------|-----------|
| UC-DEPT-001 | Create / delete dept | ✅ WRITTEN |

### 💵 Compensation (UC-COMP-001)

| UC          | Description     | Test      |
|-------------|-----------------|-----------|
| UC-COMP-001 | Bands + history | ✅ WRITTEN |

### 🧑‍💼 Probation (UC-PROB-001 to 005)

| UC          | Description              | Test      | Bug           |
|-------------|--------------------------|-----------|---------------|
| UC-PROB-001 | Probation list + confirm | ✅ WRITTEN | —             |
| UC-PROB-002 | Extend probation         | ✅ WRITTEN | —             |
| UC-PROB-003 | Manager review           | ✅ WRITTEN | —             |
| UC-PROB-004 | Auto-notification        | ✅ WRITTEN | —             |
| UC-PROB-005 | HR dashboard aggregation | ✅ WRITTEN | BUG-QA2-004 ⏳ |

### 🙋 My Space (UC-MY-001 to 008)

| UC        | Description             | Test      | Bug           |
|-----------|-------------------------|-----------|---------------|
| UC-MY-001 | All MY SPACE 200        | ✅ WRITTEN | —             |
| UC-MY-002 | Payslip history scoped  | ✅ WRITTEN | —             |
| UC-MY-003 | Payslip PDF download    | ✅ WRITTEN | —             |
| UC-MY-004 | Leave balance           | ✅ WRITTEN | —             |
| UC-MY-005 | Attendance history      | ✅ WRITTEN | —             |
| UC-MY-006 | My assets               | ✅ WRITTEN | —             |
| UC-MY-007 | Loan repayment schedule | ✅ WRITTEN | —             |
| UC-MY-008 | Profile self-update     | ✅ WRITTEN | BUG-QA2-012 ✅ |

### 💸 Expenses (UC-EXP-001)

| UC         | Description            | Test      |
|------------|------------------------|-----------|
| UC-EXP-001 | Submit / scope expense | ✅ WRITTEN |

### 🏦 Loans (UC-LOAN-001)

| UC          | Description                | Test      | Bug       |
|-------------|----------------------------|-----------|-----------|
| UC-LOAN-001 | Apply + repayment schedule | ✅ WRITTEN | BUG-005 ✅ |

### ✈️ Travel (UC-TRAVEL-001)

| UC            | Description             | Test      | Bug       |
|---------------|-------------------------|-----------|-----------|
| UC-TRAVEL-001 | Submit + approve travel | ✅ WRITTEN | BUG-006 ✅ |

### 📊 Statutory (UC-STAT-001 to 003)

| UC          | Description    | Test      | Bug       |
|-------------|----------------|-----------|-----------|
| UC-STAT-001 | PF calculation | ✅ WRITTEN | BUG-013 ✅ |
| UC-STAT-002 | TDS + Form 16  | ✅ WRITTEN | BUG-013 ✅ |
| UC-STAT-003 | LWF deduction  | ✅ WRITTEN | BUG-013 ✅ |

### 🎫 Helpdesk (UC-HELP-001)

| UC          | Description           | Test      |
|-------------|-----------------------|-----------|
| UC-HELP-001 | Ticket CRUD + resolve | ✅ WRITTEN |

### ⏱️ Timesheets (UC-TIME-001)

| UC          | Description         | Test      |
|-------------|---------------------|-----------|
| UC-TIME-001 | Log time + view own | ✅ WRITTEN |

### 📦 Resources (UC-RESOURCE-001)

| UC              | Description        | Test      | Bug            |
|-----------------|--------------------|-----------|----------------|
| UC-RESOURCE-001 | Allocate resources | ✅ WRITTEN | BUG-QA2-011 ⚠️ |

### 📄 Contracts (UC-CONTRACT-001)

| UC              | Description     | Test      |
|-----------------|-----------------|-----------|
| UC-CONTRACT-001 | Create + e-sign | ✅ WRITTEN |

### 📝 Letters (UC-LETTER-001)

| UC            | Description                | Test      | Bug            |
|---------------|----------------------------|-----------|----------------|
| UC-LETTER-001 | Generate experience letter | ✅ WRITTEN | BUG-QA2-003 ⚠️ |

### 📈 Reports (UC-REPORT-001 to 002)

| UC            | Description      | Test      | Bug       |
|---------------|------------------|-----------|-----------|
| UC-REPORT-001 | Headcount report | ✅ WRITTEN | BUG-008 ✅ |
| UC-REPORT-002 | Scheduled report | ✅ WRITTEN | BUG-008 ✅ |

### ⚙️ Admin (UC-ADMIN-001 to 002)

| UC           | Description        | Test      | Bug       |
|--------------|--------------------|-----------|-----------|
| UC-ADMIN-001 | Feature flags      | ✅ WRITTEN | BUG-009 ✅ |
| UC-ADMIN-002 | Holiday management | ✅ WRITTEN | —         |

### 🔔 Notifications (UC-NOTIF-001)

| UC           | Description      | Test      |
|--------------|------------------|-----------|
| UC-NOTIF-001 | View + mark read | ✅ WRITTEN |

### ⚙️ Settings (UC-SETTINGS-001 to 007)

| UC              | Description              | Test      |
|-----------------|--------------------------|-----------|
| UC-SETTINGS-001 | Change password          | ✅ WRITTEN |
| UC-SETTINGS-002 | Password complexity      | ✅ WRITTEN |
| UC-SETTINGS-003 | MFA from settings        | ✅ WRITTEN |
| UC-SETTINGS-004 | Revoke session           | ✅ WRITTEN |
| UC-SETTINGS-005 | Notification preferences | ✅ WRITTEN |
| UC-SETTINGS-006 | SSO configuration        | ✅ WRITTEN |
| UC-SETTINGS-007 | Display preferences      | ✅ WRITTEN |

### 📢 Announcements (UC-ANNC-*)

| UC        | Test      | Bug       |
|-----------|-----------|-----------|
| UC-ANNC-* | ✅ WRITTEN | BUG-014 ✅ |

### 📅 Calendar (UC-CAL-*)

| UC       | Test      |
|----------|-----------|
| UC-CAL-* | ✅ WRITTEN |

### 📁 Documents (UC-DOC-*)

| UC       | Test      | Bug           |
|----------|-----------|---------------|
| UC-DOC-* | ✅ WRITTEN | BUG-QA3-005 ⏳ |

---

## NU-Hire (UC-HIRE-001 to 018)

| UC          | Description                   | Test      | Bug            |
|-------------|-------------------------------|-----------|----------------|
| UC-HIRE-001 | Job requisition create        | ✅ WRITTEN | BUG-QA3-008 ✅  |
| UC-HIRE-002 | Pipeline stage move           | ✅ WRITTEN | —              |
| UC-HIRE-003 | Schedule interview + feedback | ✅ WRITTEN | BUG-QA3-007 ✅  |
| UC-HIRE-004 | Generate + send offer letter  | ✅ WRITTEN | BUG-QA2-003 ⚠️ |
| UC-HIRE-005 | Preboarding valid token       | ✅ WRITTEN | —              |
| UC-HIRE-006 | Onboarding checklist          | ✅ WRITTEN | —              |
| UC-HIRE-007 | Offboarding + FnF trigger     | ✅ WRITTEN | —              |
| UC-HIRE-008 | Employee referral submit      | ✅ WRITTEN | BUG-QA3-006 ✅  |
| UC-HIRE-009 | Resume parse from upload      | ✅ WRITTEN | —              |
| UC-HIRE-010 | Bulk candidate import         | ✅ WRITTEN | —              |
| UC-HIRE-011 | Resend expired offer          | ✅ WRITTEN | —              |
| UC-HIRE-012 | Invalid preboarding token     | ✅ WRITTEN | —              |
| UC-HIRE-013 | Expired preboarding token     | ✅ WRITTEN | —              |
| UC-HIRE-014 | Exit interview public URL     | ✅ WRITTEN | —              |
| UC-HIRE-015 | Career portal job listing     | ✅ WRITTEN | —              |
| UC-HIRE-016 | Referral rewards              | ✅ WRITTEN | —              |
| UC-HIRE-017 | Interview scorecard           | ✅ WRITTEN | —              |
| UC-HIRE-018 | Onboarding doc checklist      | ✅ WRITTEN | —              |

---

## NU-Grow (UC-GROW-001 to 022)

| UC          | Description                   | Test      | Bug            |
|-------------|-------------------------------|-----------|----------------|
| UC-GROW-001 | Review cycle create           | ✅ WRITTEN | BUG-QA4-001 ✅  |
| UC-GROW-002 | Self-review submit            | ✅ WRITTEN | BUG-QA4-002 ✅  |
| UC-GROW-003 | Manager review + final rating | ✅ WRITTEN | —              |
| UC-GROW-004 | 360 feedback request          | ✅ WRITTEN | BUG-QA4-003 ✅  |
| UC-GROW-005 | Create OKR + cascade          | ✅ WRITTEN | BUG-QA4-004 ✅  |
| UC-GROW-006 | LMS enrollment + completion   | ✅ WRITTEN | —              |
| UC-GROW-007 | Kudos to peer                 | ✅ WRITTEN | —              |
| UC-GROW-008 | Survey create + respond       | ✅ WRITTEN | BUG-QA4-005 ✅  |
| UC-GROW-009 | Wellness program join         | ✅ WRITTEN | —              |
| UC-GROW-010 | Calibration 9-box             | ✅ WRITTEN | —              |
| UC-GROW-011 | 9-box assessment              | ✅ WRITTEN | —              |
| UC-GROW-012 | PIP initiation                | ✅ WRITTEN | —              |
| UC-GROW-013 | PIP progress update           | ✅ WRITTEN | —              |
| UC-GROW-014 | Goal check-in                 | ✅ WRITTEN | —              |
| UC-GROW-015 | OKR cascade                   | ✅ WRITTEN | —              |
| UC-GROW-016 | OKR progress scoring          | ✅ WRITTEN | —              |
| UC-GROW-017 | 360 anonymity verified        | ✅ WRITTEN | —              |
| UC-GROW-018 | Aggregate perf scores         | ✅ WRITTEN | —              |
| UC-GROW-019 | Training certificate          | ✅ WRITTEN | BUG-QA4-007 ⚠️ |
| UC-GROW-020 | Training prerequisite check   | ✅ WRITTEN | —              |
| UC-GROW-021 | Pulse survey launch           | ✅ WRITTEN | —              |
| UC-GROW-022 | 1-on-1 notes                  | ✅ WRITTEN | BUG-QA4-008 ✅  |

---

## RBAC & Security (UC-RBAC, UC-TENANT, UC-SEC)

| UC                 | Description               | Test      | Status        |
|--------------------|---------------------------|-----------|---------------|
| UC-RBAC-001 to 020 | Full RBAC boundary matrix | ✅ WRITTEN | PASS          |
| UC-TENANT-001      | Cross-tenant isolation    | ✅ WRITTEN | PASS          |
| UC-SEC-001 to 012  | Security hardening checks | ✅ WRITTEN | PASS (2 SKIP) |

---

## Dashboard & Platform (UC-DASH, UC-APPSW, UC-SMOKE)

| UC                  | Description                 | Test      | Bug            |
|---------------------|-----------------------------|-----------|----------------|
| UC-DASH-001 to 008  | Dashboard variants per role | ✅ WRITTEN | BUG-QA2-005 ⚠️ |
| UC-APPSW-001 to 003 | App switcher access         | ✅ WRITTEN | —              |
| UC-SMOKE-001 to 005 | Smoke tests — all modules   | ✅ WRITTEN | —              |

---

## Deployment Readiness

### Backend Services

| Component                    | Status         |
|------------------------------|----------------|
| Spring Boot compile          | ✅ Clean        |
| Flyway migrations (V0–V112)  | ✅ Applied      |
| JWT auth + refresh           | ✅ Fixed        |
| RBAC (role_permissions)      | ✅ Fixed (V107) |
| JVM heap (1024m / ZGC)       | ✅ Fixed        |
| Redis connectivity           | ✅ OK           |
| Kafka (5 topics + DLT)       | ✅ Configured   |
| Asset creation (version col) | ✅ Fixed (V112) |
| Employee deactivation 500    | ✅ Fixed        |
| Profile self-update 500      | ⏳ In progress  |
| Document upload path         | ⏳ In progress  |
| Letter generation rollback   | ⚠️ Open        |
| Resource pool endpoints      | ⚠️ Open        |

### Frontend

| Component              | Status  |
|------------------------|---------|
| Next.js 14 build       | ✅ Clean |
| All 200+ routes mapped | ✅       |
| RBAC sidebar           | ✅       |
| Dark/light mode        | ✅       |

### Infrastructure

| Component            | Status |
|----------------------|--------|
| Docker Compose       | ✅      |
| K8s manifests (10)   | ✅      |
| GitHub Actions CI    | ✅      |
| Prometheus + Grafana | ✅      |

---

## Active Fixes (In Progress)

| Agent             | Fixing                                                        | ETA    |
|-------------------|---------------------------------------------------------------|--------|
| fix-emp-profile   | BUG-QA2-009 ✅ + BUG-QA2-012 ✅                                 | ✅ DONE |
| fix-api-contracts | BUG-QA3-005 ✅ + BUG-QA2-001 ✅ + BUG-QA2-004 ✅ + BUG-QA2-012 ✅ | ✅ DONE |

---

*Auto-generated from QA run 2026-04-03. Update this file as bugs are resolved.*
