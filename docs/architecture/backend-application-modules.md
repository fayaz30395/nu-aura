# Backend application/ module audit (P4c)

Audit of `backend/src/main/java/com/nulogic/application/{admin,dashboard,mobile,publicapi,security,migration,meeting,home}` per Phase 4c of the 2026-05-13 repo layout cleanup. Each module classified under the plan's three buckets: **domain split**, **keep as orchestration**, or **move to common/infrastructure**.

## Summary

| Module        | Files | Classification       | Action                                             |
|---------------|-------|----------------------|----------------------------------------------------|
| `admin`       | 3     | Orchestration        | Keep in application/                               |
| `dashboard`   | 1     | Orchestration        | Keep in application/                               |
| `mobile`      | 5     | Orchestration        | Keep in application/                               |
| `publicapi`   | 2     | Orchestration        | Keep in application/                               |
| `security`    | 5     | Cross-cutting + infra | Recommend split (see below)                        |
| `migration`   | 1     | Orchestration        | Keep in application/                               |
| `meeting`     | 1     | Borderline           | Keep (small, no clear win from moving)             |
| `home`        | 1     | Orchestration        | Keep in application/                               |

## Per-module rationale

### `application/admin/` — keep

`AdminService` (315L), `AiUsageService` (118L), `SystemAdminService` (516L). All cross-cutting orchestration — admin operations on users, tenants, audit logs, AI usage tracking. No domain entity ownership. 16 controllers consume these services. Correctly placed.

### `application/dashboard/` — keep

`DashboardService` (156L). Aggregates data across many domain modules for landing-page tiles. Pure orchestration; no business rules of its own. 2 controllers. Correctly placed.

### `application/mobile/` — keep

5 services (`MobileApprovalService`, `MobileLeaveService`, `MobileNotificationService`, `MobileService`, `MobileSyncService`). Mobile-tailored aggregations of leave, approvals, notifications, sync state. Cross-cutting orchestration for mobile clients — no mobile-specific *domain*, just mobile-shaped views. Correctly placed.

### `application/publicapi/` — keep

`PublicCareerService` (383L), `PublicOfferService` (287L). Public-facing APIs (no auth) that orchestrate calls into recruitment domain. Orchestration with auth-bypass concerns. Correctly placed.

### `application/security/` — recommend split (NOT executed)

5 files, mixed concerns:

| File                            | Concern                                  | Recommended target                        |
|---------------------------------|------------------------------------------|-------------------------------------------|
| `CaptchaService` (239L)         | reCAPTCHA HTTP client                    | `infrastructure/security/` (new)          |
| `ClamAvScanner` (178L)          | ClamAV daemon adapter                    | `infrastructure/security/`                |
| `NoOpScanner` (35L)             | No-op scanner fallback                   | `infrastructure/security/`                |
| `VirusScanService` (82L)        | Orchestrates scanner adapters            | Could stay in `application/security/` OR move with adapters |
| `EncryptionBackfillService` (156L) | One-time data migration orchestration | Keep in `application/security/` (or move to `application/migration/` next to KekaMigrationService) |

**Why not executed:** the moves are mechanically simple (sed + git mv) but Spring constructor-injection wiring would silently break if any auto-discovery (e.g. classpath scan, qualifier-based injection) refers to these classes outside the @ComponentScan radius. Given the user's instruction to push through phases without supervision, and the user's earlier recommendation to defer judgment-heavy work, the safer call is to document the recommendation and let a human execute with one eye on the Spring context start.

To execute later:
```bash
mkdir -p backend/src/main/java/com/nulogic/infrastructure/security
git mv backend/src/main/java/com/nulogic/application/security/service/CaptchaService.java \
       backend/src/main/java/com/nulogic/infrastructure/security/CaptchaService.java
# ... + 3 more for the scanner files
# Then: bulk update package decls + import sites (CaptchaService has 2 importers; VirusScanService has 2)
# Then: mvn package -DskipTests, then docker-compose up to verify Spring context boots
```

### `application/migration/` — keep

`KekaMigrationService` (707L). One-time data import from KEKA into NU-AURA. Pure orchestration. Could be a `domain/migration` if it grew domain entities, but currently it's read-from-Keka-write-to-domain. Correctly placed.

### `application/meeting/` — keep (borderline)

`MeetingService` (56L). Tiny service. Could fit under `application/calendar/` (which already exists with `CalendarService`) since meetings are a flavour of calendar event. **Recommendation deferred** — only 56 lines and 1 controller; the consolidation win is small and the move would need careful import audit.

### `application/home/` — keep

`HomeService` (509L). Aggregates "what's relevant for me right now" across many modules for the home/landing screen. Pure orchestration. 8 controllers in `api/home/`. Correctly placed.

## Net result

**No moves executed.** Of the 8 modules audited, 7 are correctly placed and the eighth (`security`) is the only candidate for action — and that move has wiring risk that warrants human supervision rather than blind sed.

The audit confirms the existing application/ structure mostly holds the line the plan intended. The plan's phrasing "rationalise" oversold the magnitude of the work; what remained was already idiomatic.
