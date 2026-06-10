# Green-Flag Audit — Security (SEC-01)

**Agent:** security
**Date:** 2026-06-10
**Repo:** nu-aura
**Scope:** OWASP code-level — AuthN/JWT, injection, data exposure, secrets, rate limiting, session/CSRF/CORS, file upload, IDOR/mass-assignment. SuperAdmin bypass excluded by design.
**Method:** Code re-verification of the prior audit (`docs/audit/release-2026-06-04/security-audit-2026-06-04.md`) + fresh SEC-01 checks, cross-checked against `docs/security/baseline.md`.

## Headline

Prior audit's 3 HIGH and the full MEDIUM/LOW remediation set are **confirmed fixed in current code**. One **new HIGH** surfaced that the prior audit did not flag: real database + JWT secrets were committed to git history in `.env` (commit `d5961fef`, reachable from `main`) and persist in history even though the file is now untracked. The runtime control posture is strong; the residual risk is leaked-credential rotation plus a handful of MEDIUM defense-in-depth gaps.

| ID | Severity | Module | Description | Impact | Exact Fix | Owner Agent | Status |
|----|----------|--------|-------------|--------|-----------|------------|--------|
| SEC-1 | **HIGH** | secrets / git-history | Real secrets committed to git history. `.env` (commit `d5961fef`, "chore: add dev environment variables", reachable from `main`) contains live Neon DB creds (`SPRING_DATASOURCE_PASSWORD=npg_p3Nnmrd9PvhB`), `JWT_SECRET=TWkTl+dNYIi7savU25egqcV2235Nq+qVw/wksIV7Qg0=`, and an encryption key. File is now gitignored/untracked but history retains it. Working-tree `.env` and `infra/deployment/config/.env.production` (gitignored) also hold live Neon creds (`npg_xwHjDEtfb4o2`) and a weak prod JWT secret `hrms-super-secret-jwt-key-for-production-2024`. | Anyone with repo-history access can recover DB creds + JWT signing key → forge any user's token (incl. SuperAdmin), connect directly to Neon. | Rotate the exposed Neon password, JWT secret, and encryption key NOW. Purge `.env` from history (`git filter-repo --path .env --invert-paths`) or rotate-and-accept. Add the weak literal `hrms-super-secret-jwt-key-for-production-2024` to `JwtTokenProvider.knownWeakSecrets`. Add gitleaks to CI (baseline §Scan Cadence already mandates it). | security + devops | OPEN |
| SEC-2 | LOW | config / JWT | `JwtTokenProvider.validateJwtSecret` denylist (`JwtTokenProvider.java:59`) misses the `.env.production` literal `hrms-super-secret-jwt-key-for-production-2024` (passes 32-byte + denylist checks). | A predictable "production" secret would boot without warning if ever used. | Add the literal (and any `*-for-production-*` pattern) to `knownWeakSecrets`. | security | OPEN |
| SEC-3 | MEDIUM | frontend / OAuth | Google OAuth tokens (gmail.send/modify, drive.file, calendar) still in JS-accessible sessionStorage (`frontend/lib/utils/googleToken.ts`). XSS-gated; mitigated by DOMPurify + (now) CSP nonce + tab-close cleanup. Prior M-11. | If any XSS sink lands, broad Google scopes are exfiltratable. | Migrate to backend-proxied httpOnly cookie session; request gmail.* scopes lazily. File's own TODO documents this. | frontend | OPEN (mitigated) |
| SEC-4 | LOW | file upload | AV scan fail-open is now config-gated and prod-closed (`application-prod.yml:253 VIRUSSCAN_FAIL_OPEN:false`), but default base config (`app.security.virusscan.fail-open:true`) still fails open if `VIRUSSCAN_FAIL_OPEN` is unset in a non-prod-profile prod deploy. Prior M-7. | Malware-in-valid-container upload during clamd outage on a misconfigured deploy. | Confirm prod K8s/Render sets `VIRUSSCAN_FAIL_OPEN=false`; consider flipping base default to `false`. | security | OPEN (mitigated) |
| SEC-5 | LOW | k8s secrets | `infra/deployment/kubernetes/secrets.yaml` is committed but is a placeholder-only template (all values `Q0hBTkdFTUU=`="CHANGEME"). Prior I-1. | None today; risk only if someone edits it with real values and commits. | Keep enforced via gitleaks + the in-file warning banner. | devops | ACCEPTED |

## Verified-fixed (prior audit findings re-confirmed in current code)

| Prior ID | Finding | Current state |
|----------|---------|---------------|
| H-1 | Demo `Welcome@123` accounts seeded to prod | **Fixed.** `V270` + `V272__fail_closed_demo_credential_lockdown.sql` neutralize all three known digests + fixed-UUID personas; gated fail-closed (`demoCredentialsEnabled` base default `false` in `application.yml:112` and `application-prod.yml:98`; only dev/demo opt in). |
| H-2 | TenantAdmin→SuperAdmin via `SYSTEM:ADMIN` grant | **Fixed.** `RoleManagementService.java:54` `PRIVILEGED_PERMISSIONS` denylist; rejected unless SuperAdmin (`:99`,`:110`). |
| H-3 | Impersonation JTI blacklist not checked (revoke no-op) | **Fixed.** `JwtTokenProvider.validateToken` now checks `impersonationJti` blacklist (`:221-226`). |
| M-1 | File-upload IDOR | **Fixed.** `FileUploadController.java:77,105` call `enforceEmployeeUploadScope`. |
| M-2 | MFA not enforced in `login()` | **Fixed.** `AuthService.java:283-288` issues opaque `mfa:pending:` token (5-min Redis TTL) instead of full session when MFA enabled; `consumeMfaPendingToken` (`:1151`). |
| M-3/4/5 | Same-tenant IDOR (tax/review/self-service) | **Fixed.** Owner guards: `TaxDeclarationService.java:199-203`, `PerformanceReviewService.java:144-151`, `SelfServiceService.java:241-245`. |
| M-6 | Sort-field SQLi via Pageable | **Fixed.** `NotificationTemplateRepository.java:41` hardcodes `ORDER BY t.updated_at DESC`. |
| M-8 | BCrypt cost 10 | **Fixed.** `SecurityConfig.java:88` and `AccountLockoutService.java:49` both `new BCryptPasswordEncoder(12)`. |
| M-9 | TOTP replay | **Fixed.** `MfaService.java:264-267` `totp:used:` SETNX with 90s TTL. |
| M-10 | TOTP QR-code broken | **Fixed.** `MfaService.java:411` correct `String.format` + `URLEncoder`. |
| M-13 | CSP `unsafe-inline` | **Fixed.** `frontend/proxy.ts` per-request nonce + `strict-dynamic` (`:333-339`). |
| M-14/15/16/17 | DoS hardening | **Fixed.** Type-aware AUTH/EXPORT fallback buckets (`RateLimitingFilter.java:407-413`); `@Min/@Max(100)` on raw `int size` params across CompOff/LMS/Notification/Shift/JobBoard/etc.; `pagination.max-page-size:100`; expense `MAX_SUMMARY_RANGE_DAYS=366` (`ExpenseClaimService.java:64,500`). |

## Fresh SEC-01 checks (clean)

- **JWT config** — secret env-sourced (`application.yml:287 ${JWT_SECRET}`, no default → app fails to boot if unset); startup entropy + denylist + 32-byte validation (`JwtTokenProvider.validateJwtSecret`); access 90min / refresh 24h; `httpOnly+Secure+SameSite`, `__Host-` prefix migration-ready (`cookie.use-host-prefix`). Logout blacklists token + `revokeAllUserTokens` (`AuthService.java:534-542`). Refresh-token **rotation** present: `AuthController` revokes old refresh after issuing new (`:230-233`). Account lockout 5/15min in `AccountLockoutService`.
- **Injection** — no native-SQL string concatenation found (`createNativeQuery("..."+`, `nativeQuery=true ...+` both zero matches); no Elasticsearch query-builder string injection (no `QueryBuilders`/`queryStringQuery` matches); no `Runtime.exec`/`ProcessBuilder` OS-command use.
- **Data exposure** — no password-hash-returning DTOs in `api/`; `server.error.include-stacktrace: never` in all profiles (`application.yml:282`, prod/dev/render).
- **Rate limiting** — AUTH 5/min + EXPORT 5/5min fail-closed and correctly wired through `RateLimitingFilter.determineRateLimitType` → `DistributedRateLimiter` (`:162-178`), including the Redis-down fallback bucket.
- **CORS** — `SecurityConfig.java:287-296` rejects empty origin list and wildcard `*`; explicit origin allowlist only.
- **CSRF** — double-submit with constant-time header equality + `SameSite=Strict` via `ResponseCookie` (`CsrfDoubleSubmitFilter.java:133`).

## Cross-check vs baseline.md

Crypto inventory (bcrypt-12, HS256 JWT, AES-256-GCM, TLS 1.2+) and the per-request defense layers in `docs/security/baseline.md` match the code as built. Baseline's mandated `gitleaks` "block on any match" scan (§Scan Cadence) is **not yet enforced in CI** — directly relevant to SEC-1; that gap is how the `.env` secret reached history.
