# NU-AURA — Product Requirements Document

**Document version**: 1.0
**Last updated**: 2026-05-13
**Owner**: NULogic Engineering
**Status**: Active development — Sprint 15 complete on `qa-sweep-2026-04-26`
**Locked stack**: Next.js 14, Java 21 + Spring Boot 3.5, PostgreSQL 16, Redis 7, Kafka,
Elasticsearch 8.11, GCP GKE

---

## Table of contents

1. [Executive Summary](#1-executive-summary)
2. [Vision, Goals & Success Metrics](#2-vision-goals--success-metrics)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Scope — 4 Sub-Apps](#4-product-scope--4-sub-apps)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Journeys](#7-user-journeys)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Model](#9-data-model)
10. [Security & Compliance](#10-security--compliance)
11. [Integrations](#11-integrations)
12. [Statutory Compliance (India)](#12-statutory-compliance-india)
13. [AI & Automation Features](#13-ai--automation-features)
14. [Roadmap & Phasing](#14-roadmap--phasing)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Out of Scope](#16-out-of-scope)
17. [Open Questions](#17-open-questions)
18. [Appendix — Glossary, References](#18-appendix)

---

## 1. Executive Summary

### 1.1 What is NU-AURA?

NU-AURA is an **internal multi-tenant Bundle App platform** built by NULogic Engineering to replace
the team's reliance on Keka (and various ad-hoc point solutions) with a single, owned, AI-augmented
Human Capital Management (HCM) suite.

The platform is a **multi-tenant SaaS architecture serving NULogic itself as the first and primary
tenant**, with the explicit design intent that any NULogic customer subsidiary or engagement team
could be onboarded as additional tenants in the future.

### 1.2 The "Bundle App" composition

NU-AURA is not one product — it is **four logically distinct sub-applications** sharing one backend,
one database, one authentication layer, and one tenant model:

| Sub-app        | Domain                                                                                               | What it replaces                            |
|----------------|------------------------------------------------------------------------------------------------------|---------------------------------------------|
| **NU-HRMS**    | Core HR, payroll, attendance, leave, expenses, contracts, assets, helpdesk, performance reviews      | Keka HR + Keka Payroll                      |
| **NU-Hire**    | Recruitment pipeline, candidate sourcing, agencies, scorecards, onboarding, career page, e-signature | Greenhouse, Lever, plus DocuSign for offers |
| **NU-Grow**    | Performance reviews, OKRs, 360 feedback, LMS, training, surveys, wellness                            | Lattice, Culture Amp, Udemy For Business    |
| **NU-Fluence** | Internal wiki, blogs, knowledge management, AI chat, company wall                                    | Notion + Slack channels for announcements   |

A single user logs in once and switches between sub-apps via the top-level navigation. Permissions,
roles, and tenant scoping flow uniformly across all four.

### 1.3 Why build instead of buy

1. **Cost economics at NULogic scale**: a distributed workforce growing through engagement-funded
   headcount means HR SaaS costs scale linearly with engineers, and vendor consolidation across the
   four domains saves ~70% versus best-of-breed.
2. **Engineering culture**: NULogic ships software; building the HR system is a forcing function for
   the platform team to dogfood the engineering practices NULogic sells to customers.
3. **AI surface area**: a unified data model across hire → onboard → review → exit lets ML models
   reason across employee lifecycle in ways siloed vendors cannot.
4. **Data sovereignty**: India-headquartered, India-first statutory engine, India hosting choice for
   tenants with localization requirements that global HRMS vendors handle poorly.

### 1.4 Current state (2026-05-13)

- **261 page routes** in the Next.js frontend
- **179 controllers + 237 services + 315 entities** in the Spring Boot backend
- **162 Flyway migrations** (V0 → V170) describing the schema evolution
- **15 sprint commits** since `740cf937` on `qa-sweep-2026-04-26` branch closing the wave-1 through
  wave-10 audit backlog
- Sub-app maturity per CLAUDE.md memory: **NU-HRMS ~98%, NU-Hire ~97%, NU-Grow ~92%, NU-Fluence ~90%
  **

---

## 2. Vision, Goals & Success Metrics

### 2.1 Long-term vision

> An employee at NULogic — and at any NULogic-operated subsidiary — spends their whole working life
> inside one app: applies through the career page, signs through e-signature, onboards through
> templates, clocks in via biometric or geo, accrues leave, draws payroll on the 1st, runs OKRs,
> learns through assigned courses, asks the wiki AI, posts to the wall, requests exit, signs the
> F&F,
> and walks out with a single GDPR-compliant export of their data.

### 2.2 12-month product goals

| #  | Goal                                             | Measurable                                                             |
|----|--------------------------------------------------|------------------------------------------------------------------------|
| G1 | Replace Keka entirely for NULogic                | Last Keka invoice paid; all 100% of employees on NU-AURA payroll       |
| G2 | Onboard the first external tenant                | 1 paying tenant or 1 NULogic subsidiary live on a separate `tenant_id` |
| G3 | Zero P0 security findings under wave-11+ audits  | External pen-test report, SOC 2 Type I readiness                       |
| G4 | GDPR Article 15/17/20 production-ready           | First customer DSR processed within 30-day SLA                         |
| G5 | <2% incidence of payroll errors per cycle        | Measured via post-payroll reconciliation report                        |
| G6 | NPS ≥ 40 from internal employees on the platform | Quarterly pulse survey via NU-Grow                                     |

### 2.3 Key product KPIs

- **Daily active users / total active employees** (target 90%+)
- **Time-to-clock-in** at start of shift (target <5s mobile, <10s web)
- **Payroll cycle duration** end-to-end (target <2 hours for 500 employees)
- **Search latency** in NU-Fluence (target p95 < 400ms — backed by Elasticsearch + Postgres FTS GIN)
- **Mean Time To Resolve (MTTR)** on helpdesk tickets (target <24h)
- **WCAG 2.1 AA compliance** on the 20 highest-traffic pages (sprints 10-G + 12-G in flight)

---

## 3. Target Users & Personas

### 3.1 Primary personas

#### 3.1.1 Employee ("Ananya, 28, full-stack engineer")

- Logs in daily for time, leave, wiki, wall, payslips
- Mobile-first when on the move (biometric punch, leave request, expense submission)
- Wants frictionless single-tap actions, fast search, accurate notifications

#### 3.1.2 People Manager ("Vikram, 35, engineering manager")

- Reviews team timesheets, approves leave/expenses/comp-off/regularizations
- Runs quarterly 1:1s, performance reviews, OKR check-ins
- Wants approval queue under 10 items at any time; bulk actions; calendar visibility

#### 3.1.3 HR Operations ("Priya, 31, HR ops")

- Runs monthly payroll, statutory filings, leave accrual closure, holiday calendar
- Manages joiners/leavers, contract renewals, F&F settlements
- Wants confidence checks (audit trail), bulk import/export, dashboard for cycle status

#### 3.1.4 HR Business Partner ("Rohan, 38, HRBP")

- Owns engagement, talent calibration, succession planning
- Runs pulse surveys, 360 cycles, wellness programs
- Wants analytics with org-chart context, drill-down dashboards

#### 3.1.5 Recruiter ("Tara, 29, technical recruiter")

- Posts roles to job boards, screens candidates, schedules interviews
- Coordinates agency submissions, scorecards, offer rollout
- Wants single-screen candidate pipeline, calendar integration, e-sign in 2 clicks

#### 3.1.6 Finance ("Karthik, 40, finance manager")

- Reconciles payroll, exports payslips for tax compliance, monitors loans/expenses
- Owns expense policy approval
- Wants Excel/CSV exports, audit-safe records, statutory report templates (Form 16, Form 24Q)

#### 3.1.7 System Administrator ("Suresh, 34, IT ops")

- Owns SSO config, integration credentials, tenant settings, RBAC
- Investigates security incidents, runs DSR fulfillment, rotates secrets
- Wants impersonation with audit trail, cross-tenant audit view (per S4-E), runbook-driven ops

#### 3.1.8 Tenant Admin ("Megha, 36, customer admin")

- For non-NULogic tenants (future state): customer's own admin role
- Owns their tenant's settings, branding, integrations
- Wants self-service tenant configuration without contacting NULogic support

### 3.2 Secondary personas

- **Candidate** (external) — applies via career page, uploads resume, completes assessments, e-signs
  offer
- **Interviewer** (internal, non-recruiter) — submits scorecards, panel feedback
- **Auditor** (external regulator or internal compliance) — reads audit logs, requests DSR exports

### 3.3 RBAC model

Six canonical roles + custom roles per tenant:

| Role           | Permission scope                                  |
|----------------|---------------------------------------------------|
| `SUPER_ADMIN`  | Cross-tenant (NULogic platform staff only)        |
| `TENANT_ADMIN` | Full ALL-scope within own tenant                  |
| `HR_ADMIN`     | ALL-scope on HR domains                           |
| `MANAGER`      | DEPARTMENT/TEAM-scope reads, SELF for writes      |
| `EMPLOYEE`     | SELF-scope only                                   |
| `FINANCE`      | ALL-scope on payroll/expenses, no HR profile edit |

**Permission semantics** (per `DataScopeService`): ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM.
CUSTOM is a strict allowlist — empty list returns `cb.disjunction()` (zero rows), never falls back
to SELF (closed-by-default since S3-A).

---

## 4. Product Scope — 4 Sub-Apps

### 4.1 NU-HRMS — Core HR Platform

**Maturity**: ~98% (production for NULogic since sprint-3)

**Modules** (one Next.js route group per module):

| Module                 | Frontend route                                                                              | Backend domain                                    |
|------------------------|---------------------------------------------------------------------------------------------|---------------------------------------------------|
| **Employee Directory** | `/employees`, `/employees/[id]`                                                             | `application/employee/*`                          |
| **Attendance**         | `/attendance`, `/attendance/regularization`, `/attendance/shift-swap`, `/biometric-devices` | `application/attendance/*`                        |
| **Timesheets**         | `/timesheets`                                                                               | `application/timesheet/*`                         |
| **Leave**              | `/leave`, `/leave/apply`, `/leave/balance`                                                  | `application/leave/*`                             |
| **Payroll**            | `/payroll`, `/payroll/runs`, `/payments`                                                    | `application/payroll/*`                           |
| **Expenses**           | `/expenses`, `/expenses/[id]`                                                               | `application/expense/*`                           |
| **Loans & Advances**   | `/loans`                                                                                    | `application/loan/*`                              |
| **Contracts**          | `/contracts`, `/contracts/new`                                                              | `application/contract/*`                          |
| **Letters**            | `/letters`                                                                                  | `application/letter/*`                            |
| **Documents**          | (under employee profile)                                                                    | `application/document/*`                          |
| **Assets**             | (under admin and employee self-serve)                                                       | `application/asset/*`                             |
| **Helpdesk**           | `/helpdesk` (planned)                                                                       | `application/helpdesk/*`                          |
| **Holidays**           | `/holidays`                                                                                 | `application/attendance/RestrictedHolidayService` |
| **Settings**           | `/settings/*` (including notifications, security)                                           | `application/settings/*`                          |

**Critical capabilities**:

- Bulk import from Keka (S6-A `KekaImportService` + `KekaMigrationService` parse CSV/Excel via
  Apache POI 5.4.1)
- Bulk export with Excel formula-injection guard (sprint-3 + sprint-12 `CellValueSanitizer`)
- Payslip generation with PDF rendering (OpenPDF 2.2.2, `PayslipPdfService`)
- Multi-pod biometric punch ingestion via Kafka (`BiometricIntegrationService` polls every 2 min
  with `@SchedulerLock`)
- Real-time shift swap workflow via STOMP WebSocket
- Mantine `DateInput` with `DatesProvider` locale `en-IN`, first day of week = Monday

### 4.2 NU-Hire — Recruitment

**Maturity**: ~97%

**Modules**:

| Module                      | Frontend route                                              | Backend domain                                                                                    |
|-----------------------------|-------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Job Openings**            | `/recruitment/jobs`, `/recruitment/jobs/new`                | `application/recruitment/JobOpeningService`                                                       |
| **Candidate Pipeline**      | `/recruitment/candidates`, `/recruitment/candidates/[id]`   | `application/recruitment/ApplicantService` + `CandidateService`                                   |
| **Interviews & Scorecards** | `/recruitment/interviews`, `/recruitment/interviews/[id]`   | `application/recruitment/InterviewManagementService`                                              |
| **Agencies**                | `/agencies` (TENANT_ADMIN)                                  | `application/recruitment/AgencyService`                                                           |
| **Career Page**             | `/recruitment/career-page` (public-facing)                  | `api/recruitment/CareerPageController` (public endpoint, rate-limited)                            |
| **Preboarding**             | `/preboarding`, `/preboarding/portal/[token]` (token-gated) | `application/preboarding/*`                                                                       |
| **Onboarding**              | `/onboarding`, `/onboarding/[id]`                           | `application/onboarding/OnboardingManagementService`                                              |
| **Job Board Integration**   | (admin)                                                     | `application/recruitment/JobBoardIntegrationService` (Naukri, LinkedIn — config-driven URLs only) |

**Critical capabilities**:

- AI-powered resume parsing (`ResumeParserService` calling configurable LLM; PII-scoped retention)
- Bias guardrails on AI scoring (EEOC-style; sprint-3 removed mock fallback so no fake outputs)
- 40/40/20 CTC split automation on candidate-hired event (`CandidateHiredEventListener`)
- DocuSign integration for offer signature (`DocuSignApiClient` + `DocuSignAuthService` JWT OAuth)
- Onboarding role templates (V154 + V156 `assignee_role` column) — HR_ADMIN, MANAGER, IT_ADMIN,
  EMPLOYEE seeded
- Career page public read endpoint with SSRF-safe job board URL validation

### 4.3 NU-Grow — Performance, Learning, Wellness

**Maturity**: ~92%

**Modules**:

| Module                     | Frontend route                                     | Backend domain                                                                                |
|----------------------------|----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| **Performance Reviews**    | `/performance`, `/performance/cycles`              | `application/performance/PerformanceReviewService`                                            |
| **Goals & OKRs**           | `/goals`                                           | `application/performance/GoalService`, `OkrService`                                           |
| **PIP**                    | `/performance/pip`                                 | `application/performance/PerformanceImprovementPlanService`                                   |
| **360 Feedback**           | (embedded in performance cycles)                   | `application/performance/Feedback360Service`                                                  |
| **LMS**                    | `/learning`, `/training`, `/training/catalog/[id]` | `application/lms/*`                                                                           |
| **Quizzes & Certificates** | (embedded in LMS courses)                          | `application/lms/QuizAssessmentService`                                                       |
| **Surveys**                | `/surveys/[id]/analytics`                          | `application/survey/PulseSurveyService`                                                       |
| **Recognition**            | `/recognition`                                     | `application/recognition/RecognitionService`                                                  |
| **Wellness**               | `/wellness`                                        | `application/wellness/WellnessService`                                                        |
| **Predictive Analytics**   | `/predictive-analytics`                            | `application/analytics/AnalyticsService` (sentiment, attrition predictions, workforce trends) |

**Critical capabilities**:

- Calibration sessions for performance ratings (`calibration_groups`, `calibration_decisions`)
- Succession planning with `talent_pools`, `succession_plans`, `succession_candidates` (V170 FK
  coverage)
- Peer recognition with `recognitions`, `peer_recognitions`, `recognition_badges`,
  `recognition_reactions`
- Pulse survey responses with anonymized aggregation
- LMS certificate auto-generation on quiz pass

### 4.4 NU-Fluence — Knowledge & Engagement

**Maturity**: ~90%

**Modules**:

| Module        | Frontend route                                                       | Backend domain                                                                   |
|---------------|----------------------------------------------------------------------|----------------------------------------------------------------------------------|
| **Wiki**      | `/fluence` (18 routes), spaces, pages, versions, comments, approvals | `application/knowledge/WikiPageService`                                          |
| **Blog**      | `/fluence/blogs`                                                     | `application/knowledge/BlogPostService`                                          |
| **Templates** | `/fluence/templates`                                                 | `application/knowledge/TemplateService`                                          |
| **Search**    | `/fluence/search`                                                    | `application/knowledge/FluenceContentRetriever` (V152 `body_text` + pg_trgm GIN) |
| **AI Chat**   | `/fluence/chat`                                                      | `application/ai/LlmStreamingService`                                             |
| **Analytics** | `/fluence/analytics`                                                 | `application/analytics/FluenceAnalyticsService`                                  |
| **Wall**      | `/fluence/wall` (replaces Slack #announcements)                      | `application/wall/WallService`                                                   |

**Critical capabilities**:

- Tiptap rich-text editor (lazy-loaded per S10-K) for both Wiki and Blog
- Page versioning, inline comments, like/watch, approval workflow (V163 wiki_page_approval_tasks)
- AI chat retrieval-augmented over wiki + blog (FluenceContentRetriever; native EM queries on
  `body_text` after S12-F SOFT_DELETE_GUARD fix)
- Wall posts with praise (employee tagging), reactions, pinned posts, type-scoped feeds
- 5-minute distributed edit lock via Redis (`FluenceEditLockService`) prevents concurrent wiki edits
- Multi-pod WebSocket fanout via Redis pub/sub for wall reactions (`RedisWebSocketRelay`, lazy-wired
  per S15-A)

---

## 5. Functional Requirements

### 5.1 Authentication & Session

| ID       | Requirement                                                                                | Status                                                         |
|----------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| AUTH-001 | Email + password login with BCrypt password hashing                                        | Done                                                           |
| AUTH-002 | 12+ char password, uppercase/lowercase/digit/special, history of 5, 90-day max age         | Done                                                           |
| AUTH-003 | Account lockout after 5 failed attempts for 15min                                          | Done                                                           |
| AUTH-004 | JWT issued in httpOnly+Secure+SameSite=Lax cookie (Path=/, no Domain on `__Host-` rollout) | Done (legacy + hardened both emitted; flag-gated rollover)     |
| AUTH-005 | Refresh token rotation on use                                                              | Done                                                           |
| AUTH-006 | Optional MFA via TOTP (encrypted secret at rest)                                           | Done; widening per V147                                        |
| AUTH-007 | Google OAuth SSO                                                                           | Done                                                           |
| AUTH-008 | SAML 2.0 SSO for enterprise tenants                                                        | Done (`DynamicSamlRelyingPartyRegistrationRepository` per V84) |
| AUTH-009 | Captcha after 3 failed login attempts (S12-J)                                              | Wired, feature-flagged off; not exercised in prod              |
| AUTH-010 | Impersonation by SUPER_ADMIN with auditable JTI claim                                      | Done (S4-E impersonator_id in audit logs)                      |
| AUTH-011 | Anonymized account rejection on login + SSO callback (S10-E)                               | Done                                                           |
| AUTH-012 | Tenant status check via 30s cached lookup (S3-C `TenantStatusCache`)                       | Done                                                           |

### 5.2 Payroll

| ID      | Requirement                                                                                                                    | Status                                                                |
|---------|--------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| PAY-001 | Monthly payroll run for INR-denominated salaries with statutory deductions                                                     | Done                                                                  |
| PAY-002 | Salary structure with revisions (effective-dated)                                                                              | Done                                                                  |
| PAY-003 | Payslip PDF rendered via OpenPDF, stored in Google Drive with tenant isolation (V143 `drive_file_mapping`)                     | Done                                                                  |
| PAY-004 | Statutory deductions: PF (12% capped at Rs.15k), ESI (Reg.40 contribution period), PT (state-specific), TDS (§87A rebate), LWF | Done (S4-B fixes)                                                     |
| PAY-005 | Gratuity calculation per Payment of Gratuity Act §4(2), 240-day rule (S4-B)                                                    | Done                                                                  |
| PAY-006 | Bonus calculation per Payment of Bonus Act 1965 §1(3)(ii)/§10/§11/§12/§13 (S6-C)                                               | Done                                                                  |
| PAY-007 | Mid-month joiner proration (S4-G `LeaveAccrualScheduler`)                                                                      | Done                                                                  |
| PAY-008 | F&F settlement with leave encashment, gratuity, notice recovery, asset recovery (S4-B `FnFCalculationService`)                 | Done                                                                  |
| PAY-009 | Loan deduction integration via `PayrollIntegrationListener`                                                                    | Done                                                                  |
| PAY-010 | Expense reimbursement via `PayrollIntegrationListener`                                                                         | Done                                                                  |
| PAY-011 | Statutory calculator strategy seam — IN active, UK/US skeletons via @ConditionalOnProperty (S7-B + S9-D)                       | Done; UK/US throw `UnsupportedOperationException` until country wired |
| PAY-012 | Form 16, Form 24Q export                                                                                                       | Planned (next sprint)                                                 |
| PAY-013 | Multi-currency support via `ExchangeRate` table                                                                                | Schema present; UI not wired                                          |
| PAY-014 | Year-end tax declaration submission and proof upload                                                                           | Done (`TaxDeclaration`, `TaxProof` entities, PII-encrypted via V147)  |

### 5.3 Attendance

| ID      | Requirement                                                                                 | Status       |
|---------|---------------------------------------------------------------------------------------------|--------------|
| ATT-001 | Multi-check-in / multi-check-out per day (S11-M tenant-zoned)                               | Done         |
| ATT-002 | Biometric device integration with Kafka ingest                                              | Done         |
| ATT-003 | Auto-regularization for missing punches (S11-D `AutoRegularizationScheduler` with ShedLock) | Done         |
| ATT-004 | Comp-off accrual and auto-approve (S11-M tenant-zoned)                                      | Done         |
| ATT-005 | Shift swap workflow with manager approval                                                   | Done         |
| ATT-006 | Restricted holidays with min-days-before-selection policy (S14-C TenantTimeService DI)      | Done         |
| ATT-007 | Geo-fenced punch via mobile (planned)                                                       | Schema-ready |
| ATT-008 | Bulk attendance import with CellValueSanitizer strict mode on employeeCode (S12-C)          | Done         |

### 5.4 Leave

| ID      | Requirement                                                                                                                  | Status |
|---------|------------------------------------------------------------------------------------------------------------------------------|--------|
| LEA-001 | Leave types (casual, sick, earned, comp-off, etc.) with tenant-defined accrual rules                                         | Done   |
| LEA-002 | Leave encashment with cap (`LeaveType.maxEncashableDays`, `maxEncashableAtExit`) — S4-C                                      | Done   |
| LEA-003 | Half-day request with server-side `@AssertTrue` validation and `computeLeaveDays` (S4-C)                                     | Done   |
| LEA-004 | Monthly accrual via `LeaveAccrualScheduler` with `@SchedulerLock(lockAtMostFor=PT4H)` to prevent 3-pod triple-credit (S11-D) | Done   |
| LEA-005 | Leave balance distribution dashboard with no `@Where` bypass (S13-B native-query guard)                                      | Done   |
| LEA-006 | Mid-month joiner proration                                                                                                   | Done   |

### 5.5 GDPR Data Subject Rights (DSR)

| ID      | Requirement                                                                                       | Status                                                                |
|---------|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| DSR-001 | Article 15 (Right of Access) — JSON export of all personal data                                   | Done (S9-A `DsrExportService`)                                        |
| DSR-002 | Article 17 (Right to Erasure) — anonymize PII while preserving payroll for §139A 7-year retention | Done (S9-B + S10-A)                                                   |
| DSR-003 | Article 20 (Right to Data Portability) — structured JSON with schema                              | Done                                                                  |
| DSR-004 | Article 16 (Right to Rectification) — already covered by user profile edit                        | Done (covered by self-service edit)                                   |
| DSR-005 | 30-day SLA on DSR fulfillment                                                                     | Tracked via `DsrRequest.status` + `adminNotes`; ops dashboard pending |
| DSR-006 | Artifact integrity — SHA-256 stamp on every export                                                | Done (V159)                                                           |
| DSR-007 | Anonymized accounts rejected at login + SSO                                                       | Done (S10-E)                                                          |
| DSR-008 | Soft-delete cascade on Leave, Attendance; anonymize on Employee, SalaryStructure                  | Done (S10-A)                                                          |
| DSR-009 | Audit log retention for legal hold even after erasure                                             | Done; PII in description needs legal review (handover §4.4)           |

### 5.6 Multi-tenancy

| ID     | Requirement                                                                         | Status                             |
|--------|-------------------------------------------------------------------------------------|------------------------------------|
| MT-001 | All tenant-scoped tables enforce `tenant_id` FK to `tenants(id)` ON DELETE CASCADE  | Done (212 tables across V157-V170) |
| MT-002 | Tenant context propagated via ThreadLocal + `TenantAwareTaskDecorator` for `@Async` | Done                               |
| MT-003 | Cross-tenant access strictly forbidden in service layer; verified by IDOR sweep     | Done (sprint-1)                    |
| MT-004 | Cross-tenant audit view for SUPER_ADMIN (S4-E `SystemAuditLogController`)           | Done                               |
| MT-005 | Tenant.country (V155) ISO 3166-1 alpha-2 with chk constraint                        | Done                               |
| MT-006 | Tenant.timezone (V165) IANA zone with regex check                                   | Done                               |
| MT-007 | Tenant-scoped rate limiting (S10-H per-tenant Redis Lua)                            | Done                               |
| MT-008 | Webhook dual-secret rotation per tenant (V166, S11-C)                               | Done                               |
| MT-009 | Tenant soft-deletion workflow (30-day window)                                       | **Not done** (handover §4.3)       |

---

## 6. Non-Functional Requirements

### 6.1 Performance targets

| Layer              | Metric              | Target                                 | Status                                                                          |
|--------------------|---------------------|----------------------------------------|---------------------------------------------------------------------------------|
| API p95 latency    | List endpoints      | < 300ms at 50 RPS, 500 emp tenant      | Untested at scale                                                               |
| API p99 latency    | Read endpoints      | < 800ms                                | Untested                                                                        |
| API p95 latency    | Payroll run         | < 2h end-to-end for 500 employees      | Untested                                                                        |
| Search latency p95 | Fluence wiki search | < 400ms (V152 body_text + pg_trgm GIN) | Untested                                                                        |
| First Load JS      | Dashboard route     | < 300 KB gzipped                       | Improved by S10-K (~280-360 KB drop on analytics routes)                        |
| Cold JVM startup   | Backend pod         | < 90s                                  | Configured (`startupProbe` 0+10s×30=300s budget)                                |
| Graceful shutdown  | Backend pod         | < 60s                                  | Configured (S11-F `server.shutdown=graceful`, terminationGracePeriodSeconds 60) |

### 6.2 Scalability

- **Horizontal scaling**: HPA in prod (S9-J) — backend min 3 / max 10 replicas at 70% CPU; frontend
  min 2 / max 5
- **Read replicas**: schema for `RoutingDataSource` (S6-D) — production replica gated by
  `spring.datasource.replica.url` env var; S15-B `@ConditionalOnExpression` ensures test profile
  doesn't activate it
- **Sharding**: not implemented; tenant model is row-level multi-tenancy, scale ceiling expected
  at ~100-500 tenants on single Postgres before considering shard-per-tenant

### 6.3 Reliability

- **Availability target**: 99.9% (8.76 hours downtime/year budget)
- **RTO (Recovery Time Objective)**: 4 hours per S13-E DR runbook (untested)
- **RPO (Recovery Point Objective)**: 1 hour — hourly Postgres WAL shipping + Redis snapshot every
  30min
- **Quarterly DR drill**: first Wednesday of each quarter per S13-E checklist
- **PodDisruptionBudget**: `minAvailable: 1` (S5-B + S9-J)
- **24 `@Scheduled` jobs all guarded by `@SchedulerLock`** (S11-D verified) — single-execution
  across multi-pod cluster

### 6.4 Observability

- **Metrics**: Prometheus + Grafana (S5-A runbook); Spring Actuator at `/actuator/prometheus`
- **Logs**: PiiMaskingLogstashEncoder (S9-I) for JSON-path masking — masks email/phone/PAN/Aadhaar (
  regex coverage gap noted in handover §4.9)
- **Tracing**: not yet wired (OTEL roadmap)
- **Audit**: `audit_logs` table with impersonator_id, ip, user-agent (async, with
  `TenantAwareTaskDecorator` preserving the request snapshot)
- **Health probes**:
  - liveness `/actuator/health/liveness`
  - readiness `/actuator/health/readiness`
  - startup `/actuator/health`
  - custom `RedisHealthIndicator` PING + memory + latency
- **AlertManager**: configured per S5-A; specific alert rules in `docs/runbooks/deployment.md`

### 6.5 Internationalization

- **Date display**: Mantine `DatesProvider` locale `en-IN`, first day of week = Monday, weekend =
  Sunday only (S9-G)
- **Tenant timezone**: `tenants.timezone` (V165) drives `TenantTimeService.today(tenantId)` (S11-B)
- **Currency**: INR primary; `ExchangeRate` table supports multi-currency but UI not yet wired
- **Language**: English only at present; no i18n library wired

### 6.6 Browser compatibility

- **Browserslist** in `frontend/package.json`: Chrome >=111, Safari >=16.2 (S5-H)
- **CSS color-mix**: `@supports` doc + runtime `supportsColorMix()` fallback (S5-H)

---

## 7. User Journeys

### 7.1 Employee monthly cycle

```
Day 1 (start of month)
  → Login (cookie remembers session)
  → Dashboard widgets: LeaveBalanceWidget, TimeClockWidget, WelcomeBanner
  → Punch-in (mobile or web) → AttendanceRecordService.checkIn (tenant-zoned LocalDateTime.now(IST))
  → Receive payslip notification via WebSocket → /payments
  → Download PDF payslip (Google Drive serves)

Day 5 (leave request)
  → /leave/apply
  → Mantine DateInput v8 (S10-D fix) selects dates
  → @AssertTrue isHalfDayPeriod server validation (S4-C)
  → Manager receives WebSocket notification → /leave/pending
  → Manager approves → employee notified

Day 15 (expense submission)
  → /expenses → upload receipt (multipart)
  → FileStorageService.uploadFile → CellValueSanitizer.sanitize (if CSV/Excel) → VirusScanService.scan (if enabled) → google-drive upload
  → Manager + Finance approve → reimbursement queued for next payroll

Day 30 (pulse survey)
  → Survey notification → /surveys/[id]
  → Anonymous response aggregated → analytics dashboard
```

### 7.2 HR Ops monthly payroll

```
Day -3
  → /payroll/runs → "Run Payroll" for next month
  → PayrollRunService creates DRAFT run
  → System calculates statutory for each active employee:
    StatutoryCalculatorFactory.forTenant(tenantId)
      → IndianStatutoryCalculator
        → StatutoryDeductionService (PF, ESI, PT, TDS, LWF)
  → Bonus + Loan + Expense adjustments aggregated
  → PROCESSING → PROCESSED

Day -2
  → HR Ops reviews per-employee preview
  → Edit overrides if needed
  → Approve → APPROVED status

Day -1
  → Lock the run → LOCKED status (no more edits)
  → Bank file generated (NEFT/RTGS bulk)

Day 1
  → Disbursement event published to Kafka
  → PayrollProcessedEvent → PayslipPdfService generates PDFs (lazy)
  → Push notification to each employee via STOMP + Redis fan-out
  → Form 24Q TDS filing data prepared
```

### 7.3 Recruitment to onboarding

```
Day 0: Sourcing
  → /recruitment/jobs/new → publish role
  → JobBoardIntegrationService syncs to Naukri/LinkedIn (URL-allowlisted via S10-I)
  → /recruitment/career-page renders public listing

Day 1-30: Pipeline
  → Candidate applies → ApplicantService creates Applicant + Candidate
  → ResumeParserService extracts skills via AI (LLM provider configurable, URL-allowlisted)
  → Recruiter screens, schedules interviews
  → Interviewer submits scorecard

Day 30: Offer
  → CandidateHiredEventListener fires:
    - SalaryStructure created with 40/40/20 CTC split (basic / HRA / others)
    - DocuSignApiClient sends offer letter for e-sign (S10-I URL-allowlist)
    - OfferLetterSignatureListener marks accepted/declined (S11-M tenant-zoned)

Day 45: Preboarding
  → /preboarding/portal/[token] (one-time-token-gated)
  → Candidate uploads documents (PAN, Aadhaar, bank details) → AES-GCM encrypted at rest
  → BGV check kicks off

Day 60: Onboarding
  → OnboardingManagementService creates process from role template (V154 + V156 assignee_role)
  → Tasks assigned to HR_ADMIN, IT_ADMIN, MANAGER, EMPLOYEE
  → Employee record created → moved from Candidate to Employee
  → First-day welcome email + wiki onboarding page link
```

### 7.4 GDPR DSR fulfillment

```
Day 0: Request
  → Employee → POST /api/v1/me/dsr/access
    OR /erasure / /portability / /rectification
  → DsrService persists dsr_requests row PENDING
  → Audit log written (action=CREATE, entityType=DsrRequest)
  → support@nulogic.io emailed

Day 1-29: Processing (admin)
  → SYSTEM_ADMIN → /admin/dsr/{id}/fulfill
  → DsrService.processAccessOrPortability(...) OR processErasure(...)

Access/Portability path:
  → DsrExportService.aggregate:
    User (no passwordHash/mfaSecret), Employee, AttendanceRecord (90d),
    LeaveBalance + LeaveRequest, latest active SalaryStructure,
    last 5000 AuditLog rows where requester is actor
  → 50MB cap; SHA-256 + size stamped on DsrRequest
  → Admin downloads octet-stream artifact + X-DSR-Artifact-Sha256 header
  → DsrRequest.status = COMPLETED

Erasure path:
  → Authority check (data subject OR SYSTEM_ADMIN)
  → §139A 7-year payroll legal-hold check → ANONYMIZE policy forced if true
  → UserAnonymizer wipes PII + sets anonymizedAt
  → EmployeeAnonymizer wipes name/email/phone/address/PII; preserves employeeCode + joiningDate
  → SalaryStructureAnonymizer wipes bank/IFSC/PAN; preserves amounts (§139A)
  → LeaveRecordRedactor bulk-soft-deletes LeaveRequest + LeaveBalance
  → AttendanceRecordRedactor bulk-soft-deletes AttendanceRecord
  → AuditLog STATUS_CHANGE row written; sha256(originalEmail) preserved
  → adminNotes summary with per-table row counts

Day 30: Reply to data subject
  → Audit row + artifact (if access/portability) confirms within 30-day GDPR SLA
```

---

## 8. Technical Architecture

### 8.1 Stack (locked; do not propose alternatives)

```
┌────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14 App Router, TypeScript strict)           │
│  - Mantine UI 8 + Tailwind                                     │
│  - React Query (server state)                                  │
│  - Zustand (client state)                                      │
│  - Tiptap (rich-text, lazy-loaded)                             │
│  - Recharts (analytics, lazy-loaded per S10-K)                 │
│  - STOMP + SockJS over WebSocket                               │
└────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌────────────────────────────────────────────────────────────────┐
│  Ingress (GKE managed-cert + CloudArmor)                       │
│  Helm: deployment/helm/hrms/                                   │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  Backend (Java 21, Spring Boot 3.5.14)                         │
│  - Spring Security 6.5 (JWT, SAML, OAuth)                      │
│  - Spring Data JPA + Hibernate 6.6                             │
│  - Spring Kafka                                                │
│  - Spring Data Elasticsearch                                   │
│  - Spring Cache (Redis backed, 20+ named caches)               │
│  - Spring WebSocket (STOMP)                                    │
│  - SpringDoc OpenAPI 2.8.0                                     │
│  - ShedLock (24 jobs)                                          │
│  - Flyway 11 (162 migrations)                                  │
│  - Bucket4j 8.7 (rate limiting fallback)                       │
│  - JJWT 0.12.6                                                 │
│  - Apache POI 5.4.1, OpenPDF 2.2.2, Tika 3.3.0                 │
└────────────────────────────────────────────────────────────────┘
              ↓                ↓               ↓               ↓
┌──────────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────┐
│  PostgreSQL 16   │  │   Redis 7   │  │   Kafka    │  │   ES     │
│  Neon (dev)      │  │  Lettuce    │  │ Confluent  │  │  8.11    │
│  CloudSQL (prod) │  │             │  │   7.6      │  │          │
└──────────────────┘  └─────────────┘  └────────────┘  └──────────┘
                              ↓
                    ┌──────────────────┐
                    │  Google Drive    │
                    │  (file storage)  │
                    └──────────────────┘
```

### 8.2 Backend layering

```
api/             — REST controllers (179)
application/     — Business services (237) + DTOs + listeners + schedulers
domain/          — JPA entities (315), extends TenantAware/BaseEntity
infrastructure/  — Repository interfaces (Spring Data JPA)
common/
├── config/      — Spring @Configuration beans
├── security/    — Filters, cookie util, data scope, lockout
├── util/        — TenantTimeService, UrlAllowlistValidator, CellValueSanitizer
├── logging/     — PII masking converters/encoders
├── exception/   — Global handler
├── entity/      — TenantAware, BaseEntity
└── converter/   — EncryptedStringConverter (AES-GCM-256)
config/          — WebSocketConfig (STOMP), CacheConfig
```

### 8.3 Frontend layering

```
app/                   — Next.js App Router pages (261 routes)
components/
├── layout/            — AppLayout, Sidebar, TopBar, Breadcrumbs
├── ui/                — Generic components
├── dashboard/         — Widgets
├── auth/              — AuthGuard, login flows
├── notifications/     — NotificationBell, WebSocketProvider
└── <module>/          — Per-module components

lib/
├── api/               — Axios client + interceptors
├── hooks/             — Custom React hooks
├── stores/            — Zustand stores
├── utils/             — Helpers (safeStorage, export.ts, supportsColorMix)
└── types/             — TypeScript types

e2e/                   — Playwright specs (S5-F: 5 specs covering expense, payroll, wiki-lock, file-upload, bruteforce)
```

### 8.4 Critical infrastructure components

| Component                   | Purpose                                                                                  | Sprint                  |
|-----------------------------|------------------------------------------------------------------------------------------|-------------------------|
| `JwtAuthenticationFilter`   | Cookie/Bearer auth, anonymized-principal reject, dual-name reader for `__Host-` rollover | S1, S10-E, S10-J, S11-I |
| `TenantFilter`              | Sets `TenantContext` ThreadLocal from JWT claim                                          | S1                      |
| `RateLimitingFilter`        | Per-IP, per-user, per-tenant via DistributedRateLimiter                                  | S2, S10-H, S11-I        |
| `CsrfDoubleSubmitFilter`    | Double-submit cookie pattern, SameSite=Strict (S11-J)                                    | S1, S11-J               |
| `TenantStatusCache`         | 30s Caffeine cache so JwtFilter doesn't hit PG every request                             | S3-C                    |
| `TenantAwareTaskDecorator`  | Propagates tenant context to `@Async`                                                    | S3-C                    |
| `ShedLockConfig`            | LockProvider for 24 @Scheduled jobs                                                      | S11-D                   |
| `RoutingDataSourceConfig`   | Read replica routing keyed by `isCurrentTransactionReadOnly()`                           | S6-D, S15-B             |
| `WebSocketConfig`           | STOMP broker + @Lazy RedisWebSocketRelay (cycle fix)                                     | S11-F, S15-A            |
| `RedisWebSocketRelay`       | Pub/Sub multi-pod fan-out                                                                | S1 + sprint-3           |
| `CookieConfig`              | Centralized cookie creation (`__Host-` + legacy, CSRF)                                   | S10-J, S11-J            |
| `EncryptedStringConverter`  | AES-GCM-256 at-rest for PII columns                                                      | S1, S5-E                |
| `PiiMaskingLogstashEncoder` | JSON log path masking                                                                    | S9-I                    |

---

## 9. Data Model

### 9.1 Core entities

| Entity                                                                        | Description                                                                                                                                    | PII status                           |
|-------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| `Tenant`                                                                      | The tenant row. Has `code`, `name`, `status`, `country` (V155, ISO 3166-1 alpha-2), `timezone` (V165, IANA), settings                          | None                                 |
| `User`                                                                        | Authentication identity. Email, password hash (BCrypt), MFA secret (encrypted), failed login attempts, locked until, password reset token hash | High                                 |
| `Employee`                                                                    | HR profile. Linked 1:1 to User. firstName, lastName, dob, address (encrypted), bank details (encrypted), emergency contact (encrypted)         | High                                 |
| `Department`, `Designation`, `Position`, `OrganizationUnit`, `OfficeLocation` | Org structure                                                                                                                                  | Low                                  |
| `SalaryStructure` + `SalaryComponent` + `SalaryRevision`                      | Compensation. Versioned with effective dates                                                                                                   | Medium (bank, PAN encrypted)         |
| `PayrollRun` + `Payslip` + `PayrollAdjustment`                                | Monthly cycle records                                                                                                                          | Medium                               |
| `AttendanceRecord` + `RegularizationRequest` + `ShiftSwapRequest`             | Time data                                                                                                                                      | Low                                  |
| `LeaveType` + `LeaveBalance` + `LeaveRequest`                                 | Leave management                                                                                                                               | Low                                  |
| `ExpenseClaim` + `ExpenseItem` + `ExpensePolicy` + `MileageLog`               | Reimbursements                                                                                                                                 | Low                                  |
| `EmployeeLoan` + `LoanRepayment`                                              | Loans against payroll                                                                                                                          | Medium                               |
| `Contract` + `ContractVersion` + `ContractSignature`                          | Employment + customer contracts                                                                                                                | High                                 |
| `Asset` + `AssetAllocation` + `AssetRecovery` + `AssetMaintenance`            | Hardware tracking                                                                                                                              | Low                                  |
| `DsrRequest`                                                                  | GDPR request intake                                                                                                                            | Low                                  |
| `AuditLog` + `SystemAuditLog`                                                 | Compliance trail (retained for legal hold)                                                                                                     | Medium (description may contain PII) |
| `WikiPage` + `WikiSpace` + `WikiPageVersion` + `WikiPageComment`              | Knowledge base                                                                                                                                 | None                                 |
| `BlogPost` + `BlogCategory` + `BlogComment`                                   | Long-form content                                                                                                                              | None                                 |
| `WallPost` + `WallPostReaction` + `WallPostComment`                           | Company-wide feed                                                                                                                              | Low                                  |
| `Webhook` + `WebhookDelivery`                                                 | Outbound integration (HMAC dual-secret per V166)                                                                                               | Low                                  |
| `Notification` + `MultiChannelNotification` + `NotificationTemplate`          | In-app, email, SMS, push fanout                                                                                                                | Medium                               |

### 9.2 Soft delete

All `TenantAware` entities use `@Where(clause = "is_deleted = false")` + `is_deleted` column +
`deleted_at` timestamp. Soft delete is the default; hard delete is reserved for
cascade-via-tenant-deletion only. **Native @Query bypasses @Where** — S12-F audit found 19 such
leaks, S13-B closed all 15 deferred; all 19 now guarded with `// SOFT_DELETE_GUARD` markers.

### 9.3 Encryption at rest

PII columns use `@Convert(converter = EncryptedStringConverter.class)` with AES-GCM-256 via
`APP_SECURITY_ENCRYPTION_KEY` env. Covered: `User.mfaSecret`, `Employee.personalEmail`,
`Employee.phoneNumber`, `Employee.emergencyContactNumber`, `Employee.dateOfBirth`,
`Employee.address*`, `Employee.bankAccountNumber`, `Employee.bankIfscCode`, `Employee.taxId`,
`BenefitDependent.*` (6 cols), `TaxDeclaration.PAN`. Backfill service available (S5-E
`EncryptionBackfillService`).

### 9.4 Tenant FK coverage

V157, V158, V161, V162, V163, V164, V167, V168, V170 add explicit `tenant_id` FK constraints on 212
tables. All `ON DELETE CASCADE`. Guards via `information_schema` lookups for both constraint and
table — idempotent + safe across downstream branches. **Caveat**: silent skip if table not present;
real prod coverage requires `flyway info` audit.

---

## 10. Security & Compliance

### 10.1 Authentication & authorization

- **JWT** in httpOnly Secure SameSite=Lax cookie (Path=/)
- **`__Host-` prefix** dual-emit ready (S10-J + S11-I + S11-J); feature flag
  `app.cookie.use-host-prefix` default `false`
- **CSRF** double-submit cookie with `SameSite=Strict` (S11-J via `CookieConfig.createCsrfCookie`)
- **BCrypt** password hashing (cost 12)
- **MFA** via TOTP, secret AES-GCM encrypted
- **SAML 2.0** + **Google OAuth** via Spring Security
- **Impersonation** with auditable JTI claim (S4-E)
- **Anonymized account reject** at JWT filter + SSO callback (S10-E)

### 10.2 Defense in depth

- **OWASP A01 (Broken Access Control)**: IDOR sweep per controller (sprint-1, sprint-2 ExpenseClaim,
  sprint-3 DataScope strict allowlist)
- **OWASP A02 (Cryptographic Failures)**: AES-GCM-256 at rest; JWT HMAC-SHA-256 with 256-bit secret
- **OWASP A03 (Injection)**:
  - SQL injection: 100% prepared statements (Spring Data JPA + parameterized native queries)
  - Formula injection: `CellValueSanitizer` on import (S12-C, caveat at handover §4.7); sprint-3
    export-side guard in `ExportService` + `CsvExportService`
  - XSS: React's default escaping; CSP `strict-dynamic` header (sprint-1)
- **OWASP A04 (Insecure Design)**: rate limit per IP/user/tenant; account lockout; idempotency keys
  on Kafka consumers
- **OWASP A05 (Misconfiguration)**: actuator endpoints scoped; profile-aware properties; S11-P
  resolved Spring Security 6.5 deprecations
- **OWASP A07 (Auth Failures)**: reCAPTCHA after 3 attempts (S12-J, flag-gated); password history of
  5; 90-day max age
- **OWASP A08 (Software & Data Integrity)**: Cosign keyless image signing (S8-C); Kyverno admission
  policies
- **OWASP A09 (Logging Failures)**: PII masking in plain-text + JSON log paths (S7-D + S9-I)
- **OWASP A10 (SSRF)**: `UrlAllowlistValidator` on webhook delivery + DocuSign + Slack + integration
  services (sprint-1 + S10-I)

### 10.3 Rate limiting

- **5/min** on auth endpoints (login, register, password reset)
- **100/min** per user on general API
- **5/5min** on export endpoints
- **Per-tenant** Redis Lua via `DistributedRateLimiter.tryConsumePerTenant` (S10-H) — default 1000
  req/min per tenant per resource

### 10.4 GDPR compliance

| Article                             | Implementation                                                                           |
|-------------------------------------|------------------------------------------------------------------------------------------|
| Article 6 (Lawful basis)            | Documented per data category — employment contract, consent, legal obligation            |
| Article 9 (Special categories)      | Health (sick leave) + biometrics (punch) — encrypted at rest, access-logged              |
| Article 15 (Right of access)        | `DsrExportService` (S9-A) — JSON export within 30 days                                   |
| Article 16 (Right of rectification) | Covered by self-service profile edit                                                     |
| Article 17 (Right of erasure)       | `DsrErasureService` cascade (S9-B + S10-A); partial — audit_logs retained for legal hold |
| Article 20 (Data portability)       | `DsrExportService` portability envelope with schema                                      |
| Article 25 (DP by design)           | Encryption at rest, RBAC, audit trail, soft delete                                       |
| Article 30 (Records of processing)  | Audit logs + DSR request rows                                                            |
| Article 32 (Security of processing) | TLS in transit, AES-GCM at rest, MFA, rate limiting                                      |
| Article 33 (Breach notification)    | 24h SLA documented in DR runbook (S13-E)                                                 |

### 10.5 Indian compliance

| Statute                                | Implementation                                                                           |
|----------------------------------------|------------------------------------------------------------------------------------------|
| **EPF Act 1952**                       | PF deduction at 12% capped at Rs.15k basic                                               |
| **ESI Act 1948 + Regulation 40**       | ESI 0.75% employee + 3.25% employer; contribution period semantics                       |
| **Professional Tax**                   | State-specific brackets (Karnataka inclusive thresholds, Maharashtra gender-aware)       |
| **Income Tax Act §139A**               | 7-year retention on payroll records (enforces ANONYMIZE over HARD_DELETE in DSR erasure) |
| **Income Tax Act §87A**                | Tax rebate handling in TDS calculation                                                   |
| **Payment of Gratuity Act 1972 §4(2)** | 240-day rule for gratuity eligibility; F&F automatic calculation                         |
| **Payment of Bonus Act 1965**          | §1(3)(ii), §10, §11, §12, §13 bonus calc (S6-C `BonusCalculationService`)                |
| **Labour Welfare Fund**                | State-specific LWF deduction                                                             |
| **DPDP Act 2023**                      | §9 data principal rights via DSR endpoints                                               |

### 10.6 SOC 2 readiness (not certified)

- Audit trail with impersonator_id ✓
- Encryption at rest ✓
- Access control + RBAC ✓
- Logging + monitoring ✓ (Prometheus + Grafana)
- Backup + recovery ✓ (S5-A runbook)
- DR drill (S13-E) — first drill pending
- Pen test — not yet performed
- 3rd-party SOC 2 audit — not scoped

---

## 11. Integrations

| Integration                      | Direction                                | Status                                                                                                             |
|----------------------------------|------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **Google Workspace**             | inbound (SSO) + outbound (Drive storage) | Active                                                                                                             |
| **Google Drive**                 | outbound file storage                    | Active (`GoogleDriveStorageProvider`, tenant-isolated via V143 `drive_file_mapping`)                               |
| **Google Calendar**              | bidirectional event sync                 | Wired, opt-in                                                                                                      |
| **DocuSign**                     | outbound e-signature                     | Active (`DocuSignApiClient` + `DocuSignAuthService`, SSRF-validated per S10-I)                                     |
| **Slack**                        | outbound notifications                   | Active (`SlackNotificationService` + `SlackCommandService`, URL-allowlisted per S10-I)                             |
| **SAML 2.0**                     | inbound enterprise SSO                   | Active (`DynamicSamlRelyingPartyRegistrationRepository`)                                                           |
| **Keka**                         | inbound bulk migration                   | Active (`KekaImportService` + `KekaMigrationService` via Excel/CSV)                                                |
| **Naukri / LinkedIn job boards** | outbound posting                         | Wired, configurable                                                                                                |
| **Twilio SMS**                   | outbound MFA + critical alerts           | Wired, mock mode in dev                                                                                            |
| **SMTP (any)**                   | outbound email                           | Active (`EmailService` + `EmailNotificationService` with multipart/alternative + List-Unsubscribe header per S4-A) |
| **OpenAI / configurable LLM**    | outbound AI chat, resume parsing         | Active (S9-A removed mock fallback; tokens tracked via `AiUsageService`)                                           |
| **ClamAV**                       | outbound antivirus                       | Wired, daemon required in prod (S10-L)                                                                             |
| **reCAPTCHA v3**                 | outbound bot detection                   | Wired, keys required in prod (S12-J)                                                                               |
| **Webhooks**                     | outbound to customer endpoints           | Active with HMAC dual-secret rotation per V166 + S11-C                                                             |

---

## 12. Statutory Compliance (India)

### 12.1 Payroll calculation order

```
For each employee in payroll run:
  1. Resolve current SalaryStructure (effective date <= run date, endDate honored per S4-F)
  2. StatutoryCalculatorFactory.forTenant(tenantId) → IndianStatutoryCalculator
  3. Compute:
     a. Basic salary (typically 40% of CTC per 40/40/20 split)
     b. HRA (typically 40% of CTC)
     c. Other allowances (20%)
     d. PF employee: 12% × min(basic, 15000) — capped per EPF Act
     e. PF employer: 12% × min(basic, 15000) — split EPS + EPF
     f. ESI: 0.75% employee + 3.25% employer if gross ≤ 21k/month
     g. PT: state-specific brackets (Karnataka inclusive, Maharashtra gender-aware)
     h. TDS: monthly proration of annual liability with §87A rebate
     i. LWF: state-specific flat or proportional
  4. Apply bonus per Payment of Bonus Act 1965 (S6-C BonusCalculationService) if applicable
  5. Net deductions: loan EMIs (PayrollIntegrationListener)
  6. Net additions: expense reimbursements (PayrollIntegrationListener)
  7. Generate Payslip + persist PayrollAdjustment rows
  8. After APPROVED+LOCKED: render PDF, upload to Google Drive, notify employee
```

### 12.2 F&F settlement

`FnFCalculationService` (S4-B) computes:

- Pending salary
- Leave encashment (capped by `LeaveType.maxEncashableAtExit`)
- Gratuity (Payment of Gratuity Act 1972 §4(2)) —
  `Period.between(joiningDate, lastWorkingDate).getYears() * 15 * lastBasic / 26` IF 240-day rule
  satisfied AND >= 5 years
- Notice period recovery (if employee under contract)
- Asset recovery (deduction for unreturned assets)
- Loan settlement (remaining principal)
- Final TDS adjustment

---

## 13. AI & Automation Features

### 13.1 Current AI features

| Feature                           | Sub-app           | Implementation                                                                                                                                                         |
|-----------------------------------|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Wiki AI chat**                  | NU-Fluence        | `LlmStreamingService` + `FluenceContentRetriever` — retrieval-augmented over wiki + blog `body_text` (V152) using native EM queries (post S12-F SOFT_DELETE_GUARD fix) |
| **Resume parsing**                | NU-Hire           | `ResumeParserService` calls LLM, extracts skills + experience; PII guardrails per S10-I URL allowlist + S9-A "no mock fallback" honesty                                |
| **Interview question generation** | NU-Hire           | `InterviewGenerationService` — role-aware; EEOC guardrails on prompt (sprint-3)                                                                                        |
| **Sentiment analysis**            | NU-Grow analytics | `sentiment_analysis` table populated from pulse surveys + 360 feedback                                                                                                 |
| **Attrition prediction**          | NU-Grow analytics | `attrition_predictions` table (ML model integration TBD)                                                                                                               |
| **Workforce trends**              | NU-Grow analytics | `workforce_trends` table populated from headcount + churn data                                                                                                         |
| **Smart recommendations**         | NU-Grow analytics | `smart_recommendations` table (e.g. course suggestions)                                                                                                                |

### 13.2 AI usage tracking

`AiUsageLog` table records every LLM call with tenant, user, model, tokens (prompt + completion),
cost (computed via `AiUsageService.estimateCost`). Backfill range supported. Used for chargeback +
abuse detection.

### 13.3 Honest AI behavior policy

Per sprint-3 decision: **no mock LLM fallback in production**. If the configured LLM provider is
unreachable, the API returns an error rather than fabricating output. `AiUsageLogRepository` writes
are mandatory before successful response. This is a hard product principle to prevent silent
hallucination in HR-critical contexts.

---

## 14. Roadmap & Phasing

### 14.1 Past (delivered through Sprint 15)

| Wave       | Quarter    | Themes                                                                                                                       |
|------------|------------|------------------------------------------------------------------------------------------------------------------------------|
| Sprint 1-3 | Q1 2026    | Security baseline — auth, IDOR, injection, SSRF, encryption, multi-tenant hardening                                          |
| Sprint 4-8 | Q1-Q2 2026 | Legal P0, statutory engine, GDPR DSR scaffold, Helm hardening, OpenAPI annotations, browser-compat                           |
| Sprint 9   | Q2 2026    | GDPR Art. 15/17/20 execution, Tenant.country, webhook dual-secret, PiiMaskingLogstashEncoder                                 |
| Sprint 10  | Q2 2026    | Art.17 cascade, SSRF allowlist, `__Host-` cookies, virus scan, reCAPTCHA, a11y, bundle analysis                              |
| Sprint 11  | Q2 2026    | Wave-10 P0s closed, tenants.timezone, ShedLock verification, graceful shutdown, cookie reader migration                      |
| Sprint 12  | Q2 2026    | Wave-10 P1/P2 closed, final FK push (194/208 = 93%), JVM heap tuning, Kafka idempotency, Helm warnings, Excel import guard   |
| Sprint 13  | Q2 2026    | V170 FK (212 cum.), soft-delete leak closure, DR runbook, reCAPTCHA tests, Boot 3.5 precheck                                 |
| Sprint 14  | Q2 2026    | Spring Boot 3.4.5 → 3.5.14, TenantTimeService DI sweep, DSR test scaffolds                                                   |
| Sprint 15  | Q2 2026    | WebSocketConfig cycle fix, RoutingDataSource test guard, Specification.where + DaoAuthenticationProvider deprecation cleanup |

### 14.2 Near-term (next 4 weeks per handover §7)

| Week   | Focus                                                                                                                                                                      |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Week 1 | Validation: end-to-end `mvn test`, full stack `docker-compose up`, smoke-test 20 endpoints, `__Host-` cookie staging flip, fuzz `UrlAllowlistValidator`, ClamAV EICAR test |
| Week 2 | Hardening: top 5 issues from handover §6, DR drill #1, legal review of audit-log PII retention                                                                             |
| Week 3 | Roll-forward: PR-split strategy, merge sprints 1-3 + 9 + 11 + 13 as discrete PRs, squash remainder                                                                         |
| Week 4 | Production: tag RC, staging Helm deploy, 7-day soak test, prod deploy with `__Host-` flag OFF, prod flag flip after 7-day window                                           |

### 14.3 Mid-term (Q3 2026)

- **First external tenant onboarded** (target G2 from §2.2)
- **UK/US statutory calculators** wired (S7-B `StatutoryCalculator` strategy seam is ready)
- **Mobile native apps** (React Native — currently web mobile-responsive only)
- **OpenTelemetry instrumentation** end-to-end (currently Prometheus metrics only)
- **Form 16 + Form 24Q** statutory export
- **Real-time analytics dashboard** with WebSocket-driven updates

### 14.4 Long-term (Q4 2026 - Q1 2027)

- **Tenant-per-schema** migration option for high-security customers
- **Multi-region active-active** deployment
- **SOC 2 Type II** certification
- **ISO 27001** certification
- **AI-powered employee assistant** integrated across all 4 sub-apps (cross-aggregate reasoning)
- **Custom-app marketplace** within the Bundle App framework

---

## 15. Risks & Mitigations

| #   | Risk                                                               | Likelihood | Impact       | Mitigation                                                                   |
|-----|--------------------------------------------------------------------|------------|--------------|------------------------------------------------------------------------------|
| R1  | Branch reviewer fatigue from 16-commit sprint push                 | High       | Medium       | PR-split strategy in handover §4.13; squash-merge as fallback                |
| R2  | Multi-tenant data leak via uncovered async path (WebSocket fanout) | Low        | Critical     | Cross-tenant audit (handover §4.8); production STOMP test                    |
| R3  | Payroll calculation regression due to statutory rule change        | Medium     | Critical     | Strategy seam (S7-B); unit-test coverage per `StatutoryDeductionServiceTest` |
| R4  | GDPR DSR not within 30-day SLA                                     | Medium     | High         | DSR dashboard with deadline alerting (planned); admin runbook                |
| R5  | Tenant deletion cascades wrong data                                | Low        | Catastrophic | Soft-tenant-deletion workflow (handover §6 priority 8)                       |
| R6  | Boot 3.5 runtime surprise at scale                                 | Low        | High         | Staging soak test (handover §7 week 4)                                       |
| R7  | First DR drill exposes RTO miss                                    | Medium     | Medium       | First drill planned per S13-E; iterate before customer SLA commits           |
| R8  | Audit-log PII fails legal review under DSR                         | Medium     | High         | Legal review scheduled (handover §6 priority 11)                             |
| R9  | LLM provider outage drops AI features (no mock fallback)           | High       | Low          | Documented as feature, not bug; honest behavior is product principle         |
| R10 | Migration drift between Neon (dev) and CloudSQL (prod)             | Low        | Medium       | Flyway baseline check in CI; periodic prod schema dump diff                  |
| R11 | Single-Postgres scaling ceiling at ~500 tenants                    | Low        | High         | Sharding research in roadmap §14.4 (Q4-Q1)                                   |
| R12 | Cookie `__Host-` flag flip breaks 3rd-party iframe embed           | Low        | Medium       | Default OFF; staged rollout per handover §7 week 4                           |

---

## 16. Out of Scope

Explicitly NOT in NU-AURA today:

- **Marketing CRM** (use HubSpot)
- **Customer support ticketing** for end users (use Zendesk; internal helpdesk is in scope)
- **ERP / accounting** (use Tally, Zoho Books)
- **Project management for client deliverables** (use Jira; project timesheets are in scope for
  billing)
- **Public-facing marketing site** (separate Next.js project)
- **Tenant-controlled custom workflows** (BPMN engine deferred; workflow_definitions today are
  NULogic-managed)
- **Native mobile** (responsive web only at present; React Native in roadmap §14.3)

---

## 17. Open Questions

| #   | Question                                                                                 | Owner                |
|-----|------------------------------------------------------------------------------------------|----------------------|
| Q1  | Audit-log retention vs Art.17 erasure tradeoff — what's the legal-defensible policy?     | Legal + Engineering  |
| Q2  | When do we flip `app.cookie.use-host-prefix=true` in prod? After staging soak. Date TBD. | Platform             |
| Q3  | First DR drill date — quarterly cadence starting from which quarter?                     | SRE                  |
| Q4  | Tenant deletion workflow — soft delete window 30 days, but who can initiate?             | Product + Compliance |
| Q5  | LLM provider lock-in — OpenAI primary today, fallback strategy?                          | AI Eng               |
| Q6  | Statutory engine UK/US — actual deployment timeline contingent on first non-IN tenant    | Product + Eng        |
| Q7  | Mobile native apps — React Native vs Flutter vs maintain responsive web?                 | Mobile Eng           |
| Q8  | SOC 2 Type II — internal target Q4 2026 or wait for first customer ask?                  | Compliance           |
| Q9  | When do we deprecate `@MockBean` fully and require `@MockitoBean`? (Boot 4.0 forces it)  | Platform             |
| Q10 | TenantTimeService deeper DI sweep — finish in S16 or backfill incrementally?             | Platform             |

---

## 18. Appendix

### 18.1 Glossary

- **Bundle App**: NULogic's term for a parent app composed of multiple sub-apps with shared auth +
  tenant model
- **Tenant**: A customer organization (or NULogic itself); isolated at the row level via `tenant_id`
  UUID
- **DataScope**: Strict allowlist semantics for visibility (ALL / LOCATION / DEPARTMENT / TEAM /
  SELF / CUSTOM)
- **DSR**: Data Subject Request (GDPR Articles 15, 16, 17, 20)
- **CTC**: Cost to Company — the total annual compensation including basic + HRA + other
  allowances + employer PF
- **F&F**: Full and Final settlement on exit
- **EPF**: Employees' Provident Fund (Indian retirement)
- **ESI**: Employees' State Insurance (Indian health)
- **PT**: Professional Tax (state-level Indian tax)
- **TDS**: Tax Deducted at Source (Indian withholding tax)
- **LWF**: Labour Welfare Fund (Indian state-level)
- **Gratuity**: Lump-sum payment on exit per Payment of Gratuity Act 1972
- **Form 16**: Annual TDS certificate issued to employees in India
- **Form 24Q**: Quarterly TDS return filed by employer in India
- **`@Where`**: Hibernate annotation for soft-delete filtering at the entity level
- **ShedLock**: Library for distributed lock on `@Scheduled` jobs across multi-pod deployments

### 18.2 Reference documents (in-repo)

- **Architecture**: `docs/architecture/Backend.md`, `erd.md`, `security-controls.md`,
  `sprint-history.md`
- **API**: `docs/api/external-api-guide.md`, `webhook-payload-reference.md`, `api-quick-start.md`
- **Runbooks**: `docs/runbooks/deployment.md`, `rollback.md`, `key-rotation.md`,
  `tenant-lifecycle.md`, `backup-restore.md`, `disaster-recovery.md`, `dr-drill-checklist.md`
- **Audit**: `docs/audit/wave-10-deep-audit-report.md`, `kafka-idempotency-audit.md`,
  `soft-delete-native-query-audit.md`, `spring-boot-3.4-to-3.5-upgrade-precheck.md`
- **Handover**: `docs/handover/PROJECT-HANDOVER.md` (companion to this PRD — contains validation
  gaps and known caveats)

### 18.3 Reference documents (external)

- OWASP Top 10 — https://owasp.org/www-project-top-ten/
- GDPR text — https://eur-lex.europa.eu/eli/reg/2016/679/oj
- India DPDP Act 2023
- Income Tax Act 1961 (India)
- Payment of Gratuity Act 1972 (India)
- Payment of Bonus Act 1965 (India)
- EPF & MP Act 1952 (India)
- ESI Act 1948 (India)
- Spring Boot 3.5 release notes
- Spring Security 6.5 reference

---

**End of PRD v1.0.** This document is a living artifact; bump version on any structural change. The
companion `PROJECT-HANDOVER.md` is authoritative on validation gaps and known caveats — read both
before making product or engineering decisions.
