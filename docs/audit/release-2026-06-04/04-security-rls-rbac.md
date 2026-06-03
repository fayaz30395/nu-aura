# NU-AURA Release Audit — Security / RLS / RBAC / Real-Time

- **Audit date:** 2026-06-04
- **Scope:** Runtime RLS fail-closed, SuperAdmin bypass, `@RequiresPermission` coverage,
  webhook key rotation, WebSocket tenant-topic authz, secrets/loopback.
- **Mode:** READ-ONLY static audit. No files modified.
- **Prior context:** `docs/audit/release-readiness-100-note-2026-05-24.md` (RLS fail-open finding + fix).

## Overall Verdict

**PASS (code/migration layer) — with live proof still required.**

Every hardening control claimed in the 2026-05-24 note is present and internally
consistent in source. The RLS migration chain (V254 → V255 → V256 → V262 → V263 → V269)
plus `RlsStartupProbe` form a coherent fail-closed design, and runtime/Flyway role
separation is documented. No P0 release blockers were found in code. The remaining risk
is **environmental, not code**: the controls are only as strong as the deployed
`SPRING_DATASOURCE_USERNAME` actually being `nu_app_rls` (NOBYPASSRLS) in production, which
must be proven live.

---

## P0 — Release Blockers

**None found in the code/migration layer.**

The only way a P0 re-appears is operational: if production wires the runtime datasource to
a `BYPASSRLS`/owner role (e.g. `neondb_owner`). `RlsStartupProbe` is designed to catch this
at boot (`assertCurrentRoleCannotBypassRls`), but with `app.security.rls.probe.fail-on-bypass`
the default is `true` (fail-closed) — confirm it is **not** overridden to `false` in prod, and
confirm `RLS_PROBE_SKIP` is unset. See "Live checks still required".

---

## P1 — Findings

### P1-1 — RLS fail-closed: code + migrations present and coherent — PASS

- `RlsStartupProbe` exists and runs as an `ApplicationRunner` excluded from the `test`
  profile, ordered very early.
  Evidence: `backend/src/main/java/com/nulogic/common/security/RlsStartupProbe.java:47-51`.
- Checks current role for **SUPERUSER and BYPASSRLS** and fails on either.
  Evidence: `RlsStartupProbe.java:56-60` (`rolsuper`, `rolbypassrls`), `:175-195`
  (`assertCurrentRoleCannotBypassRls`).
- Asserts every public UUID-`tenant_id` table has **RLS enabled, FORCE ROW LEVEL SECURITY,
  and a restrictive `app.current_tenant_id` policy**.
  Evidence: `RlsStartupProbe.java:61-85` (inspection SQL incl. `relforcerowsecurity` and a
  `polpermissive = false` context-required policy), `:244-267`.
- Asserts tenant-bearing **views are SECURITY INVOKER** (closes the view-bypasses-table-RLS gap).
  Evidence: `RlsStartupProbe.java:86-100`, `:269-281`.
- Runtime canary: opens a fresh connection, `RESET app.current_tenant_id`, then probes
  `EXISTS(... WHERE tenant_id IS NOT NULL)` across every tenant relation; any visible
  tenant-owned row throws `IllegalStateException` when `fail-on-bypass=true`.
  Evidence: `RlsStartupProbe.java:127-167`, `:340-347`.
- `V254__enforce_runtime_rls_fail_closed.sql` reasserts `ALTER ROLE nu_app_rls NOBYPASSRLS`
  and installs a **RESTRICTIVE** tenant-context-required policy (`USING`+`WITH CHECK`,
  NULL-safe `NULLIF(...,'')` guard) + `FORCE ROW LEVEL SECURITY` on every UUID-`tenant_id` table.
  Evidence: `backend/src/main/resources/db/migration/V254__enforce_runtime_rls_fail_closed.sql:21-32` (NOBYPASSRLS),
  `:34-81` (restrictive policy loop).
- Later RLS migrations up to V269 extend/repair this without regressions:
  - `V255__reenforce_rls_on_all_tenant_tables.sql` — re-scan/re-enforce.
  - `V256__force_security_invoker_on_tenant_views.sql:28-47` — forces `security_invoker=true`
    on every tenant view and raises if any is missed.
  - `V262__reenforce_rls_after_late_tenant_tables.sql:64-138` — re-enforces after late tables
    (V257-V261), replaces legacy direct-cast policies (avoids 22P02), and **verifies** RLS+force,
    restrictive policy, and safe permissive policy presence (raises EXCEPTION otherwise).
  - `V263__allow_global_catalog_rows_under_rls.sql:72-120` — permits `tenant_id IS NULL` global
    catalog rows (`permissions`, `tenants`, `nu_applications`, app_*), while keeping tenant-owned
    rows fail-closed. This is intentionally aligned with the probe's `WHERE tenant_id IS NOT NULL`
    canary (global rows are ignored by the probe).
  - `V269__allow_tenant_sequence_allocators_under_rls.sql:7-41` — adds the required permissive
    tenant-match policy to sequence allocator tables so writes work under fail-closed RLS.

**Verdict: PASS.** Design is fail-closed and self-verifying at boot.

### P1-2 — Runtime vs Flyway datasource role separation — PASS (documented)

- Runtime datasource is documented to use the non-bypass role; Flyway uses a separate
  migration/owner role.
  Evidence: `.env.production.example:13-26`
  (`SPRING_DATASOURCE_USERNAME=nu_app_rls`, comment "Runtime datasource must use a dedicated
  non-SUPERUSER/non-BYPASSRLS role"; `FLYWAY_USER=nu_migration`, comment "Keep owner/operator
  credentials for Flyway only" / "Flyway should use a direct endpoint and migration/owner role,
  never the pooled runtime URL").
- Config binds both from env, with Flyway falling back to the datasource creds **only if
  FLYWAY_* are unset** (acceptable for local dev; prod sets distinct creds).
  Evidence: `backend/src/main/resources/application.yml:22-24` (runtime),
  `:95-113` (`spring.flyway.url/user/password` with `${FLYWAY_*:${SPRING_DATASOURCE_*}}` fallback);
  `application-prod.yml:81-85` (prod requires distinct `${FLYWAY_URL/USER/PASSWORD}`).

**Verdict: PASS (config) — must be confirmed live (the env file is an example, not the deployed secret).**

### P1-3 — SuperAdmin bypass intact (release rule: must NOT be blocked) — PASS

- Permission enforcement is the AOP `PermissionAspect` on `@RequiresPermission`
  (`@annotation || @within`).
  Evidence: `backend/src/main/java/com/nulogic/common/security/PermissionAspect.java:48-49`.
- Explicit SuperAdmin bypass branch returns `joinPoint.proceed()` before any permission eval,
  with an INFO-level audit log line for every bypass.
  Evidence: `PermissionAspect.java:82-90` (`if (SecurityContext.isSuperAdmin()) { ...AUDIT... return proceed; }`).
- `SecurityContext.isSuperAdmin()` = `SUPER_ADMIN` role OR `SYSTEM:ADMIN` permission.
  Evidence: `backend/src/main/java/com/nulogic/common/security/SecurityContext.java:476-481`,
  `:284-289` (`isSystemAdminPermission`).
- Bypass is **application-layer only**; there is no DB-role exception for SuperAdmin (RLS still
  requires tenant context for SuperAdmin traffic).
  Evidence: `V254__...sql:17-18` ("SuperAdmin bypass remains application-layer only.
  There is no database role exception"); `RlsStartupProbe.java:191` ("SuperAdmin bypass must
  remain application-layer only.").

**Verdict: PASS.** SuperAdmin is not blocked; bypass is audited and DB-isolation-safe.

### P1-4 — Webhook signing-key dual-key rotation window — PASS

- Schema: `V166__webhook_dual_secret.sql` adds `previous_secret` + `previous_secret_expires_at`
  with a partial index, and documents the rotation contract.
  Evidence: `backend/src/main/resources/db/migration/V166__webhook_dual_secret.sql:7-18`.
- Signing always uses the **current** secret only.
  Evidence: `backend/src/main/java/com/nulogic/application/webhook/service/WebhookDeliveryService.java:310-314`.
- Verification accepts current OR previous secret while the window is open; constant-time
  compare (`MessageDigest.isEqual`); falls to current-only after expiry.
  Evidence: `WebhookDeliveryService.java:385-405` (`verifySignature`), `:411-424` (`matchesSignature`).
- Hourly ShedLock-guarded sweep nulls expired `previous_secret` per tenant.
  Evidence: `WebhookDeliveryService.java:433-449`.
- Rotation endpoint exists: `api/webhook/controller/WebhookRotationController.java`.

**Verdict: PASS.** Dual-key rotation window is fully implemented (note: no inbound webhook
endpoint exists yet; `verifySignature` is forward-looking, per its own javadoc).

### P1-5 — WebSocket CONNECT auth + tenant-topic authz — PASS

- CONNECT authenticated via **bearer header OR httpOnly access-token cookie**; missing/invalid
  token is rejected with `MessageDeliveryException`.
  Evidence: `backend/src/main/java/com/nulogic/common/websocket/WebSocketSecurityConfig.java:90-147`
  (`handleConnect`), `:149-165` (`resolveAccessToken` — Authorization Bearer then cookie attribute).
- Cookie is lifted from the SockJS handshake (supports `__Host-` prefixed and legacy cookie names).
  Evidence: `backend/src/main/java/com/nulogic/common/websocket/WebSocketAuthTokenHandshakeInterceptor.java:20-29,60-81`.
- SUBSCRIBE is **default-deny**: tenant topics require the path tenant UUID to equal the JWT
  tenant from session attributes; non-tenant topics must match an explicit public allowlist.
  Cross-tenant subscribe is rejected.
  Evidence: `WebSocketSecurityConfig.java:174-229` (tenant match at `:221-226`),
  `:44-58` (`TENANT_TOPIC_PATTERN`, `PUBLIC_TOPIC_PREFIXES`).
- Frontend subscribes to the matching destinations:
  - `/user/queue/notifications` — `frontend/lib/services/websocket.ts:348`,
    `frontend/lib/contexts/WebSocketContext.tsx:119`.
  - `/topic/tenant/{tenantId}/notifications` — `websocket.ts:354`, `WebSocketContext.tsx:122`.

**Verdict: PASS.** Tenant A cannot subscribe to tenant B at the code layer
(server-side enforced from JWT, not client-supplied tenant). Negative test must still run live.

### P1-6 — Secrets / loopback in production config — PASS

- No hardcoded credentials/keys in Java source (pattern scan for inline `password=/secret=/apiKey=`
  string literals: no matches).
- No hardcoded high-entropy secrets in `application*.yml`; all secrets are env-injected
  (`JWT_SECRET`, `MAIL_PASSWORD`, `RECAPTCHA_SECRET_KEY`, datasource creds, etc.).
  Evidence: `application.yml:279-282` (`jwt.secret: ${JWT_SECRET}` — no default, fails fast),
  `application-prod.yml:128-130,229,255` (all env-injected / K8s-secret paths).
- `application-prod.yml` contains no production loopback dependency. The only `localhost`
  appears as the **Redis host default** with an explanatory comment, and is env-overridable
  (`host: ${SPRING_REDIS_HOST:localhost}`).
  Evidence: `application-prod.yml:100,105`.

**Verdict: PASS.** No committed secrets; no hard production loopback.

---

## P2 — Observations (non-blocking)

- **P2-1 — RBAC granularity nit:** `EmployeeController` guards two mutating endpoints
  (`PUT /{id}/admin`, `PUT /{id}/deactivate`) with `EMPLOYEE_VIEW_ALL` rather than an
  update/delete permission. Mitigated by `revalidate = true` (fresh DB permission lookup) and
  these are not unprotected, but a VIEW permission gating a mutation is a granularity smell.
  Evidence: `backend/src/main/java/com/nulogic/api/employee/EmployeeController.java:357-358,388-389`.
- **P2-2 — Flyway baseline / out-of-order:** `application.yml:99-101` sets
  `baseline-on-migrate: true`, `baseline-version: 18`, `out-of-order: true`. This is consistent
  with the prior note's modified-historic-migrations concern; harmless for security but means
  Flyway will tolerate out-of-order/late migrations — keep an eye on it during the migration-chain
  review (separate audit track).
- **P2-3 — Redis fail-open fallbacks:** Several Redis-backed security services
  (TokenBlacklist, AccountLockout) have in-memory fallbacks per the stack docs; verify these do
  not silently degrade rate-limiting/lockout in a multi-pod prod outage (out of scope here; flag
  for ops review).

## Spot-check: `@RequiresPermission` coverage on sensitive controllers — PASS

All mutating endpoints inspected carry `@RequiresPermission`; high-impact actions use
`revalidate = true` (fresh DB check, defeats stale-JWT permission escalation):

- **Payroll** — every `@PostMapping/@PutMapping/@DeleteMapping` annotated; process/approve/lock
  use `revalidate = true`.
  Evidence: `backend/src/main/java/com/nulogic/api/payroll/controller/PayrollController.java:51-52,137-138,180-181,188-189,195-196`.
- **Employees** — create/update/delete/deactivate all annotated.
  Evidence: `EmployeeController.java:64-65,139-140,330-331,357-358,375-376,388-389`.
- **Exports** — `ExportController` has `@RequiresPermission` (6 occurrences).
- **Admin** — `SystemAdminController` has `@RequiresPermission` (9 occurrences).

No obvious unprotected mutating endpoints were found on the sampled sensitive controllers.

---

## Live Checks Still Required Before Release (cannot be proven statically)

1. **RLS proof as `nu_app_rls`** (the real runtime role, not `neondb_owner`):
   - `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;` → both `false`.
   - `RESET app.current_tenant_id; SELECT COUNT(*) FROM employees;` → `0`.
   - `SET app.current_tenant_id = '<tenant A>'; SELECT COUNT(*) FROM employees;` → tenant-A count only.
   - Confirm boot: `RlsStartupProbe` logs "RLS startup probe passed: 0 tenant-owned rows visible…"
     and `app.security.rls.probe.fail-on-bypass` is **not** `false` and `RLS_PROBE_SKIP` is unset
     in the production environment.
2. **Two-tenant WebSocket negative test (live):**
   - Authenticate as tenant A; attempt `SUBSCRIBE /topic/tenant/{tenantB}/notifications` → expect
     rejection ("Cross-tenant subscription not permitted").
   - Confirm tenant A does **not** receive a tenant-B-targeted notification broadcast.
3. **Deployed secret verification:** confirm the K8s/CI secret actually sets
   `SPRING_DATASOURCE_USERNAME=nu_app_rls` and a distinct `FLYWAY_USER`, and that `JWT_SECRET`
   is present (≥256-bit) — the repo only ships `.env.production.example`.

---

## Evidence Index (primary files)

- `backend/src/main/java/com/nulogic/common/security/RlsStartupProbe.java`
- `backend/src/main/java/com/nulogic/common/security/PermissionAspect.java`
- `backend/src/main/java/com/nulogic/common/security/SecurityContext.java`
- `backend/src/main/java/com/nulogic/common/websocket/WebSocketSecurityConfig.java`
- `backend/src/main/java/com/nulogic/common/websocket/WebSocketAuthTokenHandshakeInterceptor.java`
- `backend/src/main/java/com/nulogic/application/webhook/service/WebhookDeliveryService.java`
- `backend/src/main/resources/db/migration/V166__webhook_dual_secret.sql`
- `backend/src/main/resources/db/migration/V254__enforce_runtime_rls_fail_closed.sql`
- `backend/src/main/resources/db/migration/V256__force_security_invoker_on_tenant_views.sql`
- `backend/src/main/resources/db/migration/V262__reenforce_rls_after_late_tenant_tables.sql`
- `backend/src/main/resources/db/migration/V263__allow_global_catalog_rows_under_rls.sql`
- `backend/src/main/resources/db/migration/V269__allow_tenant_sequence_allocators_under_rls.sql`
- `backend/src/main/resources/application.yml`, `application-prod.yml`
- `.env.production.example`
- `frontend/lib/services/websocket.ts`, `frontend/lib/contexts/WebSocketContext.tsx`
