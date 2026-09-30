# Final Release Decision — three independent gates

**Date:** 2026-09-24 · **Branch:** `main` · Baseline: `RELEASE-HARDENING.md`.
Gates are assessed separately and deliberately **not averaged**.

---

## GATE 1 — Deployable to Production: **BLOCKED**

The build is technically sound. The *deploy mechanism* is not.

| Evidence | Result |
|---|---|
| Backend `mvn test` | **BUILD SUCCESS** — 4,503 tests, 0 failures, 0 errors, 2 skipped |
| Frontend `vitest` | **2,400 / 2,400**, 90/90 files |
| Frontend `tsc --noEmit` | exit 0 |
| Frontend `eslint --max-warnings=0` | clean |
| Frontend production build | exit 0 |
| Migration chain | repo HEAD **V331**, applied cleanly against real Postgres 16 (`331\|t`) |

**Blocker — V316 checksum drift.** `V316` was rewritten by `e9730957` (2026-09-20, *"V316 never
applied — missing RLS tenant GUC + wrong id"*) **after** being deployed to prod on 2026-06-25, and
`application-prod.yml:105` sets `repair-on-migrate: false` while dev/default set `true`. Dev
self-heals, so the mismatch is invisible locally; prod will not, and Flyway validation can hard-fail
the next deploy — including the deploy that would carry the B1 fix.

**Could not be verified.** Railway CLI is authenticated (`fayaz30395@gmail.com`) but has **no linked
project**, and the Railway API returns `Unauthorized` for project-scoped calls — the token needs an
interactive browser re-login. I did not fake a pass. Marked BLOCKED.

---

## GATE 2 — Safe for Real Users: **FAIL**

Unit and integration evidence is strong. End-to-end and authorization evidence is not.

| Dimension | State | Evidence |
|---|---|---|
| Business logic | **PASS** | 4,503 backend tests green, incl. IDOR-scope, mass-assignment and payroll pre-flight guards |
| Date correctness | **PASS** | B1 fixed at the root; 17/17 across UTC-8 → UTC+14 |
| Type safety / lint | **PASS** | tsc 0, eslint clean |
| Public routes | **PASS** | `cred-free` 7/7 against live prod |
| **Authenticated E2E** | **BLOCKED** | 0 of ~2,886 executed |
| **RBAC (9 roles)** | **UNVERIFIED** | no RBAC assertion has ever executed |
| Routes covered end-to-end | **7 of 290** | 290 `page.tsx` routes exist; 7 verified |

**Why authenticated E2E is still blocked — and it is NOT what the earlier report assumed.**
Two distinct facts, both established this pass:

1. **Credentials are not the local blocker.** The local dev DB's demo accounts have
   `password_changed_at = 2026-09-21` — **3 days old, not expired**. The expiry seen earlier came
   from the *prod* target, where demo accounts are deliberately neutralised (V314 + `DEMO_CREDENTIALS_ENABLED=false`).
   Authenticated E2E against prod is therefore not merely blocked — it is *supposed* to fail.
2. **The local stack cannot serve it.** Port **8080 is held by an unrelated `node` process (PID 92233)**
   returning a PHP/Symfony 404, and the Spring backend (PID 93897) only ever bound **35729**
   (LiveReload) — it never acquired its HTTP port. Frontend :3000 is down. I did not kill another
   project's process to free the port; that is the operator's call.

So `V331` remains correct and validated, but it is **not** the thing standing between here and
authenticated E2E — a working local/CI stack is. Correcting that earlier framing matters, because
applying V331 alone would not have produced E2E signal.

Independently, the suite is still unfit as a mandatory gate for a second reason:
`.github/workflows/e2e.yml:209-212` records ~200 failures from redesign staleness and runs only
7 of 120 spec files.

**290 routes exist; 7 are verified end-to-end. That is not sufficient evidence to put real users on this.**

---

## GATE 3 — Operationally Hand-off Ready: **FAIL**

| Item | State | Note |
|---|---|---|
| CI verify-contract gate | **PASS** | wired into `pr-validation.yml`; self-tested: weak→exit 1, exempt→0, test-runner→0 |
| Secret-scanning pre-commit | **READY, NOT INSTALLED** | `scripts/security/pre-commit-secret-scan.sh`, one-line enable documented |
| Credential rotation | **FAIL** | 5 live credentials unrotated; see below |
| Encryption-key migration | **NOT STARTED** | design delivered; needs a ticket and engineering |
| Migration hygiene | **FAIL** | V316 drift unrepaired in prod |
| Known-defect register | **PASS** | B1–B8 recorded with root cause and evidence |
| Rollback procedure | **UNVERIFIED** | not exercised this pass |

### Credentials — corrected split

`MINIO_ROOT_PASSWORD` is **dead**: it appears only in `.env.example` files and docs marked
"legacy MinIO", and `application.yml:443` defaults storage to `google-drive`. So the same-day set
is **5, not 6**:

| Credential | Consumers | Rotation | Restart |
|---|---|---|---|
| Groq `OPENAI_API_KEY` | `start-backend.sh`, `application.yml:512` | provider console | redeploy |
| `NEON_*` (3) | datasource config | Neon console | redeploy |
| `SPRING_DATASOURCE_*` | datasource config | DB provider | redeploy |
| `JWT_SECRET` | `JwtTokenProvider`, `JwtSecretValidator`, `RateLimitingFilter` | env var | **forces global re-login** |
| `GRAFANA_ADMIN_PASSWORD` | monitoring compose | Grafana | restart monitoring |

`JwtTokenProvider` is **single-key** — no `kid`, no previous-key fallback — so rotation logs every
active session out. Unavoidable without new engineering; communicate before the deploy.

---

# HUMAN BOUNDARY — actions I cannot safely perform

### 1. Repair the V316 checksum in production

- **ACTION REQUIRED** — inspect prod `flyway_schema_history` and run `flyway repair` if V316's checksum differs from the repo.
- **WHY** — `repair-on-migrate: false` in prod means Flyway validation can hard-fail the next deploy. This gates *every* deploy, including the B1 fix.
- **WHY NOT AUTOMATABLE** — the Railway token is expired for project scope and re-auth is an interactive browser login. No read-only prod path is available to me.
- **EXACT OPERATION**
  ```sql
  -- read-only first
  SELECT version, description, checksum, success, installed_on
  FROM flyway_schema_history WHERE version = '316';
  ```
  Repo-side V316 is `backend/src/main/resources/db/migration/V316__fix_arun_manager_to_sumit.sql`
  (1,769 bytes). Compare against Flyway's own value via `flyway info` rather than a hand-computed
  CRC — my local reimplementation gave `-1987529629`, which is **indicative only** and should not be
  trusted over the tool.
  ```bash
  railway login          # interactive, browser
  railway link           # select nu-aura
  flyway repair          # ONLY if checksums differ and V316 is success=true
  ```
- **EXPECTED RESULT** — `flyway repair` realigns the stored checksum; no data is modified.
- **ROLLBACK / SAFETY** — `repair` rewrites only `flyway_schema_history` metadata, never application
  data. Take a snapshot first. If V316 shows `success = false`, **stop** — that is a different
  problem (a failed migration) and repair is not the right tool.

### 2. Rotate the five live credentials

- **WHY** — 7 credentials sat in git history reachable from ~85 refs across both remotes; all remain **UNKNOWN**.
- **WHY NOT AUTOMATABLE** — each lives in a provider console outside the repo. Rotating is irreversible and outward-facing.
- **EXPECTED RESULT** — leaked values become inert; history purge then becomes unnecessary (rotate-only is the recommendation; the ~85-ref/2-remote force-push is not justified once values are dead).
- **ROLLBACK / SAFETY** — `JWT_SECRET` rotation ends every session; announce first. Rotate datasource credentials in a maintenance window.

### 3. `APP_SECURITY_ENCRYPTION_KEY` — DO NOT ROTATE

- **ACTION REQUIRED** — open a dedicated security/data-migration ticket. Do **not** change the env var.
- **WHY NOT AUTOMATABLE** — `EncryptedStringConverter` resolves exactly one key, with no version marker in the stored `Base64(IV):Base64(ct+tag)` format. Changing the value makes every encrypted column **permanently undecryptable** — a self-inflicted data loss worse than the exposure.
- **AFFECTED DATA** — `employees` (bank name/IFSC), `users.mfa_secret`, `benefit_dependents` (national ID, passport, phone, email, DOB), `benefit_claims` (bank details), `tax_declarations`, `employee_pf_records` (UAN), `employee_esi_records` (ESI), `preboarding_candidates`, `candidates`, `payment_transactions`, `payment_config`, `webhooks`, `integration_connector_config`.
- **REQUIRED SEQUENCE** — dual-key converter (current key for encrypt, previous key as decrypt fallback) → stage both keys → re-encryption backfill extending `EncryptionBackfillService` (which already round-trips entities through the converter via `.save()`) → verify zero rows remain on the old key → retire the old key.
- **PROOF REQUIRED BEFORE RETIREMENT** — a per-table row count decryptable under the new key equal to the total, and a test asserting that a value encrypted with the old key still decrypts through the fallback path.
- **ROLLBACK / SAFETY** — keep the old key until the verification count is exactly 100%. Retiring it early is unrecoverable.

### 4. Free port 8080 / stand up a local or CI stack for authenticated E2E

- **WHY NOT AUTOMATABLE** — PID 92233 belongs to another project; killing it is the operator's decision.

---

## Metrics

| Metric | Value |
|---|---|
| Total tests executed | **6,903** (backend 4,503 + frontend 2,400) |
| Passed | **6,901** |
| Failed / errored | **0** |
| Skipped | **2** |
| Meaningful E2E executed | **7** (credential-free, live prod) |
| E2E specs existing / executed | 121 / 1 file |
| Routes verified end-to-end | **7 of 290** |
| RBAC role coverage | **0 of 9 verified** |
| Story verification coverage | **1 of 180** runs a test runner (A); 67 B, 99 Bb, 3 C, 10 exempt |
| Open P0 | **0** |
| Open P1 | **1** — V316 deploy gate |
| Open P2 | **2** — credential rotation; encryption-key migration |
| Open P3 | **2** — authenticated E2E environment; E2E staleness backlog (~200) |
| Open P4 | **1** — 102-story verify-contract backlog |

## The three statements, kept separate

- **"The software is technically working."** — **TRUE, with evidence.** 6,901/6,903 green, build
  clean, four real defects found and fixed at root cause.
- **"The software is safe to deploy."** — **NO.** V316 can fail the deploy itself, and 5 credentials
  remain unrotated.
- **"The product is ready to hand over to real users."** — **NO, and this is the widest gap.**
  7 of 290 routes verified end-to-end and 0 of 9 RBAC roles exercised. Green unit suites say the
  code does what its authors believed; they do not say a user can log in and do their job safely.

**Overall: NO-GO.** Not because the software is broken — it demonstrably is not — but because
deployability, credential hygiene and user-facing evidence are each independently short.
