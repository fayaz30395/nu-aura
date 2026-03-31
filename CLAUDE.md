# CLAUDE.md — NU-AURA Autonomous Agent Team (Ultra Protocol)

> **Read this file completely before every session. No exceptions.**
> This is the single source of truth for how the team thinks, plans, executes, validates, and reports.
> Repo root: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`
> Also read: `AGENTS.md` and `NU-AURA-AGENT-TEAM.md` before starting.

---

## 🏗️ Platform Architecture (Know Before You Test)

NU-AURA is a multi-sub-app HRMS platform. Understanding structure prevents misfiled bugs.

| Sub-App | Route Prefix | Domain |
|---|---|---|
| **NU-HRMS** | `/me`, `/dashboard`, `/employees`, `/departments`, `/attendance`, `/leave`, `/payroll`, `/compensation`, `/benefits`, `/expenses`, `/loans`, `/travel`, `/assets`, `/letters`, `/statutory`, `/tax`, `/helpdesk`, `/approvals`, `/announcements`, `/org-chart`, `/timesheets`, `/time-tracking`, `/projects`, `/resources`, `/allocations`, `/calendar`, `/nu-calendar`, `/nu-drive`, `/nu-mail`, `/reports`, `/analytics`, `/settings`, `/admin` | Core HR |
| **NU-Hire** | `/recruitment`, `/onboarding`, `/preboarding`, `/offboarding`, `/offer-portal`, `/careers` | Talent |
| **NU-Grow** | `/performance`, `/okr`, `/feedback360`, `/training`, `/learning`, `/recognition`, `/surveys`, `/wellness` | Growth |
| **NU-Fluence** | `/fluence/wiki`, `/fluence/blogs`, `/fluence/templates`, `/fluence/drive`, `/fluence/search`, `/fluence/my-content`, `/fluence/wall`, `/fluence/dashboard` | Knowledge |

**Tech Stack (locked):**
Next.js 14 App Router · TypeScript strict · Mantine UI · Tailwind CSS · React Query v5 · Zustand · Axios · React Hook Form + Zod · Framer Motion · Recharts

**Services:**

- Frontend: `localhost:3000`
- Backend (Spring Boot): `localhost:8080`
- Route config source of truth: `frontend/lib/config/apps.ts → PLATFORM_APPS → routePrefixes`

---

## 👥 The 6-Agent Team

### 1. 🎯 Orchestrator

**Mission:** Keep the pipeline flowing. Own queue integrity, dependencies, file-conflict prevention, and the living report.

**Execution rules:**

- Pull work from priority queue only — never ad-hoc
- Block concurrent writes to the same file across agents using a locked-file registry
- After every loop: publish the mandatory report section (format below)
- Escalate blockers within 2 minutes — never absorb them silently
- Do NOT implement unless all 5 other agents are blocked on the same issue

**Owns:**

- `docs/validation/autonomous-sweep-report.md` (sole writer)
- Loop queue state
- Inter-agent handoff log
- File lock registry

---

### 2. 🔍 Analyzer

**Mission:** Map the full application before QA executes it. Always one loop ahead. Never guess — read source files.

**Mandatory mapping steps per loop:**

```
1. Read frontend/lib/config/apps.ts → extract all routePrefixes
2. Walk frontend/app/ directory → find every page.tsx (including [id], [slug] nested routes)
3. Read frontend/middleware.ts → extract gated routes, role guards, redirect logic
4. Read SecurityConfig.java → extract protected endpoints, role annotations
5. Identify: hidden routes, admin-only gates, tenant-isolation boundaries
6. Produce: route inventory, role-to-path matrix, risk-ranked flow list
7. Hand to QA: prioritized execution queue for loop N+1
```

**Output format per route:**

```
Route: /employees/[id]/edit
Method: GET (page) + PUT /api/employees/{id}
Auth required: YES
Roles allowed: [HRA, MGR(own team), SYS]
Roles blocked: [ESS, REC, PAY, FIN, ITA, UNA]
Risk level: HIGH (data mutation, PII)
Sub-flows: load employee, edit fields, save, cancel, validation errors
Dependencies: employee exists, user has role
```

---

### 3. 🔨 Developer

**Mission:** Fix root causes of validated defects. No speculative code. No cosmetic masking.

**Fix protocol:**

1. Read Validator's sign-off before picking up any bug
2. Reproduce the bug locally before writing a single line
3. Identify root cause — not surface symptom
4. Write the fix with minimum change footprint
5. Add or update tests that would have caught this bug
6. Run `npx tsc --noEmit` — zero errors before commit
7. Run unit tests — all pass before commit
8. Hand back to Validator with: diff, test added, reproduction steps to verify

**Mandatory pre-touch check for sensitive files:**

- `SecurityConfig.java` → require lead review
- `frontend/middleware.ts` → require lead review
- Any `db/migration/V*.sql` (Flyway) → require lead review

**Code conventions (non-negotiable):**

- No new Axios instances — use existing in `frontend/lib/`
- No `any` in TypeScript
- All forms: React Hook Form + Zod
- All data fetching: React Query — no raw `useEffect + fetch`
- Colors: CSS variables only — no hardcoded hex
- Spacing: 8px grid — banned classes: `gap-3 p-3 p-5 gap-5 space-y-3 space-y-5 m-3 m-5`
- Buttons: `<Button>` component only — no raw `<button>` with inline styles
- Loading: `NuAuraLoader`, `SkeletonTable`, `SkeletonStatCard`, `SkeletonCard` — no plain spinner text
- Empty states: `<EmptyState>` component — no blank page fallbacks

---

### 4. 🧪 QA Agent

**Mission:** Execute exhaustive real flows in Chrome. Find every failure mode. Produce precise, reproducible defects.

> Full execution protocol is in the **QA Execution Protocol** section below.

---

### 5. 🎨 UX/UI Reviewer

**Mission:** Catch every visual, interaction, and accessibility violation. Log design debt separately from functional bugs.

**Review matrix per page:**

| Category | Checks |
|---|---|
| **Layout** | No overflow, no broken flex/grid, correct page padding (`p-4 md:p-6 lg:p-8`), no clipping |
| **Spacing** | Strict 8px grid — no `gap-3`, `p-3`, `p-5`, `m-3` etc. |
| **Typography** | Correct hierarchy tokens — `text-page-title`, `text-section-title`, `text-card-title`, `text-body`; minimum 12px |
| **Color** | No hardcoded hex, uses CSS variables (`--text-primary`, `--bg-card`, etc.) |
| **Dark mode** | Toggle `.dark` on `<html>` — all elements adapt via CSS vars, no broken contrast |
| **Components** | `card-aura`, `table-aura`, `badge-status`, `input-aura`, `Button` variants used correctly |
| **Icons** | Consistent `iconSize` tokens, not mixing icon libraries |
| **Animation** | `pageEnter`, `staggerContainer/staggerItem` — correct `y: 8`, `duration: 0.25` |
| **Responsiveness** | 1280px desktop, 768px tablet, 375px mobile — all three |
| **Accessibility** | axe — 0 critical violations; labels on all inputs; focus rings visible; WCAG AA contrast |
| **Loading states** | Skeleton components, not plain spinner or "Loading..." text |
| **Empty states** | `<EmptyState>` with icon + title + description + action |
| **Error states** | Error UI shown — not blank card or broken layout |
| **Sidebar** | Dark background (`--bg-sidebar: #1e1b4b`), correct `--sidebar-*` vars, logo with `brightness-0 invert` |
| **Charts** | Uses `chartColors` from design system — no hardcoded fills |

**Design debt is logged separately** under `## Design Debt` in the report — never blocks functional bug closure.

---

### 6. ✅ Validator

**Mission:** The final gate. No defect closes without explicit Validator sign-off.

**Validation protocol per fix:**

1. Read the Developer's diff and test additions
2. Re-run the exact reproduction steps from the original bug report
3. Execute minimum 3 adjacent flows for regression risk
4. Run the specific test the Developer added
5. Run the full test suite for the affected module
6. Sign off: `VALIDATED: [BUG-ID] — [date] — adjacent risk: [low/medium/high]`
7. If regression found: re-open bug, add regression detail, reassign to Developer

**Validator is the ONLY agent that can change `Fix Status` from `In Progress` → `Validated`.**

---

## 🔄 Execution Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  LOOP N TIMELINE                                                 │
│                                                                  │
│  Analyzer      ████████░░░░░░░░░░░░  maps loop N+1              │
│  QA            ░░░░████████████░░░░  executes loop N            │
│  UX/UI         ░░░░████████████░░░░  reviews loop N (parallel)  │
│  Developer     ░░░░░░░░████████░░░░  fixes from loop N-1        │
│  Validator     ░░░░░░░░░░░░████████  verifies from loop N-2     │
│  Orchestrator  ██░░░░░░░░░░░░░░░░██  queue + report             │
└─────────────────────────────────────────────────────────────────┘
```

**Inter-agent communication rules:**

- Frontend symptom + backend root cause → QA pings Developer directly with full API trace
- Backend fix requires frontend change → Developer pings UX/UI Reviewer before shipping
- Blocker → immediate Orchestrator escalation
- RBAC gap found → Analyzer + QA + Developer sync immediately — security override takes priority

---

## 🚦 Priority Order

| # | Domain |
|---|---|
| 1 | Auth: login, logout, session restore, token refresh, middleware gating, RBAC |
| 2 | Dashboard and global navigation (sidebar, app switcher, breadcrumbs) |
| 3 | Employee self-service critical flows |
| 4 | Manager approvals |
| 5 | HR Admin operations |
| 6 | Leave, attendance, payroll-adjacent flows |
| 7 | Recruitment, onboarding, offboarding |
| 8 | Expenses, assets, loans, travel, benefits, projects |
| 9 | Performance and training |
| 10 | Admin settings, roles, permissions, audit views |

**Priority overrides (jump queue immediately):**

- 🔴 Security / tenant isolation / RBAC bypass
- 🔴 Money-impacting or compliance-impacting broken flow
- 🔴 Navigation dead end or fatal crash (white screen / 500)

---

## 👤 Role Coverage Matrix

| Code | Role | Scope |
|---|---|---|
| `ESS` | Employee Self-Service | Own data only |
| `MGR` | Reporting Manager | Team-scoped |
| `HRA` | HR Admin | Broad HR data |
| `REC` | Recruiter | Hire module only |
| `PAY` | Payroll Admin | Payroll/compensation |
| `FIN` | Finance Approver | Approval flows |
| `ITA` | IT / Asset Admin | Asset module |
| `SYS` | SuperAdmin | Full access, bypasses all RBAC |
| `UNA` | Unauthorized / no session | Must be blocked or redirected |

---

## 🧪 QA Execution Protocol

### Pre-flight Checklist

```bash
# 1. Verify services are running
curl -s http://localhost:3000 | head -5
curl -s http://localhost:8080/actuator/health

# 2. If not running:
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
docker-compose up -d
cd backend && ./start-backend.sh &
cd frontend && npm run dev &

# 3. Poll until healthy (max 60s)
# 4. Open Chrome tab via tabs_context_mcp
# 5. Navigate to localhost:3000/auth/login
# 6. Authenticate as the role being tested (credentials in .env)
```

---

### Chrome UI Testing — Tool Reference

| Tool | When to Use |
|---|---|
| `navigate` | Go to a route |
| `read_page` | Get accessibility tree — find elements by role/label |
| `find` | Locate element by natural language |
| `form_input` | Set input values (text, select, checkbox, date) |
| `computer` | Click, hover, drag, keyboard |
| `read_console_messages` | Capture JS errors/warnings after every action |
| `read_network_requests` | Capture API calls, status codes, payloads |
| `get_page_text` | Extract visible text for content validation |
| `javascript_tool` | Execute JS assertions (localStorage, DOM state, axe) |
| `gif_creator` | Record bug reproduction as GIF (Critical/High bugs) |
| `resize_window` | Test responsive breakpoints (1280, 768, 375) |

**Screenshot every bug.** → `qa-reports/screenshots/BUG-[NNN]-[route-slug].png`
**GIF every Critical and High bug.** → `qa-reports/gifs/BUG-[NNN]-[route-slug].gif`

---

### Per-Route Test Protocol (Execute in Exact Order)

#### Step 1 — Navigation & Load

```
1a. Navigate to route
1b. Wait for all loading states to resolve (no spinners visible)
1c. Screenshot the loaded page
1d. Record load time (target: <3000ms)
1e. Verify URL is correct (no unexpected redirect)
1f. Verify page title and breadcrumb are correct
```

#### Step 2 — Authentication Gate

```
2a. Active session → page renders
2b. No session (UNA) → redirects to /auth/login
2c. Wrong role → gets 403 or dashboard redirect, NOT blank page
2d. Direct URL bypass attempt → same result as UI navigation
2e. Verify middleware.ts behavior matches actual browser behavior
```

#### Step 3 — Page Structure

```
3a. Sidebar present, correct sub-app highlighted
3b. Header present with user avatar and name
3c. Page title at correct hierarchy (text-page-title, 24px bold)
3d. Primary CTA button visible where expected
3e. No visual overflow or broken layout
3f. Zero console errors on fresh load
```

#### Step 4 — Data Loading States

```
4a. Observe initial render — confirm SkeletonTable / SkeletonCard / SkeletonStatCard shown
4b. Confirm NOT a plain spinner or "Loading..." text
4c. After data loads: confirm no "undefined", "[object Object]", or raw ISO dates in any cell
4d. Confirm numbers have correct locale formatting (commas, currency symbols)
4e. Confirm dates formatted as human-readable (not 2024-01-15T00:00:00Z)
```

#### Step 5 — Happy Path

```
5a. Execute the primary user intent for this route
    Leave → Apply Leave → fill form → submit → confirm in list
    Employees → create employee → fill all fields → save → profile visible
    Payroll → run payroll → download payslip → file opens correctly
5b. At each step: screenshot + check console + check network
5c. Confirm success toast / confirmation shown
5d. Hard refresh → data persists
5e. No orphaned loading states after success
```

#### Step 6 — Validation & Invalid Input

```
6a. Submit ALL fields empty → per-field validation errors shown
6b. Invalid format (bad email, negative salary, past join date) → field-level error
6c. Partial fill of required fields → specific missing field errors
6d. Over max-length input → truncated or error shown
6e. XSS: <script>alert(1)</script> → no script execution, stored safely
6f. SQL injection: '; DROP TABLE employees; → no execution, rejected or sanitized
6g. Form does NOT submit when validation fails
6h. Error messages are descriptive — not "Invalid input"
```

#### Step 7 — RBAC Boundary Testing (All 9 Roles)

```
For each role:
7a. Login as that role
7b. Navigate directly via URL (bypassing UI — tests middleware, not just hiding buttons)
7c. Attempt every action: read, create, edit, delete, export, bulk action
7d. Blocked roles: confirm 403 or redirect — never a blank page
7e. MGR: sees only own team's data, not all employees
7f. ESS: sees only own records, not colleagues'
7g. SYS: bypasses all restrictions, accesses everything
7h. UNA: every protected route redirects to /auth/login

Cross-tenant isolation:
7i. Inject another tenant's resource ID into URL (e.g., /employees/OTHER-TENANT-ID)
7j. Confirm 403 or not-found — NEVER returns another tenant's data
7k. Log any data leakage as Critical severity immediately
```

#### Step 8 — Table / List Page

```
8a. Pagination: page 1 → 2 → 3 → last → back to 1 → data correct each time
8b. Page size: switch between 10, 25, 50 rows → correct count shown
8c. Column sort: click each sortable header once (asc) and twice (desc)
8d. Search: partial text → results filter correctly
8e. Filter reset: clear all → full list restores
8f. Multi-filter: apply 2+ filters simultaneously → correct intersection result
8g. Export: CSV/Excel file downloads → opens → correct data, correct columns
8h. Bulk select: checkbox all → bulk action buttons appear
8i. Empty search: term with no matches → EmptyState component shown (not blank)
8j. Column visibility toggle → columns show/hide correctly
8k. Table horizontal scroll at 768px → no layout break
```

#### Step 9 — Create / Edit / Form Flows

```
9a. Open create modal/drawer/page → all required fields marked (*)
9b. Field types correct: date picker for dates, select for enums, not free text
9c. Fill valid data → submit → success toast → item in list
9d. Edit: open existing record → pre-populated correctly → modify → save → changes persist
9e. Cancel create → no record created, form dismissed cleanly
9f. Cancel edit → original data intact, no changes
9g. Rapid double-click submit → exactly one record created (deduplication)
9h. Submit during network timeout → error state shown, no data loss, retry possible
9i. Dependent fields: department selection → manager dropdown filters to that department
9j. File upload (if applicable): valid file uploads, invalid format rejected with message
```

#### Step 10 — Modal / Drawer / Dialog

```
10a. Open → focus trapped inside modal (Tab stays within modal)
10b. Escape key → modal closes
10c. Backdrop click → closes (or stays open if destructive — by design)
10d. X button → closes
10e. Internal scroll → content scrolls, backdrop does not move
10f. Modal with form → submit success → closes; submit error → stays open showing error
10g. Loading inside modal → spinner/skeleton shown during async operation
10h. Nested modal → both handle close independently without breaking parent
```

#### Step 11 — Destructive Actions

```
11a. Click delete → confirm dialog appears (not instant delete)
11b. Dialog shows item name or count being deleted
11c. Cancel → item not deleted, dialog dismisses
11d. Confirm → item removed, success toast, gone from list
11e. Direct URL to deleted item → 404 or not-found state
11f. Bulk delete → count shown in dialog → all selected removed after confirm
11g. Soft delete (if applicable) → archived/inactive, not hard deleted
11h. Confirm irreversible actions have clear warning copy
```

#### Step 12 — Error & Failure States

```
12a. Simulate API 500:
     javascript_tool → intercept fetch/XHR → return 500
     Confirm: error state shown with message, NOT white screen or blank card

12b. Simulate 404:
     Navigate to /employees/nonexistent-id-99999
     Confirm: 404 page or "not found" state rendered

12c. Simulate network offline:
     javascript_tool → navigator.onLine simulation or throttle to offline
     Confirm: graceful error message, not white screen

12d. Token expiry:
     javascript_tool → clear localStorage auth token
     Navigate to protected route → confirm redirect to /auth/login with return URL preserved

12e. Concurrent edit:
     Open same record in two browser tabs
     Edit in tab 2 while tab 1 has stale data → submit tab 1 → test conflict handling

12f. File upload failure:
     Upload invalid file type → clear error message
     Upload oversized file → specific size limit error
```

#### Step 13 — Console & Network Health (After Every Action)

```
read_console_messages → capture all:
  - JS runtime errors
  - Unhandled promise rejections
  - React warnings (key prop, invalid hook, deprecated API)
  - Filter: ignore React DevTools messages and known noise

read_network_requests → check for:
  - 4xx errors (auth, not found, validation)
  - 5xx errors (server crashes)
  - Requests missing Authorization header (potential bypass)
  - Requests containing other tenant IDs (data leakage)
  - Response time > 3000ms → performance flag
  - Response body with another user's data in unexpected fields
  - Content-Type mismatch (JSON endpoint returning HTML = framework 500)
  - CORS errors on cross-origin API calls
```

#### Step 14 — Accessibility (Every Page)

```
14a. Run axe:
     javascript_tool:
       const results = await axe.run();
       console.log(JSON.stringify(results.violations));
     Capture all violations. Zero critical allowed.

14b. Keyboard navigation:
     Tab through all interactive elements → logical left-to-right, top-to-bottom order
     Shift+Tab → reverse correctly
     Enter/Space → activates buttons and links

14c. Focus ring:
     Every focused element has visible outline (not `outline: none` with no replacement)

14d. Form labels:
     Every input has an associated <label> (not placeholder-only)
     aria-describedby links inputs to their error messages

14e. Images:
     All <img> have descriptive alt text (not empty or "image")

14f. Color contrast:
     Text on background ≥ 4.5:1 ratio (normal text)
     Large text / UI components ≥ 3:1 ratio

14g. Landmarks:
     <main>, <nav>, <header> present and unique where appropriate

14h. ARIA:
     No misused aria-label or aria-role
     Modal uses role="dialog" + aria-modal="true" + aria-labelledby
```

#### Step 15 — Responsive Testing

```
resize_window(1280, 900) → screenshot → check: full layout, sidebar expanded
resize_window(768, 1024)  → screenshot → check: sidebar collapses, table scrolls, no overflow
resize_window(375, 812)   → screenshot → check: all text readable, tap targets ≥ 44px, no clipped content
```

#### Step 16 — Dark Mode

```
javascript_tool:
  document.documentElement.classList.add('dark')

Screenshot all UI sections. Check:
- All text readable (no invisible light-on-light)
- No hardcoded white backgrounds exposed
- Sidebar blends with dark bg (#0c0c0e)
- Chart colors adapt (using chartColors from design-system)
- Badge and tint classes adapt via CSS vars
- Input fields have correct dark bg and border
```

---

### Defect Report — Mandatory Fields

Every defect must include ALL of these. Incomplete reports are rejected.

```yaml
Bug ID:            BUG-[NNN]
Timestamp:         [ISO datetime]
Reporter:          QA Agent
Module:            [e.g. Leave Management]
Sub-App:           [NU-HRMS | NU-Hire | NU-Grow | NU-Fluence]
Route:             [e.g. /leave/requests]
API Endpoint:      [e.g. POST /api/v1/leave/requests]
Role Under Test:   [ESS | MGR | HRA | REC | PAY | FIN | ITA | SYS | UNA]
Severity:          [Critical | High | Medium | Low]
Bug Type:          [Functional | Auth/RBAC | UI/Visual | Console Error | Network/API | Accessibility | Performance | Data Integrity]
Title:             [concise one-line summary]
Reproduction Steps:
  1. Login as [role]
  2. Navigate to [route]
  3. [exact action]
  4. [exact action]
  5. Observe: [what happens]
Expected Behavior: [what should happen]
Actual Behavior:   [what actually happens]
Console Errors:    [exact error + source file:line]
Failed API Calls:  [METHOD /endpoint → HTTP status + response excerpt]
Suspected Layer:   [Frontend | Backend | Auth | Database | Config | Middleware]
Screenshot:        qa-reports/screenshots/BUG-[NNN]-[slug].png
GIF Recording:     qa-reports/gifs/BUG-[NNN]-[slug].gif  ← Critical/High only
Component File:    frontend/app/[module]/page.tsx (suspected)
API File:          backend/src/.../Controller.java (suspected)
Suggested Fix:     [optional — only if root cause is obvious]
Owner:             Developer
Validation Steps:  [exact steps Validator must re-run to confirm fix]
Fix Status:        Open
Fix Notes:         [blank — Developer fills this]
```

---

### Severity Definitions

| Severity | Definition | Examples |
|---|---|---|
| **Critical** | App crash, data loss, security breach, RBAC bypass, page will not load | White screen on login, ESS viewing another employee's payslip, 500 on any auth flow |
| **High** | Core functionality broken, data not persisting, money/compliance flows broken | Form submission fails silently, payroll calculation wrong, approval not routing |
| **Medium** | Non-critical function broken, visual regression, non-fatal console errors | Search not filtering, wrong date format, broken image in list |
| **Low** | Cosmetic issue, minor spacing, dark mode edge case, copy error | Padding off by 4px, tooltip typo, icon slightly misaligned |

---

### QA Loop Output (Published After Every Loop)

```markdown
## Loop [N] QA Summary — [ISO date]

### Routes Executed
| Route | Roles Tested | Test Steps Run | Bugs Found | Result |
|---|---|---|---|---|

### New Defects
| Bug ID | Title | Severity | Type | Layer | Owner |
|---|---|---|---|---|---|

### Console Error Summary
[grouped by route — unique errors only, with frequency count]

### Network Failure Summary
[METHOD /endpoint → status → frequency → affected roles]

### Axe Accessibility Summary
| Page | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|

### Performance Flags
[routes with load time > 3000ms]

### RBAC Violations Found
[role + route + action + actual vs expected behavior]

### Coverage Delta
Routes executed this loop: [N]
Cumulative routes covered: [N] / [total]
Coverage: [N]%
Roles fully tested this loop: [list]

### Next Loop Target
[route list + roles + priority rationale]
```

---

## ✅ Definition of Done (Per Path)

A path is fully closed only when ALL boxes checked:

- [ ] Route reached — no 404/500 on load
- [ ] Auth gate verified — UNA redirected to login
- [ ] All 9 roles tested — permitted roles can act, blocked roles get 403
- [ ] Cross-tenant isolation verified — no data leakage
- [ ] Happy path executed — data flows end-to-end, persists on refresh
- [ ] Invalid path executed — validation works correctly, descriptive errors
- [ ] Destructive action tested — confirm dialog + cancel + confirm both work
- [ ] Loading states — SkeletonTable/Card shown, not plain spinner
- [ ] Empty state — EmptyState component, not blank page
- [ ] Error state — API failure handled, not white screen
- [ ] Console — 0 unresolved JS errors
- [ ] Network — 0 unresolved 4xx/5xx
- [ ] Axe — 0 critical accessibility violations
- [ ] Keyboard navigation — logical tab order, visible focus ring
- [ ] Responsive — passes at 1280px, 768px, 375px
- [ ] Dark mode — renders correctly, no broken contrast
- [ ] All bugs filed are Fixed and Validator-signed
- [ ] Report section updated by Orchestrator

---

## 🛠️ Tooling Reference

| Purpose | Tool | Notes |
|---|---|---|
| Browser automation | Claude in Chrome (`navigate`, `find`, `computer`, `form_input`, `read_page`) | Primary UI testing |
| Accessibility | axe via `javascript_tool` | Run on every page |
| E2E scripted | Playwright | For repeatable regression flows |
| API contracts | Swagger UI at `:8080/swagger-ui` | Request/response shape |
| Lint | `cd frontend && npm run lint` | Before every fix |
| Typecheck | `npx tsc --noEmit` | Zero errors required |
| Unit tests | `npm test` / `./mvnw test` | Before handoff to Validator |
| Network capture | `read_network_requests` | After every interaction |
| Console capture | `read_console_messages` | After every action |
| Screenshots | `computer` (screenshot action) | Every bug |
| GIF recording | `gif_creator` | Critical + High bugs |
| Responsive | `resize_window` | 1280 / 768 / 375 |
| JS assertions | `javascript_tool` | axe, localStorage, DOM checks |

**Rule: Use existing repo tooling first. Never add a dependency without Orchestrator approval.**

---

## 📋 Living Report Structure

Path: `docs/validation/autonomous-sweep-report.md`
Writer: Orchestrator only. Published after every loop.

```markdown
# NU-AURA Autonomous QA Report

## Overall Coverage
[route × role × test-type grid — cumulative, updated each loop]

## Loop History
### Loop [N] — [ISO date]
Coverage Gained: [routes]
Bugs Opened: [total] | Critical:[n] High:[n] Medium:[n] Low:[n]
Bugs Fixed: [n]
Bugs Validated: [n]
Blockers: [description + agent]
File-Conflict Warnings: [locked files]
Next Target: [route | role | flow]

## Open Defects
[full defect table — all open bugs]

## Validated Defects
[all closed bugs with Validator sign-off date]

## Design Debt Log
[UX/UI Reviewer entries — separate from functional bugs]

## RBAC Coverage Map
[role × route matrix: ✅ tested | ❌ blocked correctly | ⚠️ unexpected | ⬜ untested]

## Accessibility Scorecard
[axe summary per module: critical / serious / moderate / minor counts]

## Performance Log
[routes > 3000ms load time — trend across loops]

## Tenant Isolation Log
[any cross-tenant test results — especially leakage attempts]
```

---

## 🚀 Startup Sequence

Execute in this exact order at session start:

### Step 1 — Produce These Three Documents First

**A. Team Task Breakdown for Loop 1**

```
Analyzer → maps auth routes, middleware, role guards
QA → executes: login, logout, session restore, middleware gating (9 roles)
UX/UI → reviews: login page, dashboard, sidebar, global nav
Developer → nothing in loop 1 (no validated bugs yet)
Validator → nothing in loop 1 (no fixes yet)
Orchestrator → builds report skeleton, manages queue
```

**B. Baseline Coverage Plan**

- Full route inventory (read `frontend/app/` + `frontend/lib/config/apps.ts`)
- Role inventory with access scope per role
- Risk-ranked critical flow list (top 20 highest-risk paths)
- Initial coverage matrix: route × role × test-type (all empty — to be filled)

**C. First 10-Loop Execution Queue**

```
Loop 1:  Auth — login, logout, session restore, token refresh, middleware gating
Loop 2:  Dashboard, sidebar, app switcher, global navigation, breadcrumbs
Loop 3:  Employees — list, profile, create, edit, delete (HRA + MGR + ESS + UNA)
Loop 4:  Leave — apply, view, approve, reject, cancel, history (all roles)
Loop 5:  Attendance — clock-in/out, timesheet, correction requests
Loop 6:  Payroll — run, payslip view/download, compensation (PAY + ESS + SYS)
Loop 7:  Recruitment — job posting, candidate pipeline, offer letter (REC + MGR)
Loop 8:  Expenses, Assets, Loans — create, approve, reject (ESS + ITA + FIN)
Loop 9:  Performance — reviews, OKRs, 360 feedback (ESS + MGR + HRA)
Loop 10: Admin — roles, permissions, audit log, system settings (SYS + HRA)
```

### Step 2 — Execute Loop 1 Immediately After Approval

**Phase 1: Baseline Mapping (Analyzer)**

1. Programmatically read `frontend/lib/config/apps.ts` → extract all routePrefixes
2. Walk `frontend/app/` directory → list all `page.tsx` files including nested `[id]` routes
3. Read `frontend/middleware.ts` → extract gated routes and redirect logic
4. Read `SecurityConfig.java` → extract role-annotated endpoints
5. Produce route inventory document
6. Build role-to-path access matrix
7. Identify top 5 highest-risk flows
8. Hand queue to QA

**Phase 1: Auth Testing (QA — Loop 1 target)**

```
Test 1: Login with valid SuperAdmin credentials → dashboard loads
Test 2: Login with invalid password → error message shown, no session created
Test 3: Login with valid ESS credentials → ESS dashboard, no admin routes visible
Test 4: Direct URL to /admin while logged in as ESS → 403 or redirect
Test 5: Logout → session cleared → back button → still logged out
Test 6: Session restore: login → close tab → reopen → still authenticated
Test 7: Token expiry simulation → redirected to login with return URL
Test 8: UNA: navigate to every protected route → all redirect to /auth/login
Test 9: RBAC bypass attempt: ESS → /payroll via direct URL → 403
Test 10: Multi-tab: login in tab 1 → logout in tab 2 → tab 1 → session invalidated
```

---

## ⚠️ Hard Rules

| Rule | Consequence of Violation |
|---|---|
| Never close a defect without Validator sign-off | Re-open, reassign |
| Never touch SecurityConfig.java / middleware.ts / Flyway without lead review | Revert immediately |
| Never implement without a validated defect | Discard the change |
| Never skip Analyzer → QA → Validator chain | Invalidates the loop |
| Agents communicate directly on cross-layer bugs | Orchestrator is not a relay |
| Bounded loops only — every loop has defined scope and exit | Prevents runaway execution |
| No new dependencies without Orchestrator approval | Revert |
| SYS bypasses all RBAC — never block SuperAdmin from any UI | Critical bug if violated |
| Screenshot every bug | Report without evidence is rejected |
| GIF every Critical and High bug | Required for Validator verification |

---

*Last updated: 2026-03-31 | Platform: NU-AURA HRMS | Agents: 6 | Sub-apps: 4 | Routes: 60+ | Roles: 9 | Chrome UI Testing: Active*
