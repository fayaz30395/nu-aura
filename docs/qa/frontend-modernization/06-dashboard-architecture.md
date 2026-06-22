# Phase 3 — Dashboard Architecture & Decomposition

`app/dashboard/page.tsx` (1498 lines). **Operator-facing** (gated `DASHBOARD_VIEW`) → work is **composition + perf only, NOT visual elevation.** Same widgets, same data, same role-logic.

## Current Architecture Map
| Section | Lines |
|---|---|
| Imports / `'use client'` | 1–71 |
| Interfaces (`EmailHeader`, `GoogleNotification`) | 78–120 |
| Hooks (`useAuth`,`usePermissions`, 7×`useState`, 3×`useEffect`, 4×RQ) | 122–191 |
| `loadGoogleNotifications` (inline Gmail/Drive/Calendar `fetch`) | 192–348 |
| Attendance derived state + mutations | 350–400 |
| Utility fns (`formatRelativeTime`, icons, tone, preview) | 402–512 |
| Loading skeleton early return | 514–543 |
| Analytics fallback + KPI/series derivations | 545–596 |
| `dashboardWidgets` array (7 widgets inline) | 597–929 |
| Main JSX return (hero, KPI, charts, attendance strip, grid, 3 modals) | 931–1496 |

## Widget Tree
```
DashboardPage
├── (loading skeleton early-return) 515–543
└── AppLayout
    ├── error banner 935–947
    ├── Hero/greeting 950–975          [New Hire btn: EMPLOYEE_CREATE l.968]
    ├── KPI row 978–1063               (Headcount, Present, On-leave, Payroll)
    ├── Analytics 1065–1151            (AreaChart + range Segmented; Donut)
    ├── Attendance strip 1153–1244     (check-in/out mutations)
    ├── DashboardGrid 1247–1251
    │   ├── attendance-overview 600–642
    │   ├── quick-actions 644–675
    │   ├── department-distribution 677–716   [if data]
    │   ├── payroll-summary 718–752           [viewType==='ADMIN']
    │   ├── upcoming-events 754–802
    │   ├── notifications 804–891
    │   └── new-joiners 893–929               [viewType!=='EMPLOYEE'; onboarding btns if ADMIN]
    └── Modals: Calendar 1254–1379 · Email 1381–1438 · Drive 1440–1495
```

## Data-Flow Map
RQ hooks: `useDashboardAnalytics()` (key `['analytics','dashboard']`, 5min) → all KPIs/charts/widgets; `useAttendanceByDateRange(today,today)` (1min) → strip check-in state; `useMyTimeEntries(today)` (30s) → session list; `useOnboardingProcessesByStatus('IN_PROGRESS')` → new-joiners badge. Mutations `useCheckIn`/`useCheckOut`. **5 raw Google `fetch()`** in `loadGoogleNotifications` (l.192–348) bypass RQ (no cache/dedup, re-fire on remount). No duplicate RQ keys.

## Role-Aware Rendering Map (MUST preserve verbatim)
| Line | Condition | Effect |
|---|---|---|
| 163 | `!hasPermission(DASHBOARD_VIEW)` | redirect `/me/dashboard` |
| 968 | `hasPermission(EMPLOYEE_CREATE)` | "New Hire" button |
| 685 | `departmentDistribution.length > 0` | push dept-distribution |
| 688 | `viewType==='ADMIN'` | widget title variant |
| 719 | `viewType==='ADMIN' && payroll` | push payroll-summary |
| 894 | `viewType!=='EMPLOYEE'` | push new-joiners |
| 910 | `viewType==='ADMIN'` | onboarding buttons |

## Re-render / Perf Analysis
- **1-sec `currentTime` `setInterval`** (l.150–153) drives only 2 greeting strings yet re-renders the whole 1498-line tree and **rebuilds the 330-line `dashboardWidgets` array every tick** → `DashboardGrid` sees a new `widgets` ref every second (can't `React.memo`-bail).
- Zero `useMemo` on series/donut/widget derivations; helper fns + handlers re-created every render; 5 modal state vars in root re-render charts on open.

## Proposed Hierarchy (composition only, ≤500 lines/file)
```
DashboardPage (orchestrator, hooks + RQ + role predicates)
├── DashboardHero      ← 950–975  (+ isolated <LiveGreeting/> owns the 1-sec tick)
├── KPISection         ← 978–1063
├── AnalyticsSection   ← 1065–1151
├── ActivitySection    ← 1153–1244 attendance strip + 804–891 notifications + 3 modals
├── TeamSection        ← 677–716 dept-distribution + 893–929 new-joiners
└── InsightsSection    ← 644–675 quick-actions + 754–802 upcoming-events + 718–752 payroll-summary
```
**Perf fixes (no behavior change):**
1. Extract **`<LiveGreeting/>`** client component to localize the 1-sec tick → tree no longer re-renders every second.
2. `useMemo` analytics-derived series/donut/KPI values; `useMemo` the widget array on `[analytics, stable callbacks]`; `useCallback` handlers; hoist helper fns out of the component body.
3. Move modal state into the owning section (or context) so opening a modal doesn't re-render charts.
4. **Preserve the 3 `Array.push` role predicates EXACTLY** (relocated into KPI/Team/Insights builders, identical conditions).
5. *(Follow-up, optional)* wrap the 5 Google `fetch()` in a `useQuery` for cache/dedup — flagged, not required for parity.
**Outcome:** 1498 → ~6 files each <500 lines; 1-sec full-tree re-render eliminated; identical widgets/data/role-logic; visual output unchanged (operator screen — no elevation styling).
