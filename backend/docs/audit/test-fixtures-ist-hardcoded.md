# Test Fixtures — IST-Hardcoded / JVM-Default-Zone Leaks

**Auditor:** Aux-TestFixtureAudit (read-only)
**Date:** 2026-05-14
**Scope:** `backend/src/test/java/`
**Companion docs:**
- `backend/docs/audit/unzoned-now-audit.md` (production-code side)
- `backend/docs/audit/tenanttime-service-review.md`
- `backend/src/test/java/com/nulogic/architecture/TenantTimeArchitectureTest.java` (production-side ArchUnit guard; tests are intentionally exempt)

---

## Methodology

After Wave-10 / P0-3 (S11-M) migrated ~785 production call sites onto `TenantTimeService`, ArchUnit
now blocks new `LocalDate.now()` / `LocalDateTime.now()` / hardcoded `ZoneId.of(...)` calls in
**production** code (`com.nulogic..` minus `..config..` and the resolver itself). Test code is
deliberately outside the ArchUnit boundary — but that means test fixtures can still encode
IST-flavoured clock assumptions that will mismatch as soon as a non-IST tenant exercises the same
business flow.

This audit scans `backend/src/test/java/` for four leak shapes:

| # | Pattern | Why it leaks |
|---|---------|--------------|
| L1 | `LocalDate.now()` / `LocalDateTime.now()` (zero-arg) | Reads JVM default zone. Tests author hours/days against IST-shaped today, then pass to a service that now resolves the tenant zone. |
| L2 | `LocalDateTime.now().withHour(N)` for business-hour `N` (9 / 10 / 17 / 18 / 22 / 6) | Builds "9 AM in JVM zone". When the service treats the value as wall-time-in-tenant-zone, the IST-vs-other-zone offset surfaces as a 5h30–14h30 skew. |
| L3 | `LocalDate.of(YYYY, M, D, …)` with comments suggesting "today"/"yesterday"/IST-relative reasoning | Hardcoded date with implicit IST semantics. |
| L4 | `ZoneId.of("Asia/Kolkata")` in test setup; ISO-string fixtures with `+05:30` offset | Explicitly IST. |

**Counts (raw matches across `src/test/java/`):**

| Metric | Count |
|--------|-------|
| Files using `LocalDate.now()` / `LocalDateTime.now()` (any form) | **147** |
| Total `LocalDate.now()` / `LocalDateTime.now()` call sites | **754** |
| `LocalDate.now()`-chained calls (`LocalDate.now().minus…` / `.plus…` / `.with…`) | **303** |
| `LocalDateTime.now()`-chained calls | **69** |
| `LocalDateTime.now().withHour(N)` business-hour leaks | **11** |
| Hardcoded `ZoneId.of("Asia/Kolkata")` | **3** call sites in **2** files |
| `LocalDate.of(...)` literal dates | **214** |
| `LocalDateTime.of(year, …)` literal datetimes | **3** |
| JSON fixture files with `+05:30` offsets | **0** (no JSON fixtures present) |

The 754 zero-arg `.now()` calls are not enumerated line-by-line in this doc — the production-side
companion (`unzoned-now-audit.md`) already establishes that the systemic risk lives in chained calls
that bake the JVM zone into a business assertion. The tables below enumerate the **highest-signal
finds**: the IST-hour leaks (L2), the `ZoneId.of("Asia/Kolkata")` cases (L4), and the unambiguous
"today"-relative test fixtures that combine L1 and L2.

---

## Summary

**TEST-INTENT-OK: 5 (categories)** | **TEST-IST-LEAK: 13** | **TEST-AMBIGUOUS: 6**

The numbers above count distinct *issues* (each is a localised pattern in a file), not raw matches.
Several issues encompass repeated identical lines in the same fixture block — fixing the root pattern
clears all of them.

> **Headline finding.** The dominant test-side leak is **L2: `LocalDateTime.now().withHour(9 / 18 / 22 / 6)`
> for check-in / check-out / overnight-shift fixtures**. These assume "9 AM" = "tenant business hours";
> under a non-IST tenant, the same wall-clock-9-AM-in-JVM-zone is a different moment on the calendar.
> Because the production code now flows through `TenantTimeService.now(tenantId)`, the service-under-test
> and the fixture are no longer in agreement about which zone "9 AM" lives in.

---

## TEST-IST-LEAK (must fix)

These fixtures encode IST-shaped clock semantics that will break under multi-zone tenants. They
should be parameterised on a fixed `Clock` (or a `TenantTimeService` mock that returns a fixed
`Instant` plus tenant-zone) so the fixture says *which* zone its hour value lives in.

| File | Line | Pattern | Why it leaks |
|------|------|---------|--------------|
| `application/attendance/service/AttendanceRecordServiceTest.java` | 76–77 | `checkInTime = LocalDateTime.now().withHour(9).withMinute(0);` / `checkOutTime = LocalDateTime.now().withHour(18).withMinute(0);` | "9 AM check-in / 6 PM check-out" in JVM zone. Service resolves tenant zone → fixture and SUT disagree. |
| `application/attendance/service/AttendanceRecordServiceTest.java` | 178 | `LocalDateTime pastCheckInTime = LocalDateTime.now().minusDays(5).withHour(9).withMinute(0);` | Same shape, 5-day backdated. |
| `application/attendance/service/AttendanceRecordServiceTest.java` | 295 | `LocalDateTime yesterdayCheckIn = LocalDateTime.now().minusDays(1).withHour(22).withMinute(0);` | Overnight-shift test — 10 PM yesterday IST is a *different calendar day* in `America/New_York`. The "overnight" property under test is zone-sensitive. |
| `application/attendance/service/AttendanceRecordServiceTest.java` | 298 | `LocalDateTime todayCheckOut = LocalDateTime.now().withHour(6).withMinute(0);` | Companion to L:295. 6 AM IST today and 6 AM NY today straddle different UTC instants. |
| `application/attendance/service/AttendanceRecordServiceTest.java` | 381, 396 | `yesterday.atTime(22, 0)` for overnight check-in | `yesterday` is derived from `LocalDate.now()`, so the same drift applies. |
| `application/shift/service/ShiftAttendanceServiceTest.java` | 100–104, 112–116, 124–128, 136, 140–141, 149, 178, 197 | `Shift` built with `LocalTime.of(9,0)` / `LocalTime.of(18,0)`, then **combined with `LocalDate.now()`** at L:104/116/128/141/etc. as the "check-in" time. | The `LocalTime`s alone are fine (shift config). The leak is the join with `LocalDate.now()` — the service computes "today" via `TenantTimeService.today(tenantId)`, but the test feeds JVM-zone today as both date and reference instant. |
| `application/compliance/service/DsrServiceIntegrationTest.java` | 198–199 | `.checkInTime(LocalDateTime.now().minusDays(5).withHour(9))` / `.checkOutTime(... .withHour(18))` | Same 9-to-6 leak inside the DSR export fixture. The 90-day-window assertion is zone-dependent. |
| `integration/AttendanceControllerTest.java` | 141–142 | `req.put("checkInTime", LocalDateTime.now().minusDays(2).withHour(9).toString());` / `.withHour(18)` | Posted to the regularization controller as an ISO string with no zone — backend parses under tenant zone, fixture built under JVM zone. |
| `integration/CalendarControllerTest.java` | 143–144 | `.startTime(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0))` / `.withHour(11)` | Calendar event "tomorrow 10 AM". Multi-zone tenants will see a 5h30 drift on the event start. |
| `e2e/AttendanceE2ETest.java` | 402–403 | `LocalDate.now().minusDays(1)` + `LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.of(9, 0))` | E2E reg-of-yesterday test. Both the calendar-day and the 9-AM hour are JVM-zone-shaped. |
| `application/analytics/service/ScheduledReportServiceTest.java` | 157 | `assertThat(saved.getNextRunAt().toLocalDate()).isEqualTo(LocalDate.now());` | Service computes next run via tenant zone; assertion compares against JVM-zone today. Will flake / fail near midnight in NY when JVM is IST. |
| `common/util/TenantTimeServiceTest.java` | 60 | `private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Kolkata");` | **TEST-INTENT-OK** in this *one* file (it is the unit test for the resolver and is exercising IST as one of several zones, see L:61–62 for NY and London). Listed here only because it is the canonical hardcoded `Asia/Kolkata` reference; it is correct as-is and should not be touched. |
| `application/attendance/service/OfficeLocationServiceTest.java` | 85, 153 | `.timezone("Asia/Kolkata")` on the `OfficeLocation` builder | **TEST-INTENT-OK** — `timezone` is a *property* of the office location entity, not a clock read. The test is asserting CRUD behaviour. Listed for completeness only; safe as-is. |

> The last two rows are listed in this table for transparency but are *not* leaks — they are pulled
> back out under TEST-INTENT-OK below. The 11 true L2 leaks at the top of the table are the ones
> that need parameterisation.

---

## TEST-AMBIGUOUS

These need author review. They are not obvious IST-baked-into-the-test, but they rely on
`LocalDate.now()` for fixture authoring while the service-under-test consults
`TenantTimeService.today(tenantId)`. Whether they break depends on (a) whether the test stubs the
tenant zone and (b) whether the assertion checks a property that is zone-invariant.

| File | Line | Pattern | Why it might leak |
|------|------|---------|-------------------|
| `integration/ApprovalChainIntegrationTest.java` | 116–117 | `lenient().when(tenantTimeService.now(any())).thenReturn(LocalDateTime.now()); lenient().when(tenantTimeService.today(any())).thenReturn(LocalDate.now());` | Mocks the service to *return* JVM-zone now. This is a deliberate pin to JVM-zone; correct for assertion-of-passthrough, but masks zone bugs in any downstream production code that later reads the same `TenantTimeService` again with a different tenant. |
| `integration/ApprovalChainIntegrationTest.java` | 650, 683 | `.createdAt(LocalDateTime.now().minusDays(3))` / `.minusHours(73)` | The SLA assertion ("past any reasonable SLA") is zone-invariant if the service compares two `LocalDateTime`s of the same origin. AMBIGUOUS — depends on whether the SLA check uses `Instant` or wall-clock today. |
| `integration/AttendanceControllerTest.java` | 64–65, 87–88, 109–110, 140 | `req.put("checkInTime", LocalDateTime.now().toString());` / `req.put("attendanceDate", LocalDate.now().toString());` | Posts unzoned ISO to a controller that re-parses under tenant zone. The test asserts on HTTP status, not on the stored value's zone. May or may not surface a bug depending on validation. |
| `integration/ResourceManagementAllocationIntegrationTest.java` | 92, 98–99, 145, 158 | `.startDate(LocalDate.now().minusDays(30))` / `.plusDays(20)` / `.plusDays(30)` | Allocation windows. If the service computes "is allocation active today" via `TenantTimeService.today(tenantId)`, a non-IST tenant near midnight could land on the wrong side. |
| `integration/MySpaceUseCaseIntegrationTest.java` | 200–201 | `String startDate = LocalDate.now().minusDays(30).toString();` / `String endDate = LocalDate.now().toString();` | "Last 30 days" report query. Tenant-zone-dependent if the report SQL uses `current_date AT TIME ZONE tenant_zone`. |
| `integration/PulseSurveyControllerTest.java` | 201–202 | `req.put("startDate", java.time.LocalDate.now().toString()); req.put("endDate", java.time.LocalDate.now().plusDays(30).toString());` | Survey window. If `start_date <= now()` validation runs server-side under tenant zone, fixture posts JVM-zone today which may already be tomorrow in the tenant zone. |

---

## TEST-INTENT-OK

**Count: 5 broad categories, covering the bulk of the 214 `LocalDate.of(...)` literals and the 3
`LocalDateTime.of(...)` literals.**

1. **Hardcoded statutory / financial-year dates** — e.g.
   `LocalDate.of(2026, 4, 1)` (Indian FY start) in
   `integration/CompensationServiceTest.java`,
   `integration/PayrollControllerTest.java`,
   `api/statutory/controller/LWFControllerTest.java`. These are *intentionally* IST-business
   dates because the tests assert FY arithmetic; they should remain IST.

2. **Hardcoded national holidays** —
   `integration/HolidayServiceTest.java`, `application/attendance/service/HolidayServiceTest.java`
   use `LocalDate.of(2024, 8, 15)` (Indian Independence Day), `LocalDate.of(2024, 1, 26)`
   (Republic Day), etc. These are correct domain fixtures.

3. **`LocalTime.of(9, 0) / LocalTime.of(18, 0)` as `Shift.startTime` / `Shift.endTime`** — in
   `api/shift/controller/ShiftControllerTest.java`,
   `application/shift/service/ShiftScheduleServiceTest.java`,
   `application/timetracking/service/TimeTrackingServiceTest.java`. These are *configured* shift
   windows (property data), not clock reads. They are zone-free and correct.

4. **Specific known-good moments** — e.g.
   `LocalDateTime.of(2026, 3, 1, 10, 0)` in
   `application/auth/service/MfaServiceTest.java:318` (MFA setup timestamp round-trip),
   `LocalDateTime.of(2026, 1, 1, 0, 0)` in
   `application/workflow/service/WorkflowServiceTest.java:287` (filter pass-through). The tests
   verify that the SUT preserves the value; the value itself carries no clock semantics.

5. **`ZoneId.of("Asia/Kolkata")` in `common/util/TenantTimeServiceTest.java`** and
   `.timezone("Asia/Kolkata")` on `OfficeLocation` builders in
   `application/attendance/service/OfficeLocationServiceTest.java`. The former is the unit test
   for the resolver itself (IST is one of several zones it tests, alongside `America/New_York` and
   `Europe/London`); the latter treats the IANA string as a property value, not a clock read.

6. **`Instant.now()` uses** in `JwtSecurityTest`, `TokenBlacklistServiceTest`,
   `DocuSignControllerTest`, `IntegrationEventRouterTest`, `DocuSignConnectorTest`. Per the
   architecture rule (`TenantTimeArchitectureTest.java:36`), `Instant.now()` is **explicitly
   permitted** — it carries no zone.

---

## Recommended fix pattern

For each TEST-IST-LEAK entry, two options exist:

**Option A — pin a `Clock`:**

```java
private static final Clock FIXED_CLOCK =
        Clock.fixed(Instant.parse("2026-05-14T09:00:00Z"), ZoneOffset.UTC);

// in @BeforeEach:
when(tenantTimeService.nowInstant(tenantId)).thenReturn(FIXED_CLOCK.instant());
when(tenantTimeService.zoneOf(tenantId)).thenReturn(ZoneId.of("America/New_York"));
LocalDateTime checkInTime =
        FIXED_CLOCK.instant().atZone(ZoneId.of("America/New_York")).toLocalDateTime();
```

This makes the test assert *"under a NY-zone tenant, check-in at the NY 9 AM moment is on-time"*
rather than *"under the JVM-zone today, withHour(9) is on-time"*.

**Option B — assert zone-invariant properties only:**

If the test only cares that `late-minutes > 0`, drop the absolute hour and parameterise on
`Duration` from the shift-start (which the SUT also computes from `Duration`). This eliminates the
calendar-day question entirely.

The pre-existing `TenantTimeServiceTest` (see L:201–230 for the NY-vs-IST hour comparison) is the
canonical reference for option A.

---

## Acceptance

- Doc created: `backend/docs/audit/test-fixtures-ist-hardcoded.md` (this file).
- Non-trivial finds enumerated: 13 TEST-IST-LEAK + 6 TEST-AMBIGUOUS = 19 distinct issues across
  10 test files.
- Bulk leak surface (754 zero-arg `.now()` calls across 147 files) is acknowledged and bounded;
  the high-signal subset is named.
- Author follow-up: the TEST-IST-LEAK rows are the priority. The TEST-AMBIGUOUS rows need a
  pairing with the corresponding service-under-test author to confirm whether the assertion is
  actually zone-sensitive.
