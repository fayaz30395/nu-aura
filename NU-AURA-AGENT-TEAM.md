# NU-AURA Autonomous Agent Team

> Single source of truth for continuous multi-agent exploration, validation, bug fixing, RBAC
> auditing, and UI/UX improvement across the NU-AURA platform.

---

## What This File Is

This file is the one markdown document to use for continuous autonomous execution.

Use it when you want an agent team to:

- discover every reachable screen and user journey
- execute real user interactions across roles
- validate RBAC and permission boundaries
- identify and fix functional, structural, and UI/UX defects
- re-validate fixes and continue into uncovered paths
- maintain a living coverage and defect report with minimal supervision

This is an execution playbook, not just a planning prompt.

---

## Important Correction

Do not instruct the team to "run forever" literally.

Use bounded autonomous cycles:

- continue in repeated loops
- stop only when one of these happens:
  - no new reachable path remains in the current environment
  - a hard blocker prevents further progress
  - the execution budget is exhausted
  - the user explicitly stops the run
- after each loop, publish status and continue immediately if work remains

This keeps the team reviewable, safe, and operationally useful.

---

## Prerequisites

1. Run from the NU-AURA project root:

- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`

2. Read repo instructions first:

- `AGENTS.md`

3. Prefer existing repo tooling before adding anything new.
4. If using an agent-team capable client, enable the relevant team / delegation mode there.

---

## Recommended Plugin / Tool Stack

Use as many of these as the environment supports.

| Category            | Preferred Tool / Plugin                              | Purpose                                                            |
|---------------------|------------------------------------------------------|--------------------------------------------------------------------|
| Browser automation  | Playwright                                           | Traverse screens, click flows, form submission, screenshot capture |
| API inspection      | OpenAPI / Swagger docs                               | Verify contracts and compare UI vs API behavior                    |
| Network validation  | Browser network inspector / Playwright request hooks | Catch failed requests, auth issues, missing payload fields         |
| Accessibility       | axe-core or Playwright accessibility snapshots       | Detect contrast, labels, focus, keyboard issues                    |
| Visual regression   | Screenshot diff tooling                              | Catch layout drift and broken states                               |
| Code search         | `rg`                                                 | Discover routes, permission gates, service usage, dead paths       |
| Frontend quality    | `npm run lint`, `npx tsc --noEmit`, Vitest           | Prevent regressions                                                |
| E2E quality         | `npx playwright test`                                | Validate critical flows                                            |
| Backend quality     | `./mvnw test`                                        | Validate server behavior and permissions                           |
| API replay          | curl / Postman / REST client                         | Reproduce backend issues outside UI                                |
| Database validation | psql / SQL client / Neon console                     | Confirm tenant isolation, soft deletes, and data effects           |
| Observability       | logs, Grafana, Prometheus, app console               | Root-cause failing flows                                           |

Do not add new libraries if the repo already has the needed capability.

---

## Team Topology

Create these agents and make them communicate directly with each other, not only through the lead.

### 1. Analyzer Agent

Owns:

- route discovery
- screen inventory
- user-journey mapping
- test path prioritization
- gap detection

Responsibilities:

- crawl frontend routes from `frontend/app/`
- inspect navigation config, middleware, and app switcher logic
- build a coverage map by module, role, and state
- identify unexplored and high-risk flows first
- continuously update the exploration queue

Primary files:

- `frontend/app/`
- `frontend/lib/config/`
- `frontend/middleware.ts`
- `frontend/components/platform/`

### 2. Developer Agent

Owns:

- root-cause fixes
- code refactors
- structural cleanup
- performance improvements

Responsibilities:

- fix backend and frontend defects at the source
- preserve repo conventions
- avoid superficial UI-only masking for backend bugs
- add or update tests when changing behavior

Primary files:

- `frontend/`
- `backend/src/main/java/com/hrms/`
- `backend/src/test/`
- `frontend/e2e/`

### 3. QA Agent

Owns:

- expected vs actual validation
- edge-case testing
- regression verification
- role and permission boundary testing

Responsibilities:

- validate forms, tables, filters, modals, drawers, empty states, pagination, and destructive
  actions
- test happy path, failure path, empty state, validation errors, and loading state
- confirm role-level access behavior for ESS, MSS, HR Admin, Payroll Admin, Recruiter, SuperAdmin,
  and restricted users

### 4. UX/UI Reviewer Agent

Owns:

- visual consistency
- interaction quality
- accessibility
- responsive behavior

Responsibilities:

- review typography, spacing, alignment, color usage, button hierarchy, card patterns, tables, and
  form density
- flag inconsistent Mantine usage or repeated custom styling drift
- review mobile and desktop layouts
- capture screenshots for before/after comparisons when useful

### 5. Validator Agent

Owns:

- final verification of each fix
- confirmation that regressions were not introduced
- sign-off before continuing to the next loop

Responsibilities:

- re-run repaired flows
- verify related adjacent flows
- reject fixes that do not survive end-to-end validation

---

## Roles To Simulate

At minimum, test these personas if the environment allows:

- Employee Self-Service
- Reporting Manager
- HR Admin
- Recruiter
- Payroll Admin
- Finance Approver
- IT / Asset Admin
- SuperAdmin
- unauthorized or low-permission user

If seeded accounts do not exist, create or seed realistic test users and record which ones were
used.

---

## Operating Rules

1. Read `AGENTS.md` before starting.
2. Respect tenant isolation and soft-delete rules in every validation.
3. Do not hardcode approval logic or bypass permission checks for convenience.
4. Prefer root-cause fixes over one-off patches.
5. Every code fix must be followed by validation.
6. Every validation must update the living report.
7. If a blocker is found, document:

- impact
- exact failing area
- suspected cause
- required dependency or environment gap

8. Require lead review before changes to:

- `SecurityConfig.java`
- `frontend/middleware.ts`
- any Flyway migration

---

## Mandatory Execution Loop

Run the following loop repeatedly.

### 1. Analyze

- discover routes and reachable screens
- inspect menu structure and hidden role-based entry points
- update the coverage map
- choose the next highest-value unexplored path

### 2. Execute

- perform real user actions
- click buttons, submit forms, navigate, filter, search, paginate, open modals, cancel flows, retry
  failures
- test both valid and invalid inputs

### 3. QA

- compare expected vs actual behavior
- verify UI state transitions
- verify network responses and backend outcomes
- verify permission enforcement

### 4. Fix

- correct the code
- add or update tests where appropriate
- clean up duplicated or inconsistent patterns

### 5. Validate

- re-run the repaired path
- test nearby related paths
- confirm regression-free behavior

### 6. Review

- inspect design consistency and accessibility
- identify reusable UI improvements
- log design debt separately from functional defects

### 7. Continue

- move to the next uncovered path
- continue until blocked or coverage is exhausted for the current environment

---

## Required Reporting Format

Maintain one living markdown report during the run.

Recommended file:

- `docs/validation/autonomous-sweep-report.md`

Update these sections continuously:

### 1. Coverage Map

Track:

- module
- route or screen
- user role tested
- status: not started / in progress / validated / blocked
- notes

### 2. Bug List

Track:

- bug id
- severity: P0 / P1 / P2 / P3
- module
- role affected
- reproduction steps
- expected behavior
- actual behavior
- root cause
- status: open / fixed / validated / blocked

### 3. Fix Log

Track:

- bug id
- files changed
- summary of code change
- tests added or run
- validator result

### 4. UI/UX Findings

Track:

- inconsistency or accessibility issue
- affected screens
- recommendation
- status

### 5. Remaining Unknowns

Track:

- blocked flows
- unavailable roles
- missing test data
- environment limitations

---

## Quality Gates Per Loop

Before marking a fix complete, run the relevant checks.

### Frontend

- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run lint`
- relevant Vitest tests
- relevant Playwright tests

### Backend

- `cd backend && ./mvnw test`
- module-specific tests for changed logic

### Integration

- confirm API response shape still matches frontend usage
- confirm role access is correct
- confirm no cross-tenant leakage

Do not run the full suite after every tiny change if targeted checks are enough, but run enough to
defend the fix.

---

## Scope Prioritization

Explore in this order unless a blocker changes priority:

1. auth, login, logout, session restore, middleware gating
2. dashboard and global navigation
3. employee self-service critical flows
4. manager approvals
5. HR admin operations
6. leave, attendance, payroll-adjacent flows
7. recruitment, onboarding, offboarding
8. expenses, assets, loans, travel, benefits, projects
9. performance and training
10. admin settings, roles, permissions, audit views

Prioritize flows with:

- money impact
- legal or compliance impact
- role escalation risk
- tenant isolation risk
- navigation dead ends
- broken create, edit, approve, or settlement journeys

---

## Ready-to-Paste Prompt

Copy everything inside the fence below and use it as the first message in your agent-team session.

```text
You are the autonomous multi-agent execution team for the NU-AURA HRMS platform.

Mission:
Continuously explore, validate, repair, and improve the application end-to-end across all reachable roles, screens, and interaction flows with minimal manual intervention.

Primary objectives:
1. Traverse every reachable screen and user journey.
2. Validate UI interactions including navigation, buttons, forms, filters, modals, tables, pagination, loading states, and error states.
3. Verify RBAC enforcement across all available roles and permission boundaries.
4. Identify and fix functional, UI/UX, accessibility, and structural issues.
5. Continuously improve design consistency and code quality while preserving repo architecture.

Create these agents:
1. Analyzer Agent
2. Developer Agent
3. QA Agent
4. UX/UI Reviewer Agent
5. Validator Agent

Shared operating rules:
- Read AGENTS.md first.
- Use bounded autonomous loops, not a literal infinite loop.
- Maintain a living report at docs/validation/autonomous-sweep-report.md.
- Prefer existing repo tools and plugins before adding new ones.
- Use Playwright for browser traversal where possible.
- Use lint, typecheck, unit tests, backend tests, and targeted E2E coverage as quality gates.
- Validate tenant isolation, soft deletes, approval flows, and SuperAdmin behavior.
- Never close a bug as fixed until Validator confirms it in a real flow.
- Communicate directly with each other when a frontend symptom has a backend root cause or vice versa.
- Require lead review before edits to SecurityConfig.java, frontend/middleware.ts, or any Flyway migration.

Tooling / plugins to use where available:
- Playwright for browser automation
- OpenAPI / Swagger for contract verification
- accessibility tooling such as axe
- screenshot diff or visual review for layout regressions
- repo-native lint, typecheck, unit, integration, and backend test commands
- logs, network tracing, and database inspection for root-cause analysis

Role coverage to simulate:
- Employee Self-Service
- Reporting Manager
- HR Admin
- Recruiter
- Payroll Admin
- Finance Approver
- IT / Asset Admin
- SuperAdmin
- unauthorized / restricted user

Execution loop:
1. Analyze uncovered routes and prioritize the next path.
2. Execute the path with realistic user behavior.
3. QA the observed behavior and permission boundaries.
4. Fix root causes in code.
5. Validate the repaired flow and nearby regression risk.
6. Review design consistency and accessibility.
7. Update the living report and continue with the next path.

Stop only when:
- no new reachable path remains in the current environment
- a blocker prevents further progress
- the execution budget is exhausted
- the user explicitly stops the run

Report after each loop:
- coverage gained
- bugs opened
- bugs fixed
- validations completed
- current blockers
- next target path

Start by:
1. building a route and role coverage map
2. choosing the highest-risk unvalidated flow
3. executing the first loop immediately
```

---

## Steering Notes

- If the lead starts doing all the work directly, redirect it back to delegation and validation.
- If two agents need the same file, they must coordinate ownership before editing.
- If a path is blocked by missing data or credentials, log it and continue with the next
  highest-value reachable path.
- Keep the report current enough that a new lead can resume from the latest loop without
  re-discovery.

---

## Suggested Follow-Up Automation

If you want to operationalize this further, build these next:

- `docs/validation/autonomous-sweep-report.md` as a template
- Playwright smoke specs for top route coverage
- seeded RBAC test accounts
- a route inventory generator from `frontend/app/`
- a permission matrix cross-check against backend endpoint annotations

