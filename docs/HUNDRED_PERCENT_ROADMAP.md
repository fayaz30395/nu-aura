# NU-AURA Production Readiness — Path to 100/100

## Executive Summary

NU-AURA currently scores approximately **95/100** across seven quality domains. A major security audit, full RBAC overhaul, transactional outbox migration, and comprehensive error boundary rollout have brought the platform to a near-production-ready state. The single most critical remaining action is a **Railway environment variable flip** (`DEMO_CREDENTIALS_ENABLED=false`) that prevents one-click SUPER_ADMIN access to the live production URL — this is the only item blocking real-user go-live. Beyond that, eleven smaller gaps remain: enabling the RLS isolation test in CI, fixing 88 unlabelled form inputs, adding a skip-navigation link, extending Zod validation to 4 remaining forms, routing the dead-letter handler through the outbox, and adding dedicated error pages for the auth and sub-app hub segments.

---

## How Scoring Works

| Domain | Weight | Current Score | Points to 100% |
|---|---|---|---|
| Security | 20% | 97/100 | +3 pts |
| RBAC | 15% | 97/100 | +3 pts |
| API Coverage | 15% | 95/100 | +5 pts |
| Architecture | 15% | 96/100 | +4 pts |
| Route / Error Coverage | 10% | 98/100 | +2 pts |
| UX / Accessibility | 10% | 90/100 | +10 pts |
| Regression / Build Quality | 15% | 99/100 | +1 pt |

The weighted composite score is calculated as the sum of (domain score × domain weight). Reaching 100/100 requires closing all gaps listed below. UX/Accessibility carries the largest remaining delta (+10 pts) and is the highest-leverage area for improvement.

---

## Security — 97/100 (Weight: 20%)

### What This Domain Measures

Security measures whether the application protects one company's HR data from being seen or modified by another company, and whether it defends against standard web attacks. In a multi-tenant HR system, a security failure is not just a bug — it is a data breach exposing payslips, bank details, and employment records.

### What NU-AURA Has Built ✅

- **PostgreSQL Row-Level Security (RLS) with transaction-local scoping**: `TenantRlsTransactionManager` sets `SET LOCAL app.current_tenant_id` at transaction start (reverts automatically on commit), and `TenantAwareDataSourceConfig` adds a session-level fallback on every HikariCP connection checkout. This dual-layer approach means no tenant ID can bleed across pooled database connections to another request.
- **`RlsTenantGucScopeTest` static compile-time guard**: A build-time test that scans all production Java source files for `set_config(..., false)` (session-scoped GUC, the dangerous variant) and fails the Maven build if one reappears. This makes the safe pattern architecturally enforced rather than convention-dependent.
- **Cross-tenant IDOR fixes on 3 endpoints**: Statutory contribution, wall reactions/comments, and wall replies now all enforce `tenantId` ownership checks before returning data.
- **`ContractSignatureRepository` RLS hardening (V304 migration)**: The `contract_signatures` table now has a PostgreSQL RLS policy, and the repository exposes only `findByContractIdAndTenantId` / `findByIdAndTenantId` — cross-tenant signature reads are structurally impossible.
- **OWASP security headers in `proxy.ts` (Next.js Edge Middleware)**: Every HTML response carries a per-request CSP nonce, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` with preload, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restricting camera/microphone/geolocation/payment, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- **`__Host-` prefixed cookies**: Access and refresh JWTs are issued as `__Host-hrms-access` and `__Host-hrms-refresh` in production, preventing subdomain cookie injection attacks.
- **CSRF double-submit cookie**: Spring Security configuration enforces CSRF protection on all state-changing requests.
- **Password policy enforced at the database level**: 12+ characters, uppercase + lowercase + digit + special character required, history of 5 previous passwords, 90-day maximum age, account lockout after 5 failed attempts within 15 minutes.
- **Redis token blacklist**: `TokenBlacklistService` invalidates JWTs immediately on logout using a Redis-backed blacklist with a `ConcurrentHashMap` fallback for Redis outages.
- **Rate limiting**: 5 requests/minute on auth endpoints, 100/minute on general API, 5/5 minutes on data exports — enforced via Redis Lua scripts with `Bucket4j` fallback.
- **`safeUrl` XSS sanitization**: URL outputs in the frontend are sanitized to prevent `javascript:` protocol injection.
- **Demo credentials guard (V270 + `DEMO_CREDENTIALS_ENABLED` flag)**: The `Welcome@123` seed accounts that enable one-click login are gated behind an environment variable that defaults to `false`. Deployment checklist enforces this before production go-live.
- **CVE-free container images**: CI Trivy gate confirms zero known container image vulnerabilities.

### What Remains To Reach 100% 🔧

#### SEC-A11Y-01 — 842 Input Elements Lack Accessible Labels — Medium Severity

**What it is:** A scan of `frontend/app` found 842 `<input>`, `<Input>`, and `<TextInput>` elements that have neither `aria-label` nor `aria-labelledby` and are not hidden. These are form fields that screen readers cannot identify.

**Why it matters:** Screen readers announce unlabelled inputs as "edit box" with no context — a blind user cannot know what to type. There is also a secondary security testing concern: automated security scanners identify input fields by their accessible name; unnamed inputs are invisible to some pen-testing toolsets, meaning security coverage of those fields is incomplete.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app` — distributed across all modules

**How to fix it:**
1. Run `grep -rn '<Input\|<TextInput' frontend/app --include='*.tsx' | grep -v 'label=\|aria-label'` to enumerate all instances.
2. For Mantine components: add `label="Field Name"` as a prop — Mantine renders a paired `<label htmlFor=...>` automatically.
3. For cases where a visible label is not appropriate (e.g., a search input inside a table row): add `aria-label="Search employees"` directly to the component.
4. Prioritise inputs in authentication, salary, and bank-detail forms first (highest security sensitivity).
5. A codemod script can add a placeholder `aria-label` derived from the `name` or `placeholder` prop as a temporary stopgap across all 842 instances.

**Effort:** Medium — approximately 2 days of systematic work; can be batched by module.

**Points gained:** +1/100

---

#### SEC-RLS-TEST-02 — `RlsNoBypassTest` Is `@Disabled` and Never Runs in CI — Low Severity

**What it is:** `RlsNoBypassTest.java` is a complete integration test that spins up a real PostgreSQL 16 container (via Testcontainers) and proves that the `nu_app_rls` database role (which the application uses) has `NOBYPASSRLS` and can only see rows matching the active tenant GUC. The `@Disabled` annotation means this test is skipped every time CI runs Maven.

**Why it matters:** If someone accidentally grants `BYPASSRLS` to the application role, or deletes an RLS policy during a migration, no automated check would catch it. The companion static guard (`RlsTenantGucScopeTest`) only catches misuse of `set_config` in Java code — it cannot detect database-side policy changes.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/test/java/com/nulogic/integration/RlsNoBypassTest.java`

**How to fix it:**
1. Remove the `@Disabled` annotation from `RlsNoBypassTest`.
2. Add `@EnabledIfEnvironmentVariable(named = "DOCKER_AVAILABLE", matches = "true")` from `org.junit.jupiter.api.condition` in its place.
3. In the GitHub Actions CI workflow file, add `DOCKER_AVAILABLE: "true"` to the environment block of the test job. GitHub Actions runners have Docker available by default — no extra setup needed.
4. The test will now run automatically on every push to `main` and `develop` without requiring a local Docker daemon for developers running `mvn test` on their laptops.

**Effort:** Low — approximately 30 minutes including CI workflow edit and verification.

**Points gained:** +2/100

---

## RBAC — 97/100 (Weight: 15%)

### What This Domain Measures

RBAC (Role-Based Access Control) governs what each authenticated user is permitted to see and do. In a multi-tenant HR platform, an employee must never access payroll data, a recruiter must never approve leave for employees in another department, and a system administrator's privileges must be explicitly scoped — not granted by accident.

### What NU-AURA Has Built ✅

- **196 protected route entries in `routes.ts`**: Every meaningful frontend route is listed with an explicit access constraint — `anyPermission`, `anyRole`, `adminOnly`, `hrOnly`, or `managerOnly`. The specific 16 `/admin/<sub-path>` routes each have their own permission constant guard before the `adminOnly` catch-all is reached.
- **1,750 `@RequiresPermission` annotations across 173 backend controllers** (average 10.1 per controller): The 8 controllers with zero annotations are all legitimate public endpoints (`AuthController`, `MfaController`, `PublicCareerController`, `PublicOfferController`, `PaymentWebhookController` using HMAC instead of JWT, `RootProbeController` health probe, `TenantController` for registration, and `WrapResponse` which is a DTO helper not a controller).
- **534 unique permission constants in `usePermissions.ts`**: Covering 60+ modules in `MODULE:ACTION` colon-separated format matching the backend `Permission.java` enum exactly. A `MODULE:MANAGE` permission correctly implies all sub-actions.
- **`AuthGuard` null-fallback fully fixed**: Lines 150–290 of `AuthGuard` wait for `hasHydrated && isReady && isAuthorized !== null && !isRestoringSession` before rendering children — no blank render, no premature access. The loading state shows a `SkeletonDashboard` or "Session restoring" card.
- **`SUPER_ADMIN` bypass correctly scoped**: `isAdmin = roles.includes(SUPER_ADMIN) || isSystemAdmin`. `TENANT_ADMIN` explicitly does NOT receive this bypass and relies on its own assigned permissions — matching `SecurityContext.isSuperAdmin()` on the backend exactly.
- **`isManager` convenience check maps to real backend roles**: `TEAM_LEAD`, `DEPARTMENT_HEAD`, `DEPARTMENT_MANAGER`, `HR_MANAGER`, `HR_ADMIN`, `SUPER_ADMIN`, `TENANT_ADMIN` — not the phantom `Roles.MANAGER` constant.

### What Remains To Reach 100% 🔧

#### RBAC-GAP-1 — 18 Routes Guarded by `requiresAuth` Only With No Permission Specificity — Low Severity

**What it is:** 18 routes in `PROTECTED_ROUTES` have `requiresAuth: true` with no further permission, role, or admin constraint. Any logged-in user, regardless of their role, can reach these routes at the frontend routing layer. The affected paths include `/nu-calendar`, `/nu-drive`, `/nu-mail`, and `/tax/declarations`.

**Why it matters:** For enterprise tools like `/nu-calendar`, `/nu-drive`, and `/nu-mail`, the backend API enforces access, but the page shell renders for all authenticated users — which is confusing and technically incorrect. For `/tax/declarations`, any employee can reach the page even if their role does not include tax operations (the backend enforces scoping per employee, so no data leaks, but the defence-in-depth layer is missing). The `/me/*` and `/profile` paths are intentionally `requiresAuth`-only and need no change.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/lib/config/routes.ts`

**How to fix it:**
1. Locate the `/nu-calendar` entry in `PROTECTED_ROUTES` and add `anyPermission: [Permissions.CALENDAR_VIEW]`.
2. Locate `/nu-drive` and add `anyPermission: [Permissions.DOCUMENT_VIEW, Permissions.DOCUMENT_UPLOAD]`.
3. Locate `/nu-mail` and add `anyPermission: [Permissions.EMAIL_VIEW, Permissions.EMAIL_SEND]`.
4. Locate `/tax/declarations` and add `anyPermission: [Permissions.TDS_DECLARE, Permissions.STATUTORY_VIEW]`.
5. Verify the permission constants exist in `usePermissions.ts`; add any that are missing.

**Effort:** 30 minutes.

**Points gained:** +1/100

---

#### RBAC-GAP-2 — `adminOnly` Catch-All Relies on Fuzzy `isAdmin` Check — Low Severity

**What it is:** The two catch-all routes `{ path: '/admin/*', adminOnly: true }` and `{ path: '/admin', adminOnly: true }` use `isAdmin`, which resolves to `roles.includes(SUPER_ADMIN) || permissions.includes(SYSTEM:ADMIN)`. Any user with `SYSTEM:ADMIN` permission (even without the `SUPER_ADMIN` role) can traverse any future `/admin/xyz` path that is added without a specific route entry.

**Why it matters:** This is a forward-looking risk, not an active vulnerability. Today it is correct. However, new `/admin/` pages added in the future without a specific `PROTECTED_ROUTES` entry will silently fall through to this catch-all and be accessible to all `SYSTEM:ADMIN` holders without explicit review.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/lib/config/routes.ts`

**How to fix it:** Add a CI lint rule (ESLint custom rule or a Jest test against the file system) that detects any file created under `frontend/app/admin/` that does not have a corresponding entry in `PROTECTED_ROUTES` with an explicit `anyPermission` guard. This ensures the catch-all is never silently relied upon for new pages.

**Effort:** 1 hour to write and wire the CI lint rule.

**Points gained:** +1/100

---

#### RBAC-GAP-3 — `Roles.MANAGER` Is a Phantom Role With No Backend Equivalent — Low Severity

**What it is:** `Roles.MANAGER = 'MANAGER'` in `usePermissions.ts` is a constant that does not correspond to any real backend role. The code comment says "L-1: MANAGER is not a real backend role — use DEPARTMENT_MANAGER or TEAM_LEAD instead." Any future developer who writes `hasRole(Roles.MANAGER)` thinking it checks a real role will always get `false` for real users, creating a silent permission bug.

**Why it matters:** It is a maintenance hazard. The `managerOnly: true` routes work correctly today because `isManager` includes the real backend roles — but the phantom constant remains a trap for the next developer.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/lib/hooks/usePermissions.ts`

**How to fix it:**
1. Add a `/** @deprecated Use Roles.DEPARTMENT_MANAGER or Roles.TEAM_LEAD instead */` JSDoc tag above the `MANAGER` constant.
2. Add a TypeScript `@deprecated` marker so IDEs show a strikethrough when the constant is used.
3. Run `grep -rn "Roles\.MANAGER\|hasRole.*MANAGER\|hasAnyRole.*MANAGER" frontend/` to audit all usages — replace any direct `hasRole(Roles.MANAGER)` calls with `hasAnyRole(Roles.DEPARTMENT_MANAGER, Roles.TEAM_LEAD, Roles.DEPARTMENT_HEAD)`.
4. Do not delete the constant yet — remove it only after confirming zero usages remain.

**Effort:** 1 hour.

**Points gained:** +1/100

---

## API Coverage — 95/100 (Weight: 15%)

### What This Domain Measures

API coverage measures how completely the frontend consumes the backend's REST surface, and whether data flowing into and out of the system is validated at every layer — browser form, backend endpoint, and database constraint. A score of 95/100 means nearly all 180 controllers have typed Orval-generated client hooks wired to actual UI, with only a small number of validation gaps remaining.

### What NU-AURA Has Built ✅

- **N+1 batch fix for paginated candidate lists**: `mapCandidatePageBatch` in `RecruitmentManagementService` collects all `jobId` and `recruiterId` values from a page of candidates into sets, then fetches them in two `findAllById` bulk calls and builds lookup maps — reducing 2N database queries to 2 regardless of page size.
- **472 `@Valid` annotations across 180 controllers**: Virtually every backend request body is validated by Spring Bean Validation before the service layer processes it. Malformed payloads receive a 400 response before touching the database.
- **305 paginated `Pageable` repository methods**: All list-returning repository queries use `findAll(Pageable)` or `findBy...(Pageable)` — unbounded queries that could return thousands of rows are architecturally prevented.
- **258 of 262 `useForm` instances wired to `zodResolver`**: 98.5% of frontend forms perform client-side schema validation before any API call is made, giving users instant inline error messages without network round-trips.

### What Remains To Reach 100% 🔧

#### N1-001 — N+1 in `mapToCandidateResponse` Single-Item Path — High Severity

**What it is:** The private helper `mapToCandidateResponse` at line 715 of `RecruitmentManagementService.java` calls `jobOpeningRepository.findById()` and `employeeRepository.findById()` once per candidate. The correct batch path (`mapCandidatePageBatch`) already exists. The risk is line 240, which falls back to `page.map(this::mapToCandidateResponse)` for empty pages — and structurally, the single-item mapper remains usable on collections, creating an N+1 regression risk whenever code changes route a non-empty collection through it.

**Why it matters:** At 50 candidates per page: 1 (list) + 50 (job lookups) + 50 (recruiter lookups) = 101 database queries instead of 3. Database round-trips are the most common source of slow page loads in CRUD applications. On Railway's shared PostgreSQL, each extra query adds ~2–5ms of network latency — 101 queries takes ~200–500ms where 3 queries takes ~6–15ms.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java/com/nulogic/application/recruitment/service/RecruitmentManagementService.java`, line 240 and line 715

**How to fix it:**
1. On line 240, replace:
   ```java
   return page.map(this::mapToCandidateResponse);
   ```
   with:
   ```java
   return page.map(c -> mapToCandidateResponseBatch(c, Map.of(), Map.of()));
   ```
2. Rename `mapToCandidateResponse` to `mapSingleCandidateResponse` and add a Javadoc warning:
   ```java
   /**
    * Maps a single candidate. DO NOT call inside a collection loop.
    * Use mapCandidatePageBatch for collections.
    */
   ```
3. Run `mvn test -pl backend -Dtest=RecruitmentManagementServiceTest` to confirm no tests break.

**Effort:** 30 minutes.

**Points gained:** +2/100

---

#### ZOD-001 — `me/skills/page.tsx` Form Not Using `zodResolver` — Medium Severity

**What it is:** The skills self-service page (`frontend/app/me/skills/page.tsx`) uses a raw `useState<AddSkillRequest>` pattern (lines 43–51) instead of `useForm` + `zodResolver`. The `skillName` field has no client-side minimum-length or blank validation. Submitting an empty skill name fires a network request that the backend then has to reject.

**Why it matters:** Users see a delayed error message from the server instead of an immediate inline error. On a slow connection, this feels broken. It also means 100% of form error responsibility falls on the backend — one missed `@Valid` annotation there and invalid data reaches the database.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/me/skills/page.tsx`, lines 43–51

**How to fix it:**
1. Define a Zod schema:
   ```typescript
   const SKILL_CATEGORIES = ['TECHNICAL', 'SOFT', 'DOMAIN'] as const;
   const skillSchema = z.object({
     skillName: z.string().min(1, 'Skill name is required').max(100, 'Max 100 characters'),
     category: z.enum(SKILL_CATEGORIES),
     proficiencyLevel: z.number().int().min(1).max(5),
   });
   ```
2. Replace `const [form, setForm] = useState<AddSkillRequest>(EMPTY_FORM)` with:
   ```typescript
   const { register, control, handleSubmit, reset, formState: { errors } } =
     useForm<AddSkillRequest>({ resolver: zodResolver(skillSchema), defaultValues: EMPTY_FORM });
   ```
3. Replace manual `setForm` calls with `register` or `Controller` wrappers for each field.
4. Display `errors.skillName?.message` inline below the input.

**Effort:** 1 hour.

**Points gained:** +2/100

---

#### ZOD-002 — 3 Additional `useForm` Instances Missing `zodResolver` — Low Severity

**What it is:** 262 `useForm` calls exist across the frontend; 258 use `zodResolver`. The skills page (ZOD-001) accounts for one gap — the remaining 3 are elsewhere and have not yet been located.

**Why it matters:** Same as ZOD-001: forms without schema validation push all error handling to the server, degrading UX and removing the client-side safety net.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app` — exact files unknown until grep is run.

**How to fix it:**
1. Run: `grep -rn 'useForm' frontend/app --include='*.tsx' -l | xargs grep -L 'zodResolver'`
2. For each of the 3–4 files returned, define a Zod schema that matches the existing TypeScript type for the form (use `z.infer<typeof schema>` as the form type to avoid duplication).
3. Add `resolver: zodResolver(schema)` to the `useForm` call.

**Effort:** 2 hours across all 3 files.

**Points gained:** +1/100

---

## Architecture — 96/100 (Weight: 15%)

### What This Domain Measures

Architecture measures whether the fundamental structural decisions — how tenant isolation is enforced at the database level, how events are reliably delivered without losing data, and how the schema evolves safely — are correctly implemented, testable, and operationally sound.

### What NU-AURA Has Built ✅

- **Two-layer RLS enforcement**: `TenantRlsTransactionManager` sets `SET LOCAL app.current_tenant_id` (transaction-scoped, reverts on commit) covering all `@Transactional` service calls. `TenantAwareDataSourceConfig` wraps HikariCP to set a session-level GUC fallback on every `getConnection()`, covering `JdbcTemplate` paths that run outside a Spring transaction.
- **`RlsNoBypassTest` integration test**: A complete Testcontainers-based proof that `nu_app_rls` has `NOBYPASSRLS` and that setting `app.current_tenant_id` correctly gates row visibility. Currently `@Disabled` pending CI Docker setup (see ARCH-01).
- **Transactional outbox replacing Kafka on Railway**: `OutboxEventProcessor` polls the `outbox_events` PostgreSQL table via `@Scheduled` and dispatches to consumer `process()` methods. Events written in the same database transaction as the business data survive app restarts, network blips, and Railway's ephemeral container restarts — because they are in durable PostgreSQL, not an in-memory queue.
- **Kafka confined to infrastructure concerns only**: `KafkaTemplate` usage is limited to `KafkaConfig` (bean definition) and `DeadLetterHandler` (DLQ republish). No business-domain service calls `kafkaTemplate.send()` directly — confirming the outbox migration is complete for the happy path.
- **293 Flyway migrations providing full schema history**: Every schema change from V0 to V304 is a versioned, checksummed SQL file in `backend/src/main/resources/db/migration`. Any environment can be brought to the exact current schema by running the application once.
- **105 `@Cacheable`/`@CacheEvict`/`@CachePut` annotations**: Consistent with the documented 20+ named Redis caches with tiered TTLs (5 minutes to 24 hours), reducing database load on frequently read reference data.

### What Remains To Reach 100% 🔧

#### ARCH-01 — `RlsNoBypassTest` Is `@Disabled` — Cross-Tenant Isolation Not CI-Verified — Medium Severity

**What it is:** The test at `RlsNoBypassTest.java` proves that the database role the application uses (`nu_app_rls`) cannot see rows from a different tenant even if the application code forgets a WHERE clause. It is marked `@Disabled`, so it never runs in CI.

**Why it matters:** If a new Railway deployment has a misconfigured database role (e.g., `BYPASSRLS` was accidentally granted during a schema migration), cross-tenant data leaks would go undetected until a manual test run. The companion static guard (`RlsTenantGucScopeTest`) catches Java-side misuse of `set_config` but cannot detect database-side policy deletions or role attribute changes.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/test/java/com/nulogic/integration/RlsNoBypassTest.java`

**How to fix it:**
1. Replace `@Disabled` with:
   ```java
   @EnabledIfEnvironmentVariable(named = "DOCKER_AVAILABLE", matches = "true")
   ```
2. In `.github/workflows/ci.yml` (or the equivalent CI workflow file), add to the `env` block of the test job:
   ```yaml
   DOCKER_AVAILABLE: "true"
   ```
3. GitHub Actions Ubuntu runners have Docker available by default — no additional runner configuration is required.
4. Verify locally by running: `DOCKER_AVAILABLE=true mvn -pl backend test -Dtest=RlsNoBypassTest`

**Effort:** Low — 30 minutes including CI file edit and one verification run.

**Points gained:** +2/100

---

#### ARCH-02 — `DeadLetterHandler` Calls `kafkaTemplate.send()` Directly — Low Severity

**What it is:** When an event fails processing and lands in the dead-letter queue, `DeadLetterHandler.java` (line 250) retries it by calling `kafkaTemplate.send(targetTopic, event.getPayload())` directly. On Railway, where Kafka is not provisioned, this call silently fails. Dead-letter events that fail retry are permanently lost rather than being written back to the outbox for durable retry.

**Why it matters:** The happy-path outbox migration is complete and correct. The DLQ path is the failure path — exactly when durability matters most. On Railway, a failed event retry disappears without a trace, making incidents harder to debug.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java/com/nulogic/infrastructure/kafka/consumer/DeadLetterHandler.java`, line 250

**How to fix it:**
1. Inject `OutboxEventRepository` into `DeadLetterHandler`.
2. Add a conditional:
   ```java
   if (outboxEnabled) {
       // Write a new OutboxEvent with retry metadata instead of calling kafkaTemplate
       outboxEventRepository.save(OutboxEvent.builder()
           .eventType(event.getEventType())
           .payload(event.getPayload())
           .retryCount(event.getRetryCount() + 1)
           .status(OutboxStatus.PENDING)
           .build());
   } else {
       kafkaTemplate.send(targetTopic, event.getPayload());
   }
   ```
3. The `app.outbox.enabled` flag already gates the primary outbox processor — reuse the same flag here.

**Effort:** Medium — approximately 2 hours including testing.

**Points gained:** +1/100

---

#### ARCH-03 — Flyway Migration Count Drift (293 files vs V304 latest version) — Low Severity / Documentation Only

**What it is:** The Obsidian knowledge vault documents V304 as the latest migration and 293 total migrations. The filesystem `find` count confirms 293 files. The gap between "V304 is the latest" and "293 files exist" means 11 version numbers between V0 and V304 are either absent (intentional gaps, which Flyway allows with `outOfOrder=false`) or were counted in a different way. This is not a runtime issue.

**Why it matters:** Documentation drift confuses new engineers and makes audit cross-referencing unreliable. No data loss or security risk.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/resources/db/migration`

**How to fix it:**
1. Run: `find backend/src/main/resources/db/migration -name 'V*.sql' | sort | awk -F'__' '{print $1}' | sort` to list all version numbers on disk.
2. Identify which version numbers are absent (the 11 gaps).
3. Update `docs/obsidian/06-Database` to document: the real file count, the latest version, and which version numbers are intentionally skipped and why.
4. This is documentation hygiene only — no code change required.

**Effort:** Low — 30 minutes.

**Points gained:** 0 (documentation only, no score impact).

---

## Route / Error Coverage — 98/100 (Weight: 10%)

### What This Domain Measures

Route/error coverage measures how well the Next.js application handles the two worst user experiences: a blank white screen after a crash, and no visual feedback during slow data loads. In a production HR system used daily, both failures erode trust immediately.

### What NU-AURA Has Built ✅

- **290 `error.tsx` files for 286 pages** (ratio > 1:1): 84 of 87 top-level route segments have their own dedicated error boundary; the root `app/error.tsx` covers the remaining 3.
- **`global-error.tsx` at the app root**: Catches errors thrown in the root layout itself — a scenario that segment-level `error.tsx` files cannot intercept.
- **`not-found.tsx` at the app root**: Handles 404 navigation gracefully with branded UI instead of the framework's default bare 404 page.
- **288 `loading.tsx` files for 286 pages** (ratio > 1:1): Every page has at least one ancestor `loading.tsx` Suspense boundary, meaning no page transition produces a blank white flash. Some directories have `loading.tsx` even without a direct `page.tsx`, covering nested route loading states.
- **196 protected route entries** in `routes.ts` provide RBAC enforcement at the middleware layer, preventing navigation to guarded routes before the page even begins to render.

### What Remains To Reach 100% 🔧

#### REC-AUTH-ERR — `auth/*` Segment Has No Dedicated `error.tsx` — Low Severity

**What it is:** The `/auth` segment (login, signup, forgot-password, change-password) inherits the root `error.tsx`. If an auth page throws a JavaScript error — for example, the Google OAuth configuration call fails, or the password reset SMTP endpoint is down — the root-level error boundary fires and renders the full application shell error UI (with authenticated-looking sidebar/nav placeholders) instead of a context-appropriate unauthenticated error message.

**Why it matters:** A user who cannot log in sees a confusing error page that looks like an authenticated app. A dedicated auth error page is simpler, clearer, and avoids rendering authenticated layout chrome for unauthenticated users.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/auth/`

**How to fix it:**
1. Create the file `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/auth/error.tsx`.
2. The file must be a `'use client'` component (Next.js error boundaries must be client components):
   ```tsx
   'use client';
   export default function AuthError({ error, reset }: { error: Error; reset: () => void }) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center gap-4">
         <h1 className="text-xl font-semibold">Could not load this page</h1>
         <p className="text-sm text-muted">{error.message || 'An unexpected error occurred.'}</p>
         <button onClick={reset} className="px-4 py-2 bg-accent text-white rounded">
           Try again
         </button>
       </div>
     );
   }
   ```
3. No sidebar, no navigation, no authenticated layout — this page is shown to unauthenticated users.

**Effort:** 15 minutes.

**Points gained:** +0.5/100

---

#### REC-APP-ERR — `/app` Segment (Sub-App Hub) Has No Dedicated `error.tsx` — Low Severity

**What it is:** The `/app` segment holds the four sub-application landing pages (HRMS, Grow, Hire, Fluence) — the first screen users see after login. An error here (e.g., a tenant configuration fetch fails) falls through to the root error boundary, which replaces the entire screen with a generic error UI rather than leaving the sub-app selector partially functional.

**Why it matters:** This is the entry point after login. If it fails with a generic error, the user has no actionable next step. A dedicated error component could show the sub-app grid with the failing card highlighted and a retry button.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/app/`

**How to fix it:**
1. Create `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/app/error.tsx`.
2. Render a `'use client'` component that shows the four sub-app cards in their normal grid layout, with the erroring card showing an error state and a retry button.
3. Import the `reset` callback from Next.js error props to wire the retry action.

**Effort:** 20 minutes.

**Points gained:** +0.5/100

---

#### REC-SUSPENSE — Client Pages With `useQuery` Lack Fine-Grained Suspense Wrappers — Info

**What it is:** Approximately 20+ `page.tsx` files that use `useQuery` for multiple independent data regions do not wrap those regions in individual `<Suspense>` boundaries. The route-level `loading.tsx` ensures the page never shows blank, but all data regions share one loading state — a slow secondary widget blocks the entire page from becoming interactive.

**Why it matters:** This is a UX polish improvement, not a correctness bug. The existing `loading.tsx` coverage means users already see skeletons. Adding fine-grained Suspense would allow fast data (e.g., the user's name in the header) to render immediately while slower data (e.g., a complex report table) is still loading.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/recruitment/scorecards/page.tsx` and ~20 other pages.

**How to fix it:** For pages with multiple independent data regions, wrap each region in `<Suspense fallback={<Skeleton height={200} />}>`. This is a progressive enhancement — prioritise high-traffic pages (employee list, attendance, payroll dashboard) first.

**Effort:** 2–4 hours across 20+ pages.

**Points gained:** +1/100

---

## UX / Accessibility — 90/100 (Weight: 10%)

### What This Domain Measures

UX/Accessibility measures how usable the product is for all users — including those who use screen readers, navigate by keyboard only, or use operating systems with motion reduction enabled. WCAG 2.1 AA compliance is a legal requirement in most jurisdictions. In an HR system used daily by hundreds of employees, accessibility failures directly prevent a portion of your workforce from doing their jobs.

### What NU-AURA Has Built ✅

- **Full dark-mode token system**: `globals.css` defines 60+ CSS custom property tokens remapped under `.dark` / `:root[data-theme='dark']`. A pre-hydration FOUC (Flash Of Unstyled Content) prevention script resolves the OS dark-mode preference before first paint — no flash on page load.
- **288 `loading.tsx` skeleton files for 286 pages**: Users always see a content-shaped placeholder during data loads. This is better than 1:1 coverage — outstanding.
- **52 `aria-live` / `role="alert"` / `role="status"` regions**: Dynamic content updates (form submissions, status changes, notifications) are announced to screen readers without requiring a page reload.
- **Framer Motion `AnimatePresence` in 107 locations**: Coordinated enter/exit transitions prevent content from abruptly appearing or disappearing, which can be disorienting for users with attention or cognitive differences.
- **`useReducedMotionSafe` hook exists** and is applied in at least 2 heavy animation pages (learning, performance). The architectural pattern for respecting `prefers-reduced-motion` is established in the codebase.

### What Remains To Reach 100% 🔧

#### UX-A11Y-01 — 88 Mantine Inputs Missing `label` or `aria-label` Prop — High Severity

**What it is:** 88 `TextInput`, `NumberInput`, and `PasswordInput` components across the application have neither a `label=` prop (which Mantine renders as a visible `<label htmlFor=...>`) nor an `aria-label` or `aria-labelledby` attribute.

**Why it matters:** A screen reader (VoiceOver, JAWS, NVDA) encountering an unlabelled input reads only "edit box" — the user hears no context about what the field expects. For a payroll form with 15 fields, this makes the form completely unusable without sight. This violates WCAG 2.1 Success Criterion 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) — both Level A requirements (the minimum legal bar).

**Where in the code:** Distributed across `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app`

**How to fix it:**
1. Run the following to find all instances:
   ```bash
   grep -rn 'TextInput\|NumberInput\|PasswordInput' frontend/app --include='*.tsx' \
     | grep -v 'label=\|aria-label'
   ```
2. For each result:
   - If a visible label is appropriate: add `label="Field Name"` — Mantine auto-links the `<label>` to the input.
   - If the input is inside a table or a search bar where a visible label would be cluttered: add `aria-label="Search by employee name"`.
3. Prioritise in this order: authentication forms (login, password change), salary and bank detail forms, leave and attendance inputs, then all others.

**Effort:** Medium — approximately 1.5–2 days of systematic work; can be assigned by module to parallel engineers.

**Points gained:** +2/100

---

#### UX-A11Y-02 — 358 Files Using Raw Framer Motion Without `useReducedMotionSafe` — Medium Severity

**What it is:** The `useReducedMotionSafe` hook exists and is used in 2 pages. 358 files use Framer Motion animation variants without checking the user's `prefers-reduced-motion` OS setting. Users who have enabled "Reduce Motion" in their operating system accessibility settings — due to vestibular disorder, epilepsy, or motion sensitivity — see all animations unconditionally.

**Why it matters:** For users with vestibular disorders, screen animations can cause physical vertigo, nausea, or headaches. `prefers-reduced-motion: reduce` is a direct signal from the user's OS that they have opted out of motion. Ignoring it is an accessibility violation and, for some users, causes real physical discomfort. This is WCAG 2.1 SC 2.3.3 (Animation from Interactions) at Level AAA.

**Where in the code:** 358 files across `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app` using Framer Motion

**How to fix it:**
1. Import the existing hook:
   ```typescript
   import { useReducedMotionSafe } from '@/lib/animation';
   ```
2. In each animated component:
   ```typescript
   const prefersReduced = useReducedMotionSafe();
   const variants = prefersReduced
     ? { hidden: {}, visible: {} }          // no motion
     : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }; // full motion
   ```
3. Prioritise pages with large scroll-triggered animations and page transitions first, then apply a consistent pattern across all 358 files.
4. Consider creating a shared `useAnimationVariants` hook that wraps this pattern to avoid repeating the conditional in every component.

**Effort:** Medium — the pattern is simple; the volume is large. Estimate 3–4 days of mechanical work across the 358 files.

**Points gained:** +2/100

---

#### UX-A11Y-03 — No Skip-Navigation Link Anywhere in the App — Medium Severity

**What it is:** There is zero skip-navigation link in the entire frontend. A skip-nav link is the very first focusable element on a page — visually hidden by default, visible on Tab focus — that lets keyboard and screen reader users jump directly to the main content without pressing Tab through the entire sidebar and header (which may require 20–40 keystrokes on every page).

**Why it matters:** This violates WCAG 2.1 SC 2.4.1 (Bypass Blocks) — a Level A requirement (the absolute minimum). Any government contract, enterprise HR buyer, or customer in the EU/UK/US subject to accessibility legislation will flag this as a blocker. A keyboard user with a motor disability navigating to the payroll page must tab through the full sidebar navigation (all sub-apps, all modules, all links) before reaching the first payroll field on every single page visit.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/components/layout` and `frontend/app/layout.tsx`

**How to fix it:**
1. In `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/layout.tsx`, add as the absolute first element inside `<body>`:
   ```tsx
   <a
     href="#main-content"
     className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg"
   >
     Skip to main content
   </a>
   ```
2. In the `AppLayout` component (wherever the `<main>` tag is rendered), add `id="main-content"`:
   ```tsx
   <main id="main-content" tabIndex={-1}>
     {children}
   </main>
   ```
3. The `tabIndex={-1}` on `<main>` allows it to receive programmatic focus without appearing in the tab order itself.

**Effort:** Low — 30 minutes total, including testing with a keyboard.

**Points gained:** +1/100

---

#### UX-A11Y-04 — Only 11 Focus Management Touch-Points Across 286 Pages — Low Severity

**What it is:** Focus management is the practice of programmatically moving keyboard focus when the UI changes — for example, moving focus into a modal when it opens, returning it to the triggering button when it closes, or jumping focus to the first validation error after form submission. With only 11 such touch-points across 286 pages, most custom modals, drawers, and slide-over panels likely do not manage focus correctly.

**Why it matters:** Without focus trapping in modals, a keyboard user can Tab out of an open modal into the background content they cannot see, becoming completely disoriented. WCAG 2.1 SC 2.1.2 (No Keyboard Trap — somewhat paradoxically, this means focus should be controllably trapped inside a modal, and also that the user can escape it via Escape) and SC 2.4.3 (Focus Order). Mantine's `Modal` and `Drawer` components handle this automatically — the risk is custom overlay implementations.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app`

**How to fix it:**
1. Run `grep -rn "Modal\|Drawer\|Dialog\|Popover" frontend/app --include='*.tsx' | grep -v "@mantine"` to find all custom overlay components.
2. For each custom overlay: use `FocusTrap` from `@mantine/core` to trap focus inside.
3. On modal close: restore focus with `triggerButtonRef.current?.focus()`.
4. For form validation: on submit error, move focus to the first errored field: `firstErrorRef.current?.focus()`, or wrap the error summary in a `<div tabIndex={-1} ref={errorSummaryRef}>` and call `.focus()` on it.

**Effort:** Medium — approximately 2–3 days to audit all custom overlays and add focus management.

**Points gained:** +1/100 (remaining 4 points are achievable with the above 4 fixes combined)

---

## Regression / Build Quality — 99/100 (Weight: 15%)

### What This Domain Measures

Build quality measures whether the code passes every automated structural check that runs before deployment: TypeScript type correctness, ESLint code quality rules, and Java compilation. These three gates eliminate the entire class of "it worked locally but crashed in production due to a type mismatch" failures.

### What NU-AURA Has Built ✅

- **TypeScript strict mode: zero errors**: Running `tsc --noEmit` across the entire 286-page frontend produces zero output — every variable is typed, no implicit `any`, no `null`/`undefined` passed where a real value is required.
- **ESLint with `--max-warnings=0`: clean exit**: The full ESLint scan of `app/`, `lib/`, and `components/` exits with code 0 and zero warnings. No advisory issues have been allowed to accumulate.
- **Maven backend compile: clean**: `mvn compile -Dmaven.test.skip=true` exits with code 0 across all 187 controllers, 258 services, and 321 entities using Java 21 + Spring Boot 3.5.14.
- **Zero `console.log` leakage in production `.tsx` files**: No debug output will appear in browser consoles for end users.
- **Zero genuine `TODO`/`FIXME`/`HACK` debt comments in `.tsx` files**: The 7 grep hits were all Kanban task-status string literals (`"TODO: 'To Do'"`) and SSN display patterns (`XXX-XX-XXXX`) — not code debt.

### What Remains To Reach 100% 🔧

#### BQ-01 — Frontend Unit Test Count Below 1:1 Parity With Page Count — Low Severity

**What it is:** There are 207 frontend test files for a codebase with 286 pages and 171+ components. Approximately 27% of pages have no dedicated unit test file. Regressions in the untested pages must be caught by E2E tests or manual QA, which are slower and more expensive than a unit test.

**Why it matters:** A unit test for a form page catches logic errors (wrong field mapped to wrong API field, incorrect default value, missing required field) in under 100ms during development. An E2E test for the same thing takes 10–30 seconds and requires a running backend and database. The ratio means the feedback loop for regressions in those 79 untested pages is much slower, and defects are caught later in the development cycle.

**Where in the code:** `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend`

**How to fix it:**
1. Run `diff <(find frontend/app -name 'page.tsx' | sort) <(find frontend -name '*.test.tsx' | sort)` to identify page modules with no corresponding test file.
2. Prioritise form-heavy pages first: employee create/edit, payroll processing, recruitment pipeline, leave requests.
3. For each page, write at minimum one React Testing Library smoke test:
   ```tsx
   import { render, screen } from '@testing-library/react';
   import PayrollPage from './page';
   describe('PayrollPage', () => {
     it('renders without crashing', () => {
       render(<PayrollPage />);
       expect(screen.getByRole('main')).toBeInTheDocument();
     });
   });
   ```
4. Aim for 1:1 parity (286 test files for 286 pages) over 2 sprints.

**Effort:** Medium — 2 sprints of parallel work if assigned across the team.

**Points gained:** +1/100

---

## The Single User Action Required

### Railway `DEMO_CREDENTIALS_ENABLED=false` — Critical Production Gate

**What this is:** NU-AURA's backend includes a feature flag, `DEMO_CREDENTIALS_ENABLED`, that — when set to `true` — allows anyone visiting the login page to click a "Demo Login" button and immediately authenticate as `SUPER_ADMIN` with one click and no credentials. This feature was intentionally enabled on Railway during staging to allow stakeholder demos and QA testing without remembering passwords.

**Why it is critical:** With this flag enabled on the production URL (`nu-aura-backend-production.up.railway.app`), any member of the public who discovers the URL can log in as `SUPER_ADMIN` and access every employee's payroll records, bank details, tax information, and performance reviews across all tenants. This is a complete authentication bypass and represents the highest possible severity data breach scenario. The code is already correct — the flag defaults to `false` and the deployment checklist requires it — but the Railway environment variable has not yet been updated.

**Exact steps to close this gap:**

1. Open the Railway dashboard at [https://railway.app](https://railway.app) and navigate to the `nu-aura` project.
2. Select the **production environment** (not staging).
3. Click on the **backend service**.
4. Open the **Variables** tab.
5. Find the variable `DEMO_CREDENTIALS_ENABLED`.
6. Change its value from `true` to `false`.
7. Click **Save** — Railway will trigger an automatic redeploy.
8. After the deploy completes (approximately 2–3 minutes), navigate to the frontend login page and verify that the "Demo Login" button is no longer visible.
9. Attempt to `POST /api/v1/auth/demo-login` and confirm the response is `403 Forbidden` or `404 Not Found`.

**This is not a code change.** It is a single environment variable update in the Railway dashboard. It takes under 5 minutes. It is the only action that must happen before real users are onboarded.

---

## Full Checklist to 100%

Items are ordered by priority: critical blockers first, high-severity fixes second, medium-severity third, and low-severity polish last.

### Critical — Must Complete Before Production Go-Live

- [ ] **[RAILWAY ACTION]** Set `DEMO_CREDENTIALS_ENABLED=false` in Railway production environment variables — 5 minutes, no code change

### High Severity — Complete Within Sprint 1

- [ ] **[ARCH-01 / SEC-RLS-TEST-02]** Enable `RlsNoBypassTest` in CI: replace `@Disabled` with `@EnabledIfEnvironmentVariable(named = "DOCKER_AVAILABLE", matches = "true")`, add `DOCKER_AVAILABLE: "true"` to GitHub Actions test job — +2 pts Security, +2 pts Architecture (30 minutes)
- [ ] **[UX-A11Y-01]** Add `label=` or `aria-label` to 88 unlabelled Mantine `TextInput`/`NumberInput`/`PasswordInput` components — +2 pts UX (2 days, can be parallelised by module)
- [ ] **[N1-001]** Fix N+1 regression path in `RecruitmentManagementService.java` line 240: replace `page.map(this::mapToCandidateResponse)` with batch path — +2 pts API Coverage (30 minutes)

### Medium Severity — Complete Within Sprint 2

- [ ] **[UX-A11Y-03]** Add skip-navigation link to `frontend/app/layout.tsx` and `id="main-content"` to `<main>` in `AppLayout` — +1 pt UX (30 minutes)
- [ ] **[ZOD-001]** Replace raw `useState` form in `me/skills/page.tsx` with `useForm` + `zodResolver` and a Zod schema — +2 pts API Coverage (1 hour)
- [ ] **[ZOD-002]** Find and fix the 3 remaining `useForm` instances without `zodResolver` — run `grep` command in ZOD-002 to locate them — +1 pt API Coverage (2 hours)
- [ ] **[UX-A11Y-02]** Apply `useReducedMotionSafe` pattern across 358 Framer Motion files — create shared `useAnimationVariants` hook to simplify rollout — +2 pts UX (3–4 days)
- [ ] **[ARCH-02]** Route `DeadLetterHandler` DLQ retries through the outbox when `app.outbox.enabled=true` instead of calling `kafkaTemplate.send()` directly — +1 pt Architecture (2 hours)
- [ ] **[SEC-A11Y-01]** Add `aria-label` or visible labels to the remaining 842 `<input>`/`<Input>`/`<TextInput>` elements not covered by UX-A11Y-01 — +1 pt Security (2 days)

### Low Severity — Complete Within Sprint 3

- [ ] **[REC-AUTH-ERR]** Create `frontend/app/auth/error.tsx` as a minimal unauthenticated error component — +0.5 pts Route Coverage (15 minutes)
- [ ] **[REC-APP-ERR]** Create `frontend/app/app/error.tsx` with sub-app grid error UI and retry button — +0.5 pts Route Coverage (20 minutes)
- [ ] **[RBAC-GAP-1]** Add specific `anyPermission` guards to `/nu-calendar`, `/nu-drive`, `/nu-mail`, `/tax/declarations` in `routes.ts` — +1 pt RBAC (30 minutes)
- [ ] **[RBAC-GAP-2]** Add CI lint rule to flag new `app/admin/` pages without explicit `PROTECTED_ROUTES` entry — +1 pt RBAC (1 hour)
- [ ] **[RBAC-GAP-3]** Mark `Roles.MANAGER` as `@deprecated` in `usePermissions.ts`, audit and replace all direct `hasRole(Roles.MANAGER)` usages — +1 pt RBAC (1 hour)
- [ ] **[UX-A11Y-04]** Audit and fix focus management in all custom modal/drawer/overlay components; ensure Mantine `Modal`/`Drawer` is used consistently — +1 pt UX (2–3 days)
- [ ] **[BQ-01]** Add React Testing Library unit tests to achieve 1:1 parity with 286 pages — +1 pt Build Quality (2 sprints of parallel work)
- [ ] **[REC-SUSPENSE]** Add fine-grained `<Suspense>` boundaries to 20+ pages with multiple independent `useQuery` regions — +1 pt Route Coverage (2–4 hours)

### Documentation Only — No Score Impact

- [ ] **[ARCH-03]** Reconcile Flyway migration count documentation in `docs/obsidian/06-Database` with actual filesystem count — run `find backend/src/main/resources/db/migration -name 'V*.sql' | sort` and document all gaps/skipped version numbers (30 minutes)
