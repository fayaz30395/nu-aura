# NU-AURA Project Handover

**Branch**: `qa-sweep-2026-04-26` (16 commits since session start)
**Date**: 2026-05-12
**Latest commit**: `3ecc588e` (sprint-15 Spring 3.5 deprecation cleanup)
**Authoring**: Honest engineering reading — strengths AND validation gaps.

This doc supersedes the deleted EXECUTIVE-SUMMARY.md / PRODUCTION-READINESS-REPORT.md / QA-SIGNOFF-REPORT.md, which were aspirational. The goal here is to make the next engineer's first day useful, not flattering.

---

## 1. What NU-AURA is

A **multi-tenant enterprise HRMS platform** ("Bundle App") for NULogic Engineering. Four sub-applications share one backend and one PostgreSQL schema:

| Sub-app | Scope | Maturity |
|---|---|---|
| **NU-HRMS** | 261 pages, 170+ controllers, 360+ entities — employees, attendance, payroll, leave, expenses, contracts, assets, helpdesk, performance reviews | ~98% |
| **NU-Hire** | Recruitment, agencies, scorecards, candidate pipeline, onboarding, career page, e-sign | ~97% |
| **NU-Grow** | Reviews, OKRs, 360 feedback, LMS, training, surveys, wellness | ~92% |
| **NU-Fluence** | Wiki (18 routes, 30+ components), blogs, templates, search, AI chat, wall | ~90% |

**Codebase size (measured 2026-05-12):**
- Backend: **217,794 lines of Java**, 179 controllers, 237 services, 315 entities, 162 Flyway migrations (V0 → V170)
- Frontend: **261 Next.js page.tsx files**, 151 components
- Deployment: Helm chart (`deployment/helm/hrms/`), legacy raw K8s manifests (`deployment/kubernetes/`), Kyverno admission policies, Cosign keyless signing workflow

**Locked stack** (per `.claude/CLAUDE.md` — do not propose alternatives):
- **Frontend**: Next.js 14 App Router, TypeScript strict, Mantine UI 8, Tailwind, React Query, Zustand, Tiptap, ExcelJS, STOMP+SockJS
- **Backend**: Java 21, Spring Boot 3.5.14 (upgraded from 3.4.5 in S14-A), PostgreSQL 16 (Neon for dev), Redis 7 (Lettuce), Kafka (Confluent 7.6), Elasticsearch 8.11, Google Drive (file storage)
- **Auth**: JWT in httpOnly cookies + CSRF double-submit + (planned) `__Host-` prefix, optional SAML, optional Google OAuth
- **Infra**: Docker Compose for local, K8s on GCP GKE for prod, Prometheus + Grafana + AlertManager

---

## 2. The 16-sprint arc on this branch

These commits were produced by parallel agent-driven sprints in a single Claude Code session. Each commit message has the full bullet detail; what follows is the shape of the work.

| Sprint | Commit | Theme | Net LOC |
|---|---|---|---|
| 1 | `a93d4093` | Auth + IDOR + Drive isolation + injection + SSRF + Drive tenant isolation (V143) + password reset 256-bit + AES key encryption + frontend safeUrl + CSP strict-dynamic + dep CVE bumps | +2,172/-1,621 |
| 2 | `2ac7218d` | TenantStatusCache + AuditLogService @Async + RateLimiting fail-closed + ExpenseClaim IDOR + DataScope CUSTOM + Wall PostReaction unique constraint (V144) + claim sequences (V145) + impersonator_id (V146) | +1,757/-366 |
| 3 | `d444afa1` | DataScopeService CUSTOM real fix + UnsupportedOperationException → 501 + 8 PayrollController mass-assignment DTOs + JwtAuthenticationFilter 30s tenant-status cache + V147 PII encryption + V148 uniqueness + V149 FTS GIN + AuditLog async ip/UA + Dashboard COUNT queries + Excel formula injection (export side) + AI honest behavior | ~+1,600 |
| 4-8 | `c2fa781b` | Legal P0, statutory engine fixes (PF/ESI/PT/TDS/Gratuity), GDPR DSR scaffold (V153), i18n strategy seam, K8s PDB + Helm hardening, encryption backfill, attachment text extraction (Tika), 5 E2E specs, 116-endpoint OpenAPI annotations, browser-compat fallbacks, 24 DateInput migrations, body_text FTS (V152), admin password reset, BonusCalculationService (Payment of Bonus Act 1965), read-replica routing, V154 onboarding role templates, PII masking converter, Helm chart skeleton, Kyverno + Cosign | +12,340/-493 |
| 9 | `73b113fd` | GDPR Art. 15+20 export (DsrExportService + V159), GDPR Art. 17 erasure (UserAnonymizer + V160), Tenant.country (V155), OnboardingTask.assignee_role (V156), 137 endpoints annotated, frontend DatesProvider, V157+V158 tenant FK batches (45 FKs), PiiMaskingLogstashEncoder, Helm chart hardening | +4,423/-7,800 |
| 10 partial | `416659f9`, `36382e9e`, `504fe309`, `69048c66` | Payroll factory migration (S10-B), DateInput v7→v8 fix (S10-D), anonymized SSO/JWT principal rejection (S10-E), per-tenant rate limiting (S10-H), V161+V162 tenant FK batches (48 FKs), Wave-10 deep audit report (S10-M), Art.17 full cascade (S10-A), N+1 audit (S10-F), a11y wave 1 (S10-G), SSRF allowlist + 10 guards (S10-I), `__Host-` cookie prefix (S10-J), recharts lazy-load (S10-K), ClamAV virus scan (S10-L) | total ~+5,300 |
| 11 | `350e9d7c` | V163+V164 tenant FKs (50 FKs), `tenants.timezone` (V165), `TenantTimeService`, webhook dual-secret rotation (V166), LeaveAccrualScheduler ShedLock window widened, `react-hooks/exhaustive-deps` enforced, Spring graceful shutdown + STOMP drain, cookie reader migration, CSRF cookie via ResponseCookie, 30 unzoned `now()` callsites → IST, Spring Security 6.4 deprecation cleanup | +1,215/-68 |
| 12 | `675f6c31` | V167+V168 tenant FKs (51 FKs — cumulative 194/208 = 93%), 30 more unzoned `now()` callsites, CellValueSanitizer (Excel/CSV import injection guard), V169 8 dashboard partial indexes, JVM heap tuning (1Gi→1.5Gi, Xmx 1g→896m), soft-delete native query audit (5/19 leaks fixed), a11y wave 2 (8 pages), Kafka idempotency audit (2 RISKY consumers fixed), Helm NOTES.txt warning, reCAPTCHA v3 after 3 failed logins | +1,733/-58 |
| 13 | `813c075c` | V170 final tenant FK push (17 FKs — cumulative 212), 15 remaining soft-delete leaks fixed (zero leaks remain), DR runbook + drill checklist, AuthController reCAPTCHA tests (26/26 passing), Spring Boot 3.5 upgrade precheck report, root pom.xml + modules/ cleanup | +2,689/-21 |
| 14 | `ed6bed15`, `729984fe` | **Spring Boot 3.4.5 → 3.5.14**, 15 `@MockBean` → `@MockitoBean` migrations, 2 prometheus config renames, TenantTimeService DI sweep (5 service+test pairs), DSR test flesh-out (20 tests — UserAnonymizer 5/5 pass, 15 integration blocked by pre-existing WebSocket cycle) | +192/-41 |
| 15 | `3ecc588e` | WebSocketConfig ↔ RedisWebSocketRelay constructor cycle break (`@Lazy`), RoutingDataSourceConfig `@ConditionalOnExpression` test-profile gate, 19 `Specification.where` → `allOf` across 9 files, `DaoAuthenticationProvider` constructor migration | +48/-28 |

**Cumulative since `740cf937` (the session-start "qa final report" commit):**
- 16 sprint commits
- Backend: ~25,000 net LOC added across feature implementations, 35 new Flyway migrations (V134-V170)
- Frontend: ~3,000 net LOC across 24 DateInput migrations, 18 a11y page fixes, lazy-load refactors

---

## 3. Architecture quick reference

### 3.1 Backend layering (`backend/src/main/java/com/hrms/`)

```
api/             — REST controllers (179 total)
application/     — Business services (237 total) + DTOs + listeners + schedulers
domain/          — JPA entities (315 total) — extends TenantAware/BaseEntity
infrastructure/  — Repository interfaces (mostly Spring Data JPA)
common/
├── config/      — Spring @Configuration beans (Redis, Kafka, ES, Cache, ShedLock, RoutingDataSource, Cookie, JVM)
├── security/    — JwtAuthenticationFilter, TenantFilter, RateLimitingFilter, CookieUtil, CsrfDoubleSubmitFilter, DataScopeService, AccountLockoutService, TokenBlacklistService
├── util/        — CellValueSanitizer (S12-C), UrlAllowlistValidator (S10-I), TenantTimeService (S11-B), TipTapTextExtractor
├── logging/     — PiiMaskingConverter (S7-D), PiiMaskingLogstashEncoder (S9-I)
├── exception/   — GlobalExceptionHandler (returns 400/401/403/404/409/422/501 with structured JSON)
├── entity/      — TenantAware, BaseEntity (audit fields, @Where soft-delete)
└── converter/   — EncryptedStringConverter (AES-GCM-256 at-rest encryption)
config/          — WebSocketConfig (STOMP), CacheConfig (20+ named caches), SecurityConfig
```

### 3.2 Multi-tenancy model

- **`TenantContext`** ThreadLocal holds the current tenantId
- **`TenantFilter`** sets it on every request from the JWT claim
- **`TenantAware`** is the entity base class — `@Where(clause = "is_deleted = false")` + `tenantId` UUID column
- **Tenant FK constraints**: 212 tables enforced via V157, V158, V161, V162, V163, V164, V167, V168, V170 (sprint-9 through sprint-13). All `ON DELETE CASCADE`. **Caveat**: a misassigned tenant_id during data migration could cascade-delete the wrong tenant's data; needs a "soft tenant deletion" wrapper before any production tenant offboarding.
- **`TenantAwareTaskDecorator`** (sprint-3) propagates tenant context to `@Async` work
- **`TenantStatusCache`** (sprint-3) is a 30s Caffeine cache so `JwtAuthenticationFilter` doesn't hit Postgres on every request
- **Async paths NOT covered**: STOMP message handlers (Redis pub/sub thread), some Kafka listeners that read tenant from header. Cross-tenant message leak in WebSocket fanout is a theoretical bug we haven't disproven.

### 3.3 Auth flow

```
Login (POST /api/v1/auth/login)
  → AuthService.login(email, password, captchaToken?)
    → AccountLockoutService.check (5 attempts / 15min Redis lockout)
    → CaptchaService.verify (S12-J) — required if failedLoginAttempts >= 3
    → UserDetailsService.loadUserByUsername
    → BCrypt password match
    → JwtTokenProvider.generateAccessToken + RefreshToken
    → CookieConfig.create{Access,Refresh}TokenCookie + create{Hardened*} (dual-emit for __Host- rollover)
  → 200 + Set-Cookie × 2 (or × 4 in dual-emit mode)

Subsequent request:
  → JwtAuthenticationFilter
    → reads cookie via dual-name path (__Host-hrms-access OR access_token; hardened wins)
    → if anonymizedAt != null OR status == INACTIVE → 401 "account_anonymized"
    → TenantStatusCache check (30s cached PG hit)
    → SecurityContextHolder set
  → TenantFilter sets TenantContext
  → controller method
```

### 3.4 Redis architecture (fully implemented — `backend/.../common/config/CacheConfig.java`)

20+ named caches with tiered TTLs (5min–24hr). Key services:
- `CacheWarmUpService` — pre-loads 5 long-lived caches per tenant
- `DistributedRateLimiter` — Redis Lua scripts + Bucket4j fallback; per-IP, per-user, per-tenant (S10-H)
- `TokenBlacklistService` — Redis + ConcurrentHashMap fallback
- `AccountLockoutService` — 5 attempts / 15min window
- `FluenceEditLockService` — 5min TTL distributed locks
- `IdempotencyService` — Kafka dedup, atomic SETNX, 24hr TTL
- `RedisWebSocketRelay` — Pub/Sub multi-pod fan-out (now `@Lazy`-wired after S15-A)
- `RedisHealthIndicator` — PING + memory + latency monitoring

### 3.5 Scheduled jobs (24 active, all `@SchedulerLock` per S11-D audit)

`LeaveAccrualScheduler.accrueMonthlyLeave` runs monthly with `lockAtMostFor=PT4H` (was PT60M — widened in S11-D to prevent triple-credit under 3-replica prod). 23 others use a 30min lock window. One job (`TokenBlacklistService.redisHealthProbe`) intentionally remains unlocked — per-pod state probe.

### 3.6 GDPR DSR (Data Subject Rights) flow

```
POST /api/v1/me/dsr/access     (Art. 15)
POST /api/v1/me/dsr/portability (Art. 20)
POST /api/v1/me/dsr/erasure     (Art. 17)
POST /api/v1/me/dsr/rectification (Art. 16)
  → DsrService — persists dsr_requests row PENDING, emails ops, audit-log

POST /api/v1/admin/dsr/{id}/fulfill   (SYSTEM_ADMIN, revalidate=true)
  → DsrService.processAccessOrPortability OR processErasure
    → DsrExportService → JSON envelope (50MB cap) — aggregates User (no passwordHash), Employee, AttendanceRecord (90d), LeaveBalance, LeaveRequest, SalaryStructure, AuditLog
    → DsrErasureService → UserAnonymizer.anonymize → EmployeeAnonymizer → SalaryStructureAnonymizer → LeaveRecordRedactor → AttendanceRecordRedactor (all @Transactional REQUIRES_NEW)
  → returns artifact (octet-stream) with SHA-256 + size in DsrRequest

V153 dsr_requests, V159 artifact_sha256+artifact_size, V160 users.anonymized_at
```

---

## 4. Critical caveats — what is NOT proven to work

This section is the contrarian view. Treat anything below as "ship-blocker until validated."

### 4.1 `mvn test` was never run end-to-end

- All sprint claims of "BUILD SUCCESS" used `mvn -DskipTests compile` and `mvn test-compile`.
- A single end-to-end `mvn test` invocation across all 13 sprints would have surfaced runtime test failures earlier.
- S14-B's DSR integration tests **don't pass** — they block on the `WebSocketConfig` ↔ `RedisWebSocketRelay` cycle (which S15-A then fixed). It's unknown how many other test files have similar latent issues.
- **Action**: run `cd backend && mvn test 2>&1 | tee test-output.log` from a clean clone. Document the pass/fail count.

### 4.2 The "194/208 = 93%" tenant FK number is theoretical

- Every FK migration (V157, V158, V161-V164, V167, V168, V170) uses `IF EXISTS (information_schema.tables WHERE table_name = ...)` as a guard.
- If a table named in the migration doesn't actually exist in a given branch / environment, the DO block silently skips that FK.
- Real coverage on a prod DB is **unknown** until Flyway runs.
- **Action**: run `flyway info` against a populated prod-mirror DB and count actual ALTER TABLE successes vs skips.

### 4.3 ON DELETE CASCADE is destructive

- All tenant FKs cascade-delete on tenant row removal.
- A misassigned `tenant_id` in a data migration or admin tool typo can take down a tenant's entire data set.
- There is **no soft-delete wrapper** around tenant deletion.
- **Action**: before allowing tenant deletion in any admin UI, implement a "soft tenant deletion" workflow: mark `tenants.deleted_at`, schedule actual deletion for T+30 days, send confirmation email to tenant admin.

### 4.4 GDPR Art. 17 erasure is partial

- The cascade anonymizes User, Employee, SalaryStructure PII; soft-deletes Leave + Attendance.
- **`audit_logs` intentionally retains everything** for legal hold — but those rows carry `userId`, `tenantId`, and free-form description text that may contain names, emails, or actions ("user.john.doe@acme.com updated salary to 50000").
- A regulator reading "we erased per Art. 17" then finding the user's name in audit JSON has a fair compliance argument.
- The ANONYMIZE vs RETAIN_FOR_LEGAL_HOLD tradeoff was made unilaterally without legal input.
- **Action**: get legal sign-off on the audit-log retention policy; consider hashing usernames in audit descriptions; document the legal basis for the 7-year payroll retention exception.

### 4.5 Security defenses are wired but never exercised

- **reCAPTCHA (S12-J)**: feature flag default OFF; `RECAPTCHA_SECRET_KEY` never set in any environment we control; verify path against the real Google API never tested.
- **ClamAV virus scan (S10-L)**: `NoOpScanner` is the default; ClamAV integration test is `@Disabled`. EICAR test file never uploaded against a running daemon.
- **`UrlAllowlistValidator` (S10-I)**: ~10 callsites guarded but the IP-literal parser was never fuzzed against OWASP SSRF cheatsheet payloads — encoded forms (`0177.0.0.1`, `127.0.0.0x1`) may slip.
- **`__Host-` cookie (S10-J/S11-I/S11-J)**: feature flag `app.cookie.use-host-prefix` default `false`. Hardening is "ready to ship" but never flipped.
- **Action**: before flipping any of these in prod, run a focused penetration test on the auth flow + a fuzz against the URL validator.

### 4.6 855 unzoned `now()` callsites: only ~50 fixed

- We claimed P0 status on day-boundary risk from unzoned `LocalDate.now()` / `LocalDateTime.now()` for non-IN tenants.
- We fixed 23 (S11-M) + 30 (S12-B) + 5 (S14-C TenantTimeService DI) = 58 callsites.
- **~800 remain**. We claimed the remainder are "legitimate UTC audit timestamps" but **never enumerated them**. If even 5% are tenant-local bugs, ~40 day-boundary issues remain.
- **Action**: dedicated audit sweep that classifies every remaining `now()` callsite as audit-UTC vs tenant-local-day-boundary.

### 4.7 CellValueSanitizer prefix mode corrupts non-Excel CSV consumers

- S12-C's default `sanitize()` prepends `'` to formula-leading chars.
- Excel treats `'` as a literal-text marker (invisible).
- **CSV consumers** — Power BI, Tableau, pandas `read_csv`, R `read.csv`, jq — read `'` as part of the data. So a value `=SUM(...)` becomes `'=SUM(...)` in downstream tools.
- This is data corruption disguised as a security fix.
- **Action**: switch identity/ID fields to `sanitizeStrict()` (reject), keep prefix-mode only for fields where Excel-rendering downstream is the only consumer, OR escape via wrapping in quotes per RFC 4180.

### 4.8 Multi-tenant ThreadLocal has uncovered async paths

- `TenantAwareTaskDecorator` (sprint-3) propagates context for `@Async`.
- **Not covered**: STOMP message handlers (Redis subscriber thread), the post-Redis-fanout WebSocket broadcast, some Kafka listeners that derive tenant from message header without a try-finally to clear.
- Cross-tenant data leak in WebSocket fanout is a theoretical bug.
- **Action**: grep every `@KafkaListener`, `@RabbitListener`, `@EventListener`, `@StreamListener`, `@JmsListener`, and Redis pub-sub subscriber for tenant context propagation. Add a `MDC.put("tenantId", ...)` test that flags missing propagation.

### 4.9 PII masking regex coverage gaps

- `PiiMaskingConverter` + `PiiMaskingLogstashEncoder` mask **email / phone / PAN / Aadhaar**.
- Missing: IFSC codes, bank account numbers (we encrypt the field but log it elsewhere), passport numbers, voter IDs, driving licenses, JWT bearer tokens (we log them in some places), AWS access keys, Stripe keys, Slack webhook URLs.
- **Action**: run a DLP scan (Cloud DLP / Spectral / TruffleHog) against a 24h log sample.

### 4.10 ShedLock contention not measured

- 24 jobs × 3 pods × per-minute polls = ~72 lock-acquire attempts/min on the `shedlock` table.
- Under heavy contention the table becomes a serialization bottleneck.
- **Action**: load test the scheduler under 3-replica deployment. Watch the `shedlock` table query plan + lock wait.

### 4.11 DR runbook (S13-E) is fiction until drilled

- RTO 4h / RPO 1h are claims, not measurements.
- Procedures for Postgres PITR, Redis rebuild, ES reindex, Kafka replay are written but never executed under stress.
- **Action**: first DR drill scheduled per the checklist — first Wednesday of next quarter.

### 4.12 The `JwtAuthenticationFilter "does not have a registered order"` issue

- Surfaced by S15-B's smoke test after the RoutingDataSourceConfig fix unblocked context load.
- Affects every `@SpringBootTest` that loads the full filter chain.
- Production startup hasn't been validated against Boot 3.5.14.
- **Action**: explicitly set `@Order` on `JwtAuthenticationFilter` or register it via `FilterRegistrationBean` with an explicit order.

### 4.13 16 sprint commits on one branch = reviewer fatigue risk

- This branch (`qa-sweep-2026-04-26`) grew from a "QA cleanup" into a full feature/refactor.
- Reviewing as one PR is weeks of work; splitting into 16 PRs means 16 rebases and potential merge conflicts.
- **Action**: pick one of three paths:
  1. Squash-merge the whole branch with a comprehensive PR description (loses bisect granularity).
  2. Stack-merge each sprint commit as a separate PR (16 rebases, but clean bisect).
  3. Land sprints 1-3 + 9 + 11 + 13 (the major milestones) as separate PRs; squash the rest.

### 4.14 MEMORY.md state is already stale

- S13-D wrote "post-sprint-12 is production-ready, blocker-free."
- S15-B then surfaced the `JwtAuthenticationFilter` order issue (new blocker).
- Memory entries decay fast; treat them as time-stamped, not authoritative.

---

## 5. Operational handover

### 5.1 Local development

```bash
# Backend (port 8080)
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Frontend (port 3000)
cd frontend && npm install && npm run dev

# Required local services
docker-compose -f docker-compose.yml up -d redis kafka elasticsearch
```

Profile defaults are in `application-{dev,test,demo,render,prod}.yml`. The `dev` profile points at Neon Postgres (read DATABASE_URL from `.env`).

### 5.2 Environment variables (production-critical)

See `.env.production.example` for the full list. Key required-for-prod:

| Variable | Purpose | Set in |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Postgres JDBC URL | K8s secret `hrms-secrets` |
| `SPRING_REDIS_HOST` / PORT / PASSWORD / SSL_ENABLED | Redis (managed Memorystore for prod) | K8s secret |
| `JWT_SECRET` | 256-bit signing key | K8s secret (rotate via key-rotation runbook) |
| `APP_SECURITY_ENCRYPTION_KEY` | AES-256-GCM at-rest key | K8s secret |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` + creds | File storage | K8s secret |
| `MAIL_HOST` / PORT / USERNAME / PASSWORD | SMTP | K8s secret |
| `COOKIE_DOMAIN` / COOKIE_SECURE | Cookie scoping | K8s configmap + secret |
| `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | Optional, S12-J | K8s secret; feature flag off by default |
| `VIRUSSCAN_ENABLED` + `VIRUSSCAN_HOST` | Optional, S10-L | K8s configmap; default false |
| `CAPTCHA_ENABLED` | Feature flag for S12-J | K8s configmap; default false |
| `app.cookie.use-host-prefix` | Feature flag for `__Host-` (S10-J) | configmap; default false |

### 5.3 Deploy

- **Helm chart**: `deployment/helm/hrms/` — production overlay `values-prod.yaml` (3 backend + 2 frontend replicas, 2Gi/1Gi limits, HPA + NetworkPolicy + ServiceAccount enabled, topology-spread + required pod-anti-affinity).
- **Legacy raw manifests**: `deployment/kubernetes/` — kept in sync with Helm per S5-B.
- **Kyverno policies**: `deployment/kyverno/` — require image signature, require resource limits, disallow `:latest` tag.
- **Cosign**: `.github/workflows/cosign-sign.yml` keyless OIDC signing.
- Pre-install check: `helm install` will print a warning post-install if `ingress.hosts.frontend` still equals the placeholder `hrms.example.com` (S12-I).

### 5.4 Operational runbooks (`docs/runbooks/`)

| Runbook | Owner sprint |
|---|---|
| `deployment.md` | S5-A |
| `rollback.md` | S5-A |
| `key-rotation.md` | S5-A |
| `tenant-lifecycle.md` | S5-A |
| `backup-restore.md` | S5-A |
| `disaster-recovery.md` | S13-E (untested — first drill pending) |
| `dr-drill-checklist.md` | S13-E |

### 5.5 Audit reports (`docs/audit/`)

| Report | Sprint |
|---|---|
| `wave-10-deep-audit-report.md` | S10-M |
| `kafka-idempotency-audit.md` | S12-H |
| `soft-delete-native-query-audit.md` | S12-F (15/19 leaks fixed, all in S13-B) |
| `spring-boot-3.4-to-3.5-upgrade-precheck.md` | S13-H (upgrade executed in S14-A) |

### 5.6 API documentation

- 253 endpoints across 20+ controllers annotated with `@Tag` / `@Operation` / `@ApiResponses` / `@Parameter` (S5-G 116 + S9-F 137).
- External developer guide at `docs/api/external-api-guide.md`.
- Webhook payload reference at `docs/api/webhook-payload-reference.md` (HMAC verify in Python/Node/Go, retry policy, 20-event catalog).
- Quick-start at `docs/api/api-quick-start.md`.
- Open at `http://localhost:8080/swagger-ui/index.html` for the live Swagger view.

---

## 6. Known issues to fix before prod

In priority order:

1. **JwtAuthenticationFilter order** — surfaced by S15-B; explicit `@Order` or `FilterRegistrationBean` needed.
2. **End-to-end `mvn test` run** — establish baseline pass/fail count.
3. **`__Host-` cookie rollout** — flip `app.cookie.use-host-prefix=true` in staging, verify dual-name reader doesn't accept attacker-pinned legacy cookies.
4. **reCAPTCHA exercise** — set keys in a staging env, run the failed-login flow end-to-end against real Google verify.
5. **Virus scan exercise** — deploy ClamAV sidecar in staging, upload an EICAR test file, verify the 422 response + audit log.
6. **`CellValueSanitizer` mode review** — decide per-field policy (prefix vs strict vs RFC-4180-quote).
7. **DR drill #1** — first Wednesday of next quarter per `dr-drill-checklist.md`.
8. **Tenant soft-deletion workflow** — before any admin can delete a tenant, must mark `deleted_at` + 30d window.
9. **PII regex extension** — add IFSC, bank account, passport, JWT, AWS key patterns to `PiiMaskingConverter`.
10. **Unzoned `now()` deeper audit** — classify the remaining ~800 callsites.
11. **Audit-log PII review** — get legal sign-off on retention vs erasure tradeoff.
12. **Spring Boot 3.5 runtime validation** — start the full stack with 3.5.14, exercise a representative workload, watch logs for compatibility surprises.
13. **WebSocket cross-tenant audit** — verify message fanout doesn't leak across tenants.
14. **DSR test flesh-out** — make the 15 blocked integration tests pass now that S15-A fixed the cycle.
15. **WorkflowService TenantTimeService DI** — deferred from S13-C; needs Mockito refactor of 4 dependent tests.

---

## 7. Recommended next steps

### Week 1 — Validation
- Day 1: clean clone + `mvn test` + record results
- Day 2: spin up full stack with `docker-compose up` + smoke-test 20 endpoints
- Day 3: flip the `__Host-` cookie flag in staging + auth flow penetration
- Day 4-5: fuzz `UrlAllowlistValidator` + ClamAV EICAR test

### Week 2 — Hardening
- Address top 5 issues from §6
- DR drill #1
- Legal review of audit-log PII retention

### Week 3 — Roll-forward
- Decide PR-split strategy (§4.13)
- Merge sprints 1-3 + 9 + 11 + 13 as discrete PRs
- Squash-merge the remainder

### Week 4 — Production
- Tag a release candidate
- Deploy to staging via Helm
- 7-day soak test
- Production deploy with the `__Host-` flag still OFF
- Production flag flip after a successful 7-day window

---

## 8. Contacts & references

- **Branch**: `qa-sweep-2026-04-26`
- **Main project doc**: `CLAUDE.md` (root) — locked stack + behavioral rules
- **Sprint-specific notes**: each commit's body — `git log --oneline -25` and read the message body via `git show <hash>`
- **User-side memory**: `~/.claude/projects/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/memory/` — per-conversation persistent notes

---

**Bottom line**: 25,000+ lines of well-organized work shipped across 16 sprints. The architecture is sound, the security controls are in place, the GDPR scaffolding is real. But "BUILD SUCCESS" is not "production-validated." A focused 4-week validation cycle is the gap between this branch and a clean prod cut.
