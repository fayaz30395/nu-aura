# Handoff: NU-AURA "Aura" — HRMS Redesign

A full redesign of the **NU-AURA** enterprise HR platform (product of **NULogic Technologies**). This bundle is the source of truth for look, behavior, and the design system. It is built to be implemented in a real codebase by a team of **Claude Code subagents working in parallel** — see `PARALLEL_BUILD.md` for the orchestration plan.

---

## Overview

NU-AURA is a multi-tenant, multi-product HR suite. This redesign covers the **NU-HRMS** product end-to-end plus the shared app shell:

- **App shell** — slim dark *product rail* (the 4 bundle apps) + a contextual nav panel, sticky top bar, ⌘K command palette, light/dark toggle.
- **Login / auth** — split brand panel + form.
- **Dashboard**, **Employees** (+ profile slide-over), **Approvals** (split inbox), **Attendance & Leave**, **Payroll**, **Assets**, **Benefits**, **Reports**, **Settings** (RBAC).

The aesthetic: calm, premium, high-information-density, **single-hue blue monochrome** (`#2952A3`) with restrained tactile depth. The parent NULogic red→purple gradient appears only in brand moments (login, rail logo).

---

## About the Design Files

The files in `design/` are **design references created in HTML/CSS + inline-JSX React (via Babel)**. They are prototypes demonstrating intended look and behavior on mock data — **not production code to copy verbatim**.

**Your task:** recreate these designs in the target codebase using its established environment and patterns. The real NU-AURA app is **Next.js 14 + React + Mantine 8 + Tailwind** (per the source repo `fayaz30395/nu-aura`). Implement the redesign as production React components in that stack — reuse Mantine primitives where they fit, but match the visual spec below exactly. If you are starting greenfield, Next.js + React + CSS variables (as tokenized here) is the recommended baseline.

Do **not** ship the Babel/CDN setup, inline `<script type="text/babel">`, or `window`-assigned components — those are prototype conveniences only.

---

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, motion, and interaction behavior are all specified. Recreate pixel-faithfully. Every visual value is a token (see `design/app/tokens.css`) — wire those into the target's theme system rather than hard-coding.

---

## Design System (tokens)

All tokens live in **`design/app/tokens.css`** as CSS custom properties, with a full dark theme under `:root[data-theme="dark"]`. Port these into the target theme layer (Tailwind config / Mantine theme / CSS vars). Key values:

### Color — anchor & accent (NU-AURA Blue, hue ~228)
`--accent-50 #f0f3fc · 100 #dce3f8 · 200 #bcc9f2 · 300 #92a8e8 · 400 #6884dc · 500 #4463cf · 600 #3350b8 · 700 #2952A3 (PRIMARY) · 800 #244288 · 900 #1d356d · 950 #121f44`

### Semantic surfaces (light → dark)
| Token | Light | Dark |
|---|---|---|
| `--accent` | `#2952A3` | `#6884dc` |
| `--bg-app` | `#f4f6fb` | `#070a14` |
| `--surface` | `#ffffff` | `#11162a` |
| `--surface-2` | `#f4f6fb` | `#0d1322` |
| `--rail` (product rail) | `#0c1120` | `#06080f` |
| `--nav` (nav panel) | `#0f1424` | `#080b16` |
| `--text-1` | `#0e1225` | `#eef1f9` |
| `--text-2` | `#3a3f57` | `#b7bdd4` |
| `--text-3` | `#6b7190` | `#7e85a3` |
| `--border` | `#e4e7f0` | `#1e2540` |

### Product accents (rail)
`--prod-hrms #4463cf · --prod-hire #0ea5a3 · --prod-grow #d97706 · --prod-fluence #8b5cf6`

### Status
`ok #167c45 / bg #effaf3` · `warn #b15a09 / bg #fff7ec` · `err #cf2f2f / bg #fef1f1` · `info = accent` · `neutral #4e5270`

### Chart palette
`--chart-1 #2952A3 · 2 #6884dc · 3 #0ea5a3 · 4 #d97706 · 5 #8b5cf6` · grid `#eaecf3` (dark `#1a2138`)

### Type
- Fonts: **Montserrat** (display/headings, 600–800), **Open Sans** (body, 400–700), **Roboto Mono** (all numerics, money, IDs, codes — `font-variant-numeric: tabular-nums`).
- Scale: page title **28px/700/-0.02em** · h-section 15px/700 · body 13–14px · caption 12px · micro-label **10.5px/700 uppercase 0.1em tracking** · stat value 29px/700 mono.

### Radii
`--r-xs 5 · sm 7 · md 9 · lg 12 (cards) · xl 16 · 2xl 22 · full 999`. Buttons/inputs 10px. No sharp corners.

### Spacing — 4px base
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`. Page gutters 26–34px. Section vertical rhythm 16–24px.

### Shadows (in-between depth — soft + 1px top highlight, no heavy noise)
- `--sh-sm` cards · `--sh-md` hover/raised · `--sh-pop` overlays (palette, slide-over) · `--sh-focus` `0 0 0 3px var(--ring)`.

### Motion
`--t-fast 120ms · base 180ms · slow 280ms`; ease `cubic-bezier(0.4,0,0.2,1)`. Hover lifts `-1/-2px`. **Critical:** keep the *visible* state as the CSS base and animate *from* hidden — never leave an element resting at `opacity:0` (a non-advancing-animation environment must still show content). Overlays/slide-overs animate transform only.

---

## App Shell (shared across all screens)

Layout: `display:flex` row → **Product rail (72px)** | **Nav panel (232px)** | **Main (flex column)** = sticky **Top bar (60px)** + scroll region. Max content width 1340px, centered.

### Product rail — `--rail #0c1120`
- Top: 40px rounded brand mark (NULogic gradient, letter "N").
- 4 product buttons (HRMS/Hire/Grow/Fluence), 46px rounded-13px. Active: product-colored 4px left indicator with glow + tinted chip background + white icon. Hover tooltip to the right.
- Bottom: help button + 34px square user avatar.

### Nav panel — `--nav #0f1424`
- Header: product icon (in product color) + name + tag.
- Workspace switcher row: tenant logo "AR" + "Acme Robotics / Enterprise · 1,248 seats" + chevrons-up-down.
- Grouped nav (`Workspace`, `People`, `Operations`) — 10px uppercase group labels; items 13px with 18px Lucide icon, active = `--nav-active` tinted bg + accent-300 icon; count pills (Approvals shows red `6`).
- Footer: "Unlock NU-Grow" upsell card (subtle gradient) + ghost "Start trial".

### Top bar — translucent `--surface` + `blur(14px)`, bottom border
Panel-toggle · breadcrumbs (last crumb `--text-1` 600) · spacer · **⌘K search trigger** (260px, shows `⌘K` kbd) · theme toggle (moon/sun) · bell w/ red dot · divider · user block (avatar + name + role + chevron).

### Command palette (⌘K) — `--sh-pop`, 600px, centered, 12vh from top
Search input (16px) + `ESC` kbd · grouped results (`Navigate`, `Actions`, `People`) each row = 30px rounded icon tile + label + right hint (e.g. `G then D`) · active row = `--accent-soft`, active tile = filled accent · footer with `↑↓ navigate / ↵ select / esc close`. Arrow keys move selection, Enter runs, Esc closes; filters by label substring. Open/close also via ⌘K / Ctrl+K global listener.

---

## Screens

> For each: exact layout, components, and copy. Cross-reference the matching `design/app/*.jsx` file. All charts are hand-rolled SVG in `design/app/Charts.jsx` (`Sparkline`, `AreaChart` w/ hover tooltip, `Donut`, `BarsH`, `Ring`) — reimplement with the target's charting lib (e.g. Recharts/visx) or port the SVG.

### 1. Login — `LoginPage.jsx`
Two-column grid `1.05fr / 1fr`; below 920px the brand panel hides.
- **Left brand panel:** dark gradient `150deg #0c1120 → #14193a → #2a1d49` with two radial color washes (red-orange top-left, purple bottom-right) + faint 44px grid masked radially. Content: logo (46px gradient mark + "NU-AURA / by NULogic Technologies"), headline **"One login. Your whole people stack."** (40px/700), lede, 2×2 grid of product cards (icon tile in product color + name + tag), `INFINITE INNOVATION` tagline (uppercase, tracked).
- **Right form:** "Welcome back" (26px/700) + subtitle; Work email (mail icon) + Password (lock icon) fields; row = "Remember me" checkbox + "Forgot password?" link; primary full-width **Sign in** (arrow-right); "or continue with" divider; SSO / Google / Microsoft ghost buttons; footer "New to Acme? Contact your administrator"; legal line bottom.
- Theme toggle floats top-right. Submitting calls `onLogin()`.

### 2. Dashboard — `DashboardPage.jsx`
- **Head:** time-based greeting "Good morning, {first}" + date + "Here's what's moving across Acme Robotics today." · actions: ghost **Export**, primary **New Hire**.
- **KPI row (4):** `Stat` cards — Headcount `1,248` ▲4.2%, Present today `1,104` (flat "2 late"), On leave `42` ▼3.4%, April payroll `$4.2M` ("On track"). Each: 38px rounded icon tile (tinted per-card), uppercase label, 29px mono value, delta pill (mono, up=green/down=red/flat=neutral, `white-space:nowrap`), Sparkline, foot note.
- **Row (3fr / 1.3fr):** *Headcount growth* card — `AreaChart` (12-mo) with 3M/6M/12M `Segmented`; *Attendance* card — `Donut` (center "88% present") + legend rows (Present 1,104 / Remote 96 / On leave 42 / Absent 6 with %).
- **Row (2fr / 1fr):** *Pending approvals* — 4 rows (avatar, name·role, type badge + summary + time, Decline/Approve buttons), "View all →" → Approvals; *Activity* — vertical timeline (colored node icon, html-rendered text with bold names, relative time).

### 3. Employees — `EmployeesPage.jsx`
- **Head:** "Employees" + "1,248 people across 6 departments · 4 locations" · ghost Filters / Export, primary **Add Employee**.
- **Card:** toolbar = search (260px) + department chips (`All` + 6, each with count) + ghost Sort. **Bulk bar** replaces toolbar when rows selected (accent bg: "N selected", Message / Move team / Export / Offboard ghost-dark buttons, ✕ to clear).
- **Table:** columns — checkbox (header selects all filtered), Employee (38px avatar + name + email), Role, Department, Location, Joined (mono), Status (`StatusBadge`), kebab. Row hover = `--surface-2`; selected row = `--accent-soft`. 58px rows. Footer: "Showing N of 12" + pager.
- **Profile slide-over** (`ProfileSheet`): 480px right sheet + scrim. Header on a name-tinted gradient: 68px avatar, name (22px), role·dept, Status + type badges + ID, actions (Message / Edit / kebab). `Tabs`: **Overview** (Contact + Employment key-values + time-off balance bars), **Documents** (file rows w/ download), **Timeline** (join/promo/recognition/leave events). Opens on row click; closes via ✕ or scrim.

### 4. Approvals — `ApprovalsPage.jsx`
- **Head:** "Approvals" + "6 requests awaiting your decision · oldest 5h ago" · ghost "Approve all leave" / Filters.
- **Tabs:** All(6) / Leave(2) / Expense(2) / Offers(1) / Assets(1).
- **Split (1fr / 2fr):** *left* = list of request cards (type icon tile, name [truncate], High badge, relative time, summary [truncate], type·ID badge); selected card = accent border + ring; acted cards dim + show Approved/Declined badge. *right* = detail card (sticky): requester header (48px avatar, role·dept, type badge + ID), "Request details" + priority badge, key-value list from `request.detail`, **Approval chain** timeline (submitted ✓ / manager endorsed ✓ / your approval pending), note textarea, then **Approve** (ok) / **Decline** (danger) / **Delegate** (ghost) — replaced by a status badge after acting.

### 5. Attendance & Leave — `AttendancePage.jsx`
Single page with a header `Segmented` toggle (Attendance / Leave); deep-links: nav "Attendance" → attendance view, "Leave" → leave view (prop `tab`).
- **Attendance view:** 4 KPI stats (Present today, Avg check-in `09:04`, Avg hours `8.3h`, Overtime `214h`) + **Team attendance** card: weekly **heatmap table** — rows = employees, columns = Mon–Fri with colored status cells (`P` present / `R` remote / `L` leave / `A` absent, tinted bg + bordered, 34×30 rounded) + Check-in + Avg hrs columns; legend in section header.
- **Leave view (1fr / 2fr):** *left* = **My balance** card (4 `Ring`s: Annual 14.5/21, Sick 10/12, Personal 4/5, Comp 3/3 + "Request time off" primary) and **Pending requests** card; *right* = **May 2026 calendar** — 7-col grid, weekday headers, day cells (min-height 78, weekend tinted) with event chips (first-name + colored dot per leave/remote entry), prev/next month buttons.

### 6. Payroll — `PayrollPage.jsx`
- **Head:** "Payroll" + "April 2026 cycle is being processed · pays Apr 30" · ghost Export / Configure, primary **Run Payroll**.
- **Current-run banner card:** tinted gradient top region — Processing badge + run ID, period `April 2026` (24px), employees·pay date, **Review & approve** primary (top-right); below, 3 big mono stats (Gross `$4,218,540` / Net `$3,142,880` / Taxes & deductions `$1,075,660`). Bottom strip (bordered): **5-step pipeline** — Inputs locked ✓ · Calculated ✓ · **Review** (current, accent + soft ring) · Approved · Paid, joined by connector lines (green where done).
- **KPI row (4):** YTD gross, Avg cost/employee, Effective tax rate, On this run.
- **Row (3fr / 1.3fr):** *Cost by department* table (dept, headcount, gross, share bar + %); *Pay composition* `Donut` (center "74% net pay") + legend (Net/Taxes/Benefits/Deductions).
- **Run history** table: Run ID, Period, Pay date, Employees, Gross, Net, Status, kebab.

### 7. Assets — `AssetsPage.jsx`
Head + 4 KPI stats (Total 1,284 / Assigned 1,232 96% / Available 38 / In repair 14). **Split (3fr / 1.3fr):** *left* card = category chips + search + asset table (icon tile + name + AST-id, serial, assignee [avatar or "Unassigned"], location, status badge, purchased); *right* card = **By category** `BarsH` + **Lifecycle** bars (Healthy/Aging/End of life).

### 8. Benefits — `BenefitsPage.jsx`
Head ("Open enrollment closes in 12 days · 94% enrolled") + 4 KPI stats. **Plans** = 3-col grid of 6 hoverable plan cards (color icon tile, name, provider, Enrolled n/total + progress bar, Tier + Cost footer). **Open enrollment progress** card: 92px `Ring` (94%) + 3 status bars (Completed/In progress/Not started) + "Remind 62 employees".

### 9. Reports — `ReportsPage.jsx`
Head + **Saved reports** 3-col grid of 6 hoverable cards (color icon tile, name, category badge, kebab, full-width `Sparkline` preview, "Updated …" + "Open →"). **Scheduled deliveries** table (report, frequency, owner [avatar], next run, format badge, kebab).

### 10. Settings — `SettingsPage.jsx`
Head + 2-col layout: *left* sticky section nav card (General / **Roles & permissions** / Integrations / Notifications / Billing). Sections:
- **Roles & permissions** (default): table of 9 RBAC roles — colored dot + role name, Users, Permissions (mono), Scope, edit pencil. Header "9 RBAC roles · 1,283 users · 512 permissions" + "New role".
- **Integrations:** rows with app icon tile, name, description, Connected badge + `Switch` toggle (stateful).
- **General:** workspace form (org name, domain, currency, fiscal year, "Enforce SSO" switch, Save).
- **Notifications / Billing:** styled empty-state placeholders.

---

## Interactions & Behavior (summary)
- **Routing:** single-page `active` state; nav items + command palette + dashboard links set it. Persist `active` (and `theme`, `authed`) to `localStorage`. In the target app use the router (Next.js app-router segments).
- **Theme:** `data-theme="dark"` on `<html>`; toggle persists. Full token parity — no per-component dark hacks.
- **Tables:** row hover, click-to-open (Employees → slide-over), checkbox multi-select with select-all over the *filtered* set, bulk action bar.
- **Filters:** chip + search filter the visible list (`useMemo`).
- **Command palette:** global ⌘K/Ctrl+K; arrow/enter/esc keyboard nav; substring filter; items navigate or fire actions.
- **Slide-over & palette:** transform-based entrance, scrim click + Esc to dismiss; never rest at opacity 0.
- **Charts:** AreaChart has a hover crosshair + tooltip. Donut/Ring/Bars animate fills.
- **Hover/press:** cards lift `-1/-2px` + deepen shadow; primary buttons brighten + lift, press insets. No opacity hovers.

## State Management
Prototype uses local React state. For production:
- **Server data:** employees, approvals, attendance, leave, payroll runs, assets, benefit plans, roles, integrations → fetch per route (React Query / RSC). Shapes are in `design/app/data.js` (treat as the API contract sketch).
- **UI state:** `theme`, `active` route, nav-collapsed, command-palette-open, table selection set, slide-over target, approvals acted-map, settings section, integration toggles.

## Assets
- Logos/marks in `design/assets/` (NULogic wordmark + icon, white variants, NU-AURA mark). Favicon uses `nulogic-icon.svg`.
- **Icons:** [Lucide](https://lucide.dev) (v0.561), 1.5px stroke. In production import `lucide-react` instead of the CDN + `data-lucide` pattern. Icon names used are visible in the JSX (`layout-dashboard`, `users`, `inbox`, `fingerprint`, `palmtree`, `banknote`, `package`, `heart-pulse`, `bar-chart-3`, `settings`, etc.).
- **Fonts:** Montserrat, Open Sans, Roboto Mono — Google Fonts (self-host for production).

## Files (in `design/app/`)
`index.html` (shell + routing), `tokens.css` (design tokens + dark theme), `app.css` (component styles), `data.js` (mock data / contract), `Charts.jsx`, `Primitives.jsx` (Button, IconButton, Avatar, Badge, StatusBadge, Card, Stat, Field, Switch, Segmented, Check, Tabs, AvatarStack), `Shell.jsx` (rail, nav, top bar, command palette), and page files: `LoginPage`, `DashboardPage`, `EmployeesPage`, `ApprovalsPage`, `AttendancePage`, `PayrollPage`, `AssetsPage`, `BenefitsPage`, `ReportsPage`, `SettingsPage`.

➡ **See `PARALLEL_BUILD.md` for how to split this across parallel Claude Code subagents.**
