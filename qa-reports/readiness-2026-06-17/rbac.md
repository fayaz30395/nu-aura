# RBAC / Authorization Audit — NU-AURA Production Readiness

**Date:** 2026-06-17 · **Branch:** main @ HEAD · **Method:** static code inspection only
**Scope:** 180 backend `*Controller.java`, `SecurityConfig` permitAll allow-list, `RoleHierarchy`, frontend role constants.
**Evidence rule:** every finding cites `file:line`. `[RUNTIME-NEEDED]` = must be confirmed against the live API by the orchestrator. **No finding is PASS from code alone.**

## Summary

Authorization is enforced by a custom `@RequiresPermission` AOP aspect (`PermissionAspect.java`) backed by `SecurityConfig`'s `.anyRequest().authenticated()` default. The aspect is **well-built**: empty annotations fail closed (`PermissionAspect.java:95-99`), SUPER_ADMIN bypass is audit-logged (`:82-90`), method-level overrides class-level (`:55-61`), and sensitive admin paths use `revalidate=true` (fresh DB perms, bypassing JWT staleness). Admin/platform/payment/integration/compliance/role controllers all show 1:1 mapping-to-permission coverage. The two prior IDORs (statutory contributions, wall) are **confirmed fixed** — services scope by `TenantContext.requireCurrentTenant()` + `findByTenantIdAndEmployeeId` / ownership checks.

**Key risks found:** (1) one unprotected admin-namespace read endpoint (the vault-flagged feature-flag check — **confirmed**); (2) **payment webhook signature verification is stubbed and rejects all webhooks** (fails closed, but payments are non-functional and the verification code is not real — must not ship to prod claiming payment support); (3) unauthenticated tenant self-registration with no invite/email-verification gate at API-tier rate limit (100/min); (4) frontend/backend role drift is **cosmetic** (no authz bypass) but includes a functional gate bug.

A coarse coverage of "every sensitive mutation is permission-gated" holds. The gaps are reads + a stubbed webhook verifier + open self-registration. Nothing here is a confirmed cross-tenant data-exfil hole **from code**, but several items require a live unauthenticated/under-privileged probe to close.

## Findings

| ID | Severity | Title | Evidence (file:line) | Needs |
|----|----------|-------|----------------------|-------|
| RBAC-01 | HIGH | Payment webhook signature verification is STUBBED — `verifyWebhookSignature` always returns `false` (Stripe + Razorpay). Fails closed (rejects all), but there is **no real signature check**; shipping "payments" to prod is misleading and any future un-stub without proper HMAC = open webhook. | `payment/.../StripeAdapter.java:116-127` (returns false, NUAURA-PAYMENT-005); `RazorpayAdapter.java:115-125`; entry `PaymentWebhookController.java:46-74` (permitAll @ `SecurityConfig.java:238`) | `[RUNTIME-NEEDED]` POST a forged webhook → expect 4xx (reject). Confirm no env un-stubs it. |
| RBAC-02 | MEDIUM | Unprotected admin-namespace read: `GET /api/v1/admin/feature-flags/check/{featureKey}` has **no** `@RequiresPermission` while all 6 sibling handlers require `SYSTEM_ADMIN`. Any authenticated user can enumerate tenant feature-flag state (leaks platform config / experimental features). | `featureflag/FeatureFlagController.java:57-66` (cf. `:34,42,50,69,77,91` all `SYSTEM_ADMIN`) | `[RUNTIME-NEEDED]` Call as plain EMPLOYEE JWT → expect 403; currently returns 200. |
| RBAC-03 | MEDIUM | Open tenant self-registration: `POST /api/v1/tenants/register` is `permitAll`, has **no** invite/email-verification/captcha gate, only company-code dedup, and falls into the default API rate bucket (100/min) not the AUTH bucket (5/min). Mass tenant creation / resource exhaustion vector. | `platform/TenantController.java:40-45`; `TenantProvisioningService.java:57-61` (only `existsByCode`); rate type `RateLimitingFilter.java:162-178` (not `/auth` → API 100/min); permitAll `SecurityConfig.java:212` | `[RUNTIME-NEEDED]` Hammer unauth POST; confirm whether prod gates self-reg behind a flag. |
| RBAC-04 | LOW | `PlatformController` user endpoints gate on string literal `"USER:READ"` which is **not a defined permission** (constant is `HRMS:USER:READ`, `Permission.USER_MANAGE="USER:MANAGE"`). No role is ever granted bare `USER:READ`, so these 3 GETs are effectively SUPER_ADMIN-only (fail closed). Functional bug, not a hole. | `platform/.../PlatformController.java:205,219,233` (`"USER:READ"`); grant is `HrmsPermissionInitializer.java:59` `HRMS:USER:READ`; no bare `USER:READ` granted anywhere | none (code-confirmable) |
| RBAC-05 | LOW | Frontend role drift — invented roles never granted by backend: `MANAGER, FINANCE_ADMIN, RECRUITER, TRAINER` (`usePermissions.ts`) and `DELIVERY_LEAD, VP, CEO, OPERATIONS_HEAD` (`roles.ts`). **Cosmetic** — backend re-checks every API via `@RequiresPermission`; invented roles carry zero perms (fail closed). `FINANCE_ADMIN` also sits in the edge-proxy admin set (dead entry). | `frontend/lib/hooks/usePermissions.ts:552,554,556,558`; `frontend/lib/constants/roles.ts:7-10`; `frontend/proxy.ts:508` | none (frontend is not the authz boundary) |
| RBAC-06 | LOW | Functional authz gate bug: scorecards & PSA pages gate on non-existent `Roles.RECRUITER` instead of real `RECRUITMENT_ADMIN`. Pages still reachable by admins (OR'd with real `ADMIN_ROLES`), but actual recruiters (`RECRUITMENT_ADMIN`) are wrongly excluded from the UI. | `frontend/app/recruitment/scorecards/page.tsx:257`; `frontend/app/projects/psa/page.tsx:331` (real roles `:23`) | none |
| RBAC-07 | INFO (verified fixed) | Prior IDORs remediated: statutory contributions scoped by tenant (`findByTenantIdAndEmployeeId`); DSR `getMyRequest` enforces ownership with no existence leak; wall delete passes `employeeId` to service. | `StatutoryService.java:277-282`; `DsrService.java:149-158`; `WallController.java:197-202` | `[RUNTIME-NEEDED]` cross-tenant probe to be fully certain (RLS under pgbouncer noted elsewhere). |

### Verified clean (1:1 perm coverage, sampled at `file`)
AdminController, SystemAdminController (`revalidate`), SystemAuditLogController (`revalidate`), KafkaAdminController, EncryptionBackfillController (`revalidate`), PlatformController, PaymentController, PaymentConfigController, IntegrationController, IntegrationConnectorController, WebhookController, WebhookRotationController, ComplianceController, LoanController, SelfServiceController (20/20), HomeController, DashboardController, OcrReceiptController. permitAll public/webhook paths each carry their own guard (token / X-API-Key / HMAC / Slack-sig) — see Endpoints to runtime-probe.

### permitAll guard verification (code-level, all require live confirmation)
- `/api/v1/external/**` → `ApiKeyAuthenticationFilter.java:84` X-API-Key bcrypt + constant-time. `[RUNTIME-NEEDED]`
- `/api/v1/esignature/external/**` → token + expiry + email match `ESignatureService.java:544,628-630`. `[RUNTIME-NEEDED]`
- `/api/v1/public/offers/**` → token + tenant isolation `PublicOfferService.java:49,62-68`. `[RUNTIME-NEEDED]`
- `/api/v1/exit/interview/public/**` → token `ExitInterviewPublicService.java:53` (⚠ **no explicit expiry check** — relies on token uniqueness). `[RUNTIME-NEEDED]`
- `/api/v1/public/careers/**` → tenant-scoped, OPEN-status filter `PublicCareerController.java:74,95`. `[RUNTIME-NEEDED]` (confirm no PII beyond job listings)
- `/api/v1/integrations/docusign/webhook` → HMAC-SHA256 + constant-time `DocuSignController.java:117,476-481`. `[RUNTIME-NEEDED]`
- `/api/v1/preboarding/portal/**` → token + 30-day expiry `PreboardingService.java:72-78`. `[RUNTIME-NEEDED]`
- `/api/v1/biometric/punch[/batch]` → X-Biometric-Api-Key bcrypt `BiometricDeviceController.java:151,173`. `[RUNTIME-NEEDED]`
- `/api/v1/integrations/slack/*` → Slack signing-secret HMAC + 5-min replay window `SlackCommandService.java:115-135`; prod-fails-without-secret `:78-89`. `[RUNTIME-NEEDED]`

## Endpoints to runtime-probe

Orchestrator should hit these unauthenticated and/or with a low-privilege (plain EMPLOYEE) JWT and confirm the expected status:

1. `GET /api/v1/admin/feature-flags/check/test-key` — as EMPLOYEE JWT → **expect 403**, currently returns 200 (RBAC-02).
2. `POST /api/v1/payments/webhooks/stripe` — forged/empty signature → **expect 4xx reject** (RBAC-01); confirm a real signed webhook is *not* silently accepted.
3. `POST /api/v1/tenants/register` — unauth, repeated rapidly → confirm whether self-reg is open and what rate ceiling applies (RBAC-03).
4. `GET /api/v1/admin/feature-flags` (and any other `/admin/**`) — unauthenticated → **expect 401** (baseline allow-list sanity).
5. `GET /api/v1/me/dsr/{someOtherUsersRequestId}` — as EMPLOYEE A requesting EMPLOYEE B's DSR id → **expect 403/404** (confirm ownership guard RBAC-07 holds at runtime; DSR = PII export, highest blast radius).

Secondary (token-portal sanity): `GET /api/v1/exit/interview/public/{badToken}` and `/api/v1/public/offers/{badToken}` → expect 4xx, never 200 with data.

## RBAC Coverage score (0-100): 82 / 100

Justification:
- **+** Solid enforcement primitive: AOP aspect fails closed on empty/missing-perm-with-annotation, audits SUPER_ADMIN bypass, supports DB-revalidation on sensitive ops.
- **+** Sensitive mutation coverage is effectively complete across admin/platform/payment/integration/compliance/role controllers (1:1 mapping↔perm).
- **+** Both prior IDORs verified remediated; DSR self-service correctly ownership-scoped with no existence leak.
- **+** Every permitAll path has an identifiable independent guard in code.
- **−8** RBAC-01: payment webhook verification is a stub, not real crypto — a latent open-webhook the moment it's un-stubbed; payments cannot be claimed production-ready.
- **−5** RBAC-02: an admin-namespace endpoint missing its perm (pattern risk — proves the aspect's "no annotation = authenticated-only" default can silently drop coverage on new handlers).
- **−3** RBAC-03: open, weakly-rate-limited tenant self-registration.
- **−2** RBAC-04/06: literal-permission and role-name mismatches (fail closed but indicate drift between layers).
- Capped below 90 because **no finding could be marked PASS from code** — every guard still needs a live 401/403 probe to confirm the running deployment matches the source.

## What has NOT been verified

- **No live API calls were made.** All 401/403/4xx expectations are inferred from source; the running Railway/Vercel deployment was not probed. Config drift (e.g. a profile that disables the aspect, un-stubs a webhook, or relaxes permitAll) would not be visible here.
- **RLS under pgbouncer:** tenant-scoping relies on `TenantContext` + repository `findByTenantId...`; the documented "RLS leak under transaction pooling" risk (MEMORY.md) was **not** re-tested in this pass — needs the `nu_app_rls` NOBYPASSRLS role + live cross-tenant query.
- **Full 180-controller line-by-line:** ~50 controllers were inspected in detail; the rest were screened by a mapping-count-vs-permission-count heuristic. Controllers with class-level `@RequiresPermission` or where reads are intentionally self-scoped (`/me/**`) were not all individually opened. A handler that *has* an annotation but with the *wrong* permission (too-weak) would not be caught by the count heuristic.
- **Exit-interview public token expiry:** `ExitInterviewPublicService` showed no explicit expiry check — not confirmed whether tokens are single-use/short-lived another way.
- **Method-security on non-controller beans / WebSocket STOMP authorization** (`WebSocketSecurityConfig`) was not audited.
- **JWT integrity / role-claim forging** assumed sound (backend-signed) but not cryptographically reviewed here.
