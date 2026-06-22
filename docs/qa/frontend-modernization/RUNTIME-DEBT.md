# Runtime-Gate Verification Debt Ledger

> The program's runtime gates (screenshot baseline 375/768/1440 · light/dark · axe a11y ·
> network-parity capture · CWV) require a **live demo-EMPLOYEE session on the HTTPS Vercel FE**
> driven via browser MCP. When that session is unreachable, screen work proceeds under the
> **static-gated + flagged-debt** posture (user-approved 2026-06-23): full static chain
> (`build` · `tsc` · `vitest` · RBAC · `eslint`) is enforced per screen; runtime evidence is
> deferred and tracked here until the browser session is available.

## Why runtime is currently unreachable
- **Claude Chrome extension not connected** this session (`tabs_context_mcp` → "extension not connected").
- Local BE down + local HTTP can't hold `Secure` cookies → no local auth path.
- Live FE confirmed up (`/auth/login` → 200); demo creds were ENABLED as of Green-Flag Run-6.

## How to clear an entry
Connect the Claude Chrome extension, log in to https://hrms-frontend-vert.vercel.app as
`arun@nulogic.io` / `Welcome@123` (roles `["EMPLOYEE"]`) in a **clean** window (never the
default Chrome that holds a PROD SUPER_ADMIN session), then per screen: capture baseline +
after screenshots into `visual-baseline/`, run axe, capture network requests pre/post and diff
endpoints/query-keys, record CWV. Tick the row.

## Ledger

| Scope | Screen / route | Change | Static gates | Runtime debt (open) |
|-------|----------------|--------|--------------|---------------------|
| Foundation | `employees/[id]`, `[id]/edit`, `[id]/compensation`, `ProfileSheet` | ProfileHero adoption (committed `84ace7f6`) | PASS | baseline · axe · network-parity |
| **B2** | `team-directory` (list + grid cards) | bespoke initials → shared photo-forward `Avatar` | _pending this scope_ | baseline · axe · network-parity |
| **B2** | `employees/directory` (table row) | identity cell → `ProfileIdentity` | PASS | baseline · axe · network-parity |
| **C** | `employees/directory` (grid card, detail modal, table, search, empty) | C2 photo-forward avatars · C3 table scroll · C4 responsive search · C5 EmptyState | PASS | baseline · axe · network-parity (avatar size deltas to eyeball) |
| **E** | `me/dashboard`, `dashboard`, `me/leaves`, `me/payslips`, `me/profile` | 375px divider + grid-cols `sm:` fixes | PASS | screenshot @375/640/768 |
| **D5** | `leave/my-leaves` | DIY empty → `EmptyState` (loading spinner left untouched = deferred D3) | PASS | screenshot empty state |
| **F1** | `dashboard` (operator) | extract `LiveGreeting` — kill page-wide 1-sec re-render | PASS | confirmatory screenshot (visual parity guaranteed by char-identical JSX) |

## Deferred scopes (documented trade-offs)

### Epic F — Dashboard decomposition (F1 DONE; F2–F5 DEFERRED — need runtime)
F is the highest-risk **operator** screen: strict query-safety (no query-key/cache/poll/invalidation
drift), 3 role-based `Array.push` widget-visibility predicates that must be preserved verbatim.

- **F1 — DONE** (committed): extracted `<LiveGreeting/>` (`dashboard/_components/LiveGreeting.tsx`).
  `currentTime` was verified confined to the greeting (refs only at old 127/561/563), so the moved JSX
  + logic are char-identical → **visual parity guaranteed by construction**; only the re-render scope
  changed (per-second tick now re-renders the ~10-line greeting, not the 1500-line page). No widget,
  predicate, query, mutation, or RBAC gate touched. Confirmatory screenshot still owed (low risk).
- **F2** (split into 6 section files), **F3** (memoize widgets/handlers), **F4** (preserve the 3 role
  predicates + add RBAC test — needs the F2 extraction to be testable), **F5** (wrap Google `fetch` in
  `useQuery` = BEHAVIORAL/query change) — **DEFERRED.** These move the `dashboardWidgets` array and
  role predicates; their own rollback rule requires **section-by-section parity verification (visual +
  role-matrix)**, impossible without a browser. Doing them blind risks CRITICAL query/role drift.
  Resume when the Chrome extension is connected. Discovery scope: read-only workflow F-agent result.

### Epic D — State hygiene (export map VERIFIED; D5 partial done; D1/D3/D4 DEFERRED)
Export-map verification (the deferred check) is **done**:
- `components/ui/Skeleton.tsx` **does** export `SkeletonDashboard`, `SkeletonEmployeeCard`,
  `SkeletonForm`, `SkeletonTable`, `SkeletonStatCard`, etc. (defined without inline `export`, exported
  via the block at `Skeleton.tsx:329` — the earlier `grep export.*Skeleton` missed them). The agent's
  preset premise was therefore **correct**.
- `components/ui/Loading.tsx` **also** exports `Skeleton`, `SkeletonTable`, `SkeletonStatCard`,
  `SkeletonChart`, `SkeletonCard` → genuine **duplicate symbols** across the two files (D4 is real).
- **~22 employee `loading.tsx` files import Mantine `Skeleton`** (`@mantine/core`). Mantine's API is
  `height`/`width`/`radius` **props**; the canonical `Skeleton` is **`className`-only**. So D1 is **not
  an import swap** — it's a geometry-sensitive prop→className rewrite per file (or a full-body replace
  with a preset whose geometry must match the page). **Unsafe to do blind across 22 files** under the
  0-visual-regression budget; these are transient loading flashes (low value). **Deferred for screenshots.**
- **D3** (remove inline page-level spinners, e.g. `leave/my-leaves:166-174`) is behaviorally nuanced
  (refetch feedback) → **deferred**, treat as potential BEHAVIORAL.
- **D4** (merge `Skeleton.tsx`+`Loading.tsx` duplicates) touches 20+ importers → **deferred** (broad).

**D5 — partial DONE:** `leave/my-leaves` DIY empty → `EmptyState` (committed). Other candidates
**verified and rejected**: `leave/calendar:218` is an **error** state (not empty); `leave/page.tsx`
empties are tiny inline messages (full EmptyState would over-weight); `leave/approvals` is an
operator/approver screen (out of employee-facing scope). Net safe D5 surface = 1 file.

## B2 deferrals (NOT done — documented trade-offs)
- **`me/profile` hero** — already photo-forward (next/image 128px avatar + status dot) and uses a
  **divergent token family** (`--surface`/`--text-1`) vs ProfileHero's Studio-Slate tokens.
  Full ProfileHero adoption risks an unvalidated token clash → deferred pending baseline +
  token reconciliation. Marginal modernization value; not worth unverified regression risk.
- **`employees/directory` grid card + detail-modal avatars** (band + overlapping-avatar
  compositions) — size-sensitive decorative layouts; their proper home is **Epic C**
  ("photo-forward elevation card" / People Hub), where the whole card is redesigned. Folding
  them here would be throwaway work undone by C.
