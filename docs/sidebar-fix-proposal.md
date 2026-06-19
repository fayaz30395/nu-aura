# Sidebar Active State Fix Proposal

Phase 4 — Root cause documented; fix implemented in commit `3078dce2`.

---

## Problem Statement

Sidebar active highlighting was broken for all NU-Grow and NU-Fluence pages, and silent for
some NU-Hire sub-pages. Users had no visual indication of their current location in those apps.

---

## Root Cause Analysis

### Cause A — Missing `PATH_TO_MENU_ID` entries (affects Grow + Fluence)

`autoActiveMenuId` in `AppLayout.tsx` uses a static map `PATH_TO_MENU_ID` to derive which
sidebar item should be highlighted from the current pathname. This map had zero entries for:
- Any `/performance/*` route
- Any `/fluence/*` route
- Any `/okr`, `/learning`, `/training`, `/surveys`, `/wellness`, `/recognition`, `/one-on-one` route

When no entry matched, the code fell back to `bestId = 'dashboard'`. Since 'dashboard' is an
HRMS item that doesn't exist in the Grow or Fluence sidebar sections, nothing was highlighted.

### Cause B — Stale `activeMenuItem` overrides (affects Grow pages)

Pages written before the hub-suffix naming convention (when sidebar items gained `-grow` / `-hire`
suffixes) pass explicit `activeMenuItem` props with the old bare IDs:

| Page passes | Sidebar item ID is | Result |
|---|---|---|
| `activeMenuItem="performance"` | `'performance-grow'` | No match → nothing highlighted |
| `activeMenuItem="learning"` | `'learning-grow'` | No match → nothing highlighted |
| `activeMenuItem="surveys"` | `'surveys-grow'` | No match → nothing highlighted |
| … | … | … |

This affects ~30 pages across Grow modules. Updating every page file would be fragile
(each must be found, read, and edited individually, with high risk of missing one).

---

## Fix Applied (commit `3078dce2`)

### Change 1 — Extend `PATH_TO_MENU_ID` (AppLayout.tsx)

Added entries for every NU-Hire, NU-Grow, and NU-Fluence route. More-specific paths
are listed before their parents so the longest-prefix match algorithm picks the right item:

```
// NU-Grow
'/performance/competency-matrix': 'competency-matrix-grow',
'/performance/okr':               'okr-grow',
'/performance/revolution':        'performance-revolution-grow',
'/performance':                   'performance-grow',
'/okr':                           'okr-grow',
'/one-on-one':                    'one-on-one-grow',
'/training':                      'training-grow',
'/learning':                      'learning-grow',
// ... etc.

// NU-Fluence
'/fluence/analytics':             'fluence-analytics',
'/fluence/wiki':                  'fluence-wiki',
// ... etc.
```

**Why this is safe:** The map is static (no runtime cost), keyed by path string, and the
existing prefix-match loop already handles sub-routes (e.g. `/fluence/wiki/[slug]`).

### Change 2 — Module-level `LEGACY_ID_REMAP`

Added a module-level constant that translates legacy bare IDs to their current hub-suffixed
equivalents:

```typescript
const LEGACY_ID_REMAP: Record<string, string> = {
  'performance': 'performance-grow',
  'learning':    'learning-grow',
  'training':    'training-grow',
  'surveys':     'surveys-grow',
  'wellness':    'wellness-grow',
  'recognition': 'recognition-grow',
  'one-on-one':  'one-on-one-grow',
  'okr':         'okr-grow',
  'onboarding':  'onboarding-hire',
};
```

Applied in `resolvedActiveMenuItem`:

```typescript
const resolvedActiveMenuItem = useMemo(() => {
  const raw = activeMenuItem ?? autoActiveMenuId;
  return LEGACY_ID_REMAP[raw] ?? raw;
}, [activeMenuItem, autoActiveMenuId]);
```

This intercepts both the auto-derived ID and any explicit `activeMenuItem` override passed
by individual page files, remapping them transparently. No page files need editing.

**Why not edit 30 page files instead?**
- Risk of missing a file
- Each edit is mechanical with no semantic value
- The remap approach is self-documenting and forward-compatible

### Change 3 — Default `bestId` from `'dashboard'` → `'my-dashboard'`

The fallback when no route matches now returns `'my-dashboard'` (a real item in the HRMS
sidebar) instead of `'dashboard'` (which requires `DASHBOARD_VIEW` permission and is absent
for most roles). This means auth/error redirects don't leave every sidebar item un-highlighted.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A route that should show no highlight now shows one | Low | Low | All Grow/Fluence routes in the map have correct targets; HRMS routes unchanged |
| A future route added without a PATH_TO_MENU_ID entry | Medium | Low | Falls back to `'my-dashboard'` (better than `'dashboard'`) |
| LEGACY_ID_REMAP creates wrong mapping for a future item named e.g. `'wellness'` in HRMS | Very low | Medium | Item IDs in menuSections must remain unique; adding a same-name HRMS item would be a separate naming bug |
| TypeScript regression | None | — | `pnpm tsc --noEmit` passes with zero errors |

---

## Outstanding Issue — INC-04 (Duplicate Home link)

The HRMS "Home" item (`id: 'home'`, `href: '/me/dashboard'`) duplicates "My Dashboard"
(`id: 'my-dashboard'`, same href). Only "My Dashboard" is ever highlighted.

**Recommendation:** Remove the "Home" item from the HRMS sidebar `home` section in
`menuSections.tsx`. It provides no unique destination and creates confusing double-entry.
Deferred — low impact, no user confusion reported.
