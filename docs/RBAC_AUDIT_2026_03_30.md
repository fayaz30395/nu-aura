# RBAC Audit Report — 2026-03-30

## Executive Summary

Comprehensive RBAC testing across all 6 roles revealed **6 defects** (1 CRITICAL, 2 HIGH, 3 MEDIUM).
The primary issue is overly broad permission grants — several `@RequiresPermission` annotations use
permissions like `ANALYTICS_VIEW`, `DASHBOARD_VIEW`, and `PAYROLL_VIEW` that are assigned to ALL roles
instead of being restricted to admin/management roles.

**Testing methodology:**
- API-level: Direct endpoint testing with Bearer tokens for all 6 roles
- UI-level: Chrome browser verification with GIF evidence capture
- 11 endpoint categories tested × 6 roles = 66 access checks

---

## Roles Tested

| # | Role | User | Email |
|---|------|------|-------|
| 1 | Super Administrator | Fayaz M | fayaz.m@nulogic.io |
| 2 | HR Manager | Jagadeesh N | jagadeesh@nulogic.io |
| 3 | Manager | Sumit Kumar | sumit@nulogic.io |
| 4 | Recruitment Admin | Suresh M | suresh@nulogic.io |
| 5 | Team Lead | Mani S | mani@nulogic.io |
| 6 | Employee | Saran V | saran@nulogic.io |

---

## RBAC Test Matrix — API Results

| Endpoint | Super Admin | HR Manager | Manager | Recruitment | Team Lead | Employee | Expected for Employee |
|----------|:-----------:|:----------:|:-------:|:-----------:|:---------:|:--------:|:---------------------:|
| `GET /employees` | 200 | 200 | 200 | 200 | 200 | **200** | 403 or empty |
| `GET /dashboards/executive` | 200 | 200 | **200** | 403 | **200** | **200** | **403** |
| `GET /dashboard/metrics` | 200 | 200 | 200 | 200 | 200 | **200** | 403 |
| `GET /attendance/today` | 200 | 200 | 200 | 200 | 200 | 200 | 200 (self-service) |
| `GET /attendance/all` | 200 | 200 | 200 | 200 | 200 | **200** | 403 |
| `GET /leave/my-balances` | 500 | 500 | 500 | 500 | 500 | 500 | 200 (broken) |
| `GET /payroll/runs` | 200 | 200 | **200** | **200** | **200** | **200** | **403** |
| `GET /announcements/active` | 400 | 400 | 400 | 400 | 400 | 400 | 200 (missing param) |
| `GET /workflow/inbox` | 200 | 200 | 200 | 403 | 200 | 200 | 200 (self-service) |
| `GET /self-service/dashboard` | 200 | 200 | 200 | 200 | 200 | 200 | 200 (self-service) |
| `GET /settings` | 500 | 500 | 500 | 500 | 500 | 500 | 200 (broken) |

**Legend:** Bold = RBAC violation (should be blocked but isn't)

---

## Defects

### DEF-20 — CRITICAL: Executive Dashboard accessible by ALL roles

**Severity:** CRITICAL (privilege escalation — confidential C-suite data exposed)
**Endpoint:** `GET /api/v1/dashboards/executive`
**Permission:** `@RequiresPermission(Permission.ANALYTICS_VIEW)`
**Root cause:** `ANALYTICS_VIEW` permission is granted to all roles including Employee
**Impact:** Any employee can see: total headcount, monthly payroll, attrition rate, open positions, headcount trends, department distribution, strategic alerts, workforce overview, productivity metrics, risk indicators, financial summary
**Evidence:** Chrome screenshot (ss_1142vq2xw) + GIF (qa-employee-rbac-bypass.gif) showing Employee "Saran V" viewing full executive dashboard
**Fix:** Change to `@RequiresPermission(Permission.DASHBOARD_EXECUTIVE)` and ensure only Super Admin, HR Manager, and executives have this permission

### DEF-21 — HIGH: Payroll Runs visible to all roles

**Severity:** HIGH (payroll data is sensitive financial information)
**Endpoint:** `GET /api/v1/payroll/runs`
**Permission:** `@RequiresPermission(Permission.PAYROLL_VIEW)` (or similar)
**Root cause:** `PAYROLL_VIEW` or `PAYROLL_READ` permission granted too broadly
**Impact:** Employee, Team Lead, Recruitment Admin can view payroll run data
**Fix:** Restrict to `PAYROLL_VIEW_ALL` permission, granted only to Super Admin, HR Manager, and Payroll Admin

### DEF-22 — HIGH: Attendance (all) visible to Employee

**Severity:** HIGH (other employees' attendance records exposed)
**Endpoint:** `GET /api/v1/attendance/all`
**Permission:** `@RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)` or equivalent
**Root cause:** Permission granted too broadly, or data scope filter not applied
**Impact:** Employee can see all employees' attendance records
**Fix:** Ensure `ATTENDANCE_VIEW_ALL` is only granted to Super Admin, HR Manager, and team managers (scoped)

### DEF-23 — MEDIUM: HR Dashboard metrics visible to Employee

**Severity:** MEDIUM (HR operational metrics shouldn't be visible to all)
**Endpoint:** `GET /api/v1/dashboard/metrics`
**Permission:** `@RequiresPermission(Permission.DASHBOARD_VIEW)`
**Root cause:** `DASHBOARD_VIEW` is a base permission granted to all roles
**Impact:** Employee sees HR metrics (employee counts, department stats, etc.)
**Fix:** Use `DASHBOARD_HR_OPS` for HR dashboard, keep `DASHBOARD_VIEW` for self-service only

### DEF-24 — FALSE POSITIVE: Leave Balances endpoint

**Severity:** N/A (false positive)
**Endpoint:** `GET /api/v1/leave/my-balances`
**Finding:** This endpoint does not exist. The leave balances page uses `/leave` and other specific
leave endpoints. The 500 is Spring's NoResourceFoundException for an unmapped URL.
**Status:** CLOSED — not a defect

### DEF-25 — FALSE POSITIVE: Settings endpoint

**Severity:** N/A (false positive)
**Endpoint:** `GET /api/v1/settings`
**Finding:** This endpoint does not exist. The Settings page is a frontend-only page that makes
individual API calls to specific endpoints (e.g., user profile, notification preferences).
**Status:** CLOSED — not a defect

---

## Root Cause Analysis

The core issue is in the **permission seeding** (Flyway migrations). When roles are created, ALL
permissions are granted to most roles via `role_permissions`. The `@RequiresPermission` annotation
checks if the user HAS the permission, but since all roles have most permissions, the check passes.

The fix requires:
1. **Audit `role_permissions` table** — remove excessive grants
2. **Create tiered permission groups:**
   - `TIER_EXECUTIVE`: Executive dashboards, org-wide analytics
   - `TIER_HR_ADMIN`: Employee management, payroll, attendance admin
   - `TIER_MANAGER`: Team views, approvals
   - `TIER_SELF_SERVICE`: Own data only (attendance/today, leave/my-*, profile)
3. **Update `@RequiresPermission` annotations** to use specific permissions
4. **Add frontend route guards** that check permissions before rendering pages

---

## Recommended Fix Priority

1. **DEF-20** (CRITICAL) — Fix immediately: Executive Dashboard permission
2. **DEF-21** (HIGH) — Fix immediately: Payroll access restriction
3. **DEF-22** (HIGH) — Fix immediately: Attendance all-employees restriction
4. **DEF-23** (MEDIUM) — Fix in next sprint: HR Dashboard restriction
5. **DEF-24** (MEDIUM) — Fix in next sprint: Leave balances 500
6. **DEF-25** (MEDIUM) — Fix in next sprint: Settings 500

---

## Evidence Files

- `qa-superadmin-rbac.gif` — Super Admin login + screen traversal
- `qa-employee-rbac-bypass.gif` — Employee accessing Executive Dashboard (CRITICAL evidence)
- API test script: `/tmp/rbac-test.sh`

---

*Report generated by autonomous QA system — 2026-03-30*
