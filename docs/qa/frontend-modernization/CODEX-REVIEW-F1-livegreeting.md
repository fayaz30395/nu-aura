# CODEX-REVIEW — Scope F1 (partial Epic F): LiveGreeting extraction

**Scope:** Extract the once-per-second clock on the operator dashboard into a `<LiveGreeting/>`
child so only that small block re-renders each tick (Epic **F1** — kill the page-wide 1-sec
re-render). **Change class: EXTRACTION (behaviour-preserving).** **F2/F3/F4/F5 remain DEFERRED** —
they need runtime parity verification (no browser this session). See [`RUNTIME-DEBT.md`](./RUNTIME-DEBT.md).

> Operator screen — strictest scrutiny. The change touches ONLY the greeting clock. No widget array,
> role predicate, query, mutation, or RBAC gate was moved.

## 1. Per-file classification
| File | Class | Edit |
|------|-------|------|
| `app/dashboard/_components/LiveGreeting.tsx` | EXTRACTION (new) | owns `currentTime` state + 1-sec interval + greeting/date derivation + the greeting `<div>` markup (byte-identical) |
| `app/dashboard/page.tsx` | EXTRACTION | removed `currentTime` state, the interval `useEffect`, and the `greetHour/greeting/greetingDate` derivation; replaced the inline greeting `<div>` with `<LiveGreeting firstName={firstName} />`; added import |

## 2. Render-tree equivalence (EXTRACTION proof)
The moved JSX and logic are **identical**, char-for-char:
- Same null-initial `useState<Date|null>(null)` (SSR-safe), same `setCurrentTime(new Date())` on mount,
  same `setInterval(…, 1000)`, same `clearInterval` cleanup.
- Same thresholds (`<12` morning / `<18` afternoon / else evening), same `format(currentTime,'EEEE, MMMM d')`,
  same `greetingDate ? … : ''` guard, same `<h1 class="text-aura-title …">{greeting}, {firstName}</h1>`
  and `<p class="text-sm …">`.
- `firstName` is derived in the parent (unchanged) and passed as a prop — it does not change per tick.
- Net effect: visual output is **identical by construction**; the only behavioural difference is that
  the per-second `setState` re-renders the ~10-line `LiveGreeting` instead of the 1500-line page.

## 3. What was NOT touched (the risky parts of F)
- The **3 role-based `Array.push` predicates** (Department Distribution ~685, Payroll ADMIN-only ~719,
  New Joiners `viewType !== 'EMPLOYEE'` ~894) — untouched.
- The **`dashboardWidgets` array** and all 7 conditional pushes — untouched (F2/F3 deferred).
- The **DASHBOARD_VIEW auth guard** (~155-168) and the **`hasPermission(EMPLOYEE_CREATE)` "New Hire"
  gate** in the header — both remain in the parent, verbatim.
- All 4 React Query hooks + 2 mutations + 5 Google `fetch()` calls — untouched (F5 deferred).

## 4. RBAC / Query-safety
No gate, permission check, query key, caching, polling, invalidation, mutation, or data binding
changed. RBAC spine re-run **156/156**. `currentTime` was confined to the greeting (verified:
refs only at the old 127/561/563) → extraction cannot affect any other widget.

## 5. Performance
**Positive.** Before: a top-level `currentTime` state updated every second re-rendered the entire
1500-line dashboard tree each tick. After: only `LiveGreeting` re-renders per second. No new dep, no
new request, no new query; one tiny new module (route-private). `next build` exit 0 (see §7).

## 6. Baseline Before/After/Delta
**Before/After:** the greeting header renders identically (same words, same date, same name, same
animation — the `motion.header` wrapper + action buttons are unchanged in the parent). **Delta:** none
visible; purely an internal re-render-scope improvement. **Screenshot DEFERRED** (no browser) — but
visual parity is guaranteed by char-identical JSX, so risk is minimal.

## 7. Validation
`tsc --noEmit` 0 · `eslint --max-warnings=0` 0 (both files) · vitest RBAC+ProfileHero 156/156 ·
`next build` exit 0. Orphan check: no dangling `currentTime/greeting/greetingDate` refs.

## 8. Risk & rollback
**Risk: LOW** (confined state, identical JSX, no gate/query touched) — though it is the operator
dashboard, so flagged for a screenshot pass when a browser is available. **Rollback:** revert this
commit (single extraction); the original inline greeting returns exactly.

## Verdict requested
PASS-with-debt — static gates green; visual parity guaranteed by construction; only a confirmatory
screenshot remains as deferred runtime evidence. F2/F3/F4/F5 explicitly NOT attempted (need runtime).
