# Phase 4 — Implementation Plan

Epic → Feature → Task, **dependency-ordered**, ordered by Priority (`03-audit-scored.md`), Eng Complexity as cost tiebreak. **Serial implementation** (no parallel writes; no worktree isolation in this repo — known corruption hazard). Per item: Effort (L/M/H) · Risk (1–5) · Rollback.

Per-item gate (every item): **implement → `npm run build` + typecheck + existing test suite (RBAC tests must pass) → visual validation (light/dark/keyboard/SR landmarks/375/768/1440, before→after) → document → PAUSE for review.**

## Epic A — Elevation Foundation *(enables everything; blocks B–E)*
- **A1** Add `[data-altitude="elevated"]` warm token block to `globals.css`; wire `AppLayout` to set the attribute on employee routes (allowlist mirrors §01 altitude split). Effort M · Risk 2 · Rollback: remove block + attribute (inert until referenced).
- **A2** `components/ui/Avatar.tsx` (photo + sm/md/lg/xl + name-hash fallback). Effort S · Risk 1 · Rollback: delete; nothing depends until B.

## Epic B — Identity layer *(Priority 288/168/126; lowest cost)*
- **B1** `components/ui/ProfileHero.tsx` (banner variant, metrics + actions slots). Effort M · Risk 3 · Rollback per-consumer.
  - B1.1 build component · B1.2 wire View (gates preserved) · B1.3 wire Edit (adds photo+status) · B1.4 wire Compensation (adds metrics).
- **B2** Directory: render photos via `Avatar` (replace initials). Effort S · Risk 2.
- *Depends on:* A1, A2.

## Epic C — Directory Card-Grid *(Priority 126/105)*
- **C1** `?view=grid|table` URL param + localStorage persistence. Effort M · Risk 2.
- **C2** Photo-forward elevation card. Effort M · Risk 2. *(Depends B2.)*
- **C3** Preserve table + fix `overflow-hidden` → scrollable. Effort S · Risk 1.
- **C4** Search bar `flex-wrap`/stack. Effort S · Risk 1.
- **C5** DIY empty → `EmptyState` + `noEmployees` preset. Effort S · Risk 1.

## Epic D — State hygiene (loading/empty) *(Priority 108/108/70/40)*
- **D1** Standardize employee-route skeletons on `@/components/ui/Skeleton`. Effort M (phased) · Risk 1.
- **D2** Match skeleton geometry (attendance calendar, `me/dashboard` strip). Effort S · Risk 1.
- **D3** Kill double-flash (`me/leaves`,`me/profile`,`leave/my-leaves`). Effort S · Risk 1.
- **D4** De-dupe skeleton symbols (`Skeleton.tsx`/`Loading.tsx`). Effort S · Risk 2 (shared symbol — verify importers).
- **D5** DIY empties → `EmptyState` on employee screens. Effort M · Risk 1.

## Epic E — Responsive fixes (375 focus) *(Priority 105/90/40)*
- **E1** Directory search + table (overlaps C3/C4). · **E2** Attendance check-in stack. · **E3** Form `grid-cols-1 sm:grid-cols-2`. · **E4** Dashboard `divide-x` fix. Effort S–M each · Risk 1.

## Epic F — Dashboard decomposition *(operator; composition+perf only; Priority 144/72; highest Cx)*
- **F1** Extract `<LiveGreeting/>` (kills 1-sec re-render). Effort M · Risk 2.
- **F2** Split into 6 section files <500 lines. Effort H · Risk 4.
- **F3** Memoize series/widgets/handlers; hoist helpers. Effort M · Risk 3.
- **F4** Preserve 3 role `Array.push` predicates verbatim (+ RBAC test). Effort M · Risk 4.
- **F5** *(Follow-up)* wrap Google `fetch` in `useQuery`. Effort M · Risk 2.
- *Rollback:* keep original `page.tsx` until section-by-section parity (visual + role-matrix) verified; revert is file swap.

## Dependency order
**A → B → {C, D, E} → F.** A unblocks all styling. B (identity) first for ROI. C/D/E are employee-surface polish (serial writes, independent scopes). F last — highest complexity, operator screen, strictest role-preservation.

## Cross-cutting gates
- **RBAC:** `08-rbac-impact-report.md` confirmed presentation-only before any screen is touched.
- **Validation prerequisite:** EMPLOYEE-role session provisioned before Epic B visual validation (see `00-README.md` decision #2).
- **File budget:** no file > 500 lines after F. **Diffs:** kept clean/reviewable (external Codex review pass expected).
