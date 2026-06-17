---
title: Frontend Route Map — Complete Enumeration
tags: [frontend, routes, app-router, nextjs, catalog, index]
---

# Frontend Route Map — Complete Enumeration

> Exhaustive companion to [[Routes]] (the curated/representative view). Where
> [[Routes]] groups and samples the route tree for narrative reading, this note
> lists **every** `page.tsx` under `frontend/app/` exactly once, mapped to its
> URL, owning sub-app, and public/protected status.

## Purpose

Provides the complete, evidence-based inventory of the Next.js 16 **App Router**
route surface. Each `frontend/app/**/page.tsx` is converted to its URL
(`frontend/app` prefix and trailing `/page.tsx` stripped; dynamic segments like
`[id]`, `[slug]`, `[token]`, `[jobId]`, `[quizId]` preserved; `app/page.tsx` → `/`),
assigned to a sub-app via the `PLATFORM_APPS.routePrefixes` tables in
`frontend/lib/config/apps.ts` (`getAppForRoute` checks HIRE → GROW → FLUENCE,
then falls back to **HRMS** as catch-all), and marked public/protected via
`PUBLIC_ROUTES` / `isPublicRoute` in `frontend/lib/config/routes.ts`.

## Counts

**Measured on disk** (`find frontend/app -name page.tsx`, run for this doc):

| Metric | Count |
|--------|-------|
| Total `page.tsx` (`find frontend/app -name page.tsx \| wc -l`) | **286** |
| Public (`isPublicRoute`) | 10 |
| [[Nu-HRMS]] (HRMS — catch-all) | 190 |
| [[Nu-Hire]] (HIRE) | 27 |
| [[Nu-Grow]] (GROW) | 38 |
| [[Nu-Fluence]] (FLUENCE) | 17 |
| Launcher (`app/app/*`) | 4 |
| **Table rows below** | **286** |

> **Assignment rule.** Public routes are listed once under **Public** (not also
> under their sub-app). For protected routes, sub-app is taken from
> `getAppForRoute`: HIRE/GROW/FLUENCE matched first by prefix, everything else
> falls through to **HRMS** (catch-all) — so HRMS rows are not annotated
> individually. Note: `/fluence` (bare) and the `app/app/*` launcher pages do
> **not** match any HIRE/GROW/FLUENCE prefix, so `getAppForRoute` would resolve
> them to HRMS; here `app/app/*` is broken out as **Launcher** per the
> [[Routes]] grouping, and bare `/fluence` sits under HRMS.

## Complete route table

### Public (no auth — `PUBLIC_ROUTES`)

| Route | File | Public/Protected |
|-------|------|------------------|
| `/` | `frontend/app/page.tsx` | Public |
| `/auth/forgot-password` | `frontend/app/auth/forgot-password/page.tsx` | Public |
| `/auth/login` | `frontend/app/auth/login/page.tsx` | Public |
| `/auth/signup` | `frontend/app/auth/signup/page.tsx` | Public |
| `/careers` | `frontend/app/careers/page.tsx` | Public |
| `/exit-interview/[token]` | `frontend/app/exit-interview/[token]/page.tsx` | Public |
| `/offer-portal` | `frontend/app/offer-portal/page.tsx` | Public |
| `/preboarding` | `frontend/app/preboarding/page.tsx` | Public |
| `/preboarding/portal/[token]` | `frontend/app/preboarding/portal/[token]/page.tsx` | Public |
| `/sign/[token]` | `frontend/app/sign/[token]/page.tsx` | Public |

### NU-HRMS (HRMS — catch-all core HR)

| Route | File | Public/Protected |
|-------|------|------------------|
| `/about` | `frontend/app/about/page.tsx` | Protected |
| `/admin/audit` | `frontend/app/admin/audit/page.tsx` | Protected |
| `/admin/budget` | `frontend/app/admin/budget/page.tsx` | Protected |
| `/admin/custom-fields` | `frontend/app/admin/custom-fields/page.tsx` | Protected |
| `/admin/departments` | `frontend/app/admin/departments/page.tsx` | Protected |
| `/admin/employees` | `frontend/app/admin/employees/page.tsx` | Protected |
| `/admin/feature-flags` | `frontend/app/admin/feature-flags/page.tsx` | Protected |
| `/admin/holidays` | `frontend/app/admin/holidays/page.tsx` | Protected |
| `/admin/implicit-roles` | `frontend/app/admin/implicit-roles/page.tsx` | Protected |
| `/admin/import-keka` | `frontend/app/admin/import-keka/page.tsx` | Protected |
| `/admin/integrations` | `frontend/app/admin/integrations/page.tsx` | Protected |
| `/admin/integrations/webhooks` | `frontend/app/admin/integrations/webhooks/page.tsx` | Protected |
| `/admin/leave-requests` | `frontend/app/admin/leave-requests/page.tsx` | Protected |
| `/admin/leave-types` | `frontend/app/admin/leave-types/page.tsx` | Protected |
| `/admin/mobile-api` | `frontend/app/admin/mobile-api/page.tsx` | Protected |
| `/admin/office-locations` | `frontend/app/admin/office-locations/page.tsx` | Protected |
| `/admin/org-hierarchy` | `frontend/app/admin/org-hierarchy/page.tsx` | Protected |
| `/admin` | `frontend/app/admin/page.tsx` | Protected |
| `/admin/payroll` | `frontend/app/admin/payroll/page.tsx` | Protected |
| `/admin/permissions` | `frontend/app/admin/permissions/page.tsx` | Protected |
| `/admin/profile` | `frontend/app/admin/profile/page.tsx` | Protected |
| `/admin/reports` | `frontend/app/admin/reports/page.tsx` | Protected |
| `/admin/roles` | `frontend/app/admin/roles/page.tsx` | Protected |
| `/admin/settings` | `frontend/app/admin/settings/page.tsx` | Protected |
| `/admin/shifts` | `frontend/app/admin/shifts/page.tsx` | Protected |
| `/admin/system` | `frontend/app/admin/system/page.tsx` | Protected |
| `/admin/users` | `frontend/app/admin/users/page.tsx` | Protected |
| `/allocations` | `frontend/app/allocations/page.tsx` | Protected |
| `/allocations/summary` | `frontend/app/allocations/summary/page.tsx` | Protected |
| `/analytics/org-health` | `frontend/app/analytics/org-health/page.tsx` | Protected |
| `/analytics` | `frontend/app/analytics/page.tsx` | Protected |
| `/announcements` | `frontend/app/announcements/page.tsx` | Protected |
| `/approvals/inbox` | `frontend/app/approvals/inbox/page.tsx` | Protected |
| `/approvals` | `frontend/app/approvals/page.tsx` | Protected |
| `/assets` | `frontend/app/assets/page.tsx` | Protected |
| `/attendance/comp-off` | `frontend/app/attendance/comp-off/page.tsx` | Protected |
| `/attendance/my-attendance` | `frontend/app/attendance/my-attendance/page.tsx` | Protected |
| `/attendance` | `frontend/app/attendance/page.tsx` | Protected |
| `/attendance/regularization` | `frontend/app/attendance/regularization/page.tsx` | Protected |
| `/attendance/shift-swap` | `frontend/app/attendance/shift-swap/page.tsx` | Protected |
| `/attendance/team` | `frontend/app/attendance/team/page.tsx` | Protected |
| `/auth/change-password` | `frontend/app/auth/change-password/page.tsx` | Protected |
| `/benefits` | `frontend/app/benefits/page.tsx` | Protected |
| `/biometric-devices` | `frontend/app/biometric-devices/page.tsx` | Protected |
| `/calendar/[id]` | `frontend/app/calendar/[id]/page.tsx` | Protected |
| `/calendar/new` | `frontend/app/calendar/new/page.tsx` | Protected |
| `/calendar` | `frontend/app/calendar/page.tsx` | Protected |
| `/company-spotlight` | `frontend/app/company-spotlight/page.tsx` | Protected |
| `/compensation` | `frontend/app/compensation/page.tsx` | Protected |
| `/compliance` | `frontend/app/compliance/page.tsx` | Protected |
| `/contact` | `frontend/app/contact/page.tsx` | Protected |
| `/contracts/[id]` | `frontend/app/contracts/[id]/page.tsx` | Protected |
| `/contracts/new` | `frontend/app/contracts/new/page.tsx` | Protected |
| `/contracts` | `frontend/app/contracts/page.tsx` | Protected |
| `/contracts/templates` | `frontend/app/contracts/templates/page.tsx` | Protected |
| `/dashboard` | `frontend/app/dashboard/page.tsx` | Protected |
| `/dashboards/employee` | `frontend/app/dashboards/employee/page.tsx` | Protected |
| `/dashboards/executive` | `frontend/app/dashboards/executive/page.tsx` | Protected |
| `/dashboards/manager` | `frontend/app/dashboards/manager/page.tsx` | Protected |
| `/departments` | `frontend/app/departments/page.tsx` | Protected |
| `/documents` | `frontend/app/documents/page.tsx` | Protected |
| `/employees/[id]/compensation` | `frontend/app/employees/[id]/compensation/page.tsx` | Protected |
| `/employees/[id]/edit` | `frontend/app/employees/[id]/edit/page.tsx` | Protected |
| `/employees/[id]` | `frontend/app/employees/[id]/page.tsx` | Protected |
| `/employees/change-requests` | `frontend/app/employees/change-requests/page.tsx` | Protected |
| `/employees/directory` | `frontend/app/employees/directory/page.tsx` | Protected |
| `/employees/import` | `frontend/app/employees/import/page.tsx` | Protected |
| `/employees` | `frontend/app/employees/page.tsx` | Protected |
| `/executive` | `frontend/app/executive/page.tsx` | Protected |
| `/expenses/[id]` | `frontend/app/expenses/[id]/page.tsx` | Protected |
| `/expenses/approvals` | `frontend/app/expenses/approvals/page.tsx` | Protected |
| `/expenses/mileage` | `frontend/app/expenses/mileage/page.tsx` | Protected |
| `/expenses` | `frontend/app/expenses/page.tsx` | Protected |
| `/expenses/reports` | `frontend/app/expenses/reports/page.tsx` | Protected |
| `/expenses/settings` | `frontend/app/expenses/settings/page.tsx` | Protected |
| `/features` | `frontend/app/features/page.tsx` | Protected |
| `/fluence` | `frontend/app/fluence/page.tsx` | Protected |
| `/goals` | `frontend/app/goals/page.tsx` | Protected |
| `/helpdesk/knowledge-base` | `frontend/app/helpdesk/knowledge-base/page.tsx` | Protected |
| `/helpdesk` | `frontend/app/helpdesk/page.tsx` | Protected |
| `/helpdesk/sla` | `frontend/app/helpdesk/sla/page.tsx` | Protected |
| `/helpdesk/tickets/[id]` | `frontend/app/helpdesk/tickets/[id]/page.tsx` | Protected |
| `/helpdesk/tickets` | `frontend/app/helpdesk/tickets/page.tsx` | Protected |
| `/holidays` | `frontend/app/holidays/page.tsx` | Protected |
| `/import-export` | `frontend/app/import-export/page.tsx` | Protected |
| `/inbox` | `frontend/app/inbox/page.tsx` | Protected |
| `/integrations` | `frontend/app/integrations/page.tsx` | Protected |
| `/integrations/slack` | `frontend/app/integrations/slack/page.tsx` | Protected |
| `/knowledge` | `frontend/app/knowledge/page.tsx` | Protected |
| `/leave/admin/carry-forward` | `frontend/app/leave/admin/carry-forward/page.tsx` | Protected |
| `/leave/apply` | `frontend/app/leave/apply/page.tsx` | Protected |
| `/leave/approvals` | `frontend/app/leave/approvals/page.tsx` | Protected |
| `/leave/calendar` | `frontend/app/leave/calendar/page.tsx` | Protected |
| `/leave/encashment` | `frontend/app/leave/encashment/page.tsx` | Protected |
| `/leave/my-leaves` | `frontend/app/leave/my-leaves/page.tsx` | Protected |
| `/leave` | `frontend/app/leave/page.tsx` | Protected |
| `/leave/team` | `frontend/app/leave/team/page.tsx` | Protected |
| `/letters` | `frontend/app/letters/page.tsx` | Protected |
| `/letters/templates` | `frontend/app/letters/templates/page.tsx` | Protected |
| `/linkedin-posts` | `frontend/app/linkedin-posts/page.tsx` | Protected |
| `/loans/[id]` | `frontend/app/loans/[id]/page.tsx` | Protected |
| `/loans/new` | `frontend/app/loans/new/page.tsx` | Protected |
| `/loans` | `frontend/app/loans/page.tsx` | Protected |
| `/lwf` | `frontend/app/lwf/page.tsx` | Protected |
| `/me/assets` | `frontend/app/me/assets/page.tsx` | Protected |
| `/me/attendance` | `frontend/app/me/attendance/page.tsx` | Protected |
| `/me/dashboard` | `frontend/app/me/dashboard/page.tsx` | Protected |
| `/me/documents` | `frontend/app/me/documents/page.tsx` | Protected |
| `/me/leaves` | `frontend/app/me/leaves/page.tsx` | Protected |
| `/me/payslips` | `frontend/app/me/payslips/page.tsx` | Protected |
| `/me/profile` | `frontend/app/me/profile/page.tsx` | Protected |
| `/me/skills` | `frontend/app/me/skills/page.tsx` | Protected |
| `/notifications` | `frontend/app/notifications/page.tsx` | Protected |
| `/nu-calendar` | `frontend/app/nu-calendar/page.tsx` | Protected |
| `/nu-drive` | `frontend/app/nu-drive/page.tsx` | Protected |
| `/nu-mail` | `frontend/app/nu-mail/page.tsx` | Protected |
| `/overtime` | `frontend/app/overtime/page.tsx` | Protected |
| `/payments/config` | `frontend/app/payments/config/page.tsx` | Protected |
| `/payments` | `frontend/app/payments/page.tsx` | Protected |
| `/payroll/bulk-processing` | `frontend/app/payroll/bulk-processing/page.tsx` | Protected |
| `/payroll/components` | `frontend/app/payroll/components/page.tsx` | Protected |
| `/payroll` | `frontend/app/payroll/page.tsx` | Protected |
| `/payroll/payslips` | `frontend/app/payroll/payslips/page.tsx` | Protected |
| `/payroll/runs/[id]` | `frontend/app/payroll/runs/[id]/page.tsx` | Protected |
| `/payroll/runs` | `frontend/app/payroll/runs/page.tsx` | Protected |
| `/payroll/salary-structures/create` | `frontend/app/payroll/salary-structures/create/page.tsx` | Protected |
| `/payroll/salary-structures` | `frontend/app/payroll/salary-structures/page.tsx` | Protected |
| `/payroll/statutory` | `frontend/app/payroll/statutory/page.tsx` | Protected |
| `/payroll/structures` | `frontend/app/payroll/structures/page.tsx` | Protected |
| `/predictive-analytics` | `frontend/app/predictive-analytics/page.tsx` | Protected |
| `/pricing` | `frontend/app/pricing/page.tsx` | Protected |
| `/privacy` | `frontend/app/privacy/page.tsx` | Protected |
| `/probation` | `frontend/app/probation/page.tsx` | Protected |
| `/projects/[id]` | `frontend/app/projects/[id]/page.tsx` | Protected |
| `/projects/calendar` | `frontend/app/projects/calendar/page.tsx` | Protected |
| `/projects/gantt` | `frontend/app/projects/gantt/page.tsx` | Protected |
| `/projects` | `frontend/app/projects/page.tsx` | Protected |
| `/projects/psa/invoices` | `frontend/app/projects/psa/invoices/page.tsx` | Protected |
| `/projects/psa` | `frontend/app/projects/psa/page.tsx` | Protected |
| `/projects/psa/timesheets` | `frontend/app/projects/psa/timesheets/page.tsx` | Protected |
| `/projects/resource-conflicts` | `frontend/app/projects/resource-conflicts/page.tsx` | Protected |
| `/reports/attrition` | `frontend/app/reports/attrition/page.tsx` | Protected |
| `/reports/builder` | `frontend/app/reports/builder/page.tsx` | Protected |
| `/reports/headcount` | `frontend/app/reports/headcount/page.tsx` | Protected |
| `/reports/leave` | `frontend/app/reports/leave/page.tsx` | Protected |
| `/reports` | `frontend/app/reports/page.tsx` | Protected |
| `/reports/payroll` | `frontend/app/reports/payroll/page.tsx` | Protected |
| `/reports/performance` | `frontend/app/reports/performance/page.tsx` | Protected |
| `/reports/scheduled` | `frontend/app/reports/scheduled/page.tsx` | Protected |
| `/reports/utilization` | `frontend/app/reports/utilization/page.tsx` | Protected |
| `/reset-password` | `frontend/app/reset-password/page.tsx` | Protected |
| `/resources/approvals` | `frontend/app/resources/approvals/page.tsx` | Protected |
| `/resources/availability` | `frontend/app/resources/availability/page.tsx` | Protected |
| `/resources/capacity` | `frontend/app/resources/capacity/page.tsx` | Protected |
| `/resources` | `frontend/app/resources/page.tsx` | Protected |
| `/resources/pool` | `frontend/app/resources/pool/page.tsx` | Protected |
| `/resources/workload` | `frontend/app/resources/workload/page.tsx` | Protected |
| `/restricted-holidays` | `frontend/app/restricted-holidays/page.tsx` | Protected |
| `/security` | `frontend/app/security/page.tsx` | Protected |
| `/settings/notifications` | `frontend/app/settings/notifications/page.tsx` | Protected |
| `/settings` | `frontend/app/settings/page.tsx` | Protected |
| `/settings/privacy` | `frontend/app/settings/privacy/page.tsx` | Protected |
| `/settings/profile` | `frontend/app/settings/profile/page.tsx` | Protected |
| `/settings/rbac` | `frontend/app/settings/rbac/page.tsx` | Protected |
| `/settings/security/api-keys` | `frontend/app/settings/security/api-keys/page.tsx` | Protected |
| `/settings/security` | `frontend/app/settings/security/page.tsx` | Protected |
| `/settings/sso` | `frontend/app/settings/sso/page.tsx` | Protected |
| `/shifts/definitions` | `frontend/app/shifts/definitions/page.tsx` | Protected |
| `/shifts/my-schedule` | `frontend/app/shifts/my-schedule/page.tsx` | Protected |
| `/shifts` | `frontend/app/shifts/page.tsx` | Protected |
| `/shifts/patterns` | `frontend/app/shifts/patterns/page.tsx` | Protected |
| `/shifts/swaps` | `frontend/app/shifts/swaps/page.tsx` | Protected |
| `/statutory/filings` | `frontend/app/statutory/filings/page.tsx` | Protected |
| `/statutory` | `frontend/app/statutory/page.tsx` | Protected |
| `/tasks` | `frontend/app/tasks/page.tsx` | Protected |
| `/tax/declarations` | `frontend/app/tax/declarations/page.tsx` | Protected |
| `/tax` | `frontend/app/tax/page.tsx` | Protected |
| `/team-directory` | `frontend/app/team-directory/page.tsx` | Protected |
| `/terms` | `frontend/app/terms/page.tsx` | Protected |
| `/time-tracking/[id]/edit` | `frontend/app/time-tracking/[id]/edit/page.tsx` | Protected |
| `/time-tracking/[id]` | `frontend/app/time-tracking/[id]/page.tsx` | Protected |
| `/time-tracking/new` | `frontend/app/time-tracking/new/page.tsx` | Protected |
| `/time-tracking` | `frontend/app/time-tracking/page.tsx` | Protected |
| `/timesheets` | `frontend/app/timesheets/page.tsx` | Protected |
| `/travel/[id]` | `frontend/app/travel/[id]/page.tsx` | Protected |
| `/travel/expenses` | `frontend/app/travel/expenses/page.tsx` | Protected |
| `/travel/new` | `frontend/app/travel/new/page.tsx` | Protected |
| `/travel` | `frontend/app/travel/page.tsx` | Protected |
| `/workflows/[id]` | `frontend/app/workflows/[id]/page.tsx` | Protected |
| `/workflows` | `frontend/app/workflows/page.tsx` | Protected |

### NU-Hire (HIRE — recruitment & onboarding)

| Route | File | Public/Protected |
|-------|------|------------------|
| `/offboarding/[id]/exit-interview` | `frontend/app/offboarding/[id]/exit-interview/page.tsx` | Protected |
| `/offboarding/[id]/fnf` | `frontend/app/offboarding/[id]/fnf/page.tsx` | Protected |
| `/offboarding/[id]` | `frontend/app/offboarding/[id]/page.tsx` | Protected |
| `/offboarding/exit/fnf` | `frontend/app/offboarding/exit/fnf/page.tsx` | Protected |
| `/offboarding/fnf` | `frontend/app/offboarding/fnf/page.tsx` | Protected |
| `/offboarding` | `frontend/app/offboarding/page.tsx` | Protected |
| `/onboarding/[id]` | `frontend/app/onboarding/[id]/page.tsx` | Protected |
| `/onboarding/new` | `frontend/app/onboarding/new/page.tsx` | Protected |
| `/onboarding` | `frontend/app/onboarding/page.tsx` | Protected |
| `/onboarding/templates/[id]` | `frontend/app/onboarding/templates/[id]/page.tsx` | Protected |
| `/onboarding/templates/new` | `frontend/app/onboarding/templates/new/page.tsx` | Protected |
| `/onboarding/templates` | `frontend/app/onboarding/templates/page.tsx` | Protected |
| `/recruitment/[jobId]/kanban` | `frontend/app/recruitment/[jobId]/kanban/page.tsx` | Protected |
| `/recruitment/agencies/[id]` | `frontend/app/recruitment/agencies/[id]/page.tsx` | Protected |
| `/recruitment/agencies` | `frontend/app/recruitment/agencies/page.tsx` | Protected |
| `/recruitment/candidates/[id]/offer` | `frontend/app/recruitment/candidates/[id]/offer/page.tsx` | Protected |
| `/recruitment/candidates/[id]` | `frontend/app/recruitment/candidates/[id]/page.tsx` | Protected |
| `/recruitment/candidates` | `frontend/app/recruitment/candidates/page.tsx` | Protected |
| `/recruitment/career-page` | `frontend/app/recruitment/career-page/page.tsx` | Protected |
| `/recruitment/interviews` | `frontend/app/recruitment/interviews/page.tsx` | Protected |
| `/recruitment/job-boards` | `frontend/app/recruitment/job-boards/page.tsx` | Protected |
| `/recruitment/jobs` | `frontend/app/recruitment/jobs/page.tsx` | Protected |
| `/recruitment/kanban` | `frontend/app/recruitment/kanban/page.tsx` | Protected |
| `/recruitment` | `frontend/app/recruitment/page.tsx` | Protected |
| `/recruitment/pipeline` | `frontend/app/recruitment/pipeline/page.tsx` | Protected |
| `/recruitment/scorecards` | `frontend/app/recruitment/scorecards/page.tsx` | Protected |
| `/referrals` | `frontend/app/referrals/page.tsx` | Protected |

### NU-Grow (GROW — performance, learning & engagement)

| Route | File | Public/Protected |
|-------|------|------------------|
| `/feedback360` | `frontend/app/feedback360/page.tsx` | Protected |
| `/learning/certificates` | `frontend/app/learning/certificates/page.tsx` | Protected |
| `/learning/courses/[id]` | `frontend/app/learning/courses/[id]/page.tsx` | Protected |
| `/learning/courses/[id]/play` | `frontend/app/learning/courses/[id]/play/page.tsx` | Protected |
| `/learning/courses/[id]/quiz/[quizId]` | `frontend/app/learning/courses/[id]/quiz/[quizId]/page.tsx` | Protected |
| `/learning/courses` | `frontend/app/learning/courses/page.tsx` | Protected |
| `/learning` | `frontend/app/learning/page.tsx` | Protected |
| `/learning/paths` | `frontend/app/learning/paths/page.tsx` | Protected |
| `/okr` | `frontend/app/okr/page.tsx` | Protected |
| `/one-on-one` | `frontend/app/one-on-one/page.tsx` | Protected |
| `/performance/360-feedback` | `frontend/app/performance/360-feedback/page.tsx` | Protected |
| `/performance/9box` | `frontend/app/performance/9box/page.tsx` | Protected |
| `/performance/calibration` | `frontend/app/performance/calibration/page.tsx` | Protected |
| `/performance/competency-framework` | `frontend/app/performance/competency-framework/page.tsx` | Protected |
| `/performance/competency-matrix` | `frontend/app/performance/competency-matrix/page.tsx` | Protected |
| `/performance/cycles/[id]/calibration` | `frontend/app/performance/cycles/[id]/calibration/page.tsx` | Protected |
| `/performance/cycles/[id]/nine-box` | `frontend/app/performance/cycles/[id]/nine-box/page.tsx` | Protected |
| `/performance/cycles` | `frontend/app/performance/cycles/page.tsx` | Protected |
| `/performance/feedback` | `frontend/app/performance/feedback/page.tsx` | Protected |
| `/performance/goals` | `frontend/app/performance/goals/page.tsx` | Protected |
| `/performance/okr` | `frontend/app/performance/okr/page.tsx` | Protected |
| `/performance/okrs` | `frontend/app/performance/okrs/page.tsx` | Protected |
| `/performance` | `frontend/app/performance/page.tsx` | Protected |
| `/performance/pip` | `frontend/app/performance/pip/page.tsx` | Protected |
| `/performance/reviews` | `frontend/app/performance/reviews/page.tsx` | Protected |
| `/performance/revolution` | `frontend/app/performance/revolution/page.tsx` | Protected |
| `/recognition` | `frontend/app/recognition/page.tsx` | Protected |
| `/surveys/[id]/analytics` | `frontend/app/surveys/[id]/analytics/page.tsx` | Protected |
| `/surveys/[id]` | `frontend/app/surveys/[id]/page.tsx` | Protected |
| `/surveys/[id]/respond` | `frontend/app/surveys/[id]/respond/page.tsx` | Protected |
| `/surveys` | `frontend/app/surveys/page.tsx` | Protected |
| `/surveys/pulse` | `frontend/app/surveys/pulse/page.tsx` | Protected |
| `/training/catalog/[id]` | `frontend/app/training/catalog/[id]/page.tsx` | Protected |
| `/training/catalog` | `frontend/app/training/catalog/page.tsx` | Protected |
| `/training/my-learning` | `frontend/app/training/my-learning/page.tsx` | Protected |
| `/training` | `frontend/app/training/page.tsx` | Protected |
| `/wellness/admin` | `frontend/app/wellness/admin/page.tsx` | Protected |
| `/wellness` | `frontend/app/wellness/page.tsx` | Protected |

### NU-Fluence (FLUENCE — knowledge & collaboration)

| Route | File | Public/Protected |
|-------|------|------------------|
| `/fluence/analytics` | `frontend/app/fluence/analytics/page.tsx` | Protected |
| `/fluence/blogs/[slug]/edit` | `frontend/app/fluence/blogs/[slug]/edit/page.tsx` | Protected |
| `/fluence/blogs/[slug]` | `frontend/app/fluence/blogs/[slug]/page.tsx` | Protected |
| `/fluence/blogs/new` | `frontend/app/fluence/blogs/new/page.tsx` | Protected |
| `/fluence/blogs` | `frontend/app/fluence/blogs/page.tsx` | Protected |
| `/fluence/dashboard` | `frontend/app/fluence/dashboard/page.tsx` | Protected |
| `/fluence/drive` | `frontend/app/fluence/drive/page.tsx` | Protected |
| `/fluence/my-content` | `frontend/app/fluence/my-content/page.tsx` | Protected |
| `/fluence/search` | `frontend/app/fluence/search/page.tsx` | Protected |
| `/fluence/templates/[id]` | `frontend/app/fluence/templates/[id]/page.tsx` | Protected |
| `/fluence/templates/new` | `frontend/app/fluence/templates/new/page.tsx` | Protected |
| `/fluence/templates` | `frontend/app/fluence/templates/page.tsx` | Protected |
| `/fluence/wall` | `frontend/app/fluence/wall/page.tsx` | Protected |
| `/fluence/wiki/[slug]/edit` | `frontend/app/fluence/wiki/[slug]/edit/page.tsx` | Protected |
| `/fluence/wiki/[slug]` | `frontend/app/fluence/wiki/[slug]/page.tsx` | Protected |
| `/fluence/wiki/new` | `frontend/app/fluence/wiki/new/page.tsx` | Protected |
| `/fluence/wiki` | `frontend/app/fluence/wiki/page.tsx` | Protected |

### Launcher (`app/app/*` — per-app landing pages)

These resolve to HRMS under `getAppForRoute` (no HIRE/GROW/FLUENCE prefix match)
but are the only true nested folder grouping, each with its own `layout.tsx`.

| Route | File | Public/Protected |
|-------|------|------------------|
| `/app/fluence` | `frontend/app/app/fluence/page.tsx` | Protected |
| `/app/grow` | `frontend/app/app/grow/page.tsx` | Protected |
| `/app/hire` | `frontend/app/app/hire/page.tsx` | Protected |
| `/app/hrms` | `frontend/app/app/hrms/page.tsx` | Protected |

## Related Links

- [[Routes]] — curated/representative route map (grouping, dynamic segments, diagram)
- [[Pages]] — layout nesting, AuthGuard, server/client split
- [[Components]] — component inventory and dependency map
- [[APIs]] — backend endpoints these routes consume
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]]
- [[00-Home]]
