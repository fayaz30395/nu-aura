# Backend application/ module audit (P4c)

Audit of `backend/src/main/java/com/nulogic/application/{admin,dashboard,mobile,publicapi,security,migration,meeting,home}` per Phase 4c of the 2026-05-13 repo layout cleanup. Each module classified under the plan's three buckets: **domain split**, **keep as orchestration**, or **move to common/infrastructure**.

## Summary

| Module      | Files | Classification        | Action                                                |
|-------------|-------|-----------------------|-------------------------------------------------------|
| `admin`     | 3     | Orchestration         | Keep in application/                                  |
| `dashboard` | 1     | Orchestration         | Keep in application/                                  |
| `mobile`    | 5     | Orchestration         | Keep in application/                                  |
| `publicapi` | 2     | Orchestration         | Keep in application/                                  |
| `security`  | 5     | Cross-cutting + infra | Split executed — 4 files → `infrastructure/security/` |
| `migration` | 1     | Orchestration         | Keep in application/                                  |
| `meeting`   | 1     | Borderline            | Keep (small, no clear win from moving)                |
| `home`      | 1     | Orchestration         | Keep in application/                                  |

## Per-module rationale

### `application/admin/` — keep

`AdminService` (315L), `AiUsageService` (118L), `SystemAdminService` (516L). All cross-cutting orchestration — admin operations on users, tenants, audit logs, AI usage tracking. No domain entity ownership. 16 controllers consume these services. Correctly placed.

### `application/dashboard/` — keep

`DashboardService` (156L). Aggregates data across many domain modules for landing-page tiles. Pure orchestration; no business rules of its own. 2 controllers. Correctly placed.

### `application/mobile/` — keep

5 services (`MobileApprovalService`, `MobileLeaveService`, `MobileNotificationService`, `MobileService`, `MobileSyncService`). Mobile-tailored aggregations of leave, approvals, notifications, sync state. Cross-cutting orchestration for mobile clients — no mobile-specific *domain*, just mobile-shaped views. Correctly placed.

### `application/publicapi/` — keep

`PublicCareerService` (383L), `PublicOfferService` (287L). Public-facing APIs (no auth) that orchestrate calls into recruitment domain. Orchestration with auth-bypass concerns. Correctly placed.

### `application/security/` — split EXECUTED (2026-05-14)

4 of 5 files moved to `infrastructure/security/`; `EncryptionBackfillService` kept in place per audit recommendation.

| File                               | Concern                                  | Final location                              |
|------------------------------------|------------------------------------------|---------------------------------------------|
| `CaptchaService` (239L)            | reCAPTCHA HTTP client                    | `infrastructure/security/` (moved)          |
| `ClamAvScanner` (178L)             | ClamAV daemon adapter                    | `infrastructure/security/` (moved)          |
| `NoOpScanner` (35L)                | No-op scanner fallback                   | `infrastructure/security/` (moved)          |
| `VirusScanService` (82L)           | Scanner port interface                   | `infrastructure/security/` (moved)          |
| `EncryptionBackfillService` (156L) | One-time data migration orchestration    | `application/security/service/` (unchanged) |

`VirusScanService` moved with its implementations — the port co-locating with adapters is a layering compromise (Hexagonal would put the port in `application` or `domain`), but it matches the audit's "move with adapters" option and keeps the AV scanning concern in one package.

**Import sites updated:** 4 consumers — `AuthService`, `FileStorageService`, `GlobalExceptionHandler`, `AuthControllerSecurityTest`.

**Verification:** `mvn clean compile -DskipTests` → BUILD SUCCESS (1808 source files). Spring context start verification deferred to first integration test run (now backed by Testcontainers Postgres).

### `application/migration/` — keep

`KekaMigrationService` (707L). One-time data import from KEKA into NU-AURA. Pure orchestration. Could be a `domain/migration` if it grew domain entities, but currently it's read-from-Keka-write-to-domain. Correctly placed.

### `application/meeting/` — keep (borderline)

`MeetingService` (56L). Tiny service. Could fit under `application/calendar/` (which already exists with `CalendarService`) since meetings are a flavour of calendar event. **Recommendation deferred** — only 56 lines and 1 controller; the consolidation win is small and the move would need careful import audit.

### `application/home/` — keep

`HomeService` (509L). Aggregates "what's relevant for me right now" across many modules for the home/landing screen. Pure orchestration. 8 controllers in `api/home/`. Correctly placed.

## Net result

**1 module split executed (`security`); 7 modules confirmed correctly placed.** The `application/security/` split moved 4 infra-flavored files (Captcha + 3 scanner classes) into a new `infrastructure/security/` package; `EncryptionBackfillService` stayed put since it's data-migration orchestration.

The audit confirms the existing application/ structure mostly holds the line the plan intended. The plan's phrasing "rationalise" oversold the magnitude of the work; what remained was largely already idiomatic.
