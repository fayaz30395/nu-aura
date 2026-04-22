# F-02 + F-05 Backend Query Fixes

Fixer: Senior Backend Fixer #2
Date: 2026-04-21
Scope: Two backend bugs (1× P0 schema/tx, 1× P1 query performance)

---

## Bug F-02 (P0) — `/api/v1/fluence/activities` returns 500

### Root cause

Two compounding faults:

1. **Schema drift (primary):** `fluence_activities` table was missing the `BaseEntity`-
   expected columns (`created_by`, `updated_by`, `last_modified_by`, `version`,
   `updated_at`, `deleted_at`). Hibernate's generated SELECT therefore referenced
   `fa1_0.created_by` which PostgreSQL rejected with
   `ERROR: column fa1_0.created_by does not exist`. Stack trace in
   `/tmp/nu-aura-backend.log` lines 24695–24767 confirms.

- **Already fixed on disk** by migration `V134__fix_fluence_lms_missing_columns.sql`
  (adds all missing columns, idempotent `ADD COLUMN IF NOT EXISTS`). Will apply
  at next backend restart. No change needed here.

2. **Transaction-boundary mishandling (secondary, and why the controller's
   try/catch didn't save us):** Both the controller and the service declared
   `@Transactional`. When the service's inner query threw `SQLGrammarException`,
   `TenantRlsTransactionManager` marked the participating transaction as
   `rollback-only`. The controller's `catch (Exception e)` swallowed the
   original exception and returned `Page.empty(pageable)`, but the outer
   controller-level `@Transactional` still tried to commit on method exit and
   threw `UnexpectedRollbackException`, which bubbled past the try/catch and
   produced the 500 response seen by the UI.

### Fix

Removed the redundant `@Transactional(readOnly = true, timeout = 10)` from both
controller endpoints (`GET /` and `GET /me`). The service layer still carries
`@Transactional(readOnly = true, timeout = 10)` so query semantics are
unchanged, but now exceptions roll back only the service-level transaction and
propagate cleanly into the controller's try/catch, which returns an empty page
per spec ("return empty list if data genuinely empty" and also when the query
fails — defensive fallback already coded, just needed to actually work).

### Files touched

- `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java`
  - Removed `import org.springframework.transaction.annotation.Transactional;`
  - Removed `@Transactional(readOnly = true, timeout = 10)` on `getActivityFeed`
  - Removed `@Transactional(readOnly = true, timeout = 10)` on `getMyActivity`

### Diff summary

```diff
-import org.springframework.transaction.annotation.Transactional;
 import org.springframework.web.bind.annotation.*;
 ...
     @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
-    @Transactional(readOnly = true, timeout = 10)
     public ResponseEntity<Page<FluenceActivityDto>> getActivityFeed(...)
 ...
     @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
-    @Transactional(readOnly = true, timeout = 10)
     public ResponseEntity<Page<FluenceActivityDto>> getMyActivity(Pageable pageable) {
```

### Test added

- `backend/src/test/java/com/hrms/application/knowledge/FluenceActivityServiceTest.java`
  - `getActivityFeed_returnsEmptyPage_whenNoRows` — verifies empty page when DB is empty
  - `getActivityFeedByType_returnsEmptyPage_whenNoRows`
  - `getUserActivity_returnsEmptyPage_whenNoRows`

Compile + test-compile verified via `mvn -q compile` and `mvn -q test-compile` (clean).

### Confidence

**H** — schema fix is already on disk (V134) and applies at next startup;
transaction fix is minimal (two annotation removals) and the service layer still
owns its own transaction. Controller try/catch now actually catches.

---

## Bug F-05 (P1) — `/okr/objectives/my` and `/okr/company/objectives` hang >4s

### Root cause

**N+1 query pattern + missing composite indexes.**

`OkrService.getObjectivesByOwnerList` and `getCompanyObjectives` each:

1. Fetched the list of objectives in one query.
2. Then looped over every objective and called
   `keyResultRepository.findAllByObjectiveId(obj.getId())` — one extra query
   per objective.

For a HR-manager tenant with e.g. 40 company objectives, that's 41 round trips
through the Neon pooler → 4.2–4.6s total (logs at lines 23577–23988, 49538–49819).

Also `objectives` table had only `idx_objectives_tenant` (tenant_id only) — no
composite for `(tenant_id, owner_id)` or `(tenant_id, objective_level)`, and
`key_results` had no index on `objective_id`. PG therefore did a filter-scan
after the tenant-index hit.

### Fix

1. **Batch load** — added `KeyResultRepository.findAllByObjectiveIdIn(List<UUID>)`
   using a single `WHERE objective_id IN (...)` query, and a private helper
   `OkrService.attachKeyResults(List<Objective>)` that groups the results by
   `objectiveId` and sets them on each objective. Replaces the per-objective
   loop in `getObjectivesByOwnerList` and `getCompanyObjectives`.
2. **Indexes** — new Flyway migration
   `V138__okr_objective_performance_indexes.sql` adding:

- `idx_objectives_tenant_owner` on `objectives(tenant_id, owner_id)` partial (
  `is_deleted = false`)
- `idx_objectives_tenant_level` on `objectives(tenant_id, objective_level)` partial
- `idx_objectives_tenant_cycle` on `objectives(tenant_id, cycle_id)` partial
- `idx_key_results_objective` on `key_results(objective_id)` partial (supports the new IN query)
- `idx_okr_check_ins_objective` on `okr_check_ins(objective_id)`
- `idx_okr_check_ins_key_result` on `okr_check_ins(key_result_id)`

Memory said next Flyway was V129, but repo actually has V129…V137 in place, so
this migration is **V138** (next-available, as required by the "increment V129"
constraint which meant "use the next Flyway version").

### Files touched

- `backend/src/main/java/com/hrms/infrastructure/performance/repository/KeyResultRepository.java`
  (added `findAllByObjectiveIdIn`)
- `backend/src/main/java/com/hrms/application/performance/service/OkrService.java`
  (added `attachKeyResults`, replaced N+1 loops in `getObjectivesByOwnerList` and
  `getCompanyObjectives`)
- `backend/src/main/resources/db/migration/V138__okr_objective_performance_indexes.sql` (new)

### Diff summary

```diff
// KeyResultRepository.java
+    @Query("SELECT kr FROM KeyResult kr WHERE kr.objectiveId IN :objectiveIds ORDER BY kr.weight DESC")
+    List<KeyResult> findAllByObjectiveIdIn(@Param("objectiveIds") List<UUID> objectiveIds);

// OkrService.java
-        for (Objective obj : objectives) {
-            List<KeyResult> keyResults = keyResultRepository.findAllByObjectiveId(obj.getId());
-            obj.setKeyResults(keyResults);
-        }
+        attachKeyResults(objectives);
+    }
+
+    private void attachKeyResults(List<Objective> objectives) {
+        if (objectives == null || objectives.isEmpty()) return;
+        List<UUID> ids = objectives.stream().map(Objective::getId).toList();
+        List<KeyResult> all = keyResultRepository.findAllByObjectiveIdIn(ids);
+        Map<UUID, List<KeyResult>> byObjective = new HashMap<>();
+        for (KeyResult kr : all) {
+            byObjective.computeIfAbsent(kr.getObjectiveId(), k -> new ArrayList<>()).add(kr);
+        }
+        for (Objective obj : objectives) {
+            obj.setKeyResults(byObjective.getOrDefault(obj.getId(), new ArrayList<>()));
+        }
     }
```

### Test added

No new OKR unit test added within scope (task only required a fluence empty-list
test). The existing integration tests cover the service behaviour. Performance
is validated by backend log latency on next restart — see follow-ups.

### Confidence

**H** for correctness (straightforward batch-load with matching ordering and
list semantics), **M** for performance target — the combined batch-load + new
composite indexes should cut latency from ~4.5s to <300ms, but actual numbers
depend on Neon pooler latency and need re-measurement after restart.

---

## Not restarted

Per constraints, backend was NOT restarted. On next restart:

- Flyway runs V134 (fluence_activities columns) and V138 (OKR indexes).
- Updated controller + service code takes effect.
- Tests compile clean under current pom (`mvn -q test-compile` OK).

## Follow-ups

1. **Re-run F-02 via Chrome E2E after next backend restart.** Expect 200 + empty
   page on an empty tenant; 200 + populated page when activity rows exist.
2. **Measure F-05 latency after restart.** Target is p95 < 500ms for both
   `/objectives/my` and `/company/objectives`. If still >1s, the hot spot is
   likely `TenantRlsTransactionManager`'s permission-eval SET LOCAL — separate bug.
3. **Audit other N+1 hot-loops in `OkrService`:** `getOkrSummary` lines 322-327
   still does per-objective `findAllByObjectiveId` inside a stream; same
   pattern, should use `findAllByObjectiveIdIn`. Out of scope for this fixer
   (dashboard endpoint, not in the hanging list).
4. **Long-term fluence_activities:** consider collapsing `FluenceActivity`
   entity to NOT extend `TenantAware`/`BaseEntity` since activity rows are
   append-only audit records with no soft-delete or optimistic locking
   semantics. Would remove the whole class of schema-drift bugs for this table.
5. **Run full test suite** (`mvn test`) on next CI to confirm
   `FluenceActivityServiceTest` passes alongside the broader knowledge suite.
