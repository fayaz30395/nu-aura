---
title: "Frontend UX Readiness Review — 2026-06-17"
tags: [qa, frontend, ux, a11y, readiness]
date: 2026-06-17
reviewer: react-reviewer agent
scope: "285 page.tsx files, 1155 TSX files across frontend/app/ and frontend/components/"
---

# Frontend UX Readiness Review — 2026-06-17

## Summary

Reviewed 285 routes across all four sub-apps (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence) plus
public pages. The codebase shows strong structural discipline: ESLint with `react-hooks/exhaustive-deps`
escalated to `error`, DOMPurify sanitization at every `dangerouslySetInnerHTML` call site,
target=`_blank` universally paired with `rel="noopener noreferrer"`, accessible skip-link
and semantic `<main>` elements, and error boundaries wired across most routes.

The **critical blocker** is a systemic pattern across 10 custom slide-panel modals: they lack
`role="dialog"` and `aria-modal`, rendering them invisible to assistive-technology focus and
announcement. A high-severity finding is that the skip-link target (`#main-content`) wraps the
entire page including the sidebar, so keyboard-only users cannot actually skip navigation.
There are also 83 unresolved 8px-grid spacing warnings (`gap-3`, `p-3`, `space-y-3`) concentrated
in 20 files, and 31 deliberately suppressed `react-hooks/exhaustive-deps` instances that require
case-by-case justification review.

**Exit bar for UX ≥ 90 is NOT yet met. Score: 74 / 100.**

---

## Findings

| ID | Severity | Title | Evidence (file:line) | Needs |
|----|----------|-------|----------------------|-------|
| UX-01 | HIGH | Custom slide-panel modals missing `role="dialog"` and `aria-modal` | `app/tasks/page.tsx:96`, `app/settings/security/api-keys/page.tsx:176`, `app/projects/psa/page.tsx:139`, `app/projects/psa/timesheets/page.tsx:85,157`, `app/projects/psa/invoices/page.tsx:140`, `app/recruitment/scorecards/page.tsx:134`, `app/admin/budget/page.tsx:270`, `app/surveys/pulse/page.tsx:102`, `app/travel/expenses/page.tsx:122` | 10 custom `div` panels lack `role="dialog"` and `aria-modal="true"`. Screen readers do not announce the dialog or trap focus. `biometric-devices/page.tsx:609` and `employees/_components/ProfileSheet.tsx:76` are the only two that do it correctly. Add `role="dialog" aria-modal="true" aria-labelledby="<heading-id>"` to the panel `div` and implement Escape-key handler. |
| UX-02 | HIGH | Skip-link lands on wrapper `div` including sidebar, not content area | `app/layout.tsx:80` (`div#main-content`), `components/layout/AppLayout.tsx:410` (`<main>` has no `id`) | Skip-link `href="#main-content"` resolves to a `div` that wraps the entire page tree including the sidebar navigation. Keyboard users pressing Tab > Enter on the skip-link still tab through the sidebar. Move `id="main-content"` to the `<main>` element inside `AppLayout.tsx:410`. |
| UX-03 | HIGH | Redundant double `AuthGuard` wrap adds unnecessary render cycles | `app/providers.tsx:76` (outer), `components/layout/AppLayout.tsx:413` (inner) | `Providers` wraps all children in `AuthGuard`; `AppLayout` then wraps its `children` in a second `AuthGuard`. Any page inside `AppLayout` triggers two full authorization state evaluations including session restore logic. Remove the inner `AuthGuard` from `AppLayout` — the outer one in `providers.tsx` is sufficient. |
| UX-04 | HIGH | 31 `react-hooks/exhaustive-deps` suppressions — 7 in auth/permission paths | `app/admin/AdminLayoutInner.tsx:223,264`, `app/nu-mail/page.tsx:196`, `app/attendance/page.tsx:144`, `app/auth/login/page.tsx:395,467`, `app/fluence/wiki/[slug]/page.tsx:474` | Auth-path suppressions are security-adjacent (stale tenant/user captures). `AdminLayoutInner.tsx:264` uses `JSON.stringify(permissions)` as a dep — a code smell that bypasses referential stability and can silently miss mutations. Each suppression must have an explanatory comment; auth-path ones must be verified for stale-closure risk. |
| UX-05 | HIGH | Form inputs without `htmlFor` ↔ `id` association in multiple forms | `app/biometric-devices/page.tsx:452,467,488,504,514` (Device Name, Device Type, Serial Number, Manufacturer, Model — all labels without `htmlFor`), `app/timesheets/page.tsx:794` (Hours label), `app/loans/new/page.tsx:200` (Loan Amount), `app/loans/new/page.tsx:219` (Interest Rate), `app/loans/new/page.tsx:240` (Term Months) | Labels are present but not programmatically associated via `htmlFor`/`id`. Screen readers rely on this association; label-click-to-focus also breaks. RHF's `{...register(...)}` does not auto-inject `id`. Add matching `id="<field-name>"` on each input and `htmlFor="<field-name>"` on each label. |
| UX-06 | HIGH | `comp-off/page.tsx` and `attendance/regularization` form labels without `htmlFor` | `app/attendance/comp-off/page.tsx:335` (Attendance Date label), `app/attendance/regularization/_components/CreateRequestModal.tsx` (Check In / Check Out already have `htmlFor` — these are OK) | Attendance Date label in comp-off has no `htmlFor`; the input has no `id`. Same pattern as UX-05. |
| UX-07 | MEDIUM | 83 unresolved 8px-grid spacing warnings (`gap-3`, `p-3`, `space-y-3`) | Worst offenders: `app/settings/security/api-keys/page.tsx` (10 hits), `app/settings/privacy/page.tsx` (10 hits), `app/admin/budget/page.tsx` (9 hits), `app/travel/expenses/page.tsx` (6 hits), `app/admin/integrations/webhooks/page.tsx` (6 hits) | `gap-3` = 52 occurrences; `p-3` = 14; `space-y-3` = 17. These are tracked as ESLint `no-restricted-syntax` warnings. They violate the Studio Slate 8px grid (`gap-3 = 12px`). Not an a11y blocker but degrades spacing rhythm. Batch-fix: replace `gap-3` → `gap-4`, `p-3` → `p-4`, `space-y-3` → `space-y-4` where proportionally correct. |
| UX-08 | MEDIUM | `key={index}` in non-static dynamic lists | `app/attendance/regularization/_components/RequestTimeline.tsx:86` (timeline steps — dynamic server data), `app/leave/calendar/page.tsx:251` (calendar day grid — generated array, stable by position — OK), `app/dashboards/executive/page.tsx:258` (card grid from API), `app/predictive-analytics/PredictiveCharts.tsx:74` (tooltip series from API) | Static-content lists (`contact/page.tsx`, `security/page.tsx`, `about/page.tsx`, `features/page.tsx`) using index keys are acceptable. Server-data-driven dynamic lists should use stable IDs from the API response. |
| UX-09 | MEDIUM | Unvalidated user-supplied URLs used in `href` without `safeUrl()` wrapper | `app/training/catalog/[id]/page.tsx:252,278` (`content.documentUrl`, no `safeUrl`), `app/linkedin-posts/page.tsx:267` (`post.postUrl`, validated by `z.string().url()` but not scheme-blocked), `app/recruitment/candidates/[id]/page.tsx:389` (`candidate.resumeUrl`, no scheme check) | `z.string().url()` validates URL structure but does not block `javascript:` schemes (Zod's URL validator uses the WHATWG URL constructor which accepts `javascript:` in many environments). Wrap all user-origin URLs with the existing `safeUrl()` utility from `lib/utils/sanitize.ts` (already imported in several files). |
| UX-10 | MEDIUM | Custom slide-panel modals lack Escape-key dismiss | `app/tasks/page.tsx:96`, `app/projects/psa/page.tsx:139`, `app/admin/budget/page.tsx:270`, `app/surveys/pulse/page.tsx:102`, `app/travel/expenses/page.tsx:122` | Only 6 of 10 custom modals handle keyboard Escape. The `onClick` backdrop works for mouse users. Add `useEffect` with `keydown` listener for `Escape` calling `onClose`. |
| UX-11 | MEDIUM | `one-on-one/page.tsx` (1771 lines), `dashboard/page.tsx` (1491 lines), `employees/page.tsx` (1457 lines) massively exceed 500-line file budget | `app/one-on-one/page.tsx` (1771 LOC), `app/dashboard/page.tsx` (1491 LOC), `app/employees/page.tsx` (1457 LOC), `app/expenses/page.tsx` (1450 LOC), `app/letters/page.tsx` (1414 LOC) | 5 pages exceed 1400 lines. These files bundle multiple forms, modals, and data-fetching hooks into a single module. Each should be split into subcomponent files. Not a blocker for launch but a maintenance risk. |
| UX-12 | MEDIUM | Projects calendar has `min-w-[1200px]` inner container with `overflow-x-auto` outer — not harmful but `[BROWSER-NEEDED]` for 320px viewport | `app/projects/calendar/page.tsx:618` | Horizontal scroll at 320–768px must be verified. The outer `overflow-x-auto` should contain it, but deep nesting of flex containers with `flex-1` can defeat this. |
| UX-13 | LOW | `dangerouslySetInnerHTML` in `app/layout.tsx` for theme script | `app/layout.tsx:68` | Uses nonce injection correctly (`nonce={nonce}`). Payload is the `getThemeScript()` return — a static string in `lib/theme/theme-script.ts`. Not user-input. Acceptable. Document as confirmed safe. [BROWSER-NEEDED] to verify CSP nonce header in production response. |
| UX-14 | LOW | `AdminLayoutInner.tsx:265` uses `JSON.stringify(permissions)` as `useMemo` dependency | `app/admin/AdminLayoutInner.tsx:265` | Anti-pattern: `JSON.stringify` on large objects in deps creates a string on every render to check equality. Use `useRef` + deep comparison, or split permission checks into stable primitive deps. Not a bug, but wasteful. |
| UX-15 | LOW | `AuthGuard` suppresses `exhaustive-deps` without naming the stale value | `components/auth/AuthGuard.tsx:207` | Comment above (line 203) explains the omissions (`checkAuthorization`, `router`, `restoreSession`, `isRestoringSession`). The comment is present and the reasoning is valid (stable Zustand actions, stable Next.js router). Mark as reviewed. |
| UX-16 | LOW | `attendance/page.tsx` suppresses `exhaustive-deps` for `now` in `useMemo` | `app/attendance/page.tsx:144` | `now` is a `useMemo(() => new Date(), [])` — intentionally captures mount time. Suppression omits `now` from `computeMonthStats` dep to avoid recomputing every second. Valid but should have an explanatory comment co-located with the disable directive. |

---

## Pages/flows for orchestrator to browser-validate

The following require visual and interactive verification on the live environment
(https://hrms-frontend-vert.vercel.app) using Chrome with an accessibility audit tool
(Lighthouse Accessibility, axe DevTools, or NVDA/VoiceOver):

1. **Any protected page with sidebar + skip-link** (`/me/dashboard` or `/attendance`):
   - Press Tab on page load → skip-link should appear.
   - Activate it → focus should jump past the sidebar directly to the first heading in the content area.
   - **Current expectation from code:** Focus lands on the `div#main-content` wrapper which still includes the sidebar. Verify whether the sidebar receives focus first after activating the skip-link.

2. **Tasks slide panel** (`/me/tasks` or any page with the Task create button):
   - Open the "New Task" panel with keyboard (Tab to button, Enter).
   - Verify: does focus move into the panel? Does Escape close it?
   - Verify: does a screen reader announce "dialog" when the panel opens?
   - **Current expectation from code:** No `role="dialog"` — screen reader will NOT announce it as a dialog.

3. **Biometric Devices form** (`/admin` → Biometric Devices tab):
   - Tab through form fields. Verify each label's click selects the correct input.
   - **Current expectation from code:** Labels have no `htmlFor` → clicking labels does not focus inputs.

4. **Loans New form** (`/loans/new`):
   - Tab through Loan Amount, Interest Rate, Term Months fields.
   - Verify screen reader announces the correct label for each field.
   - **Current expectation from code:** These inputs lack `id` and labels lack `htmlFor`.

5. **Projects Calendar at 320px viewport** (`/projects/calendar`):
   - Resize browser to 320px or use DevTools device emulation.
   - Verify horizontal overflow does not escape the `overflow-x-auto` container.
   - Check that the Gantt-style header row scrolls in sync with the content rows.
   - **Expected:** Should scroll correctly, but flex nesting risk at narrow viewports.

6. **Auth flow: `mustChangePassword` forced redirect** (`/auth/change-password`):
   - Log in with a user that has `mustChangePassword: true`.
   - Verify the redirect to `/auth/change-password` happens before any other route renders.
   - Verify that navigating away from `/auth/change-password` before completing returns to it.
   - [BROWSER-NEEDED] because this requires a specific test user state.

7. **Dashboard `dangerouslySetInnerHTML` email viewer** (`/dashboard` — email widget):
   - Open the email preview area.
   - Paste `<img src=x onerror="alert(1)">` as email body content via the API sandbox.
   - Verify `sanitizeEmailHtml` blocks execution (should show broken img, no alert).
   - [BROWSER-NEEDED] for runtime XSS validation.

8. **Recruitment Scorecards slide panel** (`/recruitment/scorecards`):
   - Same ARIA checks as UX-01: open panel, verify screen reader announcement, Escape key, focus trap.

---

## UX Coverage Score: 74 / 100

**Justification:**

| Area | Score | Notes |
|------|-------|-------|
| Security (dangerouslySetInnerHTML, sanitization) | 18/20 | DOMPurify at every call site with tested allowlists. `z.string().url()` on user URLs is partial — `javascript:` not explicitly blocked. |
| Accessibility — ARIA / roles | 8/15 | Skip-link broken. 10 modals missing `role="dialog"`. 9+ inputs missing `htmlFor`. Strong in other areas: `aria-live` on 15 pages, `aria-label` on interactive divs in nu-calendar. |
| Accessibility — keyboard | 8/12 | Calendar day cells have full keyboard support. 5 modals lack Escape. Many `role="button"` divs in nu-calendar, contracts, admin are correctly wired with `tabIndex={0}` and `onKeyDown`. |
| Hook correctness | 8/10 | `exhaustive-deps` escalated to error globally. 31 suppressions — majority documented; 7 in auth paths need individual review. Double AuthGuard in AppLayout is a performance issue, not a correctness bug. |
| Responsiveness | 9/12 | Good responsive class discipline (`md:`, `lg:` throughout). Projects calendar `min-w-[1200px]` is wrapped in `overflow-x-auto`. Page shells use `max-w-[1600px]`. Cannot confirm 320px without browser. |
| Error boundaries | 9/10 | Route-level `error.tsx` files for most sub-routes. AppLayout wraps content in `ErrorBoundary`. Root `providers.tsx` has `ErrorBoundary`. Near-complete. |
| Design system compliance | 7/10 | 83 8px-grid violations (gap-3/p-3/space-y-3) in 20 files. No gradient-text or brand-color violations found. Design system rules well-enforced via ESLint. |
| Empty states / UX clarity | 7/11 | `aria-live="polite"` regions on most empty-state areas. AuthGuard shows "Session restoring" skeleton during restore. Auth forced-password-change redirect logic present. |

**Exit bar is 90. This review scores 74. Blockers preventing merge:**
- UX-01 (10 inaccessible modals) — HIGH
- UX-02 (broken skip-link) — HIGH
- UX-03 (double AuthGuard) — HIGH
- UX-04 (auth-path stale-closure suppressions unreviewed) — HIGH
- UX-05/UX-06 (form labels without `htmlFor`) — HIGH

---

## What Has NOT Been Verified

The following areas require browser-side or runtime verification and could not be confirmed from static analysis alone:

- **Color contrast ratios**: CSS custom property values (`--text-primary`, `--text-muted`, etc.) resolve at runtime. Dark-mode contrast cannot be confirmed statically. Axe DevTools or Lighthouse must run in both light and dark themes. The prior a11y session noted a "contrast flake" pending item in `pendings.md`.
- **Focus trap inside modals**: Even if `role="dialog"` is added, a working focus trap requires verifying that Tab cycles within the panel and does not escape to the underlying page.
- **`/terms` and `/privacy` pages**: Listed in `pendings.md` as pending a11y audit. Not inspected in this review.
- **Mobile touch interactions**: Sidebar hamburger menu, bottom nav bar, and scroll behavior on iOS Safari.
- **Authentication-gated routes**: All 273 protected routes were reviewed structurally, but actual auth state, RBAC permission gating, and role-based visibility require a logged-in browser session.
- **WebSocket reconnect UX**: `WebSocketProvider` and real-time notification delivery under network interruption.
- **`/fluence/search` highlighted content rendering**: `dangerouslySetInnerHTML` with `sanitizeHtml` on `result.highlightedContent` at `app/fluence/search/page.tsx:622`. Sanitized correctly in code; browser-side Elasticsearch `<em>` highlight tags need visual verification.
- **Authed a11y audit blocker**: `pendings.md` records an open item that the authenticated Playwright session cannot run on this machine. Visual audit of authed routes must be done manually on the live Vercel deployment.
- **Print / PDF letter preview**: `app/letters/templates/page.tsx:203` uses `sanitizeHtml` on a template preview HTML string. Correct in code; complex template edge-cases need review in a running instance.
