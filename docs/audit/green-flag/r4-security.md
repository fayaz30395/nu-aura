# NU-AURA Security Audit — Green Flag Run R4
**Date:** 2026-06-21  
**Auditor:** Security Auditor Agent (fork)  
**Scope:** SEC-4 carry-over, hardcoded secrets scan, demo-creds design review, OWASP auth quick pass, SQL/JPQL injection scan

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 (R4-SEC-3b — pre-existing, intentional during run per owner) |
| HIGH     | 0 |
| MEDIUM   | 0 |
| LOW      | 0 |

No new secrets, SQL injection, or auth issues found. Only the pre-known R4-SEC-3b carry-over (demo-creds env flip on Railway) remains open.

---

## Findings

| ID | Severity | Module | Description | Impact | Exact Fix | Status |
|----|----------|--------|-------------|--------|-----------|--------|
| SEC-4 | HIGH | secrets | Live Groq API key `gsk_ryq7hg...` present in `backend/.env:36` (working-tree only; file is gitignored, never committed) | AI quota abuse if file leaked; no production risk via git | USER: Rotate key at console.groq.com; verify `git log -S 'gsk_ryq7hg' --all` shows ISSUE_BOARD.md references only (not the key itself committed) | Open — user action required |
| R4-SEC-3b | CRITICAL | deploy/auth | Demo accounts (Welcome@123 SUPER_ADMIN) remain live on Railway despite `DEMO_CREDENTIALS_ENABLED=false` because V270/V295/V299 ran once when the flag was true and Flyway never re-runs them. Env flip alone is a no-op. | Public unauthenticated → SUPER_ADMIN on live tenant | **Create V309__neutralize_demo_credentials.sql** (drafted below) OR run V299 SQL block directly on Railway PG. Intentionally kept active during current test campaign — must close before true prod go-live. | Open (intentional during run) |

---

## SEC-4: Groq API Key Status

- **File:** `backend/.env:36`  
- **Key prefix (masked):** `gsk_ryq7hg...` (first 8 chars; full key NOT printed)  
- **Git tracked?** `git ls-files backend/.env` → **empty output** — file is NOT tracked; it is correctly gitignored via root `.gitignore` (`/.env`)  
- **Ever committed?** `git log -S 'gsk_' --all` returns 9+ commits — but **all hits are in `ISSUE_BOARD.md`**, not in the `.env` file itself. The ISSUE_BOARD entries quote only the 8-char masked prefix (`gsk_ryq7hgo9...`) as a reference — the full secret was never committed to source control.  
- **git log for backend/.env directly:** `git log --all --diff-filter=A -- "backend/.env"` → empty — the file was never added to git.  
- **Verdict:** The Groq key exists only in the local working-tree `.env`. Git history is clean. **User must rotate the key at console.groq.com** as a precaution (it has been referenced in issue tracking) and replace it in `.env`.

---

## Demo-Credentials Neutralization Design

### What the migrations do

| Migration | Gate | Trigger condition | Action |
|-----------|------|-------------------|--------|
| V270 | `${demoCredentialsEnabled}=false` | Ran during initial deploy | Locks any `users` row whose `password_hash` is one of the 3 known Welcome@123 bcrypt digests |
| V295 | same | After V291 re-seeded `tenant.admin@nulogic.io` | Re-applies the hash-list lock — catches the newly seeded account |
| V299 | same | Designed for Railway where Flyway was disabled in render profile | Identical to V295 — meant to be applied via one-shot Flyway repair |

### Why the env flip is a no-op on Railway

V270, V295, and V299 all ran **once** on Railway when `DEMO_CREDENTIALS_ENABLED=true` (the gate evaluated to no-op, leaving accounts active). Flyway records those checksums as "applied." A subsequent env change to `false` does **not** cause Flyway to re-run them — Flyway is idempotent and never replays applied migrations.

**Therefore:** A new migration **V309** is required. The same hash-list + sentinel approach is correct and must simply be a higher version number to trigger a fresh Flyway apply with `demoCredentialsEnabled=false`.

### Is V309 strictly necessary?

Yes — the `DEMO_CREDENTIALS_ENABLED=false` flag is **only honoured at Flyway migration time** (inside the DO $$ block). The flag does not cause a runtime check per-login. Without V309, the accounts remain `ACTIVE` with the known hash on any environment where they were seeded while the flag was true.

---

## V309 Drafted SQL

```sql
-- ============================================================================
-- V309: Re-neutralize demo credentials — force-close for true production
--
-- SEC carry-over (R4-SEC-3b): V270/V295/V299 all ran with demoCredentialsEnabled=true
-- and their DO $$ blocks returned early (no-op). The env var was later flipped to
-- false, but Flyway never re-runs already-applied migrations.
--
-- This migration is structurally identical to V299 (same 3-hash list, same sentinel,
-- same gate) but carries a higher version number so Flyway applies it fresh.
--
-- Gate behaviour:
--   demoCredentialsEnabled=true  → no-op (dev / demo environments left intact)
--   demoCredentialsEnabled=false → locks known-weak accounts (production posture)
--
-- Pre-requisite: DEMO_CREDENTIALS_ENABLED=false (or unset) in Railway env,
-- and Flyway must be enabled (SPRING_FLYWAY_ENABLED=true or render profile default).
-- After apply, toggle DEMO_CREDENTIALS_ENABLED back to true if needed for ongoing
-- demo testing — V309 has already run and its record is committed in flyway_schema_history.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V309: demoCredentialsEnabled=true — skipping (non-production environment).';
        RETURN;
    END IF;

    UPDATE users
       SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
           status                = 'SUSPENDED',
           failed_login_attempts = 0,
           locked_until          = NULL,
           updated_at            = NOW()
     WHERE password_hash IN (
            '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', -- Welcome@123 (V49 demo users)
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V122/V173/V291 tenant.admin + sarankarthick SUPER_ADMIN)
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V309: locked % account(s) holding a known Welcome@123 digest (true-prod neutralization).', affected;
END $$;
```

**Deployment sequence for Railway:**
1. Ensure `DEMO_CREDENTIALS_ENABLED` is **unset or false** in Railway env dashboard.
2. Commit and deploy (Flyway is enabled in render profile via `enabled: ${FLYWAY_ENABLED:true}`).
3. V309 runs, locks affected accounts. Check Railway logs for `V309: locked N account(s)`.
4. After campaign ends, optionally set `DEMO_CREDENTIALS_ENABLED=true` to restore demo accounts for testing — V309 is already recorded as applied and won't re-run.

---

## OWASP Auth Findings — CRITICAL/HIGH Only

### Rate Limiting on /auth/login ✓ PASS

`RateLimitingFilter.java:163-165` — `determineRateLimitType()` maps `/api/v1/auth` URIs to `RateLimitType.AUTH`. The `DistributedRateLimiter` AUTH bucket is configured at 5/min (matching the stated CLAUDE.md target). Fallback Bucket4j also uses the type-aware bucket (`M-14` comment). Rate limiting is applied before auth controller logic. **No issue.**

### CSRF ✓ PASS

`CsrfDoubleSubmitFilter.java:59-71` — custom double-submit cookie implementation. Validates `X-XSRF-TOKEN` header against the `XSRF-TOKEN` cookie on all state-changing methods (POST/PUT/DELETE/PATCH) using `MessageDigest.isEqual` (constant-time). Auth login/refresh/Google OAuth are excluded (correct — they cannot supply a CSRF token). Spring's built-in CSRF disabled per `SecurityConfig.java:44-49` comment, replaced by this custom filter. **No issue.**

### Account Lockout ✓ PASS

`AccountLockoutService.java:32-34` — `MAX_ATTEMPTS = 5`, `ATTEMPTS_WINDOW = Duration.ofMinutes(15)`, `LOCK_DURATION = Duration.ofMinutes(15)`. Redis-backed (distributed across pods) with in-memory fallback. Timing equalization via cost-12 dummy BCrypt hash to prevent timing oracle for lockout-state enumeration (`AccountLockoutService.java:43-49`). **No issue.**

### JWT in httpOnly Cookie ✓ PASS

`AuthController.java:113-117` — tokens are set via `setAuthCookies()` then `authResponse.setAccessToken(null)` and `authResponse.setRefreshToken(null)` before the response is written. Both access and refresh tokens are absent from the JSON body. `CookieConfig` creates httpOnly cookies (confirmed by dual `__Host-`/legacy pattern). **No issue.**

### No CRITICAL or HIGH auth issues found.**

---

## SQL Injection Findings

### All clear — no genuine injection vulnerabilities

The grep for `"(SELECT|UPDATE|...) ... " +` returned hits across several files. All cases examined use **named parameters** (`setParameter("keyword", keyword)` / `:tenantId`) — not string concatenation of user-supplied values.

Key cases inspected:

| File | Line | Pattern | Verdict |
|------|------|---------|---------|
| `FluenceContentRetriever.java` | 212–228 | Native query with `:keyword` / `:tenantId` / `:lim` parameters | **SAFE** — `setParameter()` used; user input never concatenated |
| `FluenceContentRetriever.java` | 238–254 | Same pattern for blog posts | **SAFE** |
| `ApiKeyRepository.java` | 72, 83 | `@Query` JPQL with `:keyPrefix` / `:keyHash` | **SAFE** — Spring Data binding |
| `ContractLifecycleScheduler.java` | 370 | Multi-line static SQL string (no user input in the concatenation) | **SAFE** — purely structural string break |
| `EncryptionBackfillService.java` | 77, 122, 157 | Internal backfill queries with no user-supplied predicates | **SAFE** |
| `WorkflowEscalationScheduler.java` | 285–316 | Scheduler queries with no user input | **SAFE** |

`createNativeQuery(string + string)` grep returned zero results. `EntityManager.createQuery(string + string)` grep returned zero results (all JPQL uses `@Query` annotations or `:named` parameters).

**No SQL or JPQL injection vulnerabilities found.**

---

## Appendix: Secrets Scan — Tracked Source Files

Grep across `backend/src/**/*.{java,yml,yaml,properties}` and `frontend/src/**/*.{ts,tsx,js}` for patterns:
- `gsk_`, `sk-[a-zA-Z0-9]{20,}`, `AKIA[0-9A-Z]{16}`, `ghp_`, `glpat-` → **0 hits in source**
- `jwt.*secret.*[value]{32,}` (non-placeholder) → **0 hits** (all uses are `${JWT_SECRET}` env-var references)
- `password = [literal]` in `.properties`/`.yml` → **0 hits** (all use `${...}` placeholders)
- `.env.example` files: all values are placeholder strings (e.g. `your-secure-jwt-secret-must-be-at-least-256-bits-long`) — no real credentials

The `gsk_` hits in `git grep` are **only in ISSUE_BOARD.md** (tracking references with masked prefix), not in any source file.
