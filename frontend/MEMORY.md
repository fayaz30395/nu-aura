
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
