
---

## Section 30 — notFound() Propagation + letters/page.tsx bugfix (2026-03-17)

### Objective
Replace inline "not found" UI patterns in dynamic routes with Next.js `notFound()` to trigger the global `not-found.tsx` page. Also fixed a pre-existing stale variable reference bug in `letters/page.tsx`.

### Bug Fixed
`app/letters/page.tsx:422` — `letters.filter(...)` referenced undeclared variable `letters`; should have been `filteredLetters`. Was a stale reference from before the React Query migration.

### notFound() Added To (14 files)
All dynamic routes now call `notFound()` when data is unavailable after loading completes:

- `app/contracts/[id]/page.tsx` — replaced inline "Contract not found" div
- `app/employees/[id]/page.tsx` — guard before existing error block
- `app/projects/[id]/page.tsx`
- `app/loans/[id]/page.tsx`
- `app/calendar/[id]/page.tsx`
- `app/fluence/templates/[id]/page.tsx` — replaced full "Template not found" UI
- `app/fluence/wiki/[slug]/page.tsx` — replaced motion animated not-found card
- `app/fluence/blogs/[slug]/page.tsx` — replaced motion animated not-found card
- `app/fluence/wiki/[slug]/edit/page.tsx`
- `app/fluence/blogs/[slug]/edit/page.tsx`
- `app/learning/courses/[id]/page.tsx`
- `app/learning/courses/[id]/play/page.tsx`
- `app/learning/courses/[id]/quiz/[quizId]/page.tsx`
- `app/travel/[id]/page.tsx`

### Pattern (Locked In)
Guard after isLoading check, before error display:
```tsx
if (!isLoading && !error && !data) { notFound(); }
if (error || !data) { /* show error UI */ }
```

### Final State
- **TypeScript**: 0 errors
- **ESLint**: 0 errors, 0 warnings

*Last updated: 2026-03-17 (notFound() propagation complete)*

---

## Section 29 — Route Boundary Coverage: loading.tsx + error.tsx (2026-03-17)

### Objective
Complete Next.js route boundary coverage for all pages that perform API calls, enabling streaming and proper error recovery.

### Files Created

**5 loading.tsx + 5 error.tsx for pages identified in previous session:**
- `app/holidays/loading.tsx` + `error.tsx` (Calendar icon)
- `app/contracts/loading.tsx` + `error.tsx` (FileText icon)
- `app/payments/loading.tsx` + `error.tsx` (CreditCard icon)
- `app/company-spotlight/loading.tsx` + `error.tsx` (Newspaper icon)
- `app/linkedin-posts/loading.tsx` + `error.tsx` (Share2 icon)

**19 error.tsx files for all React Query-using routes without boundaries:**
- `app/recruitment/pipeline/error.tsx` (Users)
- `app/recruitment/job-boards/error.tsx` (Briefcase)
- `app/recruitment/[jobId]/kanban/error.tsx` (Layout)
- `app/projects/resource-conflicts/error.tsx` (AlertTriangle)
- `app/projects/gantt/error.tsx` (BarChart2)
- `app/projects/calendar/error.tsx` (Calendar)
- `app/performance/cycles/[id]/nine-box/error.tsx` (Grid)
- `app/performance/cycles/[id]/calibration/error.tsx` (Sliders)
- `app/offboarding/exit/fnf/error.tsx` (DollarSign)
- `app/learning/paths/error.tsx` (BookOpen)
- `app/learning/courses/[id]/quiz/[quizId]/error.tsx` (HelpCircle)
- `app/fluence/wiki/[slug]/edit/error.tsx` (FileEdit)
- `app/fluence/blogs/[slug]/edit/error.tsx` (Edit)
- `app/exit-interview/[token]/error.tsx` (MessageSquare)
- `app/employees/directory/error.tsx` (Users)
- `app/employees/change-requests/error.tsx` (ClipboardList)
- `app/approvals/inbox/error.tsx` (CheckSquare)
- `app/admin/roles/error.tsx` (Shield)
- `app/admin/permissions/error.tsx` (Key)

**2 loading.tsx for fluence edit routes that had no boundary at all:**
- `app/fluence/wiki/[slug]/edit/loading.tsx`
- `app/fluence/blogs/[slug]/edit/loading.tsx`

### Error Boundary Pattern (Locked In)
All `error.tsx` files follow the same pattern:
- `'use client'` directive
- `useEffect` → `handleError()` on mount for observability
- `categorizeError()` + `getUserMessage()` for user-friendly messaging
- `isDevelopment` guard for raw error.message display
- 3 action buttons: Try Again (reset), Back to Module, Go to Home
- Framer Motion fade-in animation

### Final State
- **TypeScript**: 0 errors
- **ESLint**: 0 errors, 0 warnings
- **Routes with API calls missing error.tsx**: 0
- **Remaining pages without any boundary**: Only static marketing pages (about, contact, features, pricing, security, integrations) — no API calls, boundaries not needed

*Last updated: 2026-03-17 (Route boundary coverage complete)*

---

## Section 28 — ESLint + TypeScript Zero-Defect Pass (2026-03-17)

### Objective
Full elimination of all ESLint errors and warnings, and all TypeScript strict-mode errors.

### Results
- **TypeScript**: 0 errors (`npx tsc --noEmit` clean)
- **ESLint**: 0 errors, 0 warnings (previously: 26 `no-explicit-any` errors, 7 `no-img-element` warnings, multiple other violations)

### Key Changes Made

**ESLint rule fixes:**
- `@typescript-eslint/no-explicit-any` (26 → 0): Replaced `any` with `unknown`, proper interfaces, `ComponentType<object>`, `vi.mocked()` in test files, `Record<string, unknown>[]`, `TestInfo` from Playwright
- `@next/next/no-img-element` (7 → 0): Replaced `<img>` with Next.js `<Image>` in PostComposer, CompanyFeed, WallCards, ResourceAvailabilityCalendar, Header — all with `unoptimized` for external URLs
- `jsx-a11y/alt-text` (3 → 0): Renamed lucide `Image` icon to `ImageIcon` in PostComposer, wall/PostComposer, nu-drive page to avoid false positives with Next.js Image
- `@typescript-eslint/no-empty-object-type` (2 → 0): Changed empty `interface X extends Y {}` to `type X = Y` in WallCards
- `@typescript-eslint/no-require-imports` (3 → 0): Added `.eslintrc.json` overrides for `*.config.js`, inline disable for dynamic require in error-handler.ts
- `import/no-anonymous-default-export` (2 → 0): Named the export objects in error-handler.ts and service-error.ts
- `prefer-const` (1 → 0): Fixed `let` → `const` in notification-flow test
- `@typescript-eslint/no-unused-expressions` (1 → 0): Fixed `expect() || expect()` pattern in attendance.spec.ts

**Infrastructure improvements:**
- Created `.eslintignore` to exclude `playwright-report/`, `playwright/`, `test-results/`, `.next/`, `node_modules/`
- Added `.eslintrc.json` overrides: `*.config.js` files exempt from `no-require-imports` + `no-unused-vars`; e2e test files allow Playwright fixture arg names (`page`, `request`, `context`, `browser`)

**Design system spacing (no-restricted-syntax):**
- Eliminated all 122 off-grid spacing warnings across 38 component files
- `gap-3` (12px) → `gap-2` (8px) for icon+text flex rows
- `gap-3` in modal action rows → `gap-4` (16px)
- `space-y-3` → `space-y-4`
- `p-3` → `p-4` for section/card containers
- `m-3` → `m-4`

*Last updated: 2026-03-17 (ESLint + TypeScript zero-defect pass)*

---

## Section 27 — Wave 9: React Query Expansion Final Pass (2026-03-14)

### Objective
Convert all remaining pages (34 pages) that still had `useState + useEffect` data fetching patterns. 7 parallel agents, each covering a non-overlapping domain slice.

### New Hook Files Created (Wave 9)

| File | Wraps | Domain |
|------|-------|--------|
| `useRoles.ts` | `lib/api/roles.ts`, `lib/api/users.ts` | RBAC roles + permissions admin |
| `useShifts.ts` | `lib/api/shifts.ts` | Shift management (renamed exports: `useShiftsList`, `useShiftById`, `useActiveShiftsList`, `useCreateNewShift`, `useUpdateShiftDetails`, `useRemoveShift`) |
| `useCustomFields.ts` | `lib/api/custom-fields.ts` | Custom field definitions admin |
| `useMfa.ts` | `lib/api/mfa.ts` | MFA status, setup, enable/disable |
| `useLinkedIn.ts` | `linkedin.service.ts` | LinkedIn posts CRUD |
| `useEsignPublic.ts` | `esign-public.service.ts` | Public e-sign token flow |
| `useApplicants.ts` | `applicant.service.ts` | Job applicants + pipeline data |
| `usePreboarding.ts` | `apiClient` direct | Preboarding candidates |
| `usePublicOffer.ts` | `public-offer.service.ts` | Public offer accept/decline (no auth) |
| `useExit.ts` | `exit.service.ts` | Offboarding/exit processes |
| `useCareers.ts` | raw `fetch` | Public careers job listings (no auth) |
| `useKnowledgeBase.ts` | `apiClient` direct | Helpdesk knowledge base articles |

### Hook Files Extended (Wave 9)
- `useLearning.ts` — added `useCourseEnrollment`, `useUpdateCourseProgress`, `useUpdateContentProgress`, `useCourseCatalog`
- `useCompensation.ts` — verified existing coverage (no gaps)
- `useAttendance.ts` — verified existing coverage for dashboard data
- `useRecruitment.ts` — verified existing coverage for jobs/interviews

### Pages Converted (Wave 9) — 35 pages across 7 agents

**Agent A — Admin (4 pages):** `admin/permissions`, `admin/roles`, `admin/shifts`, `admin/custom-fields`

**Agent B — Settings/Auth/Content (4 pages):** `settings/security`, `settings/page`, `linkedin-posts`, `sign/[token]`

**Agent C — Recruitment (4 pages):** `recruitment/candidates` (completed PARTIAL), `recruitment/pipeline`, `recruitment/jobs` (completed PARTIAL), `recruitment/interviews` (already converted — no changes)

**Agent D — Learning/Training (6 pages):** `learning/courses/[id]`, `learning/courses/[id]/play`, `learning/courses/[id]/quiz/[quizId]`, `learning/certificates`, `learning/paths`, `training/my-learning`

**Agent E — Onboarding/Preboarding/Exit (6 pages):** `onboarding/templates/[id]`, `onboarding/new`, `preboarding`, `preboarding/portal/[token]`, `offer-portal`, `offboarding`

**Agent F — Finance/Performance/Reports (5 pages):** `compensation` (completed PARTIAL), `leave`, `performance/cycles` (completed PARTIAL), `reports/scheduled` (completed PARTIAL), `dashboard`

**Agent G — Employees/Misc (6 pages):** `employees`, `employees/directory`, `org-chart`, `careers`, `helpdesk/knowledge-base`, `company-spotlight`

### Post-Agent Barrel Conflict Fixes

| Conflict | File | Resolution |
|----------|------|------------|
| `useShifts/useShift/useActiveShifts/useCreateShift/useUpdateShift/useDeleteShift` | `useShifts.ts` vs `useAttendance.ts` | Renamed in `useShifts.ts`: `useShiftsList`, `useShiftById`, `useActiveShiftsList`, `useCreateNewShift`, `useUpdateShiftDetails`, `useRemoveShift` |
| `useAdminUsers` | `useRoles.ts` vs `useAdmin.ts` | Renamed in `useRoles.ts` to `useRoleAdminUsers` |

### Post-Agent Page Fixes
- `admin/shifts/page.tsx`: `submitting` undefined → `createShiftMutation.isPending || updateShiftMutation.isPending`
- `admin/shifts/page.tsx`: `shifts` typed as `Shift[]` via explicit cast from query data
- `admin/permissions/page.tsx`: `useAdminUsers` import aliased as `useRoleAdminUsers as useAdminUsers`

### Pages Intentionally Skipped (Google OAuth External APIs)
- `nu-mail/page.tsx` — Integrates directly with Gmail API via OAuth token; React Query not applicable to Google API calls
- `nu-drive/page.tsx` — Google Drive API direct integration via OAuth
- `nu-calendar/page.tsx` — Google Calendar API direct integration via OAuth

### Final State (Wave 9)
- **TypeScript**: 0 errors (`npx tsc --noEmit` clean)
- **Vitest**: 298/298 tests passing
- **React Query coverage**: ~99% of backend-calling pages converted
- **Remaining raw useEffect**: Only 3 pages (nu-mail, nu-drive, nu-calendar) — all justified as Google OAuth external API integrations, not backend calls
- **Hook files total**: 50 query hook files covering all platform domains

### Architecture Note (Locked In)
All backend API calls in the NU-AURA frontend now flow through React Query (TanStack Query v5). The pattern is:
1. Service file (`lib/services/*.ts`) or API wrapper (`lib/api/*.ts`) → typed async function
2. Hook file (`lib/hooks/queries/use*.ts`) → `useQuery`/`useMutation` wrappers with key factories
3. Page component → imports named hooks, no `useState` for server data, no `useEffect` for fetching

*Last updated: 2026-03-14 (Wave 9 — React Query migration complete)*
