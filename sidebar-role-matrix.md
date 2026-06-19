# Sidebar Role Matrix — NU-AURA
**Date:** 2026-06-19 | **Method:** Live browser validation (Chrome MCP) + code analysis

## Discovery Summary

| Dimension | Finding |
|---|---|
| Desktop nav items | **NOT uniform by role** — varies from 37–54 depending on permissions resolved from all user roles |
| Mobile nav items | **Hardcoded 5** — same items (Home, Team, Leave, Approvals, Me) for ALL roles, regardless of permissions |
| Active state highlight | **BROKEN on 78 pages** — "Dashboard" highlighted instead of actual page (root cause: missing `activeMenuItem` prop) |
| Collapse state | **Hydration flash** — Zustand rehydrates from localStorage after initial render → visible width jump |
| Route access control | **Correct** — restricted routes redirect to `?denied=1` regardless of sidebar visibility |

---

## Phase 1 — Per-Role Sidebar Data

### SUPER_ADMIN (Fayaz M — fayaz.m@nulogic.io)

| Dimension | Value |
|---|---|
| Desktop nav links | **54** |
| Mobile nav links | 5 (Home, Team, Leave, Approvals, Me) |
| Can access /payroll | ✓ Yes |
| Can access /admin | ✓ Yes |
| Active state on /leave | ✓ "Leave Management" highlighted |

### RECRUITMENT_ADMIN (Suresh M — suresh@nulogic.io)
**Actual roles from API:** `["RECRUITMENT_ADMIN", "REPORTING_MANAGER"]`

| Dimension | Value |
|---|---|
| Desktop nav links | **54** — same as SUPER_ADMIN (ANOMALY) |
| Mobile nav links | 5 (same hardcoded set) |
| Can access /payroll | ✗ → redirected to `/me/dashboard?denied=1` |
| Can access /admin | ✗ → redirected to `/me/dashboard?denied=1` |
| Sidebar still shows Payroll link | ✓ YES (misleading UX) |
| Sidebar still shows System Admin link | ✓ YES (misleading UX) |
| Active state on /me/dashboard | ✓ Correct |

**Issue:** REPORTING_MANAGER role resolves broad permissions that unlock many menu sections. Sidebar shows 54 items even though clicking most of them redirects to "denied". Root cause is permission-seeding breadth of REPORTING_MANAGER (tracked as PERM-ISSUE-001).

### HR_MANAGER (Jagadeesh N — jagadeesh@nulogic.io)
**Actual roles from API:** `["SKIP_LEVEL_MANAGER", "REPORTING_MANAGER", "HR_MANAGER"]`

| Dimension | Value |
|---|---|
| Desktop nav links | **39** |
| Mobile nav links | 5 (same hardcoded set) |
| Active state on /leave | ✓ "Leave Management" highlighted |
| Active state on /overtime | ✓ "Overtime" highlighted |

### EMPLOYEE (Saran V — saran@nulogic.io)
**Actual roles from API:** `["EMPLOYEE", "HR_ADMIN"]`

| Dimension | Value |
|---|---|
| Desktop nav links | **37** |
| Mobile nav links | 5 (same hardcoded set) |

### TENANT_ADMIN | HR_ADMIN | PAYROLL_ADMIN
**Not browser-tested** (session switching limitation during this session). Data from code analysis below.

---

## Phase 2 — Cross-Page Consistency

| Page | Correct Active Highlight | Notes |
|---|---|---|
| /me/dashboard | ✓ "My Dashboard" | `activeMenuItem="my-dashboard"` passed explicitly |
| /leave | ✓ "Leave Management" | `activeMenuItem="leave"` passed explicitly in leave/layout.tsx |
| /overtime | ✓ "Overtime" | `activeMenuItem="overtime"` passed in overtime/page.tsx:318 |
| /contracts | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop — shows WRONG item |
| /admin/budget | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop |
| /admin/audit | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop |
| /expenses/approvals | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop |
| /expenses/mileage | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop |
| /attendance/comp-off | ✗ **"Dashboard" highlighted** | Missing `activeMenuItem` prop |

**Sidebar width:** Consistent 232px (expanded) / 0px (collapsed) across all tested pages. ✓  
**Mobile nav:** Same 5 items regardless of role or current page. Partially correct — items shown are plausible for most roles, but not synchronized with desktop nav sections. ✗

---

## Affected Pages (78 total missing `activeMenuItem`)

Key affected pages without `activeMenuItem` prop:
- `/contracts`, `/contracts/[id]`, `/contracts/new`, `/contracts/templates`
- `/expenses/[id]`, `/expenses/approvals`, `/expenses/mileage`, `/expenses/reports`, `/expenses/settings`
- `/attendance/comp-off`, `/attendance/my-attendance`, `/attendance/shift-swap`
- `/admin/audit`, `/admin/budget`
- `/biometric-devices`, `/compliance`
- `/allocations`, `/allocations/summary`
- `/fluence/analytics`
- And 59 more (run `comm` on all-layouts vs with-active lists)

---

## Role → Visible Menu Items Matrix

| Menu Section | SUPER_ADMIN | RECRUITMENT_ADMIN | HR_MANAGER | EMPLOYEE+HR_ADMIN |
|---|---|---|---|---|
| Home (Home, Dashboard, Executive) | ✓ 3 | ✓ 3 | ✓ 2 | ✓ 2 |
| My Space (profile, payslips, etc.) | ✓ 8 | ✓ 8 | ✓ 8 | ✓ 8 |
| People (employees, depts, etc.) | ✓ 6 | ✓ 6 | ✓ 5 | ✓ 4 |
| HR Ops (attendance, leave, etc.) | ✓ Full | ✓ Full | ✓ Most | ✓ Most |
| Payroll section | ✓ | ✓ (no access) | Partial | Partial |
| Projects/Workspace | ✓ Full | ✓ Full | ✓ Some | ✓ Some |
| Reports/Analytics | ✓ Full | ✓ Full | Partial | Partial |
| Admin section | ✓ Full | ✓ Full (no access) | ✗ Hidden | ✗ Hidden |
| Settings | ✓ | ✓ | ✓ | ✓ |

**Expected** for RECRUITMENT_ADMIN: Admin section hidden, Payroll section hidden, reduced Reports. **Actual** shows both — misleading UX even though API correctly blocks access.
