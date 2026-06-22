# CODEX-REVIEW — Scope D5 (partial Epic D): DIY empty → EmptyState

**Scope:** Convert the one verified, employee-facing DIY empty state to the shared `EmptyState`
component. **Change class: PRESENTATION/EXTRACTION.** The rest of Epic D (D1 skeleton swaps, D3
inline-spinner removal, D4 dedup) is **deferred** with rationale — see [`RUNTIME-DEBT.md`](./RUNTIME-DEBT.md).

## 1. Per-file classification
| File | Class | Edit |
|------|-------|------|
| `app/leave/my-leaves/page.tsx` | PRESENTATION/EXTRACTION | `requests.length === 0` DIY empty block (icon+h3+desc+button) → `<EmptyState>` with `actionLabel`/`onAction`; `EmptyState` import added |

## 2. Why only one file
Discovery flagged several empties; **source verification narrowed it to one**:
- `leave/calendar:218` = **error** state (AlertCircle + "Try Again") — `EmptyState` (`role="status"`) is semantically wrong → rejected.
- `leave/page.tsx:267,370` = tiny inline `<p>` messages — full `EmptyState` (`py-16`) would over-weight → rejected.
- `leave/approvals` = operator/approver screen — outside the employee-facing boundary → rejected.

## 3. Feature-parity
The "Apply for Leave" action is preserved exactly: `actionLabel="Apply for Leave"` +
`onAction={() => router.push('/leave/apply')}` (was an inline `<button onClick={() => router.push('/leave/apply')}>`).
The **loading spinner above it (`!requestsData`, lines 166-174) is left untouched** — removing it is the
behavioral D3 item, deferred. `CalendarOff` icon retained (now the EmptyState icon).

## 4. RBAC / Query-safety
No gate, query, key, caching, polling, or invalidation touched. RBAC spine **156/156**. `EmptyState` is
pure presentational.

## 5. Performance
`EmptyState` already bundled (used across the app, incl. team-directory + C5). Net markup reduction. No
new dep/request/query.

## 6. Baseline Before/After/Delta
**Before:** bespoke centered block — `CalendarOff` in a `w-16 h-16` tinted circle, `text-xl` h3,
description, `btn-primary` button. **After:** canonical `EmptyState` (`default` size) with the same
icon, title, description, and action. **Delta:** standardized empty surface (consistent with the rest
of the product); the empty is persistent (not a transient flash) so consistency carries real value.
**Screenshot DEFERRED** (no browser) → visual check is open debt.

## 7. Validation
`tsc --noEmit` 0 · `eslint --max-warnings=0` 0 · vitest RBAC+ProfileHero 156/156 · `next build` exit 0 (51s).

## 8. Risk & rollback
**Risk: LOW.** Single contained component swap mirroring the shipped C5 pattern. **Rollback:** revert
the commit; `EmptyState` stays (used elsewhere).

## Verdict requested
PASS-with-debt — static gates green; only deferred runtime/visual evidence remains.
