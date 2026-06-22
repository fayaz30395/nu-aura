# CODEX-REVIEW — Scope B2: Identity-layer adoption (directory surfaces)

**Scope:** Adopt the shared photo-forward `Avatar` / `ProfileIdentity` primitives into the two
employee-facing directory surfaces. **Change class: PRESENTATION + EXTRACTION only.**
**Posture:** static-gated + flagged runtime debt (browser session unreachable this session — see
[`RUNTIME-DEBT.md`](./RUNTIME-DEBT.md)).

## 1. Per-file classification (Visual / Structural only)

| File | Class | Edit |
|------|-------|------|
| `app/team-directory/page.tsx` | PRESENTATION | list-view + grid-view bespoke initials boxes → `<Avatar>` (md / lg); `Avatar` import added |
| `app/employees/directory/page.tsx` | PRESENTATION/EXTRACTION | table-row avatar+name+code cell → `<ProfileIdentity size="sm">`; `ProfileIdentity` import added |

No Behavioral or Backend-impacting edits. Diffstat: **2 files, +18 / −27**.

## 2. Diff rationale — decision matrix (CSS → tokens → composition → reuse → new)
Landed at **Existing-component reuse**: both surfaces hand-rolled an avatar (initials + tint) that
the Phase-0 `Avatar`/`ProfileIdentity` primitives already own. No new component, no new CSS, no
token changes. Inline markup replaced by the shared primitive 1:1.

## 3. Feature-parity evidence
- **team-directory:** the swapped nodes are leaf avatar blocks inside `EmployeeCard`. The card
  `onClick={() => onClick(employee.id)}` → `router.push('/employees/${id}')`, the name/designation,
  department, email/phone links, view-mode toggle, search, department filter, and pagination are
  **untouched**. Avatar now also renders `employee.profilePhotoUrl` when present (was initials-only).
- **employees/directory:** only the `<td>` identity cell changed. Row `onClick` (opens detail
  modal), `useQuery` search, filters, sort, pagination, and the grid/modal renders are **untouched**.
  `getInitials` / `getRandomColor` imports retained (still used by grid card + detail modal).
- Data bindings identical: same `fullName`, `employeeCode`, plus newly-surfaced `profileImageUrl`
  (local type field) / `profilePhotoUrl` (shared type field) as the optional photo.

## 4. RBAC proof
No permission gate, `usePermissions`/`useAuth` call, role predicate, or conditional render was added,
removed, or moved. Neither file gates the swapped nodes. RBAC spine re-run: **156/156 green**
(usePermissions 87 · PermissionGate 35 · AuthGuard 25 · ProfileHero 9). Cite `05-RBAC` matrix —
directory visibility unchanged.

## 5. Query-safety proof
Zero data-flow change. No query key added/removed/renamed; no caching, polling, or invalidation
touched. `useEmployees`/`useEmployeeSearch` (team-directory) and the `useQuery` search
(employees/directory) are byte-identical. Avatar/ProfileIdentity are pure presentational (no fetch).

## 6. Performance (before / after)
- **Deps:** no new runtime dependency. `Avatar`/`ProfileIdentity` already bundled (foundation +
  `employees/[id]` consumers) → no new chunk.
- **Markup:** net reduction (−27 / +18). No new network request, no new query.
- **Build:** `next build --webpack` ✓ Compiled successfully in 90s. (Per-route gz table not emitted
  by the non-TTY `--webpack` build; impact is reuse-of-bundled-component → within the ≤+5% budget by
  construction.)
- Expected CWV: neutral; `<img>` avatars are lazy by default and unchanged in count.

## 7. Baseline Before/After/Delta
**Before:** square/rounded accent-tinted initials boxes (team-directory rounded-lg/xl;
employees/directory `getRandomColor` circle). **After:** shared circular photo-forward `Avatar`
(photo when `profilePhotoUrl`/`profileImageUrl` present; deterministic name-hashed tint fallback).
**Delta (intended altitude shift, not a regression):** square→circle, accent/random→hashed-hue,
initials-only→photo-capable. Sizes: team list 48→48 (md), team grid 80→72 (lg), directory table
40→32 (sm, density-preserving). **Screenshot baseline DEFERRED** — browser session unreachable;
tracked in `RUNTIME-DEBT.md`. No baseline captured ⇒ visual-regression check is **open debt**, not
claimed PASS.

## 8. Validation results
`tsc --noEmit` clean · `eslint --max-warnings=0` clean (both files) · vitest RBAC+ProfileHero
156/156 · `next build` exit 0. Runtime (axe / network-parity / screenshot-diff / CWV) deferred.

## 9. Risk & rollback
**Risk: LOW.** Leaf presentational swaps; no gates/queries/handlers touched. Residual risk is purely
visual (avatar shape/size/hue), unvalidated by screenshot this session. **Rollback:** `git revert`
the B2 commit, or per-file restore — the shared primitives stay (used elsewhere), only the two call
sites revert to inline markup.

## Verdict requested
PASS-with-debt: all static gates green; sole open item is the deferred runtime/visual evidence,
which is a session-environment limitation (no browser), not a code defect.
