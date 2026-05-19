# NU-AURA — Improvement Backlog

> Living tracker for code-grounded improvements identified from the
> [mental model](mental-model.md). Update the **Status** column as items move.
>
> Status legend: `OPEN` · `IN PROGRESS` · `DONE` · `WONT DO` · `VERIFIED`
>
> Created: 2026-05-20.

---

## Tier 1 — Real risks (highest priority)

### T1-01 · RLS graceful-fallback is a footgun

- **Status:** OPEN
- **Where:** `V36__reinstate_tenant_rls_policies.sql:48-59` — policy fragment
  `OR current_setting('app.current_tenant_id', true) IS NULL`
- **Why it matters:** Any code path that runs without setting the session var
  sees **all tenants**. Today that's Flyway, ShedLock jobs, integration tests,
  and any future async path that forgets to propagate. One missing line =
  silent cross-tenant read.
- **Fix:** Two policies — strict for app DB role, permissive for a separate
  `migration` role. Drop the `OR NULL` for app traffic. Add a startup self-test
  that confirms a connection without the var set returns 0 rows.
- **Last updated:** 2026-05-20

### T1-02 · TenantContext is ThreadLocal, not Inheritable; consumers re-establish manually

- **Status:** DONE (Kafka centralization landed; @Async path still pending audit)
- **Where:** `TenantContext:12-21`; manual propagation in
  `ApprovalEventConsumer:68-70` and 5 sibling Kafka consumers.
- **Why it matters:** New consumer → if dev forgets
  `TenantContext.setCurrentTenant(event.getTenantId())`, context is null →
  RLS `OR NULL` (see T1-01) kicks in → cross-tenant data. Compounds with T1-01.
- **Fix:** Centralize. Wrap consumer registration so context is always set
  from event envelope (interceptor / `ConsumerInterceptor` / aspect on
  `@KafkaListener`). Same for `@Async` — confirm `TenantAwareTaskDecorator` is
  the only executor.
- **What landed (2026-05-20):**
  - New `TenantContextRecordInterceptor` (`backend/.../infrastructure/kafka/TenantContextRecordInterceptor.java`)
    reads `tenantId` from `BaseKafkaEvent` payload, sets `TenantContext` before
    listener, clears in `success`/`failure`.
  - Wired into `KafkaConfig.createListenerContainerFactory()` and the payroll
    factory — covers all 6 consumer container factories.
  - 5 unit tests pass (`TenantContextRecordInterceptorTest`): payload→context,
    null-payload skip, non-event-payload skip, success-clear, failure-clear.
  - Manual `setCurrentTenant`/`clear` in the 6 consumers retained as
    defense-in-depth; same UUID set twice is a no-op, clear is idempotent.
- **Follow-ups (separate task, not gating closure):**
  - Audit every `CompletableFuture.supplyAsync()` / raw thread spawn to confirm
    they go through an executor that uses `TenantAwareTaskDecorator`.
  - Move T4-17 (virtual-thread propagation) ahead of any opt-in to
    `spring.threads.virtual.enabled`.
- **Last updated:** 2026-05-20

### T1-03 · No image-signature / policy enforcement despite declared

- **Status:** OPEN
- **Where:** `infra/deployment/kyverno/`, `.github/workflows/cosign-sign.yml`.
- **Why it matters:** Signing produces signatures, but Kyverno isn't gating.
  A compromised CI run could push an unsigned image and it would deploy.
- **Fix:** Move Kyverno from declared to enforce mode; add a smoke test in
  `deploy.yml` that asserts the image is signed before `helm upgrade`.
- **Last updated:** 2026-05-20

### T1-04 · Payroll pessimistic lock is per-row, not per-period-wide

- **Status:** OPEN
- **Where:** `PayrollRunRepository.findByTenantIdAndPeriodForUpdate`.
- **Why it matters:** Lock covers the `PayrollRun` row, not the payslips being
  computed. Concurrency=1 on the Kafka consumer mitigates, but if anyone
  bypasses Kafka (debug endpoint, retry, replay), races on `Payslip` rows.
- **Fix:** Either advisory lock on `(tenant_id, month, year)` via
  `pg_advisory_xact_lock`, or guard at service level with idempotency key on
  `Payslip` upserts.
- **Last updated:** 2026-05-20

### T1-05 · Hard delete still works

- **Status:** OPEN
- **Where:** `BaseEntity.softDelete()` is a method, not a default.
  `JpaRepository.delete()` does a real DELETE.
- **Why it matters:** Any developer calling `repository.delete(entity)` skips
  the soft-delete contract. Audit trail vanishes.
- **Fix:** Add `@SQLDelete("UPDATE … SET is_deleted=true, deleted_at=now()
  WHERE id=?")` on `BaseEntity` subclasses (or via base mapping). Forces all
  delete paths through one route.
- **Last updated:** 2026-05-20

---

## Tier 2 — Operability gaps (incident-time pain)

### T2-06 · No distributed tracing

- **Status:** OPEN
- **Where:** `MetricsConfig` has Micrometer metrics but no OpenTelemetry /
  Tempo / Jaeger exporter wired.
- **Why it matters:** When a payroll run hangs across HTTP → Kafka → DB →
  external email, you can't follow it. Logs alone won't correlate. With 6
  Kafka topics and 20+ scheduled jobs this is a real gap.
- **Fix:** Add `io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter`,
  export traces to your existing Prometheus stack via Tempo or Grafana Cloud.
  Frontend can ride along with `@vercel/otel`.
- **Last updated:** 2026-05-20

### T2-07 · Grafana isn't deployed, AlertManager isn't either

- **Status:** OPEN
- **Where:** `docker-compose.yml` runs Prometheus only; no Grafana service,
  no AlertManager.
- **Why it matters:** Custom metrics are emitted (`auth_login_*`,
  `api_request_duration` p99) and have no dashboard or alert. You'll find out
  about p99 regressions from users.
- **Fix:** Add Grafana + AlertManager to docker-compose, commit dashboards as
  JSON under `infra/monitoring/dashboards/`, wire AlertManager to a real
  channel (PagerDuty/Slack).
- **Last updated:** 2026-05-20

### T2-08 · Elasticsearch is running but not wired to backend logs

- **Status:** OPEN
- **Where:** Logback is file/console only via `PiiMaskingConverter`.
- **Why it matters:** Multi-pod log search means SSHing into pods. Bonus loss:
  no cross-request correlation via `requestId` / `tenantId` / `userId` MDC.
- **Fix:** Ship logs to ES via Logback `ElasticsearchAppender`, or stand up
  Loki (lighter for log volumes). Index MDC fields so you can grep across
  requests.
- **Last updated:** 2026-05-20

### T2-09 · Deploy is `workflow_dispatch` only

- **Status:** OPEN
- **Where:** `.github/workflows/deploy.yml`.
- **Why it matters:** Every prod deploy is a button press. No progressive
  delivery, no canary, no auto-rollback. Hard to scale to many releases per
  day.
- **Fix:** Auto-deploy to staging on main merge, manual gate to prod, Argo
  Rollouts or Flagger for canary on the GKE side.
- **Last updated:** 2026-05-20

---

## Tier 3 — DX / maintainability tax (compounding cost)

### T3-10 · MapStruct is in `pom.xml` but unused

- **Status:** OPEN
- **Where:** Controllers use `BeanUtils.copyProperties()` with ignore-lists
  (`PayrollController:54`, `LeaveRequestController:69`).
- **Why it matters:** Ignore-lists drift silently — add a new sensitive field,
  forget to add to the list → mass-assignment. MapStruct generates
  compile-time mappers with explicit fields.
- **Fix:** Pick one. Either remove the MapStruct dep, or migrate controllers
  to MapStruct DTO↔Entity converters and delete every `BeanUtils.copyProperties`
  call.
- **Last updated:** 2026-05-20

### T3-11 · No standardized API response envelope

- **Status:** OPEN
- **Where:** Controllers return raw entities (`ResponseEntity<PayrollRun>`),
  domain DTOs (`AuthResponse`), or `Map`. Errors are wrapped by
  `GlobalExceptionHandler` but success responses are not.
- **Why it matters:** Frontend has to write per-endpoint handling. Pagination
  shape varies. Adding fields like `traceId` / `serverTime` requires touching
  every controller.
- **Fix:** Adopt `ApiResponse<T> { data, meta, traceId }` envelope, single
  `@RestControllerAdvice` to wrap. One-time refactor, big consistency win.
- **Last updated:** 2026-05-20

### T3-12 · No generated TypeScript client from OpenAPI

- **Status:** OPEN
- **Where:** `frontend/lib/api/*.ts` is hand-rolled (~1200 LOC).
- **Why it matters:** SpringDoc emits OpenAPI for all 177 controllers — but TS
  types are manually maintained. Backend changes break frontend silently
  until runtime.
- **Fix:** `openapi-typescript-codegen` or `orval` to generate from
  `/v3/api-docs` into `frontend/lib/generated/`. Keep the thin Axios wrapper
  for auth/refresh.
- **Last updated:** 2026-05-20

### T3-13 · Mantine + Tailwind dual styling

- **Status:** OPEN
- **Where:** `mantine-theme.ts` + `tailwind.config.js` both consume
  `globals.css` CSS vars.
- **Why it matters:** Two layers competing on layout/spacing/buttons.
  Cognitive overhead — "do I use a Mantine Button or a Tailwind-styled
  native?" Bundle ships both.
- **Fix:** Pick a side per concern. Mantine for inputs/modals/datepickers
  (where its semantics matter), Tailwind for layouts. Document the rule in
  `frontend/components/ui/README.md` and code-mod existing drift.
- **Last updated:** 2026-05-20

### T3-14 · Single Zustand store across 261 routes

- **Status:** OPEN
- **Where:** `useAuth.ts` is the only store (per MEMORY.md and verified in code).
- **Why it matters:** Server state is in React Query (good), but UI state
  (sidebar collapse, app-shell tabs, draft form state) drifts into ad-hoc
  `useState` chains. As route count grows this leaks.
- **Fix:** Per-feature Zustand slices for UI state that crosses routes
  (sidebar, command palette, notification center). Keep React Query for
  server state.
- **Last updated:** 2026-05-20

### T3-15 · JaCoCo target 80% — enforcement unverified

- **Status:** OPEN (needs verification)
- **Where:** Backend `pom.xml` has JaCoCo configured.
- **Why it matters:** If `mvn verify` doesn't fail under 80%, the floor is
  aspirational.
- **Fix:** Confirm `mvn verify` fails under 80% locally; if not, add the
  coverage check rule; require `mvn verify` in `pr-validation.yml`.
- **Last updated:** 2026-05-20

---

## Tier 4 — Scale ceiling (real but not today's problem)

### T4-16 · Neon connection ceiling at ~5 pods

- **Status:** OPEN
- **Where:** `application-prod.yml:535-536` Hikari max=20/pod × Neon free tier
  100 connections.
- **Why it matters:** 6th pod = pool exhaustion. Hard wall.
- **Fix:** PgBouncer in transaction-pooling mode in front of Neon (or Neon's
  built-in pooler endpoint). Drop per-pod Hikari to 5-10.
- **Last updated:** 2026-05-20

### T4-17 · ThreadLocal won't survive Java 21 virtual threads

- **Status:** OPEN
- **Where:** `TenantContext.java`, all `@Async` paths,
  `CompletableFuture.supplyAsync()` call sites (if any).
- **Why it matters:** If/when you adopt virtual threads
  (`spring.threads.virtual.enabled=true`), propagation between them needs
  `ScopedValue` or context-propagation library. `TenantAwareTaskDecorator`
  handles `@Async`; native `CompletableFuture` paths won't.
- **Fix:** Audit `CompletableFuture` / `parallelStream` usages. Adopt
  `io.micrometer.context.ContextRegistry` + `ContextSnapshot` for portable
  propagation.
- **Last updated:** 2026-05-20

### T4-18 · WebSocket relay has no degraded-mode metric

- **Status:** OPEN
- **Where:** `RedisWebSocketRelay:114-116` — silent local-fallback if Redis
  down.
- **Why it matters:** Users on pod A won't see updates from pod B until Redis
  recovers. No metric, no alert.
- **Fix:** Counter on `ws.relay.local_fallback_total`, page on sustained > 0.
- **Last updated:** 2026-05-20

---

## Recommended first 5 (sequencing)

1. **T1-01 + T1-02** — paired. Highest correctness risk for lowest effort.
2. **T1-05** (`@SQLDelete`) — one annotation per base class, kills a whole
   class of bugs.
3. **T2-06** (OpenTelemetry) — biggest leverage during the next incident.
4. **T3-10** (MapStruct or remove) — eliminates a recurring mass-assignment
   review burden.
5. **T3-12** (OpenAPI codegen) — pays back forever on every BE-FE change.

---

## How to update this file

When working an item:

1. Change `Status: OPEN` → `Status: IN PROGRESS` and add the PR / branch.
2. When merged: `Status: DONE`, add the commit SHA, update `Last updated`.
3. If you're abandoning the item: `Status: WONT DO` + one-line reason.
4. If you've verified the item is actually a non-issue: `Status: VERIFIED` +
   one-line note pointing to the evidence (file:line or test name).

Keep the citations — they were the audit evidence.
