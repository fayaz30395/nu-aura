# Production Readiness Matrix

> Last updated: 2026-03-19 | Post Phase 7 stabilization

## Module Status Overview

| Module | Backend | Frontend | Tests | Observability | Status | Notes |
|--------|---------|----------|-------|---------------|--------|-------|
| **Auth & RBAC** | Complete | Complete | 3 test files (controller + service + security) | Login metrics, rate limiting alerts | `ready` | JWT + Google SSO, 300+ permissions, SuperAdmin bypass |
| **Employee Mgmt** | Complete | Complete | 6 test files (controller, service, import, dept) | Employee action metrics | `ready` | CRUD, directory, hierarchy, bulk import, documents |
| **Leave** | Complete | Complete | 5 test files + cross-module | Leave request metrics, approval SLO alerts | `ready` | Policies, balances, approvals, calendar; soft-delete enforced |
| **Attendance** | Complete | Complete | 4 test files (controller + 3 services) | Attendance event metrics, ingestion SLO alerts | `ready` | Check-in/out, geofencing, shifts, regularization scheduler |
| **Payroll** | Complete | Complete | 6 test files (controller + 5 services) | Payroll duration/failure SLO alerts, processing metrics | `ready` | SpEL formula engine, soft-delete enforced, API contracts fixed (Phase 4) |
| **Recruitment** | Complete | Complete | 4 test files (controller + 2 services + AI parsing) | Recruitment action metrics | `ready` | ATS pipeline, job postings, applicant tracking, interviews |
| **Performance** | Complete | Complete | 6 test files (controller + 4 services + query count) | Performance review metrics | `ready` | Reviews, OKRs, 360 feedback, goals, 9-box grid |
| **Contract** | Complete | Complete | 5 test files (controller + 3 services + scheduler) | Contract lifecycle/expiry SLO alerts | `ready` | Lifecycle scheduler (Phase 3), templates, reminders, auto-renew |
| **Payment** | Complete | Complete | 2 test files (controller + service) | Feature flag metrics | `disabled` | Feature-flagged OFF (Phase 2). Mock gateway adapters. No production gateway. |
| **Assets** | Complete | Complete | 1 test file (controller) | General API metrics | `partial` | CRUD + assignment. Needs service-level tests. |
| **Expenses** | Complete | Complete | 2 test files (controller + service) | General API metrics | `partial` | Claims, approvals, reimbursements. Controller test has known compilation issue. |
| **Benefits** | Complete | Complete | 0 test files | General API metrics | `partial` | Plans, enrollments, claims. No backend tests. |
| **Training / LMS** | Complete | Complete | 1 test file (LMS service) | General API metrics | `partial` | Courses, enrollments, certificates. Minimal test coverage. |
| **Knowledge / Fluence** | Complete | Partial | 0 test files | No dedicated alerts | `partial` | Wiki, blogs, templates built. Full NU-Fluence is Phase 2. |
| **Dashboard** | Complete | Complete | 2 test files (controller + service) | Active users gauge, system overview dashboard | `ready` | Aggregated metrics, widgets |
| **Analytics / Reports** | Complete | Complete | 4 test files (controller + 3 services) | General API metrics | `ready` | Scheduled reports, dashboard analytics, export |
| **Settings** | Complete | Complete | 0 test files | General API metrics | `partial` | Org settings, feature flags. No dedicated tests. |
| **Onboarding** | Complete | Complete | 1 test file (controller) | General API metrics | `partial` | Templates, tasks, processes. Needs service tests. |
| **Offboarding / FnF** | Complete | Complete | 0 test files (exit module) | General API metrics | `partial` | Exit management, clearance. No dedicated tests. |

## Status Legend

- **`ready`** — Backend + frontend complete, adequate test coverage, observability in place. No known blockers.
- **`partial`** — Functional but has gaps in testing, observability, or minor missing features.
- **`disabled`** — Feature-flagged off. Not exposed in production. Requires additional work before enabling.

## Cross-Cutting Concerns

| Concern | Status | Details |
|---------|--------|---------|
| **Multi-tenancy (RLS)** | Ready | PostgreSQL RLS policies (V36-V38). `tenant_id` on all tables. TenantContext propagation. |
| **Soft-delete** | Partial | Phase 1 enforced on 7 critical entities (payroll, contract, leave, department, holiday). 35+ secondary services still hard-delete. |
| **API Contracts** | Ready | Phase 4 fixed payroll/payment mismatches. 3 frontend stubs remain (spotlight, linkedin, PM tasks). |
| **Kafka Events** | Ready | 4 topics, DLQ with replay/ignore admin API, idempotent producers. |
| **Background Jobs** | Ready | Leave accrual (Quartz), attendance regularization, contract lifecycle (Phase 3), workflow escalation. |
| **Observability** | Ready | 28 alert rules (9 app + 19 SLO), 4 Grafana dashboards, structured JSON logging, 26+ metric methods. |
| **Runbooks** | Ready | 4 operational runbooks (incident, payroll, data correction, Kafka DLQ). |
| **CI Guardrails** | Ready | ArchUnit layer tests, tenant scoping tests (Phase 0). |

## Known Gaps (Future Sprints)

1. **Benefits module** — Zero backend tests. Needs controller + service tests.
2. **Offboarding/FnF module** — Zero dedicated tests. Exit management flows untested.
3. **Settings module** — No tests for feature flag management, org settings.
4. **Onboarding module** — Only 1 controller test. Service tests missing.
5. **Training/LMS** — Only 1 LMS service test. Training controller/service untested.
6. **Remaining hard-deletes** — 35+ secondary services still use `repository.delete()`.
7. **Scheduler instrumentation** — `AutoRegularizationScheduler` and `WorkflowEscalationScheduler` do not emit Prometheus metrics via `MetricsService.recordScheduledJob()`.
8. **Payment gateway** — Mock adapters (Stripe/Razorpay). Real integration needed before enabling.
9. **Mobile API** — 5 placeholder mobile service implementations.
10. **Spotlight / LinkedIn / PM Tasks** — Frontend stubs calling non-existent backend endpoints.
