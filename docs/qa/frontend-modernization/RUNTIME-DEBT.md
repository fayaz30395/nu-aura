# Runtime-Gate Verification Debt Ledger

> The program's runtime gates (screenshot baseline 375/768/1440 · light/dark · axe a11y ·
> network-parity capture · CWV) require a **live demo-EMPLOYEE session on the HTTPS Vercel FE**
> driven via browser MCP. When that session is unreachable, screen work proceeds under the
> **static-gated + flagged-debt** posture (user-approved 2026-06-23): full static chain
> (`build` · `tsc` · `vitest` · RBAC · `eslint`) is enforced per screen; runtime evidence is
> deferred and tracked here until the browser session is available.

## Why runtime is currently unreachable
**UPDATE 2026-06-23 (Chrome connected, login attempted):** The Chrome extension is now connected, but
the **live demo login is BROKEN** — verification is still unreachable, for a new reason:

- Demo quick-login (`Arun K · EMPLOYEE`, the canonical demo employee) → backend returns **403**.
  Network shows exactly ONE backend call: `POST https://nu-aura-backend-production.up.railway.app/auth/login`
  → **403**, with **no preceding CSRF-token GET**. Console: `[ApiClient] Error: POST /auth/login 403`.
  UI banner: **"Authentication Failed — CSRF token validation failed."** Reproduced across a fresh hard
  reload + multiple attempts → systematic, not a race.
- **Root cause (frontend/deployment, P4 — outside this presentation program's scope, and unfixable from
  the browser):** the demo-login flow POSTs without establishing the CSRF double-submit cookie/header
  first (cross-origin Vercel FE → Railway BE; the `XSRF-TOKEN` is never fetched/sent). This blocks the
  EMPLOYEE session entirely. Cannot work around it: entering passwords is prohibited; bypassing CSRF is
  off-limits; logging in as another role (e.g. the `Fayaz M · SUPER ADMIN` demo) violates the AUTH
  BINDING + the PROD-session hazard.
- **Compounding:** Vercel deploys are CLI-only (not git-auto) — the live FE is very likely STALE and does
  NOT yet include this session's commits (B2/C/E/D5/F1). So even if login worked, baselines would reflect
  an OLD frontend, not the modernized screens.

**CSRF login fix — LANDED IN CODE (pending deploy + re-verify).** Root cause was NOT cross-origin
cookies but a **path-prefix bug**: the live `NEXT_PUBLIC_API_URL` is the bare Railway origin (no
`/api/v1`), so the hand-written `/auth/login` resolved to `<origin>/auth/login` instead of the
CSRF-exempt `/api/v1/auth/login` → backend 403. Fixed in `lib/config/env.ts` by normalizing
`apiConfig.baseUrl` to always end with `/api/v1` (idempotent; WS/generated paths provably unaffected).
Full diagnosis + regression matrix: [`CODEX-REVIEW-CSRF-login-fix.md`](./CODEX-REVIEW-CSRF-login-fix.md).
Gates green (tsc/eslint/env 9-9/RBAC/build).

**CSRF FIX — DEPLOYED + VERIFIED LIVE (2026-06-23).** Vercel prod deploy completed; demo `Arun K ·
EMPLOYEE` quick-login now does `POST /api/v1/auth/login` → **200** (same-origin via the Next proxy)
and lands on `/me/dashboard`. The 403 blocker is RESOLVED. Console clean (only stale pre-fix 403s).

### Runtime verification results (live, demo EMPLOYEE, real data)
- **VERIFIED rendering correctly, no console errors, no regressions:** `me/dashboard` (E stat grid),
  `me/leaves` (E balance grid, 4-col desktop), `me/payslips` (E grid), `me/profile` (E contact grid +
  the correctly-deferred hero), `leave/my-leaves` (**D5 EmptyState — exact: CalendarOff + "No leave
  requests found" + working "Apply for Leave" action**).
- **VERIFIED via scoped read-only MANAGER session (Sumit Kumar, user-authorized for completion; no
  mutating actions taken):**
  - **B2** — team-directory grid cards show circular photo-forward `Avatar` (lg, name-hashed tints);
    employees/directory table rows show `ProfileIdentity` (sm avatar + name + EMP-code). ✓
  - **C2/C3/C4** — employees/directory grid cards show `Avatar` (lg, ring) on the gradient band; the
    `flex flex-col sm:flex-row` search renders inline at desktop; the table renders cleanly in the
    `overflow-x-auto` wrapper. ✓
  - **F1** — operator `/dashboard` renders `<LiveGreeting/>` correctly ("Good afternoon, Sumit." + date
    line), KPI cards render, no crash/hydration error. ✓ (The "Analytics could not be loaded" banner +
    `onboarding…403` are pre-existing RBAC/data limits for MANAGER, gracefully handled — not regressions.)
  - **F2** (modals extraction, `page.tsx` 1481→1174) — **deployed + verified**: operator `/dashboard`
    renders byte-identically post-extraction (LiveGreeting, KPI, charts, widget grid all present); no new
    console errors. F3/F4/F5 + the further widgets/render-section split (to reach <500) deliberately NOT
    pursued — high regression risk on the critical operator screen for internal-only value.
- **TOOLING LIMIT:** the browser extension captures at a fixed ~1564px viewport regardless of window
  resize, so true 375px screenshots aren't obtainable here → E responsive fixes are static +
  desktop-no-regression verified (the `sm:`/`divide-y` classes are unambiguous and build-green).

### Prior-session reason (historical)
- Claude Chrome extension was not connected; local BE down + local HTTP can't hold `Secure` cookies.

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
