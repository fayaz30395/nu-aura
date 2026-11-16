# Defects found by secgate (NU-SEC-GATE), 2026-11-15, HEAD 568b6aa3

Format: ID | severity | root cause | files:lines | repro | proposed fix | effort. Audit only, nothing was changed. Full context in `docs/release-readiness/07-security-audit.md`.

## High

**DEF-SECGATE-01 High: demo accounts and shared password bundled into the login page, default ON**
- Cause: `IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'` is fail-open; `NEXT_PUBLIC_*` is inlined at build time. Only the Render FE config sets it false.
- Files: `frontend/app/auth/login/page.tsx:46,57-61,146,303,815`; `frontend/lib/config/env.ts:61`; `render.yaml:123-124`.
- Repro: `cd frontend && grep -lF "<demo-password>" .next/static/chunks/app/auth/login/page-*.js` (match found). Live Vercel check is BLOCKED (remote).
- Fix: default off (`=== 'true'`), remove the password literal and the on-screen hint, CI grep gate on `.next/static`. Verify the Vercel project env.
- Effort: S (1-2 h).

**DEF-SECGATE-02 High: `:?` placeholder in the render profile becomes a public default encryption key**
- Cause: Spring does not support `${VAR:?msg}`; it yields the literal `?msg` as the default. `EncryptionService` and `CryptoConverter` then derive an AES key (SHA-256) from a public string and boot normally. Protects SAML IdP config and payment secrets.
- Files: `backend/src/main/resources/application-render.yml:215` (also `application-prod.yml:145` MAIL_PASSWORD, harmless); consumers `common/security/EncryptionService.java:44-78`, `CryptoConverter.java:56-69`.
- Repro: `logs/NU-SEC-GATE-B1-converter-sentinel-probe.txt` (last line true). Whether Railway sets the variable is BLOCKED.
- Fix: `${APP_SECURITY_ENCRYPTION_KEY}` without default (fail to start) and a startup validator rejecting short or placeholder keys.
- Effort: S.

**DEF-SECGATE-03 High: V298/V301 sentinel migrations have no handler and no endpoint**
- Cause: V298 prefixes PF/ESI numbers with `PLAINTEXT_PENDING_ENCRYPTION:`, V301 prefixes `benefit_claims.upi_id` with `UNENCRYPTED:`, both documented as "the converter returns a placeholder; run `/api/v1/admin/maintenance/reencrypt-...`". Neither the endpoints nor any sentinel code exist. Converter returns the raw value; a later save encrypts the prefixed value (permanent corruption). Backfill predicates `NOT LIKE '%:%'` also skip plaintext containing a colon.
- Files: `db/migration/V298__backfill_encrypt_statutory_pii.sql`, `V301__backfill_encrypt_benefit_claim_upi_id.sql`; `common/converter/EncryptedStringConverter.java:221-266`; `EncryptionBackfillService.java:53,77-83,157`.
- Repro: `grep -rn "reencrypt\|UNENCRYPTED\|PLAINTEXT_PENDING" backend/src/main/java` (no hits); probe output in `logs/NU-SEC-GATE-B1-...`. Local tables are empty; prod rows BLOCKED (check `select count(*) from employee_pf_records where uan_number like 'PLAINTEXT_PENDING_ENCRYPTION:%'`).
- Fix: implement the endpoints, strip/clean sentinel prefixes in the read path, replace the colon heuristic with a ciphertext-shape test, run once per tenant and verify counts.
- Effort: M (1-2 days).

**DEF-SECGATE-04 High: encryption key rotation cannot be completed**
- Cause: reads fall back to `ENCRYPTION_KEY_PREVIOUS`, but no job re-encrypts rows under the old key (backfill selects plaintext only); backfill covers 4 tables while 10 more entities use the converter; `EncryptionService`/`CryptoConverter` have no previous-key support; same env var read as Base64 by the converter and as raw text by `EncryptionService`.
- Files: `EncryptedStringConverter.java:47-53,236-247`; `EncryptionBackfillService.java`; `EncryptionService.java:54-78`.
- Repro: static; rotation not executed (would need real data). Removing the previous key makes old rows return `***DECRYPTION_FAILED***`.
- Fix: rotation job over all converter columns using try-current-then-previous, remaining-rows report, previous-key support in `EncryptionService`, one end-to-end rotation test on a copy.
- Effort: M-L (3-4 days).

**DEF-SECGATE-05 High: frontend production dependencies fail `npm audit` today**
- Cause: next 16.3.8 (critical, image optimization RCE with SVG; `dangerouslyAllowSVG` not set), dompurify 3.4.16 (critical, the FE sanitizer), follow-redirects 1.16.0 (high), zod <4.6.6 (high), uuid via exceljs (moderate). Checklist claim of a clean audit (2026-10-15) does not reproduce.
- Files: `frontend/package.json:72,78`.
- Repro: `cd frontend && npm audit --omit=dev` (6 vulnerabilities). Same in `evidence/logs/NU-FE-004-audit.txt`.
- Fix: `npm audit fix` (next, dompurify, follow-redirects); plan zod 4.6.7 and exceljs bump; re-run audit as a CI gate.
- Effort: S for the first three, M for zod/exceljs.

## Medium

**DEF-SECGATE-06 Medium: render profile (live Railway) does not enable captcha or virus scanning.** Base defaults `CAPTCHA_ENABLED:false` (`application.yml:347`) and `VIRUSSCAN_ENABLED:false` (`:356`); only `application-prod.yml:270,284` turn them on. Checklist items 7 and 13 hold only for `prod`. Fix: set both in `application-render.yml` (or confirm Railway env). Effort S. Live env BLOCKED.

**DEF-SECGATE-07 Medium: demo-account gating is hash-exact and one-shot.** Migrations V270/V272/V295/V299/V314/V315 and the runtime gate (`AuthService.java:119-151,299`) match only 3 bcrypt digests; an account re-set to the same password (new salt) is not caught. V291 and V312 seed known-hash ACTIVE accounts ungated (rely on later neutralizers; proven correct on a fresh DB, `logs/...D2`). A fresh prod DB has zero usable admin. Fix: runtime check by trial-matching the documented demo password hash against each login in non-demo mode, and an admin bootstrap runbook. Effort M. See R1 for prod state.

**DEF-SECGATE-08 Medium: per-IP rate limiter bypassed by rotating `X-Forwarded-For`.** Last XFF entry is trusted (`trusted-proxy-hops` default 1, `RateLimitingFilter.java:97-99,145-147`). Proof: same XFF 429 at attempt 6; rotating XFF 8x 401 (`logs/...F14b`). Safe only if the platform proxy appends the client IP and the hop count is exact. Fix: confirm Railway hop count, reject XFF when the peer is not a trusted proxy, add per-account limits. Effort S-M.

**DEF-SECGATE-09 Medium: audit log is mutable by the app DB role.** `hrms_user` has INSERT, UPDATE, DELETE, TRUNCATE on `audit_logs`, no trigger (`logs/...A01`). Fix: revoke UPDATE/DELETE/TRUNCATE for the runtime role, add a block trigger, ship to WORM storage. Effort S.

**DEF-SECGATE-10 Medium: employee directory search leaks personal PII to every EMPLOYEE.** `POST /api/v1/employees/directory/search` has no `@RequiresPermission` (`EmployeeDirectoryController.java:39`); rows include personalEmail, phoneNumber, exitDate, joiningDate, managerId, status. Repro: login `arun@`, POST with `{"query":"a","page":0,"size":3}` (`logs/...F10`). Fix: project to a directory DTO (name, work email, department, designation), gate exit data. Effort S.

**DEF-SECGATE-11 Medium: default Spring profile is `dev`.** `application.yml:17` `SPRING_PROFILES_ACTIVE:dev`. A deployment missing the variable opens swagger, actuator metrics/prometheus/health details (`DevSecurityConfig.java`), turns demo credentials on, and enables repair-on-migrate. `Dockerfile:151` and `render.yaml:54` set `render`. Fix: no default profile, or refuse to start on `dev` when a non-local datasource URL is configured. Effort S.

**DEF-SECGATE-12 Medium: mixed or aged crypto/XML libraries.** `bcpkix/bcutil 1.72` with `bcprov 1.85` pinned; `opensaml 4.3.2`; `poi-ooxml-full 5.5.1` next to `poi-ooxml 5.4.1` (`logs/...E1`). Fix: align BouncyCastle via BOM, evaluate OpenSAML 5, remove the duplicate POI artifact. Effort M.

**DEF-SECGATE-13 Medium: Spring Framework 6.2.18 CVEs undecided.** Per `docs/security/gate-status-2026-10-10.md`, CVE-2026-47884/47890 fixed only in Spring 7; no dated exception in `.trivyignore`. Not independently re-verifiable offline. Fix: record a dated exception with owner or schedule the Spring 7 migration. Effort decision S, migration L.

**DEF-SECGATE-14 Medium: outbox FAILED events are terminal, unalerted and unreplayable.** `OutboxEventProcessor.java:44,127-130` moves to FAILED after 5 retries; no Prometheus rule mentions outbox (`infra/monitoring/prometheus/rules/hrms-alerts.yml`), no admin replay endpoint. Live prod uses the outbox instead of Kafka. Fix: alert on FAILED count and oldest PENDING age, add a replay endpoint. Effort S-M.

## Low

**DEF-SECGATE-15** `POST /api/v1/public/careers/apply` with `{}` returns 500 (`logs/...F18`); unauthenticated, noisy alerts. Validate input; fix the known form/field mismatch. Effort S.
**DEF-SECGATE-16** `AuthService.resetPassword` BCrypt-matches the submitted token against every unexpired reset hash (`AuthService.java:933-960`), an unauthenticated CPU amplifier that combines with DEF-08. Fix: add a token selector (id prefix) column. Effort S-M.
**DEF-SECGATE-17** `IllegalArgument/IllegalState` handlers echo `getMessage()` (`GlobalExceptionHandler.java:366-395`); `leave-requests?status=BOGUS` returns `No enum constant com.nulogic.dom...`. Return fixed messages. Effort S.
**DEF-SECGATE-18** 18 Playwright auth-state files tracked in git incl. SUPER_ADMIN/TENANT_ADMIN JWTs, expired 32 and 203 days (`qa-reports/playwright-rbac/latest/auth-*.json`, `frontend/e2e/.auth/*.json`; history `5a61f9a4`). `git rm --cached`, add to `.gitignore`. Effort S.
**DEF-SECGATE-19** Refresh-token reuse does not revoke the token family; pre-refresh access tokens remain valid until expiry (90 min access TTL) (`logs/...F12`). Add reuse detection and shorten access TTL. Effort M.
**DEF-SECGATE-20** Edge `proxy.ts` gates routes on an unverified JWT payload: forged `alg=none` SUPER_ADMIN gets the admin shell; `/settings/security/api-keys` served to forged EMPLOYEE (`logs/...A05`). API still enforces. Verify signature at the edge or document as UX-only. Effort S-M.
**DEF-SECGATE-21** FE CSP `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (`next.config.js`/`proxy.ts`). Move to nonce-based CSP. Effort M.
**DEF-SECGATE-22** Entity-bound `@RequestBody` remain: LMS course/quiz, compliance, statutory, PSA, competency, helpdesk SLA. Updates replace the full entity and let privileged callers set status, counters and `createdAt`; `PUT` with partial bodies nulls columns. Replace with request DTOs as done for payroll. Effort M.
