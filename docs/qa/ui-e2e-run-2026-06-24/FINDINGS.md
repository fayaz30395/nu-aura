# UI E2E Run 2026-06-24 — Findings Ledger

## Status Legend
- OPEN: Not fixed
- FIXED: Fix implemented, not yet deployed
- VERIFIED: Fix deployed + live-confirmed
- CLOSED: Resolved in prior run, not regressed

---

## F-012 — HIGH — Employee Edit Form: No PUT on Save (Designation Validation Bug)
**Status**: VERIFIED (commit 70405bdb, deploy dpl_DJwmfP1yqSMrdFJ1UFCZ4NHJtGge READY)
**Live Verification**: 2026-06-24 — HR ADMIN (Saran V) edited ZZ QA Test 202606232147-580717; form submitted successfully, "Employment Change Request Submitted" banner shown, firstName updated. No silent failure.
**Root Cause**: `designation?: string` (optional in Employee interface) but `z.string().min(1)` (required in Zod schema). When employee has no designation, `reset()` sets `designation: undefined`, Zod validation fails on submit, `onSubmitInvalid()` runs instead of `onSubmit()`, no PUT emitted. Error "Check the form" toast shows but designation field is on Employment tab while user is on Basic Info tab.
**Fix Applied**:
- Changed Zod schema: `designation: z.string().optional().or(z.literal(''))`
- Pre-population: `designation: employee.designation || ''`
- submitData: `designation: formData.designation || undefined`
- changeRequest: `newDesignation = formData.designation || undefined`
**File**: `frontend/app/employees/[id]/edit/page.tsx` lines 45, 136, 196, 249

## F-001 — NOT-A-BUG — Dashboard Greeting Subtitle
**Status**: CLOSED (false positive)
**Resolution**: `me/dashboard/page.tsx:191` sets `designation = dashboard?.designation` from API. `arun@nulogic.io` has "HR Executive - Recruitment" stored as their designation in DB — the code correctly displays API data. The prior run misclassified test-data inconsistency as a code defect.

## F-004 — LOW — Inconsistent Deny UX Across Modules
**Status**: VERIFIED (commits `a6f4a0bb` + `171082df`, deployed 2026-06-25)
**Evidence**: Payroll → `?denied=1` redirect, /admin → "Access Restricted" inline page, /wall → inconsistent.
**Fix Applied**:
1. `AdminLayoutInner.tsx`: Dashboard sidebar link now conditionally routes `isSuperAdmin ? '/admin' : '/admin/employees'` — TENANT_ADMIN no longer lands on blocked `/admin`
2. `AuthGuard.tsx`: Added `router.replace('/me/dashboard?denied=1')` on `!authorized`, standardizing ALL deny paths to the same `?denied=1` redirect pattern
**Live Verification** (2026-06-25): Navigating to `/admin` as TENANT_ADMIN redirects to `/me/dashboard` (denied toast flashes). `/admin/employees` loads Employee Management correctly. Dashboard sidebar link in admin panel is highlighted when at `/admin/employees`.

---

## Newly Discovered (This Run)

## F-013 — LOW — /fluence/ai-chat Route Not Implemented
**Status**: VERIFIED (commits `4a07a9ef` + `f647660c`)
**Evidence from run**: `app/fluence/` directory had no `ai-chat/` subdirectory. Navigating to `/fluence/ai-chat` returned 404.
**Fix Applied**: Implemented `app/fluence/ai-chat/page.tsx` with full Fluence AI chat interface; KNOWLEDGE:SEARCH permission gate.
**Live Verification** (2026-06-24/25): `/fluence/ai-chat` shows "Fluence AI — Ask anything about your knowledge base" with prompt suggestions and text input. "AI Chat" is highlighted in the Fluence sidebar. Full sidebar present (Wall/Wiki/Articles/My Content/Templates/Drive/Search/Analytics).
