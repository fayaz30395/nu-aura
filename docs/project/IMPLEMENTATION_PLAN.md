# Implementation Plan - NU-AURA HRMS

Last Updated: 2026-01-13 (draft)

## Purpose
This document expands the current backlog into a structured implementation plan with phases,
dependencies, deliverables, and acceptance criteria. It is intended to guide execution and
reduce ambiguity during development.

## Scope and Assumptions
- Repo layout is `backend/`, `frontend/`, `pm-frontend/`, `modules/common`, `modules/pm`.
- Backend is Spring Boot 3.4.1, Java 17 (per `pom.xml` and `backend/pom.xml`).
- Feature flags are controlled in `backend/src/main/resources/application.yml`.
- Database migrations are managed via Liquibase in `backend/src/main/resources/db/changelog`.
- Testing stacks: JUnit 5 (backend), Playwright (frontend E2E).

## Guiding Principles
- Ship incrementally behind feature flags when possible.
- Prefer additive migrations; avoid data loss in production.
- Keep RBAC and tenant isolation consistent across new endpoints and UI.
- Maintain testability: minimum unit + integration coverage, critical E2E flows.
- Align UI and API naming conventions to avoid mapping drift.

## Keka-Style RBAC Requirement (Must-Have)
The release must follow Keka-style RBAC, including multi-role support, scope-based data access,
custom scope lists, L1 approvals, and UI parity for role/permission management.
See `docs/architecture/RBAC_KEKA_REQUIREMENTS.md` for full details and deltas.
P0 matrix template: `docs/architecture/RBAC_P0_MATRIX.md`.

## Phase 0 - Foundation and Alignment
Goal: establish a stable baseline before P0 delivery.

### Tasks
- Document alignment
  - Update `README.md` and `docs/operations/SETUP_GUIDE.md` to match repo layout.
  - Confirm Java/Spring versions; remove references to `platform/`, `hrms-backend`, `hrms-frontend`.
  - Remove or redact any hardcoded shared DB credentials in docs.
- Build and test baseline
  - Fix backend test compile errors for RoleScope/RolePermission utilities.
  - Ensure `backend` unit tests compile and run; document any intentional exclusions.
  - Verify `frontend` lint and Playwright configuration is functional.
- Feature flag posture
  - Decide whether to enable `RECRUITMENT`, `TRAINING_LMS`, `SOCIAL_FEED` in
    `backend/src/main/resources/application.yml` for development.
- Data and schema hygiene
  - Inventory existing recruitment and offer related tables in changelog
    (for example `063-create-recruitment-tables.xml`, `084-ai-recruitment.sql`).
  - Document any schema gaps to avoid duplicate entities.
- RBAC baseline (Keka-style)
  - Extend scope model for CUSTOM and identify data storage strategy.
  - Update role/permission DTOs to accept scope data.
  - Plan UI changes for permission scope selection and custom targets.

### Deliverables
- Updated docs (repo layout, versions, setup).
- Green compile for backend tests.
- Feature-flag decision recorded.
- Inventory note for recruitment schema.
- RBAC baseline design note (scope model + UI plan).

### Acceptance Criteria
- `mvn -pl backend test` compiles.
- Setup docs reference correct paths and versions.

## Phase 1 - P0 Features (Release Critical)

### 1) Recruitment Applicant Tracking System (ATS)
Goal: full candidate pipeline with API and UI workflow.

Backend
- Schema
  - Extend existing recruitment tables or add new ones as needed:
    - applicants/candidates
    - applications
    - pipeline stages and transitions
    - interview schedule and feedback
  - Add indexes for stage, status, and assigned recruiter.
  - Liquibase change file in `backend/src/main/resources/db/changelog/changes`.
- Domain and services
  - Entities in `backend/src/main/java/com/hrms/domain/recruitment`.
  - Service layer in `backend/src/main/java/com/hrms/application/recruitment`.
  - Workflow rules for stage transitions and required fields.
- API
  - Controllers in `backend/src/main/java/com/hrms/api/recruitment`.
  - Endpoints for candidate CRUD, pipeline list, stage transition, notes, documents.
- RBAC
  - Add permissions in `Permission` and seed RBAC in changelog.
  - Apply `@RequiresPermission` on every controller method.
  - Enforce scope filtering in service/repository layer.
  - Ensure custom scope lists are supported where needed (recruiter-specific views).

Frontend
- Pages under `frontend/app/recruitment`
  - Pipeline board view with status columns.
  - Candidate list, details, and activity timeline.
  - Actions: move stage, schedule interview, reject, hire.
- Integrate with services in `frontend/lib/services/recruitment.service.ts`.

Testing
- Unit tests for stage transition rules.
- Integration tests for critical endpoints.
- Playwright: candidate creation, stage move, and rejection flow.

Acceptance Criteria
- Pipeline stages are configurable and enforced.
- Candidate workflow (create -> stage change -> hire/reject) works end-to-end.
- RBAC prevents unauthorized stage transitions.

### 2) Implicit Role Automation (Org Hierarchy Scopes)
Goal: auto-derive data scope and manager visibility based on org hierarchy.

Backend
- Update scope calculation in `backend/src/main/java/com/hrms/common/security`.
  - Extend `DataScopeService` to compute manager/team scopes from employee manager chain.
  - Add caching for scope results (Redis or in-memory).
- Ensure scope checks cover API filters and repository queries consistently.
- Add tests for hierarchical access (manager -> team -> self).

Frontend
- No major UI changes; verify scope-driven data visibility.

Acceptance Criteria
- Manager sees direct and indirect reports without manual scope assignment.
- Scope changes are reflected after org updates or re-login.
- RBAC scope checks match the computed hierarchy (no cross-team leakage).

### 3) Offer Management + E-Signature
Goal: offer letter creation, signing flow, and status tracking.

Backend
- Schema
  - Offer templates, offers, signers, status history.
  - Link offer to candidate/application.
- Services
  - Use `backend/src/main/java/com/hrms/domain/esignature` for sign flows.
  - PDF generation using existing OpenPDF integration.
- API
  - Endpoints for template CRUD, offer creation, send/resend, signature status.
- RBAC
  - Add permissions for offer templates, offer lifecycle actions, and signing.
  - Gate endpoints with `@RequiresPermission` and validate scope.
  - Scope must follow Keka-style access levels (All/Location/Department/Team/Self/Custom).
- Notifications
  - Email templates for offer sent, signed, declined.

Frontend
- Pages under `frontend/app/letters` or `frontend/app/recruitment`
  - Template builder/list.
  - Offer creation flow from candidate.
  - Signing status timeline.

Testing
- Unit tests for offer status transitions.
- Integration tests for PDF generation and send workflow.

Acceptance Criteria
- Offer can be created, sent, signed, and tracked.
- Offer status is visible in candidate profile.
- RBAC prevents template and offer actions for unauthorized roles.

## Phase 2 - P1 Features (High Priority)

### Reporting UI Parity
- Inventory report endpoints in `backend/src/main/java/com/hrms/api/report`.
- Build missing views under `frontend/app/reports`.
- Add filters, exports, and empty states.

### Manager/HR Dashboards
- Map to analytics APIs in `backend/src/main/java/com/hrms/api/analytics`.
- Add action cards (pending approvals, alerts).
- Validate role-based widget visibility.

### Attendance + Leave Integration
- Service-level integration:
  - Auto-update attendance when leave is approved or canceled.
  - Resolve conflicts (leave vs attendance records).
  - Add configuration for carry-over visibility.
- UI updates in `frontend/app/attendance` and `frontend/app/leave`.

### Expense Approval Chain
- Add approver levels and decision history to expense claims.
- UI for multi-step approvals and audit trail.

### Google Drive Backend Integration
- Replace client-only flow with server-side token storage.
- Secure token refresh and org policy enforcement.
- Maintain SSO UX described in `docs/architecture/SSO-IMPLEMENTATION.md`.

### OWASP Hardening
- Review security headers, request size limits, and CSP.
- Validate input sanitization and file upload checks.
- Update dependency scanning and error handling.

### Test Utility Fixes
- Update RoleScope/RolePermission test utilities and any broken mocks.
- Restore baseline test stability.

Acceptance Criteria (Phase 2)
- Reports and dashboards match backend capabilities.
- Attendance/leave data stays consistent across workflows.
- Expense approvals support multi-level decisions.
- Security hardening passes OWASP checklist in `docs/architecture/SECURITY_REQUIREMENTS.md`.

## Phase 3 - P2 Features (Medium Priority)

### Mobile PWA Attendance with GPS
- Add geofencing rules and GPS validation.
- Frontend PWA behavior in `frontend/app/attendance`.
- Offline capture (optional) and sync strategy.

### Social Engagement Refinements
- Improve social feed UX under `frontend/app/recognition` and `frontend/app/surveys`.
- Add moderation and privacy controls.

### Onboarding + Documents UI Completion
- Align UI with existing backend capabilities for document workflows.
- Add polish to onboarding and document pages.

### Project Templates and Import/Export
- Extend project templates in `backend/src/main/java/com/hrms/api/project`.
- UI for template management and import.

### Timesheet Locking Enhancements
- Add lock windows and admin override.
- UI for lock indicators and exceptions.

### Performance and Caching
- Identify large dataset endpoints; add pagination and indexes.
- Add Redis caching for heavy reads and dashboard summaries.

### Mobile Responsiveness and E2E
- Target top 20 pages with layout issues.
- Add E2E edge-case coverage.

Acceptance Criteria (Phase 3)
- Mobile attendance works with GPS enforcement.
- Social and onboarding UIs reach parity with backend.
- Performance improvements measurable on key endpoints.

## Phase 4 - P3 and Tech Debt

### P3 Features
- Helpdesk SLA automation and escalations.
- 9-box grid for succession planning.
- ATS job board integrations.
- Incident runbook and operational playbooks.

### Tech Debt
- Configure Mockito inline mock-maker to remove dynamic agent warnings.

Acceptance Criteria (Phase 4)
- SLA escalations and 9-box are functional end-to-end.
- Test and build logs are clean of Mockito warnings.

## Cross-Cutting Workstreams

### RBAC and Tenant Isolation
- Add permissions for every new endpoint and UI action.
- Update seed data in RBAC changelog.
- Verify tenant filtering in repositories.
- Verify controller gating with `@RequiresPermission` on all new endpoints.
- Verify UI permission checks align with backend permissions.
- Apply Keka-style scopes and L1 approval routing to P0 workflows.

### Observability
- Add structured logs for critical workflows (recruitment, offers).
- Emit metrics for key events (offer sent, candidate moved).

### Data Management
- Ensure migrations are reversible where possible.
- Maintain seed data for local dev and E2E.

### Testing Matrix
- Unit tests: services and domain rules.
- Integration tests: controller + service + repository.
- E2E tests: core user flows for each new feature.

## Suggested Execution Order (Default)
1) Phase 0 baseline
2) Recruitment ATS
3) Offer management + e-signature
4) Implicit role automation
5) Reporting UI parity
6) Manager/HR dashboards
7) Attendance/leave integration
8) Expense approval chain
9) Google Drive backend integration
10) OWASP hardening
11) Phase 2 items (P2)
12) Phase 3 items (P3 + tech debt)

## 10-day Release Plan (Parallel Execution)
Target: release in 10 days maximum. Scope is Phase 0 + P0 only. P1 is deferred unless ahead.

### Parallel Workstreams
- Track A: ATS schema + backend APIs (recruitment)
- Track B: ATS UI + pipeline integration
- Track C: Offer + e-signature backend + templates
- Track D: Offer UI + signing status
- Track E: Implicit role automation + scope caching
- Track F: QA + E2E + release docs
- Track G: Security hardening + baseline fixes

### Day-by-day Schedule
Day 1
- Phase 0 alignment, fix test compile, schema inventory, finalize feature flags.
- Define ATS pipeline statuses and data model.
- RBAC scope model decision (CUSTOM storage + scope merge rules).

Day 2
- Implement ATS migrations + entities + repositories.
- Start API scaffolding and UI skeleton.

Day 3
- ATS CRUD + pipeline transition endpoints.
- UI: candidate list + pipeline board basic.
- RBAC: role/permission payload updates + baseline UI scope selector (skeleton).

Day 4
- Offer schema + PDF template + email templates.
- Offer API endpoints; UI template list.

Day 5
- Offer send + signature status flow; UI integration.
- Implicit role automation implementation.
- RBAC: custom scope handling in DataScopeService (MVP).

Day 6
- ATS workflow polish; role automation tests; UI workflows.
- RBAC audit: permission matrix, endpoint gating, and UI visibility checks.

Day 7
- Integration testing; fix cross-module issues; security pass (headers, validation).

Day 8
- E2E coverage for P0 flows; regression testing; bugfix.

Day 9
- Final hardening; seed data for demo; documentation updates.

Day 10
- Release candidate build; smoke test; release.

### Dependencies and Critical Path
- ATS schema -> ATS API -> ATS UI.
- Offer schema -> Offer API -> Offer UI.
- Role automation affects data visibility; must land before E2E.
- Security hardening must land before release candidate.

### Scope Control for 10-day Release
- ATS: limit pipeline to core statuses (Applied, Screened, Interview, Offered, Hired, Rejected).
- Offers: minimal template placeholders, single-signer flow, basic status tracking.
- E-signature: approve/decline only, no complex routing.
- RBAC: implement required scopes (All/Location/Department/Team/Self/Custom) for P0 modules only.
- Defer P1 items unless all P0 flows are stable by Day 6.

## Open Decisions
- Should recruitment, LMS, and social features be enabled by default in dev?
- Do we store derived scopes in JWT or compute dynamically per request?
- Is Google Drive backend integration required for the next release or staged?
- Where should CUSTOM scope targets live (role_permissions vs separate table)?
