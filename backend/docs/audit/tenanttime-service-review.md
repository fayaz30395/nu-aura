# TenantTimeService — Code Review

**File:** `backend/src/main/java/com/nulogic/common/util/TenantTimeService.java` (~180 lines)
**Reviewer:** aux-TenantTimeService-CodeReview (read-only, auxiliary)
**Date:** 2026-05-14
**Context:** Load-bearing utility — 28+13+N call sites across schedulers, attendance, payroll,
recruitment, contract, workflow, LMS, statutory engine. Single source of truth for
"what date/time is it for this tenant?".

---

## Summary verdict

**Caveat — LGTM with documented limitations.**

The class is small, focused, and correctly solves the core problem (route every `now()` through
a tenant-aware zone). Thread safety is sound for the cache-hit hot path; the few rough edges
(eviction policy, IST-only default, missing convenience methods) are acceptable for the current
single-region IST footprint but should be tracked as known limitations before the first non-IST
tenant lands. No blockers, no security concerns, no correctness bugs found.

---

## Per-dimension findings

### 1. Thread safety — ⚠️ Acceptable, with one race worth knowing about

`ConcurrentHashMap` makes `get` / `put` / `remove` / `removeIf` individually safe, and
`entrySet().removeIf(...)` and `keySet().iterator()` are explicitly weakly-consistent (no
`ConcurrentModificationException` under contention). The sweep in `evictExpiredOrOldest` is
therefore safe.

**Known races (all benign):**
- Two threads can race past the `size() >= MAX_CACHE_SIZE` check and both enter the sweep —
  cache size may briefly exceed the cap by ~thread-count entries. Soft cap, fine.
- A `put` after `loadZoneFromDb` can overwrite a fresher cached value from a concurrent
  invalidate-then-reload sequence. The window is microseconds and the data is idempotent
  (same DB read), so the worst case is one extra DB lookup. Fine.
- The TTL-check/`put` pair is non-atomic; two threads can both DB-hit on the same expired key.
  Acceptable thundering herd of N (number of threads), not N (number of jobs).

No locks, no `synchronized`, no `compute*` — and that is correct for this workload. Stronger
atomicity would buy ~zero correctness and add lock contention on the hot path.

### 2. Cache cap behavior — ⚠️ "Arbitrary eviction" is honest but not LRU

The fallback (`it.next(); it.remove()`) removes whatever entry the `HashMap` segment iterator
yields first — which is effectively pseudo-random under hashing, **not** LRU and **not** FIFO.
The Javadoc is honest about this ("soft cap — the goal is bounded memory, not perfect LRU").

**Tradeoffs vs Caffeine:**
- For 1 000 entries and a realistic tenant count of dozens-to-low-hundreds, the cap is never
  hit in practice. Eviction policy is academic.
- If the cap *were* hit (e.g., a future B2B push to 10k tenants), random eviction can churn
  hot entries. Caffeine's W-TinyLFU would be measurably better.
- Cost of adding Caffeine: ~250KB jar, one dependency, one `@Bean` config. Not worth it today;
  flag for revisit when tenant count crosses ~500.

Verdict: the current policy is fine because we never hit the cap. Document that explicitly.

### 3. TTL — ⚠️ 1 hour is fine if invalidate is wired correctly

Tenant timezone changes are admin-rare (probably <1 per tenant per year). The TTL exists only
to bound the staleness window for *forgetting to invalidate*. 1 hour is conservative; 24 hours
would be defensible if `invalidate` is reliable.

**Critical pre-condition:** the tenant-settings update flow **must** call
`tenantTimeService.invalidate(tenantId)` on a successful timezone change. If it doesn't, a
scheduled job can run with the old zone for up to 1 hour. Worth grepping the codebase for the
timezone setter path and confirming.

**Also:** in a multi-pod deployment, `invalidate` only clears the local pod. The other pods
stay stale up to the TTL. Either:
- accept the 1-hour worst case (current behavior — fine for admin changes),
- or publish a Redis pub/sub `tenant.timezone.changed` event and have each pod subscribe.

Verdict: ⚠️ Confirm `invalidate` is called from tenant settings flow. The multi-pod gap is
acceptable.

### 4. Fallback — ⚠️ `Asia/Kolkata` is correct *today* but should be country-derived

Today every tenant is in IN, so `Asia/Kolkata` is a reasonable last-resort default. But the
class has access to `TenantRepository` and the `Tenant` entity carries a `country` (ISO 3166-1
alpha-2, default "IN") column added in V155. When the DB has a tenant whose `timezone` is
blank/invalid but `country` is set, we could:
- map country → canonical zone (e.g., "US" → "America/New_York" is debatable; "IN" →
  "Asia/Kolkata" is unambiguous; "AE" → "Asia/Dubai" is unambiguous).
- only do this fallback for countries with a single canonical IANA zone; for multi-zone
  countries (US, AU, RU, BR), keep the hard fallback.

Even simpler: keep `Asia/Kolkata` for IN tenants and refuse to start for non-IN tenants without
a timezone (a tenant in country=US with blank timezone is a data-quality bug worth a loud
failure, not a silent "your payroll just ran on IST").

Verdict: ⚠️ Acceptable for current footprint. Block as ❌ at the moment the first non-IN tenant
is onboarded.

### 5. Logging — ✅ Levels are right

- `WARN` for "tenant not found / blank timezone" — correct. Not crash-worthy, but worth a
  dashboard alert if it ever fires more than once or twice (would indicate a corrupted tenant
  row).
- `ERROR` for "timezone present but unparseable" — correct. This *cannot* happen given the
  V165 CHECK constraint; if it fires, the constraint was bypassed (manual DB edit?) or a zone
  was retired from the tz database between backfill and runtime.

The error message includes the actual unparseable string and references V165, which is exactly
right for an on-call engineer. No PII leakage — tenantId is a UUID, timezone is a public
IANA string. Good.

One nit: every cache miss + fallback logs at WARN. A monitoring tool that tails WARN+ will
see one warn per cache TTL per malformed tenant. Acceptable, but consider rate-limiting if
that becomes noise. (Out-of-scope here.)

### 6. Testability — ✅ Excellent

Constructor injection of `TenantRepository` is the only dependency. The aux-tenanttime-tests
work already exercises:
- happy path (valid zone),
- null tenantId,
- missing tenant,
- blank timezone,
- invalid timezone string,
- cache hit / miss,
- TTL expiry (via clock manipulation or short TTL),
- invalidate,
- eviction at cap.

No statics to mock, no `LocalDateTime.now()` in production code paths (always parameterized
via `ZoneId`), no Spring context required for unit tests. Textbook.

Minor: `DEFAULT_ZONE`, `MAX_CACHE_SIZE`, `CACHE_TTL_MILLIS` are package-private/private static
finals. For tests that want to force eviction without inserting 1000 entries, exposing
`MAX_CACHE_SIZE` as a test seam (or making it configurable via `@Value`) would help. Not
needed today.

### 7. Performance — ✅ Lookup is fast enough; no benchmark needed

Hot path: `cache.get(tenantId)` → CHM lookup → `cached.isExpired()` → int compare → return.
That's ~50ns. Even if every scheduled job calls `today()` 100x per tick across 50 tenants,
we're looking at microseconds per tick.

Cold path (cache miss): one DB query (`tenantRepository.findById`) → JPA hits the L1 cache or
Postgres → ~1-10ms. Bounded to 1× per tenant per hour.

**Recommend NOT benchmarking** unless we see a real production hotspot. The dominant cost in
any caller is the DB work the caller does, not this lookup.

One observation: if a scheduled job iterates tenants and calls `today(tenantId)` inside the
loop, that's fine. If a request-scoped handler calls it on every request, also fine. There's
no realistic workload where this becomes the bottleneck.

### 8. API surface — ⚠️ Missing a handful of obvious convenience methods

Current surface: `today(UUID)`, `now(UUID)`, `zoneFor(UUID)`, `invalidate(UUID)`.

Likely-needed additions, in rough priority order:
- `Instant nowInstant(UUID)` — for storing timestamps that callers will format later. Today
  callers fall back to `Instant.now()` (zone-agnostic), which is fine, but a single entry
  point reduces foot-guns.
- `ZonedDateTime nowZoned(UUID)` — for callers that need both the wall-clock time and the
  zone in one object (notification subject lines, audit logs).
- `LocalDate yesterday(UUID)`, `LocalDate firstOfMonth(UUID)` — extremely common in payroll/
  attendance schedulers; right now callers do `today(t).minusDays(1)` which is correct but
  repeated 40+ times.
- `YearMonth currentYearMonth(UUID)` — payroll period helpers.

`year`, `monthDay` from the prompt are less compelling — callers can derive them from
`today(t)` trivially. Don't add helpers that just call `.getYear()`.

Verdict: API is minimal and that's a virtue. Add only methods that show up in 5+ caller sites.
The audit of 28+13+N usages should drive that list.

### 9. Static `DEFAULT_ZONE = Asia/Kolkata` — ⚠️ Documented IST lock-in

This is the single biggest "known limitation" in the file. The constant is `static final`,
referenced from three places, and hard-codes the assumption that "if we don't know, IST is a
safe guess". That assumption breaks the moment a non-IN tenant signs up.

The class Javadoc already calls this out ("NU-AURA hosts tenants in IST today but the platform
is country-aware"), which is the right thing to do. To convert this from "tech debt" to
"tracked tech debt", the project should have:
- a `known-limitations.md` entry that says "TenantTimeService falls back to Asia/Kolkata; must
  be revisited before non-IN tenant onboarding",
- a unit test that *fails* when the default is requested in production mode and the tenant's
  `country` is not IN (canary; can be `@Disabled` until ready),
- a comment in the V155 country-column migration referencing this fallback as a downstream
  consumer.

Verdict: ⚠️ Known and documented. Flag as a follow-up, not a blocker.

---

## Recommendations (ordered by impact)

1. **Verify `invalidate` is wired from the tenant-settings update flow.** Without it the 1-hour
   TTL becomes the staleness window for admin timezone changes. One-line grep, possible
   one-line fix. *Impact: correctness; Effort: 15 min.*

2. **Add a `known-limitations.md` entry for the Asia/Kolkata default** and a tracking ticket
   to revisit at non-IN tenant onboarding. The Javadoc is good but invisible to project
   planning. *Impact: planning hygiene; Effort: 5 min.*

3. **Audit the 28+13+N call sites and extract the 3-5 most-repeated patterns** into convenience
   methods (`yesterday`, `firstOfMonth`, `currentYearMonth`, `nowZoned`). Removes ~50 lines of
   duplicated date math across callers. *Impact: maintainability; Effort: 1-2 hr including
   call-site migration.*

4. **Add a Micrometer counter for fallback-to-default events** (`tenant_time_service.fallback`
   tagged by reason `missing` / `unparseable`). One metric line, fires alarmingly if a tenant
   row corrupts. Wire into the existing Prometheus stack. *Impact: observability; Effort: 30
   min.*

5. **Document the multi-pod invalidate gap** in the class Javadoc (one paragraph). If the gap
   is unacceptable, wire a Redis pub/sub channel and have each pod subscribe; otherwise accept
   the 1-hour window for admin-triggered changes. *Impact: correctness clarity; Effort: 10 min
   docs / 2 hr code if implementing pub/sub.*

6. **Consider Caffeine** *only* if tenant count crosses ~500 or if the random-eviction policy
   shows up in a profile. Not today. *Impact: low; Effort: 2 hr; Defer.*

7. **Make `MAX_CACHE_SIZE` and `CACHE_TTL_MILLIS` configurable via `@Value`** with the current
   numbers as defaults. Lets ops tune without redeploy and lets tests force eviction without
   inserting 1000 entries. *Impact: testability + ops; Effort: 15 min.*

8. **Country-derived fallback for unambiguous-IANA countries.** When the country column is
   present and the country has a single canonical IANA zone, use it instead of
   `Asia/Kolkata`. Only do this for the subset where it's unambiguous (IN, AE, SG, JP, GB,
   etc.); keep the hard fallback for multi-zone countries. *Impact: correctness at non-IN
   onboarding; Effort: 1 hr + lookup table.*

---

**End of review.** No blockers. Two correctness-adjacent items (recs #1 and #5), the rest is
hygiene and forward-looking polish.

aux-tenanttime-codereview done — verdict=Caveat
