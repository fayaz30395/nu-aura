# Green-Flag Audit — Integration (re-verification + new findings)

**Agent:** integration | **Date:** 2026-06-14 | **Repo root:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`
**Scope:** Kafka (producers/consumers/DLQ/idempotency), Redis fallbacks, Elasticsearch, Google Drive, email, Slack, webhooks, DocuSign, HTTP timeouts, observability.
**Method:** Line-by-line read of integration source against the prior board (`ISSUE_BOARD.md`) and `docs/audit/green-flag/integration.md`. Bash sandbox not used (Read/Grep/Glob only).

## Verification of prior findings

| Prior ID | Prior claim | 2026-06-14 verdict | Evidence |
|----------|-------------|--------------------|----------|
| INT-1 | PAYROLL_PROCESSING_DLT missing from DeadLetterHandler — fixed | **STILL HOLDS (FIXED)** | `DeadLetterHandler.java:119` topic present in `@KafkaListener` array; `:98` counter pre-registered; offset-keyed idempotency + `release()` on error `:138,161` intact |
| INT-2 | DocuSign HttpRequest no timeout — fixed | **STILL HOLDS (FIXED)** | All 7 builder sites carry `.timeout(Duration.ofSeconds(30))`: `DocuSignApiClient.java:127,182,235,286,330,406` + `DocuSignAuthService.java:274` |
| INT-4 | Webhook retry sweep orphans PENDING/DELIVERING — fixed | **STILL HOLDS (FIXED)** | Reclaim query `WebhookDeliveryRepository.java:74-94` + wired into `WebhookDeliveryService.processRetries` `:510-526` (10-min stale cutoff, resets to RETRYING due now) |
| INT-3 | No transactional outbox; fire-and-forget publishes — STILL OPEN | **CONFIRMED OPEN** | `EventPublisher.sendEvent` `:328-350` propagates failure correctly, but call sites ignore the returned future (`AssetManagementService.java:485`, `ExitManagementService.java:303`, `BenefitEnhancedService.java:698`, `BlogPostService.java:247`, `KafkaDomainEventBridge.java:126,220,275`). Only `PayrollController.java:148` blocks/compensates. No `outbox` table/refs in code. |
| INT-5 (HTTP) | Un-timed HttpRequest in AuthService Google OAuth + Slack — STILL OPEN, MEDIUM | **CONFIRMED OPEN (slightly worse)** | `AuthService.java:453,479` build requests with no `.timeout()` AND the client is `HttpClient.newHttpClient()` `:452` (no `connectTimeout` either — both phases unbounded). `SlackNotificationService.java:134,177,232` have no per-request `.timeout()` (client has `connectTimeout(10s)` `:54` but read-wait is unbounded). |
| INT-5 (consumer release — prior MEDIUM, separate item in integration.md) | 4 consumers claim via `tryProcess()` but never `release()` on failure | **NOW RESOLVED across all 4** | `ApprovalEventConsumer.java:80,104`, `EmployeeLifecycleConsumer.java:81,109`, `NotificationEventConsumer.java:78,104` use the `claimed`+`release()` idiom; `AuditEventConsumer.java:141` releases claims on batch-persist failure (batch idiom). No remaining gap. |
| INT-7 | HTTP POST inside `@Transactional` (Hikari hold) | **STILL OPEN** | `WebhookDeliveryService.dispatchEvent` `:137` and `processRetries` `:508` remain `@Transactional`; outbound `deliveryRestTemplate.exchange` `:228` executes inside the tx (10s connect + 30s read = up to ~40s connection hold) |
| INT-8 | No Kafka health indicator | **STILL OPEN** | Only `WebhookHealthIndicator`, `RedisHealthIndicator`, `DatabaseHealthIndicator`, `ApplicationHealthIndicator` exist; no `KafkaHealthIndicator` |
| INT-9 | Dead webhook dedup check (`existsByWebhookIdAndEventId` on fresh random UUID) | **STILL OPEN** | `WebhookDeliveryService.java:157` generates `eventId = UUID.randomUUID()`, `:169` checks existence of it — can never match |

## Findings (this run)

| ID | Severity | Module | Description | Impact | Exact Fix (file:line) | Owner Agent | Status |
|----|----------|--------|-------------|--------|-----------------------|-------------|--------|
| INT-3 | HIGH | Kafka publish path | No transactional outbox. `EventPublisher.sendEvent` (`EventPublisher.java:328`) returns a future that completes exceptionally on broker failure (R2-004 fix verified), but 7 of 8 call sites discard it. DB commit succeeds; if the broker is down at publish, the event is dropped with only an ERROR log. | Broker outage at commit time silently loses approval, employee-lifecycle, audit, and fluence-content events. Compliance/audit gaps, ES↔PG index drift, missing downstream automation. | Short-term: for state-changing events follow `PayrollController.java:148` (`.get()` + compensate); for audit/fluence add an `exceptionally` handler that persists to `failed_kafka_events` (table exists, `V32__failed_kafka_events.sql`) for replay. Long-term: ADR + outbox table polled by a publisher job. Sites: `AssetManagementService.java:485`, `ExitManagementService.java:303`, `BenefitEnhancedService.java:698`, `BlogPostService.java:247`, `KafkaDomainEventBridge.java:126,220,275`. | architect + dev | OPEN (documented risk; too large for this window) |
| INT-5 | MEDIUM | auth / Slack | Un-timed `HttpRequest`s outside INT-2 scope. `AuthService.java:453,479` (Google OAuth userinfo + tokeninfo) have no `.timeout()` and use `HttpClient.newHttpClient()` (`:452`) which sets no `connectTimeout` — both connect and response wait are unbounded. `SlackNotificationService.java:134,177,232` have no per-request `.timeout()`; the shared client (`:54`) bounds connect (10s) but not response. | Thread-hang class identical to INT-2: a hung Google/Slack endpoint pins the request/`@Async` thread indefinitely, leaking threads under load. Google OAuth path is on the interactive login flow. | (1) `AuthService`: replace `HttpClient.newHttpClient()` with a `connectTimeout(10s)` builder and add `.timeout(Duration.ofSeconds(30))` to both requests (`:453,:479`). (2) `SlackNotificationService`: add `.timeout(Duration.ofSeconds(30))` to the 3 builders (`:134,:177,:232`). | dev | OPEN (MEDIUM; post-release acceptable, but trivial to fix now) |
| INT-7 | MEDIUM | Webhooks / DB pool | Outbound webhook POST runs inside the `@Transactional` dispatch/retry path (`WebhookDeliveryService.java:137,508`; HTTP at `:228`). Each in-flight delivery holds a Hikari connection up to ~40s. | A burst (bulk import firing many webhooks to slow endpoints) can exhaust the pool and stall unrelated requests. | Persist the delivery row in a short `REQUIRES_NEW` tx, perform HTTP outside any tx, persist result in a second short tx; remove `@Transactional` from the network-bearing methods. | dev | OPEN (unchanged from prior audit) |
| INT-8 | MEDIUM | Observability | No `KafkaHealthIndicator`. `/actuator/health` cannot report broker down. | Broker outage is invisible to readiness probes/uptime checks while every publish fails — compounds INT-3. | Add `KafkaHealthIndicator` using `KafkaAdmin.describeCluster()` with a 3s timeout (alert rules `hrms-slo-alerts.yml` already exist for DLT/lag). | dev | OPEN (unchanged) |
| INT-9 | LOW | Webhooks | Dead idempotency guard: `existsByWebhookIdAndEventId` checked against a freshly-generated `UUID.randomUUID()` (`WebhookDeliveryService.java:157,169`) — never matches. | No real dedup; a business op dispatching twice produces duplicate webhook events. Consumers cannot dedupe (ids differ). | Derive `eventId` from the triggering domain event (caller-supplied `sourceEventId`) or delete the misleading check and document at-least-once per ADR-004. | dev | OPEN (unchanged) |
| INT-15 | MEDIUM | Slack / fail-mode | `SlackNotificationService` is `@Async` and circuit-breaker wrapped, but a Slack outage combined with the missing read timeout (INT-5) means each async send can park a task-executor thread for the full TCP/socket-read default. With a bounded async pool, a Slack brownout can starve the pool that other `@Async` work shares. | Slack degradation cascades into other async work (webhook dispatch, email enqueue) if they share the executor. Severity contingent on INT-5 not being fixed. | Fixing INT-5 (add `.timeout(30s)`) bounds this. Optionally give Slack its own dedicated bounded executor. | dev | OPEN (collapses once INT-5 lands) |

## Area verdicts (2026-06-14)

| Area | Verdict | Notes |
|------|---------|-------|
| Kafka consumer idempotency | **PASS** | All 7 listeners use atomic SETNX claim; the prior INT-5 consumer-release gap is now closed in all 4 consumers (Approval/EmployeeLifecycle/Notification via `claimed`+`release`; Audit via batch claim-release on persist failure). |
| Kafka DLQ/retry | **PASS** | INT-1 fixed and holding — PAYROLL_PROCESSING_DLT consumed, counter registered, offset-keyed idempotency with release-on-error. |
| Broker-down at publish | **FAIL until INT-3** | Bounded fail-fast but fire-and-forget at 7/8 call sites; no outbox. Documented known risk. |
| Redis degradation | **PASS w/ decision item** | Cache→DB fall-through, token-blacklist in-memory fallback, per-tenant rate-limit Bucket4j fallback. AUTH bucket fails closed by design (prior INT-6, login-outage trade-off). |
| Elasticsearch | **PASS** | Index failures retried via Kafka+DLT; search 5xx during outage only (prior INT-13, LOW); PG remains source of truth. |
| File storage (Google Drive) | **PASS** | Loud upload failure, AV-scan-first, tenant-scoped mapping; orphan cleanup report-only (prior INT-11, LOW). |
| Email | **PASS** | Persisted+retried, tight SMTP timeouts; minor tx coupling (prior INT-14, LOW). |
| Webhooks | **PASS w/ caveat** | HMAC + dual-secret rotation, SSRF re-check + redirect block, circuit breaker, backoff, ShedLock sweep; INT-4 stale-row reclaim now wired. Caveats: INT-7 (HTTP-in-tx), INT-9 (dead dedup). |
| DocuSign | **PASS** | All 7 HTTP sites timed (INT-2 holds); SSRF allowlist on every URL; circuit breaker; per-tenant rate limit. |
| Slack | **PASS w/ caveat** | Circuit breaker + SSRF allowlist + `@Async`; caveat INT-5/INT-15 (missing read timeout). |
| HTTP timeouts | **PASS w/ caveat** | Webhook 10s/30s, AI RestTemplate 30s/60s (shared by CaptchaService/AIRecruitmentHelper/JobBoardIntegrationService), SAML 10s, LLM streaming 30s/120s, SMTP/Redis bounded, DocuSign 30s. Caveat: INT-5 (AuthService Google OAuth unbounded both phases; Slack unbounded read). |
| Observability | **PASS w/ gap** | 4 custom health indicators + DLT counters + Prometheus alert rules. Gap: no Kafka health indicator (INT-8). |

## Net change vs prior integration audit

- **Improved:** INT-1, INT-2, INT-4 fixes verified intact. The prior consumer-`release()` gap (listed against 4 consumers) is now fully closed — no longer an open item.
- **Still open (blocking class):** INT-3 (HIGH) — fire-and-forget publishes, documented as accepted risk for this window.
- **Still open (non-blocking):** INT-5 (MEDIUM, trivial fix), INT-7/INT-8 (MEDIUM), INT-9 (LOW), INT-15 (MEDIUM, collapses with INT-5).
- **No new CRITICAL or HIGH integration defects found** beyond the already-tracked INT-3.
