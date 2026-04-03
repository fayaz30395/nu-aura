---
name: nu-timezone
description: Use when building any time-sensitive feature — attendance, leave, scheduling, payroll, notifications, cron jobs, shifts, calendar events, or any feature that stores, displays, or calculates with timestamps. Provides a comprehensive timezone correctness checklist.
---

# Timezone-Aware Feature Checklist

## When to Use

- Building or modifying: attendance, leave, payroll, shifts, scheduling, notifications, calendar, cron jobs, reports with date ranges
- Any feature that stores timestamps or displays dates/times to users
- When a bug involves "wrong date", "wrong time", "off by one day", or "attendance marked on wrong day"
- When adding a new `@Scheduled` cron job that affects employee-facing data
- When implementing date pickers or date range filters in the frontend

## Input Required

- **Feature name**: what is being built (e.g., "attendance check-in", "leave accrual cron", "shift swap")
- **Affected layers**: backend only, frontend only, or full stack
- **Time-sensitive operations**: list any operations that depend on "today", "midnight", "start of month", etc.

## Context: Current Timezone Patterns in NU-AURA

The codebase already has timezone support in key entities:

- **`OfficeLocation.timezone`** — `VARCHAR(50)`, defaults to `Asia/Kolkata` (see `backend/src/main/java/com/hrms/domain/attendance/OfficeLocation.java:71-73`)
- **`PayrollLocation.timezone`** — `VARCHAR(255)` (see `backend/src/main/java/com/hrms/domain/payroll/PayrollLocation.java:41-42`)
- **`TenantRegistrationRequest.timezone`** — tenant-level default timezone
- **`OfficeLocationRequest.timezone`** — IANA identifier, default `Asia/Kolkata` (see DTO at `backend/src/main/java/com/hrms/api/attendance/dto/OfficeLocationRequest.java:71-72`)
- **`AttendanceController`** — accepts `attendanceDate` from client to handle timezone differences (see lines 79, 102)
- **`GoogleMeetService`** — uses `ZoneId.systemDefault()` for meeting scheduling (potential issue if server timezone differs from user timezone)

NULogic offices: Fremont CA (America/Los_Angeles), Chennai (Asia/Kolkata), Mexico City (America/Mexico_City), Santiago (America/Santiago).

## Steps

### 1. Storage Layer Checklist

For every timestamp column in the feature:

- [ ] **Column type is `TIMESTAMP WITH TIME ZONE`** (PostgreSQL `timestamptz`), NOT `TIMESTAMP` or `DATETIME`
  - Flyway migration must use: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Check: `grep -r "TIMESTAMP " db/migration/V{N}__*.sql` — flag any bare `TIMESTAMP` without `WITH TIME ZONE`

- [ ] **All dates stored in UTC** — the database and application server must agree on UTC storage
  - Spring Boot: ensure `spring.jpa.properties.hibernate.jdbc.time_zone=UTC` in `application.yml`
  - PostgreSQL: `SET timezone = 'UTC'` at connection level (Neon default is UTC)

- [ ] **Employee timezone is stored** — every employee should have a timezone derived from their office location
  - Source: `OfficeLocation.timezone` (IANA format, e.g., `Asia/Kolkata`)
  - If employees can be remote, consider adding `Employee.timezoneOverride` for personal timezone

- [ ] **Date-only fields use `DATE` type, not `TIMESTAMP`** — for things like "leave date" or "holiday date" where time is irrelevant
  - A leave on 2026-04-15 means 2026-04-15 in the employee's timezone, not UTC

### 2. Backend Service Layer Checklist

For every service method that works with time:

- [ ] **Use `ZonedDateTime` or `OffsetDateTime`, NEVER `LocalDateTime`** for any cross-timezone data
  - `LocalDateTime` loses timezone info — only use it for truly local concepts (e.g., "meeting is at 10:00 AM office time")
  - Pattern: `ZonedDateTime.now(ZoneId.of(employee.getOfficeLocation().getTimezone()))`

- [ ] **"Today" is relative to the user** — never use `LocalDate.now()` without a timezone
  - Correct: `LocalDate.now(ZoneId.of(employeeTimezone))`
  - Wrong: `LocalDate.now()` (uses server JVM timezone)

- [ ] **Cron jobs that process per-employee data must iterate by timezone**
  - Example: leave accrual at midnight must accrue for Asia/Kolkata employees at their midnight, not server midnight
  - Pattern:
    ```java
    Set<String> timezones = officeLocationRepository.findDistinctTimezones();
    for (String tz : timezones) {
        ZoneId zone = ZoneId.of(tz);
        LocalDate today = LocalDate.now(zone);
        // Process employees in this timezone
    }
    ```

- [ ] **Attendance cutoff uses office timezone** — check-in/check-out boundaries must use the office location timezone
  - The `AttendanceController` already passes `attendanceDate` from client (line 79) — preserve this pattern

- [ ] **Payroll period boundaries are timezone-specific**
  - "March 2026 payroll" means March 1 00:00:00 to March 31 23:59:59 in the payroll location timezone
  - Use `PayrollLocation.timezone` to determine boundaries

- [ ] **Scheduled notifications use recipient timezone**
  - "Send reminder at 9 AM" means 9 AM in the employee's timezone
  - Pattern: calculate `ZonedDateTime` per employee, convert to UTC for the scheduler

- [ ] **Avoid `ZoneId.systemDefault()`** — this is the JVM timezone (server-dependent)
  - Found in: `GoogleMeetService.java` (lines 66-67, 74-75) — this should use the organizer's timezone instead
  - Found in: `SamlConfigurationService.java` (line 178) — acceptable for certificate expiry checks

- [ ] **DST transitions handled** — when clocks spring forward or fall back:
  - A 2:30 AM event during spring-forward does not exist — handle `DateTimeException`
  - A 1:30 AM event during fall-back exists twice — use `ZonedDateTime.withEarlierOffsetAtOverlap()` or `.withLaterOffsetAtOverlap()`

### 3. API Layer Checklist

- [ ] **Timestamps in API responses use ISO 8601 with offset**: `2026-04-02T14:30:00+05:30`
  - Spring Boot default with `ZonedDateTime` serialization handles this
  - Ensure Jackson is configured: `spring.jackson.serialization.write-dates-as-timestamps=false`

- [ ] **Date-range query parameters include timezone context**
  - Example: `GET /api/v1/attendance?from=2026-04-01&to=2026-04-30&timezone=Asia/Kolkata`
  - Or derive timezone from the authenticated user's office location

- [ ] **Accept timezone in request DTOs where applicable**
  - The `CheckInRequest` and `CheckOutRequest` DTOs already have a timezone comment (lines 30) — implement it

### 4. Frontend Display Checklist

- [ ] **All timestamps converted to user's local timezone before display**
  - Get user timezone from auth store (derived from employee profile / office location)
  - Pattern:
    ```typescript
    const userTimezone = useAuthStore((s) => s.user?.timezone ?? 'Asia/Kolkata');
    const displayTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: userTimezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(utcTimestamp));
    ```

- [ ] **Date pickers operate in user's local timezone**
  - When user selects "April 15", that means April 15 in THEIR timezone
  - Send to backend as: `{ date: "2026-04-15", timezone: "Asia/Kolkata" }` or convert to UTC

- [ ] **Show timezone indicator for ambiguous times**
  - If displaying times to managers who oversee cross-timezone teams, show the timezone abbreviation
  - Example: "2:30 PM IST" not just "2:30 PM"

- [ ] **"Today" in dashboard widgets uses user timezone**
  - `new Date()` in the browser gives local time — this is correct for display but must match the timezone sent to the backend

- [ ] **Relative time ("2 hours ago") is timezone-safe** — these are always safe since they diff from `Date.now()`

### 5. Testing Checklist

- [ ] **Test with employees in at least 3 NULogic timezones**: `Asia/Kolkata`, `America/Los_Angeles`, `America/Mexico_City`

- [ ] **Test midnight boundary**: if an employee in IST (UTC+5:30) checks in at 11:55 PM IST, does it record on the correct date?

- [ ] **Test date boundary across UTC day change**: IST midnight (00:00) = previous day 18:30 UTC. Does attendance for "April 2" in IST show correctly?

- [ ] **Test DST transition** (affects America/Los_Angeles, America/Santiago, America/Mexico_City):
  - Spring forward: March second Sunday — 2 AM jumps to 3 AM
  - Fall back: November first Sunday — 2 AM repeats
  - Does the leave/attendance system handle the missing/duplicate hour?

- [ ] **Test cron job at timezone boundaries**: run the leave accrual cron and verify that employees in different timezones accrue on the correct day

- [ ] **Test payroll period boundaries**: March payroll for a PST employee should include March 1 00:00 PST through March 31 23:59 PST

- [ ] **Test report date-range filters**: filtering "April 2026" attendance for a team with members in IST and PST should show correct records for each member

## Output Checklist

After completing the feature, verify:

- [ ] All checklist items above are addressed (mark N/A where not applicable)
- [ ] No use of `LocalDateTime` for cross-timezone data in new code
- [ ] No use of `ZoneId.systemDefault()` in new code
- [ ] No use of `LocalDate.now()` without explicit timezone in new code
- [ ] Frontend displays times in user timezone with indicator where needed
- [ ] At least one test covers a cross-timezone scenario
- [ ] Flyway migration uses `TIMESTAMPTZ` for all new timestamp columns

## Reference Files

- Office location timezone field: `backend/src/main/java/com/hrms/domain/attendance/OfficeLocation.java`
- Payroll location timezone: `backend/src/main/java/com/hrms/domain/payroll/PayrollLocation.java`
- Attendance controller (client date pattern): `backend/src/main/java/com/hrms/api/attendance/controller/AttendanceController.java`
- Office location DTO: `backend/src/main/java/com/hrms/api/attendance/dto/OfficeLocationRequest.java`
- Scheduled jobs inventory: root `CLAUDE.md` section on 25 `@Scheduled` jobs
- NULogic offices: Fremont CA, Chennai, Mexico City, Santiago (see `themes/nulogic.md`)
