# TimeAuditingEntityListener — Read-Only Review

**Scope.** Pilot review of the new tenant-zone PrePersist/PreUpdate listener and its supporting
annotation against the `RecognitionReaction` pilot entity.

**Files reviewed.**

- `backend/src/main/java/com/nulogic/common/util/TimeAuditingEntityListener.java`
- `backend/src/main/java/com/nulogic/common/util/TenantTimestamp.java`
- `backend/src/main/java/com/nulogic/domain/recognition/RecognitionReaction.java`

**Cross-references read.**

- `backend/src/main/java/com/nulogic/common/util/TenantTimeService.java`
- `backend/src/main/java/com/nulogic/common/entity/TenantEntityListener.java`
- `backend/src/main/java/com/nulogic/common/entity/TenantAware.java`
- `backend/docs/architecture/timeprovider-seam-design.md`
- `backend/docs/audit/prepersist-now-audit.md`

**Verdict.** `ship-with-followups`. The listener is correctly designed and the pilot binding is
sound. There are five concrete follow-ups, none of which block enabling additional entities, but
two (F1 reflection cache memory-visibility and F4 test coverage gap) should land before the
remaining 33 callbacks are migrated.

---

## 1. Thread safety

| Concern                                          | Verdict     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|--------------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Static `timeService` reference                   | OK          | Declared `volatile` (line 91). Read on every callback (line 172), written exactly once by the Spring setter at startup (line 104). Acquire/release happens through the volatile, so the JPA flush thread is guaranteed to see the assignment regardless of which thread refreshed the context.                                                                                                                                                                                                                                                                                                     |
| `FIELD_CACHE` (`ConcurrentHashMap<Class, List<Field>>`) | Mostly OK   | Concurrent reads/writes are safe. The race exists where two threads can race on `annotatedFields()` for the same unseen class, both build the field list, and one of the `FIELD_CACHE.put()` calls overwrites the other — benign, both lists are equal-content and `List.copyOf` is immutable. The cache value is an immutable list, so iteration is safe.                                                                                                                                                                                                                                            |
| `Field.setAccessible(true)` race                 | **F1**      | The setter call (line 226) happens during cache build but the resulting `Field` reference can already be in the `found` list returned to the caller of the racing thread that lost the `put`. Because `Field.setAccessible` mutates non-volatile internal state and we then publish the list through a happens-before-safe `ConcurrentHashMap.put`, this is safe **on the winning thread's `Field`**, but the losing thread is iterating a `Field` it set accessible itself — both work. The wider concern is that on JDK 17 `setAccessible` against a private field across module boundaries can spam reflective-access warnings if the entity package is ever moved to a non-opens module; not a bug today, document for future.   |
| Re-entrancy / nested flush                       | OK          | Listener does not call back into JPA. The only external call is `timeService.now(tenantId)` which loads the tenant zone via `TenantRepository.findById` — that runs through the same `EntityManager`. This is the same shape as the existing `TenantEntityListener` (which also reads `TenantContext` only), so any latent issue would have already surfaced.                                                                                                                                                                                                                                  |
| Bulk-update / `EntityManager.merge` semantics    | OK (note)   | `@PreUpdate` fires per managed entity per flush. No problem for the pilot, but the `updateOnChange=true` semantic restamps the field on **every** flush even if no business field changed (Hibernate detects dirty state but JPA spec mandates the callback). This matches the legacy `updatedAt = LocalDateTime.now()` pattern in the audited 26 entities, so it is intentional. Worth calling out in the rollout doc.                                                                                                                                                                            |

**F1 (Recommended).** Drop a one-line comment on `FIELD_CACHE` capturing the benign duplicate-build
race so future maintainers don't add a `synchronized` block they don't need; and add a JDK-17
note about the `setAccessible` opens-module assumption.

---

## 2. Reflection cache correctness

The cache walks the superclass chain (lines 213-230) until it hits `Object.class`. That correctly
picks up `@TenantTimestamp` on inherited fields (e.g. if `BaseEntity` ever grew an audited
timestamp). Verified against `TenantAware extends BaseEntity` — the walk would visit:

```
RecognitionReaction → TenantAware → BaseEntity → Object.class (stop)
```

Three issues to note:

- **F2 (Cosmetic).** `Class.getSuperclass()` returns `null` for interfaces; the loop guards on
  `current != null && current != Object.class` (line 214), so an interface-typed entity class
  would terminate cleanly. JPA entities can't be interfaces, so this is fine — but the same
  walker is used unconditionally on `entity.getClass()` in `onPrePersist`, which by JPA contract
  is a concrete entity. No change needed; just call out the assumption.
- **F3 (Real).** Two `@TenantTimestamp` fields with the same name — one in the entity, one on a
  superclass — both end up in the list. Field reflection compares by `Field.getDeclaringClass()`,
  so the entity's override correctly hides the superclass field at the language level, but
  the listener will stamp **both** the entity's field and the superclass's hidden field. With
  Lombok `@Getter`/`@Setter` and `@SuperBuilder`, this is not a current risk (no Lombok-generated
  entities shadow inherited audited fields). Document for the wider rollout: do not shadow an
  audited field in a subclass.
- **OK.** The sentinel `EMPTY` (line 84) prevents re-scanning classes with no annotations on
  every flush — important because the listener is registered on entities globally only when
  added via `@EntityListeners`, but Hibernate still invokes annotated methods for any entity
  the listener is bound to.

---

## 3. Listener ordering vs `TenantEntityListener`

This was the highest-risk question. The pilot binds the new listener at the entity level:

```java
// RecognitionReaction
@EntityListeners(TimeAuditingEntityListener.class)
public class RecognitionReaction extends TenantAware { ... }
```

and `TenantAware` (mapped superclass) declares:

```java
@EntityListeners(TenantEntityListener.class)
public abstract class TenantAware extends BaseEntity { ... }
```

JPA spec §3.5.4 ("Multiple Lifecycle Callback Methods for a Lifecycle Event") fixes ordering as:

> Default listener (none here) → superclass listeners (highest ancestor first) → entity-class
> listeners → in-entity callback method.

Therefore on `@PrePersist`:

1. `TenantEntityListener.onPrePersist` runs (declared on `TenantAware`, ancestor).
2. `TimeAuditingEntityListener.onPrePersist` runs (declared on the entity itself).
3. (No in-entity `@PrePersist` left on `RecognitionReaction`.)

So `tenantAware.getTenantId()` is guaranteed populated from `TenantContext` by the time the
auditing listener reads it (line 119). **Ordering is correct.** The javadoc at lines 44-49 of
`TimeAuditingEntityListener` documents this contract — that doc is accurate.

**Caveat for the wider rollout.** Any entity that lists *both* listeners directly at the entity
level must put `TimeAuditingEntityListener` **second** in the `@EntityListeners` array — the
javadoc says this and it matches §3.5.4. The rollout doc in `TenantTimestamp` step 4 also says
this. Worth adding an `ArchUnit` rule in a future sprint to enforce mechanically.

---

## 4. Fallback behavior when `TenantTimeService` bean not yet wired

`resolveNow` (lines 171-182) reads the volatile `timeService` reference and falls back to
`LocalDate.now()` / `LocalDateTime.now()` with a WARN log when `null`. Reachable paths:

| Scenario                                                                                 | Likely?    | Behavior                                                                                                                                                                                                                                                                  |
|------------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Hibernate constructs the listener directly (no `SpringBeanContainer`)                    | Test only  | Listener still works because the static field was set by Spring on the bean it created; the Hibernate-constructed instance shares the same static. Verified — the design is sound.                                                                                         |
| Entity is persisted during another bean's `@PostConstruct` before this bean's setter runs | Rare       | Falls back to JVM default zone with WARN. Acceptable for very early startup; logged loudly enough to find.                                                                                                                                                                  |
| Spring context refresh fails after this bean wired                                       | N/A        | Static field stays set; if Spring later rewires, the new setter call updates the volatile cleanly.                                                                                                                                                                          |
| Tests that boot only a JPA slice (`@DataJpaTest`)                                        | **F4**     | Spring `@DataJpaTest` will NOT load `TimeAuditingEntityListener` unless `TenantTimeService` and its transitive `TenantRepository` are explicitly imported. The fallback path will fire, logging WARN on every persist. Tests that persist `RecognitionReaction` need a `@MockBean TenantTimeService` or `@Import(TenantTimeService.class)`. |
| Production cold start                                                                    | OK         | `@Component` is eagerly initialised; setter fires during context refresh before any HTTP request can land — safe.                                                                                                                                                            |

**F4 (Required for wider rollout).** The pilot has **zero** test coverage of the listener itself:

```
$ grep -rln "TimeAuditingEntityListener\|TenantTimestamp" backend/src/test/
# (no matches)
```

Existing `RecognitionServiceTest` and `RecognitionControllerTest` mock the repository layer so
the listener never fires. Before extending the listener to more entities, land:

1. Unit test for `annotatedFields` cache: persist same class twice, assert cache is hit; persist
   a class with a non-`LocalDate(Time)` annotated field, assert `IllegalStateException`.
2. `@DataJpaTest` (or full `@SpringBootTest`) round-trip on `RecognitionReaction` asserting
   `reactedAt` is set from `TenantTimeService` and equals tenant-zone `now` within tolerance.
3. Pre-wire fallback test: construct the listener directly with `timeService = null`, invoke
   `onPrePersist`, assert a `LocalDateTime.now()` value is stamped and a WARN is logged.
4. Ordering test (preferably ArchUnit): every entity using `@EntityListeners(TimeAuditingEntityListener.class)`
   either extends a `TenantAware`-equivalent or also lists `TenantEntityListener` first.

---

## 5. `updateOnChange` semantics

`@TenantTimestamp(updateOnChange=true)` unconditionally stamps the field on every `@PreUpdate`
even if no business field actually changed. This matches the legacy `updatedAt = LocalDateTime.now()`
pattern documented in `prepersist-now-audit.md` rows where the in-entity `@PreUpdate` was
unconditional.

| Sub-concern                                                       | Verdict | Notes                                                                                                                                                                                                                                                                            |
|-------------------------------------------------------------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| "No change" updates still bump the timestamp                      | **F5**  | Hibernate raises `@PreUpdate` whenever it issues an `UPDATE` even if only dirty-flag fields changed. With `@DynamicUpdate` absent on the pilot entity, an `EntityManager.merge` always produces an UPDATE. This is unchanged from legacy behaviour but worth a one-line javadoc note. |
| `updateOnChange=false` default                                    | OK      | Safe to add the annotation without changing semantics of create-only fields. Pilot field `reactedAt` correctly uses the default.                                                                                                                                                  |
| Caller-supplied value on persist preserved (`null`-guard at 122)  | OK      | Matches "null-guarded callback pattern" called out in the audit. Tests should pin this.                                                                                                                                                                                          |
| Caller-supplied value on update with `updateOnChange=true` clobbered | OK (intentional) | Spec'd in the annotation javadoc (lines 25-27). Just ensure rollout step does not accidentally flip this for fields like `createdAt`.                                                                                                                                          |

**F5 (Cosmetic).** Annotation javadoc says "every `@PreUpdate`" — add one sentence clarifying
this fires even if no field actually changed in the diff (Hibernate's dirty check is on the
managed-state diff, not the audited field itself).

---

## 6. Performance — reflection field walk per entity vs cached

| Path                                            | Cost                                                                                                                                       |
|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| First persist of an entity class                | One `getSuperclass()` walk, ~3-4 levels for `TenantAware extends BaseEntity`. ~5-15 µs worst case. `setAccessible(true)` once per field.   |
| Subsequent persists                             | `ConcurrentHashMap.get` (~10-50 ns) + array iteration (1-3 fields typical). Negligible.                                                    |
| `field.get(entity)` / `field.set(entity, val)`  | JDK 17 `MethodHandle`-backed reflection, ~10-30 ns per call after the first few. No measurable overhead for a 1-3 field set.                |
| `TenantTimeService.now()` per call              | Reads the per-tenant cache (5min TTL ConcurrentHashMap) — typically a hit. On miss, one `TenantRepository.findById` — adds one SELECT per cache window. Acceptable. |

**Verdict: not a concern.** The reflection cache is correct and bounded. The hot path is array
iteration over (typically) one `Field`. The `TenantTimeService` cache has its own 5min TTL
(R2 mitigation noted in the file, lines 58-59). No reason to add a `MethodHandle` fast-path
unless profiling later shows the JPA flush dominated by this listener.

**Cache size unboundedness.** `FIELD_CACHE` has no size cap. In practice the cache size equals the
number of entity classes annotated with `@TenantTimestamp` — bounded by the codebase, ~33 max
once the rollout completes. **OK.**

---

## 7. Pilot binding (`RecognitionReaction`)

| Concern                                                              | Verdict | Notes                                                                                                                                                                                                                                                                                  |
|----------------------------------------------------------------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `@TenantTimestamp` on `reactedAt`                                    | OK      | Type is `LocalDateTime`, supported.                                                                                                                                                                                                                                                    |
| `@EntityListeners(TimeAuditingEntityListener.class)` at entity level | OK      | Combined with the inherited `@EntityListeners(TenantEntityListener.class)` on `TenantAware`, ordering is correct per §3.5.4.                                                                                                                                                          |
| Removal of the legacy in-entity `@PrePersist`                        | OK      | Old `@PrePersist` is gone (entity has no callback methods). The audit doc row 21 said to remove it; the file confirms removal.                                                                                                                                                          |
| `@Where(clause = "is_deleted = false")` interaction                  | OK      | `@Where` is a query-time filter; does not interact with `@PrePersist` listeners.                                                                                                                                                                                                       |
| `@SuperBuilder` building with explicit `reactedAt`                   | OK      | Caller-supplied value wins (null guard at line 122). No regression for `RecognitionReactionFactory`-style builders that pre-set the timestamp in tests.                                                                                                                                |

---

## 8. Test coverage gap (summary of F4 expanded)

| Area                                              | Coverage                                |
|---------------------------------------------------|-----------------------------------------|
| `TimeAuditingEntityListener` (any test)           | **None** — `grep -rln` returned nothing |
| `@TenantTimestamp` annotation processing          | **None**                                |
| `RecognitionReaction.reactedAt` round-trip        | None (service/controller tests mock the repo, so the listener never fires) |
| `TenantTimeService.now(...)` integration          | Yes — `TenantTimeServiceIntegrationTest`, `TenantTimeServiceTest`           |
| Architecture rule that bans `LocalDate(Time).now()` in `@PrePersist` callbacks | Yes — `TenantTimeArchitectureTest` (with documented exemptions)             |

The annotation javadoc step 5 says to "drop the `@PrePersist` exemption" in
`TenantTimeArchitectureTest` once the final entity migrates. Until then, every entity migration
should add itself to the exemption-removal list.

---

## Follow-up summary

| ID  | Severity   | Title                                                                | Blocking wider rollout? |
|-----|------------|----------------------------------------------------------------------|-------------------------|
| F1  | Minor      | Document benign cache-build race + JDK-17 module-opens assumption    | No                      |
| F2  | Cosmetic   | Document interface/concrete-class assumption in superclass walk      | No                      |
| F3  | Minor      | Document "do not shadow audited fields in subclasses" rule           | No                      |
| F4  | **Required** | Add unit + slice tests for the listener and pilot entity            | **Yes** (before next entity migrates) |
| F5  | Cosmetic   | Clarify `updateOnChange` fires on every UPDATE, not on field-diff    | No                      |

Additional rollout safety net (nice-to-have):

- ArchUnit rule: every `@EntityListeners` array containing `TimeAuditingEntityListener` must
  either follow a `TenantEntityListener` entry or the entity must extend `TenantAware`.
- ArchUnit rule: `@TenantTimestamp` only on `LocalDate` / `LocalDateTime` fields (mirrors the
  runtime `IllegalStateException` so misuse fails at build time, not first persist).

---

**Reviewer.** code-review-excellence (read-only)
**Date.** 2026-05-14
**Pilot.** RecognitionReaction.reactedAt — 1 of 34 audited callbacks migrated.
