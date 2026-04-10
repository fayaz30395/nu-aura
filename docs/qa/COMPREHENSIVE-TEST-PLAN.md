# NU-AURA Comprehensive Test Plan

> **Generated**: 2026-04-10 | **Scope**: Full platform (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence)
> **Codebase**: 261 routes | 172 controllers | 303 entities | 131 Flyway migrations | 224 frontend services

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Component Interaction Map](#2-component-interaction-map)
3. [Test Strategy & Coverage Matrix](#3-test-strategy--coverage-matrix)
4. [P0 — Critical Path Use Cases](#4-p0--critical-path-use-cases)
5. [P1 — High Priority Use Cases](#5-p1--high-priority-use-cases)
6. [P2 — Medium Priority Use Cases](#6-p2--medium-priority-use-cases)
7. [P3 — Low Priority / Robustness Use Cases](#7-p3--low-priority--robustness-use-cases)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Current Coverage Gaps](#9-current-coverage-gaps)
10. [Test Environment Requirements](#10-test-environment-requirements)

---

## 1. System Architecture Overview

### Stack Summary

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                  │
│  261 routes │ 151 components │ 93 hooks │ 224 services   │
│  Mantine UI + Tailwind │ React Query │ Zustand           │
├──────────────────────────────────────────────────────────┤
│                 EDGE MIDDLEWARE (Next.js)                 │
│  JWT decode │ OWASP headers │ CSP │ Coarse auth          │
├──────────────────────────────────────────────────────────┤
│              BACKEND (Spring Boot 3.4.1)                 │
│  172 controllers │ 206+ services │ 69 API modules        │
│  SecurityService + @RequiresPermission on all endpoints  │
├──────────┬──────────┬──────────┬─────────┬──────────────┤
│ PostgreSQL│  Redis 7 │ Kafka    │ Elastic │ Google Drive │
│ (Neon/16) │ Cache+RL │ 6 topics │ Search  │ File Store   │
└──────────┴──────────┴──────────┴─────────┴──────────────┘
```

### Sub-App Breakdown

| Sub-App | Routes | Controllers | Entities | Status |
|---------|--------|------------|----------|--------|
| **NU-HRMS** | ~150 | ~100 | ~200 | ~98% |
| **NU-Hire** | ~45 | ~30 | ~50 | ~97% |
| **NU-Grow** | ~40 | ~25 | ~60 | ~93% |
| **NU-Fluence** | ~18 | ~15 | ~30 | ~90% |
| **Platform** (auth, admin, settings) | ~8 | ~12 | ~20 | ~99% |

### RBAC Hierarchy (6 tiers)

```
Super Admin (100) → Tenant Admin (90) → HR Admin (85) → HR Manager (80) → Team Lead (50) → Employee (40)
```

470+ permissions in `MODULE:ACTION` format. SuperAdmin bypasses ALL checks.

---

## 2. Component Interaction Map

### Authentication Flow

```
Google OAuth / Credentials
        │
        ▼
  AuthController ──► AuthService ──► JwtTokenProvider
        │                                │
        ▼                                ▼
  httpOnly cookies              SecurityContext
  (access + refresh)            (ThreadLocal user/tenant)
        │                                │
        ▼                                ▼
  Frontend AuthGuard ◄── Axios 401 interceptor (refresh mutex)
        │
        ▼
  usePermissions hook ──► Route-level + component-level gating
```

### Leave Request Flow (representative approval workflow)

```
Employee ──► LeaveRequestController.create()
                    │
                    ▼
            LeaveService.requestLeave()
                    │
            ┌───────┴───────┐
            ▼               ▼
    LeaveBalanceService   WorkflowService.initiate()
    (check available)           │
            │                   ▼
            ▼           WorkflowDefinition lookup
    LeaveBalance         (by entity type + dept)
    (optimistic lock)           │
                                ▼
                        ApprovalStep evaluation
                        (SEQUENTIAL/PARALLEL/HIERARCHICAL)
                                │
                                ▼
                        Kafka: nu-aura.approvals
                                │
                        ┌───────┴───────┐
                        ▼               ▼
                  NotificationService  AuditService
                  (email + WebSocket)  (Kafka: nu-aura.audit)
```

### Payroll Processing Flow

```
PayrollAdmin ──► PayrollController.processPayroll()
                        │
                        ▼
                PayrollService.process()
                        │
                ┌───────┴───────────┐
                ▼                   ▼
        PayrollComponentService   EmployeePayrollService
        (DAG evaluation order)    (per-employee calc)
                │                       │
                ▼                       ▼
        SpEL FormulaEngine        StatutoryService
        (component formulas)      (PF/ESI/TDS/LWF)
                │                       │
                └───────┬───────────────┘
                        ▼
                DB Transaction (atomic)
                        │
                        ▼
                Kafka: nu-aura.payroll-processing
                        │
                        ▼
                PayslipGeneration (OpenPDF)
```

### Multi-Tenancy Enforcement

```
Every Request
     │
     ├── Frontend: X-Tenant-ID header (Axios interceptor)
     │
     ├── Backend: TenantFilter extracts tenant from JWT
     │       │
     │       ▼
     │   SecurityContext.setCurrentTenantId()
     │       │
     │       ▼
     │   HikariCP: SET app.current_tenant_id = ?
     │       │
     │       ▼
     │   PostgreSQL RLS policy enforcement
     │
     └── Entity: TenantEntityListener sets tenant_id on persist
```

### Fluence Knowledge Flow

```
Author ──► WikiPageController.create/update()
                    │
                    ▼
            WikiPageService
                    │
            ┌───────┴───────┐
            ▼               ▼
    WikiPageVersion     Kafka: nu-aura.fluence-content
    (auto-versioning)           │
                                ▼
                        FluenceSearchConsumer
                                │
                                ▼
                        Elasticsearch indexing
                                │
                                ▼
                        FluenceContentRetriever
                        (powers AI chat context)
```

---

## 3. Test Strategy & Coverage Matrix

### Current State

| Layer | Files | Coverage | Gap |
|-------|-------|----------|-----|
| Backend Unit Tests | 89 | ~52% of controllers | 27 untested modules |
| Backend Integration Tests | 74 | ~48% of controllers | Payroll, expense, statutory |
| Backend Security Tests | 35 | 96% annotation coverage | Edge-case role combos |
| Backend Architecture Tests | 8 | Layer boundaries | — |
| Frontend Unit Tests | 172 | Service + validation | Component rendering gaps |
| Frontend E2E (Playwright) | 92 | Major flows | Mobile, analytics, advanced admin |
| QA Manual | 45+ use cases | P0-P3 executed | 2 critical bugs open (F-05, F-06) |

### Target State

| Layer | Target Coverage | Priority |
|-------|----------------|----------|
| Backend controllers | 85%+ (all 172) | P0 |
| Business logic services | 90%+ (payroll, leave, attendance) | P0 |
| RBAC permission checks | 100% of endpoints | P0 |
| Approval workflows | All 5 workflow types | P1 |
| E2E critical paths | 100% of P0 use cases | P0 |
| Edge cases per module | 5+ per critical module | P1 |
| Multi-tenancy isolation | Cross-tenant negative tests | P0 |

---

## 4. P0 — Critical Path Use Cases

### UC-P0-01: Authentication & Session Management

**Scope**: Login, logout, token lifecycle, session restoration

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1.1 | Google OAuth login with valid token | User authenticated, httpOnly cookies set (access 15min, refresh 7d), redirect to /dashboard | Token with extra/missing claims; expired Google token |
| 1.2 | Credential login with valid email/password | Same as 1.1 | SQL injection in email field; unicode characters |
| 1.3 | Login with invalid credentials (wrong password) | 401 response, no cookies set, error message shown | Empty password; password with 1000+ chars |
| 1.4 | Account lockout after 5 failed attempts | 429 response after 5th attempt, lockout for 15min | Rapid-fire attempts; attempt from multiple IPs |
| 1.5 | Token refresh on 401 | Transparent retry with new access token | Concurrent 401s from multiple API calls (mutex test); refresh token expired |
| 1.6 | Session restoration on page reload | AuthGuard calls restoreSession(), user state hydrated from cookie | Cookie present but JWT expired; cookie missing entirely |
| 1.7 | Logout | Both cookies cleared, sessionStorage wiped, QueryClient cache cleared, redirect to login | Logout during pending API calls; double-logout |
| 1.8 | CSRF token validation | POST/PUT/DELETE require valid X-XSRF-TOKEN header matching cookie | Missing CSRF token; tampered token; cross-origin request |
| 1.9 | Password policy enforcement | Reject <12 chars, missing uppercase/lowercase/digit/special, same as last 5 passwords | Exactly 12 chars meeting all rules; 90-day expired password |
| 1.10 | Concurrent session handling | New login invalidates previous session tokens | Same user, two browsers; API calls from invalidated session |

---

### UC-P0-02: Multi-Tenancy Isolation

**Scope**: Data isolation between tenants at DB (RLS), application, and API levels

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 2.1 | Tenant A user queries employees | Only Tenant A employees returned (RLS enforced) | Query with explicit tenant_id of another tenant in WHERE clause |
| 2.2 | Tenant A user creates employee | tenant_id auto-set to Tenant A via TenantEntityListener | Attempt to set different tenant_id in request body |
| 2.3 | Cross-tenant API access attempt | 403 or empty result set (never returns other tenant's data) | Manipulated JWT with wrong tenant_id; header tenant mismatch |
| 2.4 | Tenant isolation in Kafka events | Events processed only for originating tenant | Kafka consumer receives event for tenant without RLS context set |
| 2.5 | Tenant isolation in Redis cache | Cache keys namespaced by tenant_id | Cache poisoning attempt; cache key collision |
| 2.6 | Tenant isolation in WebSocket | STOMP messages only broadcast to same-tenant connections | Subscribe to another tenant's topic |
| 2.7 | Async operations maintain tenant context | @Async methods and scheduled jobs preserve SecurityContext tenant | Thread pool reuse with stale tenant context |
| 2.8 | Bulk operations respect RLS | Bulk import/export only affects current tenant data | CSV import with mixed tenant employee IDs |

---

### UC-P0-03: RBAC & Permission Enforcement

**Scope**: Role hierarchy, permission checks, SuperAdmin bypass

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 3.1 | Employee accesses own profile (MY SPACE) | Allowed without requiredPermission check | Employee with no explicit permissions assigned |
| 3.2 | Employee accesses admin panel | 403 Forbidden, blocked at both frontend and backend | URL direct navigation bypassing frontend AuthGuard |
| 3.3 | HR Manager accesses team's leave requests | Allowed via LEAVE:APPROVE permission | Manager accessing cross-department leave requests |
| 3.4 | SuperAdmin accesses all modules | Bypasses all @RequiresPermission checks | SuperAdmin with explicitly denied permission (should still bypass) |
| 3.5 | Permission hierarchy (MANAGE implies READ) | User with EMPLOYEE:MANAGE can also READ | Partial permission sets; wildcard permissions |
| 3.6 | Role transition (employee promoted to manager) | New permissions immediately effective after re-login | Cached permissions in Redis stale after role change |
| 3.7 | Frontend permission gating | Components hidden for users without permission | React hydration mismatch (server vs client permission state) |
| 3.8 | API endpoint without @RequiresPermission | Blocked by architecture test (RbacAnnotationCoverageTest) | New controller added without annotation |
| 3.9 | Permission normalization | Both `EMPLOYEE:READ` and `employee.read` formats accepted | Mixed-case permissions; app-prefixed `HRMS:EMPLOYEE:READ` |
| 3.10 | Multi-role user | Union of all role permissions applied | Conflicting permissions between roles |

---

### UC-P0-04: Leave Management (Critical — Known Bug F-06)

**Scope**: Leave request lifecycle, balance enforcement, approval workflow

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 4.1 | Request leave within balance | Request created, status PENDING, balance.pending incremented | Exactly equal to remaining balance (boundary) |
| 4.2 | **Request leave exceeding balance** | **REJECTED with clear error message** (BUG F-06: currently accepted) | Zero balance; negative balance after carry-forward adjustment |
| 4.3 | Half-day leave request | totalDays = 0.5, deducted from balance correctly | Half-day on start + full days + half-day on end |
| 4.4 | Leave approval by manager | Status → APPROVED, balance.used incremented, balance.pending decremented | Manager approves own leave (should escalate); manager not in hierarchy |
| 4.5 | Leave rejection by manager | Status → REJECTED, balance.pending decremented, notification sent | Rejection after partial approval in multi-step workflow |
| 4.6 | Leave cancellation by employee | Status → CANCELLED, balance restored | Cancel after approval; cancel on start date |
| 4.7 | Overlapping leave requests | Second request rejected with overlap error | Adjacent days (end date = next start date); different leave types same dates |
| 4.8 | Leave balance real-time update (F-07) | Dashboard balance reflects pending/approved requests immediately | Race condition: two approvals at same instant (optimistic lock test) |
| 4.9 | Leave accrual (scheduled job) | Monthly accrual adds correct amount based on leave type config | Pro-rata accrual for mid-month joiners; carry-forward cap |
| 4.10 | Leave on public holidays | System blocks leave on company holidays or shows warning | Regional holidays (different office locations); optional holidays |
| 4.11 | Compensatory leave creation | Comp-off created after approved overtime/weekend work | Expired comp-off (not used within validity period) |
| 4.12 | Leave encashment | Leave days converted to monetary value in payroll | Partial encashment; encashment exceeding encashable limit |

---

### UC-P0-05: Payroll Processing

**Scope**: Salary calculation, statutory deductions, payslip generation

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 5.1 | Run monthly payroll for all employees | All active employees processed, correct gross/net calculated | Employee joined mid-month (pro-rata); employee on LOP |
| 5.2 | SpEL formula evaluation | Components calculated in DAG order (dependencies respected) | Circular dependency between components; division by zero in formula |
| 5.3 | PF calculation | Employee PF (12%) + Employer PF (12%) on basic salary | Salary exceeding PF ceiling (₹15,000 basic); voluntary PF |
| 5.4 | ESI calculation | 0.75% employee + 3.25% employer on gross below ₹21,000 | Gross exactly at ₹21,000 boundary; crossing threshold mid-year |
| 5.5 | TDS calculation | Tax computed based on regime (old/new), declarations, HRA/80C/80D | No declarations submitted; mid-year regime switch |
| 5.6 | LWF (Labour Welfare Fund) | Correct state-wise LWF deduction | Employee in state without LWF; inter-state transfer |
| 5.7 | Payroll adjustments | Ad-hoc earnings/deductions applied correctly | Adjustment larger than salary (net negative); multiple adjustments |
| 5.8 | Payslip PDF generation | OpenPDF generates correct payslip with all components | Employee with 30+ salary components; unicode names |
| 5.9 | Payroll reversal | Processed payroll can be reversed before finalization | Reversal after bank file generated; partial reversal |
| 5.10 | Bulk payroll processing | 500+ employees processed within timeout, atomic transaction | Transaction failure at employee #400 (rollback all or partial?) |
| 5.11 | Payroll approval workflow | Payroll run requires approval before disbursement | Approver on leave; parallel approval with split decision |
| 5.12 | Year-end tax settlement | Correct FY-end TDS reconciliation and Form 16 data | Excess TDS deducted (refund); shortfall (recovery from March salary) |

---

### UC-P0-06: Employee Lifecycle

**Scope**: Onboarding → Active → Transfer → Separation

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 6.1 | Employee creation | Employee + User records created, employeeCode auto-generated | Duplicate email; employee code collision |
| 6.2 | Onboarding workflow | Preboarding portal accessible via token, checklist tracked | Token expired; token used from different browser |
| 6.3 | Department transfer | Manager, department, team updated; old manager notified | Transfer during active leave; transfer to same department |
| 6.4 | Designation change | History recorded; payroll components recalculated if salary-linked | Downgrade (lower level); multiple changes same day |
| 6.5 | Employee separation (resignation) | Exit process initiated, F&F settlement calculated, access revoked | Resignation during probation; pending loan balance |
| 6.6 | Full & Final settlement | All dues (salary, leave encashment, bonus, deductions) calculated | Employee owes more than last salary; asset not returned |
| 6.7 | Employee profile edit (F-03) | Edit button navigates to edit form, changes saved | Concurrent edits by HR and employee on same profile |
| 6.8 | Keka data import | CSV/Excel import maps correctly to NU-AURA schema | Missing required fields; date format mismatches; 10,000 row import |
| 6.9 | Employee directory search | Search by name, department, designation, skills | Empty results; special characters in search; pagination beyond data |
| 6.10 | Org chart rendering | Hierarchical tree based on managerId relationships | Circular reporting chain; employee without manager; 500+ org |

---

## 5. P1 — High Priority Use Cases

### UC-P1-01: Attendance Management

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1.1 | Clock in / clock out | AttendanceRecord created with timestamps | Double check-in (F-09: should return 409 not 400) |
| 1.2 | Attendance regularization | Request created, needs manager approval | Regularize for future date; regularize already-approved day |
| 1.3 | Shift-based attendance | Hours calculated per shift definition | Cross-midnight shift; split shift; timezone mismatch |
| 1.4 | Attendance report generation | Monthly/weekly summary with present/absent/half-day counts | Month with zero attendance records; employee with no shift |
| 1.5 | Late arrival / early departure | Flagged based on shift timing, policy action applied | Grace period exactly matched; 1 minute late |
| 1.6 | Work-from-home attendance | Marked as WFH, different calculation rules | WFH on public holiday; WFH during compulsory office day |
| 1.7 | Geolocation attendance (mobile) | Location validated against office geo-fence | GPS spoofing; no GPS permission; outside fence by 1 meter |
| 1.8 | Bulk attendance import | CSV import for historical data | Duplicate dates; future dates in import |

---

### UC-P1-02: Approval Workflow Engine

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 2.1 | Sequential workflow (3 steps) | Step 1 approve → Step 2 → Step 3 → APPROVED | Rejection at step 2 (entire workflow rejected) |
| 2.2 | Parallel workflow | Multiple approvers notified simultaneously | Minimum approvals met before all respond; tied votes |
| 2.3 | Hierarchical workflow | Escalates through management chain | Manager is also the requestor; skip-level approval |
| 2.4 | Conditional workflow | Rules evaluated to select correct workflow path | No matching condition (fallback); multiple conditions match |
| 2.5 | Hybrid workflow | Mixed sequential + parallel steps | Parallel step timeout within sequential chain |
| 2.6 | SLA enforcement | Escalation after slaHours exceeded | SLA exactly at boundary; escalation target on leave |
| 2.7 | Auto-approve on timeout | Request auto-approved after configured hours | Auto-approve disabled; auto-reject vs auto-approve conflict |
| 2.8 | Approver delegation | Delegated user can approve on behalf | Delegation expired during approval; chain delegation (A→B→C) |
| 2.9 | Workflow for 21 entity types | Each entity type triggers correct workflow definition | Entity type without workflow definition configured |
| 2.10 | Concurrent approval modification | Two approvers act simultaneously on same request | Optimistic locking prevents double-approval |

---

### UC-P1-03: Recruitment Pipeline (NU-Hire)

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 3.1 | Job opening creation | Job created with stages, published to career page | Job with zero stages; duplicate job title |
| 3.2 | Candidate application | Applicant record created, moves to first stage | Duplicate application (same email + job); resume > 10MB |
| 3.3 | Kanban stage transition | Candidate moved between stages, history tracked | Move backward in pipeline; skip stages |
| 3.4 | Interview scheduling | Interview created with interviewer, time, meet link | Interviewer scheduling conflict; interview in past date |
| 3.5 | Scorecard evaluation | Interviewer fills scorecard, criteria scored | All criteria scored zero; scorecard submitted twice |
| 3.6 | Agency management | Agency created, submissions tracked, performance metrics | Agency submits candidate already in system; commission dispute |
| 3.7 | Offer generation & e-signature | Offer letter generated, sent for digital signature | Offer expired; candidate rejects; counter-offer |
| 3.8 | Career page (public) | Jobs listed without authentication, application form works | Unauthenticated SQL injection attempt; bot spam submissions |
| 3.9 | Diversity tracking | Anonymized diversity metrics collected and reportable | Incomplete diversity data; report with < 5 candidates (anonymity) |
| 3.10 | Hire-to-onboard flow | Accepted offer → preboarding portal → employee record | Offer accepted but job opening already filled |

---

### UC-P1-04: Performance Management (NU-Grow)

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 4.1 | Review cycle creation | Cycle created with timeline, participants, template | Overlapping review cycles; cycle with zero participants |
| 4.2 | Self-assessment submission | Employee fills self-review within deadline | Submission after deadline; save draft and resume |
| 4.3 | Manager review | Manager rates direct reports, provides feedback | Manager has 50+ direct reports (performance); manager vacancy |
| 4.4 | 360-degree feedback | Peers nominated, feedback collected anonymously | Fewer than 3 peers (anonymity concern); feedback from ex-employee |
| 4.5 | Calibration session | HR adjusts ratings across teams for consistency | Override locked rating; calibrate after communication |
| 4.6 | PIP (Performance Improvement) | PIP plan created, progress tracked, outcome recorded | PIP extended; PIP during notice period |
| 4.7 | OKR creation & tracking | Objectives set with key results, progress updated | OKR cascading (parent-child); KR > 100% achievement |
| 4.8 | Goal alignment | Team goals linked to company objectives | Circular goal dependencies; orphan goals |

---

### UC-P1-05: Fluence Knowledge Management

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 5.1 | Wiki space creation | Space created with slug, visibility, permissions | Duplicate slug; space with RESTRICTED visibility + no members |
| 5.2 | Wiki page creation & versioning | Page created, version 1 saved, indexed in Elasticsearch | Page with 100KB content; embedded images; markdown + HTML mix |
| 5.3 | Wiki page tree navigation | Nested pages displayed in tree hierarchy | 10 levels deep nesting; page moved between spaces |
| 5.4 | Inline comments on wiki page | Comments anchored to text ranges, threaded replies | Commented text deleted in new version; 100 comments on one page |
| 5.5 | Blog post lifecycle | Draft → Review → Published → Archived | Publish without review; edit published post (new version?) |
| 5.6 | Space permissions | ORGANIZATION, TEAM, PRIVATE, RESTRICTED visibility enforced | User added/removed from space; permission change during active edit |
| 5.7 | Fluence AI chat | Context-aware responses using Elasticsearch content | No relevant content found; content from restricted space |
| 5.8 | Full-text search | Elasticsearch returns ranked results across wiki + blogs | Search with special characters; empty index; index lag after publish |
| 5.9 | Content export | Wiki pages exported as PDF/HTML/Markdown | Page with embedded media; export entire space (100 pages) |
| 5.10 | Edit lock (distributed) | 5-minute Redis lock prevents concurrent edits | Lock expired during edit; editor browser crash (lock orphaned) |

---

## 6. P2 — Medium Priority Use Cases

### UC-P2-01: Expense Management

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1.1 | Expense claim submission | Claim created with receipt attachments, workflow initiated | Receipt > 10MB; 20 line items; foreign currency |
| 1.2 | Expense approval | Manager approves, finance processes payment | Partial approval (some line items rejected) |
| 1.3 | Expense policy validation | Claims checked against category limits, daily/monthly caps | Exactly at limit; retroactive policy change |
| 1.4 | Mileage calculation | Auto-calculated based on distance and rate | Round trip; multi-stop journey |
| 1.5 | Expense report export | Monthly/quarterly reports generated for finance | Empty report period; 1000+ claims in export |

### UC-P2-02: Asset Management

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 2.1 | Asset allocation to employee | Asset assigned, tracked in employee profile | Already allocated to another employee; retired asset |
| 2.2 | Asset return on separation | Return process triggered, condition noted | Damaged asset; lost asset |
| 2.3 | Asset lifecycle tracking | Purchase → Allocate → Maintain → Retire | Bulk purchase import; asset transferred between offices |

### UC-P2-03: Loan Management

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 3.1 | Loan application | Application created, workflow initiated | Employee already has active loan; amount exceeds policy limit |
| 3.2 | EMI deduction in payroll | Monthly deduction calculated and applied | Loan closure mid-month; prepayment; salary insufficient for EMI |
| 3.3 | Loan foreclosure | Remaining balance calculated, final deduction processed | Foreclosure penalty; foreclosure during notice period |

### UC-P2-04: Training & LMS (NU-Grow)

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 4.1 | Course catalog browsing | Employee sees available courses with enrollment status | Course with prerequisites not met; archived course |
| 4.2 | Training enrollment | Employee enrolled, notification sent, calendar blocked | Max capacity reached; enrollment deadline passed |
| 4.3 | Training completion | Certificate generated, skill added to profile | Incomplete assessment; retake allowed |
| 4.4 | Mandatory training tracking | HR sees compliance dashboard, reminders sent | Overdue training; exemption for certain roles |

### UC-P2-05: Survey & Wellness (NU-Grow)

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 5.1 | Survey creation & distribution | Survey sent to target audience, responses collected | Anonymous survey with <5 respondents (anonymity); survey recall |
| 5.2 | Engagement score calculation | Score computed from responses, trends shown | All identical responses; survey with 0 responses |
| 5.3 | Wellness program enrollment | Employee joins program, progress tracked | Program capacity full; employee already in similar program |

### UC-P2-06: Letters & Documents

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 6.1 | Letter template creation | Template with placeholders saved | Template with invalid placeholder syntax |
| 6.2 | Letter generation for employee | Placeholders resolved, PDF generated, stored in Drive | Employee with missing data for required placeholder |
| 6.3 | Document approval workflow | Document sent for approval chain | Approver delegates; document recalled after partial approval |
| 6.4 | E-signature integration | DocuSign envelope created, signed document stored | Signature declined; envelope expired |

### UC-P2-07: Notifications & Real-Time

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 7.1 | In-app notification | WebSocket pushes notification, badge count updated | User offline when notification sent; 100+ unread |
| 7.2 | Email notification | SMTP email sent for approval/rejection/reminder | SMTP failure; email bounce; employee with no email |
| 7.3 | Notification preferences | User can mute specific notification types | Mute critical notifications (should still send?) |
| 7.4 | WebSocket reconnection | Auto-reconnects after network interruption | Rapid connect/disconnect cycles; stale STOMP session |

---

## 7. P3 — Low Priority / Robustness Use Cases

### UC-P3-01: Reporting & Analytics

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1.1 | Standard report generation | Pre-built reports render with correct data | Report for date range with no data; 50,000 row report |
| 1.2 | Custom report builder | User selects columns, filters, generates report | All columns selected; invalid filter combination |
| 1.3 | Scheduled reports | Reports auto-generated on cron, emailed to recipients | Recipient list empty; report generation fails mid-schedule |
| 1.4 | Dashboard widgets | Real-time metrics on dashboard (headcount, attrition, etc.) | Widget with zero data; dashboard with 20 widgets (performance) |
| 1.5 | Export to Excel/CSV | Data exported with correct formatting | Export with 100,000 rows; special characters in data |

### UC-P3-02: Statutory Compliance

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 2.1 | PF return filing data | ECR/KYC data generated in correct format | Employee without UAN; PF on variable pay |
| 2.2 | ESI return data | IP details, contribution data generated | Employee crossing ESI threshold mid-month |
| 2.3 | Professional Tax | State-wise PT slab applied correctly | Employee in state without PT; inter-state transfer |
| 2.4 | Form 16/16A generation | Annual TDS certificate with correct breakup | Multiple employers in FY; zero tax deducted |

### UC-P3-03: Shifts & Overtime

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 3.1 | Shift assignment | Employee assigned to shift, attendance rules applied | Shift change mid-week; overlapping shifts |
| 3.2 | Overtime calculation | Hours beyond shift calculated, OT rate applied | Overtime on holiday (2x rate); weekly OT cap |
| 3.3 | Shift swap | Two employees swap shifts with manager approval | Swap with employee in different department |

### UC-P3-04: Travel & Timesheets

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 4.1 | Travel request | Request with itinerary, advance, workflow | International travel; multi-city trip |
| 4.2 | Timesheet submission | Weekly timesheet submitted against projects | Time exceeding 24hrs/day; timesheet for non-working day |
| 4.3 | Project allocation | Employee allocated to project with percentage | Over-allocation (>100%); allocation end date conflict |

### UC-P3-05: Wall & Social (NU-Fluence)

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 5.1 | Wall post creation | Post published, visible to org/team | Post with only media (no text); post with 50 mentions |
| 5.2 | Comment & reaction | Comments threaded, reactions counted | Rapid fire reactions (rate limiting); delete comment with replies |
| 5.3 | Trending posts | Algorithm surfaces high-engagement posts | Zero engagement posts; single viral post |

### UC-P3-06: Helpdesk & Calendar

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 6.1 | Helpdesk ticket creation | Ticket created, assigned, SLA tracked | Auto-assignment round-robin; ticket escalation |
| 6.2 | Calendar events | Events synced with Google/Outlook | Recurring events; timezone conversion; all-day events |
| 6.3 | Meeting scheduling | 1-on-1 created with Meet link | Attendee decline; reschedule; recurring meeting |

---

## 8. Cross-Cutting Concerns

### CC-01: Rate Limiting

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | Auth endpoint: 6th request in 1 minute | 429 Too Many Requests | Exactly at limit (5th request); after window reset |
| 2 | API endpoint: 101st request in 1 minute | 429 response | Different endpoints same user; same endpoint different users |
| 3 | Export endpoint: 6th request in 5 minutes | 429 response | Export started but not completed (counts?) |
| 4 | Redis unavailable fallback | Bucket4j in-memory rate limiting activates | Redis reconnects mid-window; rate state inconsistency |

### CC-02: Error Handling & Resilience

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | Invalid request body | 400 Bad Request with field-level errors | Missing required fields; extra unknown fields; null vs empty |
| 2 | Resource not found | 404 with meaningful message | Valid UUID format but non-existent; deleted resource |
| 3 | Optimistic lock conflict | 409 Conflict with retry suggestion | Concurrent edit by same user in two tabs |
| 4 | Database connection failure | 503 with circuit breaker; no data leak | Neon cold start (5-second keepalive); connection pool exhaustion |
| 5 | Kafka producer failure | Event queued for retry; DLT after 3 attempts | Kafka cluster unavailable; message exceeds max size |
| 6 | Redis connection failure | Graceful degradation to in-memory fallback | Redis returns but cached data stale |
| 7 | Elasticsearch unavailable | Search returns empty with warning; CRUD still works | ES reconnects; index corruption |

### CC-03: Security Headers & OWASP

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | CSP header | Restrictive policy; blocks inline scripts except nonce | Third-party widget loading; Google OAuth popup |
| 2 | X-Frame-Options | DENY prevents clickjacking | Legitimate iframe embedding (should be blocked) |
| 3 | HSTS | Strict-Transport-Security in production only | First HTTP request before redirect |
| 4 | Permissions-Policy | Camera, mic, payment, geolocation blocked | Mobile attendance with geo (needs exception?) |
| 5 | XSS prevention | Rich text sanitized; user input escaped | Tiptap editor content with script tags; SVG XSS |
| 6 | SQL injection | Parameterized queries prevent injection | Custom report builder with user-provided filters |

### CC-04: Audit Trail

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | Entity create | created_at, created_by auto-populated | Bulk import (all same created_by?) |
| 2 | Entity update | updated_at, updated_by auto-populated; version incremented | Update with no actual changes (should version bump?) |
| 3 | Soft delete | is_deleted=true, deleted_at set, data preserved | Restore after soft delete; hard delete after 90 days |
| 4 | Kafka audit events | All CRUD operations published to nu-aura.audit topic | Audit consumer lag; DLT for failed audit events |
| 5 | Audit log query | Admin can search audit trail by entity, user, date range | 1M+ audit events; query across 6 months |

### CC-05: Pagination & Performance

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | Default pagination | 20 items per page, sorted by createdAt desc | Zero results; exactly 20 results (edge of page boundary) |
| 2 | Max page size | Capped at 100 items regardless of request | Request size=1000; request size=0; size=-1 |
| 3 | Sort by multiple fields | `?sort=name,asc&sort=createdAt,desc` | Sort by non-existent column; sort by sensitive field |
| 4 | Deep pagination | Page 5000 of employee list | Performance with 100K employees; cursor-based alternative |
| 5 | Concurrent list + mutation | List while another user creates/deletes | Phantom reads; page count changes during navigation |

### CC-06: File Upload & Google Drive

| # | Test Case | Expected Outcome | Edge Cases |
|---|-----------|-------------------|------------|
| 1 | File upload (< 10MB) | Uploaded to Google Drive, link stored in DB | Exactly 10MB; zero-byte file; file with no extension |
| 2 | File upload (> 10MB) | Rejected with 413 Payload Too Large | 10.01MB file; file size mismatch in Content-Length |
| 3 | File download | webContentLink returned, browser downloads | File deleted from Drive; permission revoked |
| 4 | File type validation | Only allowed types (pdf, doc, xls, jpg, png) | .exe renamed to .pdf; polyglot file; SVG with script |
| 5 | Google Drive unavailable | Graceful error; mock provider in dev | Upload succeeds but DB save fails (orphaned file) |

---

## 9. Current Coverage Gaps

### Critical Gaps (Must Fix Before Production)

| Module | Controllers | Tests | Gap | Risk |
|--------|------------|-------|-----|------|
| **Mobile** | 5 | 0 | 100% | Mobile attendance, push notifications untested |
| **Analytics** | 6 | 0 | 100% | Dashboard data integrity unknown |
| **Expense** | 9 | 2 | 78% | 7 controllers untested; policy enforcement |
| **Statutory** | 6 | 1 | 83% | Compliance-critical; PF/ESI/TDS accuracy |
| **Exit** | 2 | 0 | 100% | F&F settlement calculations untested |
| **PSA** | 3 | 0 | 100% | Project billing/allocation |
| **Public API** | 2 | 0 | 100% | External-facing, security-critical |

### Medium Gaps

| Module | Controllers | Tests | Gap |
|--------|------------|-------|-----|
| Recruitment | 6 | 2 | 67% |
| Payroll | 4 | 2 | 50% |
| Attendance | 7 | 4 | 43% |
| Benefits | 2 | 1 | 50% |
| Travel | 2 | 0 | 100% |
| Survey | 2 | 0 | 100% |
| LMS | 2 | 0 | 100% |

### Known Open Bugs

| ID | Severity | Module | Issue | Status |
|----|----------|--------|-------|--------|
| F-06 | **P0** | Leave | Leave balance not enforced — accepts over-quota requests | **OPEN** |
| F-05 | **P0** | RBAC | Auth order bug — validation before @RequiresPermission | **OPEN** |
| F-07 | P1 | Leave | Leave balance not updated in real-time | Open |
| F-04 | P1 | RBAC | Wrong redirect for unauthorized access | Open |
| F-03 | P1 | Employee | Edit button on profile page doesn't navigate | Open |
| F-01 | P2 | Employee | Form tab switching loses React Hook Form state | Open |
| F-09 | P3 | Attendance | Double check-in returns 400 instead of 409 | Open |

---

## 10. Test Environment Requirements

### Infrastructure

| Component | Dev/Test | Staging | Production |
|-----------|----------|---------|------------|
| PostgreSQL | Neon (free tier) | Neon (Pro) | PG 16 (GKE) |
| Redis | Docker (6380) | Docker | Redis 7 (managed) |
| Kafka | Docker (9092) | Docker | Confluent 7.6.0 |
| Elasticsearch | Docker (9200) | Docker | ES 8.11.0 (managed) |
| Google Drive | Mock provider | Service account | Service account |

### Test Data Requirements

| Entity | Min Records | Purpose |
|--------|------------|---------|
| Tenants | 3 | Isolation testing |
| Employees | 500 per tenant | Pagination, payroll bulk |
| Leave requests | 50 per employee | Balance calculation, history |
| Attendance records | 90 days per employee | Monthly reports |
| Payroll runs | 6 months history | Year-end, TDS |
| Wiki pages | 100 per space | Search, tree performance |
| Job openings | 20 | Pipeline, analytics |

### Role Matrix for Test Users

| Role | Count | Purpose |
|------|-------|---------|
| Super Admin | 1 | Full access verification |
| Tenant Admin | 1 per tenant | Tenant management |
| HR Admin | 2 | HR operations |
| HR Manager | 3 | Approvals, team management |
| Team Lead | 5 | Partial approvals, team view |
| Employee | 10+ | Self-service, MY SPACE |
| Recruiter | 2 | NU-Hire testing |
| Payroll Admin | 1 | Payroll processing |

### Execution Priority

```
Week 1: P0 use cases (UC-P0-01 through UC-P0-06) — 64 test cases
         Fix F-05, F-06 (blocking bugs)
         Add tests for 27 untested modules (controller level)

Week 2: P1 use cases (UC-P1-01 through UC-P1-05) — 48 test cases
         Cross-cutting concerns (CC-01 through CC-06) — 30 test cases
         Fix F-03, F-04, F-07

Week 3: P2 use cases (UC-P2-01 through UC-P2-07) — 35 test cases
         Performance testing (payroll bulk, pagination, concurrent)

Week 4: P3 use cases (UC-P3-01 through UC-P3-06) — 25 test cases
         Regression suite stabilization
         Fix remaining P2/P3 bugs
```

---

## Summary

| Category | Count |
|----------|-------|
| **Total test use cases** | **202** |
| P0 (Critical) | 64 |
| P1 (High) | 48 |
| P2 (Medium) | 35 |
| P3 (Low) | 25 |
| Cross-cutting | 30 |
| **Untested controller modules** | **27** |
| **Open bugs** | **7** (2 P0, 2 P1, 1 P2, 2 P3) |
| **Sub-apps covered** | **4** (HRMS, Hire, Grow, Fluence) |
| **Roles to test** | **8** distinct roles |
| **Estimated execution** | **4 weeks** |
