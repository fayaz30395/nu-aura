# RBAC Annotation Audit Report

**Date:** 2026-04-01
**Scope:** All 644 Java files in `backend/src/main/java/com/hrms/api/`
**Controllers scanned:** 153 `@RestController` classes (excluding auth, publicapi, monitoring
packages)
**Auditor:** Automated static analysis with manual verification

---

## Executive Summary

| Severity | Category                                                                  | Count    | Status                  |
|----------|---------------------------------------------------------------------------|----------|-------------------------|
| Critical | Missing `@RequiresPermission` (no auth at all)                            | 1        | Needs fix               |
| High     | Uses `@PreAuthorize` instead of `@RequiresPermission` (inconsistent auth) | 3        | Needs migration         |
| Medium   | `@PreAuthorize("isAuthenticated()")` without permission check             | 9        | Acceptable with caveats |
| Low      | Missing `@Valid` on `@RequestBody` (raw String/Map params)                | 5        | Informational           |
| Pass     | Permission naming convention (`MODULE:ACTION`)                            | 0 issues | All constants compliant |
| Pass     | SuperAdmin bypass in `PermissionAspect`                                   | Correct  | Verified                |

**Overall assessment:** The codebase is in strong shape. Out of ~800+ endpoint methods across 153
controllers, only 1 endpoint is genuinely missing authorization, and 3 use an inconsistent
authorization mechanism. The vast majority of endpoints correctly use `@RequiresPermission`.

---

## 1. SuperAdmin Bypass Verification -- PASS

**File:** `src/main/java/com/hrms/common/security/PermissionAspect.java`

The `PermissionAspect` correctly bypasses permission checks for admin roles:

```java
// Line 51
if (SecurityContext.isTenantAdmin()) {
    log.debug("Admin bypass -- skipping @RequiresPermission check for method: {}",
            ((MethodSignature) joinPoint.getSignature()).getMethod().getName());
    return joinPoint.proceed();
}
```

**`SecurityContext.isTenantAdmin()` chain** (from `SecurityContext.java`):

- `isTenantAdmin()` returns `true` if user has `TENANT_ADMIN` role OR is `SUPER_ADMIN`
- `isSuperAdmin()` checks both the `SUPER_ADMIN` role AND the `SYSTEM:ADMIN` permission

**Additional safety features verified:**

- CRIT-1 guard: Empty `@RequiresPermission` annotations throw `AccessDeniedException` (line 83)
- `revalidate = true` option forces fresh DB permission lookup for sensitive operations (line 90)
- Both `@annotation` and `@within` pointcuts handled (line 45) -- supports method-level and
  class-level annotations

**Verdict:** PASS -- SuperAdmin bypass is correctly implemented.

---

## 2. Missing @RequiresPermission -- Critical Findings

### FINDING C-1: UserController.getCurrentUser() -- NO AUTH ANNOTATION

| Field        | Value                                                                          |
|--------------|--------------------------------------------------------------------------------|
| **File**     | `src/main/java/com/hrms/api/user/controller/UserController.java`               |
| **Line**     | 27                                                                             |
| **Method**   | `getCurrentUser()`                                                             |
| **HTTP**     | `GET /api/v1/users/me`                                                         |
| **Severity** | **Critical**                                                                   |
| **Issue**    | No `@RequiresPermission` annotation. Endpoint returns user profile with roles. |

**Context:** This is a self-service endpoint that returns the authenticated user's own profile. It
relies on Spring Security's `authenticated()` filter from `SecurityConfig` to block unauthenticated
access. However, it lacks explicit RBAC annotation, which means:

- Any authenticated user (including deactivated accounts with valid JWTs) can access it
- No audit trail via `PermissionAspect` logging
- Inconsistent with the project convention that all endpoints have `@RequiresPermission`

**Recommendation:** Add `@RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)` or create a dedicated
`USER:VIEW_SELF` permission. Alternatively, if this endpoint is intentionally open to all
authenticated users, add a `@PreAuthorize("isAuthenticated()")` with a code comment explaining the
design decision.

---

## 3. Inconsistent Authorization Mechanism -- High Findings

Three endpoints in `FileUploadController` use Spring's `@PreAuthorize` instead of the
project-standard `@RequiresPermission`. This means they bypass `PermissionAspect` entirely (no admin
bypass, no revalidation, no audit logging).

### FINDING H-1: FileUploadController.uploadProfilePhoto()

| Field        | Value                                                                                                       |
|--------------|-------------------------------------------------------------------------------------------------------------|
| **File**     | `src/main/java/com/hrms/api/document/controller/FileUploadController.java`                                  |
| **Line**     | 53-54                                                                                                       |
| **Method**   | `uploadProfilePhoto()`                                                                                      |
| **HTTP**     | `POST /api/v1/files/upload/profile-photo/{employeeId}`                                                      |
| **Severity** | **High**                                                                                                    |
| **Current**  | `@PreAuthorize("hasPermission('HRMS:EMPLOYEE:UPDATE') or @securityService.isCurrentEmployee(#employeeId)")` |

**Issue:** Uses `@PreAuthorize` with a custom SpEL expression. The
`hasPermission('HRMS:EMPLOYEE:UPDATE')` check uses a non-standard permission format (
`HRMS:EMPLOYEE:UPDATE` instead of `EMPLOYEE:UPDATE`). Additionally, `SuperAdmin` bypass is NOT
guaranteed through this mechanism since `PermissionAspect` is not invoked.

**Recommendation:** Migrate to `@RequiresPermission` and handle the "self or admin" logic in the
service layer.

### FINDING H-2: FileUploadController.uploadDocument()

| Field        | Value                                                                      |
|--------------|----------------------------------------------------------------------------|
| **File**     | `src/main/java/com/hrms/api/document/controller/FileUploadController.java` |
| **Line**     | 76-77                                                                      |
| **Method**   | `uploadDocument()`                                                         |
| **HTTP**     | `POST /api/v1/files/upload/document/{employeeId}`                          |
| **Severity** | **High**                                                                   |
| **Current**  | `@PreAuthorize("hasPermission('HRMS:DOCUMENT:UPLOAD')")`                   |

**Issue:** Uses non-standard permission format `HRMS:DOCUMENT:UPLOAD` (should be `DOCUMENT:UPLOAD`).
SuperAdmin bypass not guaranteed.

### FINDING H-3: FileUploadController.deleteFile()

| Field        | Value                                                                      |
|--------------|----------------------------------------------------------------------------|
| **File**     | `src/main/java/com/hrms/api/document/controller/FileUploadController.java` |
| **Line**     | 149-150                                                                    |
| **Method**   | `deleteFile()`                                                             |
| **HTTP**     | `DELETE /api/v1/files`                                                     |
| **Severity** | **High**                                                                   |
| **Current**  | `@PreAuthorize("hasPermission('HRMS:DOCUMENT:DELETE')")`                   |

**Issue:** Same as H-2. Non-standard permission format, no `PermissionAspect` integration.

---

## 4. @PreAuthorize("isAuthenticated()") Usage -- Medium Findings

These endpoints use `@PreAuthorize("isAuthenticated()")` which ensures the user is logged in but
does not check any specific permission. This may be intentional for self-service endpoints.

### FINDING M-1: MfaController (4 endpoints)

| Field         | Value                                                           |
|---------------|-----------------------------------------------------------------|
| **File**      | `src/main/java/com/hrms/api/auth/controller/MfaController.java` |
| **Lines**     | 44, 62, 87, 109                                                 |
| **Endpoints** | MFA setup, verify, disable, status                              |
| **Severity**  | **Medium**                                                      |

**Assessment:** MFA endpoints are in the `auth` package (exempt from RBAC by design). Any
authenticated user should be able to manage their own MFA. This is acceptable.

### FINDING M-2: QuizController (5 endpoints)

| Field         | Value                                                           |
|---------------|-----------------------------------------------------------------|
| **File**      | `src/main/java/com/hrms/api/lms/controller/QuizController.java` |
| **Lines**     | 33, 45, 59, 73, 87                                              |
| **Endpoints** | Quiz details, submit attempt, history, certificate              |
| **Severity**  | **Medium**                                                      |

**Assessment:** Quiz participation endpoints are accessible to any authenticated user. This may be
intentional if all employees can take quizzes, but should be verified against business requirements.
Consider adding `LMS:VIEW` permission for read endpoints and `LMS:SUBMIT` for write endpoints.

---

## 5. Missing @Valid on @RequestBody -- Low Findings

These endpoints accept `@RequestBody` without `@Valid`, meaning request payloads are not validated
by Bean Validation. Most are legitimate cases where the body is a raw `String` or `Map` that cannot
be validated with annotations.

| #   | File                           | Line | Method                   | Body Type                        | Severity                 |
|-----|--------------------------------|------|--------------------------|----------------------------------|--------------------------|
| V-1 | `DocuSignController.java`      | 85   | `handleDocuSignCallback` | `String` (webhook payload)       | Low -- raw webhook body  |
| V-2 | `SlackCommandController.java`  | 94   | `handleEvent`            | `String` (webhook payload)       | Low -- raw webhook body  |
| V-3 | `PayrollController.java`       | 442  | (component evaluation)   | `Map<String, BigDecimal>`        | Low -- dynamic input map |
| V-4 | `TravelExpenseController.java` | 82   | `approveExpense`         | `Map<String, Object>` (optional) | Low -- optional body     |
| V-5 | `TravelExpenseController.java` | 96   | `rejectExpense`          | `Map<String, String>` (optional) | Low -- optional body     |

**Note:** V-1, V-2 are webhook callbacks from external services (DocuSign, Slack) where the body
format is controlled by the provider. V-3 through V-5 use `Map` types where Bean Validation
annotations do not apply.

---

## 6. Permission Naming Convention -- PASS

**File:** `src/main/java/com/hrms/common/security/Permission.java`

All permission constants follow the `MODULE:ACTION` pattern (e.g., `EMPLOYEE:READ`,
`PAYROLL:PROCESS`, `LEAVE:APPROVE`). Zero violations found.

**Convention:**

- DB stores: `module.action` (lowercase, dot-separated)
- Code uses: `MODULE:ACTION` (uppercase, colon-separated)
- Normalization happens at load time in `JwtAuthenticationFilter`

---

## 7. Public Endpoints (Correctly Excluded from RBAC)

The following paths are configured as `permitAll()` in `SecurityConfig.java` (line 162+) and were
correctly excluded from this audit:

| Path Pattern                            | Purpose                                             |
|-----------------------------------------|-----------------------------------------------------|
| `/api/v1/auth/**`                       | Authentication endpoints (login, register, refresh) |
| `/api/v1/tenants/register`              | Tenant self-registration                            |
| `/actuator/health/**`                   | Health check probes                                 |
| `/api/v1/esignature/external/**`        | External e-signature callbacks                      |
| `/api/v1/public/offers/**`              | Public job offer acceptance                         |
| `/api/v1/exit/interview/public/**`      | Public exit interview form                          |
| `/api/public/careers/**`                | Public careers page                                 |
| `/api/v1/integrations/docusign/webhook` | DocuSign webhook                                    |
| `/api/v1/payments/webhooks/**`          | Payment provider webhooks                           |
| `/api/v1/preboarding/portal/**`         | Candidate pre-boarding portal                       |
| `/api/v1/biometric/punch`, `/batch`     | Biometric device integration                        |
| `/api/v1/integrations/slack/*`          | Slack integration callbacks                         |
| `/ws/**`                                | WebSocket connections                               |

---

## 8. Remediation Plan

### Immediate (P0) -- 1 endpoint

1. **Add `@RequiresPermission` to `UserController.getCurrentUser()`**

- If open to all authenticated users: add `@RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)` (
  already granted to all roles)
- Document the design decision with a comment

### Short-term (P1) -- 3 endpoints

2. **Migrate `FileUploadController` from `@PreAuthorize` to `@RequiresPermission`**

- `uploadProfilePhoto()`: Add `@RequiresPermission(Permission.DOCUMENT_UPLOAD)` and move
  self-service logic to service layer
- `uploadDocument()`: Replace with `@RequiresPermission(Permission.DOCUMENT_UPLOAD)`
- `deleteFile()`: Replace with `@RequiresPermission(Permission.DOCUMENT_DELETE)`
- Fix non-standard permission format (`HRMS:DOCUMENT:*` to `DOCUMENT:*`)

### Medium-term (P2) -- 5 endpoints

3. **Add specific permissions to `QuizController`**

- Replace `@PreAuthorize("isAuthenticated()")` with `@RequiresPermission(Permission.LMS_VIEW)` or
  equivalent
- Define `LMS:VIEW`, `LMS:SUBMIT` permissions if they don't exist

---

## Methodology

1. **Scanner approach:** Static analysis Python script scanning all 644 Java files in the API layer
2. **Annotation block detection:** For each HTTP mapping annotation (`@GetMapping`, `@PostMapping`,
   etc.), the scanner examined the full annotation block both above and below the mapping
   annotation, up to the method signature, for `@RequiresPermission`
3. **Class-level detection:** Controllers with class-level `@RequiresPermission` were excluded (all
   methods covered)
4. **Public path filtering:** Endpoints matching `SecurityConfig.permitAll()` paths were excluded
5. **Manual verification:** All findings were manually verified by reading the source files
6. **False positive elimination:** Initial scan found 539 potential issues; after fixing annotation
   block detection to handle annotations appearing after HTTP mappings (common pattern:
   `@PostMapping` then `@RequiresPermission`), the count dropped to 4 genuine findings
