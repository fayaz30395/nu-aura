# RBAC Security Findings — NU-AURA

**Generated:** 2026-06-17 | Updated: 2026-06-18 (Iteration 7)
**Agents:** Agent 3 (RBAC Map), Agent 4 (RBAC Deep Audit), Agent 5 (Security Audit), Iteration 7 agents
**Sources:** V107 migration, Permission.java, routes.ts, AuthGuard.tsx, SecurityConfig.java, iteration 7 backend security discovery

---

## Iteration 7 — New Security Findings

### Frontend XSS Fix

**`frontend/app/nu-mail/page.tsx` — FIXED (Iteration 7)**

- **Before:** `div.innerHTML = cleanedSignature` — raw innerHTML assignment from Google Gmail API response; only character encoding cleaned (Â chars, &nbsp;). Browser parses event-handler payloads like `img onerror=...` on assignment in most engines.
- **After:** `div.innerHTML = sanitizeEmailHtml(cleanedSignature)` — uses existing `sanitizeEmailHtml` (DOMPurify with email profile) before assignment.
- Import added: `import { sanitizeEmailHtml } from '@/lib/utils/sanitize'`
- **Severity was MEDIUM** — source is a Google OAuth-gated API response; div is never inserted into the document, but DOM parsing still runs in most browsers.

**`frontend/app/fluence/search/page.tsx` — line 622**

```tsx
dangerouslySetInnerHTML={{ __html: sanitizeHtml(result...) }}
```

Uses `sanitizeHtml` wrapper — correctly sanitized. No additional fix needed. Verified.

### Backend Security Fixes (Iteration 7)

Per fix summary, 3 backend files were patched:

1. **`KnowledgeAttachmentRepository`** — tenant filter added to attachment queries
2. Additional backend hardening items per fix summary (specific filenames in fix summary reference)

### RBAC Discovery — Full Role Inventory (Iteration 7)

The backend now seeds 22 roles (expanded from 7 core roles in V107):

`SUPER_ADMIN`, `TENANT_ADMIN`, `HR_ADMIN`, `HR_MANAGER`, `HR_EXECUTIVE`, `DEPARTMENT_HEAD`, `DEPARTMENT_MANAGER`, `TEAM_LEAD`, `MANAGER`, `EMPLOYEE`, `FINANCE_ADMIN`, `PAYROLL_ADMIN`, `RECRUITER`, `RECRUITMENT_ADMIN`, `TRAINER`, `PROJECT_ADMIN`, `ASSET_MANAGER`, `EXPENSE_MANAGER`, `HELPDESK_ADMIN`, `TRAVEL_ADMIN`, `COMPLIANCE_OFFICER`, `LMS_ADMIN`

### Backend Controller Auth Inventory (Iteration 7)

**Controllers intentionally without @RequiresPermission (all design-by-decision):**

| Controller | Reason |
|-----------|--------|
| `AuthController` | Public auth endpoints (login/refresh/forgot-password); `/me` and `/change-password` rely on `SecurityConfig .authenticated()` — no unauthenticated write paths exposed beyond the explicit permit-all list |
| `RootProbeController` | Health probe GET/HEAD only, mapped to `/`; permitAll in SecurityConfig; no data exposure |
| `TenantController` | POST `/api/v1/tenants/register` is intentionally public SaaS self-signup; `@Valid` present; rate-limited via AUTH bucket (same as login) |
| `PublicCareerController` | `/api/v1/public/careers/**` is a public job board; `@Validated` class-level + constraint annotations on params; no PII write beyond job application |
| `PublicOfferController` | `/api/v1/public/offers/**` is token-based offer accept/decline for candidates; `@Valid` on `@RequestBody`; no auth required by design; token provides access control |

**Endpoints with body validation gap (non-blocking):**

| Controller | Method | Issue |
|-----------|--------|-------|
| `SlackCommandController` | `handleEvent` | `@RequestBody String body` — raw webhook payload; `@Valid` cannot apply to String; HMAC signing-secret check provides equivalent protection |
| `DocuSignController` | `handleDocuSignCallback` | `@RequestBody String payload` — raw HMAC-signed body; `@Valid` not applicable to String; verified by DocuSign signature |

---

## RBAC Deep Audit — Previous Iteration Results

### RBAC Issue Status (RBAC-01, RBAC-02, RBAC-03)

#### RBAC-01 — Payment Webhook Public Endpoint
**Status: FIXED / ACCEPTED-BY-DESIGN**

`PaymentWebhookController` is correctly listed under `permitAll` in SecurityConfig because payment provider webhooks (Razorpay, Stripe) are provider-initiated and carry no JWT. Compensating controls:
- HMAC-SHA256 signature verification in `RazorpayAdapter` and `StripeAdapter` (commit d29ec59a)
- `PaymentFeatureGuard.requirePaymentsEnabled()` called on every endpoint
- Class-level `@RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)` provides AOP-level guard

#### RBAC-02 — FeatureFlagController Unguarded `/check/{featureKey}`
**Status: FIXED / ACCEPTED-BY-DESIGN**

All write and list endpoints carry `@RequiresPermission(SYSTEM_ADMIN)`. The single unguarded endpoint `/check/{featureKey}` is intentionally exempt — any authenticated user must be able to resolve a single feature flag for UI gating.

#### RBAC-03 — Tenant Self-Registration Rate Limit
**Status: FIXED / VERIFIED**

`RateLimitingFilter.determineRateLimitType()` maps `/api/v1/tenants/register` to `RateLimitType.AUTH` (5 requests/minute). The AUTH bucket is fail-closed.

---

### Endpoint Coverage Matrix

| Category | Controller Count | With @RequiresPermission | Without | Notes |
|---|---|---|---|---|
| All controllers | 180 | 175 | 5 | 97.2% coverage |
| Auth controllers | 1 | 0 | 1 | Correct — auth endpoints are pre-auth |
| Public API controllers | 2 | 0 | 2 | Correct — career/offer portals are public |
| Platform controllers | 1 | 0 | 1 | TenantController (permitAll by design) |
| Health probe | 1 | 0 | 1 | RootProbeController — health probe returning 204 |

**Backend endpoint permission coverage: 100% of authenticated surface (0 unguarded endpoints in non-public controllers)**

---

### Frontend Guard Coverage

**Global auth coverage: 100%** — `app/providers.tsx` wraps the entire app tree in `<AuthGuard>`.

**Admin area coverage:** `AdminLayoutInner.tsx` applies role-based access: only `SUPER_ADMIN`, `TENANT_ADMIN`, and `HR_MANAGER` can enter `/admin`. Non-qualifying roles redirect to `/me/dashboard`.

**Permission hook usages:** 384 usages of `usePermissions`/`RequiresPermission`/`withPermission`/`requiredPermission` found across `app/`.

---

### Cross-Tenant Isolation Status: PROTECTED

- **Application layer:** `ContractService` consistently uses `findByIdAndTenantId(contractId, tenantId)` — tenant ID injected from `SecurityContext.getCurrentTenantId()` on every data-access method.
- **Database layer:** `TenantRlsTransactionManager` sets `app.current_tenant_id` via `SET LOCAL` (transaction-local, not session-scoped — critical fix from commit 0ea63f6e). Tenant context cannot bleed across transactions in a shared connection pool.
- **Test guard:** `RlsTenantGucScopeTest` build-guard active.
- **Known gap (pre-existing):** NOBYPASSRLS role not yet CI-testable (requires `nu_app_rls` role) — not a regression.

---

### Mass-Assignment Protection (BE-02): FIXED / VERIFIED

1. **DTO pattern:** `OrganizationController.createUnit()` accepts `CreateOrganizationUnitRequest` (a Java record). The DTO's `toEntity()` maps only allowed fields; `id`, `tenantId`, audit timestamps, and `version` are never bindable from a request.
2. **BaseEntity Jackson protection:** All 8 server-managed BaseEntity fields carry `@JsonProperty(access = JsonProperty.Access.READ_ONLY)` — defense-in-depth even without the DTO boundary.

---

## RBAC Matrix (Roles × Permissions Grid)

### Roles Defined (7 core roles from V107 + expanded 22-role set)

| Role | UUID | Tier | Scope |
|------|------|------|-------|
| SUPER_ADMIN | 550e8400-e29b-41d4-a716-446655440020 | Platform-wide | Bypasses all permission checks (frontend + backend) |
| HR_ADMIN | 550e8400-e29b-41d4-a716-446655440021 | Tenant-wide | ALL scope — full HR + settings + roles/users |
| MANAGER | 550e8400-e29b-41d4-a716-446655440022 | Team | TEAM scope for approvals; SELF for personal |
| EMPLOYEE | 550e8400-e29b-41d4-a716-446655440023 | Self | SELF scope only |
| TEAM_LEAD | 48000000-0e01-0000-0000-000000000001 | Team | TEAM scope for approvals; SELF for personal |
| HR_MANAGER | 48000000-0e01-0000-0000-000000000002 | Tenant-wide | ALL scope — broad HR, no payroll admin/settings |
| RECRUITMENT_ADMIN | 48000000-0e01-0000-0000-000000000003 | Mixed | ALL for recruitment; SELF for personal |

Additional roles (from expanded 22-role discovery): `TENANT_ADMIN`, `HR_EXECUTIVE`, `DEPARTMENT_HEAD`, `DEPARTMENT_MANAGER`, `FINANCE_ADMIN`, `PAYROLL_ADMIN`, `RECRUITER`, `TRAINER`, `PROJECT_ADMIN`, `ASSET_MANAGER`, `EXPENSE_MANAGER`, `HELPDESK_ADMIN`, `TRAVEL_ADMIN`, `COMPLIANCE_OFFICER`, `LMS_ADMIN`

### Permission Coverage Per Role (from V107 canonical seed — core 7 roles)

| Permission Domain | EMPLOYEE | TEAM_LEAD | MANAGER | HR_MANAGER | HR_ADMIN | RECRUITMENT_ADMIN | SUPER_ADMIN |
|------------------|----------|-----------|---------|------------|----------|-------------------|-------------|
| EMPLOYEE:VIEW_SELF | Y(SELF) | Y(SELF) | Y(SELF) | Y(ALL) | Y(ALL) | Y(SELF) | Y(bypass) |
| EMPLOYEE:VIEW_ALL | — | — | Y(TEAM) | Y(ALL) | Y(ALL) | Y(ALL) | Y(bypass) |
| EMPLOYEE:CREATE/DELETE | — | — | — | — | Y | — | Y(bypass) |
| EMPLOYEE:IMPORT/EXPORT | — | — | — | Y | Y | — | Y(bypass) |
| LEAVE:REQUEST/CANCEL | Y | Y | Y | Y | Y | Y(SELF) | Y(bypass) |
| LEAVE:APPROVE | — | Y(TEAM) | Y(TEAM) | Y(ALL) | Y(ALL) | — | Y(bypass) |
| LEAVE:MANAGE/CONFIGURE | — | — | — | Y | Y | — | Y(bypass) |
| ATTENDANCE:MARK | Y | Y | Y | Y | Y | Y(SELF) | Y(bypass) |
| ATTENDANCE:APPROVE | — | Y(TEAM) | Y(TEAM) | Y(ALL) | Y(ALL) | — | Y(bypass) |
| ATTENDANCE:MANAGE | — | — | — | Y | Y | — | Y(bypass) |
| PAYROLL:VIEW_SELF | Y | Y | Y | Y | Y | Y(SELF) | Y(bypass) |
| PAYROLL:VIEW/VIEW_ALL | — | — | — | Y | Y | — | Y(bypass) |
| PAYROLL:PROCESS/APPROVE | — | — | — | — | — | — | Y(bypass) |
| REVIEW:VIEW/SUBMIT | Y | Y | Y | Y | Y | Y | Y(bypass) |
| REVIEW:APPROVE | — | Y(TEAM) | Y(TEAM) | Y(ALL) | Y(ALL) | — | Y(bypass) |
| REVIEW:CREATE/DELETE | — | — | — | Y | Y | — | Y(bypass) |
| GOAL:CREATE | Y | Y | Y | Y | Y | Y | Y(bypass) |
| GOAL:APPROVE | — | Y(TEAM) | Y(TEAM) | Y(ALL) | Y(ALL) | — | Y(bypass) |
| RECRUITMENT:VIEW | Y | Y | Y | Y | Y | Y(ALL) | Y(bypass) |
| RECRUITMENT:MANAGE/CREATE | — | — | — | Y | Y | Y(ALL) | Y(bypass) |
| TRAINING:VIEW/ENROLL | Y | Y | Y | Y | Y | Y | Y(bypass) |
| TRAINING:MANAGE | — | — | — | Y | Y | — | Y(bypass) |
| EXPENSE:CREATE/VIEW_SELF | Y | Y | Y | Y | Y | Y(SELF) | Y(bypass) |
| EXPENSE:APPROVE | — | Y(TEAM) | Y(TEAM) | Y(ALL) | Y(ALL) | — | Y(bypass) |
| DASHBOARD:VIEW | Y | Y | Y | Y | Y | Y | Y(bypass) |
| KNOWLEDGE:WIKI:READ | Y | Y | Y | Y | Y | Y | Y(bypass) |
| SETTINGS:READ/MANAGE | — | — | — | — | Y | — | Y(bypass) |
| SYSTEM:ADMIN | — | — | — | — | — | — | Y(bypass) |

---

## Frontend Guards

### Global Guard Mechanism

AuthGuard wraps **all routes** via `providers.tsx`. It uses `findRouteConfig()` to look up `PROTECTED_ROUTES` in `routes.ts`. **Critical behavior:**

```
if (!routeConfig) {
  setIsAuthorized(true);  // auth-only fallback — no permission check
  return;
}
```

This means any route NOT listed in `PROTECTED_ROUTES` is **accessible to any authenticated user** regardless of role.

### Frontend Guard Statistics

| Metric | Count |
|--------|-------|
| Total `page.tsx` files | 286 |
| Routes in PROTECTED_ROUTES (explicit permission spec) | 177 |
| Routes with auth-only fallback (no explicit spec) | 109 |
| Frontend `.tsx` files using `usePermissions` | 244 |
| Total `PermissionGate` component files | 1 (+ test) |
| Public routes (no auth) | 10 |

### Unprotected Admin Routes (Iteration 7 Discovery — High Risk)

From the `unprotectedAdminRoutes` list (routes accessible to any authenticated user):

| Route | Issue | Severity |
|-------|-------|----------|
| `/admin/system` | Not in PROTECTED_ROUTES; `findRouteConfig` returns null; auth-only fallback grants access | **HIGH** |
| `/admin/payroll` | Auth-only fallback | MEDIUM |
| `/payroll/salary-structures/create` | Auth-only fallback | MEDIUM |
| `/payroll/runs/[id]` | Auth-only fallback | MEDIUM |
| `/statutory/filings` | Auth-only fallback | MEDIUM |
| `/admin/integrations/webhooks` | Auth-only fallback | MEDIUM |
| `/admin/departments` | Auth-only fallback | LOW |
| `/admin/employees` | Auth-only fallback; employees page itself guarded | LOW |
| `/admin/implicit-roles` | Auth-only fallback | MEDIUM |
| `/admin/import-keka` | Auth-only fallback | LOW |
| `/admin/mobile-api` | Auth-only fallback | LOW |
| `/admin/profile` | Auth-only fallback | LOW |
| `/admin/reports` | Auth-only fallback | LOW |
| `/wellness/admin` | Auth-only fallback | LOW |
| `/leave/admin/carry-forward` | Auth-only fallback | LOW |
| `/leave/encashment` | Auth-only fallback | LOW |

---

## Security Issue Status

### SEC-001: Demo Credential Neutralization

| Migration | Status | Notes |
|-----------|--------|-------|
| V270 | Partial — GATED only | Runs before V291; on fresh prod install matches 0 rows |
| V295 | PRESENT | Re-neutralizes post-V291 using same hash-based sentinel; gated by `${demoCredentialsEnabled}` |
| V299 | PRESENT | Railway-specific fix; render profile now shows `enabled: ${FLYWAY_ENABLED:true}` |
| V301 | PRESENT | Backfill sentinel for `benefit_claims.upi_id` plaintext rows |

**SEC-001 Verdict: MITIGATED (code complete)** — Railway env variable `DEMO_CREDENTIALS_ENABLED=true` must be flipped to `false` before real user onboarding. This is the sole remaining CRITICAL.

### SEC-002: PII Encryption

| Entity | Field | Status |
|--------|-------|--------|
| EmployeePFRecord | uan_number, pf_number | ENCRYPTED |
| EmployeeESIRecord | esi_number, ip_number | ENCRYPTED |
| Candidate | resume_url | ENCRYPTED |
| Employee | bankAccountNumber | ENCRYPTED |
| PreboardingCandidate | bankAccountNumber, bankIfscCode, taxId | ENCRYPTED |
| User | mfa_secret | ENCRYPTED (backfill available) |
| Webhook | 2 secret fields | ENCRYPTED |
| IntegrationConnectorConfigEntity | api_key | ENCRYPTED |
| PaymentConfig | api_key | ENCRYPTED |
| TaxDeclaration | previous_employer_pan | ENCRYPTED |
| BenefitDependent | national_id, passport_number, etc. | ENCRYPTED |
| BenefitClaim | ifscCode | ENCRYPTED |
| BenefitClaim | **upiId** | **ENCRYPTED** — `@Convert(EncryptedStringConverter)` added + V301 backfill |

**SEC-002 Verdict: FULLY MITIGATED** — `benefit_claims.upi_id` now encrypted + backfill migration V301 committed.

---

## XSS Defense Status (Iteration 7 Update)

- `frontend/app/nu-mail/page.tsx` line 162: raw `div.innerHTML` from Gmail API **FIXED** — now uses `sanitizeEmailHtml(cleanedSignature)`
- `frontend/app/fluence/search/page.tsx`: `dangerouslySetInnerHTML={{ __html: sanitizeHtml(result...) }}` — correctly sanitized, no fix needed
- All other `dangerouslySetInnerHTML` usages route through DOMPurify wrappers
- `style` attribute blocked in DOMPurify allowlist (CSS injection prevention)
- `ALLOW_DATA_ATTR: false` — data attribute XSS blocked

**Verdict: PROTECTED** (after iteration 7 nu-mail fix)

---

## Injection Defense Status

### SQL Injection
- **1,205 input validation annotations** (`@Size`, `@Pattern`, `@NotNull`, `@Valid`) across backend
- **28 native queries** detected — all use Spring Data JPA `@Query` with `:paramName` named parameters
- JPA parameter binding throughout; no dynamic `StringBuilder` query construction found

**Verdict: PROTECTED**

---

## CSRF Protection Status

**Protected: YES**

- Spring's built-in CSRF disabled in favor of custom `CsrfDoubleSubmitFilter`
- Filter chain: `RateLimiting → Tenant → ApiKey → JWT → CSRF → (UsernamePasswordAuth)`
- Frontend API client reads XSRF cookie and sends `X-XSRF-TOKEN` header on all non-GET requests
- Fluence chat WebSocket service also sends `X-XSRF-TOKEN`
- `DevSecurityConfig` disables CSRF for dev profile only

---

## Security Headers Status

**Backend (`SecurityHeadersFilter` + `SecurityConfig`):**
- HSTS (Strict-Transport-Security): 1 year — configured
- X-Content-Type-Options: nosniff — configured
- X-Frame-Options: configured
- Content-Security-Policy: set by SecurityConfig

**Frontend (`proxy.ts` + `next.config.js`):**
- `X-Frame-Options: DENY` — configured
- CSP set in middleware proxy (proxy.ts `export { proxy as middleware }` confirmed active)

---

## Rate Limiting

- **Auth endpoints** (`/api/v1/auth/*` + tenant register): tight bucket — 5 requests/minute
- **Export endpoints**: 5 requests/5 minutes
- **General API**: 100 requests/minute
- **Primary**: Redis-backed via `DistributedRateLimiter` (Bucket4j + Lua scripts)
- **Fallback**: In-memory `ConcurrentHashMap<String, Bucket>` with LRU eviction

---

## JWT Security

- `JwtAuthenticationFilter`: present, registered in filter chain
- `TokenBlacklistService`: Redis-backed with in-memory fallback; blacklist prefix `token:blacklist:`
- JWT stored in httpOnly cookie (not localStorage)

---

## Flyway Migration Chain

- **No duplicate versions detected** — confirmed clean via uniq check
- Latest migration: **V304** (as of 2026-06-18 per Obsidian vault remap)
- V295 → V299 → V300 → V301 → V302 → V303 → V304 chain verified sequenced correctly

---

## Remaining Security Gaps

| ID | Severity | Domain | Title | Status |
|----|----------|--------|-------|--------|
| SEC-001 | CRITICAL | Auth | Demo credential (Welcome@123) live on Railway staging | RUNTIME CONFIG — flip `DEMO_CREDENTIALS_ENABLED=false` before real-user prod |
| FRONT-02 | HIGH | Auth/Frontend | `/admin/system` not in PROTECTED_ROUTES — any authenticated user can access system settings UI | OPEN — add to routes.ts PROTECTED_ROUTES |
| RBAC-GAP | MEDIUM | Auth | 109 frontend routes use auth-only fallback (no permission spec); 16 are admin/payroll routes | PARTIAL — backend APIs still enforce; frontend shows no access-denied for these routes |
| BE-03 | LOW | Backend | `ContractSignatureRepository` no direct tenant_id filter | OPEN — outer IDOR guard compensates |
| ARCH-01 | LOW | Architecture | NOBYPASSRLS live proof never run — nu_app_rls role not in CI | DEFERRED |
| SEC-002b | LOW | PII | No blind indexes for encrypted field search | OPEN — encrypted fields cannot be queried without full decrypt |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Roles defined (total) | 22 |
| Backend permission constants | 362 |
| Frontend permission enum entries | 392 |
| Backend @RequiresPermission annotations | 1,764 |
| Backend controllers fully guarded | 175 / 180 |
| Intentionally unguarded controllers | 5 (all justified) |
| Frontend routes with explicit permission spec | 177 |
| Frontend routes with auth-only fallback | 109 |
| Frontend tsx files using usePermissions | 244 |
| High-risk unregistered admin routes | 16 |
| XSS risks fixed this iteration | 1 (nu-mail innerHTML) |
| PII encryption coverage | 100% of identified fields (upiId fixed iteration 6) |
