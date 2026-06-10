# NU-AURA Security Audit — 15-Dimension Findings (Read-Only)

**Date:** 2026-06-09 · **Auditor:** Auditor-Security (read-only, no fixes applied)
**Scope:** CORS, security headers (FE + Spring), file upload, JWT/cookie/token, input validation,
output encoding/XSS, secrets, dependency CVEs, PII, sensitive logging, rate limiting, session mgmt.
**Out of scope (KNOWN-CLOSED, guards confirmed present):**
- RLS cross-tenant leak — FIXED commit `0ea63f6e`; `RlsTenantGucScopeTest` build-guard present.
- `Welcome@123` demo seeds — mitigated by Flyway V270 + prod gate.
- SuperAdmin (SYS) RBAC bypass — BY DESIGN, not flagged.

---

## Security Score: 86 / 100

**Rationale.** The backend security posture is mature and defense-in-depth is real, not cosmetic:
- **CORS** is fully locked down — explicit origin allow-list, runtime guards that *throw* on `*`
  for both REST (`SecurityConfig.corsConfigurationSource` :287-296) and WebSocket
  (`WebSocketConfig` :93-102). No `@CrossOrigin("*")` survives anywhere (the only hit is a
  removal comment).
- **Security headers** present and correct on both tiers: Spring sets CSP, HSTS (1yr,
  includeSubDomains), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
  (`SecurityConfig` :148-173); FE sets the same set in `next.config.js` :134-148 with a
  **nonce-based CSP** authored in `proxy.ts` (single source of truth, no duplicate CSP).
- **Cookies/JWT** are exemplary: httpOnly + Secure + SameSite, `__Host-` prefix support,
  refresh-token rotation, CSRF double-submit at SameSite=Strict (`CookieConfig.java`),
  `TokenBlacklistService` wired into `JwtTokenProvider`/`AuthService`, `JwtSecretValidator`
  rejects unset/short/default secrets at startup.
- **File upload** is hardened: content-type allow-list + per-type size caps + **magic-byte
  verification** + filename sanitization + Content-Disposition injection guard + tenant-ownership
  guard on every read/delete (`FileStorageService.java`, `FileUploadController.java`).
- **XSS**: all 9 user-data `dangerouslySetInnerHTML` sinks route through `sanitizeHtml` /
  `sanitizeEmailHtml` / `sanitizeAnnouncementHtml` helpers; DOMPurify is a dependency. The 2
  un-sanitized sinks are static framework content (theme nonce script, Mantine style block).
- **No hardcoded secrets** in `backend/src/main` or `frontend/src` (grep clean).
- **Sensitive logging**: no plaintext passwords/tokens/PII logged; secret-related log lines log
  only key names, lengths, or outcomes.

**Deductions (-14):** Spring Boot **3.4.7** parent is several patch releases behind current 3.4.x
and carries fixable framework CVEs (-7). 17 of 472 `@RequestBody` params lack `@Valid` (-3). Virus
scan is **fail-open by default** (`app.security.virusscan.fail-open=true`) (-2). Stale/misleading
BOM-version comment claiming 3.5.14 (-1). Minor PII (email) in one info log (-1).

---

## CRITICAL

_None._ No exposed secrets, no wildcard CORS, no unauthenticated sensitive endpoints, no missing
tenant guards on file IO, no SQL-string-concat sinks observed in audited paths.

---

## HIGH

| ID | Dimension | Evidence (file:line) | Impact | Recommended Fix | Auto-fixable |
|----|-----------|----------------------|--------|-----------------|--------------|
| H-1 | Dependency CVE | `pom.xml:24` (`spring-boot-starter-parent` 3.4.7) | 3.4.7 (early-2025) is behind current 3.4.x; inherits framework-level CVEs patched in later 3.4.x (Spring Framework / Tomcat / Jackson transitive fixes) | Bump parent to latest 3.4.x patch (or vetted 3.5.x line per stack lock); run `mvn versions:display-dependency-updates` + OWASP dependency-check | **Y** (version bump; verify build/tests) |
| H-2 | Input validation | 17 of 472 `@RequestBody` sites lack `@Valid` (`grep @RequestBody` minus `@Valid` across `backend/src/main`) | Unvalidated request bodies bypass Bean Validation at the boundary; malformed/oversized field values reach service layer | Add `@Valid` to the 17 `@RequestBody` params whose DTOs carry constraints; add constraints to DTOs that have none | **Y** (mechanical annotation add per site) |

---

## MEDIUM

| ID | Dimension | Evidence (file:line) | Impact | Recommended Fix | Auto-fixable |
|----|-----------|----------------------|--------|-----------------|--------------|
| M-1 | File upload | `FileStorageService.java:88` (`app.security.virusscan.fail-open:true`) | On scanner error the upload is **allowed** by default; a malware sample uploaded during scanner downtime is stored | Default `fail-open=false` for prod profile (code comment says prod sets false, but the compiled default ships true). Pin `false` in `application-prod.yml` and assert in a config test | **Y** (flip default / add prod override) |
| M-2 | Session mgmt / token | `CookieConfig.java:109` (`use-host-prefix:false` default) | Hardened `__Host-` cookie prefix is implemented but OFF by default; production still ships the legacy `access_token`/`refresh_token` names without the prefix-enforced Path/Secure/no-Domain guarantees | Set `app.cookie.use-host-prefix=true` in prod after auditing dual-emit call sites (rollover already supported) | **Y** (config flag in prod profile) |

---

## LOW

| ID | Dimension | Evidence (file:line) | Impact | Recommended Fix | Auto-fixable |
|----|-----------|----------------------|--------|-----------------|--------------|
| L-1 | PII / logging | `SamlAuthenticationSuccessHandler.java:102` (`log.info("...user {} ...", user.getEmail() ...)`) | User email (PII) written to info logs on every SAML login; log aggregation may retain PII beyond policy | Log a stable user id/UUID instead of email, or mask the local-part | **Y** |
| L-2 | Dependency hygiene | `backend/pom.xml:254` (comment "managed by spring-boot-dependencies BOM (3.5.14)") | Comment contradicts effective parent 3.4.7 (`pom.xml:24`); misleads future audits about the real version | Correct the comment to the actual parent version | **Y** |
| L-3 | Output encoding | `frontend/app/fluence/search/page.tsx:622`, `learning/courses/[id]/play/page.tsx:227` | Sinks are sanitized, but they render server-supplied `highlightedContent`; sanitizer allow-list should be reviewed to ensure it strips `<script>`/`on*`/`javascript:` (defense-in-depth — currently relies on shared `sanitizeHtml`) | Add a unit test asserting `sanitizeHtml` strips script/event-handler/`javascript:` payloads | N (test authoring) |

---

## Dimension Coverage Summary

| Dimension | Verdict | Note |
|-----------|---------|------|
| CORS config | PASS | Explicit allow-list, throws on `*`, REST+WS |
| Security headers (Spring) | PASS | CSP/HSTS/XFO/nosniff/Referrer/Permissions |
| Security headers (FE) | PASS | next.config.js + nonce CSP in proxy.ts |
| File upload | PASS | type+size+magic-byte+filename+tenant guards (M-1 fail-open caveat) |
| JWT/cookie | PASS | httpOnly+Secure+SameSite, rotation, `__Host-` ready (M-2: off by default) |
| Token blacklist | PASS | `TokenBlacklistService` wired into provider + auth |
| Input validation (`@Valid`) | PARTIAL | 96% coverage; 17 gaps (H-2) |
| Output encoding / XSS | PASS | all user-data sinks sanitized; DOMPurify present |
| Secrets in code | PASS | grep clean; `JwtSecretValidator` startup guard |
| Dependency CVEs | NEEDS PATCH | SB 3.4.7 behind (H-1) |
| PII handling | MOSTLY PASS | one email-in-log (L-1) |
| Sensitive logging | PASS | no plaintext secrets/tokens/PII bodies |
| Rate limiting | PASS | `RateLimitingFilter` + `DistributedRateLimiter` (Redis Lua + Bucket4j) |
| Session mgmt | PASS | STATELESS, rotation, blacklist |
| CSRF | PASS | double-submit cookie, SameSite=Strict, skips webhooks/public |
