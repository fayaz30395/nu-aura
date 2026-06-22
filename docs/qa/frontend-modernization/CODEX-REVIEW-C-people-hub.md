# CODEX-REVIEW — Scope C: Directory / People Hub (C2–C5)

**Scope:** Modernize `app/employees/directory/page.tsx` presentation. **C1 (URL `?view=` +
localStorage persistence) HARD-STOPPED** as P3 behavioral and **skipped by user decision** — see
[`11-epicC-cardgrid-verdict.md`](./11-epicC-cardgrid-verdict.md). Delivered C2–C5, all
**PRESENTATION/EXTRACTION**. Posture: static-gated + flagged runtime debt
([`RUNTIME-DEBT.md`](./RUNTIME-DEBT.md)).

## 1. Per-file classification (single file)
| File | Class | Edits |
|------|-------|-------|
| `app/employees/directory/page.tsx` | PRESENTATION/EXTRACTION | C2 grid-card + detail-modal band-overlap avatars → shared `Avatar` (photo-forward); C3 table → `overflow-x-auto` wrapper; C4 search row `flex` → `flex flex-col sm:flex-row`; C5 DIY empty → `EmptyState`; dead `getInitials` import removed; `Avatar`+`EmptyState` imports added |

## 2. Decision matrix
- **C2** → Existing-component reuse (`Avatar`, already bundled). Folds in the two B2-deferred
  band-overlap avatars (grid card + detail modal). Now render `profileImageUrl` when present.
- **C3** → CSS only (`overflow-x-auto` inner wrapper; Card keeps `overflow-hidden` for rounded corners).
- **C4** → CSS only (responsive stack at <640px; desktop row unchanged).
- **C5** → Composition/reuse (`EmptyState`, matches `team-directory` usage).

## 3. Feature-parity
Row `onClick` (opens detail modal), the grid⇄list `viewMode` toggle (existing `useState`), search
(`useQuery`), filters, sort, pagination, mailto/tel links, and the modal close/actions are
**untouched**. C1 NOT implemented → no new URL/persistence/behavioral state. Card-grid behavior is
exactly as before (in-session toggle).

## 4. RBAC
No gate, permission check, role predicate, or conditional render added/removed/moved. RBAC spine
re-run **156/156 green**. Directory visibility unchanged (cite `05-RBAC`).

## 5. Query-safety
Zero data-flow change. No query key, caching, polling, or invalidation touched. The deliberately
**skipped** C1 was the only item that would have added state — it was not built.

## 6. Performance
No new dependency (`Avatar`/`EmptyState` already bundled). Net markup reduction. No new request/query.
`next build --webpack`: **✓ Compiled successfully in 52s** (full-build exit verified pre-commit; gz
route table not emitted by non-TTY build → within ≤+5% budget by construction — reuse of bundled
components, removed inline markup).

## 7. Baseline Before/After/Delta
**Before:** grid card + detail modal showed `getRandomColor` initials circles inside a `p-1` ring on
a colored band; table clipped at narrow widths (`overflow-hidden`); search row overflowed at 375; DIY
empty block. **After:** photo-forward circular `Avatar` (grid `lg`/72px on band, modal `xl`/112px
focal), table horizontally scrollable, search stacks at <640px, canonical `EmptyState`. **Delta:**
intended altitude shift (initials→photo-capable, square-ish→circular) + three responsive/robustness
fixes. **Screenshot baseline DEFERRED** (no browser session) → visual-regression check is open debt,
not claimed PASS. Avatar size deltas (grid 56→72, modal 88→112) are the main items to eyeball when a
baseline is available.

## 8. Validation
`tsc --noEmit` 0 · `eslint --max-warnings=0` 0 · vitest RBAC+ProfileHero 156/156 · `next build` compile
OK (52s). Runtime (axe/network-parity/screenshot/CWV) deferred.

## 9. Risk & rollback
**Risk: LOW–MED.** C3/C4/C5 are mechanical CSS/composition. C2 avatar size deltas (modal `xl`=112px
vs prior ~88px; grid `lg`=72px vs ~56px) are the only items with visual-judgment risk, unvalidated by
screenshot this session — flagged as runtime debt. **Rollback:** `git revert` the C commit; shared
primitives stay (used elsewhere).

## Verdict requested
PASS-with-debt — static gates green; sole open item is deferred runtime/visual evidence (no browser),
plus the consciously-deferred C1 (approval-gated, user chose to skip).
