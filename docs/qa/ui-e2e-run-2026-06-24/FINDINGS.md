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
**Status**: OPEN
**Evidence**: Payroll → `?denied=1` redirect, /admin → "Access Restricted" inline page, /wall → inconsistent.
**Recommendation**: Standardize on single deny pattern (the `?denied=1` query param approach).

---

## Newly Discovered (This Run)

## F-013 — LOW — /fluence/ai-chat Route Not Implemented
**Status**: OPEN (new — 2026-06-24)
**Evidence**: `app/fluence/` directory has no `ai-chat/` subdirectory. Navigating to `/fluence/ai-chat` returns 404 "Page not found" screen.
**Classification**: Feature gap, not regression. No `ai-chat` route has ever existed in the App Router.
**Action**: Either implement the route or remove references to it from skill/navigation files.
