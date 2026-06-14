# Feature Inventory

Date: 2026-06-13

## Inventory sources

- `docs/architecture/modules.md`
- `docs/architecture/features.md`
- `docs/build-kit/02_MODULE_ARCHITECTURE.md`
- `frontend/app/**/page.tsx`
- `backend/src/main/java/com/nulogic/api/**/controller`

## Frontend route inventory summary

- App Router pages discovered: 266 `page.tsx` files.
- High-priority user-facing route clusters:
  - Auth: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/reset-password`.
  - Dashboards/self-service: `/dashboard`, `/dashboards`, `/me/dashboard`, `/me/profile`, `/me/documents`, `/me/payslips`, `/me/leaves`, `/me/attendance`.
  - NU-Hire: `/recruitment`, `/careers`, `/preboarding`, `/onboarding`, `/offer-portal`, `/referrals`, `/probation`.
  - NU-Grow: `/performance`, `/goals`, `/okr`, `/feedback360`, `/one-on-one`, `/learning`, `/training`, `/review-cycles`.
  - NU-Fluence: `/fluence`, `/announcements`, `/recognition`, `/surveys`, `/knowledge`, `/company-spotlight`, `/linkedin-posts`.
  - HRMS core: `/employees`, `/attendance`, `/leave`, `/payroll`, `/expenses`, `/assets`, `/documents`, `/reports`, `/settings`.
  - Admin/platform: `/admin`, `/security`, `/integrations`, `/import-export`, `/biometric-devices`.

## Backend API inventory summary

- Top-level backend API modules discovered: 68.
- Controller files discovered: 178.
- High-risk controller families for production validation:
  - User/role/permission management.
  - Employee/profile/self-service.
  - Recruitment/candidates/jobs/interviews/offers.
  - Performance/goals/reviews/feedback.
  - Fluence/announcements/recognition/surveys/wall/wiki.
  - Payroll, attendance, leave, expenses, documents.

## Critical journeys to validate with browser/API

1. Login, logout, refresh/session expiry, invalid token, browser back/forward.
2. Employee self-service dashboard/profile/documents/payslips/leaves/attendance.
3. NU-Hire candidate to interview to offer/onboarding.
4. NU-Grow goals/reviews/feedback/approval/report views.
5. NU-Fluence announcement/survey/recognition publish/archive/delete flows.
6. RBAC denial for direct URLs and API calls.
7. Search/filter/sort/pagination/table actions on major list pages.
8. Forms: validation, duplicate submission, special characters, long text.
9. Reports/exports/downloads/uploads where available.
10. Empty/loading/error/slow-network states.
