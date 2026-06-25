---
title: Work Breakdown Structure
tags: [delivery, wbs, planning, execution]
updated: 2026-06-25
summary: "Delivery-oriented WBS for NU-AURA product hardening, pilot packaging, and documentation traceability."
---

# Work Breakdown Structure

## Scope

This WBS sequences NU-AURA into delivery work packages. It is not a Jira import and does not
claim schedule certainty. Use it to plan pilot readiness, assign owners, and connect work to
evidence in the vault.

## Delivery Principles

- Keep the bundle-app model: one frontend, one backend, shared platform services.
- Treat security, RBAC, tenant isolation, and audit as release gates, not polish.
- Use existing source maps before inventing new docs: [[Feature-Traceability]],
  [[Route-Map-Full]], [[Endpoint-Index]], [[Table-Index]].
- Validate narrow checks first, then browser and production-like gates when scope demands it.

## WBS Summary

| WBS | Work package | Output | Primary evidence |
|---|---|---|---|
| 0 | Product and documentation baseline | Product docs, graph map, fresh counts | this section, [[Graphify-Code-Graph]] |
| 1 | Platform foundations | Auth, RBAC, tenancy, notifications, feature flags validated | [[Shared-Platform]], [[Security-Audit]] |
| 2 | NU-HRMS pilot | Employee self-service, leave, attendance, payroll/expense core | [[Nu-HRMS]], [[Feature-Traceability]] |
| 3 | NU-Hire pilot | Jobs, candidates, interviews, careers, onboarding/e-sign | [[Nu-Hire]] |
| 4 | NU-Grow pilot | Reviews, OKRs, LMS/training, surveys, recognition | [[Nu-Grow]] |
| 5 | NU-Fluence pilot | Wiki, blogs, templates, wall, search, AI chat | [[Nu-Fluence]] |
| 6 | Data and integrations | Migrations, Drive, Slack, DocuSign, webhooks, exports | [[Schema]], [[Data-Flows]] |
| 7 | QA and release readiness | Test catalog, browser coverage, deploy gates | [[QA-Strategy]], [[Test-Catalog]], [[Readiness-Session-2026-06-18]] |
| 8 | Operations and support | Runbooks, monitoring, incident playbooks, rollback | [[Production-Support]], [[Incident-Response]] |

## Detailed Work Packages

### WBS-0 Product and Knowledge Baseline

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-0.1 | Build code graph | `graphify-out/GRAPH_REPORT.md` refreshed |
| WBS-0.2 | Create product map | [[Application-Map]] linked from vault home |
| WBS-0.3 | Create PRD | [[Product-Requirements-Document]] with requirements and acceptance criteria |
| WBS-0.4 | Create user manual | [[User-Manual]] for pilot users and support |
| WBS-0.5 | Reconcile docs indexes | `00-Home.md`, `docs/README.md`, coverage report updated |

### WBS-1 Shared Platform Foundations

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-1.1 | Auth and session validation | Login, refresh, logout, MFA, Google/SAML paths documented and smoke tested |
| WBS-1.2 | RBAC validation | Role matrix and app access align with backend permissions |
| WBS-1.3 | Tenant/RLS validation | Runtime DB role and RLS probes verified for target environment |
| WBS-1.4 | Notification and audit validation | Key write flows emit expected events |
| WBS-1.5 | Feature flag and admin validation | Admin workflows can toggle and audit flags safely |

### WBS-2 NU-HRMS Pilot

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-2.1 | My Space | Employee can use dashboard, profile, payslips, attendance, leave, documents |
| WBS-2.2 | Employee and org | HR can manage employee and department records with permission gates |
| WBS-2.3 | Attendance and leave | Employee submit and manager approval flows pass browser validation |
| WBS-2.4 | Payroll and finance | Payroll, payslip, expense, loan, benefit pilot flows are permission-gated |
| WBS-2.5 | Helpdesk and documents | Support tickets and document storage paths are verified |

### WBS-3 NU-Hire Pilot

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-3.1 | Job opening management | Recruiter can create and manage job openings |
| WBS-3.2 | Candidate pipeline | Candidate list/detail/kanban and stages operate by permission |
| WBS-3.3 | Public careers | Public job listing and application work without product login |
| WBS-3.4 | Interviews and scorecards | Scorecard and feedback flows complete |
| WBS-3.5 | Offer, preboarding, onboarding | Token and authenticated joining flows are validated |

### WBS-4 NU-Grow Pilot

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-4.1 | Reviews and cycles | Review cycle, calibration, 9-box, and PIP paths verified |
| WBS-4.2 | Goals and OKRs | Objective, key result, approval, check-in paths verified |
| WBS-4.3 | LMS and training | Course, quiz, certificate, program enrollment paths verified |
| WBS-4.4 | Engagement | Recognition, survey, pulse, wellness, and 1-on-1 flows verified |

### WBS-5 NU-Fluence Pilot

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-5.1 | Wiki and blogs | Create, edit, publish, read, and permission denial paths verified |
| WBS-5.2 | Templates and drive | Template and attachment paths verified |
| WBS-5.3 | Wall | Post, react, comment, pin, and praise flows verified |
| WBS-5.4 | Search and AI chat | Tenant-scoped search and configured chat behavior verified |

### WBS-6 Data and Integrations

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-6.1 | Migration discipline | Next Flyway migration uses correct version and does not modify old migrations |
| WBS-6.2 | Google Drive storage | Upload/download/delete paths work behind `StorageProvider` |
| WBS-6.3 | Webhooks | Signature verification and rotation paths validated |
| WBS-6.4 | Slack / DocuSign / OAuth | Critical integration callbacks and auth paths validated |
| WBS-6.5 | Exports and reports | Export rate limits and audit behavior validated |

### WBS-7 QA and Release Readiness

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-7.1 | Static gates | Backend compile/tests and frontend type/lint/build gates run for touched scope |
| WBS-7.2 | Browser flows | Role-based Playwright/browser validation for pilot scope |
| WBS-7.3 | Security scan | Secret scan, dependency scan, RBAC/RLS proof completed |
| WBS-7.4 | Readiness verdict | Evidence-backed score with explicit blockers and missing checks |

### WBS-8 Operations and Support

| Task | Deliverable | Exit criteria |
|---|---|---|
| WBS-8.1 | Production support runbook | Health, alerts, scaling, scheduled jobs, backups documented from real environment |
| WBS-8.2 | Incident response | Tenant leak, auth incident, data correction, integration outage paths rehearsed |
| WBS-8.3 | Rollback and deploy | Frozen SHA, migration, deploy, rollback procedure verified |
| WBS-8.4 | Support manual | Known errors and triage steps added to [[User-Manual]] or runbooks |

## Dependencies

- WBS-1 gates all sub-app pilots.
- WBS-2 must be stable before end-to-end hire-to-employee and growth loops are claimed.
- WBS-6 must be validated before public/token flows or webhook-heavy workflows go live.
- WBS-7 and WBS-8 are required before any production readiness score is raised.

## Related

- [[Product-Delivery-Index]]
- [[Product-Requirements-Document]]
- [[Application-Map]]
- [[Security-Audit]]
- [[QA-Strategy]]
