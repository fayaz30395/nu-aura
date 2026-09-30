# Full Application Verification — Release Readiness

**Date:** 2026-09-24 · **Branch:** `main` @ `2b4832cb` · **Strategy owner:** verification pass, agent-designed
**Scope:** whole application, not only suspect stories. Faylo used as control plane; no human gate bypassed.

---

## Executive result

| Measure | Value |
|---|---|
| Stories in ledger | 180 (179 Done, 1 Draft) |
| Backend tests executed | **4,503** — 5 failures, 16 errors, 2 skipped, `BUILD FAILURE` |
| Frontend tests executed | **2,394** — 1 failure, 89/90 files pass |
| Frontend lint | clean (`--max-warnings=0`) |
| Frontend production build | **exit 0** once `NEXT_PUBLIC_API_URL` supplied |
| Backend compile | exit 0 |
| E2E (2,886) | **0 executed** — blocked before first test |
| Genuine PRODUCT failures | **4 distinct** (see below) |
| Environment/infra failures | 15 of 21 backend errors + all E2E |
| Security blockers | **7 credentials, status UNKNOWN**, live in history on ~85 refs |
| Human-only blockers | 6 open Faylo decisions |

**Release verdict: NO-GO.** Not because the application is broadly broken — functionally it is in
better shape than the ledger's weak `Verify:` lines could ever have demonstrated — but because
(a) a high-impact date defect affects 152 files, (b) credential exposure is unremediated and
larger than the tracked decisions describe, and (c) the E2E gate produces zero signal.

---

## Critical product failures

### P1 — `formatDate` renders every date-only value one day early west of UTC
- **Where:** `frontend/lib/utils/format/date.ts:7-19`
- **Cause:** `toDate()` calls `new Date('2026-05-15')`. ECMAScript parses a date-only ISO string as
  **UTC midnight**; `format()` then renders in local time. At UTC-3 this yields `May 14, 2026`.
- **Reproduction:** `cd frontend && npm run test:run` → `lib/utils/format/__tests__/date.test.ts`
  `expected 'May 14, 2026' to be 'May 15, 2026'`. Machine TZ `-0300`.
- **Contract violated:** the function's own docstring states `formatDate('2026-05-15') // → 'May 15, 2026'`.
- **Blast radius:** `formatDate` is imported by **152 app/component files** — leave dates, payslips,
  attendance, contracts, audit logs.
- **Severity: HIGH.** NU-AURA is an explicitly distributed-workforce product. Passes in UTC CI,
  fails for every user in the Americas. This is the highest-value finding of the pass.

### P2 — `WikiPageControllerTest` has been dead; 12 wiki tests never run
- **Cause:** `Error creating bean with name 'wikiPageController': Unsatisfied dependency expressed
  through constructor parameter 1: No qualifying bean of type 'WikiSpaceService'`. A story added a
  constructor dependency without updating the `@WebMvcTest` slice.
- **Effect:** context fails once, then `ApplicationContext failure threshold (1) exceeded` cascades
  to all 12 tests. Production code is fine; the **test coverage is fictional**.
- Directly relevant to `US-2G00S161WERF` (wiki Save Draft), which therefore has no passing controller test.
- **Severity: MEDIUM** (coverage loss, not runtime break).

### P3 — Three ArchUnit layering violations in committed code
- `EmployeeDocumentController` and `FileUploadController` inject and call repositories directly
  (`EmployeeDocumentController.java:81,135,152`, `FileUploadController.java:257`), breaching
  "Controllers must access data through Services".
- `PaymentGatewayService`, `SmsService` reside outside `..application..`.
- Traceable to the employee-document stories. **Severity: MEDIUM** (architecture debt, enforced by a test that now fails the build).

### P4 — `GoalRequestTest.acceptsValidRequest` contradicts shipped validation
- Validation added by `US-2FZSWHXP80HH` now requires `employeeId`, `title`, `goalType`; the
  pre-existing test still asserts a request without them yields **no** violations.
- Either the test is stale or the validation is stricter than intended — **needs a human call**.
- Plus `OnboardingManagementControllerTest.shouldUpdateProcessStatus` — `No value at JSON path "$.status"`.
- **Severity: MEDIUM.**

---

## False failures (environment, not product)

- **14 of 16 backend errors are cascading/environmental**, not independent defects: 12 from the single
  WikiPageController context failure, 2 from `DocumentExpirySchedulerTest` failing to bind
  `RedisProperties` (Redis is UP on 6379 — a config-binding issue, not a missing service).
- **Frontend production build "failure"** was `NEXT_PUBLIC_API_URL is required` from
  `validate-release-env.mjs` — the guard working as designed. Build exits 0 when supplied.
- **All 9 RBAC P0s** — expired demo passwords, no RBAC assertion ever executed.
- **Entire E2E suite** — see below.
- **Note:** the suite ran on **Java 23.0.2** while the project targets **Java 21**. Worth aligning before
  treating any backend result as CI-equivalent.

---

## False / weak passes

An earlier concurrent sweep reported 32 story-verify failures. **All 32 were contention timeouts**, not
defects — solo, `tsc --noEmit` exits 0 (0 errors, 74s) and `mvn -DskipTests compile` exits 0 (44s).
Every one of the 28 distinct verify commands passes.

But passing proves little. Evidence distribution across 180 stories, independently recomputed:

| Grade | Count | What the command actually proves |
|---|---|---|
| A | 81 | real test/compile+test exercises the AC |
| B | 24 | typecheck/static, and compilation genuinely suffices |
| Bb | 62 | typecheck/static only, but the AC is **behavioural** — unproven |
| C | 13 | `true`, manual, or no meaningful evidence |

- **72 stories** verify with `npx tsc --noEmit` alone — it cannot validate "button has no onClick".
- **11 stories** verify with the literal command `true`. 10 are `Decide:` records where that is
  defensible; `US-2FZ92MRRMTV6` (hard-gate PSA data backfill) is not.
- **No story-level `Verify:` line runs the test suites.** That is why 4,503 backend tests and 2,394
  frontend tests had never gated a single story, and why P1–P4 went undetected.
- Ledger telemetry corroborates: **222 reviews, zero `fail` verdicts**; 119 have empty Findings.
  Rework rate at implementation stage: **0.0%** across 180 stories.
- Reconciliation: **22 stories** carry weak evidence *and* no informative review — the true dark zone.
  145 of 180 do have an informative review, so this is narrower than "all review was rubber-stamping".

---

## E2E — exact state

**0 of ~2,886 tests execute.** `playwright.config.ts` defines 5 projects, all declaring
`dependencies: ['setup']`; `e2e/auth.setup.ts` logs in with the shared demo password
(`e2e/fixtures/testData.ts:7`). That password is expired, so setup fails and Playwright refuses every
dependent project — a single fixture failure, not 2,886 independent ones. Deterministic (stored
account state, not flake). External services are not a suite-wide dependency.

**Real partial evidence obtained:** the credential-free public-route block of
`production-readiness.production.spec.ts` ran twice against live prod — **5/5 passed both times**,
no console or 5xx errors.

**CI would not hit this blocker** (fresh ephemeral seed each run), but `.github/workflows/e2e.yml:209-212`
states in its own comments: *"The full 107-spec functional suite has ~200 failing tests from redesign
staleness and is not yet safe to gate PRs on"*, and the workflow runs only 7 of 120 spec files.

**Fit as a mandatory gate: NO**, on two independent grounds — credentials, then a maintainer-documented
~200-failure staleness backlog.

---

## Security

Materially larger than the two tracked decisions describe. **Two incidents, not one:**

- **Incident A — Groq/OpenAI key** in `backend/start-backend.sh` from `83f70807`. HEAD is now clean
  (empty default). Still in history.
- **Incident B — root `.env` committed**, `24a6c4c7` → `ede44ab0`, ~13 days live, containing
  Neon DB credentials, Spring datasource credentials, **`JWT_SECRET`**, **`APP_SECURITY_ENCRYPTION_KEY`**
  (the AES-256-GCM key), and `MINIO_ROOT_PASSWORD`.

**No Faylo decision covers Incident B.** `DC-2G4FXH8D0V2Q` tracks only the Groq key and its premise
("current code clean") is accurate for HEAD but misleading as posture — history is untouched.

All 7 credentials classify as **UNKNOWN**, not remediated. `git branch --all --contains` returns
**85 refs** — effectively every branch on both remotes carries the history. Private-repo access
control is the only current mitigant.

**Reviewed clean, no action:** SecurityConfig (explicit permitAll allow-list, CSRF double-submit,
constant-time Prometheus token, fail-closed CORS, BCrypt cost 12), RLS (`set_config` parameterized in
all 6 sites, `@SQLRestriction` on 222 entities), credential logging (60 call sites, none log values),
`DEMO_CREDENTIALS_ENABLED` (fail-closed across 7 migrations + runtime check at `AuthService.java:284`),
compose/k8s manifests (no literal defaults).

**Disclosure:** during history investigation one unredacted `grep` printed the historical Groq key
value into this session's raw transcript. Contained immediately, not repeated in any report. Rotate
that key regardless, and treat the session transcript as sensitive.

---

## Data / migrations

- **True Flyway HEAD is `V330`**, not V316 — project memory is 14 migrations stale.
- No duplicate versions, no gaps. Destructive operations all guarded.
- **Checksum drift — this is a DEPLOYMENT BLOCKER, not just hygiene.** `V316` was rewritten 3 times,
  most recently `e9730957` (2026-09-20, *"V316 never applied — missing RLS tenant GUC + wrong id"*),
  **after** it was already deployed to prod on 2026-06-25. Decisive detail:

  | Profile | `repair-on-migrate` |
  |---|---|
  | `application.yml` (default) | `true` |
  | `application-dev.yml:91` | `true` |
  | **`application-prod.yml:105`** | **`false`** |

  Dev auto-heals the checksum mismatch, so this is invisible locally. **Prod will not.** The next
  deploy can hard-fail on Flyway checksum validation for V316. Verify prod's `flyway_schema_history`
  and run `flyway repair` before the next deploy. `V312` has the same edit-after-apply pattern.
- **Demo password expiry — root cause is now arithmetic, not inference.** The last bulk reset was
  `V121`/`V122` at commit `601c89d3`, **2026-04-08 — 169 days before this run**, against a 90-day
  `PasswordPolicyConfig.maxAgeDays`. Expiry was therefore certain, not incidental.
  Column: `users.password_changed_at` (`V0__init.sql:107`), enforced `AuthService.java:290-296`.
- **Fix (not executed):** new migration `V331__refresh_demo_password_expiry.sql` —
  `UPDATE users SET password_changed_at = NOW() WHERE email LIKE '%@nulogic.io'`. Matches the
  V121/V122 precedent, versioned, and touches only the expiry column, never the hash.
- **The admin endpoint is not a viable escape hatch:** `SystemAdminController` `/admin/users/reset-password`
  requires an already-authenticated SuperAdmin — and that account's password is expired too. Circular.
- Offline validation does exist: `AbstractPostgresIntegrationTest` runs the full Flyway chain against
  Testcontainers `postgres:16-alpine` on every integration test.

---

## Release state by area

| Area | State | Basis |
|---|---|---|
| Functional — backend | **CONDITIONAL** | 4,503 tests, 4,482 pass; 4 real defect clusters |
| Functional — frontend | **FAIL** | P1 date defect across 152 files |
| Integration | **PARTIAL** | backend integration tests pass (IDOR, mass-assignment, webhooks) |
| E2E | **BLOCKED** | 0/2,886 executed |
| Security | **FAIL** | 7 credentials UNKNOWN, history exposed on ~85 refs |
| Data / DB | **CONDITIONAL** | chain clean at V330; V316 checksum drift can fail the next prod deploy (`repair-on-migrate: false`) |
| Deployment | **AT RISK** | build exit 0 and prod healthy, but V316 checksum mismatch is unrepaired in prod |
| Evidence quality | **FAIL** | 75 of 180 stories at Bb/C; no story gate runs any test suite |
