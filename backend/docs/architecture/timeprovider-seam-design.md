# TimeProvider Seam — Design Options for Entity `@PrePersist` / `@PreUpdate`

> **Status:** Design proposal (no code changes).
> **Author/Date:** w5-aux-timeprovider-seam, 2026-05-14.
> **Audience:** Reviewers of the unzoned-now backlog (P1 audit/timestamp tier, ~510 sites — most of them live in entity lifecycle callbacks).
> **Scope:** How to make `TenantTimeService` reachable from a JPA `@PrePersist` / `@PreUpdate` callback, which is invoked by Hibernate on a **constructed entity instance** with no DI surface.
> **Out of scope:** P0 service-layer sites (already covered by the
> [migration guide §3.1–§3.3](./tenant-aware-time-migration-guide.md)) and `@CreatedDate` / `@LastModifiedDate` (Spring Data JPA Auditing already sets these via `AuditingEntityListener` on `BaseEntity` — those audit columns are not what this design is about).

---

## 1. Problem statement

NU-AURA has **40+ domain entities** (under `backend/src/main/java/com/nulogic/domain/`) with `@PrePersist` / `@PreUpdate` callbacks that call zero-arg `LocalDate.now()` / `LocalDateTime.now()` to default business-meaningful timestamps. Examples:

| Entity | Callback field | File reference |
|---|---|---|
| `TalentPoolMember` | `addedDate = LocalDate.now()` | `domain/organization/TalentPoolMember.java:45` |
| `BenefitClaim` | `claimDate = LocalDate.now()` | `domain/benefits/BenefitClaim.java` |
| `WorkflowExecution` | `submittedAt = LocalDateTime.now()` | `domain/workflow/WorkflowExecution.java` |
| `StepExecution` | `assignedAt = LocalDateTime.now()` | `domain/workflow/StepExecution.java` |
| `HealthLog` | `loggedAt`, `logDate` | `domain/wellness/HealthLog.java` |
| `CompTimeTransaction` | `transactionDate`, `processedAt` | `domain/overtime/CompTimeTransaction.java` |
| `AuditLog` | `timestamp` | `domain/compliance/AuditLog.java` |
| `DsrRequest` | `requestedAt` | `domain/compliance/DsrRequest.java` |

These are **business-decision fields** (claim date, submission timestamp, signed-on date, transaction date) — not pure audit columns. They influence reports, accrual windows, and SLA timers. When a non-IST tenant onboards, a `LocalDate.now()` running on an `Asia/Kolkata` JVM will set the wrong calendar day for ~24 minutes after IST midnight in any zone east of IST, or for hours before IST midnight in any zone west of it.

The `TenantTimeService` (`common/util/TenantTimeService.java`) is the single resolver. The architecture test (`test/.../TenantTimeArchitectureTest.java`) currently **exempts** `@PrePersist` / `@PreUpdate` from the no-unzoned-now rule precisely because there is no clean injection path — but the [migration guide §3.4](./tenant-aware-time-migration-guide.md#34-entity-prepersist--preupdate) flags this as the hard, unresolved case. The exemption is a known debt: the audit doc (`backend/docs/audit/unzoned-now-audit.md`) puts ~510 P1 sites here.

This document compares three implementation seams so we can pick one and retire the exemption.

### Constraints the chosen seam must satisfy

| # | Constraint | Why |
|---|---|---|
| C1 | Resolve **the calling tenant's** zone, not the JVM default and not a hardcoded fallback for the happy path | Multi-tenant correctness across regions |
| C2 | Work inside a Hibernate lifecycle callback (no constructor injection, no `@Autowired` field on the entity) | JPA spec — entities are POJOs constructed by Hibernate |
| C3 | Thread-safe; flush may happen on the request thread, a `@Transactional` sync, or an async listener thread | Spring `TransactionSynchronization` can run on a different thread than the originating request |
| C4 | Deterministic + cheap to mock for unit tests of the entity | We have ~200 entity-level unit tests that currently use `LocalDate.now()` directly |
| C5 | Retrofit cost should scale with **40 entities**, not 40 × N services | We picked this work because we don't want to refactor every caller |
| C6 | No accidental tenant-leak: a callback firing without an active tenant context must NOT silently fall back to the wrong tenant | Tenant-isolation invariant; better to fall back to a documented default than to read someone else's clock |

---

## 2. Option A — Static-holder `TimeProvider`

### Sketch (illustrative — no code being added by this doc)

```text
common/util/TimeProvider.java       (final class, package-private setter)
  static volatile TenantTimeService delegate;
  static LocalDate today(UUID tenantId)       { return delegate.today(tenantId); }
  static LocalDateTime now(UUID tenantId)     { return delegate.now(tenantId); }
  // package-private — only the wiring adapter may set it
  static void setDelegate(TenantTimeService s)

common/util/TimeProviderInitializer.java   (@Component @PostConstruct)
  @Autowired TenantTimeService service;
  @PostConstruct void wire() { TimeProvider.setDelegate(service); }

domain/.../SomeEntity.java
  @PrePersist
  protected void onCreate() {
      if (claimDate == null) {
          claimDate = TimeProvider.today(getTenantId());
      }
  }
```

### Mechanism

A Spring-managed initializer pushes the live `TenantTimeService` bean into a static volatile field on a sibling utility class during application startup. Entity callbacks call the static methods, which delegate to the bean.

### Evaluation

| Criterion | Verdict | Notes |
|---|---|---|
| **C1 — tenant-aware** | OK | Calls flow through `TenantTimeService.zoneFor(tenantId)`; same fallback chain as everywhere else. |
| **C2 — works in callback** | Yes | Static methods are reachable from anywhere; no DI hop. |
| **C3 — thread safety** | Yes, if `volatile` + initialise-once | `setDelegate` runs once at `@PostConstruct` before any HTTP traffic. After that the field is read-only. The `volatile` guarantees the JIT can't hoist a stale read. **Risk:** if any code path calls a callback before `@PostConstruct` fires (e.g. a `@PostConstruct` method on another bean that itself persists an entity), the delegate is `null` → `NullPointerException`. Mitigation: lazy `Objects.requireNonNullElse(delegate, FALLBACK_PROVIDER)` where `FALLBACK_PROVIDER` returns `LocalDate.now()` with a WARN log, and a `@Bean(initMethod="wire")` configured with `@DependsOn` on every JPA repository factory to nail the ordering. Workable but fiddly. |
| **C4 — testability** | Awkward | Unit tests must reset the static between tests (JUnit 5 `@BeforeEach { TimeProvider.setDelegate(mock); } @AfterEach { TimeProvider.setDelegate(null); }`). Forgetting the reset leaks state across tests run in the same JVM (Surefire fork-by-default mitigates, but flaky test ordering is a smell). Mockito + static mocks (`mockStatic(TimeProvider.class)`) works but is heavier than constructor-injected mocks and requires `mockito-inline`. The bigger problem is **discoverability** — a developer reading the entity sees a static call with no obvious test hook. |
| **C5 — retrofit cost** | Low | One new utility class + one initializer. Each of the 40 entities gets a one-line swap (`LocalDate.now()` → `TimeProvider.today(getTenantId())`). Plus 40 test files get either the static-mock setup or rely on the real bean if it's an integration test. Estimate: **~1.5 days of engineering**. |
| **C6 — no silent tenant leak** | Acceptable | Tenant id comes from `entity.getTenantId()`, which is auto-populated by `TenantEntityListener` on `@PrePersist`. **Risk:** ordering — JPA does not guarantee the order in which multiple listeners' callbacks fire when an entity has both `TenantEntityListener` (via `@EntityListeners` on `TenantAware`) and the entity's own `@PrePersist`. We tested empirically (Hibernate 6) that **`@EntityListeners` runs before in-entity callbacks**, so by the time the entity's own callback runs, `tenantId` is set. But the JPA spec (3.5.4 in JSR-338) does not pin this order, only that all listeners run before in-entity callbacks within a single lifecycle event. This is the only seam that doesn't introduce a fresh tenant-read on its own — it inherits the listener's correctness. |

**Hidden cost.** Static state is a [test-isolation footgun](https://martinfowler.com/articles/staticSubstitute.html) — it breaks the "constructor tells you what you depend on" property that the rest of the codebase observes religiously (every other dependency in NU-AURA is constructor-injected via Lombok `@RequiredArgsConstructor`). Adopting a static seam here normalises a pattern that we'd then have to police elsewhere.

---

## 3. Option B — JPA `EntityListener` with injected `TenantTimeService`

### Sketch (illustrative)

```text
common/entity/TimestampDefaultsListener.java
  @Component
  class TimestampDefaultsListener {
      private static TenantTimeService timeService; // set via @Autowired setter
      @Autowired void setTimeService(TenantTimeService s) { timeService = s; }

      @PrePersist
      public void onPrePersist(Object entity) {
          if (entity instanceof HasClaimDate hcd && hcd.getClaimDate() == null) {
              hcd.setClaimDate(timeService.today(((TenantAware) entity).getTenantId()));
          }
          // ... per-field-interface fan-out
      }
  }

common/entity/HasClaimDate.java        (tagging interface)
  interface HasClaimDate { LocalDate getClaimDate(); void setClaimDate(LocalDate d); }

domain/benefits/BenefitClaim.java
  @EntityListeners({TenantEntityListener.class, TimestampDefaultsListener.class})
  class BenefitClaim extends TenantAware implements HasClaimDate { ... }
```

The listener is a Spring bean that holds a class-level static reference to the live `TenantTimeService`, set via a setter-based `@Autowired` (Hibernate calls listeners with `new TimestampDefaultsListener()` directly unless you wire Spring's `SpringBeanContainer` into the Hibernate properties — which we already do via `hibernate.resource.beans.container` in `application.yml`'s JPA section; this is what makes `TenantEntityListener` work today as a Spring bean).

### Mechanism

Hibernate is configured to resolve entity-listener instances through the Spring container (a one-line property we already use for `TenantEntityListener`). The listener has the live `TenantTimeService` as a normal injected field. The callback runs on the same thread as the flush, reads `entity.getTenantId()` (already set by `TenantEntityListener` running first), and stamps the defaults.

Each "needs-default-timestamp" field becomes a tagging interface (`HasClaimDate`, `HasJoinedAt`, …) so the single listener can dispatch without `instanceof` chains exploding. Alternative: a custom annotation `@DefaultsToTenantToday("claimDate")` read via reflection once per entity class and cached.

### Evaluation

| Criterion | Verdict | Notes |
|---|---|---|
| **C1 — tenant-aware** | OK | Same `TenantTimeService` call, just reached via a different seam. |
| **C2 — works in callback** | Yes | Listener IS the callback. |
| **C3 — thread safety** | Yes | The listener is a singleton Spring bean; `TenantTimeService` is already thread-safe (its only state is the `ConcurrentHashMap` cache). No mutable per-instance state on the listener itself. No reflection-state-machine surface. |
| **C4 — testability** | Best of the three | The listener is a constructor-injected Spring bean — unit-testable in isolation by `new TimestampDefaultsListener(mockTenantTimeService)` and calling `onPrePersist(myEntity)` directly. Entity unit tests that don't care about the listener can ignore it (the listener doesn't fire outside a persistence context). Integration tests get the real wiring for free. |
| **C5 — retrofit cost** | **Highest** | Three moving parts per entity field family: (a) define a tagging interface for each timestamp field name, (b) make each entity implement the right interface(s), (c) register the listener via `@EntityListeners` on each entity (or, more invasively, on `TenantAware`). The alternative annotation-based approach trades interfaces for reflection complexity. Realistically: **~3–4 days** of plumbing + a careful migration commit per module to avoid touching 40 entities in one PR. We also lose the IDE's "go to default" navigability — a developer looking at `BenefitClaim` no longer sees where `claimDate` defaults from. |
| **C6 — no silent tenant leak** | Best | The listener reads `entity.getTenantId()` (set by the prior listener); no thread-local indirection, no static state. If `tenantId` is null at the moment of the callback, the listener can log + fall back deterministically with one place to audit. |

**Hidden cost.** The retrofit grafts a new lifecycle-callback layer onto the persistence model. We already have `TenantEntityListener` on `TenantAware` and `AuditingEntityListener` on `BaseEntity`. A third listener doubles the cognitive surface of "what runs when this entity is persisted." Multi-listener ordering across three listeners (Spring auditing → tenant → defaults) needs to be pinned; current code only pins two.

---

## 4. Option C — Service-layer factories (canonical fix per the migration guide)

### Sketch (illustrative)

```text
application/benefits/service/BenefitClaimService.java
  @Service @RequiredArgsConstructor
  class BenefitClaimService {
      private final BenefitClaimRepository repo;
      private final TenantTimeService time;

      public BenefitClaim create(CreateBenefitClaimCommand cmd) {
          UUID tenantId = TenantContext.requireCurrentTenant();
          BenefitClaim claim = BenefitClaim.builder()
              .tenantId(tenantId)
              .claimDate(time.today(tenantId))    // <— set HERE, not in @PrePersist
              .status(ClaimStatus.DRAFT)
              .build();
          return repo.save(claim);
      }
  }

domain/benefits/BenefitClaim.java
  // @PrePersist removed entirely (or kept only for non-time defaults like status)
```

### Mechanism

The default value is set by the **calling service**, which already has `TenantTimeService` injected and a clear `tenantId` in scope. The entity's `@PrePersist` is either removed (preferred) or stripped of any time-reading logic (status/enum defaults remain).

This is what the [migration guide §3.4](./tenant-aware-time-migration-guide.md#34-entity-prepersist--preupdate) calls "the canonical fix and the one the audit recommends."

### Evaluation

| Criterion | Verdict | Notes |
|---|---|---|
| **C1 — tenant-aware** | OK | `time.today(tenantId)` at the service layer is the same call as everywhere else. |
| **C2 — works in callback** | N/A | Solves the problem by removing the callback rather than fixing it. |
| **C3 — thread safety** | Yes | Service-layer call runs on the request thread under the correct `TenantContext`. No new shared state. |
| **C4 — testability** | Trivial | Mock `TenantTimeService` in the service test (already the pattern in `ContractServiceTest`, `LeaveBalanceServiceTest`, etc.). Entity unit tests get simpler because the callback shrinks or disappears. |
| **C5 — retrofit cost** | **Variable — and that's the catch** | For entities with **one canonical create path** (e.g. `BenefitClaim` only created via `BenefitClaimService.create`), the retrofit is one line moved. Estimate: 30 min per such entity. But entities with **multiple persistence entry points** — workflow approvals creating `StepExecution`, async listeners creating `Notification`, scheduled jobs creating `AuditLog`, Kafka consumers creating `IntegrationEvent` — each entry point now duplicates the defaulting logic. The audit doc shows ~12 of the 40 entities have >1 create path. For those, we'd need a `BenefitClaim::newInstance(tenantId, time)` static factory or a `@Component` factory bean. Realistic estimate across all 40: **~4–5 days**, mostly chasing down call sites. |
| **C6 — no silent tenant leak** | Best | The seam runs in code paths that already have `TenantContext.requireCurrentTenant()` validated. Missing tenant fails loud and early, not silently inside a flush. |

**Hidden cost.** Existing on-entity defaulting is a small encapsulation win — the entity guarantees its own invariants (`claimDate != null` on persist regardless of who created it). Moving it out trades that for explicit-is-better. Risk: a new persistence call site lands without the service-layer stamp and the entity is now nullable where it used to be implicitly non-null. The DB `NOT NULL` constraint catches it at write time, but the failure surface is later than it was. Cross-checked against the unzoned-now audit, none of the 40 entity timestamp fields are currently `nullable=false` — so we'd want to add the DB constraint as part of each migration to recover the guarantee.

---

## 5. Side-by-side comparison

| Dimension | A — Static `TimeProvider` | B — Injected `EntityListener` | C — Service-layer factories |
|---|---|---|---|
| Tenant-aware (C1) | OK | OK | OK |
| Reachable from `@PrePersist` (C2) | Yes (static) | Yes (listener IS the callback) | N/A (removes the callback) |
| Thread-safety (C3) | OK with care (volatile + init ordering) | OK (singleton bean, stateless) | OK (request thread) |
| Mock-ability for entity tests (C4) | Awkward (static reset, `mockStatic`) | Best (constructor-injected bean) | Trivial (service test mocks `time`) |
| Retrofit effort across 40 entities (C5) | ~1.5 days | ~3–4 days | ~4–5 days |
| Risk of silent tenant leak (C6) | Low (inherits listener correctness) | Best (explicit tenant read in one place) | Best (validated early in service) |
| Net change to architecture | Adds a static seam (new pattern in codebase) | Adds a third entity listener (extends existing pattern) | Removes a layer (defaults migrate to services) |
| Affects architecture test exemption | Can drop the `@PrePersist` exemption | Can drop the exemption | Can drop the exemption (callback is gone) |
| Encapsulation impact | Neutral | Neutral (slightly weaker — split across class + listener) | Weakens entity invariant (default moves to caller) |
| Multi-entry-point cost | One line per entity | One line per entity (after plumbing) | Duplicates per entry point |
| Discoverability for new contributors | Worst (static call, no DI breadcrumb) | OK (listener is annotated on entity) | Best (default lives next to the create call) |
| Reversibility | Easy (remove the holder) | Moderate (remove listener + interfaces) | Hard (re-introducing on-entity defaults regresses callers) |

---

## 6. Recommendation — **Option B (injected EntityListener)**

### Rationale

1. **It extends a pattern we already operate.** `TenantEntityListener` is the proof point that Spring-managed JPA listeners work in this codebase, are tested, and survive Hibernate's lifecycle without surprises. We are not introducing a new architecture style; we are reusing the one that solved the structurally identical problem of "inject tenant context into a callback."
2. **It centralises the seam.** All 40 entities defer to a single listener class. When someone adds entity #41 with a new timestamp field, the fix is one new tagging interface on the entity — not "remember to set this field in the service layer or it's null." That property matters for a codebase with ~510 P1 sites: we want the seam to be **hard to forget**, not **easy to remember**.
3. **It preserves entity invariants.** Unlike Option C, the entity still self-defaults — the listener fires regardless of which service called `save()`. Background jobs, async listeners, Kafka consumers, and the eight `@RestController @PostMapping` write paths that bypass the canonical service all get the right tenant-zone default automatically. This is the property that justifies the extra plumbing cost in C5.
4. **Testability is strictly better than Option A.** No static state, no per-test reset, no `mockito-inline`. A pure unit test of the listener is `new TimestampDefaultsListener(mock); listener.onPrePersist(entity); assertThat(entity.getClaimDate())…`. Integration tests get the real Spring wiring with no test-specific configuration.
5. **The retrofit cost is higher than Option A but the carrying cost is lower.** Option A's static seam normalises a pattern (`static volatile delegate`) that we'd then have to defend in code review forever. Option B's listener is a one-time investment that compounds positively — adding a new timestamp default later is "implement `HasFooAt`," not "remember to call the static."
6. **It is consistent with the architecture test.** Once the listener is in place we can **remove the `@PrePersist` exemption** in `TenantTimeArchitectureTest` (lines 56–58 of the rule's Javadoc), which closes the audit loophole and prevents regression.

### What I'd build first (when authorised — not part of this doc)

1. The `TimestampDefaultsListener` Spring bean using the same `hibernate.resource.beans.container` plumbing as `TenantEntityListener`.
2. Pin listener ordering: `AuditingEntityListener` → `TenantEntityListener` → `TimestampDefaultsListener` (`@EntityListeners` order is honoured in Hibernate 6; we'd ArchUnit-assert the annotation order on every `TenantAware` subclass).
3. Migrate **one entity** end to end (`BenefitClaim`) — including its 3 test files — as the reviewer-approved template before fanning out.
4. Drop the `@PrePersist` exemption from `TenantTimeArchitectureTest` once the last entity is migrated.

### When I'd choose Option C instead

If the audit revealed that most of the 40 entities had a **single canonical create path** and the timestamps were already nullable, the Option C migration would be cheaper and cleaner — entity stays simple, no new layer. But the audit shows ~30 % of these entities have multiple persistence entry points (workflow events, Kafka, schedulers), and the timestamps are currently non-null by implicit on-entity defaulting. C trades a small encapsulation loss for a measurable amount of "remember to set this" risk. B avoids the trade.

### When I'd choose Option A instead

Only if we needed an **emergency, single-day** retrofit and we accepted the static-seam debt — for example, if a non-IST tenant signed a contract for next quarter and we had to ship correctness before the audit cleanup. In that case A is the cheapest reversible patch; we'd then migrate to B at our leisure. Today, no such pressure exists — production runs IST-only and the cutover is being sequenced behind region-policy work.

---

## 7. Decision needed

- Approve Option B as the canonical seam for entity-callback time reads.
- Carve a Wave-5 follow-up (or fold into the existing P1 audit ticket) for the listener + a single-entity pilot.
- Once the pilot is reviewed, fan-out across the remaining 39 entities can run as parallel sibling agents (1 entity ≈ 1 hour each, similar shape to the S12-B service-layer wave).

## 8. References

- `backend/docs/architecture/tenant-aware-time-migration-guide.md` — the §3.4 callout this design closes.
- `backend/docs/audit/unzoned-now-audit.md` — the ~510 P1 sites, most of which land in entity callbacks.
- `backend/src/main/java/com/nulogic/common/util/TenantTimeService.java` — the resolver every option delegates to.
- `backend/src/main/java/com/nulogic/common/entity/TenantEntityListener.java` — the existing Spring-managed listener and the proof point for Option B.
- `backend/src/main/java/com/nulogic/common/entity/TenantAware.java` — the `@EntityListeners(TenantEntityListener.class)` mapped superclass that Option B would extend.
- `backend/src/main/java/com/nulogic/common/entity/BaseEntity.java` — the existing `AuditingEntityListener` precedent (Spring Data JPA auditing).
- `backend/src/test/java/com/nulogic/architecture/TenantTimeArchitectureTest.java` — lines 56–58, the exemption we want to retire.
