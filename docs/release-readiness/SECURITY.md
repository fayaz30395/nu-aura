# NU-AURA Security Assessment — Workstream A

Generated 2026-09-22, against branch `release-readiness/verified-fixes` (base `30e58a4a`).
All findings below are freshly reproduced this pass — nothing carried forward from historical
docs without live/code revalidation, per Rule 1.

## A1 — Authentication: VERIFIED (PASS)

| Check | Result | Evidence |
|---|---|---|
| Cookie flags | PASS | Live `Set-Cookie` inspection: `access_token`/`refresh_token` HttpOnly+SameSite=Lax (Secure gated by `app.cookie.secure`, correctly off on local HTTP dev); `__Host-hrms-access`/`__Host-hrms-refresh` HttpOnly+Secure+SameSite=Lax unconditionally (code forces Secure on `__Host-` regardless of config — required for the browser to accept the prefix at all); `XSRF-TOKEN` correctly non-HttpOnly (JS must read it for double-submit) + SameSite=Strict. |
| CSRF | PASS | Re-confirmed live: mutating request without `X-XSRF-TOKEN` → 403. |
| Rate limiting | PASS | 5/min on `/auth/login`, confirmed in this session's earlier work; not re-burst-tested this pass to avoid re-triggering the lockout window during live regression testing. |
| Tampered JWT | PASS | Valid token → 200; same token with 1 char flipped in the signature → 401; no token → 401. |
| Password reset enumeration | PASS | `POST /auth/forgot-password` returns byte-identical response for an existing vs nonexistent email (`{"message":"If an account exists..."}`), 200 both times. No `authProvider` field leaked (matches this session's earlier faylo fix `US-2G08K1MZJEP4`, now regression-confirmed live). |
| Disabled-user login | PASS | Live: a `status=INACTIVE` test account → 401 `"User is disabled"`, not silently allowed. |
| Logout / token revocation | PASS (code-verified) | `AuthController.logout` calls `tokenProvider.revokeToken()` on both access and refresh tokens (real server-side revocation, not client-cookie-clear-only), and clears both legacy and `__Host-` cookie name variants. |
| CORS | PASS (code-verified) | `SecurityConfig.corsConfigurationSource()` throws at startup if allowed-origins is empty or contains `*` — fail-closed by construction. Explicit method/header allowlists, no wildcard headers. |

## A2 — Effective RBAC: VERIFIED, 3 REAL DEFECTS FOUND

Authorization is confirmed DB-driven (`role_permissions` table), not `RoleHierarchy.java` — this
session's earlier R3/R7 work already established this; re-confirmed via direct query this pass:

```
SUPER_ADMIN 395 · HR_ADMIN 315 · TENANT_ADMIN 183 · HR_MANAGER 182 · RECRUITMENT_ADMIN 95
MANAGER 81 · TEAM_LEAD 79 · EMPLOYEE 57 · PAYROLL_ADMIN 42 · FINANCE_ADMIN 23
```

(EMPLOYEE=57, up from a pre-R3 baseline of 55 — the two new `COMPLIANCE:VIEW_SELF`/
`COMPLIANCE:ACKNOWLEDGE` grants are present in the DB, confirming R3's migration is live.)

**IDOR sweep** — sampled 12 `employeeId`-scoped endpoints beyond what R3 already covered
(employees/leave/compliance), live as `arun@nulogic.io` (EMPLOYEE) against another employee's ID:

| Endpoint | Result | Note |
|---|---|---|
| `GET /statutory/esi/employee/{id}` | 403 | Correctly gated |
| `GET /assets/employee/{id}` | 403 | Correctly gated |
| `GET /tax-declarations/employee/{id}` | 403 | Correctly gated |
| `GET /statutory/pf/employee/{id}` | 403 | Correctly gated |
| `GET /letters/employee/{id}` | 403 | Correctly gated |
| `GET /reviews/employee/{id}` | **200** | **FAIL — real IDOR** |
| `GET /expenses/mileage/employee/{id}` | **200** | **FAIL — real IDOR** |
| `GET /contracts/employee/{id}` | **200** | **FAIL — real IDOR** |
| `GET /offboarding/employee/{id}` | 400 | Inconclusive — business-logic response ("no exit process found"), not tested further |
| `GET /meetings/employee/{id}` | 404 | Inconclusive — likely wrong route guessed, not re-verified |

**FINDING — Medium severity, 3 confirmed instances, same root pattern as the compliance IDOR
fixed in R3:**

- `PerformanceReviewService.getEmployeeReviews(employeeId)` / `getEmployeeReviewsPaged` —
  `backend/src/main/java/com/nulogic/application/performance/service/PerformanceReviewService.java:197,205`
  — takes raw `employeeId`, zero self-check, zero scope filter. The class already has the right
  tool available one method up (`dataScopeService.getScopeSpecification(Permission.REVIEW_VIEW)`,
  line 191) — this method just doesn't use it.
- `MileageService.getEmployeeMileageLogs(employeeId, pageable)` —
  `backend/src/main/java/com/nulogic/application/expense/service/MileageService.java:216` — same gap.
- `ContractService.getEmployeeContracts(employeeId, pageable)` —
  `backend/src/main/java/com/nulogic/application/contract/service/ContractService.java:224` — same gap.

All three currently return **empty results** in this tenant's data (no seeded review/mileage/
contract rows for the tested employee), so there is **no live data leak demonstrated today** —
but the authorization gap is real and structural: any EMPLOYEE holding the broad `REVIEW_VIEW`/
equivalent permission can enumerate any other employee's data the moment rows exist. Not fixed
in this pass — flagged as **P1** (see checkpoint). Fix pattern is small and already established
(mirror R3's `assertSelfOrFullView`).

## A3 — Demo credentials: VERIFIED, HIGH-SEVERITY OPERATIONAL RISK CONFIRMED

Read `V312__seed_demo_finance_admin_user.sql` and `V314__reneutralize_demo_credentials_after_v312.sql`
in full, plus a full-codebase grep for `demoCredentialsEnabled`/`DEMO_CREDENTIALS_ENABLED`:

- V312 unconditionally seeds `finance@nulogic.io`, `ACTIVE`, with a known "Welcome@123" bcrypt hash.
- V314 re-locks every account matching one of 3 known-weak password hashes (Welcome@123 variants)
  — but **only when `${demoCredentialsEnabled}` resolves to `false` at the moment V314 executes**.
- **`grep -rn "demoCredentialsEnabled" backend/src/main/java` → zero hits outside one comment.**
  There is no runtime Java code path that checks this flag. It exists exclusively as a Flyway
  placeholder substituted into migration SQL at migration-apply time.

**This means:** `DEMO_CREDENTIALS_ENABLED=false` is safe **only** on a fresh database where V314
executes with the flag already false. On an **already-running** deployment that had the flag true
at any point in its migration history (e.g. an initial demo/staging deploy), flipping the env var
later and redeploying does **nothing** — Flyway will not re-run V314 (already recorded successful
in `flyway_schema_history`), and the demo accounts stay permanently `ACTIVE` with a public,
guessable password regardless of the current flag value. There is no live/runtime safety net.

Verified locally: `finance@nulogic.io` is `ACTIVE`, not locked (`is_locked=false`) on this dev DB,
consistent with V314 having run here with the flag true (dev default) — confirms the no-op path
works as documented, but doesn't by itself prove the lock path works (not tested against a
flag=false migration run in this pass — would require a fresh DB, out of scope here).

**Status: NOT rotating/flipping anything.** This is a process/deployment-procedure finding, not
a code bug — flagging as **HIGH**, needs an explicit operational decision (see checkpoint).

## A4 — Secret scan: TWO CONFIRMED HISTORICAL EXPOSURES, BOTH STILL LIVE IN HISTORY

No secret values printed below or logged anywhere.

1. **`NEON_DB_PASSWORD`** — a `.env` file was committed to `main` at `24a6c4c7` (2026-03-20) and
   deleted at `ede44ab0` (2026-04-02). Currently untracked and gitignored (`.env` is in
   `.gitignore`), but git history retains the full file — `git show 24a6c4c7:.env` still returns
   the value. **Rotation status: unknown, not my call — needs owner confirmation.**
2. **Groq API key (`gsk_ryq7hgo9...`)** — committed in full at `83f70807` (`backend/start-backend.sh`,
   2026-03-16), neutralized (emptied) at `fb465678`. Confirmed **currently reachable**: `git
   merge-base --is-ancestor 83f70807 main` → yes, from today's HEAD `30e58a4a`. This exact
   finding already appears in this repo's own historical `docs/qa` audit trail multiple times
   (flagged HIGH/CRITICAL, "owner must rotate at console.groq.com") — re-confirmed current and
   **still unremediated** as of this pass. **Not rotating it myself, not rewriting history** —
   both explicitly out of scope per instruction; this needs the account owner.

No other credential patterns (AWS `AKIA`, generic `sk-`, SMTP passwords, JWT signing secrets)
found via targeted history search this pass — scan was NOT exhaustive (full `-p` history dump
across all 1893 commits timed out; used targeted pickaxe searches on `main` only instead of
`--all` across every remote/dependabot branch, which would 10x the search graph for low
incremental signal). A full `gitleaks`/`trufflehog` pass would be more thorough than this manual
sweep — recommended as a follow-up tool, not performed here.

## A4-followup — Phase 2 remediation pass (2026-09-22)

**Current-codebase state: CLEAN.** Re-verified this pass:
- `git merge-base --is-ancestor 83f70807 HEAD` → yes; `git merge-base --is-ancestor 24a6c4c7 HEAD`
  → yes. Both bad commits still reachable from current `HEAD` — history exposure unchanged.
- `backend/start-backend.sh` (current working tree): no `gsk_` pattern present — confirms the
  `fb465678` neutralization holds today.
- Full tracked-source grep (`.java`/`.yml`/`.sh`/`.properties`, repo-wide) for `gsk_[A-Za-z0-9]`
  or a literal `NEON_DB_PASSWORD=` assignment: zero matches. No hardcoded credential in the
  current codebase for either secret.
- Groq/OpenAI-compatible key is config-only: `application.yml` reads `${OPENAI_API_KEY:}`
  (empty default), never a literal. No `GROQ_API_KEY`-named variable exists in the app — Groq is
  reached via the OpenAI-compatible `base-url` override.

**New finding, fixed this pass:** untracked `.env.bak2` / `.env.bak3` exist in repo root, not
matched by any existing `.env*` `.gitignore` pattern — `git add -A` would have staged them.
Contents were NOT inspected (this environment's sandbox denies read/grep access to these two
paths outright, regardless of operation — a hard deny, not a choice made here). Fixed by adding
`.env.bak*` to `.gitignore` (commit `9c0af1b3`). **Operator must inspect and rotate/delete these
two files directly** — their content is unknown from this pass.

**History-cleaning procedure — prepared, NOT executed** (per instruction: no history rewrite of a
shared branch without prior approval; no push regardless, SSH unavailable here):

```bash
# Removes .env and .env.production from ALL history on this local clone.
# Rewrites every commit SHA after 24a6c4c7 / 6b348f80 — DESTRUCTIVE to shared history.
# Requires: git-filter-repo (brew install git-filter-repo)
git filter-repo --path .env --path .env.production --invert-paths --force

# After running: every collaborator must re-clone (rebasing onto rewritten history
# does not work cleanly). A force-push to origin/main would be required to publish
# the rewrite -- NOT done here (no push authorization, SSH unavailable in this
# environment regardless).
```

This has **not** been run. Rewriting `main`'s history is a shared-branch action requiring explicit
owner approval per the stop conditions in this task — flagging the exact command rather than
guessing consent.

**Rotation status: OPERATOR ACTION REQUIRED for both credentials** — rotating a live Neon DB
password or a live Groq API key requires access to the Neon console / console.groq.com, which
this environment does not have. Current codebase already reads both from environment variables
(no code change needed once rotated) — `NEON_JDBC_URL`/`NEON_DB_USERNAME`/`NEON_DB_PASSWORD` and
`OPENAI_API_KEY` are all externally injected, confirmed via `application*.yml` above.

## A4-followup-2 — history purge readiness (2026-09-22, closure pass)

**Scope is far wider than "this local clone".** `24a6c4c7` is reachable from `refs/heads/main`,
both configured remotes' `main`/`master` (`fayaz-deen`, `fayaz30395`), and every one of ~60
`dependabot/*` remote branches on both remotes — confirmed by walking every local+remote ref with
`git merge-base --is-ancestor 24a6c4c7 <ref>`. This means the exposure is **already live on
GitHub**, not just locally. A `git filter-repo` run in this clone only rewrites this clone's
objects; it does nothing to the exposure until force-pushed to both remotes, and even then GitHub
retains unreferenced objects for a retention window and any existing fork/PR ref keeps the old
blob reachable. A true purge requires: rewriting locally, force-pushing `main` to both remotes,
closing/rebasing every dependabot branch (or letting Dependabot regenerate them), and — for full
remediation — a GitHub support request to purge cached views of the removed commits. None of that
is "safe to execute locally" in isolation; it is a coordinated, multi-remote, approval-gated
operation.

Exact paths confirmed by direct commit inspection this pass:
- `24a6c4c7` — `.env` (3 lines added), commit `git show --stat 24a6c4c7 -- .env` confirms.
- `83f70807` — `backend/start-backend.sh`, confirmed via `git show --name-only 83f70807`.

Both match the procedure already documented above. Working tree at time of this check: clean
(only an unrelated `faylo-sdlc/.ledger/events.jsonl` modification, not part of this remediation).

### HISTORY PURGE READINESS
- Prepared: YES (exact `git filter-repo` command documented above, paths re-confirmed this pass)
- Safe to execute locally: YES, as a **local-only** rewrite (produces a rewritten clone state) —
  but that rewrite has **no remediation effect** until force-pushed, and force-pushing is NOT safe
  without explicit approval (rewrites shared `main` history on two remotes and orphans ~60
  dependabot branches)
- Shared remote branch affected: **YES** — `main` on both `fayaz-deen` and `fayaz30395` remotes,
  plus every dependabot branch on both, all currently contain both exposed commits
- Explicit approval required before rewrite: YES
- Exact command/procedure: see `git filter-repo --path .env --path backend/start-backend.sh
  --invert-paths --force` variant above; note the original procedure listed `.env.production` as a
  second path — re-scoped here to the two paths actually confirmed to hold the secrets
  (`.env`, `backend/start-backend.sh`), since `.env.production`'s commits were not re-verified to
  contain either of these two specific credentials this pass.

## A5 — Regression: PASS

Re-verified live on this session's freshly-restarted backend (not reusing pre-restart state):

- R3: `GET /compliance/policies/active` as EMPLOYEE → 200; cross-employee acknowledgment read → 403.
- R2a: HR_ADMIN (`admin@nulogic.io`) applied+approved a fresh leave request for `arun` without
  being his manager → 200 APPROVED.
- R7: Tenant B admin login → 200, `roles:[TENANT_ADMIN]`, 188 permissions resolved (DB-driven,
  confirms the `role_permissions` seeding fix still holds after restart).

---

## Summary

| Area | Status |
|---|---|
| A1 Authentication | PASS |
| A2 Effective RBAC | PASS overall; **3 confirmed P1 IDOR gaps** (reviews/mileage/contracts) |
| A3 Demo credentials | **HIGH operational risk** — flag is migration-time-only, no runtime gate |
| A4 Secrets | **2 confirmed historical exposures**, both still live in git history, neither rotated (unknown) nor purged |
| A5 Regression | PASS |
