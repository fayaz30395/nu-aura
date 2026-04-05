---
name: nu-e2e-qa
description: Use when asked to run QA, full QA check, test everything, QA sweep, pre-release QA, or validate the platform before a demo or release. Orchestrates automated Playwright tests, route health checks, RBAC boundary validation, workflow smoke tests, and cross-cutting concerns into a phased report with go/no-go recommendation.
---

# Dedicated End-to-End QA Runner

## When to Use

- "Run QA"
- "Full QA check"
- "Test everything"
- "QA sweep"
- "Pre-release QA"
- Before any demo or production release
- "Is the platform ready for release?"

## Modes

| Mode      | Command                           | Phases      | Duration |
|-----------|-----------------------------------|-------------|----------|
| **Quick** | `/nu-e2e-qa quick`                | 0, 1, 2     | ~10 min  |
| **Full**  | `/nu-e2e-qa full` or `/nu-e2e-qa` | 0 through 6 | ~45 min  |

Default mode is **full** unless `quick` is specified.

---

## Phase 0: Pre-flight

Verify the environment is ready before running any tests.

### 0.1 Service Health

```bash
# Frontend — must return HTML
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# Backend — must return {"status":"UP"}
curl -s http://localhost:8080/actuator/health | grep -o '"status":"UP"'
# Expected: "status":"UP"

# Redis — check via actuator
curl -s http://localhost:8080/actuator/health/redis | grep -o '"status":"UP"'

# Kafka — check via actuator (may not be critical for QA)
curl -s http://localhost:8080/actuator/health/kafka 2>/dev/null | grep -o '"status":"UP"'
```

### 0.2 Test Database Seed Data

```bash
# Verify demo tenant exists and has seed data by logging in as SuperAdmin
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fayaz.m@nulogic.io","password":"Welcome@123"}' \
  -o /dev/null -w "%{http_code}"
# Expected: 200
```

### 0.3 Output Directory

```bash
mkdir -p /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/screenshots
mkdir -p /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/results
```

### 0.4 If Services Not Running

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
docker-compose up -d                    # Redis, Kafka, Elasticsearch, etc.
cd backend && ./start-backend.sh &      # Spring Boot on :8080
cd frontend && npm run dev &            # Next.js on :3000
# Wait up to 120s for both to be healthy
```

**Pre-flight result**: PASS / FAIL with list of services and their status.

---

## Phase 1: Automated Test Suite

Run the full Playwright test suite and parse results.

### 1.1 Execute Tests

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend

# Run all E2E tests with JSON reporter for machine parsing
npx playwright test --project=chromium --reporter=json,list 2>&1 | tee qa-reports/results/playwright-output.txt
```

### 1.2 Parse Results

Read `frontend/playwright-report/results.json` and extract:

| Metric      | Value          |
|-------------|----------------|
| Total tests | Count          |
| Passed      | Count (green)  |
| Failed      | Count (red)    |
| Skipped     | Count (yellow) |
| Flaky       | Count (orange) |
| Duration    | Total time     |

### 1.3 Failure Details

For each failed test:

- **File**: e.g., `e2e/leave.spec.ts`
- **Test name**: e.g., "should apply for annual leave"
- **Error**: First line of error message
- **Screenshot**: Path to failure screenshot in `test-results/`
- **Severity**: P0 (smoke/critical path), P1 (CRUD), P2 (edge case), P3 (visual)

### 1.4 Existing Test Files (67 spec files)

The suite covers these features — failures in any indicate regressions:

**NU-HRMS (26 files)**: `admin-roles`, `analytics`, `announcements`, `assets`, `asset-flow`,
`attendance`, `attendance-flow`, `benefits`, `calendar`, `custom-fields`, `dashboard`, `documents`,
`employee`, `employee-crud`, `expenses`, `expense-flow`, `holidays`, `home`, `leave`, `leave-flow`,
`loans`, `notifications`, `payroll-flow`, `payroll-run`, `payroll-statutory`, `settings`

**NU-Hire (4 files)**: `recruitment-kanban`, `recruitment-pipeline`, `onboarding-offboarding`,
`hire-to-onboard`

**NU-Grow (10 files)**: `feedback360`, `okr`, `performance-calibration`, `performance-pip`,
`performance-review`, `performance-review-cycle`, `recognition`, `review-cycles`, `surveys`,
`training`, `training-enrollment`, `wellness`

**NU-Fluence (1 file)**: `fluence-content-lifecycle`

**Platform / Cross-cutting (9 files)**: `auth`, `auth-flow`, `navigation`, `smoke`, `app-switcher`,
`sub-app-smoke`, `scheduled-reports`, `reports-builder`

**RBAC (4 files)**: `rbac-employee-boundaries`, `rbac-manager-boundaries`, `rbac-tenant-isolation`,
`rbac-superadmin`

**Cross-module lifecycle (4 files)**: `leave-approval-chain`, `payroll-end-to-end`,
`hire-to-onboard`, `fluence-content-lifecycle`

**Other (9 files)**: `fnf-settlement`, `gantt`, `org-chart`, `projects`, `resource-allocation`,
`resources`, `resources-capacity`, `timesheets`, `travel`

---

## Phase 2: Route Health Check

Visit every route and check for errors.

### 2.1 Route List

Source of truth: `frontend/lib/config/apps.ts` > `PLATFORM_APPS[*].routePrefixes`

**NU-HRMS routes** (35):
`/me/dashboard`, `/me/profile`, `/dashboard`, `/employees`, `/departments`, `/attendance`, `/leave`,
`/payroll`, `/compensation`, `/benefits`, `/expenses`, `/loans`, `/travel`, `/assets`, `/letters`,
`/statutory`, `/tax`, `/helpdesk`, `/approvals`, `/announcements`, `/org-chart`, `/timesheets`,
`/time-tracking`, `/projects`, `/resources`, `/allocations`, `/calendar`, `/overtime`, `/probation`,
`/shifts`, `/reports`, `/analytics`, `/settings`, `/admin`, `/admin/roles`

**NU-Hire routes** (7):
`/recruitment`, `/recruitment/candidates`, `/recruitment/pipeline`, `/onboarding`, `/preboarding`,
`/offboarding`, `/careers`

**NU-Grow routes** (10):
`/performance`, `/performance/reviews`, `/okr`, `/feedback360`, `/training`, `/training/catalog`,
`/learning`, `/recognition`, `/surveys`, `/wellness`

**NU-Fluence routes** (9):
`/fluence/wiki`, `/fluence/blogs`, `/fluence/templates`, `/fluence/drive`, `/fluence/search`,
`/fluence/my-content`, `/fluence/wall`, `/fluence/dashboard`, `/fluence/analytics`

### 2.2 Check Protocol

For each route, using SuperAdmin session:

```typescript
// Login once as SuperAdmin via API
await loginAs(page, 'fayaz.m@nulogic.io');

const errors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// For each route:
const startTime = Date.now();
await page.goto(route);
await page.waitForLoadState('networkidle');
const renderTime = Date.now() - startTime;

// Check:
// 1. HTTP status (not 404/500)
// 2. Console errors (filter out favicon, HMR, hydration)
// 3. Render time (flag if > 5000ms)
// 4. Page has visible content (not blank white page)
```

### 2.3 Output Table

| Sub-App | Route        | Status | Console Errors | Render (ms) | Notes       |
|---------|--------------|--------|----------------|-------------|-------------|
| HRMS    | /employees   | OK     | 0              | 1200        |             |
| HRMS    | /payroll     | WARN   | 1              | 4800        | Slow render |
| HIRE    | /recruitment | FAIL   | 3              | -           | JS crash    |

**Thresholds**:

- OK: 0 console errors, render < 3000ms
- WARN: 1-2 non-critical console errors OR render 3000-5000ms
- FAIL: any JS exception, render > 5000ms, blank page, or 404/500

---

## Phase 3: RBAC Boundary Testing

### 3.1 Role Matrix

Test these 6 representative roles from `frontend/e2e/fixtures/testData.ts`:

| Role              | Email                  | Expected Access                               |
|-------------------|------------------------|-----------------------------------------------|
| SUPER_ADMIN       | `fayaz.m@nulogic.io`   | Everything (bypasses all RBAC)                |
| MANAGER           | `sumit@nulogic.io`     | Team views + own self-service                 |
| TEAM_LEAD         | `mani@nulogic.io`      | Team views (smaller scope) + own self-service |
| HR_MANAGER        | `jagadeesh@nulogic.io` | All HR admin views                            |
| RECRUITMENT_ADMIN | `suresh@nulogic.io`    | Hire module + own self-service                |
| EMPLOYEE          | `saran@nulogic.io`     | Self-service only (/me/*)                     |

### 3.2 Access Matrix Check

For each role, attempt these routes and verify expected outcome:

| Route           | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | REC_ADMIN | EMPLOYEE |
|-----------------|:-----------:|:-------:|:---------:|:----------:|:---------:|:--------:|
| `/me/dashboard` |     OK      |   OK    |    OK     |     OK     |    OK     |    OK    |
| `/me/profile`   |     OK      |   OK    |    OK     |     OK     |    OK     |    OK    |
| `/employees`    |     OK      |   OK    |    OK     |     OK     |   DENY    |   DENY   |
| `/admin/roles`  |     OK      |  DENY   |   DENY    |    DENY    |   DENY    |   DENY   |
| `/payroll`      |     OK      |  DENY   |   DENY    |     OK     |   DENY    |   DENY   |
| `/recruitment`  |     OK      |  DENY   |   DENY    |     OK     |    OK     |   DENY   |
| `/performance`  |     OK      |   OK    |    OK     |     OK     |   DENY    |   DENY   |
| `/settings`     |     OK      |  DENY   |   DENY    |    DENY    |   DENY    |   DENY   |

**"DENY" means**: redirect to `/me/dashboard`, `/auth/login`, or a 403 page. NOT the actual admin
content.

### 3.3 API Boundary Check

For each role, attempt forbidden API calls:

```bash
# Employee should NOT be able to:
GET /api/v1/employees          # 403 (list all employees)
POST /api/v1/employees         # 403 (create employee)
DELETE /api/v1/employees/{id}  # 403 (delete employee)
GET /api/v1/payroll/runs       # 403 (payroll data)
GET /api/v1/admin/roles        # 403 (role management)
```

### 3.4 Rate Limiting

**Auth endpoint**: 5 requests/minute. Space role-switching by 15 seconds.

### 3.5 Permission Leak Detection

For each DENY case:

1. Visit the route in the browser
2. Check the page content for data that should be hidden
3. Check the Network tab for 200 responses to APIs the role should not access
4. **Any 200 response to a forbidden API = P0 security bug**

---

## Phase 4: Critical Workflow Smoke Tests

Five end-to-end workflows that must work before any release.

### 4.1 Leave Request Flow

```
1. Login as raj@nulogic.io (Employee)
2. Navigate to /leave
3. Click "Apply Leave"
4. Fill: Type=CASUAL, Start=tomorrow, End=tomorrow, Reason="QA smoke test"
5. Submit -> modal closes, request appears as PENDING
6. Switch to mani@nulogic.io (Team Lead)
7. Navigate to /leave/team
8. Find Raj's request -> Click Approve
9. Switch back to raj@nulogic.io
10. Verify request status = APPROVED (or next approval level PENDING)
```

### 4.2 Attendance Flow

```
1. Login as saran@nulogic.io (Employee)
2. Navigate to /attendance
3. Click "Clock In" (or verify clock-in button state)
4. Wait 2 seconds
5. Click "Clock Out"
6. Verify attendance record appears for today
7. If Clock In already done, verify "Regularization" flow works
```

### 4.3 Payroll Preview

```
1. Login as fayaz.m@nulogic.io (SuperAdmin)
2. Navigate to /payroll
3. Verify payroll dashboard loads with stats
4. Click on latest payroll run (or create preview)
5. Verify employee salary breakdown table renders
6. Verify totals are non-zero
```

### 4.4 Recruitment Pipeline

```
1. Login as suresh@nulogic.io (Recruitment Admin)
2. Navigate to /recruitment
3. Verify jobs list loads
4. Click on an existing job (or create one)
5. Verify Kanban pipeline renders (Applied, Screening, Interview, Offer stages)
6. Verify candidate cards are visible (or empty state shows)
```

### 4.5 Performance Review

```
1. Login as fayaz.m@nulogic.io (SuperAdmin)
2. Navigate to /performance
3. Verify performance dashboard loads
4. Click "Review Cycles" or navigate to /performance/reviews
5. Verify review cycle list renders
6. Click on an existing cycle (if any)
7. Verify review details page loads
```

### 4.6 Result

For each workflow: PASS / FAIL / BLOCKED (dependency not available)

---

## Phase 5: Cross-Cutting Concerns

### 5.1 Design System Compliance

Delegate to `/nu-design-check` on any files changed since last release:

```bash
git diff --name-only HEAD~10 -- 'frontend/**/*.tsx' 'frontend/**/*.ts'
```

Check for violations:

- `bg-white` instead of `bg-[var(--bg-card)]`
- `shadow-sm/md/lg` instead of `shadow-[var(--shadow-card)]`
- Banned Tailwind color tokens (`sky-*`, `rose-*`, `amber-*`, `emerald-*`, `slate-*`, `gray-*`,
  etc.)
- Missing `cursor-pointer` on interactive elements
- Missing `aria-label` on icon-only buttons

### 5.2 Timezone Correctness

For time-sensitive features, check that dates/times display correctly:

1. Navigate to `/attendance` -> verify today's date shows correct local date
2. Navigate to `/leave` -> verify leave dates are in correct format (YYYY-MM-DD or localized)
3. Navigate to `/payroll` -> verify pay period dates are correct
4. Check that no date shows "NaN" or "Invalid Date"

### 5.3 Responsive Layout Check

Test at three viewport widths:

```typescript
// Desktop (default)
await page.setViewportSize({ width: 1920, height: 1080 });
// Laptop
await page.setViewportSize({ width: 1366, height: 768 });
// Tablet
await page.setViewportSize({ width: 768, height: 1024 });
```

For each viewport, check 5 key routes: `/me/dashboard`, `/employees`, `/recruitment`,
`/performance`, `/leave`

Verify:

- No horizontal scroll
- Sidebar collapses on tablet
- Tables become scrollable or card view on tablet
- No text overflow/truncation that hides critical info

### 5.4 Dark Mode Toggle

```
1. Login as SuperAdmin
2. Navigate to /me/dashboard
3. Toggle dark mode (header or settings)
4. Visit 5 key routes: /me/dashboard, /employees, /recruitment, /performance, /leave
5. For each: verify no white/light backgrounds leak through, text is readable
```

---

## Phase 6: Report

### 6.1 Summary Table

| Phase               | Passed  | Failed | Skipped | Critical Issues                    |
|---------------------|---------|--------|---------|------------------------------------|
| P0: Pre-flight      | -       | -      | -       | Services: all UP                   |
| P1: Automated Suite | 180     | 3      | 5       | 2 CRUD failures                    |
| P2: Route Health    | 58      | 2      | 0       | /payroll 404, /fluence/drive crash |
| P3: RBAC Boundaries | 48      | 1      | 0       | Employee can access /reports       |
| P4: Workflow Smoke  | 4       | 1      | 0       | Attendance clock-in broken         |
| P5: Cross-Cutting   | 12      | 0      | 2       | None                               |
| **TOTAL**           | **302** | **7**  | **7**   | **3 P0, 2 P1**                     |

### 6.2 Issue Classification

| Severity | Definition                                                               | Action                    |
|----------|--------------------------------------------------------------------------|---------------------------|
| **P0**   | Blocks release. Security leak, data corruption, critical workflow broken | Must fix before release   |
| **P1**   | Major. CRUD operation fails, page crashes, wrong data displayed          | Should fix before release |
| **P2**   | Medium. UI glitch, slow render, non-critical edge case                   | Fix in next sprint        |
| **P3**   | Minor. Visual inconsistency, missing empty state, non-blocking           | Backlog                   |

### 6.3 Issue List Format

For each issue found:

```
[P0] RBAC LEAK: Employee role can access /reports — API returns 200 with all employee data
  Route: /reports
  Role: EMPLOYEE (saran@nulogic.io)
  Expected: redirect to /me/dashboard or 403
  Actual: page renders with full report data
  Screenshot: qa-reports/screenshots/rbac-reports-employee.png
  API evidence: GET /api/v1/reports returned 200 (should be 403)
```

### 6.4 Go / No-Go Recommendation

```
RECOMMENDATION: NO-GO for release

Blockers (must fix):
  1. [P0] RBAC leak on /reports endpoint
  2. [P0] Attendance clock-in returns 500
  3. [P0] /payroll route returns 404

Risks (should fix):
  4. [P1] Leave approval modal does not close after approve
  5. [P1] Training catalog search returns stale results

Non-blockers (defer to next sprint):
  6. [P2] Dark mode: /fluence/wiki has white card background
  7. [P3] /surveys empty state missing illustration
```

### 6.5 Excel Report (if requested)

Generate an Excel report at `qa-reports/results/qa-report-YYYY-MM-DD.xlsx` with sheets:

1. **Summary** — phase-level pass/fail counts, go/no-go
2. **Automated Tests** — full Playwright results (test name, status, duration, error)
3. **Route Health** — all routes with status, console errors, render time
4. **RBAC Matrix** — role x route access matrix with PASS/FAIL
5. **Workflow Smoke** — step-by-step results for each workflow
6. **Issues** — all issues with severity, description, evidence

---

## Execution Notes

### Auth Rate Limiting

The backend rate-limits `/api/v1/auth/**` at 5 requests/minute. When switching roles:

- Use `loginAs()` from `frontend/e2e/fixtures/helpers.ts` (API-based, fastest)
- Wait 15 seconds between login switches to avoid 429 errors
- Group tests by role to minimize switches
- SuperAdmin session covers Phases 2 and 5 without switching

### Demo Tenant

All tests run against the NuLogic demo tenant seeded by Flyway V8:

- `tenant_id`: `660e8400-e29b-41d4-a716-446655440001`
- Shared password: `Welcome@123`
- 13 demo users across 6 roles (see `frontend/e2e/fixtures/testData.ts`)

### Approval Hierarchy (for Phase 4 workflows)

```
Raj V (EMPLOYEE) -> Mani S (TEAM_LEAD) -> Sumit Kumar (MANAGER) -> Fayaz M (CEO)
Saran V (EMPLOYEE) -> Sumit Kumar (MANAGER) -> Fayaz M (CEO)
Arun K (EMPLOYEE) -> Suresh M (RECRUITMENT_ADMIN) -> Jagadeesh N (HR_MANAGER) -> Fayaz M (CEO)
```

### Feature Flags

These are all enabled for the demo tenant. A 403 from a feature-flag check on any = bug:
`enable_payroll`, `enable_performance`, `enable_documents`, `enable_helpdesk`, `enable_lms`,
`enable_wellness`, `enable_projects`, `enable_timesheets`, `enable_fluence`, `enable_google_drive`,
`enable_payments`, `enable_ai_recruitment`

### Test Data Naming

All data created during QA uses prefix `QA-` + timestamp to avoid collisions and allow cleanup:

- Leave: `QA smoke test — <timestamp>`
- Employee: `QA-Test-<timestamp>`

### Cleanup

After a full QA run, clean up test data:

```bash
# Delete test leave requests, employees, etc. created with QA- prefix
# Or simply rely on the demo tenant being re-seeded before next run
```
