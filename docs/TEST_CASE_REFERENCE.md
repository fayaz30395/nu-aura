# NU-AURA — Application Reference for Test Case Creation

## What NU-AURA Is

NU-AURA is a **multi-tenant HR and People platform** for managing the entire employee lifecycle in
one product. It bundles four sub-applications — Core HR, Recruitment, Performance & Learning, and
Knowledge & Social — on a shared infrastructure with a single login, unified roles, and strict
tenant isolation (each company's data is completely invisible to other companies).

**Live URLs:**
- Frontend: `https://hrms-frontend-vert.vercel.app`
- Backend: `https://nu-aura-backend-production.up.railway.app`

**Dev ports:** Frontend `:3000` · Backend `:8080`

---

## Platform Architecture

```
Browser
  └── Next.js 16 (React 19, Mantine 9, TanStack Query v5, Zustand,
                   React Hook Form + Zod, Framer Motion)
        └── Spring Boot 3.5 (Java 21)
              ├── JWT in httpOnly cookie (auth)
              ├── Custom @RequiresPermission interceptor (RBAC)
              ├── PostgreSQL + Row-Level Security (multi-tenant)
              ├── Redis 7 (caching, rate limiting, distributed locks)
              ├── Kafka / Transactional Outbox (async events)
              └── Elasticsearch 8.11 (full-text search)
```

---

## Authentication

| Step | What Happens |
|------|-------------|
| Email + password | `POST /api/v1/auth/login` → JWT in httpOnly cookie |
| Google OAuth | Backend exchanges token via `@react-oauth/google` |
| JWT contents | Role codes only (`HR_ADMIN`, `EMPLOYEE`, etc.) |
| Permissions | Loaded from Redis cache or DB on every request |
| Account lockout | 5 failed attempts → 15-minute lock |
| Password rules | 12+ chars, upper+lower+digit+special, 90-day expiry, last 5 blocked |
| Rate limit | 5 requests/min on auth endpoints |

**Password reset:** `/reset-password` — time-limited, single-use token sent by email.

---

## Roles & Permissions

### 19 Explicit Roles (assigned manually)

| Role | Rank | Scope |
|------|------|-------|
| `SUPER_ADMIN` | 100 | Cross-tenant; bypasses ALL permission checks |
| `TENANT_ADMIN` | 90 | Full access within one tenant |
| `HR_ADMIN` | 85 | Everything including salary EDIT |
| `HR_MANAGER` | 80 | HR ops + salary VIEW only |
| `PAYROLL_ADMIN` | 75 | Payroll & compensation only |
| `HR_EXECUTIVE` | 70 | HR ops, no financial access |
| `RECRUITMENT_ADMIN` | 65 | Talent acquisition & onboarding |
| `DEPARTMENT_MANAGER` | 60 | Department-level management |
| `PROJECT_ADMIN` | 58 | Projects & timesheets |
| `ASSET_MANAGER` | 56 | IT asset tracking |
| `EXPENSE_MANAGER` | 55 | Expense approval |
| `HELPDESK_ADMIN` | 54 | Support tickets |
| `TRAVEL_ADMIN` | 53 | Travel requests |
| `COMPLIANCE_OFFICER` | 52 | Policy & compliance |
| `LMS_ADMIN` | 51 | Learning system admin |
| `TEAM_LEAD` | 50 | Team-level management |
| `EMPLOYEE` | 40 | Self-service only |
| `CONTRACTOR` | 30 | Limited access |
| `INTERN` | 20 | Minimal access |

### 7 Implicit Roles (auto-granted from org relationships)

| Implicit Role | Triggered When... |
|--------------|-------------------|
| `REPORTING_MANAGER` | Employee has direct reports |
| `SKIP_LEVEL_MANAGER` | Employee has indirect reports |
| `DEPARTMENT_HEAD` | Designated head of a department |
| `MENTOR` | Assigned as someone's mentor |
| `INTERVIEWER` | Placed on an interview panel |
| `PERFORMANCE_REVIEWER` | Assigned as a reviewer in a cycle |
| `ONBOARDING_BUDDY` | Assigned as a new hire's buddy |

**Permission logic:**
- `SUPER_ADMIN` always bypasses — no permission check applies.
- All other roles load an explicit permission set from DB (Redis-cached).
- Implicit roles add permissions on top of the user's explicit role.
- `TENANT_ADMIN` has a large but explicitly-defined set — it is **not** a bypass.

---

## Sub-Application 1: NU-HRMS (Core HR)

**Entry:** `/me/dashboard` · **Users:** All employees + HR team

### 1.1 Employee Master Data

Stores core employee records — personal info, employment details, documents, skills, org hierarchy.

**Key pages:** `/employees`, `/employees/[id]`, `/employees/[id]/compensation`,
`/employees/change-requests`, `/employees/import`, `/departments`, `/me/profile`, `/me/skills`

**Key actions:** Create employee, edit details, submit change requests (triggers approval
workflow), bulk import from CSV/Excel, view org chart.

**Key entities:** Employee, Department, Designation, EmployeeDocument, EmployeeSkill,
TalentProfile

---

### 1.2 Attendance & Time Tracking

Records daily check-in/out, manages shift rosters, overtime, regularization requests.

**Key pages:** `/me/attendance`, `/attendance`, `/attendance/regularization`,
`/attendance/comp-off`, `/attendance/shift-swap`, `/shifts`, `/time-tracking`, `/timesheets`,
`/overtime`

**Daily check-in flow:**
1. Employee clicks Check In on `/me/dashboard`
2. Timestamp recorded → `attendance_records` (tenant-scoped)
3. Employee clicks Check Out → duration computed → marked PRESENT

**Regularization flow:**
1. Employee sees MISSING punch on attendance log
2. Submits correction request with actual time + reason
3. Manager approves/rejects → record corrected if approved

**Shift swap:**
1. Employee requests swap with a colleague
2. Colleague accepts → HR Admin approves
3. Both rosters updated

---

### 1.3 Leave Management

Full leave lifecycle — apply, approve, track balances, carry-forward, encashment.

**Key pages:** `/leave/apply`, `/leave/my-leaves`, `/leave/team`, `/leave/approvals`,
`/leave/calendar`, `/leave/encashment`, `/leave/admin/carry-forward`

**Leave request flow:**
1. Employee opens `/leave/apply`
2. Balance pre-loaded from Redis cache
3. Employee fills form (validated with Zod schema)
4. `POST /api/v1/leave-requests` → status PENDING
5. Manager approves → balance decremented, employee notified
6. Manager rejects → employee notified with reason

**Leave cancellation:** Employee cancels pending or approved leave → balance restored if
previously approved.

**Balance cache:** Cached in Redis; evicted on every approval.

---

### 1.4 Payroll & Compensation

Runs monthly payroll, generates payslips, manages salary structures, handles statutory
deductions.

**Key pages:** `/payroll/runs`, `/payroll/runs/[id]`, `/payroll/components`,
`/payroll/salary-structures`, `/payroll/statutory`, `/compensation`, `/me/payslips`

**Payroll run states:** `DRAFT → PROCESSING → PENDING_APPROVAL → APPROVED → LOCKED`

Locked runs cannot be modified. Payslips become visible to employees after locking.

---

### 1.5 Expense Management

Employee expense claims (receipts, mileage, advances) with approval + reimbursement.

**Key pages:** `/expenses`, `/expenses/approvals`, `/expenses/mileage`, `/loans`, `/loans/new`

**Expense states:** `DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → REIMBURSED → PAID`

**OCR receipt upload:** Extracts amount, date, merchant automatically.

**Policy validation:** Checks category limits before submission.

---

### 1.6 Asset Management

Track company assets (laptops, phones) assigned to employees.

**Key pages:** `/assets`, `/me/assets`

---

### 1.7 Statutory Compliance (India)

Manages PF, ESI, PT, LWF, TDS, and tax declarations.

**Key pages:** `/statutory`, `/tax/declarations` (requires `TDS_DECLARE` or `STATUTORY_VIEW`),
`/lwf`

**Coverage:** PF (12%+12%), ESI (employees <₹21k/month), PT (state-specific), LWF
(state-specific), TDS (from declared investments).

---

### 1.8 Letters, Helpdesk & Announcements

Generates HR letters (offer, experience, relieving), manages support tickets, broadcasts
announcements.

**Key pages:** `/letters`, `/letters/templates`, `/helpdesk/tickets`, `/helpdesk/sla`,
`/helpdesk/knowledge-base`, `/announcements`, `/calendar`

Letters generated as PDFs stored on Google Drive.

---

## Sub-Application 2: NU-Hire (Recruitment)

**Entry:** `/recruitment` · **Users:** Recruiters, hiring managers, interviewers, candidates
(preboarding)

### 2.1 Job Openings & Requisitions

Create and manage open positions; track applicant counts.

**Key pages:** `/recruitment/jobs`, `/recruitment/career-page`

---

### 2.2 Candidate Pipeline (ATS)

Track candidates through hiring stages via list, pipeline, or kanban views.

**Key pages:** `/recruitment/candidates`, `/recruitment/candidates/[id]`,
`/recruitment/kanban`, `/recruitment/[jobId]/kanban`

**Candidate status flow:**
```
NEW → SCREENING → INTERVIEW → SELECTED → OFFER_EXTENDED → OFFER_ACCEPTED
                                                         → OFFER_DECLINED
→ REJECTED (any stage)
→ WITHDRAWN
```

---

### 2.3 Interviews & Scorecards

Schedule interview rounds, assign interviewers, collect structured evaluations.

**Key pages:** `/recruitment/interviews`, `/recruitment/scorecards`

Scorecard templates define criteria (Technical, Communication, Problem Solving) with rating
scales. Aggregate scores visible to recruiter after all rounds.

---

### 2.4 Agencies & Job Boards

Partner agencies submit candidates; syndicate jobs to external boards.

**Key pages:** `/recruitment/agencies`, `/recruitment/agencies/[id]`, `/recruitment/job-boards`

Agency submission states: `SUBMITTED → REVIEWED → SHORTLISTED / REJECTED`

---

### 2.5 Public Careers Page

Unauthenticated job listing + application form.

**Key page:** `/careers` (public, no login required)

**Flow:** Visitor browses → applies with resume upload → creates `Applicant` record (status NEW)
→ appears in `/recruitment/candidates` for recruiters.

---

### 2.6 AI Recruitment Assist (advisory)

Resume parsing, match scoring, candidate ranking, JD generation, interview question generation,
feedback synthesis.

**API:** `/api/v1/recruitment/ai/*`

---

### 2.7 Preboarding Portal

Candidate-facing self-service portal (token-based, no login) after offer acceptance.

**Key pages:** `/preboarding` (admin), `/preboarding/portal/[token]` (candidate)

**Candidate tasks:** Personal info → bank account → document upload → e-sign offer/contract.

**Conversion:** Admin clicks "Convert to Employee" → HRMS employee record created.

---

### 2.8 Onboarding & Checklists

Template-driven task checklists for new hires in their first weeks.

**Key pages:** `/onboarding`, `/onboarding/[id]`, `/onboarding/templates`

Progress % computed from task completion. Buddy assignment included.

---

### 2.9 E-Signature

Digital document signing — internal approvers + external candidates (token link).

**Key page:** `/sign/[token]` (public, token-scoped)

**States:** `DRAFT → SENT → PARTIALLY_SIGNED → COMPLETED / CANCELLED / DECLINED`

External tokens are single-use and time-limited.

---

### 2.10 Employee Referrals

Employees refer people for open positions; track referral bonus eligibility.

**Key page:** `/referrals`

**States:** `SUBMITTED → REVIEWED → SHORTLISTED / REJECTED → BONUS_ELIGIBLE → BONUS_PAID`

---

## Sub-Application 3: NU-Grow (Performance & Learning)

**Entry:** `/performance` · **Users:** All employees, managers, HR

### 3.1 Goals & OKRs

Set objectives with measurable key results; track progress.

**Key pages:** `/performance/okrs`, `/okr`

**OKR states:** `DRAFT → APPROVED → [key result progress] → COMPLETE / NOT_ACHIEVED`

Company-wide OKR rollup visible to SUPER_ADMIN and TENANT_ADMIN.

---

### 3.2 Performance Reviews

Structured review cycles — self, manager, skip-level reviews + calibration + 9-box.

**Key pages:** `/performance/cycles`, `/performance/cycles/[id]/calibration`,
`/performance/cycles/[id]/nine-box`, `/performance/reviews`, `/performance/pip`

**Cycle flow:** HR creates cycle → employee self-review → manager review → calibration →
9-box grid → ratings published. Underperformers enter PIP (Performance Improvement Plan).

---

### 3.3 360° Feedback

Multi-rater anonymous feedback from peers, direct reports, and managers.

**Key pages:** `/performance/360-feedback`

**Flow:** HR creates Feedback360Cycle → requests sent to raters → raters submit →
anonymized summary generated → shared with employee + manager.

---

### 3.4 Continuous Feedback

Ad-hoc peer-to-peer feedback outside formal review cycles.

**Key page:** `/performance/feedback`

---

### 3.5 Competency Matrix

Map employee skills against role requirements; identify skill gaps.

**Key page:** `/performance/competency-matrix`

---

### 3.6 Learning Management System (LMS)

Self-paced courses, quizzes, learning paths, certificates.

**Key pages:** `/learning/courses`, `/learning/courses/[id]/play`,
`/learning/courses/[id]/quiz/[quizId]`, `/learning/paths`, `/learning/certificates`

**Learning flow:** Admin publishes course → employee enrolls → works through modules →
takes quiz → passes → certificate generated.

---

### 3.7 Training Programs

Instructor-led workshops and classroom sessions (vs. self-paced LMS).

**Key pages:** `/training/catalog`, `/training/my-learning`

---

### 3.8 Peer Recognition

Employees recognize each other with badges and points. Leaderboard, anniversary milestones.

**Key page:** `/recognition`

Parallel gamification system — separate from wellness points.

---

### 3.9 Surveys & Pulse Surveys

Full organizational surveys + lightweight frequent pulse surveys.

**Key pages:** `/surveys`, `/surveys/pulse`, `/surveys/[id]/respond`, `/surveys/[id]/analytics`

Pulse results feed into department-level `EngagementScore`.

---

### 3.10 1-on-1 Meetings

Recurring manager–direct-report meetings with agenda items and action items.

**Key page:** `/one-on-one`

---

### 3.11 Wellness

Wellness programs and challenges with gamified health activity tracking and points.

**Key pages:** `/wellness`, `/wellness/admin`

---

## Sub-Application 4: NU-Fluence (Knowledge & Social)

**Entry:** `/fluence` · **Users:** All employees

### 4.1 Wiki

Structured docs in spaces with page trees, versioning, inline comments, distributed edit
locking.

**Key pages:** `/fluence/wiki`, `/fluence/wiki/new`, `/fluence/wiki/[slug]`,
`/fluence/wiki/[slug]/edit`

**Edit locking:** Redis distributed lock (5-min TTL) acquired on edit start. Other users see
"Jane is currently editing." Periodic heartbeat keeps lock alive.

**Publish flow:** Save → PostgreSQL → Kafka event → Elasticsearch indexed.

---

### 4.2 Blog

Long-form articles with drafts, scheduled publishing, categories, comments, likes.

**Key pages:** `/fluence/blogs`, `/fluence/blogs/new`, `/fluence/blogs/[slug]`

**States:** `DRAFT → PUBLISHED / SCHEDULED / ARCHIVED`

---

### 4.3 Templates

Pre-built page structures for blogs and wiki pages.

**Key pages:** `/fluence/templates`, `/fluence/templates/[id]`

---

### 4.4 Drive (File Storage)

Browse file attachments linked to knowledge content. Backed by Google Drive.

**Key page:** `/fluence/drive` (requires `DOCUMENT_VIEW` or `DOCUMENT_UPLOAD`)

---

### 4.5 Activity Wall

Internal social feed — posts, praise, emoji reactions, nested comments, pin, vote, infinite
scroll.

**Key page:** `/fluence/wall`

Praise posts feed into the Recognition module.

---

### 4.6 Search

Unified full-text search across wiki, blogs, templates. Primary: Elasticsearch; fallback:
PostgreSQL ILIKE.

**Key page:** `/fluence/search`

---

### 4.7 AI Chat (RAG)

Floating chat widget (available on all pages) — answers questions by retrieving knowledge
base content and generating a grounded response. Requires `KNOWLEDGE:SEARCH` permission.

---

### 4.8 Analytics

Content engagement dashboard — top content, trending posts, activity distribution.

**Key page:** `/fluence/analytics`

---

## Shared Platform Services

| Service | What It Does |
|---------|-------------|
| **Multi-tenancy** | Every table has `tenant_id`. PostgreSQL RLS enforced at DB level via `nu_app_rls` (NOBYPASSRLS). Tenant set per transaction via `SET LOCAL app.current_tenant_id`. Fail-closed: missing context returns empty results, not wrong-tenant data. |
| **Notifications** | In-app + email for leave, expense, interviews, onboarding tasks, review cycles, recognition, surveys. Delivered via Kafka / Outbox. |
| **Workflows & Approvals** | Multi-step approval engine for expenses, change requests, etc. Configurable per tenant per process type. Unified queue at `/approvals`. |
| **Reports & Analytics** | `/reports/headcount`, `/reports/attrition`, `/reports/leave`, `/reports/payroll`, `/reports/performance`, `/reports/builder`, `/predictive-analytics` |
| **Projects & PSA** | `/projects`, `/projects/gantt`, `/projects/psa/invoices`, `/resources/capacity`, `/resources/workload` |
| **Calendar / Drive / Mail** | `/nu-calendar`, `/nu-drive`, `/nu-mail` — all permission-gated |
| **Admin** | `/admin/employees`, `/admin/feature-flags`, `/admin/roles`, `/admin/permissions`, `/admin/implicit-roles` |
| **Settings** | `/settings/security`, `/settings/sso`, `/settings/rbac`, `/settings/security/api-keys` |

---

## Key End-to-End Flows

### Flow 1: New Employee Full Funnel
```
Post job
→ Candidate applies at /careers
→ Recruiter moves through stages (SCREENING → INTERVIEW → SELECTED)
→ Offer generated + e-signed (/sign/[token])
→ Preboarding portal: info + docs + sign (/preboarding/portal/[token])
→ HR converts to employee
→ Onboarding checklist assigned
→ Employee logs in
→ Checks in on /me/dashboard
→ Applies for leave (/leave/apply)
→ Manager approves
→ Payroll runs → Payslip generated (/me/payslips)
```

### Flow 2: Performance Review Cycle
```
HR creates Review Cycle
→ Reviews created for all participants
→ Employees complete self-review
→ Managers complete manager review
→ 360 requests sent to raters
→ Raters submit feedback
→ HR calibrates (/performance/cycles/[id]/calibration)
→ 9-box plotted (/performance/cycles/[id]/nine-box)
→ Low performers enter PIP (/performance/pip)
→ Ratings published to employees
```

### Flow 3: Learning Certification
```
LMS Admin creates Course with Modules
→ Employee enrolls at /learning/courses
→ Employee plays through modules (progress tracked per item)
→ Employee takes quiz (/learning/courses/[id]/quiz/[quizId])
→ Passes → Certificate generated
→ Certificate visible at /learning/certificates and on employee profile
```

### Flow 4: Wiki Page → Searchable
```
Employee opens /fluence/wiki/new
→ Acquires Redis distributed edit lock
→ Writes content in Tiptap editor
→ Publishes page
→ Kafka event emitted
→ Elasticsearch indexes the page
→ Other employee searches at /fluence/search → finds page
→ AI chat widget can now answer questions about it
```

---

## Critical Business Rules for Test Cases

1. **Tenant isolation is absolute.** A user from Tenant A must never see Tenant B's data.
   Test with two separate tenant accounts.

2. **Leave balance must not go negative.** Applying for more leave than available balance must
   be rejected at form submission, not after approval.

3. **Payroll lock is final.** A locked payroll run cannot be modified. Test that all
   modification attempts are blocked after locking.

4. **Preboarding conversion is idempotent.** Converting a preboarding candidate twice must not
   create a duplicate employee record.

5. **E-sign tokens are single-use and time-limited.** A used or expired token must be rejected
   with a clear error.

6. **Expense policy validation is mandatory.** Claims exceeding configured category limits must
   be flagged and blocked before submission.

7. **SUPER_ADMIN bypasses all gates.** Every route and every action is accessible to
   SUPER_ADMIN. No other role has this blanket bypass.

8. **TENANT_ADMIN is NOT a bypass.** It has a large but explicitly-defined permission set.
   Routes requiring permissions outside that set will deny TENANT_ADMIN.

9. **Implicit roles are additive.** REPORTING_MANAGER = EMPLOYEE permissions + reporting
   manager permissions. Removing someone's direct reports removes this implicit role on next
   permission recompute.

10. **Rate limiting is enforced.** Auth = 5 req/min · API = 100 req/min · Exports = 5 req/5 min.
    Rate-limited requests must return 429 (not 500 or 200).

11. **Cache eviction on mutations.** Leave balance cache must be evicted when a leave is
    approved. Stale cache causes wrong balance to appear on the apply form.

12. **RLS context is transaction-local.** Missing `SET LOCAL app.current_tenant_id` returns
    empty results (not an error — fail-closed). If a query returns zero rows unexpectedly,
    check tenant context setup first.

---

## Test Accounts (Staging)

Demo credentials are currently **enabled** on the staging deployment. One-click login is
available for:

| Role | Access Level |
|------|-------------|
| `SUPER_ADMIN` | Full cross-tenant access, bypasses all permission checks |
| `TENANT_ADMIN` | Full access within one tenant |
| `HR_ADMIN` | All HR operations including salary edit |
| `HR_MANAGER` | HR operations + salary view only |
| `EMPLOYEE` | Self-service only |
| `RECRUITMENT_ADMIN` | Recruitment + onboarding only |
| `PAYROLL_ADMIN` | Payroll & compensation only |

> **Warning:** `DEMO_CREDENTIALS_ENABLED=true` is set in Railway. This must be flipped to
> `false` before any real production use. Until then, any visitor can log in as SUPER_ADMIN
> with one click.
