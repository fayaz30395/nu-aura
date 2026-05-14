# TenantTimeService — Cross-Pod Invalidate (Redis Pub/Sub) Review

**Subject:** w7 Redis-invalidate channel for `TenantTimeService.invalidate(UUID)`
**Sibling doc:** `backend/docs/audit/tenanttime-service-review.md` (rec #5 motivates this work)
**Source under review:** `backend/src/main/java/com/nulogic/common/util/TenantTimeService.java`
**Pattern precedent:** `backend/src/main/java/com/nulogic/infrastructure/websocket/` (RedisWebSocketRelay, RedisWebSocketSubscriber, WebSocketRedisConfig)

---

## R1 implementation review

**Reviewer:** aux-w7-review-publish-thread (read-only, auxiliary)
**Date:** 2026-05-14
**Scope:** thread safety, infinite-loop prevention (publish-from-receiver), startup ordering
(subscriber before publisher), graceful degradation when Redis is down.
**Verdict:** **Blocked — R1 has not landed.**

### State of the codebase at review time

A read of `TenantTimeService.java` (revision under HEAD on `main`, branch tip
`69657a82`) shows **no Redis pub/sub wiring** of any kind:

- No `RedisTemplate` field, no `convertAndSend`, no `ChannelTopic`, no `MessageListener`.
- `invalidate(UUID)` is still a local-only `cache.remove(tenantId)` — exactly the
  single-pod shape called out in the sibling review (`tenanttime-service-review.md` §3,
  "the multi-pod invalidate gap").
- `CACHE_TTL_MILLIS` was tightened from 1h → 5min as a documented R2 mitigation
  (line 58–59), confirming R1 has not shipped yet.
- No companion class such as `TenantTimezoneInvalidationPublisher`,
  `TenantTimezoneInvalidationSubscriber`, or `TenantTimezoneRedisConfig` exists under
  `backend/src/main/java/com/nulogic/`. A repo-wide search for `tenant.timezone.changed`,
  `TenantTimezoneChanged`, and `MessageListenerAdapter` returns zero hits in main code.

Because the implementation is not present, the four review dimensions cannot be
**verified against code**. The remainder of this section is the **review checklist
the R1 implementation must satisfy** when it lands, anchored to the patterns already
proven in this codebase. Re-run this review and replace this section the moment R1
merges.

### Required review criteria (apply at landing)

These are the acceptance gates a reviewer must verify line-by-line once R1 ships.
They are derived from the WebSocket relay pattern (`RedisWebSocketRelay`,
`RedisWebSocketSubscriber`, `WebSocketRedisConfig`), which is the **only**
established Redis pub/sub precedent in this backend and therefore the pattern the
R1 agent should mirror.

#### 1. Thread safety

- **Receiver path must be re-entrant.** `RedisMessageListenerContainer` dispatches
  on its own `taskExecutor`; a single tenant invalidation can race with a concurrent
  `zoneFor(tenantId)` cache miss on the application thread. The two operations
  against `ConcurrentHashMap` are individually safe (`remove` vs `put`), and a stale
  `put` after `remove` is benign — next TTL or next invalidate-burst clears it.
  Verify R1 does **not** introduce `synchronized` or external locks; the existing
  CHM-only contract (sibling review §1) must be preserved.
- **No mutable state on the subscriber.** Following `RedisWebSocketSubscriber`,
  the new subscriber must hold only the relay reference and a stateless serializer.
  Verify: no per-message buffers, no shared collections.
- **Container thread pool sized for fan-in.** Default
  `SimpleAsyncTaskExecutor` is fine; verify it is not replaced with a
  single-threaded executor (which would serialise invalidations across all
  tenants on this pod).

**Acceptable risks (benign races, do NOT block on these):**
- Window between `cache.remove(tenantId)` (from the message) and a concurrent
  `zoneFor(tenantId)` that just resolved against the **old** DB value: that
  caller gets one stale read; next call repopulates from DB. Same window as
  the local `invalidate()` already has — pub/sub adds no new race.
- Out-of-order delivery between two rapid timezone changes for the same tenant:
  acceptable because the **action is idempotent** (remove from cache). The next
  miss reads truth from DB. Verify R1 does **not** publish the new zone value
  (just the tenantId), which would re-introduce ordering hazards.

#### 2. Infinite-loop prevention (publish-from-receiver)

This is the highest-risk dimension. The class to review is the **public-facing
`invalidate(UUID)` method on `TenantTimeService`**. The danger:

```
admin updates timezone
  → TenantSettings calls tenantTimeService.invalidate(uuid)
    → invalidate publishes to channel "tenant.timezone.changed"
      → every pod (including this one) receives the message
        → subscriber calls tenantTimeService.invalidate(uuid) again
          → publishes again
            → ... infinite loop
```

Required mitigations the R1 implementation **must** apply (verify at least one
of these is in the diff):

- **Two-method split (preferred).** Public `invalidate(UUID)` publishes
  **without** removing locally, and the subscriber's `onMessage` calls a
  package-private `invalidateLocal(UUID)` that only does `cache.remove`. The
  subscriber never re-publishes. This is the cleanest invariant and the easiest
  to assert in a unit test.
  ```
  public void invalidate(UUID tenantId)       // publishes only
  void invalidateLocal(UUID tenantId)         // cache.remove only; called by subscriber
  ```
- **Origin tagging.** The published `TenantTimezoneInvalidation` payload carries
  an originator pod-id (e.g., `${HOSTNAME}` or `UUID.randomUUID()` at boot).
  The subscriber skips messages whose origin equals its own pod-id. This works
  but introduces config and is harder to test — prefer the two-method split.
- **Receiver-only-removes invariant.** The subscriber path must **never** call
  the publishing `invalidate(...)`. Grep the diff: any call from the subscriber
  to `tenantTimeService.invalidate(...)` is a P0 review block.

The `RedisWebSocketRelay.onMessage(...)` precedent does NOT have this hazard
because the receiver delegates to `SimpMessagingTemplate` (local-only),
not back to its own `convertAndSend(...)`. The new code must mirror that
discipline: **the receiver touches the cache only, never the publisher.**

#### 3. Startup ordering (subscriber before publisher)

Failure mode: an application event fires `invalidate(...)` before the
`RedisMessageListenerContainer` has finished its `start()` lifecycle —
the published message is sent to the channel but **no subscriber on this
pod** is bound yet, so this pod's cache stays stale until TTL (5 min).
Same hazard for any pod whose listener container started after the publish.

Required mitigations (verify at least one):

- **Mark the listener container as `SmartLifecycle` with a low `phase`.**
  Spring guarantees lifecycle beans with lower phase numbers `start()`
  before higher-phase ones. `RedisMessageListenerContainer` already
  implements `SmartLifecycle` with `phase = Integer.MAX_VALUE - 100`
  by default. Verify the config doesn't override this phase to something
  higher than scheduled-job containers (which would let a `@Scheduled`
  job run before the listener is ready).
- **`@DependsOn` on any bean that calls `invalidate()`.** TenantSettings
  service / controller must depend on the listener container bean so
  Spring orders them. Verify the diff adds `@DependsOn("tenantTimezoneRedisListenerContainer")`
  to whatever bean owns the timezone setter, or the equivalent.
- **Subscriber idempotency on missed messages.** Because TTL is 5min
  (post-R2), even a missed startup message is bounded. This makes a
  brief startup gap acceptable but does NOT replace the dependency
  ordering — verify R1 does not lean on TTL as the only safety net.

The `WebSocketRedisConfig` precedent registers the listener container
as a `@Bean` with default phase. The R1 config should do the same; the
phase ordering is implicit because all schedulers also start at default
phase. **Verify no custom `setPhase()` is set in R1.**

#### 4. Graceful degradation when Redis is down

Failure mode 1 — **publisher cannot reach Redis:**
- `redisTemplate.convertAndSend(...)` throws `RedisConnectionFailureException`.
- Required behavior: **swallow the exception, log at WARN, still apply the
  local cache.remove on this pod.** The admin's request to update the
  timezone must succeed; other pods stay stale up to TTL (5min, post-R2),
  which is the documented R2 fallback.
- Verify the publisher wraps `convertAndSend` in a try/catch — see
  `RedisWebSocketRelay.publish(...)` lines 108–118 for the established
  pattern. The diff must NOT let a Redis outage take down a tenant
  settings save.

Failure mode 2 — **subscriber loses connection mid-flight:**
- Spring's `RedisMessageListenerContainer` auto-reconnects with backoff.
- During the disconnect window, any invalidations published by other pods
  are **dropped** (Redis pub/sub does not buffer for offline subscribers).
- Required mitigation: post-R2 5min TTL bounds the staleness window.
  Verify the R1 commit message / docs reference this trade-off, so on-call
  engineers know that a 5-min Redis outage = up to 10-min stale-zone window
  (5min outage + 5min TTL).

Failure mode 3 — **Redis returns slow / partial reads on the subscriber:**
- `RedisMessageListenerContainer` runs `onMessage` on the listener
  thread. A blocking call here (e.g., a JPA query inside `invalidateLocal`)
  would pile up. **Verify `invalidateLocal` only touches `cache.remove`
  and never performs IO.** This is the same constraint the WebSocket
  relay observes.

Failure mode 4 — **profile guard for non-Redis deploys:**
- The WebSocket pattern uses `@Profile("!render")` to skip Redis config on
  the Render free tier. Verify R1's `@Configuration` class for the
  listener container has the same guard, or an explicit `@ConditionalOnProperty`
  that turns off the pub/sub bus in environments without Redis. Without this,
  the bean wiring fails at startup and the whole app crashes — a strictly
  worse degradation than the 5-min TTL.

### Code-shape sanity checks for the eventual diff

When the R1 diff arrives, also verify:

- **Serializer matches the WebSocket pattern.** Use
  `GenericJackson2JsonRedisSerializer` for the payload, not Java
  serialization. Reason: cross-language consumers may show up (e.g., a
  Node-based ops tool) and the channel name is loud enough to attract
  outside subscribers.
- **Channel name is a constant.** Follow `RedisWebSocketRelay.WS_RELAY_CHANNEL = "ws:relay"`;
  publish the constant via a `public static final` so the test can subscribe
  to the same string. Suggested: `TENANT_TIMEZONE_INVALIDATION_CHANNEL = "tenant.timezone.changed"`.
- **Payload is a typed DTO with @Builder.** Mirror `RedisWebSocketMessage` —
  a minimal record/POJO with `tenantId` and `originPodId` (if origin-tagging
  is the chosen loop-prevention strategy). Do **not** publish the new
  timezone string; only the tenantId.
- **Integration test exists.** A `@SpringBootTest` with embedded Redis (or
  Testcontainers) that asserts: publish from one bean instance, cache in a
  second bean instance gets cleared within 1 second. Without this test, R1
  is not landable.

### Verdict (this review)

**Verdict = Blocked.** R1 has not landed; the four dimensions cannot be
verified against code. This section serves as the **landing checklist** —
when R1 merges, replace this verdict with one of:

- **LGTM** — all four dimensions satisfied per the checklist above.
- **Caveat** — implementation lands but has documented limitations
  (acceptable known races, 5-min TTL window during Redis outage, etc.).
- **Block** — at least one dimension fails (typically infinite-loop
  prevention or graceful degradation).

The R1 agent should re-run this review (`aux-w7-review-publish-thread`)
immediately after their commit lands so the verdict reflects shipped code,
not a forward-looking checklist.

---

aux-w7-review-publish-thread done — verdict=Blocked
