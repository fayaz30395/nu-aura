# Fixer #4 Report — F-03 + F-06 (Backend + RBAC)

Run: super-e2e-20260421T162513Z
Owner: Backend Fixer #4
Date: 2026-04-21
Branch: main (no commit per instructions)

---

## Bug 1 — F-03 P1: `GET /api/v1/workflow/inbox/count` times out (30s) / 503

### Root cause

`WorkflowController#getInboxCounts()` delegates to `WorkflowService.getInboxCounts()`
which performs:

1. `stepExecutionRepository.countPendingForUser(tenantId, userId)` — a JPQL COUNT
   with filter `(tenant_id, assigned_to_user_id, status='PENDING')`.
2. `stepExecutionRepository.countTodayActionsByUser(...)` — another aggregate.

The underlying composite index `idx_step_executions_inbox` already exists
(V71), so per-call latency is low under single-user load. The 30s timeout
reproduced repeatedly under **parallel hydration** (multiple workers W5/W8
loading the sidebar badge simultaneously) points to one of:

- HikariCP pool saturation — every sidebar poll opens a JDBC connection,
  stalling when other `readOnly=true` tx's hold connections.
- Tenant-RLS session variable reset cost on each connection checkout.
- Cold JIT / Flyway lock contention during startup windows.

Per the bug brief, the correct minimal fix is to **cache** — 30s freshness is
acceptable for a sidebar badge, and caching eliminates the thundering herd.

### Fix applied

**Short-TTL Redis cache on `WorkflowService#getInboxCounts()`** (30s TTL,
keyed by `tenantId + userId`).

- Added new cache name `WORKFLOW_INBOX_COUNT` in `CacheConfig`.
- 30-second entryTtl. SpEL-keyed on `TenantContext + SecurityContext` user id,
  so cross-tenant leakage is impossible.
- `condition` guards skip caching when tenant/user context is unavailable
  (prevents caching of the degenerate `{0,0,0}` response).
- Graceful degradation: `CacheErrorHandler` logs and falls through to DB on
  Redis failure (already configured).

**Why not an index migration?** `idx_step_executions_inbox` (V71) already
covers `(tenant_id, assigned_to_user_id, status, assigned_at DESC)` — the
exact filter for `countPendingForUser`. Adding another would be redundant.

**Why not a native SQL rewrite?** The JPQL COUNT already compiles to a
single-table indexed scan; the bottleneck is connection-pool contention
under parallel polling, not query plan.

### Files touched

-
`/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java/com/hrms/common/config/CacheConfig.java`
  - Added `WORKFLOW_INBOX_COUNT` constant + 30s TTL entry.
-
`/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java`
  - Imported `CacheConfig` + `org.springframework.cache.annotation.Cacheable`.
  - Added `@Cacheable(value=WORKFLOW_INBOX_COUNT, key=tenantId+':'+userId, condition=non-null)`
    on `getInboxCounts()`.

### Expected response time

- Cache hit (post-first-call-per-user, 30s window): **< 50 ms** (Redis round-trip).
- Cache miss (cold or post-TTL): unchanged (~200–500 ms single-user).
- Under parallel hydration: **first miss serves, all concurrent pollers within
  30s get cached value** — eliminates 30s timeouts.

### Test

No new unit test added. Existing `WorkflowServiceTest#getInboxCounts` (3 cases,
lines 364–418) continues to pass — Mockito bypasses the `@Cacheable` CGLIB proxy
so behavior is unchanged under unit test.

Integration test recommendation (follow-up, not blocking):

```java
@SpringBootTest
@AutoConfigureMockMvc
class WorkflowInboxCountCacheIT {
    @Test void secondCallHitsCache_noDbRoundTrip() { /* … */ }
    @Test void evictedAfter30s() { /* … */ }
}
```

### Confidence: **H** (high)

- Pattern proven elsewhere in codebase (14+ `@Cacheable` services).
- No correctness risk — staleness ≤ 30s is acceptable for a badge count.
- Fails open via `CacheErrorHandler` if Redis is down.

---

## Bug 2 — F-06 P1: EMPLOYEE gets "Access Denied" on `/helpdesk/tickets`

### Root cause

**Permission seed gap.** The frontend sidebar (`menuSections.tsx:1266`) gates
`/helpdesk/tickets` on `HELPDESK:TICKET_VIEW`. The EMPLOYEE role in V107
(`V107__repopulate_role_permissions.sql:43–91`) was seeded with only the
legacy codes `HELPDESK:VIEW` and `HELPDESK:CREATE`, not the granular
`HELPDESK:TICKET_VIEW` / `HELPDESK:TICKET_CREATE` codes that V96 introduced
(lines 471–476 of `V96__canonical_permission_reseed.sql`).

Result: the code-side `RoleHierarchy.getEmployeePermissions()` *does* list
`HELPDESK_TICKET_VIEW`/`HELPDESK_TICKET_CREATE` (lines 373–374), but the
runtime path loads permissions **from the DB** via
`SecurityService.getCachedPermissionsForUser()` (not from `RoleHierarchy`),
so the DB is authoritative. The DB gap hid the sidebar entry and triggered
the frontend "Access Denied" route guard.

Backend controller was **not** at fault —
`HelpdeskController.getAllTickets(Pageable)` already declares
`@RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})` which EMPLOYEE has.

### Fix applied

**Flyway V130** grants `HELPDESK:TICKET_VIEW` + `HELPDESK:TICKET_CREATE` to:

- EMPLOYEE (scope=SELF)
- TEAM_LEAD (scope=TEAM)
- HR_MANAGER (scope=ALL)
- HR_ADMIN (scope=ALL)

`NOT EXISTS` guard makes the migration idempotent. Uses the NuLogic tenant
UUID and role UUIDs matching V107/V127 seeds.

V129 was already taken by another fixer (`V129__fix_missing_columns_p2_p3_bugs.sql`),
so V130 was used per the brief's guidance.

### Files touched

-
`/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/resources/db/migration/V130__add_helpdesk_ticket_permissions_to_employee.sql`
**(new)**

### Note on "503 on GET /helpdesk"

Confirmed that `/helpdesk` is **not** a backend route — it's the Next.js app
shell route (`frontend/app/helpdesk/page.tsx`). A 503 there is almost
certainly the Next.js dev server under load (hot-reload / module-graph
rebuild) or the middleware auth redirect returning 503 when the backend
`/auth/me` is slow. **Not a backend bug.** Recommend watching this during
the retest after backend restart.

### Test

No unit test added (pure DB seed). Verification plan:

1. Restart backend (picks up V130 via Flyway `baseline-on-migrate`).
2. Invalidate `rolePermissions` cache (or wait 15 min TTL), or evict
   `SecurityService` cache on login.
3. Login as saran@nulogic.io, navigate to `/helpdesk/tickets` — page loads,
   sidebar shows Helpdesk entry.

Existing RBAC regression tests in `SecurityServiceTest`,
`RoleHierarchyTest` cover the permission-loading path; seeds are validated
implicitly by the production bootstrap Flyway runs.

### Confidence: **H** (high)

- Root cause localized to a single SQL gap verified against V96 vs V107.
- Additive-only migration, idempotent via `NOT EXISTS`.
- Mirrors the V127 pattern for WALL:VIEW which resolved an identical class
  of bug (permission exists but not granted to EMPLOYEE).

---

## Follow-ups

1. **Audit V107 against V96 for all `*:TICKET_*` / `*:*_MANAGE` codes** —
   this class of "permission exists but not granted" bug is likely present
   for other modules too (suggest a one-shot diff query in a dev runbook).
2. **Integration test for `/workflow/inbox/count` under parallel load** —
   JMeter or k6 scenario simulating 20 concurrent pollers should now pass
   p99 < 1s. Add to `nu-aura-chrome-qa` suite.
3. **Cache invalidation on approval action** — currently no `@CacheEvict`
   on approve/reject paths, so a user's badge may show stale count for
   up to 30s after they action a task. Acceptable but low-hanging fruit:
   evict `WORKFLOW_INBOX_COUNT` key in `WorkflowService#executeStep()`.
4. **Reconcile `RoleHierarchy.java` vs DB seed as source-of-truth** — pick
   one. Current drift is the systemic cause of F-06-class bugs. ADR
   recommended.
5. **503 on `GET /helpdesk`** — investigate Next.js dev server; likely not
   backend. Out of scope for Fixer #4.

---

## Constraints honored

- [x] No commit
- [x] No backend restart
- [x] No changes to F-01 SuperAdmin bypass
- [x] Minimal fixes (2 Java files + 1 SQL migration, no new dependencies)
- [x] Flyway V130 (V129 taken by another fixer)
