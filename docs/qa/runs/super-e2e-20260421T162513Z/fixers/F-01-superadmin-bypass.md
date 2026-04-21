# F-01 Fix — SuperAdmin `@RequiresPermission` bypass

- Run: `docs/qa/runs/super-e2e-20260421T162513Z/`
- Fixer: Senior Backend Fixer #1
- Severity: P0 (cross-cutting — affected ~10 endpoints for SUPER_ADMIN)
- Confidence: **Medium-High**

## Root Cause

Role-claim **shape drift** between the two JWT issuer paths.

The backend has two token mint paths:

1. `JwtTokenProvider.generateToken(Authentication, tenantId, userId)` at
   `backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java:104-118`.
   Serializes roles with:
   ```java
   .claim("roles", authentication.getAuthorities().stream()
       .map(GrantedAuthority::getAuthority)   // → "ROLE_SUPER_ADMIN"
       .collect(Collectors.toList()))
   ```
   Used by `TenantProvisioningService.java:111` (tenant provisioning → admin user token).

2. `JwtTokenProvider.generateTokenWithAppPermissions(...)` at
   `JwtTokenProvider.java:136-156`. Stores role codes **as-is** (`"SUPER_ADMIN"`).
   Used by `AuthService.java:818` (password / Google / MFA / refresh flows) and
   `SamlAuthenticationHandler.java:213`.

`JwtAuthenticationFilter` reads the claim with `tokenProvider.getRolesFromToken(jwt)`
at line 73 and stores the raw set straight into
`SecurityContext.setCurrentUser(..., roles, ...)` at line 194 — **no normalization**.

Both bypass paths (`PermissionAspect:58` and `PermissionHandlerInterceptor:68`)
gate on `SecurityContext.isTenantAdmin()` → `isSuperAdmin()` →
`hasRole(RoleHierarchy.SUPER_ADMIN)` which is a plain `Set.contains("SUPER_ADMIN")`.

Result: if the request carries a token minted on path (1) — e.g. via the
tenant-provisioning flow, a legacy refresh, or (as the QA report notes) a
cross-tab cookie hijack where a SuperAdmin session gets re-issued through a
mixed pipeline — `currentRoles` contains `"ROLE_SUPER_ADMIN"`, the bypass check
returns `false`, and every `@RequiresPermission` endpoint that the SuperAdmin
does not explicitly hold the permission for returns 403. Endpoints where
SuperAdmin **does** have the explicit permission (most of `/employees`,
`/payroll`, `/dashboard`, etc.) still pass because they fall through to
`SecurityContext.hasPermission(...)` — which is why the failure pattern is
patchy (confirmed in W1's report: `/employees` GET PASS on `/employees` page,
FAIL with `size=500` from `/leave/calendar`).

This matches **Hypothesis 1** from the task brief exactly. Hypothesis 2 was
ruled out (`RoleHierarchy.SUPER_ADMIN = "SUPER_ADMIN"`, DB `roles.code =
'SUPER_ADMIN'` per V19 seed — they agree). Hypothesis 3 was ruled out by
inspecting the filter-chain order in `SecurityConfig.java:224-227` — the JWT
filter populates `SecurityContext` before the MVC interceptor runs.

## Fix (single file)

Normalise the role-claim shape **on lookup** inside `SecurityContext.hasRole()`,
rather than trying to normalise at ~5 token-issuance sites or inside both
bypass interceptors. One change repairs the SuperAdmin bypass for every
`@RequiresPermission` endpoint in the app.

The fix keeps role-code matching **strict on the value** (no case folding, no
substring matches) — only the Spring `ROLE_` prefix is tolerated in either
direction. This is safe because every role code in `RoleHierarchy` is
`UPPER_SNAKE_CASE` and none of them naturally start with `ROLE_`.

### Files Touched

- `backend/src/main/java/com/hrms/common/security/SecurityContext.java`
  - Updated `hasRole(String)` to accept both bare and `ROLE_`-prefixed claim
    shapes (lines 437-477).
  - Simplified `hasAnyRole(String...)` to delegate to `hasRole(String)` so the
    shape tolerance applies uniformly (lines 479-487).

### Diff Summary

`SecurityContext.hasRole` before: one-liner `.contains()`.
`SecurityContext.hasRole` after: null-guard, exact match, `ROLE_`-prefix match
in either direction. No other behavior change.

`SecurityContext.hasAnyRole` before: inlined `.contains()` loop.
`SecurityContext.hasAnyRole` after: delegates to `hasRole`.

All other methods untouched. No controllers modified. No filters modified.

### Test Added

`backend/src/test/java/com/hrms/common/security/SuperAdminBypassTest.java` —
new file, 13 tests across 3 nested groups:

- **HasRoleShapeTolerance** (6): bare claim → bare lookup, prefixed claim →
  bare lookup (the F-01 regression), bare claim → prefixed lookup (symmetry),
  unrelated role does NOT match, null role returns false, empty role set
  returns false.
- **AdminBypassGate** (5): `isSuperAdmin()` and `isTenantAdmin()` both fire for
  each claim shape; `EMPLOYEE` role does not trigger the bypass (regression
  guard).
- **HasAnyRoleShapeTolerance** (1): `hasAnyRole` inherits the shape tolerance.

Test run:

```
mvn test -Dtest='SuperAdminBypassTest,SecurityContextTest'
...
[INFO] Tests run: 74, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

All 13 new tests plus the entire existing `SecurityContextTest` (61 tests) pass
— confirming no regression in the existing strict-match contract for non-admin
roles.

## Why one place, not N

- **Not `PermissionAspect`**: the bypass is already there (line 58), it just
  evaluates against a `hasRole` that doesn't know about the prefix.
- **Not `PermissionHandlerInterceptor`**: same story (line 68).
- **Not `JwtAuthenticationFilter`**: normalising at load time would also work,
  but it would only fix the main request path and would miss any code that
  calls `SecurityContext.setCurrentUser(...)` directly (e.g.
  `TenantAwareTaskDecorator.java:59` in `@Async` tasks). Normalising on lookup
  covers every caller.
- **Not the token issuers**: we'd have to change `generateToken` in
  `JwtTokenProvider.java:104` AND audit every caller that might stuff
  authorities into a token with the `ROLE_` convention still baked in.
  Single-point-of-fix on the consumer side is lower-risk.

## Validation (did not perform live)

Per task instructions I did **not** restart the backend or re-run Chrome E2E.
A targeted re-run of W1 and W10 (the two SuperAdmin workers) against the
hot-swapped `SecurityContext.class` after Spring devtools reload would confirm
all 10 endpoints transition from 403 → 200. Recommended as the next action for
whoever runs the re-verification pass.

## Confidence

**Medium-High.** The fix is bounded (one method in one class), the test
coverage around the exact F-01 shape is explicit, and the before/after
semantics for the non-admin path are proven identical by the surviving
`SecurityContextTest` run. I could not observe the live 403 → 200 flip because
I didn't restart the backend per instructions, which is the only reason this
isn't "High."

## Follow-ups (out of scope for this fix)

1. **Normalise at token-issuance side too** (defense in depth). Add a short
   `normalizeRole()` helper in `JwtTokenProvider.generateToken(Authentication,
   ...)` so the claim always emits the bare role code regardless of the
   `Authentication`'s authority format. Low priority now that consumer-side
   matching is tolerant.
2. **Investigate F-08 under the same lens.** HR_ADMIN 403 cluster on NU-Hire
   may share root cause if HR_ADMIN claims are going through the same
   `generateToken(Authentication)` path. The fix I shipped also benefits
   HR_ADMIN because `hasAnyRole(...)` is now shape-tolerant — but F-08 is
   likely a different issue (missing role→permission grants for HR_ADMIN) per
   the SUPER-E2E report's own analysis. Leave to the F-08 fixer.
3. **Fix cross-tab cookie sharing in the QA harness** (the hijack that
   produced W5's mixed-role session). That's a test-infra issue, not a
   product bug.
4. **Audit `SamlAuthenticationHandler.java:213`** to confirm it uses
   `generateTokenWithAppPermissions` (it does per grep), so SAML SuperAdmin
   logins are not affected by path (1). Mark as verified.

## Not Done

- Not committed.
- Backend not restarted.
- No changes to controllers, filters, interceptors, token provider,
  `RoleHierarchy`, or `PermissionAspect`/`PermissionHandlerInterceptor`.
- No other findings (F-02, F-04, etc.) touched.
