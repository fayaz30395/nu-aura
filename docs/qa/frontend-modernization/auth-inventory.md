# auth-inventory — Verified Employee Session (CANONICAL)

**Program:** NU-AURA Frontend Modernization — Studio Slate Elevation Layer
**Required by:** AUTH / EMPLOYEE SESSION step (precondition for Step 3 Visual Baseline + all runtime gates)
**Verified:** 2026-06-22 against live deployment

---

## STANDING RULE — always use the demo account

All runtime verification (visual baseline, network-parity capture, axe scans, screenshot diffs,
keyboard/landmark checks) **MUST use the low-privilege demo employee account below**. Do not use
admin/operator accounts for employee-facing verification, and do not attempt to create new users.

| Field | Value |
|-------|-------|
| **Canonical employee login** | `arun@nulogic.io` |
| **Password** | `Welcome@123` |
| **Roles** | `["EMPLOYEE"]` — pure low-privilege (no admin) |
| **userId** | `48000000-0e02-0000-0000-000000000009` |
| **employeeId** | `48000000-e001-0000-0000-000000000009` |
| **tenantId** | `660e8400-e29b-41d4-a716-446655440001` |
| **departmentId** | `48000000-de00-0000-0000-000000000003` |
| **appCode** | `HRMS` |

Backup pure-EMPLOYEE account: `anshuman@nulogic.io` / `Welcome@123` (roles `["EMPLOYEE"]`).
Do **not** use these for employee-facing baselines (they carry elevated roles):
`saran@nulogic.io` (EMPLOYEE+HR_ADMIN), `raj@nulogic.io` (EMPLOYEE+FINANCE_ADMIN).

---

## Where to run (HTTPS only — local cannot auth)

- **Live frontend (USE THIS):** https://hrms-frontend-vert.vercel.app — HTTPS, so the backend's
  `Secure` cookies are accepted by the browser. This is the only reachable authenticated surface.
- **Live backend:** https://nu-aura-backend-production.up.railway.app — health `{"status":"UP"}`.
- **Local dev** `:3000` serves HTML but **cannot authenticate**: backend sets `Secure` + `__Host-`
  cookies which the browser drops over plain HTTP. Use local only for static gates (tsc/test/lint/build),
  never for login-gated screenshots.

> SEC-3b status: demo logins are **still ENABLED on live** as of 2026-06-22 (login returns 200 + JWT).
> That is the owner's production security gate, not ours — but it means employee-session verification
> is currently possible. If the owner disables demo logins, runtime gates become unreachable → STOP
> and report per the program's STOP conditions.

## Login flow (UI — for browser MCP)

1. Navigate to https://hrms-frontend-vert.vercel.app (redirects to `/login` when unauthenticated).
2. Enter `arun@nulogic.io` / `Welcome@123`, submit.
3. Lands on the employee dashboard. Cookies set: `__Host-hrms-access`, `__Host-hrms-refresh`,
   `access_token`, `refresh_token`, `XSRF-TOKEN` (all `Secure`, access tokens `HttpOnly`).

## Login flow (API — for curl/parity scripting)

```
POST https://nu-aura-backend-production.up.railway.app/api/v1/auth/login
Content-Type: application/json
{"email":"arun@nulogic.io","password":"Welcome@123"}
→ 200, Set-Cookie: access_token (HttpOnly, 1h), refresh_token (24h), XSRF-TOKEN
```

## Employee-facing routes for verification (this session)

| Screen | Route |
|--------|-------|
| Employee Dashboard | `/dashboard` (post-login landing) |
| Employee Directory | `/employees` |
| Employee Profile (own) | `/employees/48000000-e001-0000-0000-000000000009` |
| Self-service profile | `/me/profile` |

## Permission source (for RBAC parity)

- JWT carries **roles only** (`["EMPLOYEE"]`); fine-grained permissions are loaded server-side from
  DB + Redis cache (per `.claude/CLAUDE.md` Security Config). FE gating is via `usePermissions` /
  `PermissionGate` / `AuthGuard` / `routes.ts` (the FROZEN RBAC spine — never modify in this program).
- Role→permission seed origin: `backend/.../db/migration/V265__restore_demo_user_roles_with_rls_context.sql`.

## Reproduce the role check

```bash
tok=$(curl -s -i -X POST https://nu-aura-backend-production.up.railway.app/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"arun@nulogic.io","password":"Welcome@123"}' \
  | grep -o 'access_token=[^;]*' | head -1 | cut -d= -f2)
echo "$tok" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null   # → claims incl. "roles":["EMPLOYEE"]
```
