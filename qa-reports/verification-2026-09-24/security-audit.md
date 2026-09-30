# Independent Security Audit — nu-aura, branch `main`

**Date:** 2026-09-24
**Scope:** Secret exposure (working tree + full git history), branch reachability/blast radius, `SecurityConfig.java` review, RLS/tenant isolation, credential logging, `DEMO_CREDENTIALS_ENABLED` gating, hardcoded defaults in compose/k8s manifests.
**Rule followed:** no secret VALUE reproduced in this file or (intentionally) in tool output. See **Process Note** at the end for one exception that occurred and was contained.

---

## 1. Secret exposure — git history

### 1.1 Working tree (untracked)
- `backend/.env` — **untracked, gitignored** (`backend/.gitignore:8`), not in the git index (`git ls-files` returns no match). Consistent with the establi­shed finding that it holds a Groq-pattern key. This file was NOT read for content in this audit (harness blocked direct read/grep of it, which is itself a reasonable secret-protection default — treated as evidence it's being handled outside git, not assessed further).
- `.env.bak2`, `.env.bak3` (repo root) — not inspected per operator's explicit instruction; not part of this audit.

### 1.2 Tracked history — CONFIRMED EXPOSURE (two separate incidents)

**Incident A — `backend/start-backend.sh` (Groq/OpenAI-compatible key)**
- Introduced: commit `83f70807` (2026-03-16, "test") — added `export OPENAI_API_KEY="${OPENAI_API_KEY:-<hardcoded Groq-format key>}"` plus `OPENAI_BASE_URL`, `OPENAI_MODEL`.
- The hardcoded default value was toggled between an empty default and the same literal Groq-format key across at least 2 later commits on this file (file has 15 commits total, 2026-03-16 → 2026-05-27).
- **Current HEAD state: CLEAN.** `backend/start-backend.sh:50` now reads `export OPENAI_API_KEY="${OPENAI_API_KEY:-}"` (empty default, no literal). Confirmed by direct read at HEAD.
- Still present in history — reachable from `main` and, per branch-containment check, from effectively every branch on both remotes (see §2).

**Incident B — root `.env` committed to git (multi-credential exposure)**
- Added: commit `24a6c4c7` (2026-03-20) — 3 lines: `NEON_JDBC_URL`, `NEON_DB_USERNAME`, `NEON_DB_PASSWORD` (Neon Postgres).
- Expanded: commit `d5961fef` (2026-03-23) — added `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `APP_SECURITY_ENCRYPTION_KEY`.
- Expanded: commit `8de12a5f` (2026-03-30) — added `MINIO_ROOT_PASSWORD`.
- Deleted: commit `ede44ab0` (2026-04-02, author "Claude") — all 12 lines removed, file untracked from that point forward. `.env` is confirmed absent from the index at HEAD.
- **Exposure window: ~13 days (2026-03-20 → 2026-04-02) during which the file was live in the tracked tree**, across that span on `main`.
- This is the more serious of the two incidents: it includes `JWT_SECRET` and `APP_SECURITY_ENCRYPTION_KEY` (the app's AES-256-GCM key per `application.yml:334`), not just a third-party API key.

**Historical, low-severity, self-corrected same day**
- `monitoring/docker-compose.yml` added in `8cd888f7` (2026-04-02) then deleted in `ede44ab0` (same day) — contained `GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}` (weak default, local Grafana admin only, not a production secret; lived <1 day; not reachable outside that commit range beyond normal history retention).

**Wide pattern scan (Groq/OpenAI/Google/GitHub/AWS/Postgres-URL-with-inline-creds regexes) across full history:** no additional hits beyond what's already covered above — remaining matches were all in documentation files (`docs/audit/...`, `docs/runbooks/key-rotation.md`, `GREEN_FLAG_REPORT.md`, `ISSUE_BOARD.md`) discussing security topics, not literal secrets.

### 1.3 Reachability / blast radius
Confirmed via `git merge-base --is-ancestor` and `git branch --all --contains`:
- `83f70807`, `24a6c4c7`, `d5961fef`, `8de12a5f`, `ede44ab0` are **all ancestors of current `main` HEAD** (`2b4832cb`).
- `git branch --all --contains ede44ab0` returns **85 refs** — i.e. every local branch, every `dependabot/*` branch, every `codex/*`/`claude/*` branch, and `main`/`master` on **both** remotes (`fayaz-deen` and `fayaz30395`). In practice: **100% of currently-known branches on both GitHub remotes carry this history.**
- Because these are foundational commits from March–April 2026 and virtually every later branch forks from `main` after that point, blast radius is effectively "every branch, both repos" rather than an isolated feature branch. No force-push occurred (I did not attempt one, per instructions) — the exposure is real and live on GitHub for anyone with repo read access (private repo access-control is the only current mitigant, not history absence).
- Decision `DC-2G4FXH8D0V2Q` ("current code clean") is **accurate for the checked-out working tree and HEAD**, but **misleading as a security posture statement** — the credentials remain permanently embedded in reachable git history on both remotes unless the history is rewritten (human decision, out of scope here) and the credentials are rotated.

### 1.4 Other branch tips (tracked-file scan)
Checked all local branch tips (`chore/route-coverage-check`, `feat/storage-disable-escape-hatch`, `fix/dead-nav-pages`, `fix/perf-review-state-machine`, `push/both-repo-sync`, `release-readiness/verified-fixes`) — none introduce additional tracked secret-pattern hits beyond what's already in the shared history from `main`. No branch-specific new exposure found.

### 1.5 Credential status classification

| Credential | First exposed | Removed from tree | Status |
|---|---|---|---|
| Groq/OpenAI-compatible `OPENAI_API_KEY` (start-backend.sh) | 83f70807 (2026-03-16) | HEAD (current) — literal removed, default empty | **UNKNOWN** (rotation/revocation state not observable from repo evidence; format is a live-looking Groq key pattern, format alone doesn't prove liveness) |
| `NEON_JDBC_URL` / `NEON_DB_USERNAME` / `NEON_DB_PASSWORD` | 24a6c4c7 (2026-03-20) | ede44ab0 (2026-04-02) | **UNKNOWN** — no evidence in-repo of rotation |
| `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | d5961fef (2026-03-23) | ede44ab0 (2026-04-02) | **UNKNOWN** |
| `JWT_SECRET` | d5961fef (2026-03-23) | ede44ab0 (2026-04-02) | **UNKNOWN** — if this is/was the prod signing key, exposure lets an attacker forge valid JWTs until rotated |
| `APP_SECURITY_ENCRYPTION_KEY` | d5961fef (2026-03-23) | ede44ab0 (2026-04-02) | **UNKNOWN** — this is the AES-256-GCM key referenced at `application.yml:334-336`; if still in use, any data encrypted with it is at risk |
| `MINIO_ROOT_PASSWORD` | 8de12a5f (2026-03-30) | ede44ab0 (2026-04-02) | **UNKNOWN** |
| `GRAFANA_ADMIN_PASSWORD` default `admin` | 8cd888f7 (2026-04-02) | ede44ab0 (2026-04-02, same day) | **UNKNOWN**, low severity (local monitoring only) |

No repo evidence (commit messages, ADRs, runbooks) shows these specific credentials being rotated — `docs/runbooks/key-rotation.md` exists (added 2026-05-12, later deleted 2026-06-16 per history) but its content wasn't read for secret values; its existence doesn't itself confirm these particular incidents were acted on. **Do not guess — treat all seven as UNKNOWN and rotate.**

---

## 2. SecurityConfig.java review (`backend/src/main/java/com/nulogic/common/config/SecurityConfig.java`)

**Overall: solid, defense-in-depth posture. No CRITICAL findings.**

- CSRF: Spring's built-in CSRF disabled, replaced by a custom double-submit cookie filter (`CsrfDoubleSubmitFilter`) — documented rationale in code comment (BUG-013). Reasonable given stateless JWT + httpOnly cookie architecture.
- `permitAll()` list (lines 190–250) is an **explicit allow-list**, not a wildcard — comment at line 192-194 notes this was deliberately tightened from a previous `/api/v1/auth/**` wildcard. Each entry has a stated justification (public career pages, token-based portals, webhook endpoints with signature/HMAC verification noted inline, SAML endpoints). This is the right pattern.
- `/actuator/**` requires `SUPER_ADMIN` except `/actuator/health` (public, standard) and `/actuator/prometheus`, which uses a dedicated constant-time-compared bearer token (`isPrometheusScrapeAuthorized`, `MessageDigest.isEqual`) — correctly avoids timing side-channels.
- Swagger/OpenAPI UI requires `SUPER_ADMIN` (dev profile handled separately per comment).
- CORS: explicit origin allow-list from config (`app.cors.allowed-origins`), throws on empty or wildcard (`*`) — good fail-closed behavior (lines 286-291). Headers/methods enumerated explicitly, not `*`.
- Security headers: HSTS (1yr, includeSubDomains), CSP (`default-src 'self'; frame-ancestors 'none'`), nosniff, referrer-policy `strict-origin-when-cross-origin`, permissions-policy locking camera/mic/geolocation/payment/usb/display-capture. Comprehensive.
- Auth entry points return JSON 401/403 rather than redirecting — correct for an API.
- Password encoder: BCrypt cost 12 (upgraded from default 10, per comment M-8).

**No overly-permissive findings.** Nothing here needs to block release; this file's history from `83f70807` shows it was also touched in the same commit that hardcoded the Groq key, but the `permitAll()` narrowing work (comment at line 192) appears to postdate that and reflects real hardening, not regression.

---

## 3. RLS / tenant isolation

- Tenant scoping uses `set_config('app.current_tenant_id', ?, true)` with a **bind parameter**, not string concatenation, in all 6 locations found: `TenantRlsTransactionManager.java:76`, `TenantAwareDataSourceConfig.java:124`, `TenantRlsSessionSync.java:21`, `MileageService.java:59`, `ExpenseClaimService.java:70`, `EmployeeService.java:77` — each carries a `// CRIT-002` comment noting this is deliberately parameterized to prevent SQL injection into the GUC value. Correct pattern, consistently applied.
- `@SQLRestriction` (Hibernate 6 tenant-scoping annotation) used **222 times** across entities — broad, consistent application.
- `RlsTenantGucScopeTest.java` exists at `backend/src/test/java/com/nulogic/architecture/RlsTenantGucScopeTest.java` and is compiled (class present in `target/test-classes`), guarding against the prior tx-local `set_config` leak (per project memory: fixed at commit `0ea63f6e`).
- **No new RLS regressions found.** This matches the established baseline; did not re-run the test itself (build/test execution is functional-verification territory, out of this audit's scope).

---

## 4. Credential/token logging sweep

Grepped all `log.{info,debug,warn,error,trace}(...)` calls in `backend/src/main/java` mentioning password/secret/token/credential/apikey (60 matches reviewed). **No line logs an actual secret value.** All matches log:
- metadata only (user/tenant/admin IDs, key **names**, exception class names, lengths, timestamps, event descriptions — e.g. `JwtSecretValidator.java:79` logs `jwtSecret.length()`, never the secret itself)
- generic event narration ("token blacklisted", "webhook secret rotated", "password reset successful for user ID: {}")

No CRITICAL or HIGH findings here.

---

## 5. `DEMO_CREDENTIALS_ENABLED` gating

**Correctly fail-closed for production.**
- `application.yml:131` (base/default): `demoCredentialsEnabled: ${DEMO_CREDENTIALS_ENABLED:false}` — defaults to `false` if unset.
- `application-prod.yml:109`: same, `:false` default, with an explicit comment warning it should only be overridden for a throwaway demo env.
- `application-demo.yml:10` / `application-dev.yml:95`: default `true` — correctly scoped to non-prod profiles only.
- Runtime enforcement (not just migration-time): `AuthService.java:284` — `if (!demoCredentialsEnabled && KNOWN_DEMO_PASSWORD_HASHES.contains(user.getPasswordHash())) { ... }` blocks login even if a demo-hash account somehow exists with `ACTIVE` status. Comment at line 281 notes this is deliberately defense-in-depth against migration-time gaps.
- Flyway migrations V270, V272, V286, V295, V299, V314, V315 all gate demo-account seeding/neutralization behind the same placeholder, each with a `RAISE NOTICE` for auditability. Consistent pattern across 7 migrations, not a one-off fix.
- Matches project memory: this is the same control verified live on Railway prod (`DEMO_CREDENTIALS_ENABLED=false` set 2026-06-24).

No findings here — this is the strongest-evidenced control in the audit.

---

## 6. Hardcoded credential defaults — compose / k8s

- **`docker-compose.yml`**, **`docker-compose.prod.yml`**: all password/secret/token env vars use either no default (fails at container start if unset) or Docker Compose's `${VAR:?message}` required-variable syntax (e.g. `GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD must be set}`, `ELASTIC_PASSWORD:?ELASTIC_PASSWORD must be set in .env`). **No hardcoded literal defaults in current tree.**
- **`infra/deployment/kubernetes/secrets.yaml`**: explicitly labeled `# PLACEHOLDER TEMPLATE — COMMITTED ON PURPOSE. NEVER PUT REAL SECRETS HERE.` All values are the literal base64 string for `"CHANGEME"`, or empty (`TWILIO_AUTH_TOKEN: ""`, `OPENAI_API_KEY: ""`, etc.). File header documents 3 correct ways to populate real secrets at deploy time (kubectl from env-file, external secrets manager, Sealed Secrets/SOPS). `secrets.yaml.example` also present alongside it. **This is the right pattern** — no hardcoded real defaults.
- `backend-deployment.yaml`, `frontend-deployment.yaml`: all secret-bearing env vars use `secretKeyRef` against the `hrms-secrets` Secret — no inline values.
- Historical exception already covered in §1.2 (monitoring/docker-compose.yml `admin` default, same-day self-corrected, low severity).

No current hardcoded defaults found.

---

## Summary for remediation (human-only actions required)

1. **Rotate all 7 credentials in §1.5** — do not rely on "UNKNOWN" status as a pass; treat as compromised. Priority: `JWT_SECRET` and `APP_SECURITY_ENCRYPTION_KEY` first (session forgery / data-at-rest risk), then DB credentials (Neon + Spring datasource), then `MINIO_ROOT_PASSWORD`, `OPENAI_API_KEY` (Groq), `GRAFANA_ADMIN_PASSWORD`.
2. **Git history rewrite decision is a human call** (out of scope for this audit to perform) — `.env` and the `start-backend.sh` hardcoded-key lines remain in history on both `fayaz-deen` and `fayaz30395` remotes across ~85 branch refs. If history rewrite is chosen, every branch listed in §1.3 needs force-push coordination on both remotes, and all collaborators need to re-clone.
3. Re-verify `DC-2G4FXH8D0V2Q`'s "current code clean" framing gets corrected to "current code clean; history still exposed, rotation pending" so it isn't read as a closed finding.
4. No code changes required for SecurityConfig, RLS, logging, `DEMO_CREDENTIALS_ENABLED`, or compose/k8s manifests — all reviewed clean.

---

## Process note (transparency)

During history investigation, one `grep -n` command against `backend/start-backend.sh`'s git log searched for the string `OPENAI_API_KEY` without a redacting `sed` pipe, and the raw historical secret value appeared in that tool's output (now present in this session's transcript). This was my error — the rule is to never reproduce a secret value, and I did once, unintentionally, via an unredacted grep. All subsequent commands in this audit redact matched values before they reach output. I have not repeated the value anywhere in this report or in any other output. Recommend treating the Groq-pattern key as needing rotation regardless (already listed in §1.5), and note that anyone with access to this session's raw tool-call transcript (not this report) would see it — worth flagging to whoever reviews session logs.
