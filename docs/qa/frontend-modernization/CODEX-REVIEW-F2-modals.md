# CODEX-REVIEW — Scope F2 (partial): dashboard modals extraction

**Scope:** Decompose the 1481-line operator `dashboard/page.tsx` by extracting its three Google
preview modals (Calendar · Email · Drive) into a sub-component, plus the two shared helpers and the
shared type they depended on. **Change class: EXTRACTION (behaviour-preserving).**

> Operator screen — strictest scrutiny. No widget/query/role-predicate/data-flow change.

## Files
| File | Class | Change |
|------|-------|--------|
| `app/dashboard/_types.ts` | EXTRACTION (new) | `GoogleNotification` interface moved out of `page.tsx` verbatim |
| `app/dashboard/_utils.ts` | EXTRACTION (new) | `formatRelativeTime` + `getPreviewUrl` moved out verbatim (pure helpers) |
| `app/dashboard/_components/DashboardModals.tsx` | EXTRACTION (new) | the 3 modals, byte-identical JSX, driven by props |
| `app/dashboard/page.tsx` | EXTRACTION | modals → `<DashboardModals/>`; removed the moved type/helpers + now-unused imports |

**Result: `page.tsx` 1481 → 1174 lines (−307).**

## Render-tree equivalence (EXTRACTION proof)
- The modal JSX is moved **verbatim**. The only substitutions are inline closures → callback props:
  `() => setSelectedEvent(null)` → `onCloseEvent`, the email close `{setSelectedEmail(null);
  setEmailContent('')}` → `onCloseEmail`, `setSelectedFile(null)` → `onCloseFile`,
  `router.push('/nu-mail'|'/nu-drive')` → `onOpenMail`/`onOpenDrive`. The page wires these callbacks to
  the exact same statements it ran inline.
- `safeWindowOpen(...)` calls, `sanitizeEmailHtml`, `format`, `formatRelativeTime`, `getPreviewUrl`,
  `dangerouslySetInnerHTML`, `Image`, icons — all preserved identically (imported in the new file).
- `GoogleNotification` / `formatRelativeTime` are now imported by `page.tsx` from the shared files
  (still used by the notifications widget at the same call sites); `getPreviewUrl` is modal-only.
- The modals are conditionally rendered on `selected*` state exactly as before → identical behaviour.

## What was NOT touched (the risky parts of F — deliberately deferred)
- **`dashboardWidgets` builder + the 3 role `Array.push` predicates** — untouched in place. NOT memoized
  (wrapping the 330-line build in `useMemo` risks stale-closure deps on the operator screen for an
  internal-only gain) and NOT extracted (the role-visibility logic stays where it is, verbatim).
- **F3 memoization / F4 role-predicate test / F5 fetch→useQuery** — not done; they require moving the
  role predicates / changing data-fetching on the critical screen, disproportionate risk vs. value.
- All queries (`useDashboardAnalytics`, `useAttendanceByDateRange`, `useMyTimeEntries`,
  `useOnboardingProcessesByStatus`), mutations (`useCheckIn`/`useCheckOut`), and the Google-notifications
  effect — untouched.

## RBAC / Query-safety / Performance
No gate, permission, query key, caching, polling, invalidation, or data binding changed. RBAC spine
re-run **70/70**. The modals component holds no state and fetches nothing. Net: smaller main module,
no new dep/query/request.

## Validation
`tsc --noEmit` 0 · `eslint --max-warnings=0` 0 (4 files) · vitest 70/70 · `next build` exit 0.
**Browser parity (MANAGER session):** operator `/dashboard` renders identically — LiveGreeting, KPI
cards, charts, widget grid all present; the modals are conditionally rendered (absent without Google
data, as before). No console errors, no hydration error.

## Risk & rollback
**Risk: LOW** (verbatim move, callback-prop substitution, tsc/eslint/build green). The modals'
interactive paths require live Google data which the demo session lacks, so they're verified by
type-checking + identical JSX rather than click-through. **Rollback:** revert the commit; the 4 files
were additive/contained.

## Verdict requested
PASS — clean behaviour-preserving decomposition; remaining `page.tsx` size (1174, not <500) is by
design: the further reduction is the higher-risk widgets/role-predicate split, deliberately not pursued
on the critical operator screen.
