# Phase 3 — Screen Strategies (Current → Proposed → Outcome)

All strategies are **presentation-only**. Every RBAC gate, hook, API call, and role branch is preserved verbatim (see `08-rbac-impact-report.md`).

## 5.1 Employee Directory — Card-Grid as first-class peer
**Current:** `app/employees/directory/page.tsx` (885). Grid default but toggle is `useState` (not persisted/URL-synced); `profileImageUrl` never rendered (initials only); list table inside Card `overflow-hidden` clips at 375px; search bar `flex gap-4` no-wrap; DIY empty state (l.726).
**Proposed:**
- Promote Card-Grid to a **first-class, persisted view**: `?view=grid|table` URL param + `localStorage` persistence; default `grid` for employee role, `table` retained for power users. Both views fully preserved — no feature loss.
- **Photo-forward card** (elevation scope): render `profileImageUrl` via `next/image` with shared `Avatar` initials fallback; avatar (ring) · name · role · dept · status pill · quick actions (mail/call). Warm raised surface, `--elv-r-lg`, `--elv-shadow-subtle`, hover lift via `--elv-hover`.
- Fix table: remove `overflow-hidden` / wrap in `.table-shell` (`overflow-x-auto`) so it scrolls at 375px.
- Search bar: `flex-wrap` + stack `< 640`.
- Replace DIY empty with `EmptyState` + `EmptyStatePresets.noEmployees`.
**Outcome:** scannable, photo-forward directory; mobile-safe; shareable/persisted view; no feature loss. (Reconciling the second `team-directory` variant onto shared components is a follow-up, not gated here.)

## 5.2 Employee Profile — unified `ProfileHero`
**Current:** 3 hand-rolled heroes (view rich / edit initials-only / compensation text-only); 6 local avatar fns; files 1244 / 1261 / 545 lines.
**Proposed:**
- New **`components/ui/ProfileHero.tsx`** (`variant="banner"`): props `photo`, `name`, `designation`, `department`, `status`, `employeeCode`, `metrics` slot, `actions` slot. Warm `--elv-surface-highlight` band, `--elv-avatar-xl` with ring, generous radius.
- Wire all three: **View** (full hero + Edit/Delete actions, gates preserved) · **Edit** (same hero — now WITH photo + status, currently missing — + back nav) · **Compensation** (same hero + comp summary metrics: Current CTC / Total Revisions / Applied + New Revision action).
- New **`components/ui/Avatar.tsx`**: photo + `sm/md/lg/xl` + name-hash fallback; supersedes file-local `AvatarInitials` and (incrementally) the 6 local avatar fns.
**Outcome:** one hero, photo on all three screens, consistent identity; ~150 lines pulled out of each monolith into shared. RBAC unchanged (Edit/Delete/Bank gates intact). Compensation gate gap = separate RBAC fix, not touched here.

## 5.3 Loading — skeletons + stable placeholders, no jump
**Current:** 291 `loading.tsx` (full coverage) but **two skeleton identities** (Mantine 270× vs custom inline); double-flash route-skeleton→spinner on `me/leaves`/`me/profile`/`leave/my-leaves`; skeleton dims mismatch real content (`me/attendance` calendar, `me/dashboard` stat strip); duplicate skeleton symbols.
**Proposed:**
- Standardize employee routes on **one source** — `@/components/ui/Skeleton` (`skeleton-aura` shimmer). Migrate employee `loading.tsx` off raw Mantine first; broader 271-file migration is a follow-up.
- **Match skeleton geometry to content**: attendance loader mirrors the 7-col calendar grid; `me/dashboard` loader mirrors the `grid-cols-2 sm:grid-cols-4` strip.
- **Kill the double-flash**: where a page has both `loading.tsx` and an inline `isLoading` spinner, drop the spinner and rely on the route skeleton (or render the same skeleton inline) — never a spinner after a skeleton.
- De-dupe `SkeletonStatCard`/`SkeletonCard`/`SkeletonTable` to a single definition.
**Outcome:** one skeletal identity; CLS reduced; no flash between two loaders.

## 5.4 Empty — friendly, informative, action-oriented
**Current:** `EmptyState` (349 uses) is strong but ~30–40% of employee screens are DIY or bare `<p>` (no icon, no `role=status`).
**Proposed:** replace DIY employee empties (`directory`, `me/leaves`, `me/attendance`, `me/documents`, `shift-swap`) with `EmptyState` (`size="compact"` inline) + presets; every empty gets icon + message + (where applicable) action CTA + a11y `role=status`.
**Outcome:** consistent, accessible, action-oriented empties across employee surfaces.

## 5.5 Responsive — per breakpoint
**375px (primary risk):**
| Risk | Fix | Acceptance |
|---|---|---|
| Directory search bar no-wrap | `flex-wrap` + stack `<640` | no overflow; input ≥ 200px |
| Directory list table clips | remove Card `overflow-hidden` / `.table-shell` | table scrolls, not clipped |
| Attendance check-in `row-between` | `flex-col sm:flex-row` | buttons stack, ≥44px targets |
| `grid-cols-2` form sections (profile, leave modal) | `grid-cols-1 sm:grid-cols-2` | single col on mobile |
| Dashboard `divide-x` on wrapped 2-col | per-row borders / gap | no orphan separators |

**768px:** verify payslips `md:grid-cols-4` not cramped (consider `md:grid-cols-2 lg:grid-cols-4`); directory grid cols sane. **1440px:** max-width containment already via `--layout-max-width` — low risk.
**Global acceptance:** no horizontal overflow at any of 375/768/1440; all interactive ≥44px; every multi-column collapses to single below 768; tables scroll rather than clip; validated light + dark + keyboard + screen-reader landmarks.
