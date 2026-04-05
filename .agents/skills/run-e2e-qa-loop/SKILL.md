---
name: run-e2e-qa-loop
description: Run a complete end-to-end QA loop for NU-AURA with Google Chrome-based UI validation: analyze a feature or module, create a deep QA plan, execute backend and frontend tests, inspect browser behavior and visuals in Chrome, review failures, fix issues, re-run targeted and broad regression, and repeat until the exit criteria are met. Use when the user wants a full QA pass, Google Chrome UI validation, end-to-end validation, bug bash, release readiness check, repeated test-fix-retest loops, or a stronger FAANG-style QA workflow.
---

# Run E2E QA Loop

Use this skill when the task is not just "run tests", but "own quality until confidence is high".
The workflow is deliberate:

1. Understand the feature and blast radius
2. Build a risk-based QA plan
3. Execute tests in the right order
4. Diagnose failures into product bugs, test bugs, data/setup gaps, or environment faults
5. Fix what is in scope
6. Re-run focused checks first, then regression
7. Loop until exit criteria or a hard blocker

This skill is for NU-AURA specifically:

- Frontend: Next.js 14, TypeScript, Playwright in `frontend/e2e`, Vitest in `frontend/`
- Backend: Spring Boot 3.4.1, JUnit 5 + Mockito in `backend/src/test`
- Security: role hierarchy, `@RequiresPermission`, tenant isolation, JWT cookies
- Architecture: bundle app with HRMS/Hire/Grow/Fluence modules

UI validation is Google Chrome-first. Treat browser validation as a core signal, not a nice-to-have:

- Use Playwright against Google Chrome for interactive UI checks
- Use screenshots and existing visual regression assertions where possible
- Inspect console errors, failed network calls, broken loading states, and interaction dead ends
- Validate responsive behavior when the route or component is user-facing

If Playwright browser projects are configurable, prefer `channel: 'chrome'` or the equivalent Chrome
project over generic Chromium. Use generic Chromium only as a fallback when Google Chrome is
unavailable in the environment.

## Non-negotiables

- Do not claim quality from one test pass. Move from targeted checks to regression.
- Do not treat flaky tests as product passes. Isolate cause.
- Do not patch tests to hide regressions.
- Do not stop at the first failure unless the environment is fundamentally broken.
- Do not regress tenant isolation, RBAC, or audit-sensitive behavior while fixing feature bugs.

## Primary Outcomes

By the end of the loop, produce:

- A feature QA brief
- A prioritized test matrix
- Executed checks with evidence
- A defect list grouped by root cause and severity
- Fixes for in-scope issues
- Recheck results after fixes
- A final verdict: pass, pass with known risk, or blocked

## Platform-Aware Reference Model

Use the following platform assumptions when building the QA plan. If the codebase disagrees, trust
the repo and note the mismatch.

### Sub-apps

- `NU-HRMS`: core HR, attendance, leave, payroll, expenses, assets, approvals, admin, analytics
- `NU-Hire`: recruitment, onboarding, preboarding, offboarding, careers
- `NU-Grow`: performance, OKR, feedback360, training, recognition, surveys, wellness
- `NU-Fluence`: knowledge/content/collaboration surfaces and search-oriented routes

### Role model

Apply both the project role hierarchy and the platform route-role expectations during QA:

- `Super Admin`: bypasses permission and feature gating
- `Tenant Admin`
- `HR Admin`
- `App Admin`
- `HR Manager`
- `Hiring Manager`
- `Team Lead`
- `Employee`
- `Candidate`
- `Viewer`
- Unauthenticated user: blocked from protected routes and redirected to login

### Security truths to keep in memory

- JWT contains roles, not the full permission set
- Permissions are loaded from DB/cache and may become stale after role changes
- DB format is `module.action`
- Code checks may use `MODULE:ACTION`
- Super Admin bypass must remain intact through controller, service, frontend gate, and middleware
  layers

## Global Preflight

Run these once before the first QA loop unless the user explicitly wants a narrow static-only
review.

### Environment sanity

```bash
curl -s http://localhost:3000 | head
curl -s http://localhost:8080/actuator/health
```

If services are not healthy, inspect the repo’s documented run path before improvising. Prefer
existing startup commands and compose files already checked into the repo.

### Browser sanity

Before UI validation:

- Confirm Google Chrome is installed or the Playwright Chrome channel is available
- Prefer a dedicated Playwright Chrome project if the config defines one
- If not present, add a note that the skill is using fallback Chromium and that browser parity risk
  remains

Suggested checks:

```bash
cd frontend && npx playwright test --list
cd frontend && npx playwright test frontend/e2e/smoke.spec.ts --project=chrome
```

### Artifact directories

Preserve evidence. Create QA artifact folders if they do not exist.

```bash
mkdir -p qa-reports
mkdir -p qa-reports/screenshots
mkdir -p qa-reports/logs
mkdir -p qa-reports/traces
```

### Preflight evidence

Record:

- frontend health status
- backend health status
- browser project used: `chrome` preferred
- target feature/module
- tenant and role assumptions
- current branch and changed files if relevant

## Standard Checks For Every UI Page

Apply these to every UI-facing route in scope. These are not optional.

### Load and structure

- Route loads without white screen
- Primary heading is visible and route identity is obvious
- Skeleton/placeholder state appears intentionally if data is loading
- Empty state is informative and actionable
- Error state is visible and recoverable

### Google Chrome interaction

- Primary action is visible and clickable
- Forms can be completed with mouse and keyboard
- Enter, Escape, Tab, Shift+Tab behave predictably
- Browser back/forward does not corrupt the flow
- Refresh does not cause invalid stuck state or duplicate submission

### Visual quality

- No clipped modal or drawer
- No hidden action behind overflow, sticky header, or z-index bug
- No unreadable text, collapsed spacing, or layout jump
- Tables, cards, badges, chips, and pagination render coherently
- Important actions are not pushed below broken fold or off-screen overflow

### Responsive behavior

Check at minimum:

- Desktop: `1280x900`
- Tablet: `768x1024`
- Mobile: `375x812`

Validate:

- no horizontal overflow
- tappable controls remain usable
- dialogs fit the viewport
- sticky toolbars and nav remain usable

### Browser diagnostics

After each key interaction, inspect:

- console errors
- failed requests
- long-running requests
- unexpected redirects
- HTML returned from API endpoints, which often signals backend failure

## Standard Checks For Every API/Workflow

- Allowed role succeeds
- Disallowed role is rejected cleanly
- Wrong-tenant data is not returned
- Validation errors are explicit and field-correct
- Double-submit does not create duplicate records
- Backend failure yields error UI, not dead UI
- Side effects complete or fail atomically
- Audit-sensitive actions remain traceable

## Loop Operating Model

Run the QA process as deliberate loops. Each loop should narrow uncertainty, not just repeat
commands.

### Loop 0: Recon

- Identify feature scope from diff, route, endpoint, and changed tests
- Identify role and tenant expectations
- Map the most failure-prone workflow edges
- Inventory existing tests before adding any

### Loop 1: First-pass validation

- Run targeted backend tests
- Run targeted Google Chrome UI path
- Capture first evidence set: screenshots, console, network, exact failing tests
- Separate hard environment breakage from genuine product defects

### Loop 2: Fix and prove

- Fix highest-value issue first
- Add or tighten the narrowest proving test
- Re-run the exact failing check
- Re-run adjacent checks in the same feature band

### Loop 3+: Regression expansion

- Once local failures are green, widen coverage
- Run sibling-route regression
- Run cross-layer regression touching the same entity/service
- Run one upstream and one downstream dependency check where feasible

Do not widen too early. First prove the actual bug is fixed.

## Google Chrome Validation Protocol

For UI work, use this protocol rather than ad hoc clicking.

### Navigation protocol

1. Load the target route directly
2. Reach the route through normal app navigation
3. Use browser back
4. Use browser forward
5. Refresh the page

If any of the above breaks state, classify it as a navigation/state defect.

### Interaction protocol

For each major user action:

1. Observe initial state
2. Trigger action
3. Observe loading state
4. Observe success/error state
5. Inspect console and network
6. Verify persisted result after refresh

### Visual protocol

Capture screenshots for:

- route landing state
- modal or drawer open state
- validation error state
- success state if materially different
- mobile state when the page is user-facing

Prefer existing `toHaveScreenshot` coverage. If absent, add the lightest useful visual lock.

### Console/network protocol

Treat these as failures unless clearly expected and documented:

- uncaught runtime errors
- hydration errors
- React warnings tied to broken behavior
- failed required `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`
- requests exceeding reasonable latency for the specific flow
- `text/html` responses from JSON/API endpoints

## Defect Classification

Every finding must include severity and class.

### Severity

- `CRITICAL`: auth bypass, tenant leak, destructive corruption, total route failure,
  payroll/compliance-impacting defect
- `MAJOR`: broken main workflow, wrong role behavior, persistent save failure, major UI block,
  broken core API contract
- `MINOR`: degraded UX, non-critical validation defect, layout problem with workaround
- `NIT`: cosmetic or low-risk polish issue

### Class

- `RBAC`
- `TENANT`
- `VALIDATION`
- `STATE`
- `NETWORK`
- `VISUAL`
- `ACCESSIBILITY`
- `PERFORMANCE`
- `TEST_BUG`
- `ENVIRONMENT`

## Fix Strategy

When defects are found, fix in this order:

1. Security or tenant isolation
2. Main workflow blockers
3. Data integrity and state-transition issues
4. Browser runtime and network coupling defects
5. Visual and responsive defects
6. Secondary polish

For every fix:

- identify the exact broken invariant
- patch the smallest causal surface
- add or tighten proof
- rerun exact failure
- rerun adjacent regression

## Detailed Exit Gate

Do not return `PASS` unless all of these are true for the scoped feature:

- critical workflow works in Google Chrome
- allowed roles succeed
- blocked roles are blocked correctly
- no tenant leak observed in tested paths
- no critical console errors remain
- no required API request fails
- bug-fix proofs pass
- adjacent regression band is clean enough for the stated scope

Use `PASS WITH KNOWN RISK` only when the remaining risk is explicit, bounded, and not a core path
failure.

## Suggested Final Report Shape

Use a dense, operator-friendly report.

### QA Summary

- target
- loop count
- browser used
- roles covered
- tenant coverage
- verdict

### Evidence

- tests run
- screenshots captured
- console/network issues seen
- exact files changed for fixes

### Findings

For each finding include:

- `ID`
- severity
- class
- symptom
- reproduction
- root cause
- fix
- verification
- residual risk

## Workflow

### 1. Frame the QA target

First identify exactly what is being validated:

- Feature, route, API, screen, workflow, or release slice
- User roles affected
- Tenant scope affected
- Data entities touched
- Adjacent modules likely to regress
- Whether the target is new behavior, modified behavior, or a bug fix

If the user did not specify the target clearly, infer it from changed files, branch diff, failing
tests, or recent worktree edits.

Useful commands:

```bash
git status --short
git diff --name-only
git diff --stat
rg -n "page.tsx|@RequestMapping|@RequiresPermission|useQuery|useForm|zodResolver" frontend backend -S
```

### 2. Build the quality map

Create a compact model of the feature before running tests.

Capture:

- User journeys
- API endpoints involved
- Permissions required
- State transitions
- Validation rules
- Side effects: notifications, logs, caching, async jobs, search indexing, exports
- Failure modes: unauthorized, missing data, cross-tenant leaks, race conditions, stale cache

Always ask:

- What can break silently?
- What would a malicious or careless user do?
- What would fail only under sequence, concurrency, or stale state?

### 3. Create the test matrix

Build a matrix across these layers. Keep it lean but complete.

- Smoke: app boots, route loads, core action reachable
- Happy path: intended flow succeeds
- Browser UI: layout, visibility, affordances, modal behavior, focus, keyboard flow, navigation,
  back/forward behavior in Google Chrome
- Visual: screenshots, modal layouts, overflow, clipping, broken spacing, missing icons, hidden
  actions, sticky headers, tables
- Validation: empty, malformed, boundary, duplicate, stale, conflicting input
- RBAC: Super Admin bypass, allowed roles, denied roles
- Tenant isolation: same role across different tenants cannot see or mutate foreign data
- Integration: frontend -> API -> persistence -> side effect
- Regression: neighboring flows touching same entity/service
- Accessibility and UX states: empty, loading, error, retry
- Performance spot checks where the feature is query-heavy or list-heavy

Prioritize by:

- Data corruption risk
- Auth or tenant breach risk
- Revenue/payroll/compliance impact
- Workflow centrality
- Change surface size
- Recent instability

### 4. Select test assets before writing new ones

Prefer existing coverage before inventing more.

Inspect:

- `frontend/e2e/`
- `frontend/e2e/fixtures/`
- `frontend/e2e/pages/`
- `frontend/e2e/edge-cases/`
- `backend/src/test/java/`
- `backend/src/test/resources/`
- CI workflow in `.github/workflows/`

Useful commands:

```bash
rg --files frontend/e2e backend/src/test | sort
rg -n "describe\\(|test\\(|@Test|@ParameterizedTest" frontend/e2e backend/src/test -S
rg -n "toHaveScreenshot|axe|AxeBuilder|console|requestfailed|response" frontend/e2e -S
rg -n "RequiresPermission|tenant_id|SecurityService|getCachedPermissions" backend/src/main backend/src/test -S
```

### 5. Decide the execution order

Run tests in increasing cost order so failures are easier to localize:

1. Static feature analysis and existing test discovery
2. Targeted unit/service tests
3. Targeted integration or controller tests
4. Targeted Google Chrome UI validation and Playwright spec or subset
5. Newly added tests if gaps exist
6. Broader module regression
7. Cross-module smoke

Typical commands:

```bash
cd backend && mvn -Dtest=ClassNameTest test
cd backend && mvn -Dtest='*Leave*Test' test
cd backend && mvn test
cd frontend && npm run test -- --run
cd frontend && npx playwright test frontend/e2e/leave.spec.ts --project=chrome
cd frontend && npx playwright test --grep "leave|approval" --project=chrome
cd frontend && npx playwright test frontend/e2e/accessibility/a11y.spec.ts --project=chrome
```

Adjust to the actual package manager or scripts discovered in the repo.

### 6. Failure triage rubric

Every failure must be sorted into one of these buckets:

1. Product bug
2. Test bug
3. Test data or fixture bug
4. Environment/config issue
5. Known pre-existing unrelated failure

For each failure, record:

- Exact test name
- Layer: unit, integration, e2e, manual scenario
- Severity: critical, major, minor
- Root-cause hypothesis
- Whether reproduction is deterministic
- Affected roles and tenants
- Fix owner if not in scope

Do not fix blindly. Reproduce once when feasible and inspect the relevant code path first.

For browser/UI failures, classify more precisely:

- Visual defect
- Interaction defect
- Navigation defect
- Accessibility defect
- Network/API coupling defect
- Timing/synchronization defect

### 7. Debug with code proximity

Start with the nearest layer to the failure.

- Playwright failure: inspect page object, spec, network calls, route component, form schema,
  service call
- Browser validation failure: inspect screenshots, DOM state, console errors, failed requests,
  z-index/overflow issues, disabled controls, hydration or loading glitches
- Backend test failure: inspect controller, permission annotation, service method, repository query,
  mapper, transaction boundary
- Auth failure: inspect cookies, guards, permission checks, cached permission loading, role mapping
- Tenant failure: inspect tenant filter propagation, repository constraints, async job context,
  caching keys

Useful commands:

```bash
rg -n "<symbol-or-endpoint>" frontend backend -S
sed -n '1,220p' <file>
```

### 8. Fix issues in scope

When fixing:

- Keep the change minimal and causal
- Add or repair the narrowest test that proves the bug
- Preserve conventions: DTOs, thin controllers, React Hook Form + Zod, React Query, existing Axios
  client
- Re-read nearby tests before changing behavior

Every code fix should answer:

- What broke?
- Why did this fix address that exact cause?
- What test would fail again if the bug returns?

For UI fixes specifically:

- Confirm the fix is visible in Google Chrome, not just logically correct in code
- Recheck keyboard interaction and modal focus if the UI changed
- Recheck screenshots if the route already has visual baselines
- Recheck that no loading/error state regressed

### 9. Recheck in loops

After a fix, do not jump immediately to full-suite regression.

Use this order:

1. Re-run the failing test exactly
2. Re-run the neighboring tests in the same file or feature area
3. Re-run the module slice
4. Re-run a broader regression band if risk warrants it

Loop until:

- The bug is gone
- No adjacent regression appears
- Exit criteria are satisfied

### 10. Exit criteria

Stop only when one of these is true:

- All planned critical and major checks pass
- Remaining failures are proven unrelated and documented
- The environment is blocked and evidence is sufficient to hand off

The final verdict must be one of:

- `PASS`
- `PASS WITH KNOWN RISK`
- `BLOCKED`
- `FAIL`

Browser/UI exit criteria are not met unless these are clean for the target path in Google Chrome:

- No critical console errors
- No failed required network requests
- No broken core interaction in Google Chrome
- No major visual defect in the main route, modal, or critical component states

## High-Power QA Heuristics

Apply these repeatedly during planning and diagnosis.

### Security and Authorization

- Verify every endpoint in scope has `@RequiresPermission`
- Confirm allowed roles work and denied roles are denied
- Confirm Super Admin bypass when applicable
- Confirm hidden UI controls are backed by server-side enforcement
- Check permission string mismatches: DB `module.action` vs code `MODULE:ACTION`

### Multi-Tenant Safety

- Same role across two tenants must see isolated results
- Search, caches, async tasks, notifications, and exports must not cross tenants
- Fixes must not remove tenant scoping indirectly

### Data Integrity

- Create/edit/delete should persist correctly and atomically
- Duplicate submissions should not double-write
- Partial failures should not leave inconsistent state
- Status transitions should be legal and traceable

### UX Reliability

- Empty/loading/error states should render intentionally
- Validation should trigger at the correct field and timing
- Success and failure feedback should be visible and specific
- Refresh/navigation should not lose important state unexpectedly

### Browser UI Validation

- Validate the primary route in Google Chrome desktop
- Validate at least one mobile or narrow viewport for user-facing flows
- Confirm back/forward navigation works where route transitions matter
- Inspect console output for runtime, hydration, and React errors
- Inspect failed requests and non-2xx responses tied to the feature flow
- Validate modal layering, drawer behavior, sticky headers, tables, scrolling, and overflow
- Use existing visual regression specs where they already exist before adding new baselines
- Take fresh screenshots on failure to preserve evidence

### Regression Depth

- Test the direct feature
- Test one upstream entry point
- Test one downstream dependency
- Test one sibling workflow touching the same entity or service

### Flake Detection

- Re-run suspected flaky tests at least once
- Separate timing failures from deterministic product bugs
- If Playwright is timing out, inspect selectors, network waits, test data assumptions, and backend
  slowness before labeling it flaky
- If Chrome-only issues appear, compare whether the bug is viewport, timing, animation, browser
  behavior, or actual DOM-state related

## Loop Template

Use this exact structure when reporting progress during the skill:

### QA Loop N

- Target: `<feature/module>`
- Scope: `<roles/routes/apis/entities>`
- Checks run: `<tests/specs/manual scenarios>`
- Failures found: `<count>`
- Fixes applied: `<files or none>`
- Recheck result: `<pass/fail/blocked>`
- Next move: `<targeted rerun / deeper fix / broader regression>`

Browser evidence to capture in each loop when UI is in scope:

- Google Chrome command or spec run
- Screenshot or visual assertion touched
- Console/network anomalies
- State where the UI failed: initial load, modal open, submit, refresh, navigation, mobile

## Output Template

Use this structure in the final response.

### 1. QA Target

- What was tested
- Why it matters
- Blast radius

### 2. Test Plan

- Prioritized checks
- Roles covered
- Tenant coverage
- Regression band
- Browser/UI coverage

### 3. Findings

For each finding:

- Severity
- Symptom
- Reproduction
- Root cause
- Fix
- Verification

### 4. Recheck Summary

- Tests rerun
- What passed after fixes
- What remains

### 5. Final Verdict

- `PASS`, `PASS WITH KNOWN RISK`, `BLOCKED`, or `FAIL`
- Explicit residual risks

## Subagent Usage

Use subagents only if the user explicitly asks for delegation, parallel agents, or subagents. If
allowed, split by non-overlapping responsibilities:

- Explorer 1: feature and blast-radius analysis
- Explorer 2: existing test coverage and gaps
- Worker 1: backend bug fix and backend tests
- Worker 2: frontend bug fix and Playwright/Vitest updates
- Reviewer/QA: independent retest and failure classification

Do not delegate the same unresolved failure to multiple workers with overlapping write scope.

## NU-AURA-Specific Checklist

- Frontend routes and module navigation work under the intended sub-app
- Existing Axios client is used
- Forms use React Hook Form + Zod
- Data fetching uses React Query/TanStack
- Chromium browser validation is included for UI-facing changes
- Backend controllers are thin and permission-protected
- DTOs are used at API boundaries
- MapStruct mappings still align after DTO changes
- Flyway/schema assumptions still hold
- Redis or permission cache side effects are considered
- Kafka, Elasticsearch, MinIO, email templates, and scheduled jobs are considered when the feature
  touches them

## When to Add New Tests

Add tests when:

- The bug was not already covered
- The failure path is important and repeatable
- The fix changes business logic or authorization behavior
- The issue involved tenant scoping, RBAC, or state transitions
- The issue is a real browser/UI regression that should be locked by a Playwright scenario or
  screenshot assertion

Avoid adding broad, expensive tests when a narrower one proves the bug better.

## Stop Conditions Requiring User Escalation

Escalate instead of looping forever when:

- Required environment services are down or misconfigured
- The failure is caused by a large unrelated pre-existing breakage
- The correct behavior is ambiguous
- Fixing the issue safely requires product or architectural decisions

When escalating, include:

- What is blocked
- What evidence was collected
- What was ruled out
- The narrowest next decision needed from the user
