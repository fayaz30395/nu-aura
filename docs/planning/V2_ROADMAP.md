# NU-AURA V2 Roadmap — Gap Analysis & Feature Plan

**Date:** March 25, 2026
**Prepared By:** AI Engineering Partner
**Baseline:** NU-AURA V1.0 (main branch, commit b2d4e409)
**Benchmark:** KEKA HRMS (India-first HRIS market leader)

---

## Executive Summary

NU-AURA V1.0 is a production-ready bundle app platform covering approximately **85% of KEKA HRMS features**. The platform exceeds KEKA in several areas (LMS, 9-Box Grid, social feed, wellness, preboarding, approval engine architecture) but has critical gaps in **mobile access, India statutory depth, GPS attendance, and biometric integration** that must be closed for market parity.

### Coverage by Sub-App

| Sub-App | V1 Coverage | Key Gaps |
|---------|-------------|----------|
| **NU-HRMS** | ~95% | Statutory depth, GPS attendance, mobile, audit trail UI |
| **NU-Hire** | ~92% | Employee referral portal UI, candidate detail enrichment |
| **NU-Grow** | ~90% | 1-on-1 meetings UI, succession planning, skills matrix |
| **NU-Fluence** | ~75% | Wiki/blog built; Drive, Search, Templates partially wired to API; mock data fallback remains |

### Effort Key

| Size | Days | Description |
|------|------|-------------|
| **XS** | 1-2 | Config change, permission fix, redirect |
| **S** | 3-5 | Single page, bug fix, small feature |
| **M** | 5-10 | Multi-page module, integration |
| **L** | 10-20 | Full module build, complex feature |
| **XL** | 20-40 | Platform capability, cross-cutting concern |

---

## 1. Critical Gaps (Must Fix for V2 Launch)

### 1.1 Mobile App / PWA

- **Current:** No mobile app. Backend has full mobile API layer (5 controllers: `MobileApprovalController`, `MobileDashboardController`, `MobileLeaveController`, `MobileNotificationController`, `MobileSyncController`) with dedicated services and DTOs. Frontend has an admin mobile-API config page (`/admin/mobile-api`).
- **KEKA:** Native iOS + Android apps with offline support.
- **Recommendation:** Phase 1: Progressive Web App (service worker, add-to-homescreen, offline cache). Phase 2: React Native wrapper consuming existing mobile API endpoints.
- **Evidence:** `backend/src/main/java/com/hrms/api/mobile/` — 5 controllers, 5 services, 5 DTOs all built. `frontend/app/admin/mobile-api/page.tsx` — admin config page exists.
- **Effort:** XL (PWA: L, Native: XL)
- **Priority:** P0

### 1.2 India Statutory Compliance Depth

- **Current:** `/statutory` page (365 lines) shows PF/ESI/PT configuration. `/payroll/statutory` (390 lines) shows statutory contributions. Backend has `ESIController`, `ProfessionalTaxController`, `ProvidentFundController`, `StatutoryContributionController`, `TDSController`. `/compliance` page is a **placeholder** (22 lines, "coming soon" text only).
- **Missing:**
  - ECR file generation (PF electronic challan-cum-return)
  - Form 16 / Form 16A PDF generation
  - Form 24Q quarterly TDS return
  - LWF (Labour Welfare Fund) calculation engine
  - PF/ESI monthly remittance file generation
  - PT slab auto-calculation per state
  - Statutory reports (PF register, ESI register)
- **KEKA:** Deep statutory automation is their core strength — automated ECR, Form 16, 24Q, investment proofs, LWF.
- **Effort:** L
- **Priority:** P0

### 1.3 GPS / Geofencing Attendance

- **Current:** Clock-in/out works, but attendance page shows "Location unavailable". `MobileAttendanceController` exists in backend. No geofencing logic in frontend or backend.
- **KEKA:** GPS tracking, geofencing (define office perimeters), route tracking for field staff.
- **Recommendation:** Add browser Geolocation API on clock-in, store coordinates, define geofence polygons per office location in `/admin/office-locations`.
- **Effort:** L
- **Priority:** P0

### 1.4 Biometric Device Integration

- **Current:** Not implemented. No controller or service for biometric data ingestion.
- **KEKA:** Integrates with 200+ biometric devices via ADMS protocol.
- **Recommendation:** Build a biometric webhook endpoint that receives punch data from devices. Standard protocol: ZKTeco ADMS or generic REST push.
- **Effort:** L
- **Priority:** P1

### 1.5 Compliance Module (Placeholder)

- **Current:** `/compliance` is a 22-line placeholder page with "coming soon" text.
- **Backend:** `ComplianceController` exists.
- **Need:** Full compliance dashboard: statutory checklist, labor law adherence tracker, regulatory filing calendar, audit readiness score.
- **Effort:** M
- **Priority:** P1

---

## 2. Feature Gaps vs KEKA

### 2.1 1-on-1 Meetings Module

- **Current:** Backend has `OneOnOneMeetingController` and `MeetingController` with service layer. Frontend has `lib/types/meeting.ts` and `lib/services/meeting.service.ts`. **No dedicated frontend page exists.**
- **KEKA:** Dedicated 1-on-1 module with agenda templates, action items, recurring scheduling.
- **Need:** `/meetings` or `/performance/1-on-1` page with meeting list, create/schedule, agenda builder, action item tracking.
- **Effort:** M
- **Priority:** P1

### 2.2 Bank File Generation (Salary Disbursement)

- **Current:** Payroll processing exists, but no bank file export (NEFT/RTGS/IMPS formats for Indian banks, ACH for US banks).
- **KEKA:** Direct bank file generation for all major Indian banks.
- **Need:** Bank format templates (SBI, HDFC, ICICI, etc.), file generation on payroll run completion, download as text/CSV.
- **Effort:** M
- **Priority:** P1

### 2.3 Shift Management UI Enhancement

- **Current:** `/admin/shifts` page exists (shift configuration). `/attendance/shift-swap` page exists. `ShiftManagementController` and `ShiftSwapController` in backend.
- **Missing:** Shift roster/scheduling calendar (visual weekly/monthly shift assignment view), auto-rotation rules, shift allowance configuration.
- **KEKA:** Full shift scheduling with rotation, swap requests, and allowance tracking.
- **Effort:** M
- **Priority:** P2

### 2.4 White-Labeling / Tenant Branding

- **Current:** Single NU-AURA branding. No tenant-level theme customization.
- **KEKA:** Tenant can upload logo, set brand colors, customize login page.
- **Need:** Tenant settings page for logo, primary color, login background, email template branding.
- **Effort:** M
- **Priority:** P2

### 2.5 Accounting Software Integration

- **Current:** Integration framework exists (`IntegrationConnectorController`, connector config panel). No accounting connectors.
- **KEKA:** Tally, Zoho Books, QuickBooks integrations.
- **Need:** Build connectors for Tally (journal voucher export), Zoho Books, QuickBooks. Use existing connector framework.
- **Effort:** L (per connector: S)
- **Priority:** P2

### 2.6 Advanced Leave Features

- **Current:** 7 leave types (EL, CL, SL, PL, BL, CO, LOP) with balance tracking, apply/approve flow. Leave types configurable in `/admin/leave-types`.
- **Missing:**
  - Sandwich rule enforcement (auto-deduct weekends/holidays between leave days)
  - Restricted holidays (optional holidays from a pool)
  - Leave encashment calculation engine
  - Carry-forward rules with max cap
  - Negative balance policy configuration
- **KEKA:** All of the above are core features.
- **Effort:** M
- **Priority:** P1

### 2.7 Employee Referral Portal

- **Current:** Backend has full referral system (`ReferralController`, `ReferralService`, `EmployeeReferral` entity, `ReferralPolicy` entity with repository). Frontend has only a `CandidateFormModal` with referral field. **No dedicated referral portal page.**
- **Need:** `/recruitment/referrals` page — referral dashboard, submit referral form, track referral status, referral policy display, bonus tracking.
- **Effort:** M
- **Priority:** P2

### 2.8 Budget Planning & Headcount Budgeting

- **Current:** Backend has full module (`BudgetPlanningController`, `BudgetPlanningService`, `BudgetScenario`, `HeadcountBudget`, `HeadcountPosition` entities). **No frontend page exists.**
- **Need:** `/budget` or `/finance/budget` page — budget dashboard, scenario modeling, headcount planning, variance analysis.
- **Effort:** M
- **Priority:** P2

### 2.9 Probation Management UI

- **Current:** Backend has full module (`ProbationController`, `ProbationService`, 7 DTOs, `ProbationPeriod` and `ProbationEvaluation` entities). Frontend references probation in directory and compensation pages but **no dedicated probation management page exists.**
- **Need:** `/hr-ops/probation` or embedded in employee detail — probation tracker, evaluation form, extension/confirmation/termination flows.
- **Effort:** M
- **Priority:** P2

### 2.10 Multi-Currency Support

- **Current:** Payroll uses single currency. No currency conversion tables.
- **KEKA:** Multi-currency support for global orgs.
- **Need:** Currency table, exchange rate management, salary structure per currency, multi-currency payslips.
- **Effort:** L
- **Priority:** P3

### 2.11 Succession Planning

- **Current:** Not implemented in backend or frontend.
- **KEKA:** Key position identification, successor pipeline, readiness assessment.
- **Need:** New module — key positions, successor mapping, readiness scores, development plans.
- **Effort:** L
- **Priority:** P3

### 2.12 Skills Matrix

- **Current:** Not implemented. Talent profile exists (`TalentProfileController`) but no skills inventory.
- **KEKA:** Skills database, skill-based search, gap analysis.
- **Need:** Skills taxonomy, employee skill self-assessment, manager validation, gap analysis dashboard.
- **Effort:** M
- **Priority:** P2

---

## 3. Incomplete Features (Started but Not Finished)

### 3.1 NU-Fluence (Phase 2 — Knowledge Management)

- **Backend:** Fully built — `WikiPageController`, `WikiSpaceController`, `BlogPostController`, `BlogCategoryController`, `TemplateController`, `FluenceSearchController`, `FluenceCommentController`, `FluenceAttachmentController`, `FluenceChatController`, `FluenceEditLockController`, `FluenceActivityController`, `ContentEngagementController`, `KnowledgeSearchController`, `ContentViewController`.
- **Frontend pages (built, wired to API):**
  - Wiki: `/fluence/wiki` (595 lines), `/fluence/wiki/new`, `/fluence/wiki/[slug]`, `/fluence/wiki/[slug]/edit`
  - Blogs: `/fluence/blogs` (566 lines), `/fluence/blogs/new`, `/fluence/blogs/[slug]`, `/fluence/blogs/[slug]/edit`
  - My Content: `/fluence/my-content` (580 lines)
  - Search: `/fluence/search` (299 lines)
  - Drive: `/fluence/drive` (240 lines)
  - Templates: `/fluence/templates` (266 lines), `/fluence/templates/new`, `/fluence/templates/[id]`
  - Dashboard: `/fluence/dashboard`
  - Wall: `/fluence/wall` (87 lines — minimal)
- **Services:** `fluence.service.ts` (546 lines), `useFluence.ts` hooks (1009 lines), `useFluenceChat.ts`
- **Mock data:** `lib/data/mock-fluence.ts` still present — comment says "Remove this file once backend endpoints are fully deployed."
- **Status:** Wiki and Blogs are the most complete (~600 lines each). Drive, Templates, Search, and Wall are thinner. Chat widget exists as component. Mock data fallback still in place.
- **Remaining work:**
  - Remove mock data fallback, fully wire all pages to live API
  - Fluence Wall page needs enrichment (currently 87 lines)
  - Drive needs folder management, sharing permissions, file preview
  - Templates need version history, approval workflow
  - Chat needs real-time WebSocket integration
  - Content analytics / engagement metrics dashboard
- **Effort:** L
- **Priority:** P1

### 3.2 Resource Management Module

- **Current:** 5 pages exist (`/resources`, `/resources/capacity`, `/resources/availability`, `/resources/workload`, `/resources/pool`). Backend has `ResourceManagementController`, `ResourceController`, `ResourceConflictController`. **However, all resource pages show "Resource Management API Not Available" error state** — the API is returning errors.
- **Evidence:** `/resources/page.tsx` (391 lines), `/resources/capacity/page.tsx` (338 lines), `/resources/pool/page.tsx` (347 lines) — all contain "API Not Available" handling.
- **Need:** Debug API connectivity, ensure resource endpoints return data, complete CRUD flows.
- **Effort:** M
- **Priority:** P1

### 3.3 PSA (Professional Services Automation)

- **Current:** Backend fully built (`PSAInvoiceController`, `PSAProjectController`, `PSATimesheetController`, `PSAService`, 5 entities, 5 repositories). Frontend has `psa.service.ts`, `usePsa.ts` hooks, `psa.ts` types. PSA is embedded in project detail tabs (`InvoicesTab.tsx`, `TimesheetsTab.tsx`). **No standalone PSA billing/invoicing page.**
- **Need:** `/projects/billing` or `/psa` standalone page for cross-project invoicing, billing rates, revenue tracking.
- **Effort:** M
- **Priority:** P2

### 3.4 Payments Module

- **Current:** `/payments` page (499 lines) and `/payments/config` page exist. Backend has `PaymentController`, `PaymentConfigController`, `PaymentWebhookController`. **Module is gated behind `NEXT_PUBLIC_PAYMENTS_ENABLED` env var (Phase 2 stabilization)**. Hidden from sidebar by default.
- **Need:** Stabilize, test payment flows, enable by default.
- **Effort:** S
- **Priority:** P2

### 3.5 Learning Management System (LMS)

- **Current:** `/learning` page (344 lines), `/learning/courses/[id]` with detail and play views, `/learning/certificates`, `/learning/paths`. Course player shows **"Video not available"** and **"Quiz engine coming soon. Mark as complete to proceed."** LMS backend has `LmsController`, `QuizController`, `CourseEnrollmentController`.
- **Missing:**
  - Video player integration (currently placeholder)
  - Quiz engine (frontend only — backend `QuizController` exists)
  - SCORM/xAPI content support
  - Course authoring tools
  - Learning path builder (page exists but needs enrichment)
- **Effort:** L
- **Priority:** P1

### 3.6 Global Search (Cmd+K)

- **Current:** `GlobalSearch.tsx` (593 lines) — fully built with entity-aware search (employees, pages, modules), keyboard navigation, search service integration. Backend has search endpoints.
- **Status:** Appears functional. May need Elasticsearch-powered entity search for employees/candidates (currently navigation-based).
- **Need:** Verify Elasticsearch integration, add entity result cards (employee preview, candidate preview), recent searches, search analytics.
- **Effort:** S
- **Priority:** P2

### 3.7 Notification Center

- **Current:** `NotificationDropdown.tsx` (764 lines) — rich implementation with WebSocket real-time updates, read/unread states, mark-all-read, notification routing, category icons. Backend has `NotificationController`, `MultiChannelNotificationController`, `WebSocketNotificationController`, `SmsNotificationController`.
- **Status:** Dropdown is solid. Missing a **full-page notification center** (`/notifications`) with filtering, grouping by type, date range, bulk actions.
- **Effort:** S
- **Priority:** P2

### 3.8 Audit Trail UI

- **Current:** Backend has `AuditLogController` and Kafka audit topic (`nu-aura.audit`). All critical operations are audit-logged. **No frontend page exists to view audit logs.**
- **Need:** `/admin/audit-logs` page — searchable/filterable log viewer (who, what, when, entity, action), export capability, data retention controls.
- **Effort:** M
- **Priority:** P1

### 3.9 Webhook Management UI

- **Current:** Backend has full webhook system (`WebhookController`, `WebhookService`, `WebhookDeliveryService`, 4 entities). Frontend has no webhook management page.
- **Need:** `/admin/webhooks` page — create/edit webhooks, event subscription picker, delivery history, retry failed deliveries.
- **Effort:** M
- **Priority:** P2

### 3.10 API Key Management UI

- **Current:** Backend has `ApiKeyController`. No frontend page.
- **Need:** `/admin/api-keys` page — generate/revoke keys, scope assignment, usage tracking.
- **Effort:** S
- **Priority:** P2

---

## 4. Redirect-Only / Stub Pages

These pages exist as redirects or minimal stubs and need either removal or full implementation:

| Route | Lines | Status | Action Needed |
|-------|-------|--------|---------------|
| `/executive` | 21 | Redirect to `/dashboards/executive` | Keep (redirect works) |
| `/goals` | 21 | Redirect to `/performance/goals` | Keep (redirect works) |
| `/feedback360` | 22 | Redirect to `/performance/360-feedback` | Keep (redirect works) |
| `/okr` | 22 | Redirect to `/performance/okr` | Keep (redirect works) |
| `/organization-chart` | 21 | Redirect to `/org-chart` | Keep (redirect works) |
| `/compliance` | 22 | Placeholder ("coming soon") | Build full page |
| `/fluence/wall` | 87 | Minimal implementation | Enrich with activity feed |
| `/allocations` | 25 | Redirect stub | Wire to resource allocations |
| `/app/hrms` | 21 | Entry point redirect | Keep |
| `/app/hire` | 21 | Entry point redirect | Keep |
| `/app/grow` | 21 | Entry point redirect | Keep |
| `/app/fluence` | 21 | Entry point redirect | Keep |

---

## 5. UX/UI Improvements

### 5.1 Empty States

- `EmptyState.tsx` component exists in `components/ui/` but not consistently used.
- Many pages show raw "No data" or blank tables without guidance.
- **Need:** Onboarding wizards for first-time setup (e.g., "Create your first payroll run"), contextual help links, setup completion percentage.
- **Effort:** M
- **Priority:** P2

### 5.2 Bulk Operations

- Employee import exists (`/employees/import`, KEKA import at `/admin/import-keka`).
- **Missing:** Bulk leave apply, bulk attendance regularization, bulk payroll adjustments, bulk employee status changes.
- **Effort:** M
- **Priority:** P2

### 5.3 Data Export Consistency

- Export exists in: Reports (35 export-related files found), payslips (PDF), letters (PDF via OpenPDF), employees, statutory, attendance, 9-box, calibration, resource pool, allocations, learning certificates.
- **Missing:** Consistent export button pattern across ALL list pages. Some pages have export, others do not.
- **Need:** Standardize export component (PDF/Excel/CSV) and add to all data tables.
- **Effort:** S
- **Priority:** P2

### 5.4 Dark Mode Polish

- Dark mode toggle exists and works globally.
- **Issues:** Some pages may have contrast issues with Sky-700 on dark backgrounds. Need WCAG AA audit pass.
- **Effort:** S
- **Priority:** P3

### 5.5 Responsive Design / Tablet Support

- Pages are built for desktop-first.
- **Need:** Responsive breakpoints audit, mobile-friendly tables (card view on small screens), touch-friendly interaction patterns.
- **Effort:** L
- **Priority:** P1 (prerequisite for PWA)

---

## 6. Technical Debt

### 6.1 Mock Data Cleanup

- `frontend/lib/data/mock-fluence.ts` — Fluence mock data still present as API fallback.
- **Action:** Remove once all Fluence API endpoints are verified working.
- **Effort:** XS
- **Priority:** P1

### 6.2 Resource Management API Errors

- All 5 resource pages show "API Not Available" error states.
- `ResourceManagementApiError` class handles this explicitly in the service layer.
- **Action:** Debug backend `ResourceManagementController` and `ResourceController` endpoints, verify database schema and data.
- **Effort:** S
- **Priority:** P1

### 6.3 LMS Video/Quiz Placeholders

- Course player: "Video not available", "Quiz engine coming soon".
- **Action:** Integrate video player (HLS.js or native HTML5 video with MinIO-served content), build quiz UI consuming `QuizController` API.
- **Effort:** M
- **Priority:** P1

### 6.4 Gantt Chart / Project Calendar

- `/projects/gantt` (57 lines): Shows "Gantt View Coming Soon" placeholder.
- `/projects/calendar` (83 lines): "Task management coming soon" comment.
- **Action:** Build Gantt visualization (consider react-gantt-chart or custom) and calendar task view.
- **Effort:** M
- **Priority:** P2

### 6.5 Manager Dashboard "Coming Soon"

- `/dashboards/manager` (860 lines): Has error/coming-soon fallback state visible for some widgets.
- **Action:** Complete all manager dashboard widgets, ensure API data flows correctly.
- **Effort:** S
- **Priority:** P1

### 6.6 Payroll Sub-Pages

- `/payroll/salary-structures` (59 lines), `/payroll/components` (59 lines), `/payroll/bulk-processing` (45 lines — just wraps `BulkProcessingWizard` component which itself has "Coming Soon" for review step).
- **Action:** Enrich salary structure builder, complete payroll components configuration, finish bulk processing review step.
- **Effort:** M
- **Priority:** P1

### 6.7 Flyway Migration Hygiene

- V74-V75 applied out-of-order.
- V78 has wrong tenant_id (no-op, superseded by V79).
- **Action:** Document migration gaps, ensure no schema drift between environments.
- **Effort:** XS
- **Priority:** P2

### 6.8 TypeScript Strict Mode Violations

- `tax.service.ts` has known type errors.
- Older code may have implicit `any` types.
- **Action:** Run `tsc --noEmit` and fix all type errors. Add to CI gate.
- **Effort:** S
- **Priority:** P2

### 6.9 Test Coverage Gaps

- Frontend: 52 E2E specs (Playwright) + 7 integration tests. Good for page-level coverage.
- Backend: 120 test classes with JaCoCo 80% minimum.
- **Missing:** Frontend unit tests for hooks, services, and utility functions. Component tests for complex UI (BulkProcessingWizard, PayslipCard, etc.).
- **Effort:** L
- **Priority:** P2

---

## 7. Backend Features Without Frontend

These backend controllers/modules have no corresponding frontend pages:

| Backend Module | Controllers | Frontend Status |
|---------------|------------|----------------|
| **1-on-1 Meetings** | `OneOnOneMeetingController`, `MeetingController` | Types + service exist, no page |
| **Budget Planning** | `BudgetPlanningController` | No frontend |
| **Probation** | `ProbationController` | Referenced in other pages, no dedicated page |
| **Employee Referral** | `ReferralController` | Only candidate form modal reference |
| **Audit Logs** | `AuditLogController` | No frontend |
| **Webhooks** | `WebhookController` | No frontend |
| **API Keys** | `ApiKeyController` | No frontend |
| **Pulse Surveys** | `PulseSurveyController` | No frontend (separate from `/surveys`) |
| **Predictive Analytics** | `PredictiveAnalyticsController` | No frontend |
| **Advanced Analytics** | `AdvancedAnalyticsController` | No frontend |
| **Data Migration** | `DataMigrationController` | No frontend (admin tool) |
| **Monitoring** | `MonitoringController` | No frontend (ops tool) |
| **E-Signature** | `ESignatureController`, `DocuSignController` | Used in letters/contracts, no standalone page |
| **Overtime** | `OvertimeManagementController` | Referenced in attendance, no dedicated page |
| **Mobile APIs** | 5 controllers | Admin config page only |

---

## 8. Infrastructure & DevOps

### 8.1 CI/CD Pipeline Completion

- **Current:** GitHub Actions + Google Cloud Build defined. Kubernetes manifests in `deployment/kubernetes/` (10 manifests).
- **Need:** Full pipeline: lint -> test -> build -> deploy staging -> E2E -> deploy prod. Automated rollback on failure.
- **Effort:** L
- **Priority:** P1

### 8.2 Kubernetes Production Hardening

- **Current:** 10 K8s manifests targeting GCP GKE.
- **Need:** HPA (horizontal pod autoscaler), PDB (pod disruption budget), resource limits tuning, secrets management (GCP Secret Manager or Vault), network policies.
- **Effort:** M
- **Priority:** P1

### 8.3 Monitoring Dashboard Completion

- **Current:** Prometheus (28 alert rules, 19 SLOs) + Grafana (4 dashboards) + AlertManager configured.
- **Need:** Application-specific dashboards (payroll processing latency, approval workflow SLA, login success rate), log aggregation (ELK or Cloud Logging), distributed tracing (OpenTelemetry).
- **Effort:** M
- **Priority:** P1

### 8.4 Disaster Recovery Plan

- **Current:** Not documented beyond runbooks (4 runbooks exist).
- **Need:** RTO/RPO targets, backup verification, failover procedures, DR testing schedule.
- **Effort:** M
- **Priority:** P1

### 8.5 Performance Testing

- **Current:** No load testing framework.
- **Need:** k6 or Gatling scripts for critical flows (login, attendance clock-in, payroll processing), establish baseline metrics, run in CI.
- **Effort:** M
- **Priority:** P2

---

## 9. Security Enhancements

### 9.1 Account Lockout Policy

- **Current:** Rate limiting (5/min on auth endpoints). Password policy enforced.
- **Missing:** Account lockout after N failed attempts, lockout duration, admin unlock flow.
- **Effort:** S
- **Priority:** P1

### 9.2 MFA Enforcement

- **Current:** MFA supported (`/api/v1/auth/mfa-login` endpoint). Optional enrollment.
- **Need:** Tenant-level MFA enforcement policy, backup codes, TOTP app setup wizard.
- **Effort:** M
- **Priority:** P1

### 9.3 IP Whitelisting

- **Current:** Not implemented.
- **Need:** Tenant-level IP whitelist configuration, admin override, VPN-aware rules.
- **Effort:** S
- **Priority:** P2

### 9.4 Session Management UI

- **Current:** JWT + refresh token based. No UI to view/revoke active sessions.
- **Need:** `/settings/security` enhancement — active sessions list, device info, revoke session, "sign out all devices."
- **Effort:** S
- **Priority:** P2

### 9.5 Security Event Dashboard

- **Current:** Audit logging via Kafka.
- **Need:** Admin security dashboard — login activity, failed attempts, suspicious activity alerts, permission change log.
- **Effort:** M
- **Priority:** P2

---

## 10. Priority Matrix

| # | Feature | Business Impact | Effort | Priority | Target |
|---|---------|----------------|--------|----------|--------|
| 1 | Mobile PWA | Critical | XL | **P0** | V2.0 |
| 2 | India Statutory Depth | Critical | L | **P0** | V2.0 |
| 3 | GPS/Geofencing Attendance | Critical | L | **P0** | V2.0 |
| 4 | NU-Fluence Frontend Completion | High | L | **P1** | V2.0 |
| 5 | Resource Management API Fix | High | S | **P1** | V2.0 |
| 6 | LMS Video/Quiz Engine | High | M | **P1** | V2.0 |
| 7 | Audit Trail UI | High | M | **P1** | V2.0 |
| 8 | 1-on-1 Meetings UI | High | M | **P1** | V2.0 |
| 9 | Compliance Module | High | M | **P1** | V2.0 |
| 10 | Advanced Leave Features | High | M | **P1** | V2.0 |
| 11 | Biometric Integration | High | L | **P1** | V2.0 |
| 12 | Responsive Design / Tablet | High | L | **P1** | V2.0 |
| 13 | CI/CD Pipeline | High | L | **P1** | V2.0 |
| 14 | K8s Production Hardening | High | M | **P1** | V2.0 |
| 15 | Account Lockout Policy | High | S | **P1** | V2.0 |
| 16 | MFA Enforcement | High | M | **P1** | V2.0 |
| 17 | Manager Dashboard Fix | Medium | S | **P1** | V2.0 |
| 18 | Payroll Sub-Pages Enrichment | Medium | M | **P1** | V2.0 |
| 19 | Bank File Generation | Medium | M | **P1** | V2.1 |
| 20 | Shift Scheduling Calendar | Medium | M | **P2** | V2.1 |
| 21 | White-Labeling | Medium | M | **P2** | V2.1 |
| 22 | Employee Referral Portal | Medium | M | **P2** | V2.1 |
| 23 | Budget Planning UI | Medium | M | **P2** | V2.1 |
| 24 | Probation Management UI | Medium | M | **P2** | V2.1 |
| 25 | Skills Matrix | Medium | M | **P2** | V2.1 |
| 26 | PSA Billing Page | Medium | M | **P2** | V2.1 |
| 27 | Webhook Management UI | Medium | M | **P2** | V2.1 |
| 28 | API Key Management UI | Medium | S | **P2** | V2.1 |
| 29 | Global Search Enhancement | Medium | S | **P2** | V2.1 |
| 30 | Notification Center Page | Medium | S | **P2** | V2.1 |
| 31 | Gantt Chart / Project Calendar | Medium | M | **P2** | V2.1 |
| 32 | Empty States & Onboarding | Medium | M | **P2** | V2.1 |
| 33 | Bulk Operations | Medium | M | **P2** | V2.1 |
| 34 | Export Consistency | Low | S | **P2** | V2.1 |
| 35 | Payments Module Stabilize | Low | S | **P2** | V2.1 |
| 36 | Accounting Integrations | Medium | L | **P2** | V2.2 |
| 37 | Predictive Analytics UI | Medium | M | **P2** | V2.2 |
| 38 | Pulse Surveys UI | Medium | M | **P2** | V2.2 |
| 39 | Multi-Currency Support | Medium | L | **P3** | V2.2 |
| 40 | Succession Planning | Low | L | **P3** | V2.2 |
| 41 | Dark Mode Polish | Low | S | **P3** | V2.2 |
| 42 | Frontend Unit Tests | Medium | L | **P2** | Ongoing |
| 43 | TypeScript Strict Fixes | Low | S | **P2** | Ongoing |
| 44 | Performance Testing | Medium | M | **P2** | V2.0 |

---

## 11. Release Plan

### V2.0 — Core Gap Closure (Q2 2026)

**Theme:** Close critical gaps for market parity with KEKA.

- Mobile PWA (Phase 1)
- India statutory compliance depth (ECR, Form 16, 24Q)
- GPS/geofencing attendance
- Biometric device integration
- NU-Fluence frontend completion (remove mock data, enrich all pages)
- Resource management API fix
- LMS video player + quiz engine
- Audit trail admin UI
- 1-on-1 meetings page
- Compliance module (full build)
- Advanced leave features (sandwich rule, restricted holidays, encashment)
- Responsive design audit (PWA prerequisite)
- Manager dashboard fix
- Payroll sub-pages enrichment
- CI/CD pipeline completion
- K8s production hardening
- Account lockout + MFA enforcement
- Monitoring dashboard completion
- DR plan documentation

**Estimated total effort:** ~200 engineering days

### V2.1 — Feature Expansion (Q3 2026)

**Theme:** Feature parity and operational excellence.

- Bank file generation
- Shift scheduling calendar
- White-labeling / tenant branding
- Employee referral portal
- Budget planning UI
- Probation management UI
- Skills matrix
- PSA billing standalone page
- Webhook + API key management UIs
- Global search entity cards
- Full notification center page
- Gantt chart + project calendar
- Empty states + onboarding wizards
- Bulk operations (leave, attendance, payroll)
- Export consistency across modules
- Payments module stabilization
- Predictive analytics UI
- Pulse surveys UI

**Estimated total effort:** ~150 engineering days

### V2.2 — Advanced Features (Q4 2026)

**Theme:** Differentiation and premium capabilities.

- React Native mobile app (Phase 2)
- Accounting software integrations (Tally, Zoho, QuickBooks)
- Multi-currency support
- Succession planning module
- SCORM/xAPI content support for LMS
- Advanced workflow designer (visual drag-and-drop)
- AI-powered insights (attrition prediction, performance forecasting)
- Dark mode polish + WCAG AAA compliance
- Internationalization (i18n) framework

**Estimated total effort:** ~200 engineering days

---

## 12. Summary Metrics

| Metric | Count |
|--------|-------|
| Total roadmap items | 44 |
| P0 (Critical) | 3 |
| P1 (High) | 15 |
| P2 (Medium) | 20 |
| P3 (Low) | 6 |
| Backend modules without frontend | 15 |
| Placeholder/stub pages | 6 |
| "Coming soon" instances in codebase | 8 |
| "API Not Available" pages | 5 |
| Total estimated V2 effort | ~550 engineering days |

---

*Document generated from codebase analysis — March 25, 2026*
*Baseline: 200 page routes, 143 controllers, 265 entities, 113 sidebar menu items*
