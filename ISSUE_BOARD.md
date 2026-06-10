# NU-AURA Production Green-Flag — Live Issue Board

**Run:** 2026-06-10 · **Deadline:** 2026-06-11 (today/tomorrow, compressed scope) · **Target env:** local (frontend :3000, API :8080) · **Orchestrator:** Bridge Agent (Claude)

**Compressed-scope rule:** critical business paths only; only CRITICAL and HIGH issues block; MEDIUM/LOW logged for post-release.

## Audit Plan & Task Breakdown

| Task ID | Agent | Scope (compressed) | Priority | Dependency | Expected Output | Done When |
|---------|-------|--------------------|----------|------------|-----------------|-----------|
| BA-01 | ba | Business use cases for core modules (employee, leave, attendance, payroll, approvals); missing flows; acceptance criteria | P0 | — | docs/audit/green-flag/ba.md | Criteria defined for all P0 flows |
| PROD-01 | product | Screen/API/journey audit: dead ends, broken flows, missing validations on P0 paths | P0 | — | docs/audit/green-flag/product.md | Must-fix list prioritized |
| DEV-01 | dev | Architecture, API contracts, data models, implementation gaps with file-level fixes | P0 | — | docs/audit/green-flag/dev.md | Gaps with exact file refs |
| QA-01 | qa | Test matrix (role × CRUD × invalid × boundary × session × empty) + execution checklist | P0 | — | docs/audit/green-flag/qa.md | Matrix complete, expected results per case |
| RBAC-01 | rbac | Roles/permissions vs 04_RBAC_PERMISSION_MATRIX.md; escalation risks; SuperAdmin bypass = BY DESIGN | P0 | — | docs/audit/green-flag/rbac.md | All P0 boundaries verified |
| SEC-01 | security | AuthN/Z, injection, data exposure, secrets, rate limits, session, OWASP (API + UI abuse) | P0 | — | docs/audit/green-flag/security.md | Findings with severity + remediation |
| DATA-01 | data | CRUD flows: required fields, duplicates, referential integrity, audit trail, tenant isolation, concurrency | P0 | — | docs/audit/green-flag/data.md | All P0 creation flows assessed |
| INT-01 | integration | Kafka/Redis/ES/MinIO/email/webhooks: failure handling, retries, timeouts, idempotency, observability | P1 | — | docs/audit/green-flag/integration.md | Failure modes mapped |
| UI-01 | ui | Browser: login per role, RBAC visibility, create/update/delete, validations, errors, leave-approval E2E | P0 | Chrome connected | docs/audit/green-flag/ui.md | P0 journeys pass/fail recorded |
| REL-01 | release | Wave 2: tsc --noEmit, backend build, Flyway chain, monitoring, rollback, smoke | P0 | Fixes landed | docs/audit/green-flag/release.md | Sign-off or blockers listed |

## Issue Board

Severity: CRITICAL | HIGH | MEDIUM | LOW · Status: Open → In Progress → Fixed → Retest → Closed

| ID | Severity | Module | Description | Impact | Exact Fix | Owner Agent | Status |
|----|----------|--------|-------------|--------|-----------|-------------|--------|
| ENV-1 | HIGH | tooling | Claude-in-Chrome extension not connected; UI wave blocked | No browser-based UI/RBAC validation until connected | User: open Chrome with extension signed in | orchestrator | Open |

## Green-Flag Criteria (ALL must be true for GO)

- [ ] Zero open CRITICAL security issues
- [ ] Zero open CRITICAL RBAC gaps (SuperAdmin bypass intact and verified)
- [ ] All must-have business flows pass via UI
- [ ] All creation flows validated (tenant isolation + audit trail)
- [ ] `npx tsc --noEmit` and backend build clean
- [ ] Deployment checklist + rollback plan complete (release sign-off)
- [ ] Monitoring/logging active
- [ ] Remaining known issues documented with severity here
