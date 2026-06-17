---
title: Endpoint Index — Per-Method Hub
tags: [backend, api, endpoints, rest, catalog, index, hub]
---

# Endpoint Index — Per-Method Hub

> The deepest layer of the API documentation: **every HTTP endpoint of every controller**,
> enumerated with verb, full path, gating permission, and purpose. Because a single flat
> file of ~1,700 endpoints would be unwieldy, the catalog is split into five per-sub-app
> notes (below). This hub is the entry point and the totals reconciliation. It sits beneath
> [[Controller-Index]] (controller→base-path 1:1) and [[APIs]] (curated endpoint-level
> narrative), and feeds [[Feature-Traceability]] (feature → endpoint slices).

## Purpose

Give an exhaustive, navigable map of the entire NU-AURA HTTP surface at **method
granularity** — so any endpoint can be located with its verb, full path, and
`@RequiresPermission` without opening source. Each per-sub-app note lists every controller
as a `### Section` with a `| Verb | Path | Permission | Purpose |` table.

## Totals (verified per-note, 2026-06-17)

| Sub-app | Catalog note | Controllers | Endpoints |
|---------|-------------|-------------|-----------|
| NU-HRMS | [[Endpoints-HRMS]] | 71 | 712 |
| Shared-Platform | [[Endpoints-Platform]] | 56 | 429 |
| NU-Hire | [[Endpoints-Hire]] | 19 | 243 |
| NU-Grow | [[Endpoints-Grow]] | 18 | 231 |
| NU-Fluence | [[Endpoints-Fluence]] | 16 | 96 |
| **Total** | — | **180** | **1,711** |

The **180** controllers reconcile exactly with [[Controller-Index]] (the raw `grep` without
`--include` returns 184, over-counting by 4: 1 `.disabled` file + 3 non-controller matches;
see that note for full reconciliation). The **1,711** endpoints are the sum of the five
per-method catalogs, each independently row-count-verified by its author.

## How to read

- **Verb** — HTTP method from `@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping`/`@PatchMapping` (or `@RequestMapping(method=…)`).
- **Path** — full path = controller class `@RequestMapping` base + the method's path argument. Regex path constraints (e.g. `{paymentId:[0-9a-fA-F\-]{36}}`) are normalized to `{paymentId}` with a note.
- **Permission** — the `@RequiresPermission(Permission.XXX)` value. `—` means no permission annotation (still JWT-authenticated unless marked **public**). Array/any-of permissions are written `{A, B}` or `A / B`. Some controllers add a class-level `@RequiresFeature(FeatureFlag.…)` gate, noted in the relevant catalog.
- **public** — on the `permitAll()` allow-list; these rely on their own token/HMAC/signature/API-key, not the JWT chain (see [[Middleware]], [[Security-Audit]]).

## Cross-cutting findings surfaced during enumeration

These were flagged by the per-sub-app passes and are worth a security/consistency look:

- **Likely auth gap:** `GET /api/v1/admin/feature-flags/check/{featureKey}` carries no
  `@RequiresPermission` despite the `/admin` prefix ([[Endpoints-Platform]]).
- **Permission style drift:** string-literal permissions (`"ROLE:MANAGE"`, `"SYSTEM:ADMIN"`,
  `"WORKFLOW:VIEW"`) in `PlatformController`/`KekaImportController`/`WorkflowController` vs
  typed `Permission.*` enums elsewhere; singular `NOTIFICATION_*` vs plural `NOTIFICATIONS_*`
  across the two notification controllers ([[Endpoints-Platform]]).
- **`revalidate = true`** guards the most sensitive ops (encryption backfill, tenant
  suspend/impersonation, admin password reset, audit security-events, DSR fulfil, webhook
  secret rotation, all API-key mutations) — re-checks permissions against the DB, not cache.
- **Feature-flag-gated controllers:** `FluenceAttachmentController`, `FluenceEditLockController`
  (`ENABLE_FLUENCE`), `CourseEnrollmentController` (`ENABLE_LMS`) ([[Endpoints-Fluence]], [[Endpoints-Grow]]).
- **Public token surface** (per [[Endpoints-Hire]], [[Endpoints-HRMS]], [[Endpoints-Platform]]):
  careers, offer portal, preboarding `/portal/{token}`, e-sign `/external/{token}`, exit
  interview public, biometric `/punch`, payment/DocuSign/Slack webhooks, tenant `/register`,
  root/monitoring liveness.

## Related Links

- [[Controller-Index]] — controller → base-path 1:1 (180) · [[APIs]] — curated endpoint narrative + rate buckets
- Per-sub-app catalogs: [[Endpoints-HRMS]] · [[Endpoints-Platform]] · [[Endpoints-Hire]] · [[Endpoints-Grow]] · [[Endpoints-Fluence]]
- [[Feature-Traceability]] — feature → route → controller → service → tables → permission
- [[Services]] · [[Middleware]] · [[Permissions]] · [[Roles]] · [[RBAC-Matrix]]
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]] · [[00-Home]]

## Risks

- **Staleness.** 1,711 endpoints across 180 controllers drift quickly. Re-verify a sub-app's
  count by re-parsing its controllers' mapping annotations; the per-note authors recorded
  exact counts to diff against.
- **Permission column is the documented annotation, not the effective grant.** Effective
  access also depends on `RoleHierarchy` defaults and per-tenant `role_permissions`
  ([[RBAC-Matrix]]); a `—` is JWT-authenticated, not unauthenticated.
- **Public allow-list is the unauthenticated attack surface** — each public endpoint must
  enforce its own token/HMAC/signature ([[Security-Audit]]).
