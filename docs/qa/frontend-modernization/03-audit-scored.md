# Phase 1 — Scored Audit

**Priority = Impact (Critical=4·High=3·Med=2·Low=1) × User Impact (1–10) × Design Debt (1–10).** Eng Complexity (1–10) is cost — tiebreak only, NOT in the multiplier.

| # | Area | Finding | Imp | User | Debt | Cx | **Priority** |
|---|---|---|---|---|---|---|---|
| F3.1 | Profile | 3 hand-rolled heroes, no shared `ProfileHero` | 4 | 8 | 9 | 5 | **288** |
| F2.1 | Directory | Photos stored but never rendered (`profileImageUrl` unused) | 3 | 8 | 7 | 3 | **168** |
| F4.2 | Dashboard | 1-sec tick re-renders whole tree + rebuilds 330-line widget array; zero memo | 3 | 6 | 8 | 6 | **144** |
| F1.4 | Tokens | No opt-in elevation token set (program foundation) | 3 | 7 | 6 | 5 | **126** |
| F2.2 | Directory | No first-class card-grid peer; toggle not persisted/URL-synced | 3 | 7 | 6 | 4 | **126** |
| F3.2 | Profile | Avatar fidelity split + 6 local avatar fns, 0 shared | 3 | 6 | 7 | 3 | **126** |
| F5.3 | Loading | Double-flash route-skeleton → spinner (`me/leaves`,`me/profile`,`leave/my-leaves`) | 3 | 6 | 6 | 3 | **108** |
| F5.4 | Loading | Skeleton dims mismatch real content → CLS (`me/attendance`,`me/dashboard`) | 3 | 6 | 6 | 3 | **108** |
| F2.4 | Dir/Resp | List table in Card `overflow-hidden` clips at 375px | 3 | 7 | 5 | 2 | **105** |
| F7.1 | Responsive | Directory search bar `flex gap-4` no-wrap → 375px compression | 3 | 7 | 5 | 2 | **105** |
| F7.3 | Responsive | Attendance check-in `row-between` doesn't stack at 375px | 3 | 6 | 5 | 2 | **90** |
| F3.3 | Profile | `[id]` 1244 / edit 1261 lines — monolithic (>500) | 3 | 4 | 7 | 7 | **84** |
| F4.1 | Dashboard | 1498-line monolith (>500), all widgets inline | 3 | 3 | 8 | 8 | **72** |
| F5.1 | Loading | Two skeleton identities (Mantine 270× vs custom inline) | 2 | 5 | 7 | 6 | **70** |
| F1.3 | Tokens | `surface-*` Tailwind classes bypass token vars | 2 | 4 | 6 | 3 | **48** |
| F2.3 | Directory | Two duplicate directory variants | 2 | 4 | 6 | 5 | **48** |
| F4.3 | Dashboard | 5 Google `fetch()` bypass React Query (no cache/dedup) | 2 | 4 | 6 | 5 | **48** |
| F5.2 | Loading | 233 inline `animate-spin` bypass `Spinner` | 2 | 4 | 6 | 5 | **48** |
| F6.1 | Empty | ~30–40% DIY empties; presets underused | 2 | 4 | 5 | 3 | **40** |
| F6.2 | Empty | Bare `<p>` empties (no icon/`role=status`) | 2 | 4 | 5 | 2 | **40** |
| F7.4 | Responsive | Hardcoded `grid-cols-2` form sections at 375px | 2 | 5 | 4 | 2 | **40** |
| F4.5 | Dashboard | `me/dashboard` skeleton mismatch + `divide-x` glitch | 2 | 4 | 4 | 2 | **32** |
| F4.4 | Dashboard | Role gating in imperative `Array.push` (refactor-risk) | 2 | 2 | 6 | 6 | **24** |
| F1.1 | Tokens | Accent drift `#2563EB` vs `#2952A3` | 1 | 2 | 4 | 2 | **8** |

**Out of scope (not design debt):** compensation "New Revision" missing permission gate → `08-rbac-impact-report.md`.

## Synthesis
Three mutually-reinforcing clusters:
1. **Identity layer (top + cheapest):** F3.1+F2.1+F3.2 — one `ProfileHero`, render the photos we already store, a shared `Avatar`. Highest value, lowest complexity (Cx 3–5). Best ROI in the program.
2. **Directory as a card surface:** F2.2+F2.1+F2.4+F7.1 — high user impact, low cost, most-visible elevation to rank-and-file.
3. **State hygiene:** F5.3/F5.4/F5.1 + F6 — the "un-premium tells" (CLS, spinner-not-skeleton, bare empties). Medium individually, collectively decisive.

Monoliths (dashboard 1498, profile 1244/1261) score on Design Debt but carry high complexity → sequenced **after** the cheap identity wins. Dashboard is operator-facing → its work is composition+perf, not visual elevation.
