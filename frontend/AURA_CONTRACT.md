# AURA_CONTRACT — Phase-0 Foundation Contract

**Status:** Authoritative for the Aura redesign page wave. Read this before touching any shared
code. Page agents BUILD INSIDE these boundaries — they never edit globals.css, tailwind.config.js,
styles/mantine-theme.ts, app/layout.tsx, the shared `components/ui` primitives, the shared
`components/charts`, or `components/layout` shell files. Those are owned by Phase 0.

**Design source of truth:**
- Spec: `design-import/aura/project/design_handoff_nu_aura_redesign/README.md` (Design System / App Shell / Screens)
- Prototype JSX (reference only — DO NOT copy Babel/CDN/`window`-assignment setup): `design-import/aura/project/app/*.jsx`
- Mock data / API contract sketch: `design-import/aura/project/app/data.js`
- Screenshots: `design-import/aura/project/design_handoff_nu_aura_redesign/screenshots/`

**Hard rules (every page agent):**
- Visual/design only. NEVER change business logic, data fetching, routing behavior, auth guards,
  hooks order, or component public APIs/props/exports.
- Token-driven. NEVER hardcode a hex/space/radius/shadow in a component — use the CSS vars below.
  `scripts/check-styling-drift.mjs` runs and will flag violations.
- Full light + dark parity. WCAG-AA contrast + visible focus on every interactive element.
- Roboto Mono + tabular-nums on ALL numerics (money, IDs, stats, counts, dates-as-mono). Use the
  `.num` / `.tabular-nums` / `.tnum` utility or the `--font-mono` stack.
- Preserve the Wave-1 motion system (`--motion-*`, `.hover-lift`, `.press-scale`, `.focus-ring`,
  `.motion-rise`, `@/components/motion`, `@/lib/animation`). Overlays/slide-overs animate
  transform-only; NEVER rest an element at `opacity:0` (content must show in a non-animating env).
- Icons: `lucide-react` (already a dep). The prototype's `data-lucide` string names map 1:1 to
  PascalCase `lucide-react` imports (`layout-dashboard` → `LayoutDashboard`, `heart-pulse` → `HeartPulse`).

---

## 1. Tokens + font vars (available now)

All values live in `app/globals.css :root`, dark-overridden under the combined selector
`.dark, :root[data-theme="dark"]`. Wired into Tailwind (`tailwind.config.js`) and Mantine
(`styles/mantine-theme.ts`). **Use token names, not raw values.**

### Raw Aura tokens (CSS vars)
- **Accent scale:** `--aura-accent-50/100/200/300/400/500/600/700/800/900/950` (anchor `700 = #2952A3`).
- **Semantic:** `--accent` `--accent-hover` `--accent-soft` `--accent-text` · `--bg-app` `--bg-canvas`
  `--surface` `--surface-aura-2` `--surface-hover` `--surface-sunken` · `--rail` `--rail-2` `--nav`
  `--nav-soft` `--nav-active` · `--text-1` `--text-2` `--text-3` `--on-rail` `--on-rail-dim` ·
  `--border` `--border-soft` `--border-aura-strong`.
- **Product:** `--prod-hrms` `--prod-hire` `--prod-grow` `--prod-fluence`.
- **Status:** `--ok-bg/-fg/-bd` `--warn-bg/-fg/-bd` `--err-bg/-fg/-bd` `--info-bg/-fg/-bd` `--neutral-bg/-fg/-bd`.
- **Charts:** `--chart-1..5` `--chart-axis` `--chart-grid`.
- **Radii:** `--r-xs(5) --r-sm(7) --r-md(9) --r-lg(12, cards) --r-xl(16) --r-2xl(22) --r-full(999) --r-control(10, buttons/inputs)`.
- **Spacing:** `--s-1..--s-12` (4px base).
- **Shadows:** `--sh-xs --sh-sm(cards) --sh-md(hover/raised) --sh-lg --sh-pop(overlays) --sh-focus --ring --inset-input`.
- **Motion:** `--t-fast(120) --t-base(180) --t-slow(280) --ease(cubic-bezier(.4,0,.2,1)) --ease-soft`.
- **Type metrics:** `--aura-title-size(28px) --aura-title-weight(700) --aura-title-tracking(-0.02em)` ·
  `--aura-stat-size(29px) --aura-stat-weight(700)` · `--aura-micro-size(10.5px) --aura-micro-weight(700) --aura-micro-tracking(0.1em)`.
- **Brand:** `--nu-grad-brand` `--nu-grad-primary` (login + rail logo only).

### Aliased existing tokens (now resolve to Aura values, both modes)
Existing component code keeps working — these point at Aura values:
`--bg-main(=--bg-app)` `--bg-surface/-card(=--surface)` `--bg-card-hover(=--surface-hover)`
`--bg-page(=--bg-app)` `--bg-input(=--surface)` `--bg-sidebar(=--nav)` `--surface-2(=--surface-aura-2)`;
`--text-primary/-heading(=--text-1)` `--text-secondary(=--text-2)` `--text-muted(=--text-3)`;
`--border-main(=--border)` `--border-subtle(=--border-soft)` `--border-strong(=--border-aura-strong)`
`--border-focus(=--accent)`; `--accent-50..950` (=Aura scale) `--accent-primary(=--accent)`
`--accent-primary-hover(=--accent-hover)` `--accent-primary-subtle(=--accent-soft)`;
`--shadow-card(=--sh-sm)` `--shadow-card-hover(=--sh-md)` `--shadow-elevated(=--sh-lg)`
`--shadow-dropdown(=--sh-pop)`; `--ring-primary(=--ring)`; full `--status-*`, `--header-*`,
`--dropdown-*`, `--chart-*`, `--sidebar-*`, `--nu-gradient-*`, `--glass-*` sets re-mapped.

### Utility classes (globals.css @layer utilities)
- `.num` / `.tabular-nums` / `.tnum` → Roboto Mono + `font-variant-numeric: tabular-nums`.
- `.text-aura-title` (28/700/-0.02em) · `.text-aura-stat` (29/700 mono) · `.text-aura-micro` (10.5/700 uppercase .1em).

### Font vars (next/font in `app/layout.tsx`)
`--font-sans = Open Sans` (body) · `--font-display = Montserrat` (headings) · `--font-mono = Roboto Mono` (numerics).
Aliases `--font-body(=--font-sans)` `--font-head(=--font-display)` retained.

### Tailwind keys (`tailwind.config.js theme.extend`)
- `colors.accent` (DEFAULT=#2952A3, `hover/subtle/soft`, +50..950), `colors.primary` (DEFAULT=#2952A3 +scale),
  `colors.info` (Aura accent), `colors.prod.{hrms,hire,grow,fluence}`, `colors.chart.{1,2,3,4,5}`,
  `colors.rail.{DEFAULT,2}`, `colors.nav.{DEFAULT,soft,active}`,
  `colors['surface-aura'].{DEFAULT,2,hover,sunken,app,canvas}`, `colors['text-1'|'text-2'|'text-3']`,
  `colors['on-rail'].{DEFAULT,dim}`, `colors['border-aura'].{DEFAULT,soft,strong,focus}`,
  `colors.status.{ok,warn,err,info,neutral}-{fg,bg,bd}`.
- `fontFamily.{sans,display,mono}`.
- `borderRadius.{aura-xs,aura-sm,aura-md,aura-lg,aura-xl,aura-2xl,aura-control}`.
- `boxShadow.{sh-xs,sh-sm,sh-md,sh-lg,sh-pop,sh-focus}` (existing `card/card-hover/elevated/dropdown` auto-adapt).

### Mantine theme keys (`styles/mantine-theme.ts`)
`primaryColor='aura'`, `primaryShade={light:7,dark:4}`, `colors.aura/accent/primary` = Aura 10-tuple;
`fontFamily=var(--font-sans)`, `fontFamilyMonospace=var(--font-mono)`, `headings.fontFamily=var(--font-display)` weight 700;
`defaultRadius='md'`, `radius={xs:5,sm:7,md:10,lg:12,xl:16}px`; `Card`/`Paper` radius `lg`(12px), `Modal` radius `lg`.

---

## 2. Primitive component public APIs — `components/ui`

Prefer the existing repo primitives below. They already consume the aliased tokens, so they render
in Aura colors with no change. **Do not modify their props/exports.** New primitives required by the
spec that do not exist yet are flagged **(PHASE-0 TO BUILD)** — owned by Phase 0, not page agents.

Prototype → repo mapping (prototype names in `app/Primitives.jsx`):

| Prototype | Repo primitive (`@/components/ui`) | Public API (props) |
|---|---|---|
| `Button` | `Button` (`Button.tsx`) | `variant: 'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'|'warning'|'link'|'soft'|'soft-danger'|'soft-success'|'default'|'cta'`; `size: 'xs'|'sm'|'md'|'lg'|'xl'|'icon'|'icon-sm'|'icon-xs'|'icon-lg'`; `isLoading?`, `loadingText?`, `leftIcon?`, `rightIcon?`, `asChild?`; + native button attrs. Prototype `ghostdark` → use `variant="ghost"` on dark surfaces. |
| `IconButton` | `Button` w/ `size="icon"` (or `IconButton` if present) | use `size="icon"`/`"icon-sm"`, pass icon as child. For the notification bell red-dot, render dot via wrapper span (token `--err-fg`). |
| `Avatar` | `Avatar` (PHASE-0 confirm; else build) | `name`, `size?`, `square?`, `src?`. Gradient bg derived from name hash (see `colorFor`/`initials` in §5). |
| `Badge` | `Badge` (`Badge.tsx`) | `variant`/tone + `children`; optional leading `dot`. |
| `StatusBadge` | `StatusBadge` (`StatusBadge.tsx`) | `value: string` → tone via STATUS_VARIANT map (see below). Renders dot + label. |
| `Card` | `Card` (`Card.tsx`) | content container, radius `--r-lg`, `--sh-sm`; hover variant lifts to `--sh-md`. `pad`, `hover` style intent. |
| `SectionHead` | inline / `Card` header (PHASE-0 helper) | `title`, `sub?`, `action?`. |
| `Stat` | `Stat` (`Stat.tsx`) + `StatCard` (`StatCard.tsx`) | `Stat`: `label`, `value`, `caption?`, `tone: 'default'|'accent'|'success'|'warning'|'danger'|'muted'`, `size: 'default'|'compact'`, `icon?`. `StatCard` (HTMLAttributes div): richer KPI card w/ icon tile + delta + sparkline slot. **Use `StatCard` for the dashboard KPI row.** |
| `Field` | `Input` (`Input.tsx`) + `Label` + `AccessibleFormField` | label/icon/hint/error wired through `AccessibleFormField`; control radius `--r-control`. |
| `Switch` | `ThemeToggle` is theme-specific; generic `Switch` → use Mantine `Switch` themed | stateful `on`/`onChange` (RBAC integrations toggle). |
| `Segmented` | `Segmented` (PHASE-0 TO BUILD) | `options: {value,label,icon?}[]`, `value`, `onChange`. Used by Dashboard (3M/6M/12M), Attendance/Leave toggle. |
| `Check` | `DataTable` selection checkbox / Mantine `Checkbox` | square check, `--r-xs`, accent fill when on. |
| `Tabs` | `Tabs` (PHASE-0 confirm; else Mantine `Tabs` themed) | `tabs: {id,label,icon?,count?}[]`, `value`, `onChange`. Count pill on right. |
| `AvatarStack` | `AvatarStack` (PHASE-0 TO BUILD) | `names: string[]`, `size?`, `max?`. Overflow `+N` chip. |

**STATUS_VARIANT map (from prototype — preserve exactly):**
`Active→ok · 'On Leave'→warn · Probation→primary · Terminated→err · Paid→ok · Processing→primary ·
Draft→neutral · Pending→warn · Approved→ok · Rejected→err · High→err · Normal→neutral · Low→neutral`.

Existing extras page agents MAY reuse (do not modify): `DataTable`, `ResponsiveTable`,
`TableFilterBar`, `AdvancedFilterPanel`, `Modal`, `ConfirmDialog`, `EmptyState` (+`empty-state-presets`),
`Toast`, `Skeleton`, `Loading`, `Spinner`/`PremiumSpinner`, `ExportMenu`, `NotificationDropdown`,
`Select`, `Textarea`, `Callout`, `AnimatedCard`, `PremiumMetricCard`, `FileUpload`,
`EmployeeSearchAutocomplete`, `MobileBottomNav`, `ThemeToggle`. Import via `@/components/ui` (`index.ts`).

---

## 3. Chart components — `components/charts`

Prototype SVG primitives live in `app/Charts.jsx` (`Sparkline`, `AreaChart`, `Donut`, `BarsH`, `Ring`).
The repo already ships domain chart wrappers in `components/charts` (Recharts-based, consuming
`--chart-*` tokens). Page agents use these; Phase 0 owns adding any missing low-level primitive.

| Spec primitive | Repo chart (`@/components/charts`) | Notes |
|---|---|---|
| `AreaChart` (12-mo headcount, hover crosshair+tooltip) | `HeadcountTrendChart` | tooltip value mono; axis `--chart-axis`; grid `--chart-grid`. |
| Trend area (attendance) | `AttendanceTrendChart` | |
| Trend (payroll cost) | `PayrollCostTrendChart` | |
| `Donut` (attendance / pay-composition, center label) | `LeaveDistributionChart` / `DepartmentDistributionChart` (donut/pie family) | center value mono 26px display; slices `--chart-1..5`. New center-label donut as **(PHASE-0 TO BUILD)** if a generic one is needed. |
| `BarsH` (by-category, dept) | `DepartmentDistributionChart` | first bar `--chart-1`, rest `--chart-2`; mono value labels. |
| `Sparkline` (StatCard, Reports cards) | **(PHASE-0 TO BUILD)** `Sparkline` | `data: number[]`, `color?`, `height?`, `fill?`. |
| `Ring` (leave balances, enrollment) | **(PHASE-0 TO BUILD)** `Ring` | `value(0-100)`, `size?`, `thickness?`, `color?`, `label?`. |

Color inputs: pass token strings (`var(--chart-3)`), never hex. Donut/Ring/Bars animate fills via
the Wave-1 motion system; never rest at `opacity:0`. Export via `components/charts/index.ts`.

---

## 4. Shell layout — `components/layout`

Pages mount **inside** `AppLayout` (`components/layout/AppLayout.tsx`). The shell renders the
product rail, nav panel, sticky top bar, breadcrumbs, command palette, and theme toggle. Page agents
NEVER re-implement the shell — they render their page body as `children`.

**`AppLayout` public API (do not change):**
```
interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];           // last crumb = current page, --text-1 600
  headerProps?: Partial<HeaderProps>;
  className?: string;
  showBreadcrumbs?: boolean;                // default true
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  activeMenuItem?: string;                  // nav highlight key (e.g. 'employees')
  onMenuItemClick?: (item: SidebarItem) => void;
}
```

**How a page mounts:**
- Most routes are wrapped by the segment's `layout.tsx` (already mounting `AppLayout`). A page agent
  supplies its body and, where the route owns it, the `breadcrumbs` array + `activeMenuItem`.
- Active-nav wiring: `activeMenuItem` matches the nav `id` from the spec NAV map — `dashboard`,
  `inbox` (Approvals), `employees`, `attendance`, `leave`, `payroll`, `assets`, `benefits`,
  `reports`, `settings`. Routing stays Next.js app-router (no SPA `active` state); the prototype's
  `localStorage` routing is NOT ported.
- Breadcrumb shape: `BreadcrumbItem` (label + href). Provide trail e.g. `[{label:'NU-HRMS'},{label:'Employees'}]`.
- Top bar (`Header.tsx`): panel toggle · breadcrumbs · ⌘K trigger (`GlobalSearch.tsx`) · theme toggle
  (`ThemeToggle`/`DarkModeProvider`) · bell (`NotificationDropdown`) · user block (`UserMenu.tsx`).
  Command palette behavior (⌘K/Ctrl+K, arrow/enter/esc, substring filter) is owned by `GlobalSearch`.
- Product rail mapping (4 bundle apps): `hrms`(`--prod-hrms`) · `hire`(`--prod-hire`) ·
  `grow`(`--prod-grow`) · `fluence`(`--prod-fluence`). Active = product-colored 4px indicator + glow +
  tinted chip + white icon.

Shell files owned by Phase 0: `AppLayout.tsx`, `Header.tsx`, `Sidebar.tsx`, `Breadcrumbs.tsx`,
`GlobalSearch.tsx`, `UserMenu.tsx`, `menuSections.tsx`, `DarkModeProvider.tsx`, `MantineThemeProvider.tsx`.

---

## 5. Data model shapes (contract sketch — from `app/data.js`)

Treat these as the API contract sketch. Page agents bind real server data (React Query / RSC) to UI
that matches these shapes; the redesign does NOT change fetching. Field names mirror the prototype.

```ts
// helpers
colorFor(name: string): string          // deterministic avatar bg from name hash
initials(name: string): string          // first+last initial, uppercase

interface Employee {
  id: string;            // 'E-1042'
  name: string; email: string;
  role: string; dept: string; loc: string;
  type: 'Full-time' | 'Contract';
  joined: string;        // 'Mar 2021' (display)
  status: 'Active' | 'On Leave' | 'Probation' | 'Terminated';
  mgr: string; phone: string; comp: string; // comp '$148,000'
}

interface Approval {
  id: string;            // 'REQ-4821'
  type: 'Leave' | 'Expense' | 'Offer' | 'Asset';
  who: string; role: string; dept: string;
  when: string;          // '12m ago' (relative)
  priority: 'High' | 'Normal' | 'Low';
  summary: string;
  detail: Record<string, string>;  // key-value pairs rendered in detail pane
}

interface ActivityItem {
  kind: 'ok' | 'primary' | 'warn' | 'neutral';
  icon: string;          // lucide name
  text: string;          // HTML w/ <b> — render via sanitized markup
  when: string;
}

interface AttendanceRow {               // weekly heatmap row (derived from employees + status cells)
  // per spec: employee + Mon–Fri status cells: 'P'|'R'|'L'|'A', checkIn, avgHrs
  name: string; checkIn: string; avgHrs: string;
  week: Array<'P' | 'R' | 'L' | 'A'>;
}

interface LeaveBalance {
  type: string;          // 'Annual leave'
  used: number; total: number;
  color: string;         // 'var(--chart-1)'
}

interface PayrollRun {
  id: string;            // 'PR-2026-04'
  period: string;        // 'April 2026'
  pay: string;           // 'Apr 30, 2026'
  status: 'Processing' | 'Paid';
  employees: number; gross: string; net: string;
}
// related: PayrollByDept { dept; headcount; gross; pct }

interface Asset {
  id: string;            // 'AST-3920'
  name: string; cat: string; icon: string; serial: string;
  assignee: string;      // name or '—'
  loc: string;
  status: 'Assigned' | 'Available' | 'In repair';
  date: string;
}
// related: AssetCategory { label; value }

interface BenefitPlan {
  name: string; provider: string; icon: string; color: string;
  enrolled: number; total: number;
  cost: string; tier: string;
}

interface Report {
  name: string; cat: 'People' | 'Finance' | 'Operations';
  icon: string; spark: number[]; color: string;
  run: string;           // 'Updated 2h ago'
}

interface Role {         // RBAC
  name: string; users: number; perms: number;
  scope: string;
  tone: 'err' | 'primary' | 'neutral' | 'warn';
}

interface Integration {
  name: string; desc: string; icon: string;
  on: boolean;           // Switch state
}

// chart series helpers present in data: headcountTrend:number[], months:string[],
// attendance:{label,value,color}[], departments:{label,value}[], sparks:{...:number[]},
// payrollRuns, payrollByDept, assets, assetCats, benefitPlans, reports, roles, integrations.
// context: user:{name,role,email}, tenant:{name,plan}.
```

---

## 6. File-ownership map (page agents)

Each page agent owns ONLY its route folder's page body + colocated page-local components. Shared
layers (§1–§4) are off-limits. Map of the 10 NU-HRMS Aura screens to repo route folders:

| # | Screen | Owner agent | Route folder(s) | Spec ref |
|---|---|---|---|---|
| 1 | Login / Auth | `agent-login` | `app/auth/` (+ `reset-password/`) | README §1, `LoginPage.jsx` |
| 2 | Dashboard | `agent-dashboard` | `app/dashboard/` | README §2, `DashboardPage.jsx` |
| 3 | Employees (+ profile slide-over) | `agent-employees` | `app/employees/` | README §3, `EmployeesPage.jsx` |
| 4 | Approvals (split inbox) | `agent-approvals` | `app/approvals/` | README §4, `ApprovalsPage.jsx` |
| 5 | Attendance & Leave | `agent-attendance` | `app/attendance/`, `app/leave/` | README §5, `AttendancePage.jsx` |
| 6 | Payroll | `agent-payroll` | `app/payroll/` | README §6, `PayrollPage.jsx` |
| 7 | Assets | `agent-assets` | `app/assets/` | README §7, `AssetsPage.jsx` |
| 8 | Benefits | `agent-benefits` | `app/benefits/` | README §8, `BenefitsPage.jsx` |
| 9 | Reports | `agent-reports` | `app/reports/` | README §9, `ReportsPage.jsx` |
| 10 | Settings (RBAC) | `agent-settings` | `app/settings/` | README §10, `SettingsPage.jsx` |

**Ownership rules:**
- A page agent edits only files under its assigned route folder(s) and may create page-local
  components there (e.g. `app/employees/_components/ProfileSheet.tsx`).
- Shared primitives needed but missing (§2/§3 **PHASE-0 TO BUILD**) are requested from Phase 0 —
  page agents do not add them to `components/ui` or `components/charts`.
- Routes outside this map (~251 other routes) inherit the new look automatically via the shared
  token + shell layer; they are NOT in this wave and are not owned by any page agent.
- The shell (`components/layout/*`), tokens (`app/globals.css`, `app/layout.tsx`,
  `tailwind.config.js`, `styles/mantine-theme.ts`), shared `components/ui`, and shared
  `components/charts` are owned by **Phase 0 only**.
