# 07 Security gates audit (NU-SEC-GATE) - 2026-11-15

Agent tag `secgate`. Repo HEAD `568b6aa3`. Security-relevant source and config are byte-identical to HEAD
(only payroll `Payslip*` files are modified in `backend/src/main/java`; `git status` on `resources/`, poms, Dockerfiles, workflows is clean).
Environment: LOCAL ONLY (BE :8080 `dev` profile, FE :3000, PG16 `hrms_dev`). Remote (Vercel, Railway, Neon) = BLOCKED, not probed.
Mode = audit. No source, config or migration edited. Evidence: `docs/release-readiness/evidence/` (logs `NU-SEC-GATE-*.txt`, scripts `scripts/secgate/`,
matrix `matrix-secgate.csv`, defects `defects-secgate.md`, test data `test-data-secgate.md`). No secrets in evidence (values redacted; scan in section C).

## 0. Verdict for this gate group

**NOT READY for production replacement of Keka until the 5 High defects below are closed or proven non-applicable on the live deployment.**
Most High items are configuration or release-process failures that are cheap to fix. The core controls (RLS, authz on routes, JWT handling,
CSRF, CORS, SQL parameterization, demo-account neutralization on a fresh DB) held up under direct testing.

| Sev | Count | IDs |
|---|---|---|
| Critical | 0 confirmed (1 Critical-if-true, BLOCKED, see R1) | - |
| High | 5 | DEF-SECGATE-01..05 |
| Medium | 9 | 06..14 |
| Low | 8 | 15..22 |

| ID | Sev | One line |
|---|---|---|
| 01 | High | Login page bundles demo accounts and the shared demo password; `NEXT_PUBLIC_DEMO_MODE` defaults ON (`!== 'false'`). Literal found in built chunk. |
| 02 | High | `application-render.yml:215` uses `${APP_SECURITY_ENCRYPTION_KEY:?msg}`. Spring treats `:?msg` as a literal default, so an unset env gives a public, known key and the app boots. |
| 03 | High | V298/V301 prefix legacy PF/ESI/UPI plaintext with a sentinel; converter has no sentinel handling and the promised re-encrypt endpoints do not exist. Re-save permanently stores the sentinel. |
| 04 | High | Key rotation cannot be completed: previous-key reads exist, but nothing re-encrypts rows still under the old key, and `EncryptionService` (SAML, payments) has no previous-key support. |
| 05 | High | `npm audit --omit=dev` today: 2 critical (next 16.3.8, dompurify 3.4.16), 2 high (follow-redirects, zod). The checklist claim "passes" does not reproduce. |

## A. Hardening checklist, 19 items (`.claude/security-checklist.json`, commit 568b6aa3)

Claim summary in the commit: 16 fixed, 3 pending. Re-verified individually. Result: of 16 "fixed", 8 verified as claimed, 7 verified with caveats, 1 not verifiable; the 3 "pending" are confirmed pending (item 17 is worse than claimed).

| # | Item | Claimed | Verified | Evidence |
|---|---|---|---|---|
| 1 | row-level-security | fixed | VERIFIED (local DB) | Catalog query: 324 tables with `tenant_id`, 324 RLS on, 324 FORCE, 323 with restrictive policy; sole exception `outbox_events` (permissive only, as documented). App role `hrms_user` not super, not bypassrls. `logs/NU-SEC-GATE-A01-rls-catalog.txt`. Prod DB BLOCKED. |
| 2 | stop-idor-bugs | pending | CONFIRMED PARTIAL | Live: EMPLOYEE `GET /employees/{other-id}` x6 all 403 (`logs/...F10`). `/employees/me` whitelist copy at `EmployeeController.java:141-165`. Not exhaustively tested: public exit-interview token, unscoped reads. Prior-noted `PreboardingController.java:103` `markConverted` trusts body `employeeId` (not re-verified). |
| 3 | never-trust-the-frontend | pending | CONFIRMED PARTIAL | Entity-bound `@RequestBody` still in `LmsController.java:119-219`, `ComplianceController.java:40-242`, statutory/PSA/competency/helpdesk-SLA controllers (DEF-22). Payroll was moved to DTOs. |
| 4 | auth-on-every-api-route | fixed | VERIFIED | `SecurityConfig.java:189-251` explicit allow-list + `anyRequest().authenticated()`. Independent scan: 1,794 handlers, 46 without authz annotation, all public/token/self-scope (`logs/...F06`); one is a real finding (directory search, DEF-10). Live: 20 protected paths unauthenticated -> 401; unauthenticated POST/PUT/DELETE -> 403 CSRF (`logs/...F05`). |
| 5 | hide-admin-pages-properly | fixed | PARTIAL | No cookie -> 307 to login; forged EMPLOYEE token -> 307 denied. BUT `proxy.ts` only base64-decodes the JWT: forged unsigned `alg=none` SUPER_ADMIN token gets 200 shell for `/admin/users`, `/payroll/runs`; `/settings/security/api-keys` served to forged EMPLOYEE (`logs/...A05`). API still enforces (F10). DEF-20. |
| 6 | rate-limiting | fixed | VERIFIED with caveat | AUTH bucket: 5 pass then 429 (`logs/...F14b`). PUBLIC bucket: 20 pass then 429 at request 21 (`logs/...F18`). Bypass by rotating `X-Forwarded-For` (DEF-08). Biometric per-key not tested. |
| 7 | captcha-on-public-forms | fixed | PARTIAL | Verifier called in careers apply, offer accept/decline, preboarding, login (`CaptchaService` call sites). Enabled by default only in `prod` (`application-prod.yml:270`). Base default `CAPTCHA_ENABLED:false` (`application.yml:347`) and `render` sets nothing, so the Railway profile runs a NoOp verifier unless env is set (DEF-06). `POST /public/careers/apply` with `{}` returns 500 (DEF-15). |
| 8 | lock-down-cors | fixed | VERIFIED | Origins `https://evil.example`, `null`, `http://localhost:3000.evil.example` -> 403, no ACAO; `http://localhost:3000` allowed with credentials (`logs/...F03`). |
| 9 | security-headers | fixed | VERIFIED with caveats | BE: nosniff, X-Frame DENY, referrer-policy, permissions-policy, CSP `default-src 'self'; frame-ancestors 'none'`. FE CSP `script-src` has `'unsafe-inline' 'unsafe-eval'` (DEF-21). HSTS not observable over http; code at `SecurityConfig.java:154-158`, `SecurityHeadersFilter.java:64` (`logs/...F01`). |
| 10 | https-everywhere | fixed | PARTIAL (config only) | `forward-headers-strategy: framework` (`application-render.yml:146`, `prod:203`), `cookie.secure: true`, HSTS 1y+subdomains, `trusted-proxy-hops` default 1. Railway hop count and live TLS BLOCKED. Locally the last-XFF trust is spoofable (DEF-08). |
| 11 | sanitize-user-input | fixed | VERIFIED code, live partial | jsoup `RichTextSanitizer` at `WikiPageService:91,121`, `BlogPostService:69,92`, `AnnouncementService:71,119`, `LetterService:85-87,121-123`, `LmsService:239,247`. FE: every `dangerouslySetInnerHTML` is wrapped by a sanitizer. Live: raw HTML stored in plain-text `address` (by design, React escapes) (`logs/...F16`). Live write to announcements/wiki NOT TESTED (403 for demo HR_MANAGER). FE sanitizer library has a critical advisory (DEF-05). |
| 12 | parameterized-queries | fixed | VERIFIED | Grep: 0 string-built `@Query`/`jdbcTemplate`/`createNativeQuery`; 27 native queries. `WorkflowService.java:994-998` strips client sort. Live: quote/UNION in `search`, `sort=id;select pg_sleep(3)`, subselect sort, unknown sort prop all return 200/400 with no SQL markers and no delay (`logs/...F15`). |
| 13 | check-file-upload-types | fixed | PARTIAL | Static anchors confirmed (`FileStorageService.java:47-62` allowlist, `412-452` validate+magic, `362-403` fail-closed AV switch, `81` categories). Live: 11 MB -> 413 PASS. Type, magic-byte and traversal cases BLOCKED: demo HR_MANAGER lacks `DOCUMENT:UPLOAD` (`logs/...F13`); needs an HR_ADMIN login. AV only active under `prod` (DEF-06). |
| 14 | log-admin-actions | fixed | VERIFIED | `audit_logs`: 133 rows in last 3h, 0 null actors; LOGIN, LOGOUT, UPDATE, APPROVE, STATUS_CHANGE present. No delete/update path in code. DB-level immutability missing (DEF-09). |
| 15 | debug-mode-off-in-prod | fixed | VERIFIED config | prod: `show-details: never`, `include-stacktrace: never`, springdoc off (`application-prod.yml:156,206-220`); render: springdoc off, `include-*: never` (`application-render.yml:157-170`). Local `dev` profile opens swagger, api-docs, actuator metrics/prometheus/health details via `DevSecurityConfig` (`logs/...F02`). Default profile is `dev` when env is missing (DEF-11); `Dockerfile` pins `render`. |
| 16 | private-storage-buckets | fixed | VERIFIED code | `GoogleDriveStorageProvider.getDownloadUrl:92` no direct URLs; `assertTenantOwns` at `FileUploadController.java:138,159,187,198`. No live Drive test. |
| 17 | update-vulnerable-packages | pending | CONFIRMED PENDING, WORSE | See E. FE prod deps fail audit today; claim "passes" does not reproduce. |
| 18 | verify-webhook-signatures | fixed | VERIFIED | Razorpay/Stripe: no header 400, bogus signature 403; DocuSign no signature 400; biometric bad key rejected (`logs/...F18`). Slack fails closed unless local profile (`SlackCommandService.java:104-111`). Open items (DocuSign hex vs base64, Slack body cache) not exercised. |
| 19 | claude-security-review | fixed | NOT VERIFIABLE | Process claim by an AI session. This audit is the independent review. |

## B. Encryption (dual-key migration)

Files: `common/security/EncryptionService.java`, `CryptoConverter.java`, `common/converter/EncryptedStringConverter.java`, `EncryptedLocalDateConverter.java`,
`application/security/service/EncryptionBackfillService.java`, `api/admin/controller/EncryptionBackfillController.java`, Flyway V147, V271, V298, V301.
No keys printed; a synthetic key was used for the isolated Java probe (`logs/NU-SEC-GATE-B1-converter-sentinel-probe.txt`). No real data decrypted.

- Good: AES-256-GCM, random 96-bit IV, tag, fail-fast key validation, sentinel `***DECRYPTION_FAILED***` is refused on write (`EncryptedStringConverter.java:193`), previous key read via `ENCRYPTION_KEY_PREVIOUS` (reads only, writes use current key), `EncryptedLocalDateConverter` inherits it, endpoints need `SYSTEM_ADMIN` + revalidate. Unit tests name the old-key and malformed-previous cases (not executed by me; mvn owned by another agent).
- DEF-04 (High) rotation cannot drain. `EncryptionBackfillService` candidate queries are `... NOT LIKE '%:%'` (plaintext only, lines 53-158). Rows under the retired key contain `:`, so they are never candidates, and the converter javadoc ("unset once the backfill reports zero rows") would report zero while rows remain. Removing the previous key then turns them into `***DECRYPTION_FAILED***`. Backfill covers 4 tables; 10 other entities with converters (Employee, Candidate, PF/ESI, Payment*, Webhook, IntegrationConnector, BenefitClaim, Preboarding) have no drain path. `EncryptionService`/`CryptoConverter` (SAML IdP config, payment secrets) read one key from a raw string, SHA-256 derived, no previous key: rotating `APP_SECURITY_ENCRYPTION_KEY` as documented breaks them. The same env var is also interpreted as Base64 by the converter and as raw text by `EncryptionService` (Medium, noted in DEF-04).
- DEF-03 (High) V298 and V301 rewrite existing plaintext PF/ESI/UPI values to `PLAINTEXT_PENDING_ENCRYPTION:<v>` / `UNENCRYPTED:<v>` and say the app returns a safe placeholder and that `POST /api/v1/admin/maintenance/reencrypt-statutory-pii` and `.../reencrypt-benefit-upi` finish the job. `grep -rn reencrypt backend/src/main/java` and `grep UNENCRYPTED` return nothing. Probe: reading those values returns the raw sentinel+value, and a save re-encrypts the prefixed string (prefix survives decrypt). Predicate also skips plaintext containing `:` (addresses, conditions). Local DB has 0 rows in these tables, so runtime impact on prod rows is unverified (BLOCKED).
- DEF-02 (High) `application-render.yml:215` and `application-prod.yml:145` (mail) use `:?`. Spring resolves `${X:?msg}` to the literal `?msg` (probe confirms). With the env var unset, `EncryptionService`/`CryptoConverter` start with SHA-256 of a public string. Other profiles use `:` (empty) and fail fast. `EncryptedStringConverter` reads env only, so it fails closed (`KEY_NOT_CONFIGURED`).
- Rollback: V271 documents rollback; V298/V301 have none (sentinel is one-way without the missing endpoint).
- Logging: no plaintext logged; decrypt failures log stack traces without values; Base64 error messages can echo one character (Low, not filed).

## C. Secrets

Tools: gitleaks and trufflehog not installed. Used `scripts/secgate/secret_scan.py` (13 regex rules plus entropy filter) over tree (tracked + untracked, excludes node_modules, build output) and `git log -300 -p`.

- Tree: 75 raw hits triaged (`logs/NU-SEC-GATE-C1-tree-scan.txt`): 55 JWT literals, 20 generic. No cloud keys, private keys or live tokens. All JWT hits are Playwright storage-state files (below), the rest are test fixtures, CI-only values (`e2e.yml:35-37` labelled test-only), agent docs, and `infra/deployment/kubernetes/secrets.yaml` which is an explicit `CHANGEME` base64 placeholder template.
- History (last 300 commits): 10 hits, all one commit `5a61f9a4` (2026-09-30): 9 `qa-reports/playwright-rbac/latest/auth-*.json` (`logs/...C2`).
- DEF-18 (Low): 18 auth-state files are tracked (`qa-reports/playwright-rbac/latest/auth-*.json`, `frontend/e2e/.auth/*.json`) including SUPER_ADMIN and TENANT_ADMIN access+refresh JWTs. All expired (access 32 and 203 days ago, refresh 31 and 202 days ago), domain `localhost`, HS384/HS512. Not exploitable now. Remove from git, add to `.gitignore`; rotate the JWT secret only if the local secret was ever reused elsewhere.
- No tracked `.env` (only `*.env.example`), no `.pem/.p12/.jks/service-account` files, none added in the last 300 commits.
- Literal defaults in config: only dev/local (`DEV_REDIS_PASSWORD`, monitoring compose `POSTGRES_PASSWORD:-hrms_pass`). Compose prod files use `:?` correctly (valid in compose).
- Rotation evidence (metadata only): none in repo; secret stores are remote. BLOCKED.

## D. Demo logins

Mechanisms: Flyway placeholder `${demoCredentialsEnabled}` (base `false`, `dev`/`demo` `true`; `application.yml:131`, `dev:95`, `demo:10`, `prod:109`); neutralizers V270, V272, V295, V299, V314, V315 (hash-exact on 3 known bcrypt digests, set `LOCKED_DEMO_CREDENTIAL_*` + SUSPENDED); runtime gate in `AuthService.java:119-151,299`; ungated seeds V291 (tenant.admin) and V312 (finance); V315 seeds admin@; FE quick-login panel.

- Fresh prod config proof (DEF none, PASS): applied all 330 migrations to a throwaway DB with flag `false` (0 SQL errors); all 20 seeded users are SUSPENDED with locked sentinel, 0 ACTIVE accounts authenticate with the documented demo password (`logs/NU-SEC-GATE-D1`, `D2`). Throwaway DB dropped. Side effect: a fresh prod DB has no usable admin (both owner SUPER_ADMIN accounts suspended); an admin bootstrap/reset procedure is needed.
- Users that exist regardless of flag: all 20 (rows are seeded by ungated V49-era migrations and V291/V312); the flag only changes status/hash. Google SSO honours status (`AuthService.java:449`) and domain restriction.
- DEF-07 (Medium) gating is hash-exact. Any demo account re-set to the same password (new salt) matches neither the migrations nor the runtime gate. Local check: 20 known-digest accounts, 0 re-salted (`logs/...D3`). Prod unknown.
- DEF-01 (High) FE exposure: `frontend/app/auth/login/page.tsx:46` `IS_DEMO_MODE = NEXT_PUBLIC_DEMO_MODE !== 'false'`, `:146` password literal, `:303` password printed in UI hint, `:815` panel. Built chunk `frontend/.next/static/chunks/app/auth/login/page-*.js` contains the literal. `render.yaml` sets `false` for the Render FE; the Vercel project env is unknown (remote BLOCKED).
- R1 (Critical-if-true, BLOCKED): `MEMORY.md` records demo logins (`arun@`, with the shared password) working on the Vercel prod URL on 2026-06-25, after `DEMO_CREDENTIALS_ENABLED=false` was set on Railway 2026-06-24. If prod still has ACTIVE demo or SUPER_ADMIN/TENANT_ADMIN accounts with the public password, that is a public admin login. Needs authorization to verify: DB query `select email,status from users where status='ACTIVE' and password_hash in (<3 digests>)` plus a bundle check on the live site.

## E. Pom/dependency pins vs Spring Boot 3.5.14 (no mvn run)

- Parent `spring-boot-starter-parent 3.5.14` (`pom.xml:21-26`). Overrides in `backend/pom.xml:57-58,64-67`: Tomcat 10.1.59, Netty 4.1.137.Final, bcprov-jdk18on 1.85 (CVE comments). Live jar (`target/hrms-backend-1.0.0.jar`, inventory `logs/NU-SEC-GATE-E1-jar-inventory.txt`) matches: tomcat-embed 10.1.59, netty 4.1.137, bcprov 1.85, spring-webmvc/core 6.2.18, security 6.5.10, jjwt 0.13.0, jsoup 1.22.2.
- DEF-12 (Medium): `bcpkix`/`bcutil` stay at 1.72 while `bcprov` is pinned to 1.85 (mixed BouncyCastle); `opensaml-* 4.3.2` is an old line; `poi-ooxml-full 5.5.1` alongside `poi-ooxml 5.4.1`.
- DEF-13 (Medium): per `docs/security/gate-status-2026-10-10.md`, CVE-2026-47884/47890 in spring-webmvc 6.2.x are fixed only in Spring 7; no decision recorded and `.trivyignore` has no entry. Not independently re-verifiable offline.
- DEF-05 (High): frontend `npm audit --omit=dev` (run today in `frontend/`): installed next 16.3.8 (critical: unauthenticated RCE in image optimization when SVG is used; `dangerouslyAllowSVG` not set in `next.config.js`, which likely limits exposure but the version is in range), dompurify 3.4.16 (critical, sanitizer bypasses, this is the FE XSS defence), follow-redirects 1.16.0 (high), zod <4.6.6 (high), uuid (moderate). `npm audit fix` is available for next/dompurify/follow-redirects; `package.json` ranges `^16.2.7`, `^3.3.1` allow it. Same output in `logs/NU-FE-004-audit.txt` (fe-static agent).
- Docs drift (not security): `.claude/CLAUDE.md` lists JJWT 0.12.6, POI 5.3.0, OpenPDF 2.0.3, springdoc 2.7.0; poms say 0.13.0, 5.4.1, 3.0.4, 2.8.0.

## F. Controlled OWASP probes (local stack, demo users, one login each; test user for brute force)

Accounts used: `arun@` (EMPLOYEE) 3 logins, `jagadeesh@` (HR_MANAGER) 3 logins, plus NUAURA_TEST_ users `nuaura_test_secgate@`, `nuaura_test_secgate2@` (see `test-data-secgate.md`). Real-owner accounts not used. Side effect: my probes and 429-retries consumed the shared per-IP AUTH bucket (5/min) and other agents saw 429s; no account was locked (the lockout test hit only my test user).

| ID | Scenario | Result | Status | Sev | Evidence |
|---|---|---|---|---|---|
| 060 | Security headers BE/FE | Present, see A9. HSTS n/a on http | PASS | Low (DEF-21) | F01 |
| 061 | Actuator exposure | `dev` only: health (details), info, metrics, prometheus open; env/heapdump/beans/mappings/threaddump 403; swagger UI and `/api-docs` open (dev). prod `show-details: never`; render springdoc off | PASS for prod/render config; FAIL if dev profile reaches a deployment (DEF-11) | Medium | F02 |
| 062 | CORS | Foreign origins rejected | PASS | - | F03 |
| 063 | Error and stack-trace leakage | No traces. `GET /leave-requests?status=BOGUS` echoes `No enum constant com.nulogic.dom...`; `IllegalArgument/IllegalStateException` handlers echo `getMessage()` (`GlobalExceptionHandler.java:366-395`) | FAIL (minor) | Low (DEF-17) | F04, F15 |
| 064 | Unauthenticated surface | 20 protected paths 401; mutating 403 CSRF; permitAll set matches `SecurityConfig` | PASS | - | F05 |
| 065 | Controllers lacking authz annotation | 46/1794, none unexpected except directory search | PASS (DEF-10 filed) | Medium | F06 |
| 066 | CSRF double-submit | No token 403, wrong token 403, correct token reaches authz (403 permission), foreign Origin 403 | PASS | - | F08 |
| 067 | JWT tamper | alg=none (3 forms), modified sub, roles=SUPER_ADMIN with old sig, stripped/truncated sig, random key, 7 weak-key guesses: all 401 | PASS | - | F09 |
| 068 | Bearer header fallback | Off: Bearer without cookie 401 | PASS | - | F09 |
| 069 | Token-type confusion | Refresh token as access token 401 | PASS | - | F09 |
| 070 | Post-logout reuse | Access and refresh tokens 401 after logout, also pre-refresh access token | PASS | - | F12 |
| 071 | Refresh rotation | New tokens differ; replay of old refresh 401 | PASS | - | F12 |
| 072 | Refresh reuse detection | After old-token replay the new refresh token still works (no family revoke); old access token valid until exp (90 min) after refresh | FAIL | Low (DEF-19) | F12 |
| 073 | Open redirect | `sanitizeReturnUrl` (`login/page.tsx:159-170`) rejects `//`, schemes, backslash, `@`. Backend redirects use configured `frontendUrl` only | PASS (static) | - | code |
| 074 | SSRF static | `SsrfProtectionUtils` https-only, literal/decimal/hex/octal IPs, resolves all addresses, blocked metadata hosts; webhook delivery disables redirects; resume fetch re-validates each hop | PASS (static) | - | code |
| 075 | SSRF live via webhook create | 403 for HR_MANAGER (needs `SYSTEM:ADMIN`) | NOT TESTED | - | F17 |
| 076 | SQLi static | 0 concatenated queries; 27 native | PASS | - | grep |
| 077 | SQLi live | See A12 | PASS | - | F15 |
| 078 | Stored XSS (self-service address) | Raw HTML accepted and returned; original restored | PASS-by-design / Low (DEF none, see A11) | Low | F16 |
| 079 | Stored XSS announcements/wiki | 403 for demo HR_MANAGER | NOT TESTED | - | F16 |
| 080 | File upload | 11 MB -> 413. Type/magic/traversal/other-employee cases 403 (no `DOCUMENT:UPLOAD`) | 413 PASS; rest BLOCKED | - | F13 |
| 081 | Mass assignment `/employees/me` | 14 privileged extras (salary, tenantId, role, status, managerId...) sent: no field changed. DTO has only profile fields | PASS | - | F11 |
| 082 | Mass assignment entity-bound bodies | LMS/statutory reset tenant+id; updates replace full entity and let privileged callers set status/counters | FAIL (static) | Low (DEF-22) | code |
| 083 | Malformed input authenticated | 400s with clean envelopes | PASS | - | F15 |
| 084 | Password reset design | 256-bit token, BCrypt hash stored, 1h expiry, single use (`AuthService.java:889-990`). Reset scans every unexpired hash with BCrypt per request | PASS / Low (DEF-16) | Low | code |
| 085 | Forgot-password enumeration | Identical 200 body and timing (3-4 ms) for existing and unknown | PASS | - | F14 |
| 086 | AUTH rate limit | 5 then 429 | PASS | - | F14b |
| 087 | XFF rotation bypass | Fixed XFF: 429 from #6; rotating XFF: 8x 401, never 429 | FAIL (local) | Medium (DEF-08) | F14b |
| 088 | PUBLIC rate limit | 429 at request 21 | PASS | - | F18 |
| 089 | Lockout / captcha gate | After 3 failures login returns `captcha-required` even for correct password and with an arbitrary captcha token; 5-strike hard lock not reachable behind the gate | INCONCLUSIVE | - | F14, F14b |
| 090 | Audit tamper via API | No mutating audit endpoint; reads need `SYSTEM_ADMIN` | PASS | - | code |
| 091 | Audit tamper at DB | `hrms_user` has INSERT/UPDATE/DELETE/TRUNCATE on `audit_logs`, no trigger | FAIL | Medium (DEF-09) | A01 |
| 092 | IDOR employee by id | 403 x6 | PASS | - | F10 |
| 093 | EMPLOYEE authz sample | 14 privileged GETs 403/404; leave-requests/departments 200 (own scope) | PASS | - | F10 |
| 094 | Directory search exposure | `POST /employees/directory/search` has no `@RequiresPermission`; EMPLOYEE gets personalEmail, phoneNumber, exitDate, joiningDate, managerId, status for tenant rows | FAIL | Medium (DEF-10) | F10 |
| 095 | WebSocket origin/auth | `WebSocketConfig.java:101-104` `setAllowedOriginPatterns` + handshake interceptor; `/ws/info` `*:*` is SockJS static info | NOT TESTED live | - | code |
| 096 | FE admin gating forged JWT | See A5 | FAIL | Low (DEF-20) | A05 |
| 097 | Webhook signatures live | See A18 | PASS | - | F18 |

## Reproduction (High)

- **DEF-01**: `cd frontend && grep -lF "<demo-password>" .next/static/chunks/app/auth/login/page-*.js` returns the chunk; source `app/auth/login/page.tsx:46,146,303,815`. Fix: default demo off (`=== 'true'`), delete password literal and hint, add a CI step that fails if the literal appears in `.next/static`.
- **DEF-02**: `sed -n 215p backend/src/main/resources/application-render.yml`; run `logs/NU-SEC-GATE-B1-converter-sentinel-probe.txt` last line (Spring resolves `${X:?msg}` to a literal starting with `?`). Fix: `${APP_SECURITY_ENCRYPTION_KEY}` with no default (or `:` empty as in `application.yml`), and a startup check rejecting a key equal to the placeholder.
- **DEF-03**: `grep -rn "reencrypt\|UNENCRYPTED\|PLAINTEXT_PENDING" backend/src/main/java` returns nothing; V298 and V301 reference the missing endpoints. Run the probe output lines 1-5. Fix: implement the endpoints and strip sentinels in the converter read path (or stop writing sentinels), fix the `%:%` predicate to test real ciphertext shape.
- **DEF-04**: read `EncryptionBackfillService.java:53,77-83,122,157` (all plaintext-only predicates). Fix: add a rotation job that decrypts-with-either and rewrites under the current key for every converter column, report remaining rows by trial-decrypt, add previous-key support to `EncryptionService`, add an integration test of full rotation.
- **DEF-05**: `cd frontend && npm audit --omit=dev` shows 6 vulnerabilities; `node -p "require('./node_modules/next/package.json').version"` -> 16.3.8. Fix: `npm audit fix` for next, dompurify, follow-redirects; zod 4.6.7 and exceljs/uuid need a planned bump.

## Not tested / blocked (reason)

Remote hosts and live TLS, Railway env values, prod DB state, secret rotation evidence (remote, needs authorization); upload type/magic/traversal and webhook SSRF live (needs HR_ADMIN / SYSTEM_ADMIN login, avoided to protect shared bucket and owner accounts); stored-XSS on announcements and wiki (permissions); WebSocket handshake/origin live; password-reset email delivery (SMTP down locally); 5-strike lockout (behind captcha gate); PUBLIC-form captcha behaviour on the `render` profile (needs a render-profile instance, forbidden locally); Testcontainers-based security tests (Docker down); mvn-run unit tests of converters and RBAC coverage (owned by another agent).
