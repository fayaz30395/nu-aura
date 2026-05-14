# Frontend Tenant-Zone Propagation — Design

**Status:** Proposed (design only — no code changes).
**Author:** w5-aux-frontend-zone-design.
**Date:** 2026-05-14.
**Prerequisite:** [`docs/audit/frontend-date-handling.md`](../audit/frontend-date-handling.md).
**Backend reference:** [`backend/docs/architecture/tenant-aware-time-migration-guide.md`](../../backend/docs/architecture/tenant-aware-time-migration-guide.md), `TenantTimeService` (zone fallback `Asia/Kolkata`), `Tenant.timezone` column (V165).

---

## TL;DR

The backend now stores `tenants.timezone` (IANA, V165) and routes every "now" through `TenantTimeService`. The frontend has no equivalent — 266 raw `new Date()` calls and four overlapping date-utility families all resolve in the **browser's** zone. We need a single canonical source for "the tenant's timezone" reachable from any component or hook.

**Three propagation channels were considered:**

| # | Channel                       | Latency at boot | Freshness on change | Security    | Compat. cost     |
|---|-------------------------------|-----------------|---------------------|-------------|------------------|
| 1 | **JWT claim**                 | Zero extra hop  | Stale until refresh | Acceptable  | JWT size +30B    |
| 2 | **`AuthResponse` field on `/auth/login` + `/auth/me`** | Zero extra hop (already fetched) | Refreshes on every `/auth/me` (≤ access-token TTL) | Best (already in body) | DTO + 1 line FE  |
| 3 | **Server-side non-httpOnly cookie** | Zero extra hop | Manual SetCookie on tenant edit | Weakest (readable JS) | New cookie + edge-middleware writer |

**Recommendation: Option 2 — extend `AuthResponse` with a `tenantTimezone` string field.** It piggy-backs on a flow that already exists and is already trusted for `roles`/`permissions`, requires no JWT-decode capability on the FE (the JWT is httpOnly today and decoding it would be a new surface), refreshes naturally on every `restoreSession()` / `/auth/me` poll, and the field is non-sensitive so the same body-vs-cookie reasoning that justified moving permissions out of the JWT (CRIT-001, `AuthResponse.java` comment) applies.

Per-office zones remain a separate concern — `OfficeLocation.timezone` continues to govern attendance/shift logic for specific offices; the tenant zone is the **default** for tenant-level UX (dashboards, reports, "today" highlighting, calendar grids).

---

## 1. Problem statement

Per the audit (`docs/audit/frontend-date-handling.md` §1, "Conclusion Q1"):

> The frontend currently has **no canonical source of "the tenant's timezone"**. It is not in the JWT (no decode path), not in the auth store, not in a request header, and not in any context provider.

For this design we treat as fixed:

- The backend canonical zone (post-V165) is `tenants.timezone` (IANA string, fallback `Asia/Kolkata`).
- JWTs are httpOnly cookies and the FE has **no JWT-decode path** today (CRIT-001 moved permissions out of the cookie specifically to keep it < 4KB and out of JS reach).
- `/auth/login`, `/auth/me`, and `/auth/refresh` all return the same `AuthResponse` DTO and are the only auth-bearing entry points into the FE store.
- A tenant's timezone changes ≤ once per quarter (org-admin action, not user-facing); 5-min staleness is acceptable.

---

## 2. Options compared

### Option 1 — Add `tenantTimezone` as a JWT claim

`JwtTokenProvider.generateToken()` already writes `tenantId`, `userId`, `roles`, `type`. Adding `.claim("tenantTimezone", "Asia/Kolkata")` is one line.

**Pros**
- Zero extra round-trip (the JWT is already on every request).
- Tenant zone is automatically scoped to "the tenant the token was issued for", which matches multi-tenancy semantics.

**Cons**
- **FE cannot read it.** The access_token cookie is `httpOnly`. The FE today has no JWT-decode path, and adding one is a deliberate reversal of the CRIT-001 decision. We'd need either:
  - (a) a `jwt-decode` dep + parse on every page load (works but contradicts CRIT-001's intent), or
  - (b) a parallel non-httpOnly cookie carrying just the zone — which is then just Option 3 in disguise.
- **Stale on tenant-admin zone change.** A tenant changing its zone from IST → PST does not invalidate active JWTs; the wrong zone persists for up to the access-token TTL (15 min) per active session. The user might book a half-day-leave window in the old zone and the backend (using `TenantTimeService`, which reads the live DB) interprets it in the new zone — silent drift.
- **JWT bloat.** Cookie is already under tight 4KB pressure (CRIT-001). Adding ~30B is negligible alone, but every "let's just add one more claim" decision compounds.

**Verdict:** Plausible only if we already had a JWT-decode path. We don't, and rebuilding one undoes a CRIT-001 control.

### Option 2 — Add `tenantTimezone` to `AuthResponse` (recommended)

`AuthResponse` already carries `roles` and `permissions` for the explicit reason given in its own Javadoc:

> CRIT-001: Permissions moved from JWT to response body to keep cookie under 4KB.
> Frontend reads these from the response instead of decoding the JWT.

`tenantTimezone` is the same kind of field: read by the FE, not validated against the JWT, non-sensitive. Backend change:

```java
// backend/src/main/java/com/nulogic/api/auth/dto/AuthResponse.java
private String tenantTimezone;   // IANA, never null (defaults to "Asia/Kolkata" via TenantTimeService.zoneFor)
```

…populated by the same `TenantTimeService.zoneFor(tenantId).getId()` call the rest of the backend uses, so the FE and BE can never disagree on what "the tenant's zone" is.

**Pros**
- Zero extra round-trip. `/auth/login`, `/auth/me`, `/auth/refresh` already fire on session boot/restore/refresh; the zone hitchhikes.
- **Refreshes naturally.** Every `restoreSession()` (page reload, 401 recovery, multi-tab nav) re-hits `/auth/me` → fresh zone. Worst-case staleness = access-token TTL (15 min) + the time between the user noticing a wrong-day display and reloading.
- Mirrors the existing pattern for `roles`/`permissions`; reviewers won't need a new mental model.
- Non-sensitive by definition (it's already an admin-editable display field at `/admin/office-locations`), so being in the response body is acceptable.
- No new dep (`jwt-decode`), no new cookie, no new middleware.

**Cons**
- Backend DTO change requires version-coordinated rollout (handled by phasing below — the field is additive, FE defaults gracefully).
- Doesn't propagate **per-request overrides** (e.g., "show me this US office's attendance in its local time, not mine"). That's a per-office concern; `OfficeLocation.timezone` continues to govern those screens. Tenant zone is the default; office zone is the per-view override.

**Verdict:** Strongest fit. Recommended.

### Option 3 — Server-side non-httpOnly cookie (`tenant_tz`)

Spring writes `Set-Cookie: tenant_tz=Asia/Kolkata; HttpOnly=false; Secure; SameSite=Strict; Path=/; Max-Age=900` on login and on every authenticated response (or via a dedicated `TenantTimezoneFilter`). FE reads via `document.cookie` or via a tiny `getCookie('tenant_tz')` helper.

**Pros**
- Available to **every** code path including SSR Server Components (cookies are visible to `next/headers`'s `cookies()` API), Next.js middleware, and edge runtimes. Useful if we ever pre-render dates server-side.
- Decouples zone from auth response — works even before `/auth/me` resolves.

**Cons**
- **Weakest security profile of the three.** Non-httpOnly cookies are JS-readable → XSS-exfiltratable. The tenant zone alone isn't a secret, but **a new non-httpOnly cookie is a new surface every auditor will ask about** ("why is this not httpOnly? what else writes here? can a malicious extension forge it?"). The audit team already pushed back on similar surfaces in S12.
- **Forgeability.** A client can edit the cookie to spoof a different zone. The backend ignores it (truth source is `TenantTimeService.zoneFor(tenantId)`), but the FE will trust it and render wrong wall-clocks. Self-inflicted, not exploit-level, but support-noisy.
- Cookie size + write-on-every-response means the cookie lives in every request's header — small constant cost on every API call.
- Requires a new edge-middleware writer to keep the cookie in sync with the DB on tenant-zone edits (else stale).
- SSR-readability is theoretical today — every NU-AURA page that touches dates is `'use client'`.

**Verdict:** Only worth it if we adopt SSR for date-heavy pages. We haven't, and the security trade-off doesn't justify it now.

### Decision matrix

| Criterion              | Weight | Opt 1 JWT claim                       | **Opt 2 AuthResponse**          | Opt 3 Cookie                                     |
|------------------------|--------|---------------------------------------|---------------------------------|--------------------------------------------------|
| Boot latency           | High   | Best (zero hops)                      | **Best (already fetched)**      | Best (zero hops)                                 |
| Freshness on TZ change | High   | Bad (≤ token TTL = 15min worst case)  | **Good (every `/auth/me` poll)** | Mediocre (needs Set-Cookie on edit)              |
| Security               | High   | Requires new JWT-decode path (CRIT-001 regression) | **Best — body parity with roles** | Worst — non-httpOnly, JS-readable             |
| Compatibility / cost   | Med    | JWT bloat + decode dep                | **+1 field on DTO, +1 field on User** | New cookie + edge middleware + audit answer |
| SSR friendliness       | Low    | N/A (httpOnly)                        | OK (via SSR `/auth/me` call)    | Best (native `cookies()`)                        |
| Maintenance surface    | Med    | New decode logic to maintain          | **Reuse existing auth plumbing** | New filter + audit explanation                   |
| **Recommendation**     |        |                                       | **✓ Option 2**                  |                                                  |

---

## 3. Recommended design (Option 2 details)

### 3.1 Wire shape

```ts
// frontend/lib/types/core/auth.ts
export interface AuthResponse {
  // …existing fields…
  tenantTimezone: string;   // IANA, never null — backend defaults to "Asia/Kolkata"
}

export interface User {
  // …existing fields…
  tenantTimezone: string;   // hydrated from AuthResponse.tenantTimezone
}
```

Backend complement: `AuthResponse.tenantTimezone` populated via `tenantTimeService.zoneFor(tenantId).getId()` in `AuthController.login`, `AuthController.googleLogin`, `AuthController.me`, `AuthController.refresh` (single helper to avoid drift).

### 3.2 FE plumbing — three layers

#### Layer A — auth store (single source of truth)

`useAuth.ts` already hydrates `User` from `AuthResponse` in four places (`login`, `googleLogin`, `restoreSession.me`, `restoreSession.refresh`). One-line addition in each: `tenantTimezone: response.tenantTimezone`.

Persisted to `sessionStorage` alongside the rest of the user object (already `partialize`d). Zero new storage decisions.

#### Layer B — `TimezoneProvider` context + `useTenantTimezone()` hook

```tsx
// frontend/components/layout/TimezoneProvider.tsx (NEW — sketch, not a code change)
'use client';
import { createContext, useContext } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

const TimezoneContext = createContext<string>('Asia/Kolkata');

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const tz = useAuth(s => s.user?.tenantTimezone ?? 'Asia/Kolkata');
  return <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>;
}

export const useTenantTimezone = () => useContext(TimezoneContext);
```

Mount once inside `app/layout.tsx`, **between** `AuthGuard` and `MantineThemeProvider` so the Mantine provider can consume it:

```tsx
<AuthGuard>
  <TimezoneProvider>
    <MantineThemeProvider>  {/* reads useTenantTimezone() internally */}
      …
    </MantineThemeProvider>
  </TimezoneProvider>
</AuthGuard>
```

Rationale for a separate provider (rather than just `useAuth(s => s.user?.tenantTimezone)`):
- **Decouples consumers from the auth store** so we can swap the backing source later (e.g., add a tenant-admin "preview as zone X" override) without touching call-sites.
- Lets non-React code (e.g., codemod targets) depend on a single hook name in static analysis.
- Stable default (`Asia/Kolkata`) for unauthenticated routes (login page, marketing) without `?? 'Asia/Kolkata'` clutter at each call site.

#### Layer C — formatters and pickers

Two consumers, both fed from `useTenantTimezone()`:

1. **`MantineThemeProvider.tsx`** — pass `timezone` to `DatesProvider`:
   ```tsx
   const tz = useTenantTimezone();
   <DatesProvider settings={{ locale: 'en-IN', firstDayOfWeek: 1, weekendDays: [0], timezone: tz }}>
   ```
   This single change makes every `DateInput`, `DatePicker`, `DateTimePicker`, `TimeInput`, `MonthPickerInput`, and `YearPickerInput` zone-aware platform-wide — per Mantine v7+ `DatesProvider` contract.

2. **`lib/utils/date-tenant.ts` (NEW — sketch)** — single new utility surface that wraps `date-fns-tz`:
   ```ts
   import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

   export const formatTenant      = (d: Date | string, fmt: string, tz: string) => formatInTimeZone(d, tz, fmt);
   export const tenantToday       = (tz: string) => formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
   export const tenantStartOfDay  = (d: Date | string, tz: string) => zonedTimeToUtc(formatInTimeZone(d, tz, 'yyyy-MM-dd 00:00:00'), tz);
   export const tenantIsToday     = (iso: string, tz: string) => formatInTimeZone(iso, tz, 'yyyy-MM-dd') === tenantToday(tz);
   export const tenantISODate     = (d: Date, tz: string) => formatInTimeZone(d, tz, 'yyyy-MM-dd');
   ```
   And the matching `useFormatTenant()` ergonomic hook:
   ```ts
   export function useFormatTenant() {
     const tz = useTenantTimezone();
     return useMemo(() => ({
       format:     (d: Date | string, fmt: string) => formatInTimeZone(d, tz, fmt),
       today:      () => tenantToday(tz),
       isoDate:    (d: Date) => tenantISODate(d, tz),
       isToday:    (iso: string) => tenantIsToday(iso, tz),
     }), [tz]);
   }
   ```

   The audit identified four overlapping date-utility families:
   - `lib/utils/date-utils.ts` (UTC slice — has the bug)
   - `lib/utils/dateUtils.ts` (browser-local — the partial fix)
   - `lib/utils/format/date.ts` (date-fns presentation)
   - `lib/utils/index.ts` (`Intl` en-IN)

   This plan **adds a fifth** — `date-tenant.ts` — but with the explicit goal of **deprecating the other four** (post-rollout). New code uses only the tenant-aware surface; the others get JSDoc `@deprecated` markers and codemod-targeted call-site migration.

### 3.3 What does NOT change

- **JWT shape.** Stays as-is (CRIT-001 preserved).
- **`X-Tenant-ID` header.** Continues to carry tenant id only.
- **Cookies.** No new cookies. `access_token`/`refresh_token` remain httpOnly.
- **`OfficeLocation.timezone`.** Per-office zone is still the correct override for attendance/shift screens viewing a specific office. The tenant zone is the **default**; the office zone wins when a screen is explicitly office-scoped.
- **Existing utility files.** Marked `@deprecated` but not deleted in this design — codemod-driven migration in a separate wave.

### 3.4 Edge cases

| Case | Resolution |
|---|---|
| User not yet logged in (login page, marketing) | `TimezoneProvider` default = `'Asia/Kolkata'`. Identical to backend `TenantTimeService.DEFAULT_ZONE`. |
| Backend down, `tenantTimezone` missing from response | FE falls back to `'Asia/Kolkata'`. Same fallback the backend uses. |
| Tenant admin changes zone | New zone is in the DB immediately. FE picks it up on next `/auth/me` (= next page reload, ≤ 15 min auto via 401-refresh). Optional: emit a Kafka event the FE consumes via the existing WebSocket relay for live update — not in initial scope. |
| User overrides zone for a specific screen (e.g., "view in US/Pacific") | Out of scope here. Implemented later by allowing `TimezoneProvider` to accept a child-scoped override prop. The architecture already supports it (it's just a Context). |
| SSR (Server Components reading dates) | Today: irrelevant — all date pages are `'use client'`. Future: SSR `/auth/me` from `next/headers` cookies → seeds provider via initial state. Documented but not required. |
| Multi-tab open as different tenants | Each tab has its own Zustand store hydrated from its own `/auth/me` → its own provider value. Cross-tab `storage` event already handled by Zustand. |

---

## 4. Phased rollout

Each phase is independently reviewable and reversible. **No phase requires the next.** Phases 0–2 are the actual landing target; 3–5 are housekeeping.

### Phase 0 — Backend wire (BE-only, no FE behaviour change)
- Add `tenantTimezone: String` to `AuthResponse`.
- Populate in `AuthController` (`login`, `googleLogin`, `me`, `refresh`) via `tenantTimeService.zoneFor(tenantId).getId()`.
- FE ignores the new field (additive, safe).
- **Exit:** field present on the wire; FE behaviour unchanged.

### Phase 1 — FE plumbing (no user-visible change)
- Add `tenantTimezone: string` to `AuthResponse` and `User` interfaces.
- Hydrate in `useAuth.ts` (4 call sites, 1 line each).
- Add `TimezoneProvider` + `useTenantTimezone()` hook (read-only).
- Add `lib/utils/date-tenant.ts` and `useFormatTenant()` hook (no call-sites yet).
- Add a small dev-only `<TenantZoneBadge />` in the header for verification (`Showing times in Asia/Kolkata`). Behind `NEXT_PUBLIC_SHOW_TZ_BADGE`.
- **Exit:** new hook returns a real IANA string; no behaviour change yet.

### Phase 2 — Pickers (low-risk, high-coverage)
- Pass `timezone` to `DatesProvider` in `MantineThemeProvider`.
- Smoke-test the ~25 picker call-sites (audit §3 lists them).
- **Risk:** any picker call-site that round-trips through `.toISOString()` will now produce a tenant-zoned day instead of a browser-zoned day. For NULogic-internal usage (everyone in IST today) this is a **no-op visually**; the change becomes meaningful when a non-IST tenant onboards.
- **Exit:** pickers zone-aware platform-wide.

### Phase 3 — High-risk surfaces (per audit §"Risk areas — High")
Migrate, in order of business risk:
1. `app/me/attendance/page.tsx` (check-in/out — `attendanceDate` becomes `useFormatTenant().today()`).
2. `app/attendance/page.tsx` + `app/attendance/utils.ts` (shift-window evaluation).
3. `app/timesheets/page.tsx` (week boundaries).
4. `app/payments/page.tsx` (payroll month default).
5. `app/contracts/new/page.tsx` (legal dates).
6. `app/holidays/page.tsx` + `app/admin/holidays/page.tsx`.
7. `app/nu-calendar/page.tsx` (only existing tz-aware site — switch from browser to tenant zone for event creation).

Each migration is a localised PR: read `useTenantTimezone()` or `useFormatTenant()`, replace `new Date()`/`toISOString()`/`getLocalDateString()` accordingly. ~30–40 call-sites total per the audit's codemod estimate.

### Phase 4 — Medium-risk surfaces (display-only)
- Notifications, audit logs, dashboard "last updated", `formatRelative`.
- Bulk codemod: `formatDate(x)` → `useFormatTenant().format(x, 'PP')`. Reviewable by sampling.

### Phase 5 — Deprecate the four legacy utility families
- Add `@deprecated` JSDoc to `date-utils.ts`, `dateUtils.ts`, `format/date.ts`, and the `formatDate`/`formatDateTime` in `index.ts`.
- ESLint rule (`no-restricted-imports`) blocks new imports.
- Optional: codemod-replace the remaining call sites; or let them age out.

### Rollback strategy

Each phase is gated on a single change. To roll back:
- Phase 0: drop the field from the DTO — FE will see `undefined` and fall back to `'Asia/Kolkata'`.
- Phase 1: remove the provider import from `layout.tsx`; hook still works (returns default).
- Phase 2: remove the `timezone` prop from `DatesProvider` — Mantine reverts to browser-local.
- Phases 3–5: each is a per-page revert.

No phase requires a backfill or a data migration.

---

## 5. Verification plan (sketch, design-only)

- **Boot:** log in as a tenant with `timezone = 'America/Los_Angeles'`. Confirm `useTenantTimezone()` returns `America/Los_Angeles`.
- **Boundary:** at 23:30 IST, open the dashboard with the LA tenant. "Today" should still read the LA date (yesterday) — not the IST date.
- **Picker round-trip:** select 14-May-2026 in a `DateInput` while the browser is in IST and the tenant is in LA. The serialised payload should be `2026-05-14` (LA), not `2026-05-15` (IST).
- **Restore session:** clear sessionStorage, reload. `useTenantTimezone()` should briefly return `Asia/Kolkata` (default) then snap to the real zone after `/auth/me` resolves.
- **Tenant zone change:** admin updates tenant zone IST → PST. New tabs see PST; existing tabs see IST until the next `/auth/me` (≤ 15 min). Document this in the admin UI.
- **Fallback:** force `tenantTimezone: null` in a mocked response. UI continues to render in `Asia/Kolkata`, no errors.

---

## 6. Open questions (for review)

1. **Per-office override scope.** Does an attendance page viewing "Mumbai office" honour `OfficeLocation.timezone` even when the viewer's tenant zone is `America/Los_Angeles`? Design says **yes** (office-scoped views use office zone, tenant zone is the default). Confirm with HR product.
2. **Live update on tenant-zone edit.** Is 15-min staleness acceptable? If not, we need a Kafka/WebSocket push (the relay exists — `RedisWebSocketRelay`). Initial scope: accept staleness.
3. **`Intl` vs `date-fns-tz`.** `Intl.DateTimeFormat` natively supports `timeZone`. We could avoid the `date-fns-tz` dep by routing through `Intl`. Trade-off: `date-fns-tz` is more ergonomic for date math (`zonedTimeToUtc`, `utcToZonedTime`) which we will need for picker round-tripping. Lean `date-fns-tz` unless bundle audit pushes back (`date-fns-tz` is ~12KB gzipped).
4. **SSR.** Worth seeding the provider from `next/headers` `cookies()` so future server components render correctly? Cheap to add now, expensive to retrofit. Recommend doing it in Phase 1 even if no consumers exist yet.

---

## 7. Summary

- **One source of truth:** `AuthResponse.tenantTimezone` (Option 2).
- **One context:** `TimezoneProvider` + `useTenantTimezone()`.
- **One utility surface:** `lib/utils/date-tenant.ts` + `useFormatTenant()`.
- **One Mantine wire-up:** `DatesProvider`'s `timezone` prop.
- **Phased:** BE wire → FE plumbing → pickers → high-risk pages → medium-risk → deprecate legacy.
- **No JWT change. No new cookie. No CRIT-001 regression.**
- **Defer until backend lands** the `AuthResponse.tenantTimezone` field — every FE step depends on it, and the current FE behaviour is internally consistent (browser-local everywhere) until then.
