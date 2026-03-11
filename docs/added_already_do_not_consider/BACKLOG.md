# NU-AURA HRMS Platform - Prioritized Backlog

**Last Updated:** 2026-03-07

This backlog consolidates open work across `requirements.md`, `IMPLEMENTATION_STATUS.md`,
`PROJECT_STATUS.md`, and `TECH_DEBT.md`. It is the single source of truth for what is still pending.

## P0 - Critical (Must fix before release hardening)
- Recruitment Applicant Tracking: add Applicant entity, application pipeline/status, and end-to-end UI/API workflow.
- Implicit Role Automation: auto-assign reporting manager/manager scopes based on org hierarchy.
- Offer Management + E-Signature: offer letter templates, signing flow, status tracking.

## P1 - High
- Reporting UI parity: wire existing HRMS report APIs into complete frontend views.
- Manager/HR dashboards: bring to full parity (actions + insights, not just basics).
- Attendance + Leave integration: reconcile workflows (auto-updates, conflict rules, carry-over visibility).
- Expense approval workflow: approver chain and decision tracking.
- Google Drive integration (org-wide): backend integration + policy controls (current frontend is client-only).
- OWASP review + security hardening sweep.
- Fix backend test compilation errors (RoleScope/RolePermission test utilities no longer match domain).

## P2 - Medium
- Mobile PWA for attendance with GPS geofencing.
- Social engagement: social wall, pulse surveys UI refinement, kudos system.
- Onboarding UI completion; Documents UI polish.
- Project templates and project import/export coverage.
- Timesheet locking enhancements (beyond basic locking).
- Performance optimization for large datasets; caching strategy (Redis).
- Mobile responsiveness improvements.
- E2E test coverage for edge cases + auth setup performance improvements.

## P3 - Low
- Helpdesk SLA automation and escalations.
- 9-Box Grid for succession planning.
- ATS job board integrations (LinkedIn/Naukri).
- Incident runbook and operational playbooks.

## Completed Items (Sprint 14)
- [x] Multi-factor authentication (MFA): TOTP-based MFA with backup codes, setup wizard, verification flows
- [x] LMS assessments/quizzes/certificates: Quiz attempt tracking, assessment scoring, certificate generation
- [x] Learning paths: Structured learning pathways with prerequisite management
- [x] Frontend security hardening: OWASP-compliant headers, MFA route protection, LMS route protection
- [x] SecurityHeadersFilter: Implemented with CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] MFA endpoints: 5 endpoints (setup, verify, disable, list, check) with proper authentication
- [x] V11 database migration: MFA fields, quiz tables, learning paths, profile update requests

## Tech Debt
- Mockito inline mock-maker agent configuration to remove dynamic agent warnings during tests.
- Post-Sprint 14: Tighten Mockito strictness from `LENIENT` to targeted stubs.
