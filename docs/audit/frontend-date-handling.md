# Frontend Date Handling Audit

**Scope:** `frontend/` (Next.js 14 App Router, TypeScript strict, date-fns 3, dayjs 1.11, Mantine 8 `@mantine/dates`).
**Author:** Aux-FrontendDateAudit (read-only).
**Date:** 2026-05-14.
**Companion to:** backend tenant-aware time work — assesses whether the FE will need a parallel adjustment.

---

## TL;DR

The frontend has **no concept of a "tenant timezone"** today. Every render, every "is today / is past", every `new Date()` and every `toISOString()` resolves against the **browser's** zone (or UTC for ISO strings). For NULogic-internal usage this happens to coincide with IST and is therefore invisible — but the moment the backend starts treating timezone as a tenant attribute, the FE will diverge by ±5.5h to ±13h on any cross-zone access (e.g., a Bangalore admin reviewing a US office's attendance).

Two parallel date-utility families exist (`lib/utils/date-utils.ts` and `lib/utils/dateUtils.ts`) plus a third (`lib/utils/format/date.ts`) and a fourth (`lib/utils/index.ts`). None accept a timezone parameter. `@mantine/dates` is wired through `DatesProvider` with locale `en-IN`, no `timezone` prop.

`OfficeLocation.timezone` is already a string on the API contract but is **only used as a display column on `/admin/office-locations`** — never read for formatting/parsing.

---

## 1. Tenant timezone propagation

### How the frontend learns the current tenant
| Channel | Carrier | Value present | Used for date logic? |
|---|---|---|---|
| **Login response** (`AuthResponse`) | `tenantId` field | yes | no — tenantId only |
| **httpOnly cookie** (JWT) | `access_token` claims | unknown to FE (opaque) | no |
| **localStorage** via `safeStorage` | key `tenantId` | yes | no — only echoed back as `X-Tenant-ID` header |
| **Zustand `useAuth.user`** | `User` type | id / email / roles / tenantId | no — type has **no timezone field** |
| **`/admin/office-locations`** | `OfficeLocation.timezone` | string (IANA) | **only as a list-column display** in `app/admin/office-locations/page.tsx` |

**Evidence**
- `lib/api/client.ts:76-80` — request interceptor injects `X-Tenant-ID` from localStorage; **no `X-Tenant-Timezone` or equivalent**.
- `lib/types/core/auth.ts:29-40` — `User` interface lacks any `timezone`/`tz`/`zoneId` field.
- `lib/hooks/useAuth.ts:113-127` — user is constructed from `AuthResponse` after login; no zone is hydrated.
- `lib/services/hrms/office-location.service.ts:17` — `timezone: string` exists on `OfficeLocation` but is consumed only at the admin page (`app/admin/office-locations/page.tsx:36,66,146`) and the marketing page (`app/contact/page.tsx:75-87` — hard-coded strings).
- Whole-repo grep for `X-Tenant-Timezone`, `formatInTimeZone`, `date-fns-tz`, `zonedTime` — **zero hits**.

### Conclusion (Q1)
> The frontend currently has **no canonical source of "the tenant's timezone"**. It is not in the JWT (no decode path), not in the auth store, not in a request header, and not in any context provider. The single available datum — `OfficeLocation.timezone` — is reachable only by re-fetching `/admin/office-locations` and is per-office (not per-tenant). De facto, the frontend uses **`Intl.DateTimeFormat().resolvedOptions().timeZone`** (the browser's zone) wherever a zone is needed at all — `app/nu-calendar/page.tsx:237-238` is the **only** explicit timezone usage in the codebase.

---

## 2. Date utilities

Four overlapping families live under `lib/utils/`. None accept a `timezone` argument.

| File | Surface | Zone behavior |
|---|---|---|
| **`lib/utils/date-utils.ts`** (332 lines, branded types) | `toISODateString`, `parseISODate`, `formatDate`, `formatRelativeTime`, `formatDateRange`, `isPastDate`, `isFutureDate`, `isToday`, `daysBetween`, `getStartOfToday`, `getStartOfMonth`, `getStartOfWeek` | **Browser-local for all comparisons**; `toISODateString` slices UTC string (`date.toISOString().split('T')[0]`) → **UTC-day**, drift versus local at ≥04:00 IST or ≤19:00 PST. |
| **`lib/utils/dateUtils.ts`** (126 lines, "consistent local") | `getLocalDateString`, `getLocalDateTimeString`, `parseLocalDate`, `getDateOffsetString`, `getMonthStartString`, `isSameDay`, `isToday` | **Explicitly browser-local** by design — header comment says so. Was added to fix the UTC-slice bug in `date-utils.ts`. Has no tenant-zone hook. |
| **`lib/utils/format/date.ts`** (63 lines, presentation) | `formatDate`, `formatDateShort`, `formatTime`, `formatDateTime`, `formatRelative`, `formatDateRange` (date-fns based) | Browser-local (date-fns `format` is implicitly local). |
| **`lib/utils/index.ts`** (lines 33-49) | `formatDate`, `formatDateTime` via `Intl.DateTimeFormat('en-IN', …)` | Browser-local; locale hard-coded `en-IN`. |

**Classification**
- **Duplicate `isToday` / `formatDate` / `formatDateRange` exist across three files** — a code-quality issue independent of timezone, but it amplifies the migration cost (a tenant-zone parameter would need to be threaded through ~4 utility surfaces).
- **No file imports `date-fns-tz`, Luxon, or any IANA-aware library.** `dayjs` is listed in `package.json` but no `dayjs.tz()` calls exist.
- `Intl.DateTimeFormat` accepts a `timeZone` option, but **none of the four utility files pass one**.

### Conclusion (Q2)
> Helpers assume browser-local (`getLocalDateString`, date-fns `format`, `formatDate`-Intl) **or** UTC slice (`toISODateString`). None are zone-aware. The `dateUtils.ts` (local) family explicitly chose browser-local to fix an earlier UTC-slice bug; that choice will need to be revisited once a tenant zone exists.

---

## 3. Calendar widgets (Mantine `@mantine/dates`)

**Provider config** — `components/layout/MantineThemeProvider.tsx:41`:
```tsx
<DatesProvider settings={{locale: 'en-IN', firstDayOfWeek: 1, weekendDays: [0]}}>
```
- No `timezone` setting passed. (Mantine `DatesProvider` does accept `timezone` since v7; we set only locale/week config.)

**Pickers in use** (14 files, ~25 instances):
- `DateInput` — payments, letters, contracts/new, timesheets, projects/[id], holidays, attendance/shift-swap, attendance/regularization, nu-calendar, leave-requests admin, expenses, …
- No `DateTimePicker`, `TimeInput`, `MonthPickerInput`, or `YearPickerInput` usages.
- All `DateInput`s either omit `valueFormat` or use the inherited `en-IN` DD/MM/YYYY display.
- None pass a `timezone` prop or wrap the picker in a zone-specific `DatesProvider`.

Pickers therefore return a `Date` object whose **internal instant is midnight in the browser's zone**. When that `Date` is serialised back to the API via `toISOString()` or `toLocaleDateString()`, the resulting day will be off-by-one for any user whose browser zone differs from the tenant zone.

### Conclusion (Q3)
> Mantine pickers are **not zone-aware**. They will silently produce a different calendar day depending on the browser. Fix path: thread a tenant zone down to a single `DatesProvider` wrapper.

---

## 4. `new Date()` in business logic

**Volume:** `new Date()` appears in **119 files** under `app/`, `components/`, `lib/` — **266 distinct call sites**. This is high.

**Spot-check of business-critical surfaces:**
- `app/attendance/page.tsx:120-123,438,537` — live clock + "now" comparisons used for shift-window evaluation.
- `app/attendance/my-attendance/page.tsx:159-247` — month/year selectors + "today" highlighting + live-time HUD.
- `app/me/attendance/page.tsx:107,517` — "today" check + reset-to-today; check-in/out wraps `getLocalDateString()` (correct *intent* but still browser-local).
- `app/attendance/utils.ts:38` — `const today = new Date();` used for shift-status logic.
- `app/timesheets/page.tsx:96` — `now` used for week boundaries.
- `app/payments/page.tsx:39,96` — `startOfMonth(new Date())` / `endOfMonth(new Date())` for default filter window.
- `app/calendar/page.tsx` + `app/projects/calendar/page.tsx` + `app/projects/gantt/page.tsx` — calendar grids built off `new Date()`.
- `app/nu-calendar/page.tsx:237` — **only file** that captures `Intl.DateTimeFormat().resolvedOptions().timeZone` (sent to Google Calendar API).

**Aggregate:**
| Pattern | Count |
|---|---|
| `new Date()` | 266 sites / 119 files |
| `.toISOString()` | 144 sites |
| `.000Z` / Z-suffix manual | 213 sites (overlap with toISOString) |
| `Intl.DateTimeFormat(...).resolvedOptions().timeZone` | 2 sites (both in `nu-calendar/page.tsx`) |

### Conclusion (Q4)
> Many. 266 raw `new Date()` calls is approximately one per ~3 pages. The largest concentrations are in attendance / timesheets / payments / calendar — exactly the surfaces where a tenant-zone mismatch produces wrong-day records.

---

## 5. ISO string parsing from API

Backend sends ISO-8601. Frontend parses via three paths:

1. **`new Date(iso)`** — most common. Behaviour:
   - With trailing `Z` → parsed as UTC, then displayed/serialised in **browser-local**.
   - Without offset (e.g., `"2026-05-14T09:30:00"`) → ECMA-262 treats as **browser-local** (post ES2015 inconsistency mostly resolved, but still browser-zone-anchored).
   - With `+HH:MM` offset → parsed at that offset, then displayed in **browser-local**.
2. **`parseLocalDate(s)` in `lib/utils/dateUtils.ts:97-104`** — for `YYYY-MM-DD` strings, explicitly builds a **browser-local** `Date(year, month-1, day)` (avoids the UTC-midnight bug).
3. **`parseISODate(s)` in `lib/utils/date-utils.ts:75-82`** — wraps `new Date(s)`. Inherits the same browser-local rendering.

There is **no path that preserves the originating zone** of the ISO string. Once a value is unwrapped into a JS `Date` it carries an absolute instant only — the zone label is lost. Any subsequent `format()` / `toLocaleDateString()` resolves in the browser zone unless an explicit `timeZone` option is passed (and none is, except the Google-calendar handoff).

### Conclusion (Q5)
> Zone is **not preserved**. The frontend round-trips through browser-local for every render. For a backend that begins emitting tenant-zoned offsets, the displayed wall-clock will be the browser's zone, not the tenant's — silently wrong but not crashing.

---

## Risk areas

### High — business-critical, browser-zone-only
| Surface | File | Why |
|---|---|---|
| Check-in / check-out timestamp | `app/me/attendance/page.tsx:119,140` | Sends `attendanceDate = getLocalDateString()` (browser local) to backend; if backend tenant zone ≠ browser, the day boundary differs. Type comment in `lib/types/hrms/attendance.ts:134,143` acknowledges this is "client's local date". |
| Attendance live-status + shift windows | `app/attendance/page.tsx:120,438,537`, `app/attendance/utils.ts:38` | "Is the shift open right now" decision uses `new Date()` (browser). A user travelling abroad would see wrong shift status. |
| Timesheet week boundaries | `app/timesheets/page.tsx:96,763` | `now` and `DateInput` both browser-local; a US timesheet entered from India lands in the wrong week. |
| Payroll date filters | `app/payments/page.tsx:39-40,96-97,302,316` | `startOfMonth/endOfMonth(new Date())` defaults the run window to the browser's month — across the dateline this can be off by a day. |
| Leave-request submission | `app/attendance/shift-swap/page.tsx:403,425`, regularization modal | `DateInput` returns a browser-local `Date`; serialisation drifts. |
| Calendar event creation | `app/nu-calendar/page.tsx:237-238` | **Only** surface that does the right thing — sends `Intl…resolvedOptions().timeZone` — but it sends *browser* zone, not *tenant* zone, which is wrong once tenant zones diverge from browser zones. |
| Contract start/end dates | `app/contracts/new/page.tsx:132,151` | `DateInput` browser-local; HR contract dates are legally meaningful. |
| Holiday calendar | `app/holidays/page.tsx:563`, admin holidays page | A holiday declared in IST will display on the wrong day to a PST-based admin. |

### Medium — display-only, but visible to users
- All `formatDate` / `formatDateTime` / `formatRelative` call sites across the four utility files — wrong wall-clock displayed but no data is mutated.
- Notification timestamps (`app/notifications/*`), audit-log views, dashboard "last updated".
- `app/dashboard/page.tsx:333,352` — uses utility helpers; off by browser drift.

### Low — read-only or cosmetic
- Marketing pages: `app/contact/page.tsx:75-87` (hard-coded "IST/PST/GMT" strings).
- `app/about/page.tsx`, `app/global-error.tsx` (browser-local timestamps in copyright/error logging).
- Login-page session-expired strings.

---

## Recommendations (audit only — no code changes)

These are sequenced so each one unblocks the next. None require migration in isolation.

1. **Decide and define "the tenant timezone".**
   The backend currently has both `OfficeLocation.timezone` (per office) and an implicit single-tenant zone. The FE needs an unambiguous "this tenant operates in X" — either:
   - **a)** add `tenantTimezone` to `AuthResponse` (cheapest, single source-of-truth, no extra fetch), or
   - **b)** add a `/auth/me/preferences` endpoint that returns `{ tenantTimezone, userTimezone?, locale }`.
   Recommend (a) — `User.tenantTimezone` is non-sensitive and avoids a second round-trip during boot.

2. **Pick one date library and one utility surface.**
   The current four-way split (`date-utils.ts` / `dateUtils.ts` / `format/date.ts` / `index.ts`) creates ambiguity at every call site. Recommend consolidating onto **date-fns + `date-fns-tz`** (`formatInTimeZone`, `utcToZonedTime`, `zonedTimeToUtc`) and deprecating the other three. dayjs is in `package.json` but barely used — drop it.

3. **Thread the tenant zone through one context provider.**
   Wrap `MantineThemeProvider` (or a sibling `TimezoneProvider`) so:
   - `<DatesProvider settings={{… , timezone: tenantTz}}>` makes pickers zone-aware platform-wide.
   - `useTenantTimezone()` hook exposes the IANA string for ad-hoc formatters.

4. **Add a `formatTenant(date, format)` helper** that wraps `formatInTimeZone(date, tenantTz, fmt)` — this becomes the single replacement target for the ~144 `toISOString()` / `formatDate` call sites. Migrate hot surfaces first (attendance, timesheets, payments, calendar — section "High" above).

5. **Audit the 266 `new Date()` sites with codemods.**
   Most are `new Date()` → "right now", which is correct regardless of zone. The ones that matter are `new Date(stringFromApi)` and `new Date()` used for **same-day** comparisons (`isToday`, `startOfDay`, `endOfMonth`). A jscodeshift pass keyed on "Date constructor in arg position to date-fns / Intl / comparison" would catch the dangerous ~30–40 sites cheaply.

6. **Tighten `attendanceDate` on the wire.**
   `CheckInRequest.attendanceDate` is currently "client's local date". Once tenant zone is known, it should be the **tenant's** local date — derived FE-side via `formatInTimeZone(now, tenantTz, 'yyyy-MM-dd')` — so a Bangalore admin clocking in for a US office doesn't post a wrong-day record.

7. **Display the active zone to users.**
   Small UI affordance ("Showing times in <tenantTz> · IST" near attendance/timesheet headers) prevents the silent-wrong-day class of bug from going unnoticed during the migration.

8. **Defer until backend lands.**
   Nothing above is worth doing speculatively — every recommendation depends on the backend exposing a stable "this tenant's zone" value first. The current FE behaviour is internally consistent (everything is browser-local) and only becomes wrong the moment the backend introduces zone divergence.

---

## Appendix — key file paths

- `frontend/lib/api/client.ts` (tenant header injection)
- `frontend/lib/hooks/useAuth.ts` (auth store, user shape)
- `frontend/lib/types/core/auth.ts` (`User` / `AuthResponse`)
- `frontend/lib/utils/date-utils.ts` (UTC-slice family)
- `frontend/lib/utils/dateUtils.ts` (browser-local family — the "fix")
- `frontend/lib/utils/format/date.ts` (date-fns family)
- `frontend/lib/utils/index.ts` (Intl en-IN family)
- `frontend/components/layout/MantineThemeProvider.tsx` (`DatesProvider`)
- `frontend/lib/services/hrms/office-location.service.ts` (per-office timezone)
- `frontend/lib/types/hrms/attendance.ts` (`attendanceDate` "client's local" contract)
- `frontend/app/nu-calendar/page.tsx` (only site that reads browser timezone)
- High-risk pages: `app/me/attendance/page.tsx`, `app/attendance/page.tsx`, `app/timesheets/page.tsx`, `app/payments/page.tsx`, `app/holidays/page.tsx`, `app/contracts/new/page.tsx`.
