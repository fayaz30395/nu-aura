# NU-AURA — Improvement Backlog

> Living tracker for code-grounded improvements identified from the
> [mental model](mental-model.md). Update the **Status** column as items move.
>
> Status legend: `OPEN` · `IN PROGRESS` · `DONE` · `WONT DO` · `VERIFIED`
>
> Created: 2026-05-20.

---

## Pending runtime verifications (T1-01, T1-02, T2-06)

Code-level work is DONE for these items but they need on-cluster verification.

### RV-A · V177 migration applied to a real database
- [ ] Run Flyway against Neon dev DB
- [ ] Migration log shows `RAISE NOTICE 'V177: hardened N *_tenant_rls policies'`
- [ ] Audit query returns 0 rows:
      ```sql
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname='public' AND policyname LIKE '%_tenant_rls'
        AND (qual ILIKE '%IS NULL%' OR qual ILIKE '%= ''''%');
      ```
- [ ] `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname='nu_migration';`
      returns one row with `rolbypassrls=true` (or a warning that BYPASSRLS
      requires elevated access on Neon — operator must then run as superuser).

### RV-B · RlsStartupProbe exercised against the real database
- [ ] Backend boots without `RLS_PROBE_SKIP=true`
- [ ] Log line `RLS startup probe passed: 0 rows visible in employees without tenant context.`
- [ ] No `IllegalStateException` from the probe

### RV-C · Kafka tenant aspect + interceptor in production traffic
- [ ] Send a test message on any of the 6 topics
- [ ] Downstream log lines show `tenantId` in MDC
- [ ] No WARN `Kafka listener … invoked without tenantId on payload` for normal traffic

### RV-D · OpenTelemetry export
- [ ] Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` (or whatever collector)
- [ ] Make one HTTP call; spans appear in the collector
- [ ] `traceparent` propagated to a downstream consumer record

---

## Tier 1 — Real risks (highest priority)

### T1-01 · RLS graceful-fallback is a footgun

- **Status:** DONE
- **Where:** `V36__reinstate_tenant_rls_policies.sql:48-59` — policy fragment
  `OR current_setting('app.current_tenant_id', true) IS NULL`
- **Why it matters:** Any code path that runs without setting the session var
  sees **all tenants**. Today that's Flyway, ShedLock jobs, integration tests,
  and any future async path that forgets to propagate. One missing line =
  silent cross-tenant read.
- **Fix:** Two policies — strict for app DB role, permissive for a separate
  `migration` role. Drop the `OR NULL` for app traffic. Add a startup self-test
  that confirms a connection without the var set returns 0 rows.
- **What landed (2026-05-20):**
  - `V177__strict_tenant_rls_policies.sql` — creates `nu_migration` role with
    BYPASSRLS and dynamically recreates every `*_tenant_rls` policy with strict
    `tenant_id = current_setting('app.current_tenant_id', true)::uuid` (no
    `OR NULL` / `OR ''` escape). Covers V36/V37/V38/V40/V41/V65/V81 policies.
  - `RlsStartupProbe` (`backend/.../common/security/RlsStartupProbe.java`) —
    `ApplicationRunner` that opens a connection without the session var, runs
    `SELECT COUNT(*) FROM employees`, fails boot if > 0 rows visible. Skipped
    in `test` profile and when `RLS_PROBE_SKIP=true`.
  - `*_tenant_isolation` policies (V52/V56/V84/V87/V88/V90) left untouched —
    they were already strict (no OR NULL fallback) and fail-closed when the
    session var is unset.
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
  - **Aspect layer added** (`backend/src/main/java/com/nulogic/infrastructure/kafka/TenantContextKafkaAspect.java`):
    `@Around` on `@KafkaListener` mirrors the interceptor's behaviour and
    additionally publishes `tenantId` to MDC, catching any future listener
    that bypasses the standard container factories (new factory beans, batch
    listeners, direct test invocation). Reflective `getTenantId()` fallback
    covers non-`BaseKafkaEvent` payloads.
- **Follow-ups (separate task, not gating closure):**
  - Audit every `CompletableFuture.supplyAsync()` / raw thread spawn to confirm
    they go through an executor that uses `TenantAwareTaskDecorator`.
  - Move T4-17 (virtual-thread propagation) ahead of any opt-in to
    `spring.threads.virtual.enabled`.
- **Last updated:** 2026-05-20

### T1-03 · No image-signature / policy enforcement despite declared

- **Status:** DONE
- **Where:** `infra/deployment/kyverno/`, `.github/workflows/cosign-sign.yml`.
- **Why it matters:** Signing produces signatures, but Kyverno isn't gating.
  A compromised CI run could push an unsigned image and it would deploy.
- **Fix:** Flipped `infra/deployment/kyverno/require-image-signature.yaml`
  `validationFailureAction: Audit` → `Enforce` (the other two policies,
  `disallow-latest-tag.yaml` and `require-resource-limits.yaml`, were already
  on `Enforce`). Added a "Verify image signature" step in
  `.github/workflows/deploy.yml` (both staging and production jobs) that runs
  `cosign verify` with the same `--certificate-identity-regexp` /
  `--certificate-oidc-issuer` the Kyverno policy expects, gated before
  `helm upgrade` so an unsigned image fails the pipeline.
- **Open placeholders (pre-existing, not blocking):**
  - `gcr.io/PROJECT_ID/...` image patterns in the Kyverno policy and in
    `cosign-sign.yml` still need the real GCP project substituted.
  - Key-based attestor in `require-image-signature.yaml` still carries the
    `REPLACE_WITH_COSIGN_PUB_KEY` PEM placeholder; keyless OIDC is the
    primary path so this only matters if/when emergency manual signing is
    introduced.
- **Last updated:** 2026-05-20

### T1-04 · Payroll pessimistic lock is per-row, not per-period-wide

- **Status:** DONE
- **Where:** `PayrollRunRepository.findByTenantIdAndPeriodForUpdate`.
- **Why it matters:** Lock covers the `PayrollRun` row, not the payslips being
  computed. Concurrency=1 on the Kafka consumer mitigates, but if anyone
  bypasses Kafka (debug endpoint, retry, replay), races on `Payslip` rows.
- **Fix:** Either advisory lock on `(tenant_id, month, year)` via
  `pg_advisory_xact_lock`, or guard at service level with idempotency key on
  `Payslip` upserts.
- **What landed (2026-05-20):**
  - New `PayrollPeriodLock`
    (`backend/.../application/payroll/service/PayrollPeriodLock.java`) — a
    `@Component` that issues
    `SELECT pg_advisory_xact_lock(hashtextextended(?, 0))` keyed on
    `tenantId|year|month`. Requires `Propagation.MANDATORY`, so callers
    without an active transaction get a clear error instead of an unbacked
    lock.
  - Wired into `PayrollRunService` and called at the top of three
    period-touching methods:
    - `createPayrollRun` — prevents the unique-index race when two callers
      both see no existing row and both try to insert.
    - `completeProcessing` — primary async payslip-generation path.
    - `processPayrollRun` — legacy synchronous path; same period as the async
      consumer now serializes here too.
  - 3 unit tests pass (`PayrollPeriodLockTest`): SQL shape, key composition,
    null-argument rejection.
  - Existing `PayrollRunServiceTest` updated to mock the new dependency —
    36 tests still pass.
- **Why not Payslip-level idempotency too:** `payslips` already has a unique
  index on `(employee_id, pay_period_month, pay_period_year)`. The advisory
  lock prevents the race up-front; the unique index is the backstop.
  Switching `payslipRepository.save` to `ON CONFLICT DO NOTHING` is a
  worthwhile follow-up but no longer load-bearing.
- **Last updated:** 2026-05-20

### T1-05 · Hard delete still works

- **Status:** DONE
- **Where:** `BaseEntity.softDelete()` is a method, not a default.
  `JpaRepository.delete()` does a real DELETE.
- **Why it matters:** Any developer calling `repository.delete(entity)` skips
  the soft-delete contract. Audit trail vanishes.
- **Fix:** Replaced `SimpleJpaRepository` with
  `backend/src/main/java/com/nulogic/infrastructure/persistence/SoftDeleteJpaRepository.java`
  wired via `@EnableJpaRepositories(repositoryBaseClass = …)` in
  `HrmsApplication`. All `delete*`/`deleteAllInBatch*` paths now route
  through `BaseEntity.softDelete()` (bulk JPQL UPDATE for batch).
- **Non-BaseEntity follow-up (2026-05-20):**
  - `PostComment` — has own `is_deleted` column; added `@SQLDelete("UPDATE
    post_comments SET is_deleted=true WHERE id=?")` directly on the entity so
    the fallback `super.delete()` path becomes soft-delete via Hibernate SQL.
  - `PollVote` / `PollOption` / `LearningPathCourse` — kept hard-deletable by
    design: votes and join-rows have no audit/recovery requirement. Document
    explicitly if that ever changes.
- **Last updated:** 2026-05-20

---

## Tier 2 — Operability gaps (incident-time pain)

### T2-06 · No distributed tracing

- **Status:** DONE — `micrometer-tracing-bridge-otel` + `opentelemetry-exporter-otlp`
  added to `backend/pom.xml`; `management.tracing.sampling.probability` defaults
  to 10% (`OTEL_SAMPLING_RATIO`), OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`
  (empty in dev = spans produced, traceparent propagated, no export). Frontend
  `@vercel/otel` still pending.
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

- **Status:** DONE — `docker-compose.yml` now runs `grafana` (port `3001`) and
  `alertmanager` (port `9093`) alongside `prometheus`. Grafana is provisioned
  from `infra/monitoring/grafana/provisioning/` (Prometheus datasource +
  `NU-AURA` dashboard provider loading
  `provisioning/dashboards/json/nu-aura-api.json` — starter dashboard with
  `api_request_duration` p99, `auth_login` rate, JVM heap, HTTP 5xx).
  Prometheus is wired to AlertManager and loads
  `infra/monitoring/prometheus/rules/nu-aura.rules.yml` (3 starter alerts:
  `HighAuthFailureRate`, `ApiP99Latency`, `PodMemoryHigh`). AlertManager has a
  single `slack-default` receiver — **TODO: replace `<SLACK_WEBHOOK_PLACEHOLDER>`
  in `infra/monitoring/alertmanager/alertmanager.yml` with the real Slack
  incoming-webhook URL** (do not commit the real value).
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

- **Status:** DONE
- **Where:** Logback is file/console only via `PiiMaskingConverter`.
- **Why it matters:** Multi-pod log search means SSHing into pods. Bonus loss:
  no cross-request correlation via `requestId` / `tenantId` / `userId` MDC.
- **Fix:** `LogstashTcpSocketAppender` added in `logback-spring.xml` (prod
  profile) wrapped in `ASYNC_LOGSTASH`, reusing `PiiMaskingLogstashEncoder` so
  MDC fields (`requestId`, `correlationId`, `tenantId`, `userId`, `requestUri`,
  `requestPath`, `requestMethod`, `clientIp`, `remoteAddr`) are indexed and PII
  stays masked. Destination is `${LOGSTASH_HOST}:${LOGSTASH_PORT}` (defaults
  `logstash:5044`); appender fails soft when host is unset/unreachable. Requires
  an external Logstash / Filebeat / Vector sidecar to forward into ES — owned
  by T2-07 (docker-compose).
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

### T3-15 · JaCoCo target 80% — enforcement wired (ratcheted floor)

- **Status:** DONE
- **Where:** `backend/pom.xml` (jacoco-maven-plugin `check` execution),
  `.github/workflows/pr-validation.yml` (backend job).
- **Why it matters:** If `mvn verify` doesn't fail under threshold, the floor
  is aspirational.
- **Fix applied:**
  - `<execution><id>check</id>` already existed bound to the `verify` phase
    with a `BUNDLE / LINE / COVEREDRATIO` rule at minimum `0.80`. Confirmed
    present.
  - Current cached JaCoCo report (`backend/target/site/jacoco/index.html`)
    shows line coverage ~0.19 — enforcing 0.80 today would block every PR.
    Ratcheted the floor to **0.10** (5 points below current, rounded down to
    nearest 0.05) and added an inline comment in pom.xml flagging this as a
    ratchet floor to raise in 0.05 increments toward the backlog target of
    0.80 as test debt is paid down.
  - `pr-validation.yml` previously ran `mvn test -q`, which skips the verify
    phase and therefore skips `jacoco:check`. Updated the backend job to run
    `mvn -B -DskipITs verify -q` so the coverage gate actually fires on PRs.
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
