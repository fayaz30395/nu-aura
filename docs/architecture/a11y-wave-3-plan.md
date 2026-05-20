# A11y Wave 3 — Scope and Plan

> **Created:** 2026-05-20.
> **Status:** Scoped, starter fix landed. Bulk migration is open.

Waves 1 (S10-G) and 2 (S12, 8 pages) closed the headline a11y gaps: alt
text on `<img>`, button labels, focus management, contrast tokens. Wave 3
is the long-tail: programmatic label-input association in form-heavy
pages built with `react-hook-form`.

## What's already passing

- `find <img>` without `alt` → 0 real findings (1 false-positive that
  spans multiple lines with `alt={course.title}` correctly set).
- `<button>` without text/aria-label → 0 production findings.
- `<div onClick>` / `<span onClick>` → 2 sites, both `e.stopPropagation()`
  wrappers around interactive children — not clickable themselves, not a
  violation.

## What's still pending — form input/label binding gap

`react-hook-form`'s `register()` does **not** emit an `id` attribute, and
many form pages render `<label>...</label><input {...register(...)}/>`
with the visual association in CSS only. Screen readers can't follow the
relationship.

**Fix pattern (demonstrated in
`app/attendance/regularization/_components/CreateRequestModal.tsx`):**

```tsx
- <label className="...">Check In Time</label>
- <input type="time" {...register('requestedCheckIn')} />
+ <label htmlFor="requestedCheckIn" className="...">Check In Time</label>
+ <input id="requestedCheckIn" type="time" {...register('requestedCheckIn')} />
```

## Files needing this fix (~10 known + likely more)

From a quick `grep "<input"` sweep against `app/` (rough — exact count
needs the multi-line audit):

- `app/attendance/regularization/_components/CreateRequestModal.tsx`
  (2 inputs — **DONE in this wave**)
- `app/attendance/comp-off/page.tsx` (1)
- `app/timesheets/page.tsx` (3 inputs in different forms)
- `app/loans/new/page.tsx` (3)
- `app/settings/security/page.tsx` (1+)
- Plus per-page audit needed across `app/recruitment/`, `app/payroll/`,
  `app/employees/`, `app/leave/`, `app/expenses/`, etc.

## Recommended approach

1. **Audit:** run `frontend/e2e/accessibility/a11y.spec.ts` against each
   route. Axe-core will flag the label-input violations explicitly with
   `label` rule.
2. **Batch:** group by feature folder, fix 5–10 forms per PR.
3. **Lint to prevent regression:** add an ESLint rule (e.g.,
   `jsx-a11y/label-has-associated-control` is already on by default) and
   tighten via `@typescript-eslint` config to require an explicit `id` on
   any `<input>` that has a sibling `<label>` without `htmlFor`.

## Other a11y items deferred to wave 3+

- Mantine modal/menu focus traps — already handled by Mantine, but worth
  spot-checking against axe in CI.
- Date inputs (`DateInput`, `DatePicker`) — verify the popover toggle has
  an `aria-expanded` and the picker grid has `role="grid"`.
- Toasts (`notifications.show`) — confirm `aria-live="polite"` is set;
  Mantine v8 defaults are fine but worth a sanity check.

## Acceptance for wave 3 close

- `npm run test:e2e -- accessibility/a11y.spec.ts` returns 0 violations
  across the current Dashboard, Login, Onboarding, and at least 5 form
  routes.
- ESLint `jsx-a11y/label-has-associated-control` passes repo-wide.
