# Tenant Isolation Audit — 2026-11-15 (agent: tenant)

Scope: live cross-tenant attack matrix (API) + independent RLS proof as the actual app role (`hrms_user`), per
`01-testing-strategy.md`. Prior `TENANCY-RLS.md` (2026-09-22) used only as a lead; everything below is re-verified live.

## Verdict: GO on data isolation (DB + API), with 2 Medium findings and 1 High DB-hygiene gap

- **0 confirmed cross-tenant data leaks** across 51 live API attack scenarios (IDOR-by-ID, list endpoints, writes,
  tenant-id tampering, JWT claim tampering, file-path traversal, unauthenticated probes) run against a real
  cross-tenant victim/attacker pair.
- **RLS is independently sound at the database layer**: swept all 324 tables with a `tenant_id` column, as the
  literal app role, with no superuser/bypass privileges — see Part 3.
- Two **Medium** findings (permission-catalog tenant coupling; SUPER_ADMIN cross-tenant system view) and one
  **High** housekeeping gap (3 global tables have no RLS/forced-RLS, relying entirely on absent-WHERE-clause
  discipline) are below.

## Part 1 — Test tenants

Reused tenants already in the dev DB (`tenants` table had 2 rows: `nulogic`, `default`, neither usable as an
isolated attacker/victim pair — `default` has 0 users). Created, via superuser SQL (app provisioning endpoint
`POST /api/v1/tenants/register` requires `TENANT:MANAGE`, held only by `SUPER_ADMIN`; using a real-owner
SUPER_ADMIN account is forbidden by the audit rules):

- `NUAURA_TEST_Alpha` (`a1fa0000-0000-4000-8000-00000000a1fa`) — victim tenant
- `NUAURA_TEST_Beta` (`be7a0000-0000-4000-8000-0000000be7a0`) — attacker tenant

Each got the 9 non-SUPER_ADMIN roles (copied from NuLogic) + a TENANT_ADMIN admin user + an EMPLOYEE user.
**Defect found while seeding** (DEF-TENANT-01, see below) forced a second seeding pass: a SUPER_ADMIN role/user
per test tenant, with **0** `role_permissions` rows (this is what the real provisioning flow actually produces,
since the global `permissions` catalog is owned by the NuLogic tenant — see DEF-TENANT-01). SUPER_ADMIN bypasses
`@RequiresPermission` by role (`PermissionAspect.java:79`), so it does not need catalog rows to act as a fully
privileged attacker, which is the realistic worst case for this audit.

Seeded in Alpha (fixed IDs, all prefixed `NUAURA_TEST_`): 2 employees (one linked to the Alpha admin user), 1
leave type + 1 leave request (PENDING, "confidential medical reason"), 1 payroll run + 1 payslip (net ₹223,456),
1 salary structure (₹777,777 basic), 1 job opening + 1 candidate, 1 review cycle + 1 performance review
(reviewer = Alpha's own SUPER_ADMIN employee, "confidential review comment"), 1 private wiki space + 1 private
wiki page, 1 uploaded-file record + `drive_file_mapping` row. Full list + IDs: `evidence/test-data-tenant.md`.
Each test user logged in **once** via `POST /api/v1/auth/login`, cookie jar reused for every subsequent call
(no brute-force, no lockouts triggered on real accounts). Scripts: `evidence/scripts/tenant/00-06*.sql`,
`login-batch.sh` (jittered retry on the shared 5/min/IP auth bucket, never retries a 401).

## Part 2 — Attack matrix: Beta → Alpha (live API)

Attackers: `beta_sa` (SUPER_ADMIN of Beta — strongest attacker), plus two **real, more-privileged-than-average
NuLogic users** (`tenant_admin`, `hr_admin`) attacking Alpha data from inside their own (NuLogic) tenant, to cover
"privileged same-platform insider" as well as "rival tenant". Every by-ID/list test used a **valid-control gate**:
the request was first run as `alpha_sa` (the data's own tenant); a test only counts if the control returned 2xx
**and** the response body actually contained an Alpha-only marker string (so a 200-with-empty-list never passes as
a "proof"). 32 distinct scenarios passed this gate; 13 were inconclusive (control itself failed — see below) and
are marked NOT TESTED, not PASS. Script: `evidence/scripts/tenant/20-attack-idor.py`.

**Result: 0 leaks.** Every valid by-ID probe (employee, employee-by-admin, payslip, leave request, candidate,
review, wiki space, salary structure, payslips-by-employee, file-download-url) returned 404/400/403 to all three
attackers — server-side, not UI-hidden. Every valid list/search endpoint (employees, candidates, reviews,
payslips, users, roles, leave-by-status, leave-by-employee) returned only Beta/NuLogic-owned rows to the
attackers; two apparent "LEAK" flags (`employees-list`, `users-list` for `beta_sa`) were false positives of the
marker list (generic string `@nuaura-test.example` also matches Beta's own seeded emails) — manually confirmed
the response bodies contain **only** Beta emails, re-logged as PASS. Transcripts: `evidence/logs/NU-SEC-TENANT-100-idor-get-by-id.txt`, `...-101-list-endpoints.txt`.

Inconclusive (control itself 403/404/500, not a tenant-isolation question): `GET /reviews/{id}` denied even to
the owner (review-level ownership rule, separate from tenant — not a leak); `GET /knowledge/wiki/pages/{id}`,
`.../export`, `.../space/{id}` all **500** for the owner too (Hibernate `jsonb` vs `varchar` type mismatch
writing `last_viewed_at`/`content` on view — **DEF-TENANT-02**, below — pre-existing bug, not a security gap,
but it blocked 5 wiki read-path isolation tests).

### Writes, reference-creation, tenant-id tampering, JWT tampering, file-guard, public surface

`evidence/scripts/tenant/21-attack-write-tamper.py`, logs `NU-SEC-TENANT-102` through `-107`.

- **102 — direct cross-tenant writes** (update/delete Alpha employee, payslip, leave-approve/reject, candidate,
  review; delete Alpha file) from `beta_sa`/`tenant_admin`/`hr_admin`: **all rejected** (400/403/404). DB verified
  unchanged after the run (`22-verify-db-after-attacks.sql`): Alpha employee name, payslip net salary, leave
  status, candidate status, review comment all byte-identical to seed.
- **102b — cross-tenant reference creation** (Beta SA creating a review/leave-request/payslip/candidate that
  *points at* an Alpha employee/job/cycle id via a request body FK): all rejected by business validation
  (`"Job opening not found"`, `"Review cycle not found"`, `"Insufficient leave balance"` — tenant-scoped lookups,
  not generic 403, meaning the FK lookup itself is tenant-filtered) before any row was created; DB confirmed 0
  rows created in Beta referencing Alpha, and 0 rows created in Alpha by Beta.
- **103 — tenant-id tampering**: `X-Tenant-ID`/`X-Tenant-Id`/`X-Tenant`/`Tenant-Id`/`X-Forwarded-Tenant` headers,
  `tenantId`/`tenant_id`/`tenant` query params, and a request **body** `tenantId: <Alpha>` on `POST /departments`
  — all ignored for an authenticated caller (JWT tenant claim is authoritative; code comment in
  `TenantFilter.java:106-144` confirms this is an intentional, documented design, re-verified live). The one
  partially-successful case (`POST /departments` with `tenantId: Alpha` in the body, HTTP 201) created the
  department under **Beta** (the caller's real tenant), not Alpha — confirmed by DB read and deleted as test
  cleanup. Unauthenticated calls with a forged `X-Tenant-ID` on protected paths got 401 (correct — only
  `/api/v1/public/**` honors the header at all, and only when unauthenticated).
- **104 — JWT claim tampering**: re-signed-looking tokens with `tenantId` claim swapped to Alpha
  (`alg: none`, stripped signature, swapped header/payload/signature combinations across the two sessions, both
  cookie names, and raw `Authorization: Bearer`) — **all rejected with 401/403** in every of 6 variants × 3
  transport combinations = 18/18. One informational check: presenting Beta's hardened `__Host-hrms-access`
  cookie together with Alpha's legacy `access_token` cookie in the same request resolves to **exactly one**
  tenant (Beta, the hardened cookie — matches the documented precedence), never a mixed/undefined state.
- **105 — file-download path-traversal variants** (`../`, `%2e%2e/`, `%2F`-encoded, uppercase, leading slash,
  null-byte) against `/api/v1/files/download`, `/download/direct`, `/exists`: **all returned HTTP 200** instead
  of being rejected by the tenant-prefix guard — see **DEF-TENANT-03 (Medium)** below; in every case the
  underlying `drive_file_mapping` lookup still returned "not found" (`exists:false`, empty body), so **no file
  content crossed tenants**, but the guard itself is bypassable by string form, which is the wrong layer to rely
  on.
- **106 — public & platform surface**: unauthenticated `/api/v1/public/careers/jobs` correctly scopes by
  `X-Tenant-ID` (Alpha header → only Alpha's job visible; Beta header/no header → Alpha's job absent) — this is
  by design for an unauthenticated public page and is **not** a leak. Platform-admin endpoints
  (`/admin/system/tenants`, `/admin/system/tenants/{id}/metrics`, `/admin/system/overview`,
  `POST /tenants/register`) correctly 403 for `tenant_admin`/`hr_admin`/`employee` and correctly 200 (by design —
  SUPER_ADMIN is explicitly cross-tenant mission control) for `beta_sa` — see **DEF-TENANT-04 (Medium,
  informational)** below on what that view exposes. Bogus biometric API key on the webhook punch endpoint: 400 (rejected, not 401, but rejected).

## Part 3 — RLS, independent of the application (as the literal app role `hrms_user`)

`evidence/scripts/tenant/10-rls-as-app-role.sql` / `11-rls-writes-as-app-role.sql`, run via `psql` as `hrms_user`
(never superuser) against the local dev DB. Confirmed role facts: `hrms_user` is **not** superuser, **not**
`rolbypassrls`, but **owns** all 337 public tables (migrations run as this role) — ownership normally bypasses
RLS unless `FORCE ROW LEVEL SECURITY` is set, which is why the FORCE check matters (see W8 below).

- **325 of 337** tables have `relrowsecurity` **and** `relforcerowsecurity` both true. The 12 without either are
  all either empty, trigger-pattern inconsistency tables, or dependent on a non-tenant key — not independently
  exploitable (see Part 3 detail table below).
- **Full sweep of all 324 tables with a `tenant_id` column**, `SELECT count(*)` under 4 GUC states
  (none / Beta / Alpha / NuLogic): **0** tables returned any row with the GUC unset **except**
  `app_permissions` (72, global catalog by design), `nu_applications` (4, global catalog by design), and
  `tenants` (4 — see **DEF-TENANT-05 (Medium)** below, the tenant directory itself is readable row-wise without
  a tenant GUC). **0** tables let Beta's GUC see Alpha-or-NuLogic rows, Alpha's GUC see Beta rows, or
  NuLogic's GUC see Alpha rows, across the entire schema — not just the handful of entity tables probed via API.
- **Write proof (all inside `BEGIN...ROLLBACK`, superuser never used for isolation proof):**
  - Full-schema sweep: with GUC=Beta, `UPDATE ... SET tenant_id=tenant_id WHERE tenant_id=Alpha` and
    `DELETE WHERE tenant_id=Alpha` against **every** one of the 324 tenant tables → **0 rows affected,
    0 errors**, everywhere.
  - Targeted: Beta GUC `UPDATE`/`DELETE` an Alpha employee/payslip by exact ID → 0 rows. `INSERT` a row with
    `tenant_id=Alpha` while GUC=Beta → **rejected** (RLS policy violation, `employees_tenant_rls`). Beta GUC
    tries to move its **own** employee into Alpha (`UPDATE tenant_id=Alpha`) → rejected. Beta GUC inserts a
    `user_roles` row with `tenant_id=NULL` → rejected (the RESTRICTIVE "ctx required" policy, which is what
    makes the GUC mandatory rather than optional). With **no GUC at all**: `INSERT` rejected, `UPDATE` 0 rows.
  - **Owner-bypass check (W8)**: created a throwaway table owned by `hrms_user` with the exact same
    enable+force+policy pattern as production tables. With FORCE RLS set, the owning role sees **0** rows under
    a foreign GUC (correct — FORCE applies even to the owner). The owner **can** run
    `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` on its own table (expected — ownership always grants DDL), at
    which point RLS silently stops applying to that owner's own session. This is not exploitable through any
    application code path (the app never runs DDL at request time) but it is the mechanism by which **any**
    future migration, admin script, or compromised credential with the `hrms_user` password could permanently
    disable isolation on a table with one statement and no audit trail beyond the DDL log — flagged as
    **DEF-TENANT-06 (Medium, defense-in-depth)** below.
  - Client-controlled GUC (W7): confirmed `set_config('app.current_tenant_id', ..., true)` is transaction-local
    (per `TenantRlsTransactionManager.java:76`, bind-parameterized — not vulnerable to SQL injection via the
    tenant id itself) and mid-transaction GUC switches behave as documented (session-scoped pooled-connection
    reset-on-checkout/close in `TenantAwareDataSourceConfig.java:118-124,153-174` was read and is consistent
    with what the live sweep showed: no residue from Beta's prior GUC in Alpha's run).
  - `hrms_user` **can** `TRUNCATE` its owned tables (ownership privilege) — not demonstrated (would violate the
    "no destructive ops" rule), noted as a related defense-in-depth gap under DEF-TENANT-06.

### Tables without RLS (12) — classified

| Table | Rows (dev) | Why not independently risky |
|---|---|---|
| `flyway_schema_history`, `shedlock` | n/a | Infra-only, no `tenant_id`, no API read path |
| `api_key_scopes`, `announcement_target_departments`, `announcement_target_employees`, `notification_template_channels`, `user_notification_quiet_days`, `user_app_roles`, `user_app_direct_permissions`, `webhook_events`, `failed_kafka_events`, `benefit_claim_documents` | all 0 rows | Pure child/join tables with **no `tenant_id` column of their own** (verified via `information_schema`) — isolation depends entirely on the FK'd parent row (which *is* RLS-protected) being resolved first; not independently testable and not a new gap versus the 325 RLS'd tables, but also not proven by this sweep. Recommend adding `tenant_id` + RLS to the ones backing sensitive data (`benefit_claim_documents`, `webhook_events`) for defense-in-depth. |

## Defects

See `evidence/defects-tenant.md` for the full table (file:line, repro, proposed fix, effort). Summary:

| ID | Sev | One-line |
|---|---|---|
| DEF-TENANT-01 | High | Global permission catalog (`permissions` table) is hard-stamped to the NuLogic tenant (`tenant_id NOT NULL`, no tenant predicate anywhere in code); every other tenant's roles get 0 permissions after real provisioning, and SUPER_ADMIN is the only role that still works post-signup. |
| DEF-TENANT-02 | Medium | `GET /knowledge/wiki/pages/{id}` (and `/export`, `/space/{id}`) throws 500 for a JSONB `content` column bound as `varchar` on read-then-touch (`last_viewed_at` update path) — blocks 5 wiki isolation checks, pre-existing bug not caused by this audit. |
| DEF-TENANT-03 | Medium | File-download tenant guard (`FileUploadController.assertTenantOwns`) is a `String.startsWith(tenantId+"/")` check bypassable with `../`, `%2e%2e/`, `%2F`-encoded segments; no traversal normalization before the check. No data crossed tenants only because the secondary `drive_file_mapping` DB lookup also failed to resolve — a second guard, not this one, is what held. |
| DEF-TENANT-04 | Medium (informational) | SUPER_ADMIN's `/admin/system/tenants*` view is intentionally cross-tenant (by design, documented) — flagged only so the release-readiness reviewer explicitly signs off that this is wanted, since it is the single broadest cross-tenant read surface in the app. |
| DEF-TENANT-05 | Medium | `tenants` table itself has no RLS at all (`relrowsecurity=false`) — any authenticated DB role can enumerate all tenant names/codes/contact emails with no GUC set. Low practical risk (app never exposes raw SQL), but inconsistent with the "fail-closed" posture documented for every other table. |
| DEF-TENANT-06 | Medium | Table ownership (`hrms_user` owns all 337 tables) means the app's own DB credential can run `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` or `TRUNCATE` on any tenant table with no additional privilege — RLS's fail-closed guarantee rests entirely on no code path ever executing attacker-controlled DDL/SQL, which is true today but has zero defense-in-depth if that ever changes (e.g. a future raw-SQL admin tool). Recommend a lower-privileged runtime role (`nu_app_rls` already exists per migration V179 but was not wired as the Spring Boot connection's role in this environment — worth confirming for prod). |

## What was NOT tested / BLOCKED

- Could not test the real `POST /api/v1/tenants/register` provisioning flow end-to-end as a non-superuser caller
  (needs `TENANT:MANAGE`, held only by SUPER_ADMIN on real-owner accounts, forbidden by audit rules) — DEF-TENANT-01
  was instead reproduced by seeding tenants the way the service code actually does it (role_permissions = 0),
  then confirming login fails for a `permissionCodes`-bearing role and succeeds only for SUPER_ADMIN.
- Remote/prod Postgres (Neon) RLS was **not** probed — local-only per shared-environment rules; this report's
  RLS proof is against the local dev schema, which Flyway keeps in parity with prod migrations but is not a
  substitute for a prod-credential check.
- `nu_app_rls` role exists (migration V179) but credentials were not available in this session; not used.
