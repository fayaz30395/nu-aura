# Sidebar Role Matrix

Generated: 2026-06-19 — Phase 1 of Sidebar Consistency Investigation

## Architecture Overview

NU-AURA renders a contextual sidebar controlled by three mechanisms:

| Mechanism | File | Purpose |
|---|---|---|
| `getAppForRoute(pathname)` | `lib/config/apps.ts` | Derives `appCode` (HRMS/HIRE/GROW/FLUENCE) from URL |
| `APP_SIDEBAR_SECTIONS[appCode]` | `lib/config/apps.ts` | Maps app to section IDs shown in sidebar |
| `autoActiveMenuId` | `components/layout/AppLayout.tsx` | Derives active item ID from current pathname |
| `LEGACY_ID_REMAP` | `components/layout/AppLayout.tsx` | Translates old page-level activeMenuItem overrides |

**Active state mechanism:** `NavPanel` uses `isItemActive(item, activeId)` which matches
`item.id === activeId` — NOT a URL comparison. The `activeId` flows from
`resolvedActiveMenuItem = LEGACY_ID_REMAP[activeMenuItem ?? autoActiveMenuId] ?? raw`.

---

## App → Sidebar Section Mapping

| URL prefix | appCode | Sidebar sections shown |
|---|---|---|
| `/me/*`, `/dashboard*`, `/employees*`, `/leave*`, `/payroll*`, admin routes, etc. | HRMS | home, my-space, people, hr-ops, finance, projects-workspace, reports-analytics, admin |
| `/recruitment*`, `/onboarding*`, `/careers*`, etc. | HIRE | hire-hub |
| `/performance*`, `/okr*`, `/learning*`, `/surveys*`, `/wellness*`, etc. | GROW | grow-hub |
| `/fluence/*` | FLUENCE | fluence-hub |

---

## Role → Section Visibility Matrix

`filterSidebarItems` in AppLayout removes items where `hasPermission(item.requiredPermission)` is false.  
`canSeeAdminSection` gates the entire `admin` section: `SUPER_ADMIN || TENANT_ADMIN || HR_MANAGER`.

| Section | SUPER_ADMIN | TENANT_ADMIN | HR_ADMIN | HR_MANAGER | FINANCE_ADMIN | PAYROLL_ADMIN | RECRUITMENT_ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **home** (HRMS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **my-space** (HRMS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **people** (HRMS) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **hr-ops** (HRMS) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **finance** (HRMS) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **projects-workspace** (HRMS) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **reports-analytics** (HRMS) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **admin** (HRMS) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **hire-hub** (HIRE) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **grow-hub** (GROW) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **fluence-hub** (FLUENCE) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Note: `❌` means the section is filtered out by RBAC. Hire sidebar routes are inaccessible
> to RECRUITMENT_ADMIN via HRMS; they see Hire sidebar only when on `/recruitment/*` routes.

---

## Item Count by Role (HRMS app, code-verified)

| Role | Approx visible items |
|---|---|
| SUPER_ADMIN | 54 (all items across all sections incl. admin) |
| TENANT_ADMIN | ~48 (admin section visible, most items) |
| HR_ADMIN | ~32 (no finance, limited admin) |
| HR_MANAGER | ~38 (admin section via canSeeAdminSection) |
| FINANCE_ADMIN | ~14 (finance section + my-space/home) |
| PAYROLL_ADMIN | ~12 (payroll-focused + my-space/home) |
| RECRUITMENT_ADMIN | 24 (hire sidebar when on /recruitment routes) |
| MANAGER | ~22 (people + projects + hr-ops basics) |
| EMPLOYEE | ~8 (my-space only) |

---

## Grow Hub Items

| Item ID | Label | href | Notes |
|---|---|---|---|
| performance-grow | Performance Hub | /performance | Top-level entry |
| performance-revolution-grow | Revolution | /performance/revolution | Performance review cycles |
| okr-grow | OKR | /performance/okr | |
| one-on-one-grow | 1-on-1 Meetings | /one-on-one | |
| training-grow | Training | /training | |
| learning-grow | Learning (LMS) | /learning | |
| recognition-grow | Recognition | /recognition | |
| surveys-grow | Surveys | /surveys | Has child: surveys-list |
| competency-matrix-grow | Competency Matrix | /performance/competency-matrix | |
| wellness-grow | Wellness | /wellness | Has children: wellness-overview, wellness-admin |

## Hire Hub Items

| Item ID | Label | href |
|---|---|---|
| recruitment | Recruitment | /recruitment |
| onboarding-hire | Onboarding | /onboarding |
| preboarding-hire | Preboarding | /preboarding |
| offboarding-group-hire | Offboarding | /offboarding |
| offer-portal-hire | Offer Portal | /offer-portal |
| careers-hire | Careers | /careers |
| referrals-hire | Referrals | /referrals |

## Fluence Hub Items

| Item ID | Label | href |
|---|---|---|
| fluence-wiki | Wiki | /fluence/wiki |
| fluence-blogs | Articles | /fluence/blogs |
| fluence-my-content | My Content | /fluence/my-content |
| fluence-templates | Templates | /fluence/templates |
| fluence-drive | Drive | /fluence/drive |
| fluence-search | Search | /fluence/search |
| fluence-analytics | Analytics | /fluence/analytics |

---

## Inconsistencies Found (Browser-Verified)

| ID | Route | Expected active item | Actual (pre-fix) | Severity |
|---|---|---|---|---|
| INC-01 | `/fluence/wiki` | `fluence-wiki` highlighted | Nothing highlighted | HIGH |
| INC-02 | `/performance/reviews` | `performance-grow` highlighted | Nothing highlighted | HIGH |
| INC-03 | `/surveys`, `/wellness`, `/learning`, etc. | Respective grow item highlighted | Nothing highlighted | HIGH |
| INC-04 | `/me/dashboard` via "Home" link | "Home" highlighted | "My Dashboard" highlighted (duplicate href) | LOW |

**Root cause of INC-01 to INC-03:** `PATH_TO_MENU_ID` in AppLayout.tsx had zero entries for
NU-Grow and NU-Fluence routes. Grow pages also passed stale `activeMenuItem` values
(e.g. `"performance"`) that didn't match the hub-suffixed item IDs (`"performance-grow"`).

**Root cause of INC-04:** Two sidebar items share the same href `/me/dashboard`.
`PATH_TO_MENU_ID` maps it to `'my-dashboard'`, so `'home'` is never active.
