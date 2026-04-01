---
name: nu-aura-dev
description: |
  Automated bug fixer for the NU-AURA HRMS platform. Reads a QA bug report Excel file
  (produced by nu-aura-qa or manually), analyzes the codebase, and systematically fixes
  UI and functionality bugs — grouped by module for efficiency. Updates the Excel with
  fix status and validates each fix compiles cleanly.
  Use this skill whenever you need to fix bugs from a QA report, work through a bug list,
  fix NU-AURA issues, resolve platform defects, or process a bug spreadsheet. Trigger on:
  "fix bugs", "fix the QA report", "work through bug list", "fix NU-AURA issues",
  "resolve defects", "process bug report", "fix what QA found", or any request to
  systematically fix bugs in the NU-AURA platform from an Excel/spreadsheet source.
  Even if the user just says "fix these" while referencing an xlsx, use this skill.
---

# NU-AURA Dev Bug Fixer Skill

This skill turns Claude into a methodical bug-fixing engineer. It reads a QA bug report (Excel), groups bugs by module, fixes them one batch at a time following NU-AURA's coding conventions, and validates every fix compiles cleanly.

## Input: Bug Report

The primary input is an `.xlsx` file — either:
- Produced by the `nu-aura-qa` skill (has the standard column structure)
- User-provided (may have a different format — adapt accordingly)

### Expected Columns (from nu-aura-qa output)
| Column | Header | Used By Dev |
|--------|--------|-------------|
| A | Bug ID | Reference key |
| B | Sub-App | For context |
| C | Module | **Primary grouping key** |
| D | Page Route | For locating the page file |
| E | Bug Type | Determines fix approach |
| F | Severity | Determines fix priority |
| G | Description | What's wrong |
| H | Expected Behavior | What it should do |
| I | Actual Behavior | What it does now |
| J | Steps to Reproduce | How to trigger |
| K | Console Log | Error details |
| L | Failed API Endpoint | API issue details |
| M | Screenshot Path | Visual reference |
| N | Component File Path | **Direct pointer to fix location** |
| O | Fix Status | **Updated by this skill** |
| P | Fix Notes | **Updated by this skill** |

## Pre-Flight Checks

Before starting fixes:

1. **Read CLAUDE.md** — Refresh on non-negotiable coding rules
2. **Read nu-aura-frontend skill** — Load design system conventions (at `/sessions/wonderful-inspiring-bardeen/mnt/.skills/skills/nu-aura-frontend/SKILL.md`)
3. **Read the bug report** — Parse the Excel using openpyxl or pandas
4. **Group bugs by Module** — Sort each group by Severity (Critical → High → Medium → Low)
5. **Present the plan** — Show the user the module batches and bug counts before starting

## Fix Workflow

### Phase 1: Triage and Grouping

```
Input Excel
    ↓
Parse all bugs
    ↓
Group by Module (Column C)
    ↓
Within each group, sort by Severity: Critical → High → Medium → Low
    ↓
Present batch plan to user:
  "Module: Employees (5 bugs: 1 Critical, 2 High, 2 Medium)"
  "Module: Leave (3 bugs: 1 High, 2 Low)"
  ...
```

### Phase 2: Module-by-Module Fixing

For each module batch:

#### Step 1: Read Existing Code
- Read the page file: `frontend/app/{module}/page.tsx`
- Read related components referenced in bug descriptions
- Read the component file path from Column N if provided
- Check for hooks in `frontend/lib/hooks/` and services in `frontend/lib/services/`
- Understand the current code before making any changes

#### Step 2: Fix Each Bug in the Batch
For each bug in the module (by severity order):

**UI Bugs (Bug Type = "UI"):**
- Check against `nu-aura-frontend` design system rules
- Fix color usage → use CSS variables (`var(--text-primary)`, `var(--bg-card)`)
- Fix spacing → use 8px grid classes only (p-4, p-6, gap-4, gap-6)
- Fix typography → use design-system.ts tokens
- Fix dark mode → use CSS variable approach, no `dark:` overrides on themed colors
- Fix component patterns → use `card-aura`, `table-aura`, `badge-status`, `input-aura` classes
- Fix loading states → use NuAuraLoader, SkeletonTable, SkeletonCard
- Fix empty states → use EmptyState component

**Functional Bugs (Bug Type = "Functional"):**
- Trace the issue from UI → hook → service → API
- Fix form handling (React Hook Form + Zod — never raw inputs)
- Fix data fetching (React Query — never raw useEffect + fetch)
- Fix state management (Zustand for auth/UI, React Query for server state)
- Fix navigation/routing issues
- Fix modal/drawer open/close logic
- Use the existing Axios instance from `frontend/lib/` — never create new ones

**Console Error Bugs (Bug Type = "Console"):**
- Read the error message and stack trace
- Trace to the source component
- Common fixes: null checks, missing dependencies, undefined props, incorrect imports
- Fix TypeScript errors — no `any` types, define proper interfaces

**Network Error Bugs (Bug Type = "Network"):**
- If frontend-caused (wrong URL, missing params): fix in the service/hook file
- If backend-caused (500 error): check the backend controller and service
  - Controllers: `backend/src/main/java/**/controller/`
  - Services: `backend/src/main/java/**/service/`
- If auth-related: check SecurityConfig and JWT handling

#### Step 3: Validate the Fix
After fixing ALL bugs in a module batch:

```bash
cd /sessions/wonderful-inspiring-bardeen/mnt/nu-aura/frontend && npx tsc --noEmit
```

- If TypeScript errors occur: fix them before moving to the next module
- This is non-negotiable — every module batch must compile cleanly

#### Step 4: Update the Excel
For each bug fixed, update:
- **Column O (Fix Status):** One of:
  - `Fixed` — Bug has been resolved
  - `Skipped` — Bug cannot be fixed (e.g., backend-only, needs design decision)
  - `Partial` — Partially fixed, needs more work
  - `Needs Manual Review` — Fix applied but needs human verification
- **Column P (Fix Notes):** Brief description of what was changed, e.g.:
  - "Replaced hardcoded hex with var(--text-primary) in EmployeeCard.tsx"
  - "Added null check for employee.department in EmployeesPage"
  - "Skipped — requires backend API change in PayrollController"

### Phase 3: Save Updated Report

Read the `xlsx` skill BEFORE creating/updating the report (at `/sessions/wonderful-inspiring-bardeen/mnt/.skills/skills/xlsx/SKILL.md`).

Save the updated Excel with fix statuses to:
`{workspace}/qa-reports/qa-report-{original-date}-FIXED.xlsx`

Add a new sheet "Fix Summary" with:
| Column | Header |
|--------|--------|
| A | Total Bugs |
| B | Fixed |
| C | Skipped |
| D | Partial |
| E | Needs Manual Review |
| F | Fix Date |
| G | Git Commit (if committed) |

## Coding Rules (Non-Negotiable)

These rules are inherited from the project's CLAUDE.md and must be followed for every fix:

1. **Read before writing.** Always read the existing file first. Never rewrite what works.
2. **No new Axios instances.** Use the existing one in `frontend/lib/`.
3. **No `any` in TypeScript.** Define proper interfaces.
4. **All forms: React Hook Form + Zod.** No uncontrolled inputs.
5. **All data fetching: React Query.** No raw `useEffect` + `fetch`.
6. **SuperAdmin bypasses all RBAC.** Never block them from any UI.
7. **Run `npx tsc --noEmit` after every module batch** and fix all errors.
8. **Use CSS variables for colors**, not hardcoded values.
9. **Use design-system.ts imports** for spacing, typography, and chart colors.
10. **Do not add new npm packages** without checking if an equivalent already exists in `package.json`.

## Fix Priority Matrix

| Severity | Bug Type | Action |
|----------|----------|--------|
| Critical | Any | Fix immediately — these block usage |
| High | Functional | Fix — core workflows are broken |
| High | Network (500) | Fix if frontend-caused; flag if backend |
| Medium | UI | Fix — visual consistency matters |
| Medium | Console | Fix — clean console = healthy app |
| Low | UI | Fix if quick; skip if risky |
| Low | Console | Fix warnings if simple; skip noise |

## Browser Validation (Optional)

If the app is running and Chrome is available, the dev skill can optionally verify fixes visually:
1. Navigate to the fixed page
2. Take a screenshot
3. Compare against the bug description
4. Update Fix Status based on visual confirmation

This is optional but recommended for Critical and High severity bugs.

## Important Notes

- This skill works on the actual codebase — changes persist
- Always work in the existing code structure, never reorganize files
- If a fix requires changes to multiple files (e.g., hook + page + type), make all related changes together
- If a bug points to a backend issue, note it as "Skipped — backend fix needed" with details about which controller/service to check
- The updated Excel is the primary output — always save it even if some bugs couldn't be fixed
- Use TodoWrite to track progress through module batches
