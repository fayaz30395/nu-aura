# Keka Migration — Date/Time Handling Audit

**Date:** 2026-05-14
**Auditor:** Aux-KekaImportAudit (read-only)
**Scope:** `backend/src/main/java/com/nulogic/application/migration/` (sole peer:
`KekaMigrationService`) plus tightly-coupled controller and DTOs under
`backend/src/main/java/com/nulogic/api/migration/`.

## Files reviewed

- `backend/src/main/java/com/nulogic/application/migration/service/KekaMigrationService.java`
  (707 lines, single class; 5 importers: employees, attendance, leave balances,
  salary structures, departments)
- `backend/src/main/java/com/nulogic/api/migration/controller/DataMigrationController.java`
  (thin REST wrapper — multipart upload pass-through, no time logic)
- `backend/src/main/java/com/nulogic/api/migration/dto/ImportResult.java`
  (result envelope; carries `startTime` / `endTime` as `LocalDateTime`)
- Cross-referenced for context (not modified):
  - `backend/src/main/java/com/nulogic/common/entity/BaseEntity.java` —
    `@CreatedDate` / `@LastModifiedDate` are typed `LocalDateTime` (unzoned), wired
    through `JpaAuditingConfig` with no custom `DateTimeProvider` (Spring default
    uses JVM zone).
  - `backend/src/main/java/com/nulogic/common/config/JpaAuditingConfig.java` —
    `AuditorAware<UUID>` only; no `DateTimeProvider` bean.
  - `backend/src/main/java/com/nulogic/domain/tenant/Tenant.java` — `timezone`
    column (IANA, default `Asia/Kolkata`, V165 backfill + NOT NULL + regex check).
  - `backend/src/main/java/com/nulogic/common/util/TenantTimeService.java` —
    canonical per-tenant time resolver with cached `ZoneId` and `Asia/Kolkata`
    fallback. **`KekaMigrationService` does not depend on this service.**
  - `backend/src/main/java/com/nulogic/domain/employee/Employee.java` —
    `joiningDate`, `dateOfBirth` typed `LocalDate` (date-only, no zone implication).
  - `backend/src/main/java/com/nulogic/domain/attendance/AttendanceRecord.java` —
    `attendanceDate` is `LocalDate`; `checkInTime` / `checkOutTime` are
    `LocalDateTime` (unzoned, persisted as-is).
  - `backend/docs/audit/unzoned-now-audit.md` — Wave-10 audit already flagged
    `application/migration/*` as **2 unzoned `LocalDateTime.now()` sites**
    classified as "one-shot migration tooling" (low priority, not yet swept).

## Findings

### Date parsing

`KekaMigrationService.parseDate(String)` (lines 612–624) iterates a static
formatter array (lines 46–53):

```
yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy, dd-MM-yyyy, dd-MMM-yyyy, ISO_LOCAL_DATE
```

Observations:

1. **No zone is attached** — parsing produces `LocalDate`, which is correct for
   `joiningDate`, `dateOfBirth`, leave year, salary `effective_date`, and
   attendance `attendanceDate`. Date-only fields do not need a zone, so this is
   appropriate provided the input string itself is unambiguous.
2. **Format ambiguity hazard.** Both `dd/MM/yyyy` (Indian/Keka convention) and
   `MM/dd/yyyy` (US) are in the list, in that order. First-match-wins iteration
   means `03/04/2026` will parse as **4-March-2026** (dd/MM hits first) — fine
   for Keka exports (Keka is India-only, dd/MM is its native format) but a
   landmine if anyone ever feeds a US-formatted file. There is no detection or
   warning that two formats matched the same string differently.
3. **Excel numeric date branch** (`getCellValue`, line 555–558):
   `cell.getLocalDateTimeCellValue().toLocalDate().toString()` is invoked on
   numeric date-formatted cells. Apache POI's `LocalDateTimeCellValue` is
   computed by interpreting the Excel serial number relative to **the JVM
   default timezone** (POI internally uses `LocaleUtil.getUserTimeZone()`, which
   defaults to the JVM zone unless explicitly set). For a server running in
   IST and a Keka file exported in IST this is harmless; for a server running
   in UTC (typical GKE pods unless `TZ=Asia/Kolkata` is set in the manifest)
   any "midnight in IST" Excel timestamp will roll back one day. **This is the
   only zone-relevant failure mode in date parsing.**
4. **Time parsing** (`parseDateTime`, lines 626–636): `LocalTime.parse(value)`
   accepts ISO-8601 `HH:mm` / `HH:mm:ss` only — no fallback list. Keka's
   typical export uses `HH:mm:ss` so this works, but anything else (e.g.
   `9:30 AM`, `09:30 IST`) silently returns `null`, which then suppresses
   `workDurationMinutes` calculation.
5. **No validation of date ranges** — future joining dates, dates of birth in
   2099, attendance dates before 1900 etc. all parse silently. Out of scope for
   timezone audit but worth flagging.

### Timezone assumptions

The service **never reads the tenant's `timezone` column** and never depends on
`TenantTimeService`. Consequences:

1. **Attendance `checkInTime` / `checkOutTime`** (line 240–241) are built by
   `LocalDateTime.of(date, LocalTime.parse(value))`. The `LocalDateTime` is
   stored verbatim with no zone. Downstream consumers
   (`TenantTimeService`-aware code) will interpret it in the tenant's zone,
   which is **correct iff Keka exported in the tenant's local time**. Keka
   does export in the tenant's configured time zone (IST for Indian
   customers), so for an IST tenant this round-trips correctly. For a future
   non-IST tenant migrating off a Keka instance configured in IST, the
   attendance window would silently shift. **Implicit IST assumption.**
2. **Work duration** (line 251): `Duration.between(checkInTime, checkOutTime)`
   is zone-agnostic because both endpoints are `LocalDateTime` in the same
   (implicit) zone. **Safe** as long as both values came from the same export.
   DST will distort the duration by ±1h on transition days (see edge cases).
3. **Leave year fallback** (line 313): `LocalDate.now().getYear()` is called
   with the JVM zone, not the tenant zone. On 1-Jan 00:00–05:29 IST in a UTC
   JVM the year resolves to the *previous* calendar year — a 5½-hour window
   where leave balances would be imported into the wrong year.
4. **Salary `effective_date` fallback** (line 382):
   `LocalDate.now().toString()` — same JVM-zone bug as #3, with a 5½-hour
   wrong-day window each calendar boundary.

### Backfill timestamps

1. **`createdAt` / `updatedAt`** on every imported entity (`Employee`, `User`,
   `AttendanceRecord`, `LeaveBalance`, `SalaryStructure`, `Department`,
   auto-created `LeaveType`) are populated by Spring Data JPA auditing.
   `JpaAuditingConfig` provides only `AuditorAware<UUID>`; no
   `DateTimeProvider` is registered, so Spring uses
   `CurrentDateTimeProvider` → `LocalDateTime.now()` → **JVM default zone**.
   Result: imported records are stamped with *the wall-clock at import time*,
   not the historical timestamp from Keka. This is "import-time backfill",
   which is conventional, but consumers should be aware that `createdAt` is
   *not* equal to "when the row was created in Keka".
2. **`ImportResult.startTime` / `endTime`** (lines 589, 594) use bare
   `LocalDateTime.now()`. Already counted by `unzoned-now-audit.md` (2 hits in
   migration package). Cosmetic for the result envelope, but inconsistent with
   the post-Wave-10 housekeeping rule that *all* `now()` calls go through
   `TenantTimeService`.
3. **`UUID.randomUUID()` for IDs** plus explicit `setId` on every entity (e.g.
   lines 139, 158, 246, 326, 395, 436, 690, 703). This bypasses
   `@GeneratedValue(GenerationType.UUID)` on `BaseEntity` but does **not**
   affect timestamp behaviour — noted only to confirm we are not invoking any
   custom `@PrePersist` that might set timestamps differently.
4. **No `created_at = sourceExportDate`** anywhere — there is no preservation
   of Keka's original record-creation timestamp. If audit/compliance ever
   needs the original Keka creation time, that data is lost on import.

### Edge case handling

| Case | Behaviour | Risk |
|---|---|---|
| **DST transition** (none in IST; relevant only for future non-IST tenants) | `LocalDateTime` arithmetic ignores DST; `Duration.between` two `LocalDateTime`s straddling a DST jump returns wall-clock delta, not real elapsed time. | Low today, latent for non-IST rollout. |
| **Year boundary** (31-Dec → 1-Jan) | `LocalDate.now().getYear()` (line 313) and `LocalDate.now()` (line 382) use JVM zone. On a UTC pod, 1-Jan 00:00–05:29 IST resolves to year N-1 → leave balances imported into wrong year, salary effective date one day earlier than intended. | **Medium** — 5½-hour daily window per year-end import. |
| **Leap day** (29-Feb) | Excel serial 60 is the well-known POI/Excel "1900 leap year bug" boundary; POI handles dates ≥ 1-Mar-1900 correctly. `parseDate` formatters all accept 29-Feb in leap years and reject in non-leap years (`DateTimeParseException` → next formatter → `null`). | OK. |
| **Empty/blank cell** | `parseDate` returns `null`; downstream code does null-check on `joiningDate` (allowed) but not on attendance `date` — `parseDate` returning `null` for an attendance row triggers explicit error at line 232. | OK. |
| **24:00 / 00:00 ambiguity in `LocalTime.parse`** | `LocalTime.parse("24:00")` throws; `00:00` accepted. | OK. |
| **Check-out before check-in (overnight shift)** | `Duration.between` returns negative; cast to `int` stores a negative `workDurationMinutes` silently. | Pre-existing bug unrelated to TZ. |
| **Tenant in non-IST zone** | All four "Timezone assumptions" findings degrade silently — no warning, no error, no validation. | High latent risk for multi-region rollout. |

## Risk assessment

- **High:** None *today* (single-region IST deployment, single-customer NULogic
  rollout, JVM zone in K8s is conventionally set to `Asia/Kolkata` for the
  current production env).
- **Medium:** Year-boundary `LocalDate.now()` on year/effective-date fallbacks
  (lines 313, 382) — a real 5½-hour bug window every 1-Jan if a UTC pod
  imports leave balances or salary structures without an explicit
  `effective_date`. Probability low (admins rarely import on Jan 1), impact
  bounded (wrong year on a single import batch, fixable with a one-line
  correction migration), but **not blocked** by any current safeguard.
- **Medium:** Excel numeric-date cells (`getLocalDateTimeCellValue()`) are
  JVM-zone dependent. Same UTC-pod-vs-IST-export drift, same off-by-one-day
  outcome at midnight boundaries.
- **Low:** `ImportResult.startTime/endTime` and JPA `@CreatedDate` use JVM
  zone — cosmetic, observability-only.
- **Low (latent):** All implicit-IST assumptions become real bugs the moment a
  non-IST tenant onboards. No automated check, no failing test, no log
  warning would surface this.
- **OK:** Date-only fields (`joiningDate`, `dateOfBirth`, `attendanceDate`,
  `effectiveDate`), formatter list, work-duration calculation within a single
  export.

**Overall risk: Medium.** No High issue today; two distinct Medium issues
(year-boundary fallback, Excel numeric-date zone) and a chain of Low/latent
issues that compound if/when the platform leaves IST.

## Recommendations

(Audit only — no fixes applied.)

1. **Inject `TenantTimeService`** into `KekaMigrationService` and replace the
   two `LocalDateTime.now()` calls (lines 589, 594) and two `LocalDate.now()`
   calls (lines 313, 382). The leave-year and salary-effective-date fallbacks
   are the only behaviour-relevant ones; the result-envelope timestamps are
   cosmetic but worth fixing for consistency with the post-Wave-10 sweep
   policy.

2. **Force POI's user timezone explicitly.** Call
   `LocaleUtil.setUserTimeZone(TimeZone.getTimeZone(tenantZoneId))` before
   parsing each Excel workbook (and restore default in a `finally`). This
   eliminates the silent dependency on JVM `TZ`. Alternative: parse numeric
   date cells with `DateUtil.getJavaDate(value, false, tz)` directly.

3. **Add a `documentedAt`/`importedFromKekaAt` field** (separate from
   `createdAt`) if business needs to preserve the *Keka* creation timestamp
   of imported rows. Currently that signal is lost.

4. **Resolve the dd/MM vs MM/dd ambiguity** by either (a) requiring an explicit
   `date_format` column header, or (b) sniffing the first 50 rows for any
   day-value > 12 to detect the format with certainty, falling back to a hard
   error rather than first-match-wins. Today Keka is the only source so risk
   is acceptable, but the failure mode is silent and unrecoverable.

5. **Sanity-check parsed dates** against a plausible range
   (`1900-01-01 ≤ joining_date ≤ now+1y`, etc.) and surface out-of-range
   values as warnings in `ImportResult`. Out of scope for TZ but tightly
   coupled to date parsing.

6. **Add a regression test** that runs the importer with the JVM zone set to
   UTC and asserts that a Keka file exported in IST produces the same
   `LocalDate` / `LocalDateTime` rows as when run in IST. This is the single
   test that would have caught all of the above before they shipped.

7. **Log the resolved tenant zone at the start of every import** so post-hoc
   investigation can correlate any drift with the zone in force. Cheap, high
   value.

aux-keka-import-audit done — risk=Medium
