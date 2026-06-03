# NU-AURA Security Audit — Remediation Report

**Release:** 2026-06-04
**Audit type:** Multi-agent security audit, adversarially verified
**Scope:** auth-session, authz-idor, tenant-isolation, injection, ssrf-webhook-upload, secrets-config, crypto, frontend-web, ratelimit-dos
**Lead synthesis:** Security Architect

---

## 1. Executive Summary

NU-AURA has a **strong, layered security posture**. The audit confirms mature, correctly-implemented defenses across nearly every dimension: dual-layer fail-closed RBAC (interceptor + AOP), PgBouncer-correct `SET LOCAL` RLS with `FORCE ROW LEVEL SECURITY` and fail-closed `NULLIF` GUC handling, startup-validated JWT secrets with issuer/audience/token-type enforcement, a dedicated SSRF utility applied consistently across every outbound integration, a hardened file-upload pipeline (MIME allowlist + magic-byte cross-check + AV scan + `Content-Disposition: attachment`), and a Redis-Lua rate limiter that fails closed for auth. No production-runtime npm criticals exist; no real secrets are committed to tracked files.

The findings below are **residual gaps**, not a broken baseline. After adversarial verification (which downgraded several originally-HIGH/CRITICAL findings once compensating layers were confirmed), the picture is:

### Count by adjusted severity

| Severity | Count | Findings |
|----------|-------|----------|
| CRITICAL | 0 | — |
| HIGH | 3 | TenantAdmin→SuperAdmin escalation; Impersonation revocation no-op; Demo accounts with known password seeded to prod |
| MEDIUM | 11 | MFA no-nonce binding; File-upload IDOR; Tax/Review/Self-service IDOR; Sort-field SQLi; AV fail-open; BCrypt cost-10; TOTP replay; TOTP QR broken; OAuth token in sessionStorage; Impersonation JWT in sessionStorage; CSP unsafe-inline; Auth rate-limit fail-open; Export unbounded payload; Pageable size unbounded; Expense summary date-range |
| LOW | 8 | CSRF SameSite missing; `__Host-` off by default; ScheduledReport RLS-null (correctness); Drive category injection; Grafana dev default; CSP wss wildcard; Vitest dev CVE; CustomReport unbounded query; RateLimitConfig dead bean |
| INFO | 1 | K8s secrets.yaml gitignore gap |

> Note: some dimensions produced multiple findings of the same severity; the table above lists representative titles. The full enumerated list is in Section 2.

### The single most important thing to fix

**Demo user accounts seeded into production with the publicly-known password `Welcome@123` — including a SUPER_ADMIN account (`sarankarthick.maran@nulogic.io`).** This is the only finding that is a **single-HTTP-request, unauthenticated-to-SuperAdmin** path. V49/V173 Flyway migrations live in `classpath:db/migration` and run on every prod K8s deploy, and V173's `ON CONFLICT DO UPDATE SET password_changed_at = NOW()` permanently defeats the 90-day expiry that would otherwise force rotation. Every other HIGH finding requires an already-authenticated, privileged caller. **Fix this first.**

---

## 2. Prioritized Findings Table

| ID | Title | Dimension | Severity | File | Reachable | Already-mitigated-by |
|----|-------|-----------|----------|------|-----------|----------------------|
| H-1 | Demo accounts with known password `Welcome@123` seeded to prod DB | secrets-config | **HIGH** | `db/migration/V49…:63`, `V173…:8` | yes | none |
| H-2 | TenantAdmin → SuperAdmin via `SYSTEM:ADMIN` permission on custom role | authz-idor | **HIGH** | `RoleManagementService.java:226` | yes | RLS (partial — intra-tenant only) |
| H-3 | Impersonation JTI blacklist not wired into `validateToken` (revocation no-op) | auth-session | **HIGH** | `JwtTokenProvider.java:463` | yes | 15-min TTL (partial) |
| M-1 | File-upload IDOR — write to any employee's document space | authz-idor | MEDIUM | `FileUploadController.java:91` | yes | none |
| M-2 | MFA second-factor endpoint accepts caller-supplied `userId`, no first-factor binding | auth-session | MEDIUM | `AuthController.java:138` | yes | rate-limit 5/min; TOTP secret unknown to attacker |
| M-3 | IDOR — `GET /tax-declarations/{id}` no owner check | authz-idor | MEDIUM | `TaxDeclarationController.java:73` | yes | tenant isolation (cross-tenant only) |
| M-4 | IDOR — `GET /reviews/{id}` no owner check | authz-idor | MEDIUM | `PerformanceReviewController.java:82` | yes | tenant isolation (cross-tenant only) |
| M-5 | IDOR — self-service profile-update `GET /{requestId}` exposes bank/PII | authz-idor | MEDIUM | `SelfServiceController.java:53` | yes | tenant isolation; UUID entropy |
| M-6 | Sort-field SQL injection via unvalidated `Pageable` in native query | injection | MEDIUM | `NotificationTemplateRepository.java:44` | yes | RLS (cross-tenant only); auth required |
| M-7 | AV scan fails open on ClamAV daemon error | ssrf-webhook-upload | MEDIUM | `FileStorageService.java:334` | yes | MIME+magic-byte allowlist (partial) |
| M-8 | BCrypt instantiated at default cost 10, baseline documents cost 12 | crypto | MEDIUM | `SecurityConfig.java:86` | yes | none (offline-crack only) |
| M-9 | TOTP code replayable within ~90s acceptance window | crypto | MEDIUM | `MfaService.java:227` | yes | lockout (online only) |
| M-10 | TOTP QR-code URL broken — MFA enrollment universally non-functional | crypto | MEDIUM | `MfaService.java:372` | yes | n/a (functional defect) |
| M-11 | Google OAuth tokens (Gmail/Drive scopes) in JS-accessible sessionStorage | frontend-web | MEDIUM | `googleToken.ts:33` | yes (XSS-gated) | DOMPurify (XSS prereq) |
| M-12 | Impersonation JWT stored in sessionStorage, never consumed | frontend-web | MEDIUM | `app/admin/system/page.tsx:71` | yes (XSS-gated) | 15-min TTL; CSP |
| M-13 | CSP `script-src` contains `'unsafe-inline'` | frontend-web | MEDIUM | `proxy.ts:251` | no (DOMPurify upstream) | DOMPurify + Tiptap JSON |
| M-14 | Auth rate-limit fails open (60/min) on Redis outage | ratelimit-dos | MEDIUM | `RateLimitingFilter.java:184` | yes | AccountLockoutService (per-account) |
| M-15 | ExportController unbounded payload → JVM heap exhaustion | ratelimit-dos | MEDIUM | `ExportController.java:156` | yes | EXPORT rate-limit (5/5min) |
| M-16 | Paginated controllers accept unbounded `size` (no `@Max`) | ratelimit-dos | MEDIUM | `CompOffController.java:75` (+11 more) | yes | statement_timeout 120s; RLS |
| M-17 | Expense summary loads arbitrary date range, no cap | ratelimit-dos | MEDIUM | `ExpenseClaimService.java:481` | yes | DataScopeService (self-scope only) |
| L-1 | CSRF cookie missing SameSite (Javadoc claims Strict) | auth-session | LOW | `CsrfDoubleSubmitFilter.java:127` | yes | header-equality check (primary) |
| L-2 | `__Host-` cookie prefix off by default in prod | auth-session | LOW | `application.yml:299` | no | CSRF filter; no Domain attr |
| L-3 | ScheduledReport self-invocation → RLS GUC null (empty reports) | tenant-isolation | LOW | `ScheduledReportExecutionJob.java:58` | no | V179 fail-closed (0 rows) |
| L-4 | File-upload `category` param injected into Drive path key | ssrf-webhook-upload | LOW | `FileStorageService.java:491` | yes | Drive non-FS semantics; tenant-scoped mapping |
| L-5 | Grafana dev compose defaults to `admin` password | secrets-config | LOW | `docker-compose.yml:182` | yes | prod compose fails closed |
| L-6 | CSP `connect-src` has bare `wss:` wildcard | frontend-web | LOW | `proxy.ts:253` | no | DOMPurify (XSS prereq) |
| L-7 | Vitest CRITICAL CVE (GHSA-5xrq) — dev-only, UI server | frontend-web | LOW | `package.json:106,114` | yes (dev only) | not in CI/prod image |
| L-8 | CustomReport loads all tenant employees into heap | ratelimit-dos | LOW | `CustomReportService.java:144` | yes | EXPORT rate-limit; REPORT_CREATE gate |
| L-9 | RateLimitConfig dead bean (false-confidence) | ratelimit-dos | LOW | `RateLimitConfig.java:24` | no | active path is RateLimitingFilter |
| I-1 | K8s secrets.yaml gitignore pattern path-mismatch | secrets-config | INFO | `infra/deployment/kubernetes/secrets.yaml` | no | placeholder-only content today |

---

## 3. Detailed Findings

### H-1 — Demo accounts with known password seeded to production database

**Evidence** — `backend/src/main/resources/db/migration/V49__org_chart_demo_data.sql:63` and `V173__restore_sarankarthick_demo_superadmin.sql:8,19`

```
-- V49: "Password hash = bcrypt of 'Welcome@123' for all demo users"
-- 13 users (@nulogic.io) inserted status=ACTIVE, hash $2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2
-- V173: "Password: Welcome@123", sarankarthick.maran@nulogic.io → SUPER_ADMIN
--        ON CONFLICT DO UPDATE SET password_hash=EXCLUDED.password_hash, status='ACTIVE', password_changed_at=NOW()
```

Both files live in `classpath:db/migration`. `application-prod.yml` does not override `flyway.locations`, and `infra/deployment/kubernetes/configmap.yaml:27` sets `SPRING_FLYWAY_LOCATIONS: "classpath:db/migration"` — so these migrations execute on every prod K8s deploy.

**Attack scenario** — Email format is predictable (`firstname.lastname@nulogic.io`). A single `POST /api/v1/auth/login` with password `Welcome@123` succeeds and returns a valid SUPER_ADMIN session for `sarankarthick.maran@nulogic.io`. The 90-day expiry never fires because V173 resets `password_changed_at = NOW()` on every deploy. The `AUTH_ALLOWED_DOMAIN: nulogic.io` restriction provides zero protection — all seeded accounts are on that domain. Rate limiting (5/min) does not stop a single correct-password login.

**Why it survived verification** — Every claimed defense was checked and refuted: bcrypt protects the hash at rest, not login with the known plaintext; RBAC/RLS/JWT all activate *after* authentication; no `force_password_change` field exists anywhere in the codebase (grep-confirmed). Severity held at HIGH (not CRITICAL) only because this is a single-org internal platform — blast radius is bounded to one organization.

**Specific fix**
1. Move V49 and V173 out of `db/migration` into a `db/seed` location loaded only by the `demo` profile (`application-demo.yml` already adds `classpath:db/seed`).
2. Add a forward migration (e.g. `V280__purge_seeded_demo_credentials.sql`) that, for any account whose `password_hash` matches the two known `Welcome@123` digests, sets `password_hash=''` and `status='PASSWORD_RESET_REQUIRED'`.
3. Add a `force_password_change BOOLEAN` column to `users` and enforce it in `AuthService.login()`.
4. For the NuLogic prod tenant, require OAuth/SAML login or per-account random passwords.

---

### H-2 — TenantAdmin escalates to SuperAdmin by assigning `SYSTEM:ADMIN` to a custom role

**Evidence** — `backend/src/main/java/com/nulogic/application/user/service/RoleManagementService.java:226`

```java
public RoleResponse assignPermissions(UUID roleId, AssignPermissionsRequest request) {
    if (role.getIsSystemRole()) { throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE); }
    List<Permission> permissions = permissionRepository.findByCodeIn(request.getPermissionCodes());
    // No denylist — SYSTEM:ADMIN is a normal Permission row
    for (Permission perm : permissions) { role.addPermission(perm, RoleScope.GLOBAL); }
}
```

**Attack scenario** — A TenantAdmin (holds `ROLE_MANAGE`) creates a custom role (`isSystemRole=false`), calls `PUT /api/v1/roles/{id}/permissions` with `{permissionCodes:['SYSTEM:ADMIN']}`, assigns the role to self. On next login `SecurityContext.isSuperAdmin()` returns true (`isSystemAdmin()` = `hasPermission('SYSTEM:ADMIN')`), bypassing every `@RequiresPermission` check via the interceptor/aspect short-circuit. `PlatformController.java:366` `POST /api/v1/platform/migrate/{tenantId}` takes `tenantId` as a path param and is gated only by `@RequiresPermission("SYSTEM:ADMIN")` — potentially cross-tenant.

**Why it survived verification** — Full chain confirmed: `findByCodeIn` has no `is_restricted` filter; `SYSTEM:ADMIN` is a plain seeded row (V96); the cache is evicted so the next request picks it up; `validateNoPrivilegeEscalation` only guards the *role code* `SUPER_ADMIN`, not the *permission code* `SYSTEM:ADMIN`. Downgraded CRITICAL→HIGH because PostgreSQL RLS still scopes standard CRUD queries to the attacker's own tenant (`app.current_tenant_id` from the JWT), preventing indiscriminate cross-tenant exfiltration via the normal data surface — but full intra-tenant RBAC bypass and access to platform endpoints with a caller-supplied `tenantId` remain.

**Specific fix** — Add a `PRIVILEGED_PERMISSIONS` denylist mirroring the existing `PRIVILEGED_ROLE_CODES` pattern. Apply in all three mutation paths — `assignPermissions` (line 226), `addPermissions` (line 420), `assignPermissionsWithScope` (line 275):

```java
private static final Set<String> PRIVILEGED_PERMISSIONS =
    Set.of(Permission.SYSTEM_ADMIN, Permission.PERMISSION_MANAGE, Permission.PLATFORM_MANAGE);

if (request.getPermissionCodes().stream().anyMatch(PRIVILEGED_PERMISSIONS::contains)
        && !SecurityContext.isSuperAdmin()) {
    auditLog.privilegeEscalationAttempt(...);
    throw new AccessDeniedException("Only SuperAdmin can grant system-level permissions");
}
```

---

### H-3 — Impersonation revocation is a no-op (JTI blacklist never checked)

**Evidence** — `backend/src/main/java/com/nulogic/common/security/JwtTokenProvider.java:463`

```java
/**
 * TODO: wire this into validateToken(String) so that when isImpersonation=true,
 * the filter checks the impersonationJti blacklist ...
 */
public UUID getImpersonationJtiFromToken(String token) { ... }
```

`validateToken()` (lines 190–235) checks only the standard `.id` JTI claim against the blacklist; it never reads `impersonationJti`. `TokenBlacklistService.revokeImpersonationToken()` exists and writes correctly, but has **zero callers** anywhere in the backend (no controller endpoint invokes it), and `validateToken` would ignore it even if one existed.

**Attack scenario** — An operator invokes the documented M-C4 revoke-impersonation control. The impersonation JTI is blacklisted, but the session keeps working until its natural 15-minute expiry. If the impersonation token was exfiltrated, early revocation provides no protection.

**Why it survived verification** — End-to-end confirmed by grep: getter and `isImpersonationToken()` have no external callers; `revokeImpersonationToken` has no callers; `JwtAuthenticationFilter` treats impersonation tokens identically to regular access tokens. HIGH (not CRITICAL) because the 15-min TTL caps exposure and impersonation tokens are only mintable by already-authenticated SYSTEM_ADMIN users.

**Specific fix** — In `JwtTokenProvider.validateToken()`, after the existing JTI check:

```java
if (Boolean.TRUE.equals(claims.get("isImpersonation", Boolean.class))) {
    String impJti = claims.get("impersonationJti", String.class);
    if (impJti != null && tokenBlacklistService.isBlacklisted(impJti)) {
        return false;
    }
}
```

Also wire `revokeImpersonationToken()` to a real `SystemAdminController` endpoint so operators can actually trigger it.

---

### M-1 — File-upload IDOR on legacy endpoints

**Evidence** — `backend/src/main/java/com/nulogic/api/document/controller/FileUploadController.java:91`

```java
@PostMapping("/upload/document/{employeeId}")
@RequiresPermission(Permission.DOCUMENT_UPLOAD)
public ResponseEntity<FileUploadResponse> uploadDocument(@PathVariable UUID employeeId, ...) {
    // No caller-vs-employeeId ownership check
    FileUploadResult result = fileStorageService.uploadFile(file, CATEGORY_DOCUMENTS, employeeId);
}
```

Every EMPLOYEE holds `DOCUMENT_UPLOAD` (`RoleHierarchy.java:377`). The canonical alias `EmployeeDocumentController` *does* call `enforceEmployeeUploadScope()`; the legacy `/api/v1/files/upload/document/{employeeId}` path does not.

**Attack scenario** — Any employee POSTs a file to another employee's `{employeeId}`, polluting their document space. Same for `/upload/profile-photo/{employeeId}` (requires `EMPLOYEE_UPDATE`, typically held by managers). Tenant isolation blocks cross-tenant writes; harm is intra-tenant document-space pollution (write-only, no read).

**Why it survived verification** — No layer blocks it: Spring Security only requires auth, `@RequiresPermission` checks only the permission string, `FileStorageService` derives the tenant prefix correctly but never validates the caller owns `employeeId`. HIGH because reachable by any API client, capped below CRITICAL because it is write-pollution not exfiltration.

**Specific fix** — Add `enforceEmployeeUploadScope(employeeId)` (the helper already in `EmployeeDocumentController`) to both `uploadDocument` and `uploadProfilePhoto`, or deprecate the legacy paths and redirect to the scoped canonical endpoints.

---

### M-2 — MFA second-factor endpoint has no first-factor binding

**Evidence** — `backend/src/main/java/com/nulogic/api/auth/controller/AuthController.java:138`

```java
@PostMapping("/mfa-login")  // permitAll
public ResponseEntity<AuthResponse> mfaLogin(@Valid @RequestBody MfaLoginRequest request, ...) {
    if (!mfaService.verifyMfaCode(request.getUserId(), request.getCode())) { ... }
    AuthResponse authResponse = authService.loginAfterMfa(request.getUserId());
}
```

**Attack scenario** — The endpoint accepts a caller-supplied `userId` with no proof the caller completed first-factor. There is no pre-auth nonce binding the second factor to a specific login attempt.

**Why it survived verification** — Downgraded HIGH→MEDIUM: the TOTP-enumeration scenario is *not* viable (attacker cannot generate a valid code without the victim's server-side TOTP secret), and the `mfaEnabled=false` skip is correctly neutralized (returns 401). **However, the verifier surfaced a deeper issue:** `AuthService.login()` (lines 244–279) never checks `user.getMfaEnabled()` — it calls `buildAuthResponse()` and issues full tokens regardless. **MFA is unenforced at the server level**: an MFA-enabled user who completes `/login` gets a full session without ever visiting `/mfa-login`. The no-nonce gap is real defense-in-depth, but the absence of MFA enforcement in `login()` is the more serious structural defect.

**Specific fix** — In `AuthService.login()`, after first-factor success, check `user.getMfaEnabled()`. If true, do **not** call `buildAuthResponse()`; instead store a short-lived signed pre-auth token in Redis (`mfa:pending:<uuid> = userId`, TTL 5 min) and return a `202` with only that opaque token. In `AuthController.mfaLogin()`, accept the pre-auth token (not `userId`), resolve+delete it from Redis, verify TOTP, then issue full tokens.

---

### M-3 / M-4 / M-5 — Same-tenant IDOR on resource-by-ID reads

**Evidence**
- `TaxDeclarationController.java:73` — `GET /{id}` gated by `STATUTORY_VIEW` **OR** `TDS_DECLARE` (every employee has the latter); service does `findByIdAndTenantId` with no `employeeId` owner check. Exposes income, 80C/80D/80G investments, previous-employer income — full tax PII.
- `PerformanceReviewController.java:82` — `GET /{id}` gated by `REVIEW_VIEW` (every employee has it); no owner/reviewer check. Exposes ratings, manager comments, competency scores.
- `SelfServiceController.java:53` — `GET /profile-updates/{requestId}` gated by `EMPLOYEE_VIEW_SELF`; no owner check. **Upgraded LOW→MEDIUM** because `UpdateCategory` includes `BANK_DETAILS`/`PERSONAL_INFO`/`ADDRESS` and the response returns `currentValue`/`requestedValue` as unmasked plaintext — exposes bank account numbers. The `cancel` path already checks ownership correctly (the asymmetry is the bug). Same gap at `SelfServiceController.java:121` (document request GET).

**Attack scenario** — An employee discovers/guesses another employee's resource UUID (via the companion `/employee/{employeeId}` listing endpoints, manager workflows, notifications, or URL leakage) and reads sensitive PII belonging to a co-worker in the same tenant.

**Why it survived verification** — All three confirmed against source and RLS migrations: RLS policies enforce only `tenant_id`, never per-employee ownership; no `app.current_employee_id` GUC exists anywhere. `@RequiresPermission` is a pure RBAC gate. MEDIUM because exploitation requires an authenticated same-tenant session plus UUID discovery, and cross-tenant access is blocked.

**Specific fix** — Add a service-layer ownership guard after the `findByIdAndTenantId` fetch in each service. Pattern (mirroring the correct `cancel` path):

```java
UUID callerId = SecurityContext.getCurrentEmployeeId();
boolean privileged = SecurityContext.hasPermission(Permission.STATUTORY_VIEW); // or REVIEW scope / EMPLOYEE_UPDATE
if (!privileged && !entity.getEmployeeId().equals(callerId)) {
    throw new AccessDeniedException("Access denied");
}
```

Apply to `getTaxDeclarationById` (+ update/submit/delete), `getReviewById` (+ `/employee/{employeeId}`, `/pending/{reviewerId}`), `getProfileUpdateRequestById`, and `getDocumentRequestById`. Consider adding `findByIdAndEmployeeIdAndTenantId` repository methods to push the check into the query.

---

### M-6 — Sort-field SQL injection via unvalidated Pageable

**Evidence** — `backend/src/main/java/com/nulogic/infrastructure/notification/repository/NotificationTemplateRepository.java:44`

```java
@Query(value = "SELECT * FROM notification_templates t WHERE t.is_deleted = false AND t.tenant_id = :tenantId ...",
       nativeQuery = true)
Page<NotificationTemplate> searchTemplates(@Param("tenantId") UUID tenantId,
    @Param("category") String category, @Param("search") String search, Pageable pageable);
```

**Attack scenario** — `GET /api/v1/notifications/templates?sort=name,injection--`. Because the native query has no hardcoded `ORDER BY`, Spring Data's `QueryUtils.applySorting` appends the client-controlled sort column verbatim (confirmed by bytecode inspection; JSqlParser not on classpath, so no identifier validation). ORDER-BY injection enables boolean-based blind inference (`ORDER BY CASE WHEN … THEN …`).

**Why it survived verification** — Confirmed reachable; `XssRequestWrapperFilter` strips HTML but not SQL tokens; no global `allowedFields` resolver configured anywhere. Downgraded HIGH→MEDIUM: ORDER-BY position cannot write data, stacked queries are blocked by the PG JDBC driver, and RLS keeps inference intra-tenant. Limited to slow blind inference over the attacker's own tenant's template metadata.

**Specific fix (preferred)** — Add a hardcoded `ORDER BY t.updated_at DESC` to the native query and strip sort from the Pageable. Alternatively validate at the controller against an allowlist before building the PageRequest (mirroring the existing `PerformanceReviewController.java:75` `ALLOWED_SORT_FIELDS` pattern). Also confirm Wiki/Blog `searchByTenant*` queries strip Pageable sort.

---

### M-7 — AV scan fails open on ClamAV error

**Evidence** — `backend/src/main/java/com/nulogic/application/document/service/FileStorageService.java:334`

```java
case VirusScanService.Error error -> {
    // Fail open — see method javadoc.
    log.warn("SECURITY virus-scan error filename={} reason={} — upload allowed", ...);
}
```

Not profile-guarded; in prod (`VIRUSSCAN_ENABLED:true`) the active `ClamAvScanner` returns `Error` on any IOException, and uploads proceed unscanned.

**Attack scenario** — An authenticated `DOCUMENT_UPLOAD` holder uploads malware during any clamd outage/restart window. The MIME+magic-byte allowlist blocks bare executables but not malware embedded in a valid PDF/DOCX/XLSX container.

**Why it survived verification** — Fail-open branch confirmed, not profile-guarded; reachable only by authenticated permissioned users; structural validation is partial. MEDIUM confirmed.

**Specific fix** — Add `app.security.virusscan.fail-open` (default `true` for back-compat). In prod set `false`, or implement a circuit-breaker: after N consecutive `Error` results within M minutes, block uploads and emit a high-severity alert. Reconcile the contradictory `VirusScanService.java:15` javadoc ("fail closed in prod").

---

### M-8 — BCrypt at default cost 10

**Evidence** — `SecurityConfig.java:86` `return new BCryptPasswordEncoder();` and `AccountLockoutService.java:47` (second instance for timing equalization). Bytecode confirms the no-arg constructor hardwires strength 10. `docs/security/baseline.md:87` documents cost 12.

**Why it survived verification** — Confirmed; online controls (rate-limit, lockout) are irrelevant to offline GPU cracking; no `upgradeEncoding`/rehash mechanism exists. MEDIUM — bcrypt-10 is not broken, but ~4× faster to crack than 12 if the hash column leaks.

**Specific fix** — `new BCryptPasswordEncoder(12)` in both locations; update `DUMMY_HASH` to a precomputed cost-12 value. Existing hashes need no migration (`matches()` reads cost from the prefix); optionally wire `upgradeEncoding()` to rehash on next login.

---

### M-9 — TOTP code replay within acceptance window

**Evidence** — `MfaService.java:227` — `validateTotp` accepts current ±1 time-step (~90s) with no used-code tracking; `verifyMfaCode` is `@Transactional(readOnly=true)` (cannot record use); MFA failures do not feed `AccountLockoutService`.

**Why it survived verification** — Confirmed; rate-limit bucket is IP-keyed pre-auth so a different-IP replay faces no throttle. RFC 6238 §5.2 requires used codes be rejected. MEDIUM — requires the attacker to have already broken the first factor and observed the OTP.

**Specific fix** — Track last-accepted step per user in Redis:

```java
String key = "totp:used:" + userId + ":" + matchedTimeStep;
if (Boolean.FALSE.equals(redis.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(90)))) {
    return false; // already used
}
```

---

### M-10 — TOTP QR-code URL generation is broken (MFA enrollment non-functional)

**Evidence** — `MfaService.java:372`

```java
return String.format("otpauth://totp/NU-AURA:%%s?secret=%%s&...", email, secret)
        .replace("%s", email).replace("%s", secret);
```

**Why it survived verification** — **Upgraded LOW→MEDIUM.** The original finding assumed only `%s`-containing emails break; verification by execution proved it is universal: `%%s` renders literal `%s` (varargs ignored), then `.replace("%s", email)` replaces **both** tokens with the email, and the second `.replace` is a no-op. **Every** generated QR encodes the email as the TOTP secret, so no user can ever enroll MFA (their authenticator-derived codes never match the correctly-stored DB secret). This renders an advertised security control unavailable to all users.

**Specific fix**

```java
return String.format(
    "otpauth://totp/NU-AURA:%s?secret=%s&issuer=NU-AURA&algorithm=SHA1&digits=6&period=30",
    URLEncoder.encode(email, StandardCharsets.UTF_8), secret);
```

---

### M-11 — Google OAuth tokens (Gmail/Drive scopes) in sessionStorage

**Evidence** — `frontend/lib/utils/googleToken.ts:33` writes the token to three sessionStorage keys; scopes (lines 92–106) include `gmail.send`, `gmail.modify`, `drive.file`, `calendar.events`. The file's own comment acknowledges the risk.

**Why it survived verification** — MEDIUM. No active unguarded XSS sink exists today (all `dangerouslySetInnerHTML` sites use DOMPurify). But the production CSP carries `'unsafe-inline'` (see M-13), so CSP provides **zero** backstop if any future sink/DOMPurify bypass/supply-chain compromise lands — at which point `sessionStorage.getItem('nu_google_token')` is trivially readable, enabling email-send/Drive access beyond the HRMS.

**Specific fix** — Migrate Google token storage to a backend-proxied httpOnly cookie session (the file already identifies this). Interim: request `gmail.*` scopes lazily only when the Mail module opens, not at login. Pair with the CSP nonce fix (M-13).

---

### M-12 — Impersonation JWT stored in sessionStorage, never consumed

**Evidence** — `frontend/app/admin/system/page.tsx:71` writes `impersonationToken` to sessionStorage; grep confirms **no** code anywhere reads it. The flow stores three values then `router.push('/admin')` using the SuperAdmin's normal cookie session.

**Why it survived verification** — MEDIUM. Two real problems: (1) the impersonation feature is functionally broken — no tenant context switch occurs; (2) a valid 15-min cross-tenant-capable JWT sits in JS-accessible storage. If sent as an `Authorization` header it would be honored by `JwtAuthenticationFilter`. XSS-gated, but the consequence is the highest-privilege lateral movement in the system.

**Specific fix** — Either (a) use the token immediately for the redirect (send as `Authorization` to establish tenant context) and never persist it, or (b) discard it immediately after the server call since the frontend makes no use of it. Complete the impersonation flow so the context switch works, and apply a short backend TTL.

---

### M-13 — CSP `script-src` contains `'unsafe-inline'`

**Evidence** — `frontend/proxy.ts:251` — `script-src 'self' 'unsafe-inline' https://accounts.google.com …`

**Why it survived verification** — Downgraded HIGH→MEDIUM. Not directly exploitable: every user-derived `dangerouslySetInnerHTML` passes through DOMPurify 3.4.5 with allowlists; wiki/blog render Tiptap ProseMirror JSON, not raw HTML; the one inline script (`layout.tsx:62`) is static. But `'unsafe-inline'` eliminates CSP as a second layer — a future DOMPurify bypass would have no browser-enforced backstop. This is the enabling weakness behind M-11 and M-12.

**Specific fix** — Implement per-request nonces in `proxy.ts`, inject into Next.js script tags, and replace `'unsafe-inline'` with `'nonce-{NONCE}' 'strict-dynamic'`. Use a hash-based policy for the single static theme script.

---

### M-14 — Auth rate-limit fails open (60/min) on Redis outage

**Evidence** — `RateLimitingFilter.java:184` — on `RuntimeException`, `redisAvailable.set(false)` and the in-memory fallback `createBucket` applies a type-unaware 60/min (120 for authenticated). The fail-closed AUTH logic in `DistributedRateLimiter` is bypassed because `tryAcquire` is only called when `redisAvailable.get()` is true.

**Why it survived verification** — Downgraded HIGH→MEDIUM. `AccountLockoutService` (5 attempts/15min per account, with its own ConcurrentHashMap fallback) survives Redis failure and caps per-account damage hard. The window is real for cross-account credential stuffing during an outage, but per-account lockouts accumulate quickly.

**Specific fix** — Pass `RateLimitType` into `createBucket`; for `AUTH`, apply 5/min regardless of `requestsPerMinute` (or mirror fail-closed). This also fixes the related EXPORT fallback gap (see M-15).

---

### M-15 — ExportController unbounded payload

**Evidence** — `ExportController.java:156` — `ExportRequest.data` is a `List<Map<String,Object>>` with no `@Size`; `ExportService.export()` builds an `XSSFWorkbook`/PDF in heap from all rows. The endpoint accepts `application/json` via `@RequestBody`, so the 10MB **multipart** cap does not apply — there is no body-size cap (GCE ingress, no nginx `client_max_body_size`).

**Why it survived verification** — Downgraded HIGH→MEDIUM. EXPORT rate-limit (5/5min per user) limits frequency when Redis is healthy; outcome is transient pod OOMKill + K8s restart, not data loss. Note the compounding fallback gap: when Redis is down, `createBucket` grants ~1200/min for the EXPORT path.

**Specific fix** — `@Size(max = 10_000)` on `data`, `@Size(max = 200)` on `headers`/`columnKeys`, plus a service-layer `MAX_EXPORT_ROWS` guard. Fix the fallback bucket to use EXPORT-specific config.

---

### M-16 — Unbounded user-supplied page `size`

**Evidence** — `CompOffController.java:75` `@RequestParam(defaultValue="20") int size` → `PageRequest.of(page, size, …)` with no `@Max`. Same in `LmsController`, `NotificationController`, `ShiftManagementController`, `ShiftSwapController`, `ImplicitRoleRuleController`, `JobBoardController`, `ProjectController`, `ResourcePoolController`, `DocuSignController` (manually clamps), and others. `app.pagination.max-page-size` is documentation-only — never wired to `spring.data.web.pageable.max-page-size`.

**Why it survived verification** — Confirmed; these controllers bypass `PageableHandlerMethodArgumentResolver` entirely by accepting primitive `int`. `statement_timeout=120s` caps each query but not thread/connection-pool saturation under concurrent `size=2147483647`. RLS keeps results intra-tenant. MEDIUM (DoS, not confidentiality).

**Specific fix** — Add `@Max(100)` to each raw `int size` param (controllers must be `@Validated`), or globally wire `spring.data.web.pageable.max-page-size: 100` in `application.yml` and migrate raw-int controllers to `Pageable`. DocuSign/IntegrationConnector already clamp — replicate.

---

### M-17 — Expense summary loads arbitrary date range

**Evidence** — `ExpenseClaimService.java:481` — `findAll(tenantSpec.and(dateSpec).and(spec))` with no Pageable and no max-range validation; controller accepts raw `startDate`/`endDate`. The URI `/api/v1/expenses/summary` does **not** match the EXPORT pattern (`/export|/report|/download`), so it falls into the API bucket (100/min).

**Why it survived verification** — Confirmed; one request with a 99-year range materializes the full expense history into heap. `DataScopeService` limits `EXPENSE_VIEW` (own-only) holders but not `EXPENSE_VIEW_ALL`/`EXPENSE_MANAGE`. The architecture's own threat model anticipates "insider data dump" but this endpoint bypasses the export rate-limit class. MEDIUM (insider-gated DoS).

**Specific fix** — Validate `ChronoUnit.DAYS.between(startDate, endDate) <= 366` at service entry; classify `/summary` into the EXPORT rate-limit bucket; replace entity-loading `findAll` with a native aggregate (COUNT/SUM by status).

---

## 4. Defense-in-Depth Gaps (not directly exploitable)

These weaken a documented layer but are blocked by a compensating control today. Fix to restore the intended posture and prevent regression.

| ID | Gap | Compensating layer | Fix |
|----|-----|-------------------|-----|
| L-1 | CSRF cookie emits no `SameSite` (Javadoc claims Strict) | Constant-time header-equality check is the real CSRF barrier; browser Lax-by-default | Inject `CookieConfig`, replace `setCsrfCookie()` with `createCsrfCookie()` (already uses `ResponseCookie.sameSite("Strict")`) at `CsrfDoubleSubmitFilter.java:127` |
| L-2 | `__Host-` prefix off by default in prod | No `Domain` attr (exact-host scoping); CSRF filter | Set `COOKIE_USE_HOST_PREFIX=true` in the prod K8s secret (code is migration-ready, dual-emits both names) |
| L-3 | ScheduledReport self-invocation → RLS GUC null | V179 fail-closed returns 0 rows (no leak; empty reports) | Inject self-proxy or extract `executeReport()` to a separate `@Service`; set TenantContext before the `REQUIRES_NEW` boundary |
| L-4 | Upload `category` injected into Drive path key | Drive does not resolve `../`; `drive_file_mapping` is tenant-scoped | Allowlist `category` against the six `CATEGORY_*` constants in `FileStorageService` |
| L-6 | CSP `connect-src` bare `wss:` wildcard | DOMPurify blocks the XSS prerequisite | Remove bare `wss:` at `proxy.ts:253` — `getApiConnectSources()` already emits the specific origin |
| L-8 | CustomReport loads all tenant employees into heap | EXPORT rate-limit; `REPORT_CREATE` gate; intra-tenant only | `employeeRepository.findByTenantId(tenantId, PageRequest.of(0, 500))` — match the 4 sibling builders at `CustomReportService.java:144` |
| L-9 | `RateLimitConfig` dead bean (false-confidence) | Active path is `RateLimitingFilter` + `DistributedRateLimiter` | Delete the class or wire it into the active chain; remove operator-misleading `@Value` capacity props |
| L-5 | Grafana dev compose defaults to `admin` | Prod monitoring compose fails closed (`:?`) | Change `:-admin` to `:?…must be set` at `docker-compose.yml:182`; add to `.env.example` |

---

## 5. Dependency Hygiene

**npm audit (frontend):** 3 critical + 1 high — **all dev-only tooling**, none in the production runtime or the deployed Docker image.

- **vitest / @vitest/ui `^3.2.4`** (`package.json:106,114`) — GHSA-5xrq-8626-4rwp, CRITICAL: arbitrary file read/execute **only when the Vitest UI server is listening** (`npm run test:ui`). Verified: CI never invokes `test:ui` (uses `test:run`); the 3-stage Dockerfile copies only `.next/standalone`, `.next/static`, `public` — `node_modules` (and vitest) never reaches the runtime image. Adjusted **LOW**.
- **tmp <0.2.6** — path traversal, dev only.

**Recommendations**
1. Bump `vitest` and `@vitest/ui` to `^4.1.8` (major bump). `npm audit fix --force` will also pull `exceljs@3.4.0` — evaluate that ExcelJS API change separately rather than blindly accepting the force fix.
2. **Never run the Vitest UI server (`npm run test:ui`) in CI or production**, and not on machines with access to production secrets or on shared developer networks.
3. `gitleaks` is not installed locally — secret scanning in this audit was performed via regex grep. Add `gitleaks` (or `trufflehog`) to the CI security-scan workflow for ongoing coverage.

---

## 6. What Is Already Done Well (do not regress)

- **RBAC** — Dual-layer fail-closed enforcement (`PermissionHandlerInterceptor` + `PermissionAspect`); rejects empty annotations; audit-logs every SuperAdmin bypass; all 184 sampled controllers carry `@RequiresPermission` on every mapped method. Mass-assignment is whitelisted in Payroll/Expense/Employee controllers. Scope hierarchy (ALL > TEAM > DEPARTMENT > SELF) consistently enforced.
- **Tenant isolation** — `SET LOCAL` (transaction-scoped) GUC, correct for PgBouncer transaction mode; V177/V179 removed the OR-NULL fallback and added `FORCE ROW LEVEL SECURITY`; `RlsStartupProbe` verifies at boot; all 27 native queries bind `tenant_id` explicitly; schedulers and Kafka consumers set/clear TenantContext in try/finally.
- **Auth/session** — HMAC-SHA256 JWT with startup secret validation in two places; issuer + audience + blacklist + token-type + tenant-status enforced before context is set; httpOnly/Secure/SameSite=Lax cookies; correct CSRF double-submit; CORS rejects wildcards; Redis-backed account lockout with in-process fallback; `DevSecurityConfig` gated to `dev`.
- **Injection** — All JPQL uses named parameters; no command-injection vectors; no unsafe deserialization; POI/Tika with XXE mitigations; upload extension allowlist + magic-byte validation.
- **SSRF/upload** — Dedicated `SsrfProtectionUtils` (private-IP, CG-NAT, IPv6-ULA, IPv4-mapped, decimal/octal/hex literals, DNS-rebind, redirect blocking) applied across webhooks, SAML, DocuSign, Slack, resume-URL parser; outbound webhook RestTemplate disables redirects and re-validates at delivery; webhook secret rotation (dual-secret window) implemented; files served `Content-Disposition: attachment` + `application/octet-stream`.
- **Secrets/config** — No real secrets in tracked files; all credentials are env refs; JWT secret deny-list; CORS wildcard blocked in code; Swagger off + stack traces suppressed in prod; actuator gated behind SUPER_ADMIN/scrape-token; `ProductionReadinessValidator` enforces mandatory prod values at startup.
- **Crypto** — `SecureRandom` for all token generation; JJWT `parseSignedClaims()` structurally rejects `none`; AES-256-GCM field encryption with per-call random 96-bit IV; server-side password policy (12-char, complexity, history-5, 90-day).
- **Frontend** — Security headers in `next.config.js` + `proxy.ts` (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, full CSP with `frame-ancestors`); `sanitizeReturnUrl()` open-redirect guard; DOMPurify allowlists at every `dangerouslySetInnerHTML`; JWT in httpOnly cookie (never localStorage); no real secrets in `NEXT_PUBLIC_*`.
- **Rate limiting** — Early-chain `RateLimitingFilter` → Redis Lua; AUTH=5/min, API=100/min, EXPORT=5/5min, UPLOAD=20/min; fails closed for AUTH when Redis returns null; no dynamic `Pattern.compile` on user input; non-catastrophic XSS regex.

---

## 7. Recommended Remediation Order

Dependency-aware sequence for the orchestrator. Each step is independently shippable.

1. **H-1 — Purge seeded demo credentials** (`db/migration/V49`, `V173`). Highest impact, single-request SuperAdmin path. Add the purge migration + move seeds to `db/seed` + add `force_password_change`. *Blocks production sign-off.*
2. **H-2 — Privileged-permission denylist** (`RoleManagementService.java:226`, `:275`, `:420`). Closes the privilege-escalation path; mirrors an existing pattern, low blast radius.
3. **H-3 — Wire impersonation JTI into `validateToken`** (`JwtTokenProvider.java:463`) + expose the revoke endpoint. Makes a documented control functional.
4. **M-2 — Enforce MFA in `AuthService.login()` + add pre-auth nonce** (`AuthService.java:244`, `AuthController.java:138`). Closes the structural MFA-not-enforced defect surfaced during verification.
5. **M-10 — Fix the TOTP QR-code generator** (`MfaService.java:372`). One-line fix that restores MFA enrollment for all users (prerequisite for M-2/M-9 to matter).
6. **M-1 / M-3 / M-4 / M-5 — Add ownership guards** to file-upload + tax/review/self-service reads. Batch as one IDOR-hardening pass (shared `SecurityContext.getCurrentEmployeeId()` pattern).
7. **M-6 — Sort-field allowlist / hardcoded ORDER BY** (`NotificationTemplateRepository.java:44`) + sweep Wiki/Blog search queries.
8. **M-8 / M-9 — Crypto hardening**: BCrypt cost 12 (both sites) + TOTP used-code tracking in Redis.
9. **M-13 → M-11 → M-12 — Frontend token/CSP pass**: implement CSP nonces (removes `'unsafe-inline'`), then migrate Google + impersonation tokens off sessionStorage. Order matters — the nonce work unblocks the token fixes' defense-in-depth value.
10. **M-14 / M-15 / M-16 / M-17 — DoS hardening batch**: type-aware AUTH/EXPORT fallback buckets, `@Size` on export payload, `@Max(100)` on page sizes, expense date-range cap.
11. **M-7 — AV fail-open policy flag / circuit breaker** (`FileStorageService.java:334`).
12. **LOW + INFO cleanup batch (L-1…L-9, I-1)**: CSRF SameSite, `__Host-` flag, ScheduledReport proxy fix, Drive category allowlist, Grafana default, `wss:` wildcard, CustomReport pagination, dead RateLimitConfig, K8s gitignore pattern.
13. **Dependency hygiene**: bump vitest/@vitest/ui to `^4.1.8`, document the no-UI-server rule, add `gitleaks` to CI.
