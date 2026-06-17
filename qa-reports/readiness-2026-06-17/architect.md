# Architect — Production Readiness (NU-AURA, 2026-06-17)

Branch `main` @ `9bf5e49d`. CODE inspection only; runtime/browser claims tagged for orchestrator validation.

## Summary

The `docs/obsidian/` vault is an accurate, evidence-grounded map and largely reconciles
with source: the DDD modular-monolith layering (api → application → domain → infrastructure
→ common) is real and **enforced by ArchUnit** (`LayerArchitectureTest`), the public
allow-list matches the documented unauthenticated surface, the new feature pages all have
backing controllers, and the framework BOM is genuinely Spring Boot 3.5.14 (no version skew —
the `3.3.1` pins are Apache Tika). Counts have drifted slightly upward since the vault was
written (FE pages 283→285, raw endpoint mappings 1,711→1,781) but the discrepancies are
explainable (2 net-new pages already backed; raw mapping count over-counts the de-duplicated
catalog total). The one concrete defect confirmed is a permission-consistency gap on
`GET /api/v1/admin/feature-flags/check/{featureKey}` — the vault already flagged it and it is
real. Top release risk remains the monolith blast radius + RLS-as-last-line-of-isolation; both
are hardened but require runtime proof.

## System map deltas

| Area | Vault says | Verified on disk | Delta |
|------|-----------|------------------|-------|
| FE `page.tsx` | 283 | **285** (`find frontend/app -name page.tsx`) | +2 new pages, both backed: `/admin/budget` (`api/budget/controller/BudgetPlanningController.java`) was already listed in Route-Map but the count line lags; `/me/skills`, `/recruitment/scorecards`, `/projects/psa/invoices`, `/travel/expenses` all present + backed (`EmployeeSkillController`, `ScorecardController`, `PSAInvoiceController`, `TravelExpenseController`). Vault count line should read 285. |
| Controllers | 180 (catalog) / 184 (grep) | **184** `@RestController`, **180** `*Controller.java` files | Matches vault's own reconciliation note (grep over-counts by 4 — non-`Controller`-named `@RestController`s like `ApiKeyController`, `WebSocketNotificationController`). No delta. |
| Endpoints | 1,711 (catalog sum) | **1,781** raw `@(Get|Post|Put|Delete|Patch)Mapping` | +70. Raw annotation grep counts every mapping incl. inherited/abstract base controllers + a few `@RequestMapping(method=)`; the 1,711 is the human-deduped per-method catalog. Drift is within tolerance but the catalog should be re-parsed before release sign-off. |
| Spring Boot version | 3.5.14 (BOM) | **3.5.14** confirmed (`pom.xml:24`, parent `nulogic-platform`) | No delta. Confirms MEMORY note (not 3.4.1/3.3.1). |
| Layering | "enforced by ArchUnit" | Confirmed — `LayerArchitectureTest` + `RlsTenantGucScopeTest` + `TenantTimeArchitectureTest` | Accurate, but enforcement carries a large allowlist of debt exceptions (see ARCH-02). |

## Findings

| ID | Severity | Title | Evidence (file:line) | Needs |
|----|----------|-------|----------------------|-------|
| ARCH-01 | MEDIUM | `feature-flags/check/{featureKey}` missing `@RequiresPermission` while every sibling requires `SYSTEM_ADMIN` — any authenticated tenant user can enumerate feature-flag state | `backend/.../api/featureflag/FeatureFlagController.java:57-66` (siblings gated at :34,:42,:50,:69,:77,:91) | [RUNTIME-NEEDED] confirm 200 for non-admin JWT |
| ARCH-02 | MEDIUM | Layering enforced but eroding: 12 controllers allowlisted out of the "no direct Repository access" ArchUnit rule, and `api → infrastructure` direct imports in 6 controllers (DocuSign/Integration/KafkaAdmin/SmsNotification/FluenceSearch) — debt the rule documents rather than prevents | `backend/.../architecture/LayerArchitectureTest.java:84-94,111-121`; `api/integration/controller/IntegrationController.java`, `api/admin/controller/KafkaAdminController.java` | none (code-confirmed) |
| ARCH-03 | HIGH | Monolith blast radius: one Spring Boot deployable serves all 4 sub-apps; a backend regression hits HRMS/Hire/Grow/Fluence simultaneously. Mitigated by ArchUnit module seams + Kafka topics, but no runtime isolation | `backend/src/main/java/com/nulogic/HrmsApplication.java` (single app); System-Overview "Risks" | [RUNTIME-NEEDED] regression-test shared filter chain + auth first |
| ARCH-04 | HIGH | RLS is the last line of tenant isolation; any pooled-connection GUC leak = cross-tenant exposure. Hardened (V177 strict policies, V254 NOBYPASSRLS + `RlsStartupProbe`, `RlsTenantGucScopeTest` build-guard) but correctness is runtime-dependent | `backend/.../architecture/RlsTenantGucScopeTest.java`; System-Overview:252-254 | [RUNTIME-NEEDED] live RLS proof under NOBYPASSRLS role (per MEMORY, still CI-only) |
| ARCH-05 | MEDIUM | 23 `permitAll()` public matchers form the unauthenticated attack surface (careers, offers, e-sign, preboarding `/portal`, biometric `/punch`+`/punch/batch`, DocuSign/payment/Slack webhooks, SAML, `/ws/**`). Each must enforce its own token/HMAC/signature; not verifiable from routing config alone | `backend/.../common/config/SecurityConfig.java:190-251` | [RUNTIME-NEEDED] per-endpoint token/HMAC enforcement, esp. biometric punch + Slack signature |
| ARCH-06 | LOW | `/ws/**` is `permitAll()` at the HTTP filter chain — WebSocket/STOMP auth must occur at handshake/CONNECT. Comment asserts "auth handled at STOMP level" but not provable from this file | `backend/.../common/config/SecurityConfig.java:233-234` | [RUNTIME-NEEDED] confirm STOMP CONNECT rejects unauthenticated/cross-tenant |
| ARCH-07 | LOW | Permission style drift: string-literal perms (`"ROLE:MANAGE"`, `"SYSTEM:ADMIN"`, `"WORKFLOW:VIEW"`) in Platform/KekaImport/Workflow controllers vs typed `Permission.*` enums; singular `NOTIFICATION_*` vs plural `NOTIFICATIONS_*` — refactor risk, not a live hole | Vault `Endpoints-Platform`; confirmed enum usage in `FeatureFlagController.java:18` | none (consistency) |
| ARCH-08 | LOW | Endpoint catalog drift (1,711→~1,781 raw) and FE count line (283 vs 285) will keep diverging; vault count lines are point-in-time and already slightly stale | `docs/obsidian/04-Backend/Endpoint-Index.md:31`; `03-Frontend/Route-Map-Full.md:34` | none (doc hygiene) |

### Degradable vs core dependencies (verified)
- **Degradable (graceful fallback confirmed):** Elasticsearch → `pg_trgm` (`ElasticsearchConfig`, `app.elasticsearch.enabled`); Google Drive → mock provider (`StorageProvider`/`GoogleDriveStorageProvider`/`StorageProviderConfig`); SMS → `MockSmsService`; Payment → `MockPaymentService`; Redis cache → DB. These are real `@ConditionalOn*`/provider-abstraction seams.
- **Core (no graceful path — outage = degraded/down):** PostgreSQL (system of record + RLS), JWT/Security filter chain, TenantFilter. Kafka is async side-effects (DLT + `IdempotencyService`) so a Kafka outage degrades notifications/audit/index rather than blocking the write path — moderate, not core-fatal. [RUNTIME-NEEDED] confirm write path does not block on Kafka publish.

## Architecture Coverage score: 82/100

Strong, ArchUnit-enforced layering with accurate documentation and verified degradation seams; deductions for the monolith blast-radius + RLS runtime dependency (the two highest release risks, unprovable from code), the documented-but-unfixed layering debt allowlist, and one real (if low-impact) permission gap. Not higher because the most material risks (ARCH-03/04/05/06) all require live validation this pass could not perform.

## What has NOT been verified
- **Spot-check was ~5 endpoints, not the full 1,711** — I confirmed controller existence + base paths for the 5 new pages, FeatureFlag, and the webhook/public set, but did not re-parse all 180 controllers to re-derive the exact 1,711/1,781 reconciliation. ARCH-08 stands as "drift exists," not "miscount proven."
- **No runtime/browser confirmation** of any finding — all `[RUNTIME-NEEDED]` items (FF auth gap actual 200, RLS isolation under NOBYPASSRLS, public-endpoint token enforcement, STOMP CONNECT auth, Kafka-outage write-path behavior) are code-level inferences only.
- **Orphan detection is incomplete** — I confirmed the 5 sampled new routes have backends and the public routes map to controllers, but did not do a full bidirectional routes↔endpoints diff to enumerate every UI-without-API or API-without-UI orphan.
- **Did not inspect the actual `RequiresPermissionAspect`** enforcement (whether `@RequiresPermission` is reliably woven on all controllers, or whether any are missed) — `RbacAnnotationCoverageTest` exists but I did not read its assertions.
- **pgbouncer/connection-pool RLS-leak risk** (flagged in MEMORY as critical) was not re-investigated this pass.
