# P0 — Permission scopes are flattened to ALL at runtime

**Severity: P0 (broken object-level authorization).**
**Found:** 2026-09-24, by running authenticated RBAC probes against a live stack.
**Not found by:** 4,503 backend tests + 2,400 frontend tests, all green.

---

## Root cause

`backend/src/main/java/com/nulogic/common/security/JwtAuthenticationFilter.java:166-170`

```java
permissionScopes = new HashMap<>();
for (String dbPerm : dbPermissions) {
    String normalized = normalizePermissionCode(dbPerm);
    permissionScopes.put(normalized, com.nulogic.domain.user.RoleScope.GLOBAL);  // <-- scope discarded
    authorities.add(new SimpleGrantedAuthority(normalized));
}
```

And `backend/src/main/java/com/nulogic/domain/user/RoleScope.java:50`

```java
public static final RoleScope GLOBAL = ALL;   // legacy alias
```

So every permission loaded from the database is assigned **`ALL`** scope. The per-role scope stored
in `role_permissions.scope` (`SELF` / `TEAM` / `DEPARTMENT` / `LOCATION` / `CUSTOM`) is thrown away.

This path is not an edge case — it is the **normal** path. The code comment above it explains why:
CRIT-001 moved permissions out of the JWT to keep the auth cookie under 4096 bytes, so permissions
are now hydrated from the DB on essentially every request.

Downstream, `LeaveRequestController.validateEmployeeAccess` does exactly what it should:

```java
switch (scope) {
    case ALL:
        return;   // allow anything
```

Given `ALL`, it allows everything. The guard is correct; the scope it receives is wrong.

## Confirmed exploit

Plain `EMPLOYEE` (`arun@nulogic.io`, own employeeId `…0009`) reading employee `…0001`:

| Request | Expected | Actual |
|---|---|---|
| `GET /api/v1/employees/{other}` | 403 | **403** ✓ |
| `GET /api/v1/leave-balances/employee/{other}` | 403 | **403** ✓ |
| `GET /api/v1/attendance/employee/{other}` | 403 | **403** ✓ |
| `GET /api/v1/payroll/payslips/employee/{other}` | 403 | **403** ✓ |
| **`GET /api/v1/leave-requests/employee/{other}`** | 403 | **200 — full record** ✗ |
| **`GET /api/v1/leave-requests/{id}`** | 403 | **200 — full record** ✗ |

Leaked fields: `reason` (free text), `status`, `startDate`/`endDate`, `approverId`,
`pendingApproverName`, `requestNumber`. Cross-employee PII, readable by any authenticated employee,
by enumeration or by employee id.

Reproduced independently twice, deterministically.

## Why the other endpoints still denied

They enforce through a different mechanism, or the caller lacks the base permission entirely so
`@RequiresPermission` rejects before scope is consulted. **The flattening only bites where a user
legitimately holds a permission that is supposed to be scope-restricted.** `LEAVE:VIEW_SELF` is
precisely that shape — its whole meaning is the scope.

## Blast radius

- **238 scope-restricted grants are silently elevated**: `SELF` 170, `TEAM` 68 (`role_permissions`).
- `getPermissionScope` is the authorization input at **49 call sites across 13 files**, including
  `LeaveRequestController`, `AttendanceController`, `PayrollController`.
- A plain Employee holds 25+ `SELF`-scoped grants, among them `EMPLOYEE:UPDATE`, `EXPENSE:VIEW`,
  `ASSET:VIEW`, `CONTRACT:VIEW`, `BENEFIT:VIEW`, `LOAN:CREATE`, `HELPDESK:TICKET_VIEW`.
- Confirmed exploitable today: leave-requests (2 endpoints). Every other scope-dependent check
  should be treated as suspect until re-tested, because the underlying input is wrong everywhere.

## Why I did not fix it

This is an authorization redesign, not a patch. The correct fix requires
`SecurityService.getCachedPermissionsForUser` / `getCachedPermissions` to return
`Map<String, RoleScope>` rather than `Set<String>`, threading real scopes through a Redis-backed
cache and the auth filter. A wrong fix fails in one of two unacceptable directions: leave the hole
open, or lock every user out of data they legitimately own. Blast radius is tenant-wide and the
change is security-critical, so it should be human-owned, reviewed, and landed with tests.

## Required fix, designed

1. Change the cached permission lookup to return code → scope, preserving `role_permissions.scope`.
2. Populate `permissionScopes` with real scopes in `JwtAuthenticationFilter`; delete the
   hardcoded `RoleScope.GLOBAL`.
3. Where a user holds the same permission via several roles, resolve to the **broadest** scope
   deliberately and document that precedence.
4. Add `case GLOBAL`-equivalent handling review: since `GLOBAL == ALL`, any genuine "global" grant
   must come from data, never from a default.
5. Regression tests, per role: a `SELF`-scoped holder must get 403 cross-employee; a `TEAM`-scoped
   holder must reach reportees and be denied non-reportees.
6. Re-run the full RBAC probe matrix (`rbac-matrix.md`) and require 26/26 forbidden denials.

## Interim mitigation, if a fix cannot land before exposure

Add an explicit ownership check in `LeaveRequestController.validateEmployeeAccess` that denies when
the caller's only leave permission is `LEAVE:VIEW_SELF` and `targetEmployeeId != currentEmployeeId`,
independent of the scope value. This closes the confirmed exploit without touching the auth filter —
but it is a patch on one controller, not the fix. The systemic defect remains until step 1-2 land.
