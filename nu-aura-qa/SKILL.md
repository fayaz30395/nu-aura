---
name: nu-aura-qa
description: |
  Automated QA sweep for the NU-AURA HRMS platform. Opens the running app in Chrome,
  systematically tests every module's UI and functionality, checks for console errors and
  failed network requests, and produces a detailed Excel (.xlsx) bug report with evidence.
  Use this skill whenever you need to QA test NU-AURA, find bugs across the platform,
  run a full app sweep, validate UI consistency, check for broken pages, or produce a
  bug report. Trigger on: "QA the app", "test NU-AURA", "find bugs", "run QA sweep",
  "check all pages", "validate the platform", "browser testing", or any request to
  systematically test the NU-AURA frontend. Even if the user just says "check the app"
  or "anything broken?", use this skill to ensure thorough coverage.
---

# NU-AURA QA Sweep Skill

This skill turns Claude into a QA engineer that systematically tests every page of the NU-AURA
platform in a real browser, documents all bugs found, and produces a professional Excel bug report.

## Prerequisites

Before starting the QA sweep, ensure:

1. **App is running** — Check if localhost:3000 (frontend) and localhost:8080 (backend) are
   responding
2. **If not running** — Start the app:
   ```bash
   cd /sessions/wonderful-inspiring-bardeen/mnt/nu-aura
   docker-compose up -d
   cd backend && ./start-backend.sh &
   cd frontend && npm run dev &
   ```
3. **Wait for health** — Poll both endpoints until they respond (max 60s timeout)
4. **Browser ready** — Use `tabs_context_mcp` to get/create a Chrome tab

## Route Discovery

Read the route config to discover all testable pages. The source of truth is:
`frontend/lib/config/apps.ts` → `PLATFORM_APPS` → `routePrefixes`

Parse this file programmatically to build the full route list. Group routes by sub-app:

- **NU-HRMS:** /me, /dashboard, /employees, /departments, /attendance, /leave, /payroll,
  /compensation, /benefits, /expenses, /loans, /travel, /assets, /letters, /statutory, /tax,
  /helpdesk, /approvals, /announcements, /org-chart, /timesheets, /time-tracking, /projects,
  /resources, /allocations, /calendar, /nu-calendar, /nu-drive, /nu-mail, /reports, /analytics,
  /settings, /admin
- **NU-Hire:** /recruitment, /onboarding, /preboarding, /offboarding, /offer-portal, /careers
- **NU-Grow:** /performance, /okr, /feedback360, /training, /learning, /recognition, /surveys,
  /wellness
- **NU-Fluence:** /fluence/wiki, /fluence/blogs, /fluence/templates, /fluence/drive,
  /fluence/search, /fluence/my-content, /fluence/wall, /fluence/dashboard

Also discover sub-routes by checking `frontend/app/` directory for nested page.tsx files (e.g.,
`/employees/[id]`, `/admin/roles`).

## Authentication

Before testing, log in:

1. Navigate to `localhost:3000/auth/login`
2. Use the SuperAdmin test credentials (check `.env` or `start-backend.sh` for test accounts)
3. Verify login succeeds by checking for the dashboard or sidebar presence
4. SuperAdmin bypasses all RBAC — this lets you see every page

## QA Sweep Process

For EACH route, perform these checks in order:

### 1. Page Load Check

- Navigate to the route
- Wait for the page to fully load (no loading spinners visible)
- Take a screenshot
- Record load time

### 2. Visual UI Checks

- **Layout integrity:** Does the page render without broken layout, overlapping elements, or
  overflow?
- **Design system compliance:** Check against `nu-aura-frontend` skill conventions:
  - Correct color usage (CSS variables, not hardcoded hex)
  - 8px grid spacing (no gap-3, p-3, p-5 etc.)
  - Proper typography hierarchy
  - Correct card/table/badge patterns
- **Dark mode:** Toggle dark mode and verify the page renders correctly
- **Responsive:** Check at standard breakpoints (desktop 1280px, tablet 768px) if time allows
- **Empty states:** If no data, verify an EmptyState component is shown (not a blank page)

### 3. Functional Checks

- **Interactive elements:** Click buttons, links, tabs, dropdowns — do they respond?
- **Forms:** If the page has forms, check that fields are present, labels exist, and basic
  validation works
- **Modals/Drawers:** Click "Add" or "Edit" buttons — do modals open correctly?
- **Navigation:** Do sidebar links and breadcrumbs work?
- **Data display:** If tables are present, do they show data or proper loading/empty states?

### 4. Console Error Check

- Use `read_console_messages` to capture JS errors and warnings
- Filter for actual errors (ignore React dev warnings and known noise)
- Record error messages with their source

### 5. Network Health Check

- Use `read_network_requests` to check for:
  - Failed API calls (4xx, 5xx status codes)
  - Slow responses (>3s)
  - Missing assets (404s on images, fonts, etc.)
- Record the failed endpoint URL and status code

## Bug Classification

### Severity Levels

- **Critical:** App crash, data loss, security issue, page won't load at all, white screen
- **High:** Core functionality broken (can't submit forms, can't view data, broken CRUD), API 500
  errors
- **Medium:** Visual bugs (wrong colors, broken layout, missing elements), non-critical console
  errors
- **Low:** Minor cosmetic issues (spacing off, subtle alignment, minor dark mode glitch)

### Bug Types

- **UI:** Visual/layout/styling issues
- **Functional:** Broken interactions, forms, navigation
- **Console:** JavaScript errors or warnings
- **Network:** Failed API calls, missing assets
- **Accessibility:** Missing labels, contrast issues (if easily noticeable)

## Excel Bug Report Output

Read the `xlsx` skill BEFORE creating the report (at
`/sessions/wonderful-inspiring-bardeen/mnt/.skills/skills/xlsx/SKILL.md`).

Create the report using openpyxl with these specifications:

### Sheet 1: "Summary"

- Total bugs found (by severity)
- Total pages tested
- Total pages passed (no bugs)
- Pass rate percentage
- Timestamp of QA run
- App version / git commit hash (if available)

### Sheet 2: "Bug Report"

Columns (in order):
| Column | Header | Description |
|--------|--------|-------------|
| A | Bug ID | Sequential: BUG-001, BUG-002, etc. |
| B | Sub-App | NU-HRMS / NU-Hire / NU-Grow / NU-Fluence |
| C | Module | e.g., Employees, Leave, Payroll |
| D | Page Route | e.g., /employees, /leave/requests |
| E | Bug Type | UI / Functional / Console / Network |
| F | Severity | Critical / High / Medium / Low |
| G | Description | Clear, concise bug description |
| H | Expected Behavior | What should happen |
| I | Actual Behavior | What actually happens |
| J | Steps to Reproduce | Numbered steps |
| K | Console Log | Error message if applicable |
| L | Failed API Endpoint | URL + status code if applicable |
| M | Screenshot Path | Relative path to screenshot file |
| N | Component File Path | Frontend file likely responsible |
| O | Fix Status | "Open" (default — Dev skill updates this) |
| P | Fix Notes | Empty (Dev skill fills this) |

### Sheet 3: "Pages Tested"

| Column | Header             |
|--------|--------------------|
| A      | Route              |
| B      | Sub-App            |
| C      | Module             |
| D      | Status (Pass/Fail) |
| E      | Bug Count          |
| F      | Load Time (ms)     |

### Formatting

- Header row: Bold, dark background (#1e1b4b), white text, frozen
- Severity color coding: Critical=red fill, High=orange, Medium=yellow, Low=light blue
- Auto-fit column widths
- Filters enabled on all columns
- Professional font (Arial 11pt)

### File Output

- Save to: `{workspace}/qa-reports/qa-report-{YYYY-MM-DD-HHmm}.xlsx`
- Screenshots to: `{workspace}/qa-reports/screenshots/{route-slug}.png`
- Where `{workspace}` = `/sessions/wonderful-inspiring-bardeen/mnt/nu-aura`

## Execution Strategy

Testing 60+ pages is a lot of work. Be systematic:

1. **Batch by sub-app** — Complete all HRMS pages, then Hire, then Grow, then Fluence
2. **Clear console/network between pages** — Use `clear: true` on read_console_messages and
   read_network_requests after capturing
3. **Track progress** — Use TodoWrite to show which modules have been tested
4. **Skip gracefully** — If a page requires specific data that doesn't exist (e.g., employee detail
   page with no employees), note it as "Skipped — no test data" rather than marking it as a bug
5. **Be thorough but efficient** — Spend more time on complex pages (forms, dashboards) and less on
   simple static pages
6. **Save screenshots strategically** — Always screenshot on bug discovery; optionally screenshot
   every page for the full audit trail

## Important Notes

- This skill uses Claude-in-Chrome browser tools (navigate, screenshot, read_page, find, form_input,
  read_console_messages, read_network_requests)
- The QA sweep is a FULL pass — don't stop after the first few pages
- If the app is not running and cannot be started, inform the user and stop
- The Excel report is the primary deliverable — always produce it even if testing is cut short
- Reference the `nu-aura-frontend` skill's design system rules when checking visual compliance
