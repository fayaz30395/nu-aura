# Epic C — People Hub / Directory · CARD GRID CLAUSE verdict

**Evaluated:** `app/employees/directory/page.tsx` (read-only). **Date:** 2026-06-23.

## Finding
The directory **already** ships a grid⇄list view toggle as **ephemeral component state**:
- `const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')` — `directory/page.tsx:142`
- toggle buttons `setViewMode('grid')` / `setViewMode('list')` — `:260` / `:270`
- conditional render `viewMode === 'grid' ? <cards/> : <table/>` — `:478`

So a card-grid mode is **not a new behavior** — it exists. Only the *persistence layer* the Phase-4
plan proposed for C1 is new.

## Per-task classification
| Task | What it adds | Class | Verdict |
|------|--------------|-------|---------|
| **C1** `?view=grid\|table` URL param + `localStorage` persistence | **new URL state + new persistence + new behavioral logic** | **P3 Behavioral** | **HARD STOP — approval required.** Per CARD GRID CLAUSE: "If it REQUIRES new persistence, new URL state, or new behavioral logic → P3: STOP, request approval." |
| **C2** photo-forward elevation card (modernize existing grid card; folds in B2-deferred band-overlap avatar) | presentation redesign of existing render | P1/P2 | Proceed |
| **C3** preserve table + fix `overflow-hidden` → scrollable | CSS | P1 | Proceed |
| **C4** search bar `flex-wrap`/stack (375) | CSS responsive | P1 | Proceed |
| **C5** DIY empty → `EmptyState` + `noEmployees` preset | composition/reuse | P1/P2 | Proceed |

## Decision
- **C2–C5 proceed** as presentation-only on the **existing** `viewMode` state — no workflow,
  query, route, or persistence change.
- **C1 halted** pending explicit user approval (adds URL/localStorage persistence = behavioral).
  Recommended default: **skip C1** — the in-session toggle already satisfies the UX; persisting
  the preference is a nice-to-have not worth a P3 behavioral change in a presentation-only program.
