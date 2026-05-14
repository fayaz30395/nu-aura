# API-Layer Remaining `now()` Sweep

> **Auditor:** w6-aux-api-audit (read-only).
> **Date:** 2026-05-14.
> **Scope:** `backend/src/main/java/com/nulogic/api/` only — controllers, controller-adjacent DTOs, and api-package response builders.
> **Why this sweep exists:** Prior unzoned-now audits (`unzoned-now-audit.md`, `prepersist-now-audit.md`, `keka-migration-time-handling.md`) prioritized service-layer and domain-layer sites. A handful of controller-level zero-arg `LocalDate(Time).now()` call sites were either listed but not actioned, or were missed entirely because the parent audits sampled rather than enumerated. This document is the complete, enumerated remainder of the api/ tree at audit time.

---

## Snapshot

- **Pattern matched:** zero-arg `LocalDate.now()` or `LocalDateTime.now()` (including fully-qualified `java.time.*` form).
- **Excluded:** Javadoc/comment mentions; calls already routed through `tenantTimeService.now(...)`.
- **Snapshot moment:** 2026-05-14, atomic single-grep capture (sibling migration agents are concurrently editing — the count is a moving target; expect this list to shrink by the time it is read).

| Metric | Value |
|---|---:|
| Remaining call sites | **19** |
| Distinct controllers / DTOs | **11** |
| Already migrated since prior audit (delta in this run) | `IntegrationController` (5→0), `DocuSignController` (1→0), `OkrController` (5→0 mid-scan) |

> Note: One spurious grep hit in `api/payroll/controller/PayrollStatutoryController.java:64` is a Javadoc reference (`{@code LocalDate.now()}` explaining the *replaced* legacy call) — already migrated, intentionally excluded.

---

## Remaining Sites — Grouped by Controller / DTO

### 1. `api/analytics/controller/AnalyticsController.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 148 | `java.time.LocalDate today = java.time.LocalDate.now();` (`getLeaveMetrics`) | **P0** — drives month-window for leave metrics; tenant-local "today" required | `tenantTimeService.today(tenantId)` (`tenantId` already in scope) |
| 167 | `java.time.LocalDate today = java.time.LocalDate.now();` (`getPayrollMetrics`) | **P0** — drives current month/year for payroll metrics | `tenantTimeService.today(tenantId)` |

### 2. `api/announcement/dto/AnnouncementResponse.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 39 | `expiresAt.isBefore(LocalDateTime.now())` (`isExpired`) | **P0** — expiry comparison gates publication visibility | Plumb `tenantTimeService.now(tenantId)` via factory builder; or move the comparison into the service layer where tenant context exists |
| 44 | `expiresAt.isAfter(LocalDateTime.now())` (`isActive` predicate) | **P0** — same as above | Same |
| 49 | `publishedAt.isAfter(LocalDateTime.now())` (`isScheduled` predicate) | **P0** — gates announcement scheduling state | Same |

### 3. `api/benefits/dto/FlexAllocationResponse.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 72 | `ChronoUnit.DAYS.between(LocalDate.now(), allocation.getExpiryDate())` | **P0** — drives `daysUntilExpiry` for user-visible benefit allocation | Pass tenant `today` into the static `from(...)` factory, or hoist the computation into the service that already has tenant context |

### 4. `api/employee/dto/EmployeeImportResult.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 42 | `.importedAt(LocalDateTime.now())` (`success(...)`) | **P1** — user-visible audit timestamp on bulk-import receipts | Accept `LocalDateTime now` as parameter; controller passes `tenantTimeService.now(tenantId)` |
| 57 | `.importedAt(LocalDateTime.now())` (`partial(...)`) | **P1** — same | Same |
| 71 | `.importedAt(LocalDateTime.now())` (`failure(...)`) | **P1** — same | Same |

### 5. `api/expense/controller/ExpenseClaimController.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 163 | `paymentDate != null ? paymentDate : LocalDate.now()` (`markAsPaid` fallback) | **P0** — payment effective-date drives accounting period | `tenantTimeService.today(tenantId)` (inject service; `TenantContext.requireCurrentTenant()` available) |

### 6. `api/export/ExportController.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 142 | `LocalDateTime.now().format(ofPattern("yyyyMMdd_HHmmss"))` (filename suffix) | **P2** — filename diagnostic only; not a business decision | Acceptable as-is; if normalised, use `tenantTimeService.now(tenantId)` for consistency with other exports (`ReportController`, `CustomReportController`) |

### 7. `api/home/controller/HomeController.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 92 | `.date(java.time.LocalDate.now())` (NOT_APPLICABLE fallback for SuperAdmin) | **P1** — user-visible "today" on home attendance card | `tenantTimeService.today(tenantId)` — `tenantId` reachable via `TenantContext.requireCurrentTenant()` |

### 8. `api/notification/dto/SmsNotificationResponse.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 66 | `.sentAt(LocalDateTime.now())` (`success(...)`) | **P1** — user-visible SMS send timestamp | Accept `LocalDateTime sentAt` as parameter; caller supplies `tenantTimeService.now(tenantId)` |
| 77 | `.sentAt(LocalDateTime.now())` (`failure(...)`) | **P1** — same | Same |

### 9. `api/performance/controller/Feedback360Controller.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 122 | `existing.setUpdatedAt(LocalDateTime.now())` (review-cycle path) | **P1** — controller hand-patching audit timestamp (already flagged in `unzoned-now-audit.md` §"controllers patching updatedAt") | Push setter into service; service uses `tenantTimeService.now(tenantId)`. Or rely on JPA `@PreUpdate` once the entity has the auditing hook. |
| 243 | `response.setSubmittedAt(LocalDateTime.now())` (submission path) | **P0** — submission timestamp drives feedback-window closure | Move into `Feedback360Service.submit(...)`; supply via `tenantTimeService` |

### 10. `api/preboarding/controller/PreboardingController.java`

| Line | Code | Severity | Migration |
|---:|---|---|---|
| 73 | `LocalDate startDate = LocalDate.now()` (`getUpcomingJoiners(days)`) | **P0** — anchors `[today, today+N)` lookup window for upcoming joiners | `tenantTimeService.today(tenantId)` — controller already has tenant context |

### 11. `api/report/controller/`

| File | Line | Code | Severity | Migration |
|---|---:|---|---|---|
| `CustomReportController.java` | 65 | `+ LocalDate.now() + ".csv"` (filename) | **P2** — filename only | Optional: align with `tenantTimeService.today(tenantId)` for cross-region consistency |
| `ReportController.java` | 105 | `LocalDate.now().format(DATE_FORMATTER)` (filename timestamp) | **P2** — filename only | Same |

---

## Severity Roll-Up

| Severity | Count | Files |
|---|---:|---|
| **P0** (business-decision time read) | 10 | `AnalyticsController` ×2, `AnnouncementResponse` ×3, `FlexAllocationResponse`, `ExpenseClaimController`, `Feedback360Controller:243`, `PreboardingController`, `HomeController` (debatable P0/P1) |
| **P1** (user-visible audit/timestamp) | 6 | `EmployeeImportResult` ×3, `SmsNotificationResponse` ×2, `Feedback360Controller:122` |
| **P2** (logs / filename / diagnostic) | 3 | `ExportController`, `CustomReportController`, `ReportController` |

---

## Cross-References to Prior Audits

- **`unzoned-now-audit.md`** lists `OkrController` lines 202/227/252/359/389 (now migrated — 0 remaining) and `Feedback360Controller`, `IntegrationController`, `DocuSignController` (`IntegrationController` & `DocuSignController` now fully migrated). Two `Feedback360Controller` sites remain.
- **`prepersist-now-audit.md`** does not enumerate `api/` package sites.
- **`keka-migration-time-handling.md`** flags `api/migration/controller/DataMigrationController.java` and `api/migration/dto/ImportResult.java` — *not* in this snapshot, indicating they have been migrated.

---

## Recommended Migration Order

1. **Batch A — controllers with tenant context already in scope (1-line fixes):**
   `AnalyticsController:148,167`, `ExpenseClaimController:163`, `PreboardingController:73`, `HomeController:92`. Inject `TenantTimeService`, swap call.
2. **Batch B — controller-hand-patched timestamps (move into service):**
   `Feedback360Controller:122,243`. Service-side migration; aligns with the JPA `@PreUpdate` cleanup tracked in `prepersist-now-audit.md`.
3. **Batch C — response DTOs (factory signature change):**
   `AnnouncementResponse:39,44,49`, `FlexAllocationResponse:72`, `EmployeeImportResult:42,57,71`, `SmsNotificationResponse:66,77`. Add `LocalDateTime now` / `LocalDate today` parameter to static factory methods; pass from the calling controller/service.
4. **Batch D — diagnostic/filename (optional consistency pass):**
   `ExportController:142`, `CustomReportController:65`, `ReportController:105`. Cosmetic; defer until the rest of the codebase aligns.

Estimated effort: ~3–4 hours total (Batch A: 30m, Batch B: 60m incl. tests, Batch C: 90m incl. callsite updates, Batch D: 30m).

---

## Verification Command

```bash
grep -rn "LocalDate\.now()\|LocalDateTime\.now()" \
  backend/src/main/java/com/nulogic/api/ \
  | grep -v "PayrollStatutoryController.java:64"
```

When this returns zero output, the api/ layer is fully migrated. The `application/` and `domain/` layers remain — see `unzoned-now-audit.md` for those waves.
