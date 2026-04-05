# QA Report: Finance, NU-Hire, NU-Grow, NU-Fluence Flows

**Date:** 2026-04-02
**QA Engineer:** QA Engineer 2 (Agent)
**Environment:** localhost:3000 (frontend) / localhost:8080 (backend)
**Backend Status:** UP (29m uptime, dev profile, PostgreSQL + Redis healthy)
**Frontend Status:** UP (Next.js 14, HTTP 200 on login page)
**Test Method:** HTTP route testing + static code analysis (Chrome MCP unavailable)

---

## Executive Summary

| Flow Group                      | Status            | Pages Tested | Issues Found             |
|---------------------------------|-------------------|--------------|--------------------------|
| FG11 - Payroll & Compensation   | PASS (with notes) | 8/8          | 1 design violation       |
| FG12 - Expenses & Travel        | PASS              | 4/4          | 0                        |
| FG13 - Tax & Statutory          | PASS              | 4/4          | 0                        |
| FG14 - Recruitment (NU-Hire)    | PASS (with notes) | 6/6          | 2 design violations      |
| FG15 - Onboarding & Offboarding | PASS (with notes) | 3/3          | 1 design violation       |
| FG16 - Performance (NU-Grow)    | PASS              | 8/8          | 0                        |
| FG17 - Training & Learning      | FAIL              | 3/4          | 1 missing page           |
| FG18 - Recognition & Engagement | PASS              | 4/4          | 0                        |
| FG19 - Knowledge (NU-Fluence)   | PASS (with notes) | 9/9          | 2 design violations      |
| Backend Compilation             | FAIL              | N/A          | 198 errors in 10 files   |
| Backend APIs (auth gate)        | PASS              | 33/33        | All return 401 (correct) |
| Security Headers                | PASS              | All routes   | Full OWASP compliance    |

**Total pages tested:** 49/50 (1 missing page file)
**Total bugs found:** 9 (1 critical, 2 high, 4 medium, 2 low)

---

## FLOW GROUP 11 -- PAYROLL & COMPENSATION

### Route Test Results

| Route                      | HTTP | Redirect    | Page File       | Status |
|----------------------------|------|-------------|-----------------|--------|
| /payroll                   | 307  | /auth/login | EXISTS (6.0KB)  | PASS   |
| /payroll/runs              | 307  | /auth/login | EXISTS (8.1KB)  | PASS   |
| /payroll/salary-structures | 307  | /auth/login | EXISTS (6.6KB)  | PASS   |
| /payroll/payslips          | 307  | /auth/login | EXISTS (11.7KB) | PASS   |
| /payroll/statutory         | 307  | /auth/login | EXISTS (15.2KB) | PASS   |
| /payroll/components        | 307  | /auth/login | EXISTS (2.4KB)  | PASS   |
| /compensation              | 307  | /auth/login | EXISTS (53.0KB) | PASS   |
| /benefits                  | 307  | /auth/login | EXISTS (46.0KB) | PASS   |
| /admin/payroll             | N/A  | N/A         | EXISTS (2.6KB)  | PASS   |

### Issues

**BUG-FG11-001: Design System Violation -- bg-white in compensation page**

- **Severity:** Medium
- **File:** `frontend/app/compensation/page.tsx` (lines 421, 430, 434)
- **Detail:** Uses `bg-white/20` and `bg-white/10` -- these are opacity variants on gradient
  overlays. Acceptable in dark-on-gradient contexts but flagged for review since design system
  mandates CSS variables.
- **Expected:** Use `bg-[var(--bg-card)]/20` or equivalent CSS variable

---

## FLOW GROUP 12 -- EXPENSES & TRAVEL

### Route Test Results

| Route     | HTTP | Redirect    | Page File       | Status |
|-----------|------|-------------|-----------------|--------|
| /expenses | 307  | /auth/login | EXISTS (47.5KB) | PASS   |
| /travel   | 307  | /auth/login | EXISTS (18.8KB) | PASS   |
| /loans    | 307  | /auth/login | EXISTS (15.8KB) | PASS   |
| /payments | 307  | /auth/login | EXISTS (22.8KB) | PASS   |

### Issues

None. All routes protected, page files exist with substantial content.

---

## FLOW GROUP 13 -- TAX & STATUTORY

### Route Test Results

| Route             | HTTP | Redirect    | Page File       | Status |
|-------------------|------|-------------|-----------------|--------|
| /tax              | 307  | /auth/login | EXISTS (8.9KB)  | PASS   |
| /tax/declarations | 307  | /auth/login | EXISTS (16.0KB) | PASS   |
| /statutory        | 307  | /auth/login | EXISTS (22.8KB) | PASS   |
| /compliance       | 307  | /auth/login | EXISTS (1.4KB)  | PASS   |

### Issues

None.

---

## FLOW GROUP 14 -- RECRUITMENT (NU-HIRE)

### Route Test Results

| Route                   | HTTP | Redirect    | Page File       | Status |
|-------------------------|------|-------------|-----------------|--------|
| /recruitment            | 307  | /auth/login | EXISTS (22.9KB) | PASS   |
| /recruitment/jobs       | 307  | /auth/login | EXISTS (41.7KB) | PASS   |
| /recruitment/candidates | 307  | /auth/login | EXISTS (27.7KB) | PASS   |
| /recruitment/pipeline   | 307  | /auth/login | EXISTS (74.6KB) | PASS   |
| /recruitment/interviews | 307  | /auth/login | EXISTS (59.8KB) | PASS   |
| /referrals              | 307  | /auth/login | EXISTS (35.5KB) | PASS   |

### Issues

**BUG-FG14-001: Design System Violation -- raw bg-white in toggle switch**

- **Severity:** Low
- **File:** `frontend/app/recruitment/interviews/page.tsx` (line 923)
- **Detail:** Toggle switch knob uses raw `bg-white` for the circular indicator. This is a common
  pattern for toggle switches and may be intentional, but violates the zero-bg-white rule.
- **Expected:** Use `bg-[var(--bg-card)]` or a dedicated toggle component from Mantine

**BUG-FG14-002: DnD library not code-split (known tech debt)**

- **Severity:** Low (documented as NUAURA-002 / NUAURA-003)
- **Files:** `frontend/app/recruitment/pipeline/page.tsx`,
  `frontend/app/recruitment/[jobId]/kanban/page.tsx`
- **Detail:** `@hello-pangea/dnd` DragDropContext/Droppable/Draggable imported directly instead of
  dynamic import. Increases initial bundle size. Already tracked as FUTURE items.

---

## FLOW GROUP 15 -- ONBOARDING & OFFBOARDING

### Route Test Results

| Route        | HTTP | Redirect    | Page File       | Status |
|--------------|------|-------------|-----------------|--------|
| /onboarding  | 307  | /auth/login | EXISTS (17.3KB) | PASS   |
| /preboarding | 307  | /auth/login | EXISTS (15.7KB) | PASS   |
| /offboarding | 307  | /auth/login | EXISTS (43.4KB) | PASS   |

### Issues

**BUG-FG15-001: Design System Violation -- bg-white/10 in onboarding detail**

- **Severity:** Medium
- **File:** `frontend/app/onboarding/[id]/page.tsx` (lines 315, 318, 322)
- **Detail:** Uses `bg-white/10` and `bg-white/20` for overlay elements on gradient backgrounds.
  Same pattern as compensation page.

---

## FLOW GROUP 16 -- PERFORMANCE & GROWTH (NU-GROW)

### Route Test Results

| Route                          | HTTP | Redirect    | Page File       | Status |
|--------------------------------|------|-------------|-----------------|--------|
| /performance                   | 307  | /auth/login | EXISTS (14.5KB) | PASS   |
| /performance/reviews           | 307  | /auth/login | EXISTS (25.9KB) | PASS   |
| /performance/cycles            | 307  | /auth/login | EXISTS (41.7KB) | PASS   |
| /performance/okr               | 307  | /auth/login | EXISTS (35.9KB) | PASS   |
| /performance/goals             | 307  | /auth/login | EXISTS (23.4KB) | PASS   |
| /performance/360-feedback      | 307  | /auth/login | EXISTS (50.8KB) | PASS   |
| /performance/pip               | 307  | /auth/login | EXISTS (37.4KB) | PASS   |
| /performance/competency-matrix | 307  | /auth/login | EXISTS (36.6KB) | PASS   |

### Issues

None. All 8 pages exist with substantial implementations.

---

## FLOW GROUP 17 -- TRAINING & LEARNING

### Route Test Results

| Route             | HTTP | Redirect    | Page File       | Status |
|-------------------|------|-------------|-----------------|--------|
| /training         | 307  | /auth/login | EXISTS (15.7KB) | PASS   |
| /training/catalog | 307  | /auth/login | EXISTS (15.7KB) | PASS   |
| /learning         | 307  | /auth/login | EXISTS (18.9KB) | PASS   |
| /learning/courses | 307  | /auth/login | MISSING         | FAIL   |

### Issues

**BUG-FG17-001: Missing /learning/courses page file**

- **Severity:** High
- **File:** `frontend/app/learning/courses/page.tsx` does NOT exist
- **Detail:** The directory `frontend/app/learning/courses/` exists but only contains a `[id]/`
  dynamic route subdirectory. There is no index `page.tsx` for `/learning/courses`. Navigating to
  this route will redirect to login (auth middleware catches it), but after authentication it would
  likely render a Next.js 404 or fall through to the learning parent page.
- **Expected:** A course listing page at `frontend/app/learning/courses/page.tsx`
- **Workaround:** The `/learning` page may already serve as the course hub

---

## FLOW GROUP 18 -- RECOGNITION & ENGAGEMENT

### Route Test Results

| Route        | HTTP | Redirect    | Page File       | Status |
|--------------|------|-------------|-----------------|--------|
| /recognition | 307  | /auth/login | EXISTS (32.9KB) | PASS   |
| /surveys     | 307  | /auth/login | EXISTS (31.5KB) | PASS   |
| /wellness    | 307  | /auth/login | EXISTS (24.1KB) | PASS   |
| /one-on-one  | 307  | /auth/login | EXISTS (83.1KB) | PASS   |

### Issues

None. The /one-on-one page is notably large (83KB) -- may warrant code splitting review.

---

## FLOW GROUP 19 -- KNOWLEDGE MANAGEMENT (NU-FLUENCE)

### Route Test Results

| Route               | HTTP | Redirect    | Page File       | Status |
|---------------------|------|-------------|-----------------|--------|
| /fluence            | 307  | /auth/login | EXISTS (1.1KB)  | PASS   |
| /fluence/wiki       | 307  | /auth/login | EXISTS (25.4KB) | PASS   |
| /fluence/blogs      | 307  | /auth/login | EXISTS (27.9KB) | PASS   |
| /fluence/templates  | 307  | /auth/login | EXISTS (10.9KB) | PASS   |
| /fluence/drive      | 307  | /auth/login | EXISTS (8.6KB)  | PASS   |
| /fluence/search     | 307  | /auth/login | EXISTS (12.7KB) | PASS   |
| /fluence/my-content | 307  | /auth/login | EXISTS (20.6KB) | PASS   |
| /fluence/wall       | 307  | /auth/login | EXISTS (3.7KB)  | PASS   |
| /fluence/dashboard  | 307  | /auth/login | EXISTS (16.2KB) | PASS   |

### Issues

**BUG-FG19-001: Design System Violation -- raw bg-white in fluence/dashboard**

- **Severity:** Medium
- **File:** `frontend/app/fluence/dashboard/page.tsx` (lines 145-146)
- **Detail:** Two decorative blur circles use raw `bg-white` (not opacity variants). These are full
  `bg-white rounded-full blur-3xl` elements used as background glow effects.
- **Expected:** Replace with `bg-[var(--bg-card)]` or `bg-accent-100`

**BUG-FG19-002: Design System Violation -- raw bg-white in fluence/blogs**

- **Severity:** Medium
- **File:** `frontend/app/fluence/blogs/page.tsx` (lines 174, 196)
- **Detail:** Tab underline indicators use raw `bg-white` for the active tab highlight.
- **Expected:** Use `bg-[var(--accent-primary)]` or `bg-accent-500`

---

## CROSS-CUTTING FINDINGS

### Security Headers (PASS)

All routes return full OWASP-compliant security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()...`
- `Content-Security-Policy`: Comprehensive CSP with self + Google OAuth + fonts
- `X-XSS-Protection: 1; mode=block`
- `X-DNS-Prefetch-Control: off`

### Auth Middleware (PASS)

All 49 tested routes correctly redirect unauthenticated requests to
`/auth/login?returnUrl=<original_path>` with HTTP 307. The `returnUrl` parameter is properly
URL-encoded.

### Backend API Auth Gate (PASS)

All 33 tested API endpoints correctly return HTTP 401 for unauthenticated requests.

### Backend Health (PASS)

Backend reports UP status with PostgreSQL (Neon), Redis 8.6.1, and all health indicators green.

---

## CRITICAL: BACKEND COMPILATION ERRORS

**BUG-BACKEND-001: 198 compile errors across 10 files**

- **Severity:** CRITICAL
- **Impact:** Backend cannot be rebuilt from current working tree
- **Root Cause:** Empty entity file and missing symbols

**Affected files and error counts:**

| File                             | Errors | Root Cause                             |
|----------------------------------|--------|----------------------------------------|
| `PayslipPdfService.java`         | 76     | Missing symbols                        |
| `MileageLogResponse.java`        | 32     | Missing symbols                        |
| `TravelService.java`             | 28     | Missing symbols                        |
| `OvertimeRecordRepository.java`  | 24     | References empty OvertimeRecord entity |
| `CandidateHiredEvent.java`       | 24     | Missing symbols in Candidate entity    |
| `CustomScopeTarget.java`         | 6      | Missing symbols                        |
| `RolePermission.java`            | 4      | Missing symbols                        |
| `Role.java`                      | 4      | Missing symbols                        |
| `OvertimeManagementService.java` | 2      | Cascading from empty entity            |
| `OvertimeRecord.java`            | 1      | **Empty file (0 bytes)**               |

**Key finding:** `OvertimeRecord.java` is an empty file -- the entity class body is missing
entirely. This cascades to OvertimeRecordRepository (24 errors) and OvertimeManagementService (2
errors).

### BUG-BACKEND-002: Unused crypto imports in StripeAdapter

- **Severity:** Low
- **File:** `backend/src/main/java/com/hrms/application/payment/service/StripeAdapter.java`
- **Detail:** Six `javax.crypto` and `java.security` imports were added but are NOT used anywhere in
  the file. The `verifyWebhookSignature` method still just logs a warning and returns false. These
  appear to be preparation for NUAURA-PAYMENT-005 but were committed prematurely.
- **Imports added but unused:** `Mac`, `SecretKeySpec`, `StandardCharsets`, `InvalidKeyException`,
  `MessageDigest`, `NoSuchAlgorithmException`

---

## MODIFIED FILES REVIEW (Git Diff Analysis)

All 24 modified files were reviewed. Changes are primarily:

1. **Design system spacing fixes** (p-3 -> p-4, gap-3 -> gap-4, py-3 -> py-4) -- Correct per 8px
   grid
2. **TODO -> FUTURE comment standardization** -- Correct refactoring of comment style
3. **Javadoc improvements** on PaymentWebhookController -- Documentation only
4. **Webhook signature fail-secure comments** -- RazorpayAdapter/StripeAdapter documentation

No functional regressions found in the modified files.

---

## RECOMMENDATIONS

### P0 -- Must Fix

1. **Populate OvertimeRecord.java entity** -- File is empty, blocking backend compilation
2. **Resolve all 198 backend compile errors** -- Backend cannot be rebuilt

### P1 -- Should Fix

3. **Create /learning/courses/page.tsx** -- Missing course listing page
4. **Remove unused imports from StripeAdapter** -- Dead code / compile warning

### P2 -- Design Compliance

5. **Fix bg-white in fluence/dashboard** (lines 145-146) -- Replace blur circles with CSS variable
6. **Fix bg-white in fluence/blogs** (lines 174, 196) -- Replace tab indicators
7. **Fix bg-white in recruitment/interviews** (line 923) -- Toggle switch knob
8. **Review bg-white/N opacity usage** in compensation and onboarding pages

### P3 -- Performance

9. **Code-split @hello-pangea/dnd** in pipeline and kanban pages (tracked: NUAURA-002, NUAURA-003)
10. **Review /one-on-one page size** (83KB) -- Consider lazy loading sections

---

## TEST LIMITATIONS

- Chrome DevTools MCP was unavailable (extension not connected), so visual rendering, JavaScript
  console errors, and network waterfall analysis could not be performed
- All route tests were unauthenticated (HTTP-level only) -- authenticated page rendering was not
  verified
- No form interaction or CRUD flow testing was possible without browser automation
- Screenshots were not captured

**Recommended follow-up:** Re-run this test suite with Chrome MCP connected to verify visual
rendering, JS errors, and API call behavior on authenticated pages.
