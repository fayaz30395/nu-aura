You are a Principal Solution Architect + Staff Engineer + Senior Developer.

Objective:
Build an HRMS (KEKA-like) for a SINGLE TENANT (one organization) with enterprise-grade RBAC and a KEKA-like Permission Matrix. Must include Google SSO (OIDC), Google Drive integration, Gmail integration, Google Calendar integration, and a notification system (in-app + email; optional calendar invites).

Hard Rules:
- Follow phases strictly: (1) Discovery (2) Requirements (3) Design (4) Tasks (5) Implement.
- DO NOT write any code until I explicitly approve after each phase.
- At the end of each phase, STOP and ask for my approval to proceed.
- Challenge assumptions and propose alternatives with trade-offs.
- Optimize for correctness, security, maintainability, extensibility.
- RBAC must be enforced at API/service layer; UI gating is secondary.
- For list endpoints: enforce access via SQL-level filtering (no in-memory filtering of large lists).

Technology Stack (fixed):
- Frontend: Vite + React + TypeScript
- Backend: Java 21 + Spring Boot 3 (REST)
- DB: PostgreSQL
- Cache: Redis (optional for permission caching/session)
- Auth: Google Sign-In via OAuth2/OIDC + JWT session
- Storage: Google Drive (primary documents) + optional GCS fallback
- Email: Gmail / Google Workspace API for transactional emails
- Calendar: Google Calendar API for HR events
- Notifications: in-app + email (design extensible for SMS/WhatsApp later)
- Infra: Docker local; deploy later to GCP/K8s

Scope (modules; MVP first, extendable):
1) IAM: Google SSO + RBAC + Permission Matrix + Audit logging
2) EMP: Employee lifecycle, onboarding, manager, documents
3) ORG: departments, designations, locations, teams
4) LEAVE: policies, balances, apply/approve, calendar entries
5) ATT: daily view, regularization, approvals
6) DOC: upload/store in Google Drive with access control + metadata
7) ANN: announcements scoped by dept/team/org
8) TASK: basic projects/tasks
9) REP: reports (headcount, leave usage, attendance anomalies)
10) AUDIT: audit logs viewer/export
11) INTEG: Google integrations management
12) SET: holidays, leave policies, shift rules

Non-Functional Requirements:
- Security: OWASP, least privilege, secure OAuth, audit trail, rate limiting, validation, secrets mgmt.
- Reliability: idempotency where needed, retries/backoff for Google APIs, graceful degradation for Drive/Gmail/Calendar failures.
- Observability: structured logs, correlation IDs, health checks, basic metrics.
- Data: single-tenant now, but design should be “multi-tenant ready” without implementing tenancy.

RBAC Requirements (mandatory deliverable):
- Permission = { module, action, scope }
- Scope ∈ { SELF, TEAM, DEPARTMENT, ORG } ; TEAM = direct reports only (MVP)
- Must support Permission Groups + Custom Roles (admin creates roles by selecting permissions)
- Default role templates:
  SUPER_ADMIN, HR_ADMIN, HR_EXECUTIVE, MANAGER, EMPLOYEE, FINANCE(optional), IT_ADMIN(optional)
- Must include policy evaluation rules and examples.
- Must support “Confidential Data” flag for fields/docs (bank, IDs, salary, etc.) restricted to HR_ADMIN/SUPER_ADMIN/FINANCE.

Google Integrations (mandatory):
A) Google SSO (OIDC):
- Workspace login
- Domain allowlist: auto-provision only if email domain matches allowed domain(s), else reject
- Map Google identity to internal user record, allow admin role assignment

B) Google Drive:
- Store HRMS docs in Drive
- Define folder hierarchy strategy
- Store fileId + metadata in DB
- Enforce access via RBAC (do not expose raw file URLs without app authorization)
- Audit upload/download/view events

C) Gmail:
- Send transactional emails (onboarding invite, leave approval, attendance regularization, announcements)
- Explain recommended secure approach: service account + domain-wide delegation OR user-consent flow (pick one for MVP and justify)
- Email templates strategy + versioning

D) Google Calendar:
- Create/update/cancel events for: leave approvals (optional), onboarding meetings, interviews, reminders
- Store eventId references in DB
- Ensure changes are idempotent and consistent with approvals

Permission Matrix Baseline (use this as starting point; refine as needed):
[Use the exact roles/actions/scopes described below in your design. Convert into an editable matrix.]

- SUPER_ADMIN: All modules all actions ORG scope.
- HR_ADMIN: HR operations ORG scope (role mgmt optional), audit view, reports export.
- HR_EXECUTIVE: operational HR with limited admin (mostly department/org HR workflows).
- MANAGER: TEAM scope approvals + team visibility; self updates.
- EMPLOYEE: self-service.
- FINANCE: reporting/export limited; finance docs only.
- IT_ADMIN: integrations + settings + audit technical view.

Policy Evaluation Requirements:
- Central Authorization service: hasPermission(user, module, action, scope, targetEmployeeId/departmentId)
- Scope resolution:
  SELF: userId == targetEmployeeId
  TEAM: targetEmployee.managerId == userId (direct reports only MVP)
  DEPARTMENT: targetEmployee.departmentId == user.departmentId OR admin override
  ORG: allowed for org-admin roles
- Enforce scope in DB queries for list endpoints.

Admin UX Requirements:
- Role management screen (CRUD roles, assign permissions, assign users)
- Permission Matrix view (Role × Module × Actions with scope selectors)
- “Effective permissions” preview for a user
- Seed default roles + permission groups

Deliverables by Phases:

PHASE 1 — Discovery (your next response must be ONLY questions):
Ask 15–25 clarifying questions grouped under:
1) Org policies: leave types, working days, holidays, approval chains
2) Attendance rules: shift timing, grace, regularization rules, weekends
3) RBAC: which roles required day-1; who manages roles (HR vs IT)
4) Scope semantics: TEAM (direct reports only) confirm; any exceptions
5) Documents: doc types, confidential categories, retention, access
6) Google Workspace: allowed domains, admin setup, service account feasibility
7) Notifications: events, channels (in-app/email), digests vs real-time
8) Calendar: which workflows create events; opt-in/out rules
9) Imports: CSV import needs (employees/org/policies)
10) Reporting: top 10 reports for MVP

After I answer, proceed to:

PHASE 2 — Requirements:
- 20–30 user stories across modules
- Acceptance criteria for EACH story using WHEN/IF/SHALL
- Explicit MVP boundaries (out of scope)
  Then STOP and ask for approval.

PHASE 3 — Design (after approval):
Include:
1) Architecture text diagram + responsibilities
2) Domain model (entities + relationships)
3) RBAC model + Permission Matrix table + examples
4) API contracts + 6 sample flows:
    - Google SSO login + provisioning
    - Admin creates role by selecting permissions
    - HR creates employee + onboarding invite email
    - Leave apply → approve → notifications + calendar (if enabled)
    - Attendance regularization → approve → audit
    - Document upload to Drive → RBAC controlled access
5) Google integrations design: tokens, refresh, storage, retries/backoff, failure handling
6) Audit logging strategy (event list + schema)
7) Error handling (Problem+JSON) + validation
8) Security checklist
9) Testing strategy
10) DevOps: docker-compose, migrations (Flyway/Liquibase), env vars

Then STOP and ask for approval.

PHASE 4 — Tasks (after approval):
- Ordered tasks with dependencies
- Milestones M1..M6 as defined
- Estimates in S/M/L only
  Then STOP and ask for approval.

PHASE 5 — Implementation (after approval):
Implement milestone-by-milestone with backend + tests first, then frontend.
Include seed data and run instructions.
 Google Integrations Constraints Block (Security + Correctness Baseline)

You must design Google integrations with least privilege, strong secrets hygiene, and operational safety.

1) Choose ONE MVP Integration Model and justify:
   A) Service Account + Domain-Wide Delegation (DWD) (Recommended for single-tenant Workspace)
- Backend acts as an org system using a Google Workspace admin-approved service account.
- Backend impersonates a specific Workspace user (e.g., hrms-system@company.com) for Drive/Gmail/Calendar operations.
- Pros: No per-user consent prompts; consistent system behavior; easier ops.
- Cons: Requires Workspace admin; more sensitive if compromised.

B) Per-user OAuth Consent (Recommended only if DWD is not possible)
- Each user authorizes Drive/Gmail/Calendar access.
- Pros: User-level separation.
- Cons: Complex token management; lots of support friction; inconsistent permissions.

MVP Default: Prefer A) DWD with a dedicated “system user” mailbox + calendar.

2) Google SSO (OIDC) — Authentication to HRMS
- Use Google OpenID Connect to authenticate users.
- Enforce Workspace domain allowlist (e.g., only *@company.com).
- Map (sub, email) to internal User record. Treat "sub" as stable primary external identifier.

OIDC Scopes (minimum):
- openid
- profile
- email
  (Use Google’s OIDC endpoints via Spring Security OAuth2 client.)

3) Drive Integration — Documents Storage
   Design Goal:
- Store employee documents in Google Drive while enforcing access via HRMS RBAC (never rely solely on Drive sharing UI).

Recommended Strategy:
- Use a single Org Root folder or Shared Drive (preferred if available).
- Store file references in DB: {driveFileId, driveFolderId, mimeType, size, checksum, createdBy, classification, employeeId, retentionPolicy, version, status}.
- Folder hierarchy (choose one):
  Option 1: OrgRoot/Employees/{employeeCode}/
  Option 2: OrgRoot/Departments/{dept}/Employees/{employeeCode}/
- Avoid sharing docs directly with users. Provide access via HRMS API that streams/downloads after authorization.
- For performance and control: generate short-lived download links ONLY after RBAC check (or proxy file via backend).

Drive OAuth Scopes (least privilege first):
- Prefer: https://www.googleapis.com/auth/drive.file
  (If insufficient for org-wide folder/file management, use broader scopes.)
- If you need full folder hierarchy management/org-wide access:
  https://www.googleapis.com/auth/drive
- If read-only needs:
  https://www.googleapis.com/auth/drive.readonly
- Consider metadata-only:
  https://www.googleapis.com/auth/drive.metadata.readonly

Operational Requirements:
- Use resumable uploads for large files.
- Validate MIME type + file size limits.
- Use exponential backoff for 429/5xx.
- Record audit events: DOC_UPLOAD, DOC_VIEW, DOC_DOWNLOAD, DOC_DELETE with actor + target + timestamp.

4) Gmail Integration — Transactional Email Sending
   Design Goal:
- Send system emails (invites, approvals, announcements) reliably, with templates and auditability.

Recommended Strategy:
- Use a dedicated mailbox: hrms-system@company.com
- Send emails via Gmail API using DWD impersonation.
- Store message metadata: {to, subjectTemplate, templateVersion, correlationId, gmailMessageId, status, error, sentAt}

Gmail OAuth Scopes:
- Send only:
  https://www.googleapis.com/auth/gmail.send
- If you must read threads (avoid unless required):
  https://www.googleapis.com/auth/gmail.readonly

Email Template Strategy:
- Templates versioned (code-based with version tags OR DB-based with version history).
- Variables strictly validated (no arbitrary HTML injection).
- Support localization later (out of MVP).

Operational Requirements:
- Idempotency: avoid duplicate sends for retries (use correlationId + outbox pattern).
- Rate limits: backoff for 429.
- Audit events: EMAIL_SENT, EMAIL_FAILED with correlationId.

5) Google Calendar Integration — Events + Invites
   Design Goal:
- Create/update/cancel events aligned with HR workflows (leave, interviews, onboarding meetings).

Recommended Strategy:
- Use a dedicated calendar owned by hrms-system@company.com OR per-user calendar (only if required).
- Store event linkage in DB: {eventId, calendarId, eventType, relatedEntityId, status, lastSyncAt}

Calendar OAuth Scopes:
- Manage events:
  https://www.googleapis.com/auth/calendar.events
- Read-only:
  https://www.googleapis.com/auth/calendar.readonly

Idempotency & Consistency Rules:
- Every workflow event must have a deterministic key (e.g., LEAVE:{leaveRequestId}).
- On approval change: update existing event; on cancellation: cancel event.
- Handle partial failures: if DB updated but Calendar fails, queue retry via outbox/job.

Optional:
- Send invites to attendees (employee + manager) when relevant.
- Support opt-in/out at org policy level for leave calendar events.

Audit Events:
- CAL_EVENT_CREATE, CAL_EVENT_UPDATE, CAL_EVENT_CANCEL, CAL_EVENT_FAIL

6) Token & Secrets Handling (Critical)
   If using DWD:
- Store service account credentials securely (env secret manager; never in repo).
- Use short-lived access tokens; do not persist access tokens long-term.
- For impersonation, record the impersonated subject (hrms-system@company.com).

If using per-user OAuth:
- Store refresh tokens encrypted at rest (KMS), keyed by userId.
- Implement token rotation and revocation handling.
- Provide “disconnect Google” per user.

7) Reliability Patterns (Must Implement in Design)
- Outbox pattern for external side effects (email/calendar/drive changes) to guarantee delivery and safe retries.
- Retry policy: exponential backoff + jitter; stop after N attempts; dead-letter queue/table for manual intervention.
- Circuit breaker for Google API outages; degrade gracefully (e.g., app still works, but notifications marked pending).
- Correlation ID propagated in logs and stored in notification/email/calendar records.

8) Security Controls
- Enforce domain allowlist at login and provisioning.
- Least privilege scopes only.
- Strict server-side authorization for any document access.
- Prevent IDOR: never expose raw Drive file IDs to clients unless your API gates access.
- Audit all privileged actions and external integrations.

9) Admin Setup Checklist (for Workspace)
- Create service account in GCP project.
- Enable required APIs: Drive API, Gmail API, Calendar API.
- Configure OAuth consent screen (if per-user flow).
- If DWD:
    - Workspace Admin: enable domain-wide delegation for the service account client ID
    - Add only required scopes (minimize)
    - Create dedicated system user mailbox and calendar
- Define allowed email domains for SSO provisioning.

Now, incorporate these constraints into the overall design and explicitly choose Model A (DWD) unless I say DWD is not possible. 

Now start PHASE 1 (Discovery). Ask ONLY the questions.