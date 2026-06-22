# Phase 0 — Discovery & Inventories

## 1. Route inventory
- **84 navigable top-level segments** under `app/`; **no `(parenthesized)` route groups** — flat named segments only.
- Auth/middleware: edge check in **`proxy.ts`** (not `middleware.ts`) on `access_token` / `__Host-hrms-access` cookies → redirect `/auth/login`; fine-grained RBAC client-side via Zustand `useAuth` (`lib/hooks/useAuth.ts`, sessionStorage key `nu-aura-user`).

## 2. Page inventory (289 `page.tsx`)
| Sub-app | ~Pages | Landing |
|---|---|---|
| NU-HRMS | ~205 | `app/app/hrms/page.tsx` |
| NU-Grow | ~29 | `app/app/grow/page.tsx` |
| NU-Fluence | 19 | `app/app/fluence/page.tsx` |
| NU-Hire | ~16 | `app/app/hire/page.tsx` |
| Launcher + public/auth | ~22 | — |

### Altitude classification
**Employee-facing (elevation targets):** `/me/*` (dashboard, profile, leaves, attendance, payslips, assets, skills, documents), `employees/directory`, `team-directory`, `leave/apply`+`my-leaves`, `attendance/my-attendance`, `shifts/my-schedule`, `fluence/wall|wiki|blogs`, `recognition`, `wellness`, `goals`, `okr`, `feedback360`, `notifications`, personal `settings/*`, `loans`, `expenses` (own), `travel`, `time-tracking`, `tax/declarations`, `payroll/payslips`.

**Operator/admin-facing (stay dense — excluded):** all `/admin/*` (27), ops `/dashboard` (gated `DASHBOARD_VIEW`), `/dashboards/executive|manager`, `/employees` roster + `[id]/edit` + `[id]/compensation`, `/payroll/*`, `/reports/*` (8), `/recruitment/*` ATS, `/performance/*`, `/onboarding|offboarding/*`, `/settings/rbac|sso`, `/statutory`, `/biometric-devices`, `/import-export`, `/integrations`, `/workflows`, `/security`.

### Key target screens
| Screen | Path | Lines |
|---|---|---|
| Employee Directory | `app/employees/directory/page.tsx` | 885 |
| Team Directory (2nd variant) | `app/team-directory/page.tsx` | — |
| Profile — View | `app/employees/[id]/page.tsx` | 1244 |
| Profile — Edit | `app/employees/[id]/edit/page.tsx` | 1261 |
| Profile — Compensation | `app/employees/[id]/compensation/page.tsx` | 545 |
| Dashboard (ops) | `app/dashboard/page.tsx` | 1498 |
| Self-service dashboard | `app/me/dashboard/page.tsx` | 484 |

> `/dashboard` redirects users without `DASHBOARD_VIEW` to `/me/dashboard` (l.163–164) — so **`/me/dashboard` is the prime employee altitude target.**

## 3. Shared-component inventory
Directories: `components/ui/` (primitives), `components/layout/` (shell/header/nav/breadcrumbs), `components/charts/`, `components/motion/`, `components/dashboard/`, `components/errors/`.
Key primitives: `Card` (`Card.tsx`), `Stat` + legacy `StatCard`, `Skeleton.tsx` (11 skeletons) **and** `Loading.tsx` (overlapping symbols), `Spinner.tsx`/`PremiumSpinner.tsx`, `EmptyState` + `empty-state-presets.tsx` (11 presets), `StatusBadge`/`Badge`, `EmployeeAvatar` (`app/employees/_components/EmployeeAvatar.tsx`), `ResponsiveTable` + `TableFilterBar`, `Button`, `Modal`, `ExportMenu`, `ConfirmDialog`. **No shared `PageHeader` and no shared `ProfileHero`.**

## 4. Design-token inventory
Source of truth: **`globals.css` CSS vars** → aliased by `mantine-theme.ts`, `tailwind.config.js`, wrapped by `design-system.ts`; canonical spec `DESIGN.md`.
Extensible surface hooks (elevation rides these): `.card-aura`, `.card-elevated`, `.card-interactive`, `.shell-panel`, `.panel-inset`, `--shadow-sm/md/lg`, three-tier Mantine Card/Paper/Modal. Dark mode = FOUC script → Zustand store → Mantine `forceColorScheme`, class-driven `.dark`.
Drift (record-only): accent `#2563EB` stale vs canonical `#2952A3` (`theme-colors.ts:20`, `categoricalPalette.ts`); control radius 10px (`DESIGN.md`) vs 12px (`globals.css`); `surface-*` Tailwind classes bypass tokens in `ResponsiveTable.tsx`, `EmployeeSearchAutocomplete.tsx`.

## 5. Dashboard-widget inventory
`app/dashboard/page.tsx` — 7 inline widgets via `DashboardGrid`: attendance-overview (l.600), quick-actions (l.644), department-distribution (l.677, conditional), payroll-summary (l.718, ADMIN), upcoming-events (l.754), notifications (l.804), new-joiners (l.893, non-EMPLOYEE). Plus KPI row ×4 (l.978), AreaChart+Donut (l.1065), attendance strip (l.1153), 3 modals (l.1254/1381/1440). Full maps in `06-dashboard-architecture.md`.

## 6. Profile-component inventory + dependency maps
**No shared `ProfileHero`** — 3 hand-rolled:
| Element | View `[id]/page.tsx:415–470` | Edit `edit/page.tsx:414–428` | Comp `compensation/page.tsx:355–374` |
|---|---|---|---|
| Avatar | `<Image>` photo + `AvatarInitials` fallback | inline initials, **no photo** | **none** |
| Status badge | ✓ | ✗ | ✗ |
| Designation | ✓ | ✗ | ✗ |
| Background | dark gradient banner | light `card-aura` | plain text |

Dependency maps (Page → Components → Hooks → APIs → Permissions):
- **View** `[id]/page.tsx`: `useEmployee(id)`→`GET /employees/{id}`, `useDottedLineReports`, `useSubordinates`, `useAssetsByEmployee`, `useGetEmployeeSkills`, `useVerifySkill`, `useDeleteEmployee`. Gates: view `VIEW_ALL|VIEW_DEPARTMENT|VIEW_TEAM` or self (l.202–209); Edit `EMPLOYEE_UPDATE` (l.396); Delete `EMPLOYEE_DELETE` (l.406); Bank `EMPLOYEE_BANK_READ` (l.787). File-local helpers `AvatarInitials`/`InfoField`/`SectionCard`.
- **Edit** `edit/page.tsx`: `useEmployee`, `useManagers`, `useActiveDepartments`, `useUpdateEmployee`→`PUT /employees/{id}`, `employmentChangeRequestService.createChangeRequest`→`POST /employment-change-requests`. Gate `EMPLOYEE_UPDATE` (l.84–87, render-gate l.288).
- **Compensation** `compensation/page.tsx`: `useEmployee`, `useEmployeeRevisionHistory(id)`→`GET /compensation/revisions/employee/{id}`, `useCreateRevision`→`POST /compensation/revisions`. Page gate `COMPENSATION_VIEW|MANAGE|VIEW_ALL` (l.271–281). ⚠️ **"New Revision" button (l.366) has NO permission gate** → see `08-rbac-impact-report.md`.

## 7. Employee-directory-component inventory + dependency maps
- **`app/employees/directory/page.tsx`** (885, monolith, no child components): `useQuery(['departments','all'])`→`GET /departments`; `useQuery(['employees','directory',filters])`→`POST /employees/directory/search`. Gate `EMPLOYEE_VIEW_ALL|VIEW_TEAM` (l.136) → redirect `/dashboard`. Default **grid** view; toggle is `useState` only (**not URL/persisted**); `profileImageUrl` on interface (l.51) but **never rendered** (initials via `getInitials`/`getRandomColor`). DIY empty state (l.726).
- **`app/employees/page.tsx`** (admin list): `useEmployees`, `useManagers`, `useActiveDepartments`, `useCreateEmployee`, `useDeleteEmployee`. Uses proper `EmployeeAvatar` (supports `profilePhotoUrl`) + `ProfileSheet` slide-over. Table-only. Gates `EMPLOYEE_READ` (l.246), `EMPLOYEE_CREATE` (l.408/418), `EMPLOYEE_DELETE` (l.597).
- **Two backends:** directory `POST /employees/directory/search` vs admin `GET /employees`.
