# BLOCKER-001 — RBAC scope flattening (P0) — code state

Commit examined: `798f46c8` (main) + uncommitted working tree
Status: IN_PROGRESS (code fix present; execution/live verification pending)

## Root cause (original, 2026-09-24 @ 2b4832cb)

`JwtAuthenticationFilter` stamped every DB-hydrated permission with `RoleScope.GLOBAL` (== ALL),
discarding `role_permissions.scope`. Every scope check then evaluated as ALL → cross-employee PII
leak (leave-requests).

## Current code state (verified by reading the file)

`backend/src/main/java/com/nulogic/common/security/JwtAuthenticationFilter.java:162-180`

- Loads real scopes: `securityService.getCachedPermissionScopesForUser(userId, roles)` (userId branch),
  else `getCachedPermissionScopes(roles)`.
- Fail-closed: null scope becomes `RoleScope.SELF`, never ALL.
- No `RoleScope.GLOBAL` assignment remains on this DB-hydration path (only the legacy
  UserDetailsService fallback at line 197, which is not the cookie-auth path).
- Fix commit on main: `3bcb7f31` (SEC-1).

`SecurityService.java:203` — `getCachedPermissionScopesForUser` returns `Map<String, RoleScope>`,
`@Cacheable` under `ROLE_PERMISSIONS`, key `'permissionScopes:' + ...`.

`SecurityContext.java:279` — `hasPermissionAtLeast(String, RoleScope)` scope-aware check (additive;
`hasPermission` unchanged).

IDOR closures using `hasPermissionAtLeast`:
- `api/benefits/controller/BenefitEnhancedController.java:87-88`
- `application/selfservice/service/SelfServiceService.java:268`
- (plus expense services per commit `d4e316e8`)

`PermissionCacheEvictor.java` (untracked) — after-commit, coalesced permission-cache eviction;
wired in `ImplicitRoleEngine` and `AdminService`.

## What is NOT yet proven

- No execution evidence yet for the RBAC regression tests (`PermissionScopeCacheTest`,
  `HasPermissionAtLeastTest`, `BenefitEnhancedIdorTest`, `SelfServiceIdorTest`,
  `ExpenseItemAuthorizationIntegrationTest`, ...).
- No live authenticated RBAC probe (needs a running stack) → the 26/26 forbidden-denial matrix is
  not re-verified. This is the acceptance gate for BLOCKER-001.

## Assessment

Systemic fix is implemented. BLOCKER-001 remains IN_PROGRESS until backend tests run green and a
live RBAC probe reproduces 26/26 denials.
