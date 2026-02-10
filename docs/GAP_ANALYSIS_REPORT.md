# NU-AURA HRMS Platform - Comprehensive Gap Analysis Report

**Date:** 2026-02-10
**Analysis Scope:** Full codebase review (Backend, Frontend, Security, API Integration)

---

## Executive Summary

This report consolidates findings from a comprehensive analysis of the NU-AURA HRMS platform. The analysis covered backend architecture, frontend implementation, API-frontend integration, and security/RBAC compliance.

### Key Metrics

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Backend Controllers | 99 | 99 | Full coverage |
| Frontend Services | 48 | 99 | **51 missing** |
| Controllers with RBAC | ~85% | 100% | **PM module unprotected** |
| Frontend Pages with Auth | 34 | 116 | **82 unprotected** |
| Test Coverage | ~30% | 80% | **~50% gap** |
| API Type Consistency | 70% | 100% | **30% mismatched** |

---

## 1. CRITICAL Issues (P0)

### 1.1 PM Module Missing All RBAC

**Location:** `/modules/pm/src/main/java/com/nulogic/pm/api/controller/`

**Affected Controllers:**
- `ProjectController.java` - 10 endpoints unprotected
- `TaskController.java` - All endpoints unprotected
- `MilestoneController.java` - All endpoints unprotected
- `CommentController.java` - All endpoints unprotected
- `MemberController.java` - All endpoints unprotected

**Impact:** Any authenticated user can create/modify/delete projects and tasks.

**Fix Required:**
```java
@PostMapping
@RequiresPermission(Permission.PROJECT_CREATE)
public ResponseEntity<ProjectDTO.Response> create(@RequestBody ProjectDTO.CreateRequest request) { ... }
```

---

### 1.2 XSS Vulnerabilities - dangerouslySetInnerHTML

**Affected Files:**
| File | Line | Context |
|------|------|---------|
| `frontend/app/dashboard/page.tsx` | 1249 | Email content |
| `frontend/app/nu-mail/page.tsx` | 1219 | Email body |
| `frontend/app/announcements/page.tsx` | 549 | Announcement content |
| `frontend/components/layout/Header.tsx` | 1001 | Email preview |

**Impact:** Stored XSS if malicious HTML is injected into emails/announcements.

**Fix Required:**
```typescript
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

---

### 1.3 Frontend Pages Missing Authentication

**82 of 116 pages lack authentication guards.**

**Critical Admin Pages Without Protection:**
| Page | Path | Required Permission |
|------|------|---------------------|
| Roles Management | `/settings/roles` | `ROLE:MANAGE` |
| Permissions | `/settings/permissions` | `PERMISSION:MANAGE` |
| Holidays | `/settings/holidays` | `HOLIDAY:MANAGE` |
| Office Locations | `/settings/office-locations` | `OFFICE:MANAGE` |
| Custom Fields | `/settings/custom-fields` | `CUSTOM_FIELDS:MANAGE` |
| System Audit | `/settings/audit-logs` | `AUDIT:VIEW` |
| API Keys | `/settings/api-keys` | `API_KEYS:MANAGE` |

**Fix Pattern:**
```typescript
// pages that need auth
'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function SettingsPage() {
  return (
    <AuthGuard requiredPermissions={['SETTINGS:VIEW']}>
      {/* page content */}
    </AuthGuard>
  );
}
```

---

### 1.4 Hardcoded URLs

**Instances Found:**
| File | Line | URL |
|------|------|-----|
| `frontend/lib/api/client.ts` | 3 | `http://localhost:8080/api/v1` |
| `frontend/lib/contexts/WebSocketContext.tsx` | 46 | `http://localhost:8080/ws` |
| `frontend/lib/websocket.ts` | - | `http://localhost:8080` |
| `frontend/lib/services/public-offer.service.ts` | 3 | `http://localhost:8080/api/v1` |

**Impact:** Application fails in production without proper env configuration.

---

## 2. HIGH Priority Issues (P1)

### 2.1 Missing Frontend Services (51 endpoints)

**Backend controllers with no frontend service:**

| Controller | Endpoints | Priority |
|------------|-----------|----------|
| MeetingController | 8 | HIGH |
| WorkflowController | 6 | HIGH |
| NotificationPreferencesController | 4 | HIGH |
| PermissionController | 5 | HIGH |
| AuditLogController | 4 | MEDIUM |
| PulseSurveyController | 6 | MEDIUM |
| OneOnOneMeetingController | 6 | MEDIUM |
| OvertimeManagementController | 5 | MEDIUM |
| ComplianceController | 4 | MEDIUM |
| PSAProjectController | 6 | LOW |
| PSATimesheetController | 5 | LOW |
| PSAInvoiceController | 4 | LOW |

---

### 2.2 Missing @Valid Annotations

**Controllers missing input validation:**

| Controller | Method | Parameter |
|------------|--------|-----------|
| TaxDeclarationController | `submitDeclaration` | Request body |
| ExportController | `exportReport` | ExportRequest |
| AIRecruitmentController | `analyzeResume` | MultipartFile |
| AnalyticsController | `getCustomReport` | ReportRequest |
| DocumentController | `uploadDocument` | Request body |
| CustomFieldsController | `createDefinition` | DefinitionRequest |

---

### 2.3 String-Based Permissions

**Location:** `ExportController.java`

**Issue:** Uses string literals instead of Permission enum:
```java
@PreAuthorize("hasAuthority('EXPORT:EXCEL')")  // BAD
```

**Should be:**
```java
@RequiresPermission(Permission.EXPORT_EXCEL)  // GOOD
```

---

### 2.4 Tenant Context Not Validated

**Location:** `TenantFilter.java`

**Issue:** Accepts any tenant ID from X-Tenant-ID header without validating user belongs to that tenant.

```java
// Current - NO VALIDATION
if (tenantId != null && !tenantId.isEmpty()) {
    UUID tenant = UUID.fromString(tenantId);
    TenantContext.setCurrentTenant(tenant);
}
```

**Required Fix:** Add validation against user's authorized tenants.

---

### 2.5 Direct fetch() Bypasses API Client

**Location:** `frontend/lib/services/utilization.service.ts:158`

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/v1/time-tracking/reports/export?${params}`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Wrong key!
    },
  }
);
```

**Issues:**
- Uses wrong token key (`token` instead of `accessToken`)
- Bypasses central error handling
- Double `/api/v1/` path prefix

---

## 3. MEDIUM Priority Issues (P2)

### 3.1 Type Mismatches Between Backend and Frontend

**Date Handling:**
| Backend (Java) | Frontend (TypeScript) | Issue |
|----------------|----------------------|-------|
| `LocalDate` | `string` | No ISO parsing validation |
| `LocalDateTime` | `string` | Timezone handling unclear |
| `Instant` | `string` | Missing conversion utilities |

**Status Enum Lossy Mapping:**
```typescript
// attendanceService.ts:38-59
case 'REGULARIZED':
  return 'PRESENT';  // Loses REGULARIZED status!
```

---

### 3.2 Actuator Endpoints Publicly Accessible

**Location:** `SecurityConfig.java:73`

```java
.requestMatchers("/actuator/**").permitAll()
```

**Risk:** Exposes system information (heap dump, env vars, metrics).

---

### 3.3 API Path Inconsistency

**Mixed patterns in frontend services:**
```typescript
// Some use relative paths (correct)
apiClient.get('/employees');

// Some include /api/v1/ prefix (causes double prefix)
apiClient.get('/api/v1/notifications');
```

---

### 3.4 Missing Test Coverage

**Backend Services Without Tests (62+):**
- AttendanceService
- LeaveRequestService
- PayrollService
- RecognitionService
- TrainingService
- Most domain services

---

### 3.5 Incomplete Error Handling in Frontend

**Pages with incomplete error handling:**
| Page | Issue |
|------|-------|
| `attendance/regularization/page.tsx` | Uses mock data instead of API |
| `projects/[id]/page.tsx` | Generic error messages |
| `payroll/runs/page.tsx` | No retry mechanism |
| `training/courses/page.tsx` | Missing loading states |

---

## 4. LOW Priority Issues (P3)

### 4.1 TODO Comments in Code

**32 backend files contain TODO comments that need resolution:**
```bash
# Example locations
backend/src/main/java/com/hrms/api/auth/service/AuthService.java
backend/src/main/java/com/hrms/application/employee/service/EmployeeService.java
```

---

### 4.2 Sensitive Data in Logs

**Location:** `CustomUserDetailsService.java:28`

```java
log.debug("Loading user: email={}, id={}, passwordHashLength={}, passwordHashPrefix={}");
```

---

### 4.3 Missing Accessibility Attributes

**Components missing ARIA attributes:**
- Modal dialogs
- Form inputs
- Navigation menus
- Data tables

---

## 5. Security Compliance Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Password Hashing | PASS | BCrypt implemented |
| SQL Injection Prevention | PASS | JPA parameterized queries |
| RBAC Implementation | PARTIAL | PM module missing |
| XSS Prevention | FAIL | Unsanitized HTML rendering |
| CSRF Protection | N/A | Disabled for JWT API |
| Input Validation | PARTIAL | Some controllers missing @Valid |
| Tenant Isolation | PARTIAL | Header accepted without validation |
| Audit Logging | PASS | Comprehensive coverage |
| Session Management | PASS | JWT with refresh tokens |

---

## 6. Prioritized Action Plan

### Week 1 - Critical Security

| # | Task | Files Affected | Effort |
|---|------|----------------|--------|
| 1 | Add RBAC to PM module | 5 controllers | 4h |
| 2 | Add DOMPurify sanitization | 4 components | 2h |
| 3 | Add AuthGuard to admin pages | 10+ pages | 4h |
| 4 | Fix hardcoded URLs | 4 files | 1h |
| 5 | Fix direct fetch() bypass | 1 file | 30m |

### Week 2 - High Priority Gaps

| # | Task | Files Affected | Effort |
|---|------|----------------|--------|
| 6 | Add @Valid annotations | 6 controllers | 2h |
| 7 | Fix string-based permissions | 1 controller | 1h |
| 8 | Add tenant validation | TenantFilter.java | 2h |
| 9 | Create missing priority services | 10 services | 8h |
| 10 | Fix API path inconsistencies | 6 files | 2h |

### Week 3 - Medium Priority

| # | Task | Files Affected | Effort |
|---|------|----------------|--------|
| 11 | Add date conversion utilities | New utility file | 2h |
| 12 | Fix type mismatches | 5+ type files | 4h |
| 13 | Secure actuator endpoints | SecurityConfig.java | 1h |
| 14 | Add error boundaries | 6 pages | 3h |
| 15 | Create missing services (batch 2) | 15 services | 12h |

### Week 4+ - Complete Coverage

| # | Task | Files Affected | Effort |
|---|------|----------------|--------|
| 16 | Add AuthGuard to remaining pages | 72 pages | 8h |
| 17 | Add unit tests | 62+ services | 40h+ |
| 18 | Resolve TODO comments | 32 files | 8h |
| 19 | Add accessibility attributes | 20+ components | 8h |
| 20 | Create remaining services | 26 services | 20h |

---

## 7. Files Reference

### Critical Files Needing Immediate Attention

```
# PM Module Controllers (add RBAC)
modules/pm/src/main/java/com/nulogic/pm/api/controller/ProjectController.java
modules/pm/src/main/java/com/nulogic/pm/api/controller/TaskController.java
modules/pm/src/main/java/com/nulogic/pm/api/controller/MilestoneController.java
modules/pm/src/main/java/com/nulogic/pm/api/controller/CommentController.java
modules/pm/src/main/java/com/nulogic/pm/api/controller/MemberController.java

# XSS Vulnerable Components (add DOMPurify)
frontend/app/dashboard/page.tsx:1249
frontend/app/nu-mail/page.tsx:1219
frontend/app/announcements/page.tsx:549
frontend/components/layout/Header.tsx:1001

# Hardcoded URLs (use env vars)
frontend/lib/api/client.ts:3
frontend/lib/contexts/WebSocketContext.tsx:46
frontend/lib/websocket.ts
frontend/lib/services/public-offer.service.ts:3

# Direct fetch bypass (use apiClient)
frontend/lib/services/utilization.service.ts:158
```

---

## 8. Recommendations

### Immediate (This Sprint)

1. **Block PR merges** until PM module has RBAC annotations
2. **Install DOMPurify** and create sanitization utility
3. **Create AuthGuard wrapper** for all admin pages
4. **Move all URLs** to environment configuration

### Short-term (Next 2 Sprints)

5. **Implement automated security scanning** in CI/CD
6. **Add TypeScript strict mode** for better type safety
7. **Create API contract tests** between backend DTOs and frontend types
8. **Establish code review checklist** including RBAC verification

### Long-term (Quarterly)

9. **Achieve 80% test coverage** across all services
10. **Implement OpenAPI spec generation** for frontend type safety
11. **Add E2E test suite** covering critical user flows
12. **Conduct penetration testing** before production release

---

## Appendix A: Full Controller RBAC Audit

| Controller | Has RBAC | Endpoints | Notes |
|------------|----------|-----------|-------|
| EmployeeController | YES | 15 | Complete |
| LeaveRequestController | YES | 12 | Complete |
| AttendanceController | YES | 10 | Complete |
| PayrollController | YES | 8 | Complete |
| RecognitionController | YES | 14 | Complete |
| MonitoringController | PARTIAL | 5 | ping endpoint unprotected |
| ExportController | STRING | 4 | Uses string permissions |
| ProjectController (PM) | NO | 10 | Critical gap |
| TaskController (PM) | NO | 8 | Critical gap |
| MilestoneController (PM) | NO | 6 | Critical gap |

---

## Appendix B: Frontend Service Coverage

| Backend Module | Service Exists | API Coverage |
|----------------|----------------|--------------|
| Auth | YES | 100% |
| Employees | YES | 100% |
| Attendance | YES | 95% |
| Leave | YES | 100% |
| Payroll | YES | 90% |
| Recognition | YES | 80% |
| Training | YES | 85% |
| Calendar | YES | 100% |
| Home Dashboard | YES | 100% |
| Meetings | NO | 0% |
| Workflow | NO | 0% |
| Compliance | NO | 0% |
| Pulse Surveys | NO | 0% |
| PSA (Professional Services) | NO | 0% |

---

*This report should be reviewed and updated after each sprint.*
