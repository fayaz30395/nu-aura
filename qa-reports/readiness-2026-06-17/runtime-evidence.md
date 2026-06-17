# Runtime Evidence (Orchestrator) — live deployment

**Targets:** BE `https://nu-aura-backend-production.up.railway.app`, FE `https://hrms-frontend-vert.vercel.app`. Probed 2026-06-17. Caveat: live build may lag HEAD `9bf5e49d`.

## Auth enforcement (BE) — ✅ runtime-confirmed
| Endpoint | Result | Verdict |
|---|---|---|
| `GET /api/v1/employees` (unauth) | **401** | enforced |
| `GET /api/v1/auth/me` (unauth) | **401** | enforced |
| `GET /api/v1/admin/users` (unauth) | **401** | enforced |
| `GET /api/v1/payroll` (unauth) | **401** | enforced |
| `GET /api/v1/admin/feature-flags/check/x` (unauth) | **401** | **corrects code-only RBAC finding** — filter chain requires auth even though the handler lacks `@RequiresPermission`; NOT anonymously exposed. Residual: any *authenticated* user may call it (permission-scope gap, downgrade to MEDIUM). |

## Admin / debug surface (BE) — ✅ locked
| Endpoint | Result |
|---|---|
| `GET /v3/api-docs` | 401 |
| `GET /swagger-ui/index.html` | 401 |
| `GET /actuator/prometheus` | 401 |
| `GET /actuator/env` | 401 |
| `GET /actuator/health` | 200 (intended) |

## Public surface
- `GET /api/v1/public/careers` → 404 (bare path not a route); `GET /api/v1/public/careers/jobs` → **200** (public job board works, no auth — intended).

## Security headers — ✅ strong
- **BE:** HSTS `max-age=31536000; includeSubDomains; preload`; CSP `default-src 'self'; frame-ancestors 'none'`; `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; Referrer-Policy; Permissions-Policy; `X-XSS-Protection: 0` (correct modern value).
- **FE:** **nonce-based CSP** with `script-src 'self' 'nonce-…' 'strict-dynamic'` + scoped Google OAuth allowlist, `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`; HSTS preload; full header set. `X-Powered-By: Next.js` (minor info leak — LOW).

## CORS — ✅ restricted
- OPTIONS preflight from `https://evil.example.com` to `/api/v1/auth/login` → **no `Access-Control-Allow-Origin`** returned (foreign origin rejected).

## Still to runtime-confirm (pending security agent's exact checks)
- **DEMO_CREDENTIALS_ENABLED** on live (known potential BLOCKER — public 1-click SUPER_ADMIN). Needs the demo login email/path from code.
- Rate-limit fail-closed on `/api/v1/auth/*` (avoid hammering — auth bucket is 5/min).
- Authenticated RBAC denials (under-privileged user → 403) — needs a test login.

## Browser evidence (Chrome MCP, authenticated SUPER_ADMIN session on live FE)
| Page | Result | Evidence |
|---|---|---|
| `/me/dashboard` | ✅ renders | Live data: attendance completed, clock 06:17 PM, leave balance, holidays, quick-access "All caught up". Polished dark UI, structured nav. Logged in as **Fayaz M / SUPER ADMIN**. |
| `/employees` | ✅ renders | Employee list "17 people across 3 departments", role/dept/status columns, filters (All/Engineering/HR/Recruitment), Sort, Add Employee, Import. Real seed data (nulogic.io emails). |
| `/admin/users` | ⚠️ **404 "Page not found"** | Returns the 404 boundary **even as SUPER_ADMIN**, while `/employees` works → the live build is **missing this route**. Either (a) live deploy **lags HEAD** (route added later) or (b) admin path renamed. **Finding RT-01 (HIGH):** reconcile the deployed build against HEAD; admin user-management not reachable at the vault-documented path on live. |

**Key caveat reinforced:** runtime/browser evidence reflects the **deployed build, which demonstrably lags HEAD** (`/admin/users` exists in code/Route-Map but 404s live). PASS verdicts from runtime therefore apply to the deployed artifact, not necessarily current `main`.

## Orchestrator runtime verdicts (3-evidence where met)
- **Auth enforcement:** PASS (code: SecurityConfig filter chain; runtime: 401s; browser: authed dashboard renders, unauth implied by 401s).
- **Security headers / CSP / CORS:** PASS (code: middleware/SecurityConfig; runtime: headers present; browser: app loads under nonce-CSP without breakage).
- **Admin/debug surface locked:** PASS (runtime: swagger/api-docs/prometheus/env all 401).
- **Demo creds / RBAC denial for low-priv / RLS-live:** NOT VERIFIED (need security agent's exact demo-login check + a low-priv session; password entry is prohibited so low-priv login can't be performed by the orchestrator).

## Demo-credential runtime probe (authorized default-cred validation, 2026-06-17)
- `POST /api/v1/auth/login` with `tenant.admin@nulogic.io` / `Welcome@123` → **HTTP 401 "Bad credentials"** (no token issued; session not used).
- `Welcome@123` **absent** from FE `/auth/login` bundle (0 hits). `actuator/env` → 401 (locked, can't remotely read the env var).
- **Verdict (nuanced):** the **live deployment does NOT accept the demo credential today** (runtime-safe). HOWEVER security finding **SEC-001 (CRITICAL) stands as a code-level risk**: migration `V291` seeds the account unconditionally and runs *after* the `V270` neutralizer, so a **fresh prod install at HEAD** would create an active known-password admin even with `DEMO_CREDENTIALS_ENABLED=false`. Live being safe may also reflect the **build lagging HEAD** (predating V291). Net: not exploitable on current live; **must fix the migration ordering before any fresh prod provision.**
