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

## Deferred scopes (documented trade-offs)

### Epic F — Dashboard decomposition (DEFERRED — needs runtime)
F is the highest-risk **operator** screen: strict query-safety (no query-key/cache/poll/invalidation
drift), 3 role-based `Array.push` widget-visibility predicates that must be preserved verbatim, and a
`LiveGreeting` 1-sec re-render to extract. Its own rollback rule requires **section-by-section parity
verification (visual + role-matrix)** before the original `page.tsx` is replaced — that verification
is **impossible without a runtime/browser session**. Decomposing it blind would risk silent
query-behavior or role-visibility drift (a CRITICAL per the severity rubric). **Deferred to a session
with browser access.** Discovery scope captured by the read-only workflow (F-agent result).

### Epic D — State hygiene (DEFERRED — premise unverified)
The discovery agent's core premise (skeleton presets `SkeletonDashboard`/`SkeletonTable`/
`SkeletonEmployeeCard` live in `@/components/ui/Skeleton`) **did not survive first source check** —
`grep 'export (function|const) Skeleton' components/ui/Skeleton.tsx` returned nothing, so the proposed
`import {SkeletonX} from '@/components/ui/Skeleton'` swaps (D1) are not trustworthy as-scoped.
Additionally **D3** (remove inline page-level spinners) is behaviorally nuanced — removing feedback
shown during client refetch would be a behavioral change, not presentation — and **D4** (merge
`Skeleton.tsx` + `Loading.tsx`) touches **20+ importers** (broad blast radius, unsafe without runtime
verification). **Deferred pending an export-map verification pass**; only then can the safe D1 subset
proceed. Do NOT apply the agent's D1 swaps verbatim.

## B2 deferrals (NOT done — documented trade-offs)
- **`me/profile` hero** — already photo-forward (next/image 128px avatar + status dot) and uses a
  **divergent token family** (`--surface`/`--text-1`) vs ProfileHero's Studio-Slate tokens.
  Full ProfileHero adoption risks an unvalidated token clash → deferred pending baseline +
  token reconciliation. Marginal modernization value; not worth unverified regression risk.
- **`employees/directory` grid card + detail-modal avatars** (band + overlapping-avatar
  compositions) — size-sensitive decorative layouts; their proper home is **Epic C**
  ("photo-forward elevation card" / People Hub), where the whole card is redesigned. Folding
  them here would be throwaway work undone by C.
