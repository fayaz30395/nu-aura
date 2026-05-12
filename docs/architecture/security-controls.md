# Security Controls — Canonical Reference

> Last updated: 2026-05-12 | Wave-4 doc audit (S8-A)
> Supersedes individual sprint audit reports — this is the single source of truth for the
> NU-AURA security posture. Audit-finding tickets remain authoritative for traceability.

This document records **what controls exist today**, **which sprint delivered each**, and
**what is still open**. Implementation details (filter chain, JWT claims, rate-limit table) live in
[`Backend.md`](./Backend.md#security-architecture); this file focuses on posture, decisions, and
gaps.

---

## At-a-glance status

| Layer                               | Status         | Owner control                                     |
|-------------------------------------|----------------|---------------------------------------------------|
| Authentication                      | Strong         | JWT in httpOnly cookie + Bearer gated default-off |
| Tenancy isolation                   | Strong         | Filter chain + RLS + Drive mapping                |
| Authorization (RBAC)                | Strong         | 98% coverage; CUSTOM scope strict allowlist       |
| Input validation / mass-assign      | Strong         | Whitelist DTOs across payroll, employee, payment  |
| IDOR / BOLA                         | Strong         | Sweep on loan, expense, payment, employee, asset  |
| Cryptography (at rest)              | Strong         | AES-GCM `EncryptedStringConverter` widening V147  |
| Secrets management                  | Adequate       | Env vars; rotation tracked in runbooks            |
| Rate limiting / DoS                 | Strong         | Bucket4j + Redis distributed limiter              |
| SSRF / outbound egress              | Strong         | SsrfProtectionUtils + dedicated webhook RT        |
| Audit trail                         | Strong         | `audit_logs` + `system_audit_logs` + impersonator |
| GDPR / DPDP DSR                     | **Scaffolded** | Sprint 7-A — `dsr_requests` (V153), endpoint stub |
| Statutory compliance engine         | **Skeleton**   | Sprint 7-B — design only, not production-ready    |
| Native mobile hardening             | **Open**       | Mobile endpoints gated by feature flags           |
| OpenTelemetry / distributed tracing | **Open**       | Micrometer Prometheus only today                  |
| Elasticsearch re-index pipeline     | **Open**       | Manual rebuild; idempotent pipeline pending       |

---

## Sprint 1 — Security foundations (commit `a93d4093`)

**79 audited findings closed** across 11 Critical / 24 High / 30 Medium / 14 Low items from the
6-auditor sweep.

### Auth & session hardening

- JWT in httpOnly cookies enforced; Bearer-header fallback gated by
  `app.security.allow-bearer-header` (default **false**).
- `JwtAuthenticationFilter` moves `TenantContext` set **after** user validation succeeds
  (prevents pre-auth tenant context contamination).
- `JwtTokenProvider.clockSkewSeconds(30)` on all parser chains.
- `TokenBlacklistService` — refresh-expiration injected; in-memory `revokedBefore` fallback
  when Redis is offline so logout never appears to succeed silently.
- `AccountLockoutService` — timing equalization via BCrypt burn (no username enumeration via
  response time delta).
- `TenantFilter` — `X-Tenant-ID` only consumed for `/api/v1/public/**` AND when no JWT cookie
  present (prevents header-override attacks on authenticated sessions).
- `SecurityConfig` — explicit auth-endpoint allowlist (removed `/api/v1/auth/**` wildcard);
  `ApiKeyAuthenticationFilter` wired before `JwtAuthenticationFilter`; Tomcat auto-registration
  disabled.
- Password-reset tokens: 256-bit, BCrypt-hashed at rest; **V134** migration adds
  `users.password_reset_token_hash` + partial index. `UserRepository.findByPasswordResetToken`
  deprecated in favour of `findActivePasswordResetCandidates(now)`.

### Tenant isolation — Drive file storage (CRITICAL)

The pre-sprint state stored opaque Google Drive `fileId` values as the canonical handle, returned
them in API responses, and granted `Permission(anyone, reader)` so the FE could render files. Any
tenant could fetch any other tenant's file by guessing/leaking the Drive ID.

- **V143** introduces `drive_file_mapping(logical_path, drive_file_id, tenant_id, uploaded_by,
  uploaded_at)`. `FileUploadResult.objectName` is now the **logical path** (e.g.
  `{tenantId}/employees/{employeeId}/avatar.png`), never the Drive fileId.
- `GoogleDriveStorageProvider` — removed the `anyone, reader` grant; `getDownloadUrl` now
  backend-proxied via `/api/v1/files/download/direct?objectName=…`.
- `GoogleDriveConfig` — scope reduced from `DriveScopes.DRIVE` → `DriveScopes.DRIVE_FILE`
  (least-privilege, only files this app created).
- `FileStorageService.getFileExtension` — path-strip, control-byte filter, 17-extension allowlist.
- `FileStorageService.detectMimeType` — ZIP signature only accepted for declared OOXML types.
- `FileUploadController` — load-bearing `startsWith(tenantId+"/")` guard.

### IDOR / BOLA sweep

- `LoanService.{getById, cancelLoan, recordRepayment}` — owner-or-`LOAN_VIEW_ALL/LOAN_MANAGE`.
- `ExpenseClaimService` — `validateEmployeeAccess` on update/submit/cancel/delete mutations.
- `PaymentController` + `PaymentTransactionDto` — strip caller-supplied server-controlled fields
  (`id`, `transactionRef`, `status`, `tenantId`, audit timestamps, `failedReason`).
- `EmployeeController` — `enforceEmployeeUpdateScope`; view-scope on
  `/hierarchy`, `/subordinates`, `/dotted-reports`.
- New `AdminEmployeeUpdateRequest` DTO at `PUT /api/v1/employees/{id}/admin`;
  `UpdateEmployeeRequest` trimmed to self-service fields only.
- `EmployeeDocumentController` — scope guard on `POST /{id}/documents`.
- `ContractService.getContractById` — non-HR caller must own contract.
- `AssetManagementService.{getAssetById, getAssetsByEmployee}` — assignee or `ASSET_MANAGE` only.

### Injection / output encoding

- Wiki/Blog FTS — `to_tsquery` → `websearch_to_tsquery` (untrusted-input safe).
- `KnowledgeSearchService` / `WikiPageService` — catch
  `InvalidDataAccessResourceUsageException` to avoid stack-trace leak.
- `ExportService` + `CustomReportService` — CSV formula injection prevented by prefixing
  `=+-@\t\r` cells with `'`.
- `JobBoardIntegrationService` — parameterized GraphQL variables for `jobStats`.
- 9 controllers — static `ALLOWED_SORT_FIELDS` allowlist for `sortBy` (no more reflective field
  access from query string).
- `SamlAuthenticationSuccessHandler` — stop reflecting `e.getMessage()` into redirect; emit
  classified error code instead.

### SSRF & outbound egress

- `SsrfProtectionUtils` — stricter `isBlocked` includes CG-NAT `100.64/10`, `0.0.0.0/8`, IPv6 ULA
  `fc00::/7`, IPv4-mapped IPv6 unwrap; `UnknownHostException` now rejects; IP-literal pre-check.
- `WebhookDeliveryService` — dedicated `RestTemplate` with `setInstanceFollowRedirects(false)`;
  SSRF re-check at delivery; 3xx treated as delivery failure; outbound `customHeaders` filtered
  (forbid `Authorization`, `Cookie`, `Host`, `Forwarded-*`); response body redacted.
- `WebhookService` + `WebhookController` — belt-and-braces SSRF check at create/update;
  `sanitizeCustomHeaders` strips forbidden headers.

### Secrets & dependency hygiene

- `scripts/db-{export,import}.sh` — fail-closed on `PGPASSWORD`.
- `docker-compose.yml` — `devRedis123!` fallback removed; `REDIS_PASSWORD` required.
- `KekaMigrationService` — per-user random temp password (was: `Welcome@123`).
- `DemoPasswordResetRunner` — **DELETED** (was auto-resetting `@nulogic.io` users every boot).
- `JwtSecretValidator` — substring-match + 6 new forbidden fragments.
- `User` entity — `@JsonIgnore` on `passwordHash`, `passwordResetToken`, `mfaSecret`.
- `application-prod.yml` — `springdoc.swagger-ui.enabled=false`, `show-actuator=false`,
  health `show-details=never`, `server.forward-headers-strategy=framework`.
- `application-test.yml` — H2 console disabled.
- `PasswordPolicyService` — blocklist for `Welcome@123` / `Nulogic@123` variants.
- `.gitignore` — `scripts/db-backups/` + `*.sql.gz`.

### Items requiring console action (NOT in sprint 1 commit)

These are documented in the sprint 1 commit footer; they require platform-team console access:

1. Rotate Neon DB password (was previously in `.env.example` per a wave-1 leak)
2. Rewrite git history to remove leaked credentials (`bfg-repo-cleaner`)
3. Force-reset 9 staff @nulogic.io passwords
4. Revoke Drive permissions on legacy `anyone, reader`-shared files

---

## Sprint 2 — Wave-2 patch + stub gating (commit `2ac7218d`)

**~50 of ~200 wave-2 findings closed.** Multi-week design-level items (208 tenant FK gaps,
OpenTelemetry, 277 `LocalDate.now()` callsites, Kafka-afterCommit refactor, RLS harmonization,
tenant erasure DSR) deferred to dedicated sprints.

### Tenant lifecycle & RBAC

- `JwtAuthenticationFilter` — rejects requests whose JWT tenantId resolves to a tenant with
  `status != ACTIVE`; 403 before `TenantContext` is set (audit M-C1).
- `HomeService` — explicit tenant-keyed `@Cacheable` on `getUpcomingBirthdays` /
  `getUpcomingWorkAnniversaries` (audit O-3, cross-tenant cache key bug).
- `TokenBlacklistService` — 30 s `@Scheduled` Redis health re-probe + one-shot WARN per outage
  when the in-memory fallback path is taken.
- `application-prod.yml` — liveness=`ping` only (disk-full no longer CrashLoops the pod);
  readiness includes Redis; Kafka health toggleable via
  `MANAGEMENT_HEALTH_KAFKA_ENABLED`.

### Stub services — fail-closed instead of fake data

Sprint 2 closed the worst of the "service appears to work but returns hardcoded data" anti-pattern:

- `MobileApprovalService` + `MobileLeaveService.getLeaveBalance` — gated behind
  `app.features.mobile-approvals` / `mobile-leave-balance` (defaults **false**); throw
  `UnsupportedOperationException` instead of returning fake data.
- `ResourcePoolController` — every endpoint short-circuits to 501 unless
  `app.features.resource-pools=true`.
- `CalendarService` — real Google/Outlook sync paths throw instead of silently returning mock
  data when `mock-mode=false`.
- `KekaImportService` — API-driven import gated by feature flag.
- `StripeAdapter` / `RazorpayAdapter` — `parseWebhookPayload` throws instead of fabricating
  events; `verifyWebhookSignature` still fail-secure with one-shot WARN.
- `LWFService.calculateForPayrollRun` — gated by `app.features.lwf` to prevent IN payroll runs
  from silently skipping LWF (Labour Welfare Fund).
- `DocuSignController` completion handler — downloads signed PDF via
  `apiClient.downloadDocument`, persists via `FileStorageService` (audit K-15).

### Race conditions, async correctness, timezone

- `AttendanceAuditPublisher` extracted as `@Component`; the private `@Async` method in
  `AttendanceRecordService` was invisible to Spring AOP and ran synchronously — publish is now
  actually async.
- **V145** — `expense_claim_sequence` and `mileage_claim_sequence` `(tenant_id, year_month)`
  composite PK; atomic `INSERT … ON CONFLICT … RETURNING` replaces the per-JVM `synchronized`
  block that was the root cause of duplicate claim numbers across pods.
- `PayrollProcessingConsumer` — tracks `claimed` flag and calls
  `IdempotencyService.release(eventId)` on failure so Kafka retries aren't silently swallowed
  for 24 h.
- `PaymentService.initiatePayment` — short-circuit on existing
  `(tenantId, transactionRef)` before calling the gateway adapter.
- `MobileAttendanceService` — timezone-aware "today" using employee office location.
- `LeaveAccrualScheduler` — quarter detection in `ZoneOffset.UTC` to match the UTC cron.

### Mass-assignment + impersonation

- New `WallController` + `WikiPageController` mass-assignment DTOs; ID / tenantId /
  audit-timestamp fields defensively nulled before service call.
- **V146** — `audit_logs.impersonator_id UUID NULL` for SuperAdmin tenant impersonation
  traceability (every action taken under impersonation gets both `actor_id` and
  `impersonator_id` recorded).

---

## Sprint 3 — Regression closure + critical wave-3-to-5 (commit `d444afa1`)

Sprint 3 closes regressions introduced by sprint 2 plus the highest-impact patch-level findings
from waves 3–5.

### Regression closure (sprint 2 → sprint 3)

- `DataScopeService.getCustomPredicate` — replaces SELF fallback with `cb.disjunction()`. The
  sprint 2 "fix" was comment-only; CUSTOM scope was effectively SELF for any caller whose
  allowlist was empty. Now an empty allowlist returns **zero rows** as intended.
- `GlobalExceptionHandler` — new `@ExceptionHandler(UnsupportedOperationException)` returns
  **501 NOT_IMPLEMENTED** + WARN log. Sprint 2's `throw new UnsupportedOperationException(…)`
  on gated stubs was leaking as 500 INTERNAL_ERROR through the default handler.
- `PostComment.deleted` → `isDeleted` field rename for sibling-entity consistency; 9 JPQL
  queries updated; public getters/setters preserved for serialization compatibility.
- `WallController.getReplies` — `@Min(1) @Max(3)` depth guardrail (was unbounded recursion).
- `SlackCommandService` — `@PostConstruct` fail-fast when prod profile active with empty
  signing-secret (no more silent verification bypass).
- `frontend/lib/utils/safeStorage.ts` — new wrapper around `localStorage` / `sessionStorage`
  with try/catch + in-memory fallback for SSR / private-mode / quota-exceeded errors.

### Mass-assignment — payroll endpoints

8 `PayrollController` endpoints converted from raw `@RequestBody <Entity>` binding to typed
whitelist DTOs:

- `CreatePayrollRunRequest`, `UpdatePayrollRunRequest`
- `CreatePayslipRequest`, `UpdatePayslipRequest`
- `CreateSalaryStructureRequest`, `UpdateSalaryStructureRequest`
- `CreatePayrollComponentRequest`, `UpdatePayrollComponentRequest`

Each DTO uses `@Valid` + Jakarta validation; controller maps to entity and defensively nulls
`id` / `tenantId` / `status` / audit / totals fields before service call.

### Encryption widening (V147)

`@Convert(EncryptedStringConverter)` applied to:

- `BenefitDependent.{nationalId, passportNumber, phone, email, address, preExistingConditions}`
  — the last field is GDPR Article 9 special-category health data.
- `TaxDeclaration.previousEmployerPan` and related declaration fields.
- `User.mfaSecret` (previously plaintext base32; now AES-GCM ciphertext).

`EncryptedStringConverter` uses AES-GCM with per-row IV; key from `APP_SECURITY_ENCRYPTION_KEY`
env var (documented in `application.yml`).

### Race conditions + uniqueness (V148)

- `post_reactions(post_id, user_id)` unique constraint — prevents Wall double-react race.
- `wiki_page_versions(page_id, version_number)` unique constraint — prevents two concurrent
  edits both writing version N+1.
- `employee_code_sequence(tenant_id, prefix)` atomic table — replaces in-JVM
  `synchronized` counter that lost uniqueness across pods.

### FTS restoration (V149)

`wiki_pages.search_vector` and `blog_posts.search_vector` `tsvector` generated columns +
GIN indexes restored — V15 had them as commented TODOs. **Caveat:** `WikiPageRepository` and
`BlogPostRepository` still use `ILIKE`; the indexes are unused until those queries migrate to
`search_vector @@ websearch_to_tsquery(:q)`. Tracked as sprint 5 open item.

### Hot-path performance closures

- `TenantStatusCache` — new `@Service`, 30 s Redis-backed `@Cacheable` lookup for tenant
  status. `JwtAuthenticationFilter` now reads from cache instead of hitting Postgres on every
  authenticated request.
- `TenantAwareTaskDecorator` — snapshots `RequestAttributes` so `@Async` audit writes capture
  IP / User-Agent (was silently `null` since the async path landed).
- `DashboardService.getEmployeeMetrics` — 10k-row in-memory scan → three `COUNT(*)` queries
  (`countByTenantId`, `countByTenantIdAndStatus`, `countNewHiresAfterDate`).
- `DashboardService.getRecentActivities` — replaced `auditLogRepository.findAll()`
  (cross-tenant leak) with tenant-scoped finder + `@Cacheable(5min)`.
- `LeaveBalanceController.getEmployeeBalancesEnriched` — service-level batch of leave-type
  lookups via `findAllById` (was N+1, 16 round-trips per request).

### AI / LLM hardening

- `AIRecruitmentHelper` — removed the `AI_MODEL_VERSION = "gpt-4o-mini-v1"` constant (audit-trail
  fraud risk: the value drifted from the actual runtime model). Now records runtime
  `${ai.openai.model}`.
- `buildMatchingPrompt` — EEOC / Equality-Act protected-attribute guardrail added (was only in
  `buildScreeningSummaryPrompt`).
- Lowered temperature: resume parse `0.7` → `0.1`, match scoring `0.7` → `0.2`.

---

## Sprint 4 — Indian statutory bugs + certification claims (May 2026)

### Statutory correctness

- `LWFService`, `ProfessionalTaxService`, `EsiCalculator` — corrected state-specific bracket
  edge cases flagged by the wave-4 statutory audit.
- **V150** `leave_correctness` — deletes orphaned `leave_balance` rows for archived employees;
  CHECK `available_days >= 0`; composite UNIQUE on `(employee_id, leave_type_id, year)`.
- **V146** `audit_log_impersonator_id` rolled forward (it was previously seeded on a sprint 2
  branch but never merged to main).

### Trust & compliance language

- Marketing pages and public-facing copy stripped of unverified certification claims
  ("SOC 2 Type II Certified", "ISO 27001") — replaced with the auditable "SOC 2 Type II
  preparation in progress" wording. Legal sign-off ticket attached.

### Email deliverability

- DMARC alignment fixed for outbound notification email (was `none` policy, drifting to bounce).
- `EmailSchedulerService` — proper `Return-Path` header for bounce handling.
- `EmailTemplateService` — single `List-Unsubscribe` header (was duplicated, breaking some MTAs).

### New admin controllers

- `SystemAuditLogController` (`/api/v1/admin/audit-logs`) — paginated query + CSV export over
  `audit_logs` and `compliance_audit_logs`; `SYSTEM_AUDIT_READ` permission.
- `EncryptionBackfillController` (`/api/v1/admin/encryption-backfill`) — one-shot job that
  re-encrypts plaintext legacy rows in the columns expanded by V147; idempotent, resumable,
  per-table commit. Backed by `EncryptionBackfillService`.
- `BonusController` (`/api/v1/payroll/bonus`) — split out of `PayrollController` as part of the
  mass-assignment DTO refactor.

---

## Sprint 5 — Platform hardening + PDB / dependabot (May 2026)

### Resilience

- `PodDisruptionBudget` added for `aura-backend` (minAvailable: 1) and `aura-frontend`
  (minAvailable: 1) — prevents both replicas from being evicted during a node drain.
- `HorizontalPodAutoscaler` tuned: backend `targetCPUUtilizationPercentage: 70`, frontend `60`.

### Supply chain

- GitHub `dependabot.yml` enabled for Maven, npm, GitHub Actions, Docker base images. Weekly
  schedule, grouped minor/patch PRs.
- `pom.xml` — Spring Boot 3.4.1 confirmed as the floor; CVEs flagged by `mvn dependency-check`
  cleared (no remaining High/Critical).

### Search performance

- **V151** `employee_search_trgm` — `pg_trgm` GIN index on
  `employees(full_name, employee_code, email)`. The existing ILIKE queries become index-backed
  with no code change; observed p95 on `/api/v1/employees?search=…` from 480 ms → 38 ms on the
  1.2 M-row staging tenant.

### Encryption backfill

- `EncryptionBackfillService` shipped (job above). Sprint 5 ran the job against staging; prod
  run scheduled with the next maintenance window.

### V152 `add_body_text_columns`

Splits stored HTML out of `wiki_pages.content`, `blog_posts.content`, `social_posts.content`
into a separate plaintext `body_text` column used by FTS and notification previews — closes the
"notification email shows raw HTML tags" bug and de-couples FTS from HTML escaping.

---

## Sprint 6 — Admin password reset + role hardening

- New `AdminPasswordResetController` (`/api/v1/admin/users/{id}/password-reset`,
  `PERMISSION_ADMIN_PASSWORD_RESET`) — forces a password reset for a user; generates a
  256-bit token, stores BCrypt hash (V134 pattern), emails a single-use link.
  Request/response DTOs: `AdminPasswordResetRequest`, `AdminPasswordResetResponse`.
- `RoleService.assignRole` — explicit guard: `SUPER_ADMIN` can only be assigned by another
  `SUPER_ADMIN` (was permission-checked but not role-checked, so a hand-crafted permission set
  could elevate).

---

## Sprint 7 — Compliance scaffold & onboarding templates (in progress)

### Sprint 7-A — GDPR / DPDP DSR scaffold

- **V153** `dsr_requests` — `(id, tenant_id, subject_user_id, type, status, requested_at,
  completed_at, payload_url)`; types: `EXPORT`, `ERASE`, `RECTIFY`; statuses: `PENDING`,
  `IN_PROGRESS`, `COMPLETED`, `REJECTED`.
- `DsrController` (`/api/v1/compliance/dsr`) endpoints:
  `POST /requests` (create), `GET /requests/{id}` (status),
  `POST /requests/{id}/fulfill` (admin-only), `GET /requests/{id}/export` (signed URL).
  **Scaffold only:** the export bundler and erase-cascade workers are not implemented; the
  controller returns 501 for the `fulfill` endpoint until the worker ships.
- Permission `COMPLIANCE_DSR_MANAGE` seeded for `DPO` and `SUPER_ADMIN` roles.

### Sprint 7-B — Statutory engine skeleton

Service interfaces and the V154-style table layout drafted for a config-driven statutory engine
(PF / ESI / PT / LWF / TDS brackets by state, by year). **Not yet wired into payroll runs** —
existing hardcoded calculators remain authoritative until cutover.

### Onboarding templates (V154)

`onboarding_templates`, `onboarding_template_tasks`, `employee_onboarding_runs` — replaces
hard-coded NEW_HIRE checklists. Existing onboarding runs back-filled to a default template
during the migration.

---

## OWASP Top 10 (2021) coverage

| Code | Risk                                     | Coverage | Notes                                                                                             |
|------|------------------------------------------|----------|---------------------------------------------------------------------------------------------------|
| A01  | Broken Access Control                    | Strong   | Sprint 1 IDOR sweep; DataScope CUSTOM allowlist; 98% endpoint authz coverage                      |
| A02  | Cryptographic Failures                   | Strong   | AES-GCM PII (V147), BCrypt password / reset-token hashing (V134), JWT HS256                       |
| A03  | Injection                                | Strong   | Parameterized JPQL/SQL; `websearch_to_tsquery`; sortBy allowlist; CSV escape                      |
| A04  | Insecure Design                          | Adequate | Filter chain order documented; stub services fail-closed (sprint 2)                               |
| A05  | Security Misconfiguration                | Strong   | swagger-ui / actuator hardened in prod; CSRF double-submit; security headers                      |
| A06  | Vulnerable & Outdated Components         | Strong   | Dependabot (sprint 5); `mvn dependency-check` in CI                                               |
| A07  | Identification & Authentication Failures | Strong   | JWT in httpOnly cookie; Bearer gated off; MFA; account lockout; timing-equalized login            |
| A08  | Software & Data Integrity Failures       | Adequate | Webhook signature verification; Kafka producer idempotent; **gap:** SBOM / sigstore not yet wired |
| A09  | Security Logging & Monitoring Failures   | Adequate | `audit_logs` + `system_audit_logs` + impersonator_id; **gap:** distributed tracing                |
| A10  | Server-Side Request Forgery (SSRF)       | Strong   | `SsrfProtectionUtils` with CG-NAT / IPv6 ULA blocks; webhook RT no-follow-redirects               |

Full evidence per item is in the sprint 1 commit message (`a93d4093`) and per-finding tickets in
the audit backlog.

---

## Open work / explicitly deferred

- **208 tenant_id FK gaps** (wave-3 #1) — 3-step migration sequenced after OTel rollout
  (see [`erd.md`](./erd.md#known-integrity-gaps-wave-3-finding-1)).
- **GDPR DSR fulfillment workers** — controller scaffolded sprint 7-A; export bundler and
  erase-cascade not in main yet.
- **Statutory engine** — skeleton sprint 7-B; PF / ESI / PT / LWF / TDS bracket config-driven
  flow not in production. Hardcoded calculators remain authoritative.
- **Native mobile hardening** — mobile endpoints intentionally gated off (sprint 2); when wiring
  the real APIs, run a new IDOR sweep against the mobile DTOs.
- **OpenTelemetry distributed tracing** — Micrometer Prometheus only today; correlation across
  Kafka producer → consumer not visible.
- **Elasticsearch re-index pipeline** — manual rebuild from the ES domain admin today; an
  idempotent, tenant-aware pipeline is on the roadmap.
- **Legacy plaintext PII rows** — `EncryptionBackfillService` ready (sprint 4/5), prod run
  pending the next maintenance window.
- **CODEOWNERS** — placeholder team slugs added in sprint 3; org owner must replace before
  branch protection requires them.
- **`AiUsageLog.costUsd` defaults `BigDecimal.ZERO`** — analytics job needed to backfill per-model
  token-to-USD pricing (sprint 3 deferred #8).
- **Wiki/Blog repositories ILIKE** — V149 GIN indexes sit unused until repos migrate to
  `search_vector @@ websearch_to_tsquery`.
