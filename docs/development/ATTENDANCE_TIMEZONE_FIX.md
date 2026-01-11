# Attendance Multi-Session & Timezone Fix

## Overview

This document describes the fixes implemented to resolve attendance check-in/check-out issues, particularly:
1. Multi-session check-in/check-out not working after the first session
2. Timezone inconsistencies causing wrong date calculations

## Problem Description

### Issue 1: Multi-Session Check-Out Failure

**Symptom:** After checking out and trying to check in again, users would see the error:
```
"Check-out time cannot be before check-in time"
```

**Root Cause:** The backend's `validateCheckoutTime` method was comparing the checkout time against the **first** check-in time of the day (stored in `AttendanceRecord.checkInTime`), instead of the **latest open time entry's** check-in time.

**Example Scenario:**
- 9:00 AM: User checks in (First check-in, stored in record)
- 12:00 PM: User checks out for lunch
- 1:00 PM: User checks in again (creates new time entry)
- 5:00 PM: User tries to check out
- **Bug:** System compares 5:00 PM against 9:00 AM (first check-in) instead of 1:00 PM (latest check-in)

### Issue 2: Timezone Inconsistencies

**Symptom:** Attendance records were being created/fetched for the wrong date, especially for users in timezones ahead of UTC (e.g., IST, JST).

**Root Cause:** The frontend was using `new Date().toISOString().split('T')[0]` which returns the **UTC date**, not the local date.

**Example:**
- Local time: 4:00 AM IST on December 23, 2025
- UTC time: 10:30 PM on December 22, 2025
- `toISOString().split('T')[0]` returns: `"2025-12-22"` (wrong!)
- Expected: `"2025-12-23"` (correct!)

## Solution

### Backend Fix

**File:** `hrms-backend/src/main/java/com/hrms/application/attendance/service/AttendanceRecordService.java`

**Change:** Updated `validateCheckoutTime` to use the latest open time entry's check-in time:

```java
// Before (buggy)
private void validateCheckoutTime(AttendanceRecord record, LocalDateTime checkOutTime) {
    if (record.getCheckInTime() != null && checkOutTime.isBefore(record.getCheckInTime())) {
        throw new IllegalArgumentException("Check-out time cannot be before check-in time");
    }
    // ...
}

// After (fixed)
private void validateCheckoutTime(AttendanceRecord record, LocalDateTime checkOutTime) {
    // For multi check-in/out support, validate against the latest open time entry's check-in
    Optional<AttendanceTimeEntry> openEntry = timeEntryRepository.findOpenEntryByAttendanceRecordId(record.getId());
    LocalDateTime relevantCheckInTime = openEntry
        .map(AttendanceTimeEntry::getCheckInTime)
        .orElse(record.getCheckInTime());

    if (relevantCheckInTime != null && checkOutTime.isBefore(relevantCheckInTime)) {
        throw new IllegalArgumentException("Check-out time cannot be before check-in time");
    }
    // ...
}
```

### Frontend Fix

**New Utility File:** `hrms-frontend/lib/utils/dateUtils.ts`

Created a centralized utility for consistent date handling:

```typescript
/**
 * Get local date string in YYYY-MM-DD format.
 * Use this instead of `new Date().toISOString().split('T')[0]`
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get local date-time string in ISO-like format using local timezone.
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const dateStr = getLocalDateString(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr}T${hours}:${minutes}:${seconds}`;
}

// Additional utilities: getDateOffsetString, getMonthStartString, getMonthEndString, etc.
```

**Updated Files:**

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Replaced inline date formatting with utility functions |
| `app/attendance/page.tsx` | Uses `getLocalDateString()`, `getDateOffsetString()` |
| `app/attendance/team/page.tsx` | Uses `getLocalDateString()` for initial state |
| `app/attendance/my-attendance/page.tsx` | Uses `getMonthStartString()`, `getMonthEndString()` |
| `app/me/attendance/page.tsx` | Full refactor to use utility functions |

## Available Utility Functions

| Function | Description | Example Output |
|----------|-------------|----------------|
| `getLocalDateString()` | Current date in YYYY-MM-DD | `"2025-12-23"` |
| `getLocalDateString(date)` | Specific date in YYYY-MM-DD | `"2025-12-25"` |
| `getLocalDateTimeString()` | Current datetime | `"2025-12-23T14:30:45"` |
| `getDateOffsetString(-7)` | 7 days ago | `"2025-12-16"` |
| `getDateOffsetString(1)` | Tomorrow | `"2025-12-24"` |
| `getMonthStartString(2025, 11)` | First day of Dec 2025 | `"2025-12-01"` |
| `getMonthEndString(2025, 11)` | Last day of Dec 2025 | `"2025-12-31"` |
| `isToday(date)` | Check if date is today | `true` / `false` |
| `isSameDay(date1, date2)` | Compare two dates | `true` / `false` |

## Usage Guidelines

### DO use utility functions:
```typescript
import { getLocalDateString, getLocalDateTimeString } from '@/lib/utils/dateUtils';

// For API calls that need a date
const today = getLocalDateString();
await attendanceService.getAttendanceByDateRange(employeeId, today, today);

// For check-in/check-out with timestamp
const localTime = getLocalDateTimeString();
await attendanceService.checkIn({
  employeeId,
  checkInTime: localTime,
  attendanceDate: getLocalDateString(),
});
```

### DON'T use raw Date methods for date strings:
```typescript
// BAD - causes timezone issues
const today = new Date().toISOString().split('T')[0];

// BAD - verbose and error-prone
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
```

## Testing

### E2E Tests Added

1. **Dashboard Attendance Widget Tests** (`e2e/dashboard.spec.ts`)
   - Check-in from dashboard
   - Check-out from dashboard
   - Check-in again after check-out (multi-session)
   - State persistence after page refresh

2. **Attendance Page Tests** (`e2e/attendance.spec.ts`)
   - Enhanced with multi-session scenarios

### Manual Testing Checklist

- [ ] Check in at start of day
- [ ] Check out for lunch
- [ ] Check in again after lunch
- [ ] Check out at end of day
- [ ] Verify all sessions recorded correctly
- [ ] Test in different timezones (use browser DevTools)
- [ ] Test around midnight (timezone edge case)

## Related Files

- `hrms-backend/src/main/java/com/hrms/application/attendance/service/AttendanceRecordService.java`
- `hrms-frontend/lib/utils/dateUtils.ts`
- `hrms-frontend/app/dashboard/page.tsx`
- `hrms-frontend/app/attendance/page.tsx`
- `hrms-frontend/app/attendance/team/page.tsx`
- `hrms-frontend/app/attendance/my-attendance/page.tsx`
- `hrms-frontend/app/me/attendance/page.tsx`
- `hrms-frontend/e2e/dashboard.spec.ts`
- `hrms-frontend/e2e/attendance.spec.ts`

## Commit Reference

- **Commit:** `0dbbc53`
- **Date:** December 23, 2025
- **Message:** "fix: Resolve attendance multi-session check-in/check-out issues"
