# Sprint History — Architectural Decisions

> Last updated: 2026-05-12 | Wave-4 doc audit (S8-A)

A chronological architectural decision log. This document mirrors `CHANGELOG.md` but adds the
**why** behind each major design choice. Use this as the entry point when a new engineer asks
"why does X work this way?".

The decision-by-decision detail lives in commit messages; this is the index.

---

## Sprint 1 — Security Foundations (commit `a93d4093`, 2026-05-12)

**Theme:** Close the 79 audited findings (11 Critical / 24 High / 30 Medium / 14 Low) from the
6-auditor security sweep that ran prior to the 15-person pilot launch.

### Architectural decisions

1. **Drive tenant isolation via logical paths, not Drive fileIds.** Introduced
   `drive_file_mapping` (**V143**) as the single point of indirection between application
   handles and Google Drive's opaque IDs. Drive fileIds are now an implementation detail of
   `GoogleDriveStorageProvider` and never leave the storage layer. Scope reduced from
   `DriveScopes.DRIVE` → `DriveScopes.DRIVE_FILE`, and the `Permission(anyone, reader)` grant
   was removed; downloads are now backend-proxied. See `security-controls.md#tenant-isolation`.

2. **JWT in httpOnly cookies as the default; Bearer header opt-in only.**
   `app.security.allow-bearer-header` defaults to `false`. Public API integrations that
   require Bearer must opt in per-tenant. Rationale: the wave-1 audit found three flows
   leaking JWTs via `Authorization` header into log aggregators.

3. **Password-reset tokens hashed at rest (V134).** Token table now stores BCrypt of a
   256-bit random; lookup is a candidate-scan over `created_at > NOW() - INTERVAL '1 hour'`
   then `passwordEncoder.matches`. The legacy plaintext column is kept for one release for
   rollback then dropped. `UserRepository.findByPasswordResetToken` is `@Deprecated`.

4. **IDOR enforcement is service-layer, not controller annotation.** Every mutating service
   method on Loan / Expense / Payment / Employee / Contract / Asset has an
   `enforceXAccess(currentUser, entity)` helper. We deliberately did **not** add a new AOP
   annotation — adding a third permission abstraction on top of `@RequiresPermission` and
   `DataScope` would have made the auth model harder to reason about for new engineers.

5. **SsrfProtectionUtils is the canonical egress gate.** Adopted across `WebhookService`,
   `WebhookDeliveryService`, `WebhookController`, and any RestTemplate that takes a
   user-supplied URL. CG-NAT (`100.64/10`), `0.0.0.0/8`, IPv6 ULA `fc00::/7`, IPv4-mapped IPv6,
   and `UnknownHostException` all reject. Webhook delivery uses a dedicated RestTemplate with
   `setInstanceFollowRedirects(false)` — 3xx is a delivery failure, not a redirect chain to
   follow.

6. **`DemoPasswordResetRunner` deleted, not feature-flagged.** A boot-time job that auto-reset
   `@nulogic.io` passwords every restart was a load-bearing security hole. We chose hard
   deletion over a feature flag because nothing should be calling that path in any environment.

---

## Sprint 2 — Wave-2 Patch + Stub Gating (commit `2ac7218d`, 2026-05-12)

**Theme:** Close patch-level wave-2 findings (~50 of ~200) and address the "stub returns fake
data" anti-pattern that the audit caught in three independent services.

### Architectural decisions

1. **Stub services must fail-closed, not return fake data.** `MobileApprovalService`,
   `MobileLeaveService`, `ResourcePoolController`, `CalendarService`, `KekaImportService`,
   `StripeAdapter`, `RazorpayAdapter`, and `LWFService` were all returning fabricated success
   responses for paths that weren't implemented. We introduced a uniform pattern:

- Gate with `app.features.<feature-name>` (default **false**).
- Throw `UnsupportedOperationException` (mapped to 501 — see sprint 3) when disabled.
- Real implementations land later with the flag flipped on.

Decision driver: a "soft 200 with mock data" is indistinguishable from a working
integration at the audit boundary, and burns trust silently.

2. **Tenant lifecycle is enforced at the auth filter, not downstream.**
   `JwtAuthenticationFilter` now rejects requests with a `SUSPENDED` / `DELETED` tenant **before**
   `TenantContext` is set. The alternative — letting the request through and checking at the
   service layer — leaked partial data through `@Cacheable` paths that wired up to the cache
   keyed by `tenantId` regardless of status.

3. **Async correctness: extract `@Async` methods to dedicated `@Component`s.** Spring AOP
   doesn't proxy self-invocations; the bug was that `AttendanceRecordService.publishAudit` —
   marked `@Async` — was being called from another method **in the same class** and ran
   synchronously, blocking the request thread. Extracting to `AttendanceAuditPublisher` made
   the `@Async` annotation actually take effect. New rule of thumb: if a method is `@Async`
   or `@Transactional(REQUIRES_NEW)`, it lives in a different bean from its caller.

4. **Atomic sequences live in Postgres, not in the JVM.** `expense_claim_sequence`,
   `mileage_claim_sequence`, and the upcoming `employee_code_sequence` are `(tenant_id,
   year_month)` composite-PK tables with `INSERT … ON CONFLICT … RETURNING` upsert. The
   previous `synchronized` blocks lost uniqueness across pods. We deliberately did not use
   Postgres `SEQUENCE` objects because we need composite scoping (tenant + period).

5. **Impersonation traceability is a first-class column (V146).** Every action taken under
   SuperAdmin impersonation records both `actor_id` (the impersonated user) and
   `impersonator_id` (the SuperAdmin). Previously only `actor_id` was recorded, which made
   incident response on impersonation-abuse scenarios impossible.

6. **Health probes split for resilience.** Production `application-prod.yml` now uses
   `liveness=ping` (no disk-space check) and `readiness=ping,redis,db` — a full disk no longer
   CrashLoops the pod. Kafka health is opt-in via `MANAGEMENT_HEALTH_KAFKA_ENABLED` because a
   slow broker would otherwise mark the pod unready and tip the cluster into a thundering herd.

---

## Sprint 3 — Regression Closure + Critical Wave-3-to-5 (commit `d444afa1`, 2026-05-12)

**Theme:** Fix the regressions that landed in sprint 2 plus the highest-impact patch-level
findings from waves 3, 4, and 5.

### Architectural decisions

1. **`UnsupportedOperationException` is 501 NOT_IMPLEMENTED, globally.** The sprint 2 stubs
   were throwing `UnsupportedOperationException` but `GlobalExceptionHandler` had no specific
   handler, so it fell through to 500 INTERNAL_ERROR. Added a dedicated
   `@ExceptionHandler(UnsupportedOperationException)` that returns 501 + WARN log. This is
   load-bearing for the "stubs must fail-closed" pattern from sprint 2.

2. **DataScope CUSTOM with empty allowlist returns zero rows.** Sprint 2 documented the fix
   as a comment but never replaced the SELF fallback. Sprint 3 returns `cb.disjunction()`
   (always-false predicate) when the allowlist is empty. New invariant: an empty allowlist is
   semantically "no access", not "access to self".

3. **Mass-assignment defence is whitelist DTOs, not entity binding.** Sprint 1 fixed
   `PaymentController` and `EmployeeController`; sprint 3 finished the job for all 8
   `PayrollController` mutation endpoints. Pattern: a `CreateXRequest` / `UpdateXRequest`
   DTO per endpoint with `@Valid` + Jakarta validation; the controller maps to entity and
   **defensively nulls** id / tenantId / status / audit / totals fields before service call.
   We did **not** introduce a generic "mass-assignment blocker" library — explicit DTOs are
   reviewable, generic blockers drift silently when fields change.

4. **`TenantStatusCache` is the canonical hot-path lookup.** Sprint 2's `JwtAuthenticationFilter`
   tenant-status check was hitting Postgres on every authenticated request. Sprint 3 added a
   30 s `@Cacheable` Redis-backed cache, dedicated `TenantStatusCache` service, with explicit
   evict required on `SystemAdminService.suspend/activate` (sprint 3 deferred item #3 — propagation
   is currently TTL-bounded).

5. **Async audit writes capture request context.** `TenantAwareTaskDecorator` now snapshots
   `RequestAttributes` so `@Async` audit writes can read `request.remoteAddr` and
   `request.userAgent`. Previously those values were silently `null` since the async path
   landed, breaking compliance audit.

6. **AI prompts record runtime model id, not a constant.** `AI_MODEL_VERSION = "gpt-4o-mini-v1"`
   was a hardcoded constant that drifted from `${ai.openai.model}`. Audit trail now records the
   actual runtime model. Plus: EEOC / Equality-Act guardrail added to
   `buildMatchingPrompt` (was only in screening summary), and temperature lowered for
   resume-parse and match-score to reduce hallucinated structured-data fields.

7. **`PostComment.deleted` renamed to `isDeleted` for sibling-entity consistency.** This is a
   small thing but it bit us in two places: the audit writer treated the field by name and
   missed soft-deletes; the soft-delete cleanup cron operated on `is_deleted` and never picked
   `post_comments` up. Field rename + 9 JPQL queries updated; public getters/setters preserved
   so serialization is unchanged.

8. **Encryption widening uses the existing converter, no new column types.**
   `@Convert(EncryptedStringConverter)` applied across `BenefitDependent`,
   `TaxDeclaration`, `User.mfaSecret`. V147 widens the column types to ciphertext length.
   Decision: keep the converter approach (vs Postgres `pgcrypto`) so the encryption key stays
   in application memory and never enters Postgres logs.

---

## Sprint 4 — Indian Statutory Bugs + Admin Controllers (May 2026)

**Theme:** Statutory correctness for the Indian payroll cohort, remove unverified certification
claims, ship the admin-grade audit/encryption controllers.

### Architectural decisions

1. **Hardcoded statutory calculators stay authoritative until the engine ships.**
   `LWFService`, `ProfessionalTaxService`, `EsiCalculator` had state-specific edge-case bugs.
   We fixed the calculators in place rather than rushing the (in-progress) config-driven
   engine — correctness for the pilot beats refactor-velocity.

2. **V150 `leave_correctness` is data-cleanup + invariant codification.** Three changes in one
   migration: (a) delete orphaned `leave_balance` rows for archived employees; (b) CHECK
   `available_days >= 0`; (c) composite UNIQUE on `(employee_id, leave_type_id, year)`. Once
   (a) ran successfully, (b) and (c) became safe to add. This is the canonical pattern for
   "clean up legacy data then enforce invariant" migrations going forward.

3. **Compliance language is auditable, not aspirational.** Marketing copy stripped of
   "SOC 2 Type II Certified" / "ISO 27001" claims and replaced with "SOC 2 Type II preparation
   in progress" plus a legal sign-off ticket. Decision: never ship a certification claim
   without an attached auditor letter.

4. **Admin-grade controllers are separate from business modules.**
   `SystemAuditLogController`, `EncryptionBackfillController`, and (in sprint 6) the
   `AdminPasswordResetController` all live under `/api/v1/admin/**` with distinct
   `SYSTEM_AUDIT_READ`, `SYSTEM_ENCRYPTION_BACKFILL`, `ADMIN_PASSWORD_RESET` permissions. The
   pattern keeps the regular module RBAC matrix readable and makes "show me everything an
   admin can do" a one-grep search.

5. **`EncryptionBackfillService` is idempotent + resumable.** The job has a per-table commit
   so an interrupt doesn't lose progress; running it twice against the same table is a no-op
   because the converter detects already-encrypted ciphertext.

---

## Sprint 5 — Resilience, Supply Chain, Search Performance (May 2026)

**Theme:** Production resilience (PDB / HPA), supply-chain hygiene (dependabot), search
performance (V151 trigram), legacy PII cleanup (encryption backfill prod run).

### Architectural decisions

1. **`PodDisruptionBudget(minAvailable: 1)` for every replicated workload.** Stops node-drain
   from evicting both replicas of a 2-replica deployment simultaneously. Required learning
   moment: a `replicas: 2` without a PDB is functionally `replicas: 1` during any cluster
   maintenance event.

2. **`pg_trgm` is the preferred fuzzy-search backend.** V151 adds a `pg_trgm` GIN index on
   `employees(full_name, employee_code, email)`. Critical property: the existing ILIKE queries
   become index-backed **with no code change** — the planner picks the trigram index for
   `ILIKE '%foo%'` patterns automatically. We chose pg_trgm over Elasticsearch for this query
   because employee name lookup is the highest-volume search path and ES would add a sync
   pipeline for marginal benefit at our scale.

3. **Dependabot grouped minor/patch PRs, weekly cadence.** Tuned to avoid PR noise:

- Maven: grouped by `org.springframework.*` / `com.amazonaws.*` / everything-else.
- npm: grouped by `@mui/*` / `react*` / everything-else.
- Schedule weekly Monday 09:00 IST so the on-call sees the batch before the standup.

4. **V152 splits HTML from `body_text`.** Wiki / Blog / Wall post content used to be stored
   as a single HTML column. FTS indexed the HTML tags; notification preview emails rendered
   raw tags. V152 adds a plaintext `body_text` column populated by a trigger that strips HTML.
   New invariant: any module that needs to index or preview content uses `body_text`; the
   stored HTML is only for the editor render path.

---

## Sprint 6 — Admin Password Reset + Role Hardening (May 2026)

**Theme:** Close the last gap in the admin tooling — password reset on behalf of a user — and
tighten role-assignment rules.

### Architectural decisions

1. **`AdminPasswordResetController` uses the V134 token pattern.** No new crypto primitive:
   the controller generates a 256-bit token, stores its BCrypt hash via
   `password_reset_token_hash`, and emails a single-use link. The link goes through the
   normal user-facing reset flow — the admin doesn't see or hold the token, which makes the
   audit trail clean.

2. **`SUPER_ADMIN` is role-checked, not just permission-checked.** Sprint 6 audit caught that
   a hand-crafted permission set could elevate a regular admin to SUPER_ADMIN if the caller
   had `ROLE_ASSIGN` and `ROLE_MANAGE`. `RoleService.assignRole` now explicitly checks that
   the caller is `SUPER_ADMIN` to assign `SUPER_ADMIN`. This sits **above** the permission
   layer because `SUPER_ADMIN` is an identity-defining role, not a permission bundle.

---

## Sprint 7 — Compliance Scaffold + Onboarding Templates (in progress)

**Theme:** Begin shipping the GDPR / DPDP DSR plumbing (sprint 7-A), draft the statutory
engine (sprint 7-B), and replace hard-coded onboarding checklists with config (V154).

### Architectural decisions

1. **DSR is its own bounded context, not a sidecar of `users`.** V153 adds `dsr_requests`
   with `(tenant_id, subject_user_id, type, status, requested_at, completed_at, payload_url)`.
   The state machine (`PENDING → IN_PROGRESS → COMPLETED | REJECTED`) lives in the
   `compliance` module; the export bundler and erase-cascade workers are deliberately
   isolated services. Rationale: DSR is regulatory plumbing — it must keep working even if a
   major refactor lands in the user / employee modules.

2. **501 NOT_IMPLEMENTED for unfinished DSR endpoints.** Reuse of the sprint 3 pattern: the
   `POST /requests/{id}/fulfill` endpoint returns 501 until the worker ships. This keeps the
   controller surface in main without leaking partial fulfilment.

3. **Statutory engine ships as design first, code second.** Sprint 7-B drafted the service
   interfaces and the V154-style table layout for PF / ESI / PT / LWF / TDS brackets. It is
   **not wired into payroll runs** — the existing hardcoded calculators remain authoritative.
   Decision: the cutover from hardcoded → config-driven for statutory calc is a once-and-only
   migration; we are willing to slip on velocity to get it right.

4. **V154 onboarding templates replace `NEW_HIRE_CHECKLIST_TASKS` constants.** Three tables:
   `onboarding_templates` (per-tenant), `onboarding_template_tasks` (ordered),
   `employee_onboarding_runs` (instance + per-task completion). Existing runs back-filled to a
   default template during the migration. Once shipped, the in-code `NEW_HIRE_CHECKLIST_TASKS`
   array will be deleted.

---

## Cross-sprint patterns worth remembering

- **Migrations cluster around their sprint.** V134 = sprint 1, V143–V149 = sprint 1–3,
  V150 = sprint 4, V151–V152 = sprint 5, V153–V154 = sprint 7. Use this when reading
  `flyway_schema_history` to triangulate when a column landed.
- **Defence happens at the layer where the bug is, not at every layer.** IDOR fixes are
  service-layer; SSRF is the egress utility; mass-assignment is the controller DTO. We resisted
  the urge to add cross-cutting AOP for any of these because it makes the auth model harder to
  reason about.
- **"Stubs must fail-closed" is a load-bearing invariant.** Every stub that returns fake data
  is a future audit finding. Gate with a feature flag, throw `UnsupportedOperationException`
  (now 501) when off.
- **Data-cleanup migrations come before invariant migrations.** V150 demonstrated the pattern
  — delete orphaned rows, *then* add the CHECK constraint. A failed CHECK constraint mid-deploy
  is much worse than a slow migration up front.
- **Admin endpoints live under `/api/v1/admin/**` with distinct permissions.** Keeps the
  module RBAC matrix readable and makes "show me everything an admin can do" greppable.

---

## Pointers

- Code-level changelog: [`CHANGELOG.md`](../../CHANGELOG.md)
- Detailed sprint commits: `git log --grep='sprint-'`
- Migration log: [`Backend.md#flyway-migrations`](./Backend.md#flyway-migrations-v0v154-144-files)
- Security posture: [`security-controls.md`](./security-controls.md)
- ERD generation: [`erd.md`](./erd.md)
