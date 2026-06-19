# NU-AURA Sidebar Role Matrix
Generated: 2026-06-19

## Summary

The sidebar is driven by a single static registry (`menuSections.tsx`) filtered through three layers:
1. **App scope** — `APP_SIDEBAR_SECTIONS[appCode]` (in `apps.ts`) decides which sections render for the active sub-app (HRMS / HIRE / GROW / FLUENCE).
2. **Admin gate** — section `admin` is additionally gated by `canSeeAdminSection` (SUPER_ADMIN, TENANT_ADMIN, or HR_MANAGER).
3. **Permission gate** — `filterSidebarItems` in `AppLayout.tsx:275` drops any item whose `requiredPermission` the user lacks. SUPER_ADMIN bypasses all permission checks.

**Visibility gating is sound.** No evidence of an RBAC leak: every sensitive item carries a `requiredPermission`, parent rows with children are dropped when all children are filtered out, and the `my-space` self-service section is intentionally ungated (page-level + backend enforce data scoping).

**The real defect is the *active-highlight* layer, not visibility.** Two hardcoded `activeMenuItem` values (`company-spotlight`, `linkedin-posts`) point at no existing menu ID and are absent from both `LEGACY_ID_REMAP` and `PATH_TO_MENU_ID`, so those pages highlight the fallback (`my-dashboard`). A handful of pages also pass a section ID (`finance`) that never matches a `NavRow` item. This is cosmetic (wrong/blank highlight) and affects all roles equally — it is not a permission problem.

## Role Visibility Matrix

Roles map to sections via permissions. Because permission→role assignment lives in the backend (DB + Redis), the columns below are derived from the `requiredPermission` on each section's items and the documented role model.

| Role | Visible Sections (HRMS app) | Correctly Gated | Permission Issues |
|------|------------------------------|-----------------|-------------------|
| SUPER_ADMIN | All 8 HRMS sections + all hub sections (HIRE/GROW/FLUENCE) | Yes — bypasses `filterSidebarItems` by design (`isSuperAdmin`) | None |
| TENANT_ADMIN | home, my-space, people, hr-ops, finance, projects-workspace, reports-analytics, admin (subject to per-item perms) | Yes — `admin` section allowed via `canSeeAdminSection` | None structural. Effective items still depend on granted perms |
| HR_ADMIN | home, my-space, people, hr-ops, finance (most), projects-workspace, reports-analytics | Yes — `admin` section hidden (HR_ADMIN not in `canSeeAdminSection`) | **Review:** `admin` section is gated to SUPER_ADMIN/TENANT_ADMIN/HR_MANAGER but NOT HR_ADMIN. If HR_ADMIN is expected to manage roles/holidays/leave-types, the section header is hidden even though item-level perms may pass. See FIX note in proposal. |
| HR_MANAGER | home, my-space, people, hr-ops, finance (scoped), reports-analytics, admin | Yes — included in `canSeeAdminSection` | None structural |
| EMPLOYEE | home (Home only), my-space (all), plus any item whose perm they hold (e.g. leave `My Leaves`, expenses `My Expenses`, payroll `Payslips`) | Yes — admin/finance-admin items filtered out; self-service surfaces only | None — self-service items intentionally ungated, data scoped server-side |
| RECRUITMENT_ADMIN | home, my-space, **hire-hub** (when on HIRE app) | Yes — recruitment items gated by `RECRUITMENT_*` / `CANDIDATE_*` perms | None. HRMS sections appear only if they also hold HR perms |
| PAYROLL_ADMIN | home, my-space, finance (payroll, compensation, statutory, tax) | Yes — gated by `PAYROLL_*`, `TAX_*`, `STATUTORY_*` | None structural |

> Note: `canSeeAdminSection` (AppLayout.tsx:130) = SUPER_ADMIN || TENANT_ADMIN || HR_MANAGER. HR_ADMIN is deliberately excluded. This is the only role-gating decision worth a product confirmation; it is not a security leak (HR_ADMIN simply doesn't see the Admin section header).

## PATH_TO_MENU_ID Coverage

All entries below are taken from `AppLayout.tsx:328–432`. "ID Exists?" checks against `menuSections.tsx`.

| Route Pattern | Mapped Menu ID | ID Exists? | Correct? |
|---------------|----------------|-----------|----------|
| /me/dashboard | my-dashboard | Yes | Yes |
| /me/profile | profile | Yes | Yes |
| /me/payslips | payslips | Yes | Yes |
| /me/attendance | my-attendance | Yes | Yes |
| /me/leaves | leaves | Yes | Yes |
| /me/documents | my-documents | Yes | Yes |
| /me/skills | my-skills | Yes | Yes |
| /me/assets | my-assets | Yes | Yes |
| /dashboards/executive | executive-dashboard | Yes | Yes |
| /dashboard | dashboard | Yes | Yes |
| /employees/directory | team-directory | Yes | Yes |
| /employees | employees | Yes | Yes |
| /departments | departments | Yes | Yes |
| /admin/org-hierarchy | org-chart | Yes | Yes (org-chart item points here) |
| /announcements | announcements | Yes | Yes |
| /approvals | approvals | Yes | Yes (item href is /approvals/inbox; prefix matches) |
| /attendance | attendance | Yes | Yes |
| /shifts | shift-management | Yes | Yes |
| /leave | leave | Yes | Yes |
| /overtime | overtime | Yes | Yes |
| /probation | probation | Yes | Yes |
| /assets | assets | Yes | Yes |
| /letters/templates | letter-templates | Yes | Yes |
| /letters | letters | Yes | Yes |
| /contracts | contracts | Yes | Yes |
| /payroll | payroll | Yes | Yes |
| /compensation | compensation | Yes | Yes |
| /benefits | benefits | Yes | Yes |
| /expenses | expenses | Yes | Yes |
| /loans | loans | Yes | Yes |
| /travel | travel | Yes | Yes |
| /statutory | statutory | Yes | Yes |
| /tax | tax | Yes | Yes |
| /tasks | my-tasks | Yes | Yes |
| /projects/psa/invoices | psa-invoices | Yes | Yes |
| /projects/psa/timesheets | psa-timesheets | Yes | Yes |
| /projects/psa | psa-projects | Yes | Yes |
| /projects | projects | Yes | Yes |
| /resources | resources | Yes | Yes |
| /timesheets | timesheets | Yes | Yes |
| /time-tracking | time-tracking | Yes | Yes |
| /nu-calendar | nu-calendar | Yes | Yes |
| /nu-drive | nu-drive | Yes | Yes |
| /nu-mail | nu-mail | Yes | Yes |
| /analytics/org-health | org-health | Yes | Yes |
| /analytics | analytics | Yes | Yes |
| /predictive-analytics | predictive-analytics | Yes | Yes |
| /reports | reports | Yes | Yes |
| /admin/budget | budget-planning | Yes | Yes |
| /admin/audit | admin-audit | Yes | Yes |
| /admin/roles | admin-roles | Yes | Yes |
| /admin/permissions | admin-permissions | Yes | Yes |
| /admin/holidays | holidays | Yes | Yes |
| /admin/leave-types | leave-types | Yes | Yes |
| /admin/integrations | integrations | Yes | Yes |
| /admin | admin-page | Yes | Yes |
| /workflows | workflows | Yes | Yes |
| /import-export | import-export | Yes | Yes |
| /helpdesk | helpdesk-tickets | Yes | Yes |
| /settings | settings | Yes | Yes |
| /biometric-devices | biometric-devices | **No** | **No menu item with this ID exists.** Harmless (the page falls through to no highlight) but the entry is dead. |
| /compliance | compliance | **No** | Dead entry — no `compliance` menu item. |
| /allocations | allocations | **No** | Dead entry — no `allocations` menu item. |
| /recruitment | recruitment | Yes | Yes |
| /onboarding | onboarding-hire | Yes | Yes |
| /preboarding | preboarding-hire | Yes | Yes |
| /offboarding | offboarding-group-hire | Yes | Yes |
| /offer-portal | offer-portal-hire | Yes | Yes |
| /careers | careers-hire | Yes | Yes |
| /referrals | referrals-hire | Yes | Yes |
| /performance/competency-matrix | competency-matrix-grow | Yes | Yes |
| /performance/okr | okr-grow | Yes | Yes |
| /performance/revolution | performance-revolution-grow | Yes | Yes |
| /performance | performance-grow | Yes | Yes |
| /okr | okr-grow | Yes | Yes |
| /one-on-one | one-on-one-grow | Yes | Yes |
| /training | training-grow | Yes | Yes |
| /learning | learning-grow | Yes | Yes |
| /recognition | recognition-grow | Yes | Yes |
| /surveys | surveys-grow | Yes | Yes |
| /wellness | wellness-grow | Yes | Yes |
| /feedback360 | performance-grow | Yes | Suboptimal — points to `performance-grow` not `feedback360-grow`. Minor. |
| /fluence/analytics | fluence-analytics | Yes | Yes |
| /fluence/search | fluence-search | Yes | Yes |
| /fluence/drive | fluence-drive | Yes | Yes |
| /fluence/templates | fluence-templates | Yes | Yes |
| /fluence/my-content | fluence-my-content | Yes | Yes |
| /fluence/blogs | fluence-blogs | Yes | Yes |
| /fluence/wall | fluence-wiki | Yes | Acceptable (no wall menu item; wiki is the closest) |
| /fluence/wiki | fluence-wiki | Yes | Yes |
| /fluence/dashboard | fluence-wiki | Yes | Acceptable |
| /fluence | fluence-wiki | Yes | Yes |

## Missing PATH_TO_MENU_ID Entries

Real top-level routes (verified via `find app -maxdepth 1 -type d`) that have NO entry in `PATH_TO_MENU_ID` and no per-page `activeMenuItem` that maps cleanly, so they highlight the fallback `my-dashboard`:

| Route | Has menu item? | Current highlight | Should highlight |
|-------|----------------|-------------------|------------------|
| /company-spotlight | No menu item exists | `my-dashboard` (fallback) | Nothing, or a dedicated item — **page passes `activeMenuItem="company-spotlight"` which is a non-existent ID** |
| /linkedin-posts | No menu item exists | `my-dashboard` (fallback) | Nothing — **page passes `activeMenuItem="linkedin-posts"`, a non-existent ID** |
| /goals | No mapping | `my-dashboard` | `performance-goals` (child) — no top-level highlight today |
| /documents | No mapping (distinct from /me/documents) | `my-dashboard` | `my-documents` or none |
| /executive | No mapping | `my-dashboard` | `executive-dashboard` |
| /knowledge | No mapping | `my-dashboard` | a fluence item or none |
| /notifications, /inbox, /security, /restricted-holidays, /lwf | No mapping | `my-dashboard` | none / closest item |

> The `PATH_TO_MENU_ID` table covers every section's *primary* route. The gaps above are secondary/utility pages. The two that actively misbehave (pass an invalid hardcoded ID) are `company-spotlight` and `linkedin-posts`.

## apps.ts Route Coverage

| Product | Routes in routePrefixes | Missing / Notable |
|---------|--------------------------|-------------------|
| HRMS | /me, /dashboard, /dashboards, /employees, /departments, /attendance, /leave, /payroll, /compensation, /benefits, /expenses, /loans, /travel, /assets, /letters, /letter-templates, /statutory, /lwf, /tax, /helpdesk, /approvals, /announcements, /org-chart, /organization-chart, /timesheets, /time-tracking, /projects, /resources, /allocations, /calendar, /nu-calendar, /nu-drive, /nu-mail, /overtime, /probation, /restricted-holidays, /biometric-devices, /shifts, /statutory-filings, /reports, /analytics, /predictive-analytics, /import-export, /settings, /admin, /workflows | **Missing:** `/contracts`, `/company-spotlight`, `/linkedin-posts`, `/goals`, `/documents`, `/executive`, `/compliance`, `/team-directory`. These resolve to HRMS only because `getAppForRoute` defaults to HRMS — fine for HRMS pages, but `/contracts` (a real HRMS page) is not explicitly listed. Default-fallback covers them, so no broken behavior, but the list is incomplete vs. the actual route tree. |
| HIRE | /recruitment, /onboarding, /preboarding, /offboarding, /offer-portal, /careers, /referrals | Complete. |
| GROW | /performance, /okr, /feedback360, /training, /learning, /recognition, /surveys, /wellness, /one-on-one | Complete. |
| FLUENCE | /fluence (+ all /fluence/* subpaths) | Complete. `/fluence` was added in commit 1bf35bcc (**done**). The extra explicit subpaths are redundant since `/fluence` prefix-matches them all, but harmless. |

## Sidebar Width Consistency

Widths are token-/class-consistent across the shell:

- Product rail: `w-[72px]` (`ProductRail.tsx:81`)
- Nav panel (desktop): `w-[232px]`, collapses to `w-0` (`NavPanel.tsx:152`)
- Mobile drawer: `w-72` (`AppLayout.tsx:535`)
- User menu dropdown: `w-56` (`UserMenu.tsx:89`) — unrelated to nav width

No inconsistency. Desktop nav and mobile drawer intentionally differ (232px contextual panel vs. 288px full drawer). No stray `w-64`/`w-60` sidebar definitions.

## Mobile Nav Analysis

`MobileBottomNav.tsx` is **role-unaware but app-aware**. The item set is built in `AppLayout.tsx:452` (`mobileNavItems`) keyed by `appCode` (HRMS/HIRE/GROW/FLUENCE) — so it switches per sub-app and carries the live approval badge. However:

- The per-app item lists are **hardcoded** (e.g. HRMS shows Home/Team/Leave/Approvals/Me) and do **not** filter by permission. An EMPLOYEE on HRMS still sees "Team" (`/employees`) and "Approvals" (`/approvals`) in the bottom bar even if they lack `EMPLOYEE_VIEW_ALL` / `WORKFLOW_VIEW`.
- This is a **soft RBAC gap on mobile only**: tapping the link still hits the route, which is server-gated and will redirect with `?denied=1`. So it's a UX wart (dead-looking links), not a data leak.
- The component's own `defaultNavItems` fallback points `Home → /dashboard`, but the HRMS config overrides Home to `/me/dashboard`. Consistent in practice.

Recommendation (low priority): filter `mobileNavItems` through the same `hasPermission` check, or restrict the mobile bar to always-safe self-service routes.

## Hydration/SSR Issues

`AppLayout.tsx` handles the one real SSR risk correctly:

- `isMounted` gate (`AppLayout.tsx:169–174`): sidebar renders **expanded** (`collapsed=false`) on the server and on first client paint, then reads the persisted Zustand `sidebarCollapsed` after mount. This prevents a width-flash / hydration mismatch from localStorage rehydration. Correct pattern.
- `usePathname()`-derived `autoActiveMenuId` is deterministic on server and client (no `Date`, no random, no `window`), so active-state computes identically in SSR and CSR — no mismatch.
- `MantineThemeProvider.tsx:33` uses `suppressHydrationWarning` to isolate Mantine's CSS-var `<style>` injection — appropriate, scoped to that wrapper.

No hydration defects found in the sidebar path.
