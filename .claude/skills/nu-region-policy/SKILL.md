---
name: nu-region-policy
description: Use when asked to add a region-specific policy, configure holidays for a region, set up regional payroll rules, timezone-aware attendance, or any region-specific settings for NULogic's distributed workforce.
---

# Region-Aware Policy Builder

> **Purpose:** Scaffold region-specific configuration for NULogic's distributed workforce across multiple regions and timezones.
> Covers leave policies, holiday calendars, working hours, statutory deductions, and attendance rules -- all scoped by region and timezone.

## When to Use

- User says "add policy for region X", "configure holidays", "regional payroll rules", "region-specific settings"
- Setting up timezone-aware cron jobs or attendance rules
- Adding statutory compliance rules for a specific country/region
- Configuring different leave quotas or types per region

## Input Required

- **Region/Country**: Country code (e.g., `IN`, `US`, `AE`) and optional sub-region (e.g., `IN-KA` for Karnataka)
- **Policy type**: Leave, holiday, attendance, payroll/statutory, or shift configuration
- **Effective dates**: When the policy takes effect (`effective_from`, `effective_to`)
- **Specifics**: Leave quotas, holiday list, working hours, tax rates, etc.

## Existing Codebase Patterns

Before creating anything, understand how regions and timezones are already modeled:

### OfficeLocation Entity
**File:** `backend/src/main/java/com/hrms/domain/attendance/OfficeLocation.java`
- Has `timezone` field (default: `"Asia/Kolkata"`)
- Has `workingDays` field (default: `"MON,TUE,WED,THU,FRI"`)
- Has `city`, `state`, `country` fields
- Has `locationCode` (unique per tenant)
- Used for geofencing and attendance rules

### PayrollLocation Entity
**File:** `backend/src/main/java/com/hrms/domain/payroll/PayrollLocation.java`
- Has `countryCode` (ISO 2-letter), `region` (state/province), `timezone`
- Has `localCurrency`, `payFrequency`, `payDay`
- Has tax rates: `baseIncomeTaxRate`, `socialSecurityEmployeeRate`, `socialSecurityEmployerRate`
- Has compliance: `minWage`, `maxWorkingHoursWeek`, `overtimeMultiplier`

### Holiday Entity
**File:** `backend/src/main/java/com/hrms/domain/attendance/Holiday.java`
- Has `holidayType` enum: `NATIONAL`, `REGIONAL`, `OPTIONAL`, `RESTRICTED`, `FESTIVAL`, `COMPANY_EVENT`
- Has `applicableLocations` (TEXT, comma-separated location codes)
- Has `applicableDepartments` (TEXT, comma-separated)
- Has `isOptional`, `isRestricted` flags
- Methods: `isApplicableForLocation(String)`, `isApplicableForDepartment(String)`

### Timezone Rules (Codebase Convention)
- All timestamps stored in **UTC** in the database (`TIMESTAMP` columns, no timezone suffix)
- `OfficeLocation.timezone` and `PayrollLocation.timezone` store IANA timezone IDs (e.g., `Asia/Kolkata`, `America/New_York`)
- Backend uses `java.time.ZoneId` for timezone conversions
- Frontend displays in user's local timezone (derived from employee's assigned office location)

## Steps

### Step 1: Identify the Policy Type

Determine which of these regional policy patterns applies:

| Policy Type | Existing Table | New Table Needed? |
|-------------|---------------|-------------------|
| Holiday calendar | `holidays` | No -- use existing with `applicableLocations` |
| Leave quotas per region | `leave_types` + `leave_policies` | Maybe -- if region-specific quotas need a join table |
| Statutory deductions | `payroll_locations` | Maybe -- for detailed slab-based tax rules |
| Working hours / shifts | `shift_policies` + `office_locations` | No -- use existing |
| Attendance cutoff times | `attendance_settings` | Maybe -- for timezone-specific cutoff rules |

### Step 2: Generate Holiday Calendar (if applicable)

Use the existing `holidays` table. Insert holidays scoped to specific locations:

```sql
-- V{N}: Seed {year} holidays for region {REGION_CODE}

-- Get the location codes for this region
-- Assumes office_locations exist with matching country/state

INSERT INTO holidays (id, tenant_id, holiday_name, holiday_date, holiday_type, description, is_optional, is_restricted, applicable_locations, applicable_departments, year, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), '{TENANT_UUID}', 'Republic Day', '2026-01-26', 'NATIONAL', 'National holiday - India', false, false, 'IN-BLR,IN-HYD,IN-DEL', NULL, 2026, NOW(), NOW(), 0, false),
  (gen_random_uuid(), '{TENANT_UUID}', 'Ugadi', '2026-03-28', 'REGIONAL', 'Regional festival - Karnataka/AP/Telangana', true, false, 'IN-BLR,IN-HYD', NULL, 2026, NOW(), NOW(), 0, false);
```

**Rules:**
- `NATIONAL` holidays: `applicableLocations` = NULL (applies everywhere) or all location codes for that country
- `REGIONAL` holidays: `applicableLocations` = comma-separated location codes for affected offices
- `OPTIONAL`/`RESTRICTED` holidays: Set `is_optional = true` or `is_restricted = true`
- Always include `year` column for easy annual rollover

### Step 3: Generate Leave Policy (if applicable)

If the region needs different leave quotas, create or extend region-specific leave policy configuration.

**Option A: Use existing `leave_types` with location scoping** (preferred if simple):

Add `applicable_locations` column to `leave_types` if not present, or use a join table:

```sql
-- V{N}: Region-specific leave quotas

CREATE TABLE IF NOT EXISTS region_leave_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    leave_type_id       UUID NOT NULL,
    region_code         VARCHAR(10) NOT NULL,   -- ISO 3166-2 (e.g., 'IN-KA', 'US-CA', 'AE')
    timezone            VARCHAR(50) NOT NULL,   -- IANA timezone (e.g., 'Asia/Kolkata')
    annual_quota        INTEGER NOT NULL,
    carry_forward_max   INTEGER DEFAULT 0,
    encashment_allowed  BOOLEAN DEFAULT FALSE,
    effective_from      DATE NOT NULL,
    effective_to        DATE,                   -- NULL = currently active
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_rlp_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
);

CREATE INDEX idx_rlp_tenant ON region_leave_policies(tenant_id);
CREATE INDEX idx_rlp_region ON region_leave_policies(tenant_id, region_code);
CREATE INDEX idx_rlp_effective ON region_leave_policies(tenant_id, region_code, effective_from, effective_to);
CREATE UNIQUE INDEX uq_rlp_tenant_type_region_active
    ON region_leave_policies(tenant_id, leave_type_id, region_code)
    WHERE is_deleted = false AND effective_to IS NULL;
```

### Step 4: Generate Statutory Deduction Rules (if applicable)

For region-specific tax and compliance rules, extend `PayrollLocation` or create a detailed slab table:

```sql
-- V{N}: Statutory deduction slabs for region {REGION_CODE}

CREATE TABLE IF NOT EXISTS statutory_deduction_slabs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    location_id         UUID NOT NULL,          -- FK to payroll_locations
    deduction_type      VARCHAR(50) NOT NULL,   -- 'INCOME_TAX', 'PF', 'ESI', 'PT', 'LWF', 'SOCIAL_SECURITY'
    slab_from           NUMERIC(15, 2) NOT NULL, -- Income range start
    slab_to             NUMERIC(15, 2),          -- Income range end (NULL = no upper limit)
    rate_percent        NUMERIC(5, 2) NOT NULL,
    fixed_amount        NUMERIC(12, 2),          -- Fixed deduction if applicable
    employer_rate       NUMERIC(5, 2),           -- Employer contribution rate
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    region_code         VARCHAR(10) NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sds_location FOREIGN KEY (location_id) REFERENCES payroll_locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_sds_tenant ON statutory_deduction_slabs(tenant_id);
CREATE INDEX idx_sds_location ON statutory_deduction_slabs(tenant_id, location_id);
CREATE INDEX idx_sds_region_type ON statutory_deduction_slabs(tenant_id, region_code, deduction_type);
```

### Step 5: Generate Backend Service Method

Create or extend a service that resolves the correct policy based on employee's region:

```java
/**
 * Resolves the applicable policy for an employee based on their office location's region.
 *
 * Resolution order:
 * 1. Look up employee's primary office location (OfficeLocation entity)
 * 2. Derive region_code from location's country + state (e.g., "IN-KA")
 * 3. Query the region-specific policy table with tenant_id + region_code + effective date
 * 4. Fall back to tenant-wide default if no region-specific policy exists
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RegionPolicyResolver {

    private final OfficeLocationRepository officeLocationRepository;

    /**
     * Get the IANA timezone for an employee's office location.
     * Falls back to tenant default timezone if employee has no assigned location.
     */
    public ZoneId getEmployeeTimezone(UUID employeeId, UUID tenantId) {
        // 1. Look up employee's assigned office location
        // 2. Return ZoneId.of(officeLocation.getTimezone())
        // 3. Fallback: ZoneId.of("Asia/Kolkata") for NULogic default
    }

    /**
     * Convert a UTC timestamp to the employee's local timezone for display.
     */
    public LocalDateTime toEmployeeLocal(Instant utcTimestamp, UUID employeeId, UUID tenantId) {
        ZoneId zone = getEmployeeTimezone(employeeId, tenantId);
        return utcTimestamp.atZone(zone).toLocalDateTime();
    }

    /**
     * Get the region code for an employee (ISO 3166-2 format).
     * Example: "IN-KA" for Bangalore office, "US-CA" for San Francisco office.
     */
    public String getEmployeeRegionCode(UUID employeeId, UUID tenantId) {
        // Derive from office location's country + state
    }
}
```

### Step 6: Configure Timezone-Aware Cron Jobs

For scheduled jobs that must respect regional timezones (leave accrual, attendance marking, payroll cutoff):

```java
/**
 * Timezone-aware cron job pattern.
 *
 * Instead of a single cron expression, iterate over active office locations
 * and check if the current UTC time corresponds to the target local time
 * in each location's timezone.
 *
 * This handles:
 * - Different cutoff times per timezone
 * - DST transitions (ZoneId handles this automatically)
 * - Multiple regions with different business hours
 */
@Scheduled(cron = "0 0 * * * *") // Run every hour UTC
public void processTimezoneAwareTask() {
    List<OfficeLocation> locations = officeLocationRepository.findAllActive(tenantId);

    for (OfficeLocation location : locations) {
        ZoneId zone = ZoneId.of(location.getTimezone());
        LocalTime localNow = LocalTime.now(zone);

        // Check if it's the target local time for this location
        // e.g., midnight for leave accrual, 10:00 AM for attendance cutoff
        if (localNow.getHour() == targetHour) {
            processForLocation(location);
        }
    }
}
```

**DST rules:**
- Always use `java.time.ZoneId` (not fixed UTC offsets like `+05:30`)
- `ZoneId.of("Asia/Kolkata")` does NOT observe DST (India has no DST)
- `ZoneId.of("America/New_York")` automatically handles EST/EDT transitions
- For payroll cutoff: resolve the cutoff date in the employee's timezone FIRST, then convert to UTC for the DB query

### Step 7: Common Regional Configurations

**India (IN):**
- Timezone: `Asia/Kolkata` (UTC+5:30, no DST)
- Pay frequency: Monthly (pay day: last working day or 1st of next month)
- Statutory: PF (12% employee + 12% employer), ESI (0.75% employee + 3.25% employer for gross <= 21000), Professional Tax (state-specific), LWF (state-specific)
- Leave: Earned Leave (15-18/year), Casual Leave (7-12/year), Sick Leave (7-12/year), Maternity (26 weeks), Paternity (15 days)
- Holidays: ~10-15 national + 5-10 regional per state

**UAE (AE):**
- Timezone: `Asia/Dubai` (UTC+4, no DST)
- Pay frequency: Monthly (WPS mandatory)
- Statutory: No income tax, GPSSA pension for Emiratis
- Leave: Annual Leave (30 days), Sick Leave (90 days tiered), Maternity (60 days)
- Work week: Sun-Thu (Fri-Sat off) -- set `workingDays = "SUN,MON,TUE,WED,THU"` on OfficeLocation

**US:**
- Timezone: Multiple (`America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`)
- Pay frequency: Biweekly or semimonthly
- Statutory: Federal income tax (progressive slabs), State tax (varies), FICA (6.2% SS + 1.45% Medicare)
- Leave: Varies by state (no federal mandate for PTO, some states mandate sick leave)

## Output Checklist

- [ ] **Policy scope identified**: Country code, region code, timezone, effective dates
- [ ] **Existing tables reused** where possible (holidays, leave_types, payroll_locations, office_locations)
- [ ] **New tables** follow the nu-migration skill template (tenant_id, audit columns, indexes)
- [ ] **Backend service** uses `ZoneId` for all timezone conversions (never raw UTC offsets)
- [ ] **All timestamps in DB are UTC** -- timezone conversion happens at display/query time only
- [ ] **Cron jobs** iterate over locations and check local time per timezone
- [ ] **DST handling**: `ZoneId` used (not `ZoneOffset`), tested for regions with DST transitions
- [ ] **Region code format**: ISO 3166-2 (e.g., `IN-KA`, `US-CA`, `AE`)
- [ ] **Holiday scoping**: Uses `applicableLocations` field on `holidays` table
- [ ] **Effective date range**: Every policy row has `effective_from` and nullable `effective_to` (NULL = current)
- [ ] **Fallback**: Service resolves region-specific policy first, falls back to tenant-wide default

## Timezone Pitfalls to Avoid

1. **Never store timezone as offset** (e.g., `+05:30`). Always use IANA IDs (`Asia/Kolkata`). Offsets break during DST.
2. **Never assume all employees in a country share one timezone**. The US has 4+ timezones, Russia has 11.
3. **Payroll cutoff**: If cutoff is "last day of month", resolve in the employee's timezone before querying UTC timestamps.
4. **Attendance "day boundary"**: A "day" starts at midnight in the employee's timezone, not midnight UTC.
5. **Leave balance queries**: "Today" for an employee in `America/Los_Angeles` may still be "yesterday" for `Asia/Kolkata`.
6. **Cron scheduling**: A single `@Scheduled(cron = "0 0 0 * * *")` runs at midnight UTC -- which is 5:30 AM IST and 7:00 PM EST the previous day. Use the hourly-scan pattern in Step 6 instead.
