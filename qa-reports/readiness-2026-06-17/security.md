# Security Audit Report — NU-AURA
**Date:** 2026-06-17
**Branch:** main
**Scope:** Code-inspection only. Items requiring live verification are tagged [RUNTIME-NEEDED].

---

## Summary

Full OWASP Top 10 code inspection performed against NU-AURA (Spring Boot 3.5.14 / Java 21 backend, Next.js 16 / React 19 frontend). Coverage sources: JWT/session/cookie layer, auth service, security config, Flyway migrations, rate limiting, XSS mitigations, SSRF protections, CORS config, secret handling, PII encryption inventory, file upload, frontend middleware (proxy.ts), and CSP.

The platform has a mature security baseline: BCrypt cost 12, double-submit CSRF, httpOnly `__Host-` cookies, per-request CSP nonce, DOMPurify on all `dangerouslySetInnerHTML`, parameterized SQL, SSRF allowlists, and CORS wildcard rejection. One production-blocking migration ordering defect (V291 creates TENANT_ADMIN with `Welcome@123` unconditionally, after V270's neutralization window has already closed) and a plaintext PII column set require remediation before production go-live.

---

## Findings

| ID | Severity | Title | Evidence (file:line) | Needs |
|----|----------|-------|----------------------|-------|
| SEC-001 | CRITICAL | V291 seeds TENANT_ADMIN with `Welcome@123` unconditionally — V270 neutralization window already closed by the time V291 runs on a fresh install | `db/migration/V270__neutralize_demo_credentials_outside_demo.sql` (full file), `db/migration/V291__seed_demo_tenant_admin_user.sql` (full file — no `${demoCredentialsEnabled}` guard, uses hash `$2a$10$Yz2j...` which V270 targets but cannot neutralize post-facto) | Fix: wrap V291 INSERT in a `${demoCredentialsEnabled}` conditional or create V295 that neutralizes the V291 account when demo mode is off |
| SEC-002 | CRITICAL | Multiple plaintext PII columns — candidate email/phone/resume_url, PF UAN/PF numbers, ESI numbers/IP numbers, contract signer_email, benefit claim UPI ID | `docs/obsidian/06-Database/Data-Dictionary.md` (encryption inventory section); `Candidate.java` entity (no `@Convert(converter=EncryptedStringConverter.class)` on email/phone/resume_url fields); `employee_pf_records`, `employee_esi_records` tables per Data-Dictionary | Add `EncryptedStringConverter` to missing fields; write Flyway migration to re-encrypt existing rows |
| SEC-003 | MEDIUM | JWT decoded in Next.js middleware (proxy.ts) WITHOUT signature verification — forged JWT with `SUPER_ADMIN` role claim bypasses all frontend route guards (backend API calls remain protected) | `frontend/proxy.ts` (JWT decode section, no signature check — documented as intentional) | [RUNTIME-NEEDED] Confirm backend consistently rejects forged tokens on every protected endpoint; consider switching middleware to opaque session cookie |
| SEC-004 | MEDIUM | Hardcoded fallback demo-tenant UUID in AuthService — if `APP_AUTH_DEFAULT_TENANT_ID` env var is not set, auth falls back to the well-known seeded demo-tenant UUID `550e8400-e29b-41d4-a716-446655440000` | `backend/src/main/java/com/nulogic/application/auth/service/AuthService.java:@Value("${app.auth.default-tenant-id:550e8400-e29b-41d4-a716-446655440000}")` | Require env var at startup (no default); document Railway/GKE required vars |
| SEC-005 | MEDIUM | Hardcoded demo-tenant UUID compile-time constant in HrmsRoleInitializer — `DEFAULT_TENANT_ID = UUID.fromString("550e8400-...")` | `backend/src/main/java/com/nulogic/application/platform/service/HrmsRoleInitializer.java` (static constant) | Replace with env-var-driven value; fail fast on missing config |
| SEC-006 | MEDIUM | `DEMO_CREDENTIALS_ENABLED=true` default in `application-demo.yml` — Railway runs the `demo` profile; manual env-var override required for true production | `backend/src/main/resources/application-demo.yml:demoCredentialsEnabled: ${DEMO_CREDENTIALS_ENABLED:true}` | [RUNTIME-NEEDED] Verify Railway env var `DEMO_CREDENTIALS_ENABLED=false` is set; add startup assertion that rejects boot when demo creds enabled + prod profile active simultaneously |
| SEC-007 | MEDIUM | Demo password `Welcome@123` hardcoded in frontend bundle — `DEMO_PASSWORD` constant is included in compiled JS even when `NEXT_PUBLIC_DEMO_MODE !== 'true'` (tree-shaking not guaranteed for string constants) | `frontend/app/auth/login/page.tsx:124: const DEMO_PASSWORD = IS_DEMO_MODE ? 'Welcome@123' : '';` | Move to server-side only; use empty string + dead-code elimination or separate demo build; [RUNTIME-NEEDED] verify bundle does not include the literal string when DEMO_MODE=false |
| SEC-008 | LOW | `getOriginalFilename()` used for extension check in file upload without sanitizing path separators or null bytes | `backend/src/main/java/com/nulogic/api/attendance/controller/AttendanceController.java:437` | Substantially mitigated by Google Drive storage (no local FS write); add `FilenameUtils.getName()` sanitization for defense-in-depth |
| SEC-009 | LOW | Actuator endpoints `/actuator/health`, `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus` exposed — Prometheus requires scrape token but health/info/metrics are `permitAll` | `backend/src/main/resources/application.yml` (actuator exposure); `SecurityConfig.java` (actuator permit list) | [RUNTIME-NEEDED] Confirm health/info endpoints do not leak internal infrastructure details (DB host, internal IPs) in their responses on Railway |
| SEC-010 | LOW | HSTS header set by Next.js middleware only when `NODE_ENV === 'production'` AND `https:` — if Vercel proxy strips the scheme detection, HSTS may not emit | `frontend/proxy.ts` (HSTS condition) | [RUNTIME-NEEDED] `curl -I https://hrms-frontend-vert.vercel.app` and verify `Strict-Transport-Security` header is present |

---

## Live checks for orchestrator

Run these against the production/staging stack before sign-off.

```bash
# SEC-001 — Verify TENANT_ADMIN account is not active with known hash on prod DB
# Connect to Railway Postgres and run:
SELECT email, status, LEFT(password_hash, 20) FROM users WHERE email = 'tenant.admin@nulogic.io';
# PASS: status = 'SUSPENDED' or password_hash starts with 'LOCKED_DEMO_CREDENTIAL_'
# FAIL: status = 'ACTIVE' and password_hash starts with '$2a$10$Yz2j'

# SEC-003 — Verify backend rejects forged JWT with SUPER_ADMIN role
FORGED_JWT=$(node -e "
  const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const p = Buffer.from(JSON.stringify({sub:'00000000-0000-0000-0000-000000000001',roles:['SUPER_ADMIN'],exp:9999999999})).toString('base64url');
  console.log(h+'.'+p+'.invalidsignature');
")
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: __Host-hrms-access=${FORGED_JWT}" \
  https://nu-aura-backend-production.up.railway.app/api/v1/admin/tenants
# PASS: 401 or 403
# FAIL: 200

# SEC-006 — Verify demo credentials flag is false in Railway
curl -s https://nu-aura-backend-production.up.railway.app/actuator/env | grep -i demo
# PASS: demoCredentialsEnabled = false
# FAIL: demoCredentialsEnabled = true (or endpoint returns env data unfiltered — itself a finding)

# SEC-007 — Verify Welcome@123 not in production JS bundle
curl -s https://hrms-frontend-vert.vercel.app/_next/static/chunks/app/auth/login/page*.js | grep -c 'Welcome@123'
# PASS: 0
# FAIL: > 0

# SEC-009 — Check actuator health endpoint for info leakage
curl -s https://nu-aura-backend-production.up.railway.app/actuator/health | python3 -m json.tool
# PASS: only {status: UP/DOWN}, no DB URLs, no internal IPs
# FAIL: response contains db.url, host, or internal details

# SEC-010 — Verify HSTS header present on Vercel frontend
curl -sI https://hrms-frontend-vert.vercel.app | grep -i strict-transport
# PASS: Strict-Transport-Security: max-age=...
# FAIL: header absent
```

---

## Security Coverage score (0-100)

**Score: 72 / 100**

### Justification

| Area | Weight | Score | Notes |
|------|--------|-------|-------|
| Authentication (JWT, MFA, lockout, bcrypt) | 15 | 13 | Strong: httpOnly `__Host-` cookies, BCrypt-12, MFA single-use pre-auth token, account lockout. Deducted: middleware JWT forgery gap (SEC-003) |
| Authorization (RBAC, multi-tenancy, RLS) | 15 | 12 | RLS tx-local fix committed; cross-tenant IDORs previously fixed. Deducted: `__Host-` cookie trust on SUPER_ADMIN middleware bypass untested at runtime |
| Secret/credential management | 10 | 5 | JWT_SECRET and ENCRYPTION_KEY have no defaults (correct). Deducted heavily: V291 unconditional seeding (SEC-001), hardcoded tenant UUID defaults (SEC-004/005), Welcome@123 in bundle (SEC-007) |
| Input validation / injection prevention | 15 | 14 | Parameterized SQL throughout; DOMPurify on all dangerouslySetInnerHTML; SSRF allowlists; Zod on frontend forms. Minor deduction: filename sanitization gap (SEC-008) |
| PII/data encryption | 10 | 4 | EncryptedStringConverter applied to 10 entities but major PII columns unencrypted (SEC-002): candidate PII, PF/ESI statutory IDs, UPI ID |
| Security headers / CSP / CORS | 10 | 8 | Per-request CSP nonce, CORS wildcard rejected, OWASP headers at both layers. Deducted: HSTS conditional (SEC-010) needs runtime verification |
| Rate limiting / DoS prevention | 10 | 9 | Bucket4j + Redis Lua, 5/min auth, 100/min API, 5/5min export. Prometheus scrape token protected. Minor deduction: no verified WAF at edge |
| Logging / monitoring / alerting | 10 | 5 | Prometheus + Grafana present in infrastructure. Deducted: no evidence of security-event-specific alerting (failed auth spikes, RLS violations) in code inspection |
| Dependency security | 5 | 4 | Spring Boot 3.5.14 BOM; CI Trivy gates present. Minor deduction: npm audit not verified in this pass |
| Demo/test credential hygiene | 5 | 2 | V270 gate exists but V291 ordering defect (SEC-001) and Railway env flag dependency (SEC-006) are unresolved |

---

## What has NOT been verified

The following could not be determined from code inspection alone and require runtime confirmation:

1. **V291 account status on current Railway DB** — Whether the TENANT_ADMIN account is already neutralized from a prior manual action or an earlier run of V270 in a non-fresh install.
2. **Backend rejection of forged JWTs** — API-level signature validation tested only via code path tracing, not live request.
3. **DEMO_CREDENTIALS_ENABLED env var in Railway** — Flagged as known blocker in project memory; actual current Railway config not verified.
4. **Welcome@123 literal presence in Vercel production bundle** — JS bundle minification and tree-shaking behavior not confirmed.
5. **Actuator endpoint response content** — Whether health/info endpoints expose internal infrastructure details in practice.
6. **HSTS header presence on Vercel frontend** — Conditional code path verified; actual header emission not confirmed.
7. **npm audit** — No dependency CVE scan was run in this pass.
8. **ClamAV reachability on Railway** — `fail-open: false` in prod.yml but ClamAV service must actually be reachable; not verified.
9. **Redis SSL in Railway** — `redis.ssl.enabled: true` defaults set; actual Railway Redis TLS endpoint not confirmed.
10. **Security-event alerting** — Prometheus scrape endpoint confirmed protected; whether alert rules exist for auth anomalies not confirmed.
