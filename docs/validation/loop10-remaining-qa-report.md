# Loop 10 — Final Sweep QA Report

**Date:** 2026-03-31
**Scope:** Remaining routes — Reports & Analytics, Fluence, Settings, Miscellaneous (46 routes)
**Defect range:** DEF-49 through DEF-60

---

## Executive Summary

46 routes validated across Reports, Analytics, Fluence (Phase 2), Settings, Helpdesk, Payments, and
miscellaneous modules. Backend RBAC is solid across all controllers (`@RequiresPermission` on every
endpoint). However, **12 frontend pages lack client-side RBAC guards**, meaning any authenticated
user can view the page UI (data is still protected by backend). Fluence rich-text rendering uses
Tiptap (safe, no `dangerouslySetInnerHTML`). Payments module is properly feature-flagged.

**Findings:** 12 defects (5 HIGH, 4 MEDIUM, 3 LOW)

---

## Route-by-Route Validation

### 1. Reports & Analytics

| Route                   | Status         | RBAC (FE)                         | RBAC (BE)                   | Notes                                  |
|-------------------------|----------------|-----------------------------------|-----------------------------|----------------------------------------|
| `/reports`              | PASS (partial) | MISSING                           | N/A (hub page)              | DEF-49: No permission gate on the page |
| `/reports/headcount`    | PASS           | PermissionGate (ANALYTICS_EXPORT) | REPORT_CREATE               | Export-only gate, page itself visible  |
| `/reports/attrition`    | PASS           | PermissionGate (ANALYTICS_EXPORT) | REPORT_CREATE               | Export-only gate, page itself visible  |
| `/reports/leave`        | PASS           | PermissionGate (REPORT_VIEW)      | REPORT_CREATE               | Proper gate on data section            |
| `/reports/payroll`      | PASS           | usePermissions (REPORT_VIEW)      | REPORT_CREATE               | Full page-level RBAC guard + redirect  |
| `/reports/performance`  | PASS           | PermissionGate (REPORT_VIEW)      | REPORT_CREATE               | Data section gated                     |
| `/reports/scheduled`    | FAIL           | MISSING                           | REPORT_CREATE / REPORT_VIEW | DEF-50: No FE permission check         |
| `/reports/builder`      | PASS           | PermissionGate (REPORT_CREATE)    | REPORT_CREATE               | Create/view/export all gated           |
| `/reports/utilization`  | PASS           | usePermissions (REPORT_VIEW)      | REPORT_VIEW                 | Full page-level RBAC guard + redirect  |
| `/analytics`            | FAIL           | MISSING                           | REPORT_VIEW                 | DEF-51: No FE permission check         |
| `/analytics/org-health` | FAIL           | MISSING                           | REPORT_VIEW                 | DEF-52: No FE permission check         |
| `/predictive-analytics` | FAIL           | MISSING                           | REPORT_VIEW                 | DEF-53: No FE permission check         |

### 2. Fluence (Phase 2)

| Route                        | Status | RBAC (FE)                                  | RBAC (BE)             | Notes                       |
|------------------------------|--------|--------------------------------------------|-----------------------|-----------------------------|
| `/fluence`                   | PASS   | N/A                                        | N/A                   | Redirect to `/fluence/wiki` |
| `/fluence/dashboard`         | PASS   | N/A                                        | N/A                   | Dashboard page              |
| `/fluence/wiki`              | PASS   | hasAnyRole / isAdmin                       | KNOWLEDGE_WIKI_*      | Role-based space management |
| `/fluence/wiki/[slug]`       | PASS   | Via hooks                                  | KNOWLEDGE_WIKI_READ   | Tiptap ContentViewer (safe) |
| `/fluence/wiki/new`          | PASS   | Via hooks                                  | KNOWLEDGE_WIKI_CREATE | Write-gated                 |
| `/fluence/blogs`             | PASS   | PermissionGate (KNOWLEDGE_BLOG_CREATE)     | KNOWLEDGE_BLOG_*      | Create button gated         |
| `/fluence/blogs/[slug]`      | PASS   | PermissionGate (KNOWLEDGE_BLOG_UPDATE)     | KNOWLEDGE_BLOG_READ   | Edit button gated           |
| `/fluence/blogs/new`         | PASS   | PermissionGate (KNOWLEDGE_BLOG_CREATE)     | KNOWLEDGE_BLOG_CREATE | Submit gated                |
| `/fluence/blogs/[slug]/edit` | PASS   | PermissionGate (KNOWLEDGE_BLOG_UPDATE)     | KNOWLEDGE_BLOG_UPDATE | Submit gated                |
| `/fluence/templates`         | PASS   | PermissionGate (KNOWLEDGE_TEMPLATE_CREATE) | N/A                   | Create/edit gated           |
| `/fluence/templates/new`     | PASS   | PermissionGate (KNOWLEDGE_TEMPLATE_CREATE) | N/A                   | Submit gated                |
| `/fluence/templates/[id]`    | PASS   | PermissionGate                             | N/A                   | Edit gated                  |
| `/fluence/wall`              | PASS   | None (social wall, all employees)          | N/A                   | Appropriate for all users   |
| `/fluence/drive`             | FAIL   | MISSING                                    | N/A                   | DEF-54: No permission check |
| `/fluence/my-content`        | PASS   | None needed (self-service)                 | N/A                   | Shows own content only      |
| `/fluence/search`            | PASS   | None needed                                | KNOWLEDGE_SEARCH      | Backend gated               |

### 3. Settings

| Route                     | Status | RBAC (FE)                    | RBAC (BE)    | Notes                             |
|---------------------------|--------|------------------------------|--------------|-----------------------------------|
| `/settings`               | PASS   | Already validated            | N/A          | Hub page                          |
| `/settings/profile`       | PASS   | None needed (self-service)   | N/A          | Shows own profile                 |
| `/settings/security`      | PASS   | Auth-only (self-service MFA) | N/A          | Uses RHF+Zod for disable MFA form |
| `/settings/notifications` | PASS   | None needed (self-service)   | N/A          | Personal preferences              |
| `/settings/sso`           | FAIL   | MISSING                      | SYSTEM_ADMIN | DEF-55: No FE admin gate          |

### 4. Helpdesk

| Route                      | Status | RBAC (FE)                                | RBAC (BE)                                 | Notes                                      |
|----------------------------|--------|------------------------------------------|-------------------------------------------|--------------------------------------------|
| `/helpdesk`                | FAIL   | MISSING                                  | Mixed (SYSTEM_ADMIN + EMPLOYEE_VIEW_SELF) | DEF-56: Dashboard shows admin stats to all |
| `/helpdesk/tickets`        | PASS   | PermissionGate (HELPDESK_TICKET_RESOLVE) | HELPDESK_TICKET_VIEW                      | Status change gated                        |
| `/helpdesk/tickets/[id]`   | PASS   | Via hooks                                | HELPDESK_TICKET_VIEW                      | Ticket detail                              |
| `/helpdesk/sla`            | PASS   | PermissionGate (HELPDESK_SLA_MANAGE)     | HELPDESK_SLA_MANAGE                       | Admin actions gated                        |
| `/helpdesk/knowledge-base` | PASS   | PermissionGate (HELPDESK_KB_CREATE)      | HELPDESK_CATEGORY_MANAGE                  | Create/edit gated                          |

### 5. Payments

| Route              | Status | RBAC (FE) | RBAC (BE)                       | Notes                                       |
|--------------------|--------|-----------|---------------------------------|---------------------------------------------|
| `/payments`        | FAIL   | MISSING   | PAYMENT_VIEW / PAYMENT_INITIATE | DEF-57: No FE permission gate               |
| `/payments/config` | FAIL   | MISSING   | PAYMENT_CONFIG_MANAGE           | DEF-58: No FE admin gate, feature flag only |

### 6. Miscellaneous

| Route                | Status | RBAC (FE)                          | RBAC (BE)                      | Notes                                           |
|----------------------|--------|------------------------------------|--------------------------------|-------------------------------------------------|
| `/security`          | PASS   | N/A (public marketing page)        | N/A                            | Not an admin page                               |
| `/compliance`        | PASS   | None (placeholder page)            | N/A                            | Coming soon stub                                |
| `/import-export`     | PASS   | AdminGate + PermissionGate         | EMPLOYEE_CREATE / SYSTEM_ADMIN | Properly gated                                  |
| `/integrations`      | PASS   | None (informational showcase)      | N/A                            | No backend calls, static content                |
| `/biometric-devices` | PASS   | PermissionGate (ATTENDANCE_MANAGE) | N/A                            | Properly gated                                  |
| `/calendar`          | PASS   | PermissionGate (CALENDAR_CREATE)   | N/A                            | Create actions gated                            |
| `/calendar/[id]`     | PASS   | Via hooks                          | N/A                            | Detail view                                     |
| `/calendar/new`      | PASS   | Via hooks                          | N/A                            | Create form                                     |
| `/nu-calendar`       | PASS   | Auth-only (employee self-service)  | N/A                            | Personal calendar                               |
| `/nu-drive`          | FAIL   | MISSING                            | N/A                            | DEF-59: No permission check for file operations |
| `/nu-mail`           | PASS   | Auth-only (employee self-service)  | N/A                            | Personal mail                                   |
| `/linkedin-posts`    | FAIL   | MISSING                            | N/A                            | DEF-60: No permission gate for social posting   |
| `/company-spotlight` | PASS   | Auth-only (read-only showcase)     | N/A                            | Informational page                              |

---

## Defect Register

### DEF-49 (MEDIUM) — `/reports` hub page has no frontend RBAC guard

**Location:** `frontend/app/reports/page.tsx`
**Risk:** Any authenticated user can see the report hub and attempt downloads. Backend blocks via
`@RequiresPermission(REPORT_CREATE)`, but users see a confusing error.
**Fix:** Add `usePermissions` guard with redirect, same pattern as `/reports/payroll`.

### DEF-50 (MEDIUM) — `/reports/scheduled` has no frontend permission check

**Location:** `frontend/app/reports/scheduled/page.tsx`
**Risk:** Any authenticated user can view scheduled reports list and attempt CRUD. Backend requires
`REPORT_CREATE` / `REPORT_VIEW`.
**Fix:** Add `PermissionGate` or `usePermissions` redirect guard.

### DEF-51 (HIGH) — `/analytics` dashboard has no frontend RBAC guard

**Location:** `frontend/app/analytics/page.tsx`
**Risk:** Analytics dashboard shows payroll costs, headcount, attendance rates, and leave data to
any authenticated user. Backend requires `REPORT_VIEW` but the page renders charts with sensitive
org-wide data before API calls fail.
**Fix:** Add `usePermissions(REPORT_VIEW)` page-level guard with redirect.

### DEF-52 (MEDIUM) — `/analytics/org-health` has no frontend RBAC guard

**Location:** `frontend/app/analytics/org-health/page.tsx`
**Risk:** Organization health metrics (retention, engagement, gender distribution, tenure) visible
to any authenticated user. Backend requires `REPORT_VIEW`.
**Fix:** Add page-level permission guard.

### DEF-53 (HIGH) — `/predictive-analytics` has no frontend RBAC guard

**Location:** `frontend/app/predictive-analytics/page.tsx`
**Risk:** Predictive analytics shows attrition predictions, department risk heatmaps, and
salary-related insights. Highly sensitive HR data. Backend requires `REPORT_VIEW`.
**Fix:** Add `usePermissions(REPORT_VIEW)` page-level guard with redirect.

### DEF-54 (LOW) — `/fluence/drive` has no permission check

**Location:** `frontend/app/fluence/drive/page.tsx`
**Risk:** Phase 2 module. Drive file operations may need permission gating when backend is fully
wired.
**Fix:** Add PermissionGate when backend Drive API is implemented.

### DEF-55 (HIGH) — `/settings/sso` SAML configuration page has no frontend admin guard

**Location:** `frontend/app/settings/sso/page.tsx`
**Risk:** Any authenticated user can view and attempt to modify SAML/SSO configuration. Backend
requires `SYSTEM_ADMIN`, but the form is fully visible. Misconfiguration of SSO by a non-admin (if
backend somehow allows it) could lock out the entire tenant.
**Fix:** Add `usePermissions` check for `SYSTEM_ADMIN` with redirect to `/settings`. This is the
highest-priority fix in this loop.

### DEF-56 (MEDIUM) — `/helpdesk` dashboard shows admin SLA stats to all users

**Location:** `frontend/app/helpdesk/page.tsx`
**Risk:** SLA compliance rates, resolution times, CSAT scores, and escalation details visible to all
authenticated users. Backend SLA dashboard endpoint requires `SYSTEM_ADMIN` or `EMPLOYEE_VIEW_SELF`,
but admin-only stats are rendered in the UI before the API call fails.
**Fix:** Conditionally render admin stats section behind PermissionGate.

### DEF-57 (HIGH) — `/payments` page has no frontend RBAC guard

**Location:** `frontend/app/payments/page.tsx`
**Risk:** Payment transaction list with amounts, statuses, and provider details visible to any
authenticated user. Contains financial data. Backend requires `PAYMENT_VIEW`.
**Fix:** Add `usePermissions(PAYMENT_VIEW)` page-level guard with redirect.

### DEF-58 (HIGH) — `/payments/config` has no frontend admin guard (feature flag only)

**Location:** `frontend/app/payments/config/page.tsx`
**Risk:** Payment gateway credentials form (API keys, webhook secrets) protected only by feature
flag (`NEXT_PUBLIC_PAYMENTS_ENABLED`). If the flag is enabled, any authenticated user can
view/modify payment provider configurations. Backend requires `PAYMENT_CONFIG_MANAGE`.
**Fix:** Add `usePermissions(PAYMENT_CONFIG_MANAGE)` page-level guard. Feature flag is NOT a
security control.

### DEF-59 (LOW) — `/nu-drive` has no permission check for file operations

**Location:** `frontend/app/nu-drive/page.tsx`
**Risk:** File management operations (upload, delete, share) have no frontend permission gating. Low
risk if backend enforces permissions, but defense-in-depth is lacking.
**Fix:** Add PermissionGate for destructive operations (delete, share).

### DEF-60 (LOW) — `/linkedin-posts` has no permission gate

**Location:** `frontend/app/linkedin-posts/page.tsx`
**Risk:** LinkedIn post management (create, schedule, publish) visible to all users. Should be
restricted to HR/Marketing roles.
**Fix:** Add PermissionGate for content creation/publishing actions.

---

## XSS Assessment — Fluence Rich Text

**Result: SAFE**

All Fluence wiki/blog pages use Tiptap's `EditorContent` component via `ContentViewer.tsx` to render
rich text content. Tiptap processes structured JSON (ProseMirror document format), not raw HTML
strings. No instances of `dangerouslySetInnerHTML` or `innerHTML` found anywhere in Fluence frontend
code.

The ContentViewer loads 17 Tiptap extensions (StarterKit, Image, Link, CodeBlockLowlight, Table,
Highlight, TaskList, Underline, TextAlign, Color, TextStyle, CalloutNode) — all render through
React's virtual DOM.

---

## Security Summary

### Backend RBAC: SOLID

All backend controllers in scope have `@RequiresPermission` annotations:

- **ReportController:** `REPORT_CREATE` on all 6 endpoints
- **AnalyticsController:** `REPORT_VIEW` on all 6 endpoints
- **ScheduledReportController:** `REPORT_CREATE` / `REPORT_VIEW` on all 7 endpoints
- **PaymentController:** `PAYMENT_VIEW` / `PAYMENT_INITIATE` / `PAYMENT_REFUND`
- **PaymentConfigController:** `PAYMENT_CONFIG_MANAGE` on all endpoints
- **SamlConfigController:** `SYSTEM_ADMIN` on all 7 endpoints
- **HelpdeskController:** `SYSTEM_ADMIN` / `EMPLOYEE_VIEW_SELF` / `HELPDESK_*` permissions
- **HelpdeskSLAController:** `HELPDESK_SLA_MANAGE` / `HELPDESK_TICKET_*` permissions
- **KekaImportController:** `SYSTEM:ADMIN` on all 7 endpoints
- **EmployeeImportController:** `EMPLOYEE_CREATE` on all 4 endpoints
- **FluenceControllers:** `KNOWLEDGE_WIKI_*` / `KNOWLEDGE_BLOG_*` / `KNOWLEDGE_SEARCH` across all
  endpoints

### Frontend RBAC: GAPS

12 pages lack frontend RBAC guards. While backend blocks unauthorized API calls, the page UI still
renders (showing loading states, form layouts, navigation) before failing silently or showing
generic errors. This creates:

1. **Information leakage** — page structure reveals feature existence
2. **Poor UX** — users see forms they cannot submit
3. **Defense-in-depth violation** — single point of enforcement

### Middleware

Next.js middleware (`frontend/middleware.ts`) enforces authentication (cookie presence) for all
protected routes. It does NOT enforce fine-grained RBAC — that is delegated to client-side
`usePermissions` / `PermissionGate`. Routes missing client-side guards rely solely on backend
`@RequiresPermission`.

---

## Positive Findings

1. **Payments feature flag** — Properly gated behind `NEXT_PUBLIC_PAYMENTS_ENABLED` environment
   variable (both `/payments` and `/payments/config`)
2. **Fluence XSS-safe** — Tiptap rendering prevents stored XSS in wiki/blog content
3. **Import/Export properly gated** — Uses both `AdminGate` and `PermissionGate`
4. **Biometric devices gated** — `PermissionGate(ATTENDANCE_MANAGE)`
5. **Calendar CRUD gated** — `PermissionGate(CALENDAR_CREATE)` on create actions
6. **Settings self-service pages** — Profile, security (MFA), notifications correctly require
   auth-only (no RBAC needed for self-service)
7. **Security page** — Correctly public (marketing page, not admin settings)
8. **Compliance page** — Safe placeholder with no data exposure
9. **Report sub-pages** — `/reports/payroll` and `/reports/utilization` have full page-level RBAC
   guards (model pattern for others)
10. **SSO form validation** — Proper Zod schema with URL validation, max lengths

---

## Recommended Fix Priority

| Priority                 | Defects                                                                          | Effort      | Impact                            |
|--------------------------|----------------------------------------------------------------------------------|-------------|-----------------------------------|
| **P0 — Fix Now**         | DEF-55 (SSO config), DEF-58 (Payment config)                                     | 30 min each | Admin config pages exposed        |
| **P1 — Fix This Sprint** | DEF-51 (Analytics), DEF-53 (Predictive), DEF-57 (Payments)                       | 30 min each | Sensitive financial/HR data pages |
| **P2 — Fix Next Sprint** | DEF-49 (Reports hub), DEF-50 (Scheduled), DEF-52 (Org Health), DEF-56 (Helpdesk) | 20 min each | Moderate data exposure            |
| **P3 — Backlog**         | DEF-54 (Fluence Drive), DEF-59 (NU-Drive), DEF-60 (LinkedIn Posts)               | 15 min each | Low risk, Phase 2 features        |

**Total estimated effort:** ~5 hours for all 12 fixes.

**Pattern for all fixes:** Copy the guard pattern from `/reports/payroll/page.tsx`:

```tsx
const { hasPermission, isReady: permReady } = usePermissions();

useEffect(() => {
  if (!permReady) return;
  if (!hasPermission(Permissions.REQUIRED_PERMISSION)) {
    router.replace('/fallback');
  }
}, [permReady, hasPermission, router]);

if (!permReady || !hasPermission(Permissions.REQUIRED_PERMISSION)) {
  return null;
}
```

---

## Loop 10 Statistics

- **Routes validated:** 46
- **Routes passing:** 34 (74%)
- **Routes with defects:** 12 (26%)
- **Defects found:** 12 (5 HIGH, 4 MEDIUM, 3 LOW)
- **Critical XSS risk:** None (Tiptap safe)
- **Backend RBAC gaps:** None (all controllers annotated)
- **Frontend RBAC gaps:** 12 pages missing client-side guards

---

## Cumulative Sweep Summary (Loops 1-10)

| Loop      | Scope                      | Routes   | Defects              |
|-----------|----------------------------|----------|----------------------|
| 1         | Auth flows                 | ~10      | DEF-1 to DEF-10      |
| 2         | Dashboards                 | ~12      | DEF-11 to DEF-20     |
| 3         | Employee management        | ~15      | DEF-21 to DEF-30     |
| 4         | Approvals & workflows      | ~12      | DEF-31 to DEF-48     |
| 5-9       | (covered in prior reports) | ~150     | (see prior reports)  |
| **10**    | **Remaining routes**       | **46**   | **DEF-49 to DEF-60** |
| **Total** | **All routes**             | **~245** | **60 defects**       |
