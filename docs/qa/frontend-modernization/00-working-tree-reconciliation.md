# 00 — Working-Tree Reconciliation

**Program:** NU-AURA Frontend Modernization — Studio Slate Elevation Layer
**Phase:** Step 1 (Workflow A.0) — reconcile pre-existing uncommitted work
**Branch:** `main`
**Verified counts (supersede prior estimates):** 289 `page.tsx` · 315 route segments · 46 `components/ui/*.tsx`
**App state at audit:** local dev `:3000` / `:8080` were DOWN at session start (frontend dev server started during this step).

---

## Verdict

All uncommitted changes are a coherent **Phase-0 Elevation-Layer consolidation**: a shared photo-forward
`Avatar`, a unified `ProfileHero`, an **inert** `altitude` opt-in on `AppLayout`, and a new additive
`--elv-*` token namespace. **Recommendation for every item: KEEP / Fold-into-plan.** Nothing to revert.

**RBAC HARD-CHECK: PASS.** The two RBAC-sensitive surfaces (`compensation/page.tsx`, `AppLayout.tsx`)
changed presentation only — no gate, permission check, conditional render, query, or data transform moved.

---

## Per-file reconciliation

| File | Status | Change-class | Recommendation | Evidence |
|------|--------|--------------|----------------|----------|
| `components/ui/Avatar.tsx` | new (`??`) | PRESENTATION | Keep | shared photo-forward avatar; supersedes file-local avatar helpers |
| `components/ui/ProfileHero.tsx` | new (`??`) | PRESENTATION | Keep | unified employee identity hero (`ProfileHero` + `ProfileIdentity`) |
| `components/ui/ProfileHero.test.tsx` | new (`??`) | test | Keep | unit test for ProfileHero |
| `components/ui/index.ts` | mod | PRESENTATION | Keep | `index.ts:31-40` additive barrel exports only (Avatar, ProfileHero) |
| `app/globals.css` | mod | PRESENTATION | Keep | `globals.css:352-409` additive `--elv-*` namespace, inert (see below) |
| `components/layout/AppLayout.tsx` | mod | PRESENTATION | Keep | additive `altitude?: 'elevated'` prop only (see RBAC check) |
| `app/employees/[id]/page.tsx` | mod | EXTRACTION | Fold-into-plan | hero markup → `<ProfileHero>`; **PermissionGates preserved** (see RBAC check) |
| `app/employees/[id]/edit/page.tsx` | mod | EXTRACTION | Fold-into-plan | `edit/page.tsx:415-423` inline header → `<ProfileHero>`, same `employee` data |
| `app/employees/[id]/compensation/page.tsx` | mod | EXTRACTION | Fold-into-plan | header → `<ProfileHero>`, same modal handler + hooks |
| `.obsidian/core-plugins.json` | mod | unrelated | Keep | editor config, out of program scope |

---

## RBAC HARD-CHECK (evidence)

### `AppLayout.tsx` — PASS (purely additive, 9 insertions / 0 deletions)
- `AppLayout.tsx:61-67` — new optional prop `altitude?: 'elevated'`, documented as **inert until a
  descendant consumes `--elv-*`**.
- `AppLayout.tsx:598` — `<main … data-altitude={altitude}>`; the immediately-following comment
  *"Auth is evaluated once by the AuthGuard in app/providers.tsx"* is **unchanged**.
- No change to sidebar role-priority logic, menu filtering, or any auth/permission code. Confidence: **High**.

### `compensation/page.tsx` — PASS
- Diff replaces the inline back-button + page-header block with `<ProfileHero …>` passing the same
  `employee` fields and the same `setIsRevisionModalOpen(true)` action.
- `useEmployee`, `useCreateRevision`, `useEmployeeRevisionHistory` hooks **untouched**; no query-key,
  fetch, or gating change. Confidence: **High**.

### `employees/[id]/page.tsx` — PASS (most important)
- The action cluster moved into `ProfileHero`'s `actions` slot **with its gates intact**:
  `<PermissionGate permission={Permissions.EMPLOYEE_UPDATE}>` (Edit) and the Delete `PermissionGate`
  are preserved verbatim (`page.tsx` actions slot). `usePermissions` / `useAuth` imports unchanged.
- Net effect: ~136 lines of bespoke hero/quick-info markup collapsed into the shared component;
  data bindings and permission gating identical. Confidence: **High**.

---

## Token namespace note (feeds Step 4)

`globals.css:352-409` defines `[data-altitude="elevated"]` with a **new `--elv-*` namespace** that does
**not remap any existing Studio Slate token** — so it is verifiably inert (zero visual change) until a
component reads a `--elv-*` var. Dark variant under `.dark [data-altitude="elevated"]`. Accent `#2952A3`
unchanged. This is the single owner of elevation tokens and the anchor for the Step-4 token-source doc.

---

## Carry-forward into the plan

1. The Phase-0 components (`Avatar`, `ProfileHero`) are the **foundation** of the Elevation Layer — the
   plan builds on them, does not re-derive them.
2. `employees/[id]/page.tsx`, `edit`, `compensation` are **already migrated** to `ProfileHero`; they need
   runtime verification (network-parity + axe + screenshot-diff) once an employee session is reachable,
   not re-implementation.
3. Open dependency: **no verified employee session yet** (app was down). Baseline (Step 3) and all
   per-screen Success-Criteria gates are blocked until a low-privilege employee login is confirmed
   (local dev → backend, or live deployment). Reported, not worked around.

---

## Addendum (2026-06-22, later) — SI-2 + employee session resolved

Two updates land after the original reconciliation above:

### New file in scope: `app/employees/_components/ProfileSheet.tsx` (SI-2)
| File | Status | Change-class | Recommendation | Evidence |
|------|--------|--------------|----------------|----------|
| `app/employees/_components/ProfileSheet.tsx` | mod | EXTRACTION | Keep / Fold-into-plan | drawer header → `<ProfileHero variant="compact" headingLevel="h2">` |

**RBAC HARD-CHECK — PASS.** The bespoke drawer `<header>` (avatar + name + designation + status +
badges + action row) was replaced by `<ProfileHero variant="compact">`. The name-tint gradient is
preserved verbatim as the `topBand` slot. The action cluster (Message / Edit / More) is moved into the
`actions` slot **byte-identical** — same `window.nuToast` calls, same `onEdit()` / `onViewFull`
handlers, same `onEdit ? … : null` / `onViewFull ? … : null` conditionals (caller-controlled, not a
permission gate). `EmployeeAvatar` import retained (still used at `ProfileSheet.tsx:171` for managerName).
No query/data/gating change. Confidence: **High**.

### `next-env.d.ts` — auto-generated, EXCLUDE from commits
Next.js 16 regenerated the routes-types path (`.next/types` → `.next/dev/types`). Not a program change;
will be left unstaged.

### Employee session — RESOLVED (program precondition met)
A reproducible low-privilege employee session is now verified: **`arun@nulogic.io` / `Welcome@123`**
(roles `["EMPLOYEE"]`) on the HTTPS live FE. Step 3 baseline + per-screen runtime gates are **unblocked**.
Full details: [`auth-inventory.md`](./auth-inventory.md) · program brief: [`PROGRAM.md`](./PROGRAM.md).

### Static gates on the full working tree (SI-1 + SI-2 + migrated pages)
`npx tsc --noEmit` clean · `ProfileHero.test.tsx` 9/9 · RBAC spine (usePermissions ×2, PermissionGate,
AuthGuard) 147/147 · eslint `--max-warnings=0` clean on all touched files. Runtime gates
(network-parity, axe, screenshot-diff) pending the browser-MCP baseline pass.
