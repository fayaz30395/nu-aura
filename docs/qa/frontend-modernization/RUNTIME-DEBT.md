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
| **B2** | `employees/directory` (table row) | identity cell → `ProfileIdentity` | _pending this scope_ | baseline · axe · network-parity |

## B2 deferrals (NOT done this scope — documented trade-offs)
- **`me/profile` hero** — already photo-forward (next/image 128px avatar + status dot) and uses a
  **divergent token family** (`--surface`/`--text-1`) vs ProfileHero's Studio-Slate tokens.
  Full ProfileHero adoption risks an unvalidated token clash → deferred pending baseline +
  token reconciliation. Marginal modernization value; not worth unverified regression risk.
- **`employees/directory` grid card + detail-modal avatars** (band + overlapping-avatar
  compositions) — size-sensitive decorative layouts; their proper home is **Epic C**
  ("photo-forward elevation card" / People Hub), where the whole card is redesigned. Folding
  them here would be throwaway work undone by C.
