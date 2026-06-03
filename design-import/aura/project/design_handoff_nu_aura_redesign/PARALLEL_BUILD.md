# PARALLEL_BUILD.md — Building NU-AURA with parallel Claude Code subagents

This redesign is deliberately structured so a **lead agent + many worker subagents** can build it concurrently with minimal merge conflicts. The trick is a **frozen foundation contract**: lock the tokens, the primitive component API, and the shell *first*, then fan out — every page is an island that only consumes the contract, never edits it.

```
                ┌─────────────────────────────────────────────┐
   PHASE 0      │  LEAD: scaffold + freeze the contract        │   (serial — blocks everything)
   foundation   │  tokens · primitives API · shell · data types │
                └───────────────┬─────────────────────────────┘
                                │  contract frozen, published
        ┌──────────┬───────────┼───────────┬──────────┬──────────┐
PHASE 1 │ agent A  │ agent B   │ agent C   │ agent D  │ agent E  │  … 10 page agents in parallel
pages   │ Dashboard│ Employees │ Approvals │ Att/Leave│ Payroll  │
        │ agent F  │ agent G   │ agent H   │ agent I  │ agent J  │
        │ Assets   │ Benefits  │ Reports   │ Settings │ Login    │
        └──────────┴───────────┴───────────┴──────────┴──────────┘
                                │  all routes merged
                ┌───────────────┴─────────────────────────────┐
   PHASE 2      │  LEAD + 2 agents: integration · a11y · QA    │   (serial-ish)
                └─────────────────────────────────────────────┘
```

---

## Phase 0 — Foundation (LEAD agent, serial, ~must finish before Phase 1)

One agent owns this. **Nothing else starts until it's merged and the contract is published**, because every page imports it. Keep this phase small and fast.

1. **Scaffold** the app in the target stack (Next.js 14 app-router + React + Mantine + Tailwind, matching `fayaz30395/nu-aura`). Set up routing for all 10 routes as empty placeholders.
2. **Port tokens** from `design/app/tokens.css` → theme layer (CSS variables + Tailwind theme extension + Mantine theme). Implement the `data-theme="dark"` switch with full parity. **These token names are the contract — freeze them.**
3. **Build the primitive library** (`/components/ui/`) with the exact public API used in the prototype (`design/app/Primitives.jsx`):
   `Button`, `IconButton`, `Avatar`, `Badge`, `StatusBadge`, `Card`, `SectionHead`, `Stat`, `Field`, `Switch`, `Segmented`, `Check`, `Tabs`, `AvatarStack` — plus charts from `design/app/Charts.jsx`: `Sparkline`, `AreaChart`, `Donut`, `BarsH`, `Ring`. **Freeze these prop signatures.**
4. **Build the shell** (`design/app/Shell.jsx`): product rail, nav panel, top bar, command palette, theme toggle, layout. Expose a layout slot + a `useCommandPalette` hook and a nav registry.
5. **Define the data contract** as typed models from `design/app/data.js` (Employee, Approval, AttendanceRow, LeaveBalance, PayrollRun, Asset, BenefitPlan, Report, Role, Integration). Ship mock fixtures + a thin data-access layer so page agents code against a stable shape (swap to real APIs later).
6. **Publish** a short `CONTRACT.md` (token names, component props, model types, file-ownership map). This is the only doc the page agents need to avoid stepping on each other.

**Definition of done:** shell renders, theme toggles, every primitive has a Storybook/example entry, all routes resolve to a blank themed page, types compile.

---

## Phase 1 — Pages (≈10 agents, fully parallel)

Each agent owns **exactly one route folder** and edits **no shared files**. They consume tokens + primitives + the data layer from the frozen contract. Because ownership is disjoint, they can all run at once with no conflicts.

| Agent | Route | Source ref | Notes / risk |
|---|---|---|---|
| A | `/dashboard` | `DashboardPage.jsx` | Needs `AreaChart`, `Donut`, `Sparkline`, `Stat`, timeline |
| B | `/employees` | `EmployeesPage.jsx` | Table + multi-select + **slide-over** (`ProfileSheet`) — biggest; consider splitting table vs. sheet |
| C | `/approvals` | `ApprovalsPage.jsx` | Split master-detail, approval-chain timeline, act state |
| D | `/attendance` + `/leave` | `AttendancePage.jsx` | Heatmap table + month calendar; one page, `tab` prop |
| E | `/payroll` | `PayrollPage.jsx` | Run banner + 5-step pipeline + `Donut` + tables |
| F | `/assets` | `AssetsPage.jsx` | Filtered table + `BarsH` + lifecycle bars |
| G | `/benefits` | `BenefitsPage.jsx` | Plan card grid + enrollment `Ring` |
| H | `/reports` | `ReportsPage.jsx` | Report card grid (`Sparkline` previews) + schedule table |
| I | `/settings` | `SettingsPage.jsx` | Section nav + RBAC table + integrations switches |
| J | `/login` | `LoginPage.jsx` | Standalone (no shell); brand panel + form |

**Rules for every page agent (put these in each subagent's prompt):**
- Import only from the frozen contract (`/components/ui`, `/lib/data`, theme tokens). **Never** edit tokens, primitives, the shell, or another agent's folder. If you think a primitive needs a change, **stop and file it to the lead** — don't fork it.
- Match `README.md` → "Screens" spec exactly (layout, copy, spacing, colors). Use tokens, never hard-coded hex.
- Respect the motion rule: visible state is the CSS base; animate from hidden; overlays animate transform only.
- Wire interactions to local UI state + the mock data layer. No backend.
- **Done = renders in light + dark, matches the reference screenshot, no console errors, types pass.**

> Throughput tip: B (Employees) and D (Attendance+Leave) are the heaviest. If you have spare agents, split B into *directory table* + *profile slide-over*, and D into *attendance heatmap* + *leave calendar*. Everything else is ~one agent each.

---

## Phase 2 — Integration & QA (lead + 1–2 agents)

Once routes merge:
1. **Nav + command-palette wiring** — register every route, verify ⌘K navigation, breadcrumbs, active states.
2. **Cross-cutting QA agent** — walk all 10 routes in light + dark at 1440 / 1280 / 1024; check token usage (no stray hex), tabular-nums on all numbers, focus rings, hover/press states, empty/loading states.
3. **Accessibility agent** — keyboard nav (palette, tables, slide-over, tabs), `aria-label` on icon buttons, focus trapping in overlays, contrast (esp. dark mode), reduced-motion.
4. **Data swap** — replace mock fixtures with real endpoints behind the same model types (the page code shouldn't change).

---

## Why this parallelizes cleanly
- **Disjoint file ownership** → no merge conflicts. One agent per route folder; shared code is frozen before fan-out.
- **Contract-first** → page agents never block on each other; they code against stable tokens/props/types.
- **Reference-driven** → each agent has a pixel spec (README screen section) + a working HTML prototype to diff against, so "done" is unambiguous.
- **Escalation, not forking** → primitive changes route back to the lead, keeping the shared layer coherent.

## Suggested kickoff prompt for each page subagent
> You own the `/<route>` route of the NU-AURA redesign. Build it to pixel-match the "<Screen>" section of `README.md`, using the prototype `design/app/<Page>.jsx` as the behavior reference. Import tokens and components only from the frozen contract in `CONTRACT.md` — do not edit shared files. Support light + dark via the theme tokens. Wire interactions to the mock data layer. Done = matches the reference in both themes, keyboard-accessible, no console errors, types pass.
