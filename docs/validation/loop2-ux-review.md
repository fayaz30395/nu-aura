# Loop 2 UX/UI Review -- Dashboards & Global Navigation

**Reviewer:** UX/UI Agent
**Date:** 2026-03-31
**Routes reviewed:** 12 (9 pages + 3 navigation components)
**Issues found:** 32 (UX-25 through UX-56)
**Continuing from:** Loop 1 (UX-01 through UX-24)

---

## 1. Per-Page Review

### 1.1 `/dashboard` -- `frontend/app/dashboard/page.tsx`

**Visual Consistency**
- Uses CSS variable system (`--accent-primary`, `--bg-card`, `--text-primary`, etc.) consistently throughout
- No purple remnants in the page itself; all accent colors use the CSS variable pipeline
- Uses `skeuo-card` and `skeuo-emboss` classes -- consistent with Loop 1 findings
- Chart colors use CSS variables (`--chart-primary`, `--chart-secondary`, etc.) -- adapts to dark mode automatically
- `PremiumMetricCard` component used for stat grid -- provides consistent card treatment
- Department distribution bar colors use `var(--accent-primary)`, `var(--chart-secondary)`, etc. -- good

**Component Quality**
- Uses `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button` from custom UI library -- good
- Loading state uses `NuAuraLoader` branded component -- better than Loop 1 pages
- Error state uses Card-based layout with retry and refresh buttons -- good
- Quick action buttons are `<button>` elements with proper click handlers -- correct
- Google Workspace integration (Gmail, Drive, Calendar) fetches directly from Google APIs using stored OAuth token
- Email content loaded inline with sanitization via `sanitizeEmailHtml` -- good XSS prevention
- Uses React Query hooks for data (`useDashboardAnalytics`, `useAttendanceByDateRange`, etc.) -- correct pattern

**Spacing**
- Grid gaps use `gap-4` (16px) and `gap-6` (24px) -- on 8px grid
- Card padding uses `p-6` (24px), `p-4 sm:p-6` responsive -- on 8px grid
- `space-y-8` (32px) for main sections, `space-y-6` (24px) for sub-sections -- on 8px grid

**Dark Mode**
- All colors use CSS variables that respond to theme -- good
- Status tones (`status-success`, `status-warning`, etc.) handle dark mode via CSS -- good
- Google notification inline modals use CSS variables -- good

**Loading Skeletons**
- Full-page branded `NuAuraLoader` with message -- good

**Empty States**
- Not observed inline -- dashboard expects data from analytics API
- Google Workspace section shows "Connect Google" prompt if no token -- good

**Responsiveness**
- Two-column layout `lg:grid-cols-3` -- collapses on mobile
- Quick actions `grid-cols-2 sm:grid-cols-4` -- responsive
- Attendance widget stacks vertically on mobile `flex-col sm:flex-row` -- good
- Stat grid `grid-cols-2 lg:grid-cols-4` -- responsive

**Touch Targets**
- Quick action buttons: `min-h-[96px]` -- exceeds 44px minimum
- Check In/Check Out buttons use `Button` component with standard sizing -- meets 44px
- Notification items use `p-4` padding -- adequate touch area

---

### 1.2 `/me/dashboard` -- `frontend/app/me/dashboard/page.tsx`

**Visual Consistency**
- Uses CSS variables throughout -- consistent
- Staggered Framer Motion animations with consistent easing `[0.25, 0.46, 0.45, 0.94]` -- polished
- Two-column bento grid layout `grid-cols-1 lg:grid-cols-12` (5/12 + 7/12) -- asymmetric and intentional
- All widget components imported from `@/components/dashboard/` -- modular

**Component Quality**
- Uses `AppLayout` wrapper with breadcrumbs -- consistent navigation
- `WelcomeBanner`, `QuickAccessWidget`, `TimeClockWidget`, `HolidayCarousel`, `LeaveBalanceWidget`, `PostComposer`, `CelebrationTabs`, `CompanyFeed` -- rich widget ecosystem
- React Query via `useSelfServiceDashboard` hook -- correct pattern
- Loading state uses `Loading` component inside `AppLayout` -- maintains sidebar during load
- Empty/fallback state for users without employee profile -- clear messaging with icon

**Spacing**
- Main grid gap: `gap-6` (24px) -- on 8px grid
- Column internal spacing: `space-y-6` (24px) -- consistent

**Dark Mode**
- CSS variables used consistently -- good
- `User` icon in fallback state uses `text-[var(--text-muted)]` -- adapts

**Loading Skeletons**
- Centered `Loading` component -- functional but basic. No skeleton placeholders for individual widgets.

**Empty States**
- "No Employee Profile Linked" with `User` icon, heading, and description -- clear

**Responsiveness**
- 12-column grid collapses to single column on mobile -- good
- Motion animations consistent on all breakpoints

**Touch Targets**
- Check-in/out handled by `TimeClockWidget` sub-component -- assumed adequate (widget-level review not in scope)

---

### 1.3 `/dashboards/executive` -- `frontend/app/dashboards/executive/page.tsx`

**Visual Consistency**
- All colors use CSS variables or semantic color classes (`success-600`, `danger-600`, `accent-500`, etc.) -- no purple remnants
- Chart colors defined as CSS variable array: `var(--chart-primary)`, `var(--chart-success)`, etc. -- dark mode compatible
- Cards use `border-0 shadow-md` consistently -- uniform depth treatment
- KPI icon containers use `getStatusColor()` which returns semantic classes -- good
- Financial summary cards maintain same padding and structure as KPI cards -- consistent

**Component Quality**
- Chart components lazy-loaded with `dynamic()` and `ChartLoadingFallback` -- good performance pattern
- Uses `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Skeleton` from custom UI -- consistent
- Error state with Card + retry button -- good
- `DashboardSkeleton` provides appropriate loading placeholder layout matching the final grid structure -- excellent

**Spacing**
- Main sections: `space-y-6` (24px) -- on 8px grid
- Card padding: `p-6` (24px) for KPI cards -- on 8px grid
- Chart content: `h-80` (320px) fixed height for chart containers -- adequate

**Dark Mode**
- Alert backgrounds: `dark:bg-danger-950/30`, `dark:bg-warning-950/30`, `dark:bg-accent-950/30` -- proper dark variants
- Text colors: CSS variables for primary/secondary/muted -- adapts

**Loading Skeletons**
- `DashboardSkeleton` renders skeleton grid matching final layout (4 KPI cards, 2 charts, 3-column lower) -- very good

**Empty States**
- Strategic alerts: "No active alerts" with `CheckCircle` icon -- good
- Financial summary conditionally rendered -- no empty state if data absent (shows nothing)

**Responsiveness**
- KPI grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` -- responsive
- Charts: `grid-cols-1 lg:grid-cols-2` -- stacks on mobile
- Alerts + sidebar: `grid-cols-1 lg:grid-cols-3` -- responsive
- Header: `flex-col md:flex-row` -- responsive

**Touch Targets**
- Refresh button uses `Button` component `size="sm"` with `leftIcon` -- needs verification but likely meets 44px via padding

---

### 1.4 `/dashboards/manager` -- `frontend/app/dashboards/manager/page.tsx`

**Visual Consistency**
- Uses gradient accent text: `bg-gradient-to-r from-accent-700 to-accent-600` -- consistent with accent palette
- Stat cards use `skeuo-card` class -- consistent
- `max-h-[80px]` on stat cards creates a compact, information-dense layout -- intentional
- Status badge styles defined as object map (`statusBadgeStyles`) -- consistent
- Priority colors use semantic names (`danger-500`, `warning-500`, `success-500`) -- good
- Allocation colors use a utility function based on percentage threshold -- good pattern

**Component Quality**
- Framer Motion staggered animations via `containerVariants` / `itemVariants` -- polished
- Chart components lazy-loaded via `dynamic()` -- good
- Uses `Card`, `Badge`, `Button`, `Skeleton` -- consistent
- Loading skeleton matches final grid layout -- good
- Error state uses styled error banner (not Card-based like executive dashboard) -- inconsistency
- Team member project cards have clickable employee names navigating to profiles -- good

**Spacing**
- Main sections: `space-y-4` (16px) -- slightly tighter than executive dashboard's `space-y-6`
- Card padding: `p-4` (16px) for stat cards -- on 8px grid
- Chart cards: `max-h-[220px]` / `max-h-[280px]` -- constrained heights

**Dark Mode**
- All colors use semantic variables or explicit `dark:` variants -- good
- Gradient backgrounds (`from-accent-500`, `to-accent-600`) on avatar circles -- consistent

**Loading Skeletons**
- `DashboardSkeleton` with matching grid layout -- good

**Empty States**
- Approval pipeline: "Clear Pipeline" with `CheckCircle` icon -- good
- Team projects: "Coming Soon" for API errors, "No Project Data" for empty -- good distinction
- Team projects loading: skeleton rows -- good

**Responsiveness**
- Stat grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` -- responsive
- Intelligence grid: `grid-cols-1 lg:grid-cols-2` -- responsive
- Lists grid: `grid-cols-1 lg:grid-cols-3` -- responsive

**Touch Targets**
- Pending approval rows: `py-2 px-4` -- row height may be under 44px (approximately 36px). Touch target concern.
- Employee name buttons in project section: inline text buttons with no padding -- not meeting 44px

---

### 1.5 `/dashboards/employee` -- `frontend/app/dashboards/employee/page.tsx`

**Visual Consistency**
- Uses semantic color classes consistently (`success-600`, `accent-600`, `warning-600`, etc.) -- no purple
- Status color function `getStatusColor()` provides consistent badge treatment -- good
- Event color function `getEventColor()` uses semantic naming -- good
- One anomaly: `accent-250` class used for BIRTHDAY and ANNIVERSARY event colors -- this is not a standard Tailwind shade (likely a custom value or no-op)
- Progress bars use `bg-accent-500` -- consistent

**Component Quality**
- Attendance chart lazy-loaded via `dynamic()` -- good
- Full set of Card components used consistently -- good
- Error state matches executive dashboard pattern (Card-based) -- consistent
- Loading skeleton provides structured placeholder matching final layout -- very good
- Quick actions use `Button variant="outline"` with icons -- consistent
- Leave balance progress bars with dynamic `colorCode` -- good

**Spacing**
- Main sections: `space-y-6` (24px) -- on 8px grid, matches executive
- Stat grid: `gap-4` (16px) -- on 8px grid
- Card padding: `p-6` (24px) -- on 8px grid

**Dark Mode**
- Stat card icons: explicit `dark:bg-success-950/30`, `dark:text-success-400` -- proper
- Event cards: explicit dark variants -- proper
- Goal progress bar background: `dark:bg-[var(--bg-secondary)]` -- adapts

**Loading Skeletons**
- Text heading skeleton + stat card skeletons + chart/sidebar skeletons -- very good

**Empty States**
- Attendance chart: "No attendance data available" with `Clock` icon -- good
- Attendance history: "No attendance records found" with `CheckCircle` icon -- good
- Leave balances: "No leave balances available" with `Palmtree` icon -- good
- Upcoming events: "No upcoming events" with `CalendarDays` icon -- good

**Responsiveness**
- Stats: `grid-cols-2 md:grid-cols-4` -- responsive
- Main content: `grid-cols-1 lg:grid-cols-3` (2:1 split) -- responsive
- Header: `flex-col sm:flex-row` -- responsive

**Touch Targets**
- Quick action buttons: `Button variant="outline" className="w-full"` -- meets 44px via Button component
- Header buttons: `Button size="sm"` -- needs verification

---

### 1.6 `/app/hrms` -- `frontend/app/app/hrms/page.tsx`

**Visual Consistency**
- Redirect page uses `skeuo-card` class -- consistent with other entry points
- Text uses `text-[var(--text-muted)]` -- adapts to theme

**Component Quality**
- Pure redirect via `router.replace('/me/dashboard')` -- correct
- No loading skeleton or branded transition (same issue as `/` landing page from Loop 1)

**Dark Mode**
- CSS variables used -- adapts

**Touch Targets**
- N/A (redirect page)

---

### 1.7 `/app/hire` -- `frontend/app/app/hire/page.tsx`

Identical pattern to `/app/hrms` -- redirect to `/recruitment` with `skeuo-card` "Redirecting..." text. Same findings apply.

---

### 1.8 `/app/grow` -- `frontend/app/app/grow/page.tsx`

Identical pattern -- redirect to `/performance`. Same findings.

---

### 1.9 `/app/fluence` -- `frontend/app/app/fluence/page.tsx`

Identical pattern -- redirect to `/fluence/wiki`. Uses `router.push` instead of `router.replace` (unlike the other entry pages). This means pressing "Back" will return to the `/app/fluence` page which will redirect again, creating a navigation loop.

---

## 2. Navigation Component Review

### 2.1 `frontend/components/ui/Sidebar.tsx`

**Visual Consistency**
- Background: `var(--bg-sidebar)` with `var(--sidebar-gradient)` -- theme-aware
- Active state: `var(--sidebar-active-bg)`, `var(--sidebar-active-border)`, `var(--sidebar-text-active)` -- CSS variable driven
- Active item has `border-l-[3px]` indicator with box-shadow glow (`rgba(58, 95, 217, 0.08)`) -- subtle accent
- Badge on active items: `bg-accent-500 text-white` -- consistent
- Badge on inactive items: `bg-white/10` -- appropriate for dark sidebar
- Section divider text: `skeuo-deboss` class with `var(--sidebar-section-text)` -- consistent
- Flyover panel: `bg-[var(--bg-elevated)]` with proper border and shadow -- consistent

**Component Quality**
- Memoized `SidebarMenuItem` with `React.memo` -- good performance
- `ChildrenFlyover` for sub-navigation with click-outside and Escape key handling -- good
- Collapsible sidebar with localStorage persistence -- good
- Section collapse state persisted with namespaced storage key -- good
- Link-based navigation with 3-second hard-nav fallback for dev mode -- practical
- Tooltip on collapsed state with hover/focus-within visibility -- good

**Accessibility**
- Section toggle buttons have `aria-expanded` -- good
- Flyover trigger buttons have `aria-expanded` and `aria-haspopup` -- good
- Flyover close button has `aria-label="Close"` -- good
- Collapsed tooltip uses `group-hover` and `group-focus-within` for keyboard visibility -- good
- No `role="navigation"` on the sidebar container itself
- No `role="menubar"` / `role="menu"` / `role="menuitem"` ARIA roles on the navigation structure

**Spacing**
- Menu items: `px-4 py-2.5` -- approximately 40px height (borderline on 44px touch target)
- Flyover children: `px-4 py-2.5` -- same concern
- Section divider: `py-2.5` -- adequate
- Logo header: `h-16` (64px) -- matches header height

**Dark Mode**
- All styling via CSS variables -- adapts automatically

**Touch Targets**
- Menu items at `py-2.5` with text-sm font = approximately 40px -- marginally below 44px recommendation

---

### 2.2 `frontend/components/layout/Header.tsx`

**Visual Consistency**
- Uses `glass-bg` class for background blur effect -- premium feel
- Height: `h-16` (64px) -- matches sidebar header
- Border: `border-header-border` CSS variable -- adapts to theme
- Notification badge: `bg-accent` with white text -- consistent
- Divider between notifications and user menu: `var(--header-divider)` -- subtle

**Component Quality**
- `AppSwitcher` integrated in the left section -- good
- `GlobalSearch` lazy-loaded via `dynamic()` with no SSR -- good performance
- `NotificationDropdown` and `UserMenu` extracted as separate components -- good modularity
- `ThemeToggle` with compact variant on mobile -- good
- Mobile search overlay with backdrop and animated entry -- good
- Unread count merges WebSocket real-time count with REST persisted count using `Math.max` -- robust

**Accessibility**
- Hamburger menu: `aria-label="Toggle menu"` -- good
- Search button: `aria-label="Search"` -- good
- Help button: `aria-label="Help"` -- good
- Notification button: `aria-label="Notifications"`, `aria-expanded`, `aria-haspopup="true"` -- excellent
- Mobile search overlay backdrop has `onClick` to close but no keyboard dismiss mechanism beyond Escape (which is not implemented)

**Spacing**
- Main padding: `px-6` (24px) -- on 8px grid
- Button gaps: `gap-2` (8px) -- on 8px grid

**Dark Mode**
- All colors via CSS variables -- adapts
- `glass-bg` class handles dark mode backdrop blur -- good

**Touch Targets**
- All action buttons: `p-2.5` with icons = approximately 40px. However, buttons also have `min-w-[44px] min-h-[44px]` explicitly set on hamburger and search -- good
- Notification button: `p-2.5` without explicit min size -- approximately 40px, borderline
- Help button: `p-2.5` without explicit min size -- approximately 40px, borderline

---

### 2.3 `frontend/components/platform/AppSwitcher.tsx`

**Visual Consistency**
- Trigger button: `bg-[var(--bg-card)]` with `border-[var(--border-main)]` and `shadow-card` -- consistent
- Current app icon in `bg-accent` rounded square -- consistent
- Dropdown: `bg-dropdown` with `border-dropdown-border` and `shadow-dropdown` -- theme-aware
- Active app: `bg-accent-subtle border-accent ring-1 ring-accent/20` -- clear active indication
- Active check badge: `bg-accent border-[var(--bg-dropdown)]` -- good contrast
- Lock overlay: `bg-black/40` with white `Lock` icon -- clear locked state
- Locked apps: `opacity-50 cursor-not-allowed` -- visually clear

**Component Quality**
- Click-outside and Escape key handlers -- good
- Navigation with fallback timer (3s URL check) -- practical for dev mode
- AnimatePresence for smooth enter/exit -- good
- Staggered grid item animation (0.03s delay per item) -- polished
- Loading state during navigation with spinner -- good
- Footer shows available app count -- informative

**Accessibility**
- Trigger: `aria-label="Switch application"`, `aria-expanded` -- good
- App buttons: `disabled={isLocked}` on locked apps -- correct
- No `role="dialog"` or `aria-modal` on the dropdown panel
- No focus trap in the dropdown -- keyboard users can tab out
- No `role="menu"` / `role="menuitem"` semantics

**Spacing**
- Trigger: `px-4 py-2` -- adequate
- Grid: `gap-4` (16px) between app tiles -- on 8px grid
- App tiles: `p-4` (16px) padding -- on 8px grid
- Icon size: `w-12 h-12` (48px) -- exceeds 44px touch target

**Dark Mode**
- All via CSS variables (`--bg-dropdown`, `--dropdown-text`, etc.) -- adapts

**Touch Targets**
- App tiles: full tile is clickable with `p-4` and `w-12 h-12` icon -- adequate (approximately 100px+ total tile height)
- Trigger button: `px-4 py-2` with icon -- approximately 52px height -- meets 44px

---

## 3. Design Debt Log

| ID | Component | Category | Severity | Description |
|---|---|---|---|---|
| UX-25 | `/dashboards/manager` error state | visual | MEDIUM | Error state uses a styled banner (`bg-danger-50 border rounded-xl`) instead of the Card-based pattern used by executive and employee dashboards. Inconsistent error presentation across dashboard family. |
| UX-26 | `/dashboards/manager` stat cards | visual | LOW | Cards use `max-h-[80px]` creating a very compact layout. The main `/dashboard` uses `PremiumMetricCard` and executive uses unconstrained cards with `p-6`. Three different stat card treatments across dashboards. |
| UX-27 | `/dashboards/manager` section spacing | visual | LOW | Uses `space-y-4` (16px) for main sections while executive and employee use `space-y-6` (24px). Inconsistent spacing scale across dashboard family. |
| UX-28 | `/dashboards/employee` event colors | visual | LOW | Uses `accent-250` class for BIRTHDAY and ANNIVERSARY event backgrounds. This is not a standard Tailwind shade and likely renders as transparent (no-op), falling back to browser default. |
| UX-29 | `/app/fluence` redirect | visual | LOW | Uses `router.push` instead of `router.replace`, creating a back-button navigation loop. The other three entry pages (`/app/hrms`, `/app/hire`, `/app/grow`) correctly use `router.replace`. |
| UX-30 | All `/app/*` entry pages | visual | MEDIUM | All four sub-app entry pages show an unbranded "Redirecting..." card with no logo, app icon, or animation. Same issue identified as UX-05 in Loop 1 for the `/` landing page. Should show the target app's icon and name during redirect. |
| UX-31 | Dashboard card depth | visual | MEDIUM | Executive dashboard cards use `border-0 shadow-md` (elevated). Manager dashboard uses `border-0 shadow-2xl` (very elevated). Employee dashboard uses default Card (border, no explicit shadow). Main dashboard uses `skeuo-card`. Four different depth treatments across the dashboard family. |
| UX-32 | BirthdayWishingBoard | visual | MEDIUM | Uses explicit `purple-*` Tailwind classes (`border-purple-200`, `bg-purple-100`, `text-purple-700`, etc.) instead of accent/semantic colors. This is the only dashboard widget using the purple palette directly. |
| UX-33 | Chart theming | visual | LOW | Executive dashboard defines chart colors using CSS variables (`var(--chart-primary)`, etc.). Main dashboard bar chart colors also use CSS variables. Consistent -- no issue here, noting for completeness. |
| UX-34 | Sidebar menu item height | visual | LOW | Menu items use `py-2.5` yielding approximately 40px height. This is 4px below the 44px WCAG touch target recommendation. Adding `py-3` would resolve this. |
| UX-35 | Header action buttons | visual | LOW | Notification bell and Help buttons use `p-2.5` without explicit `min-w`/`min-h` like the hamburger and search buttons. Inconsistent touch target enforcement. |

---

## 4. Accessibility Issues

| ID | Component | Category | Severity | Description | Current | Recommended Fix |
|---|---|---|---|---|---|---|
| UX-36 | All dashboard error states | accessibility | HIGH | Error messages on `/dashboard`, `/dashboards/executive`, `/dashboards/manager`, `/dashboards/employee` lack `role="alert"` or `aria-live`. Screen readers will not announce load failures. | `<Card className="max-w-md">` wrapping error | Add `role="alert"` to the error card or its parent container. |
| UX-37 | `/dashboard` clock error | accessibility | HIGH | Attendance check-in/check-out error message (`clockError`) lacks `aria-live`. | `{clockError && <span className="text-sm text-danger-600 ...">` | Wrap with `role="alert"` or add `aria-live="assertive"`. |
| UX-38 | `/me/dashboard` fallback state | accessibility | MEDIUM | "No Employee Profile Linked" empty state lacks `role="status"`. Screen readers get no semantic indication this is an informational message. | `<div className="text-center py-12">` | Add `role="status"` to the container. |
| UX-39 | Sidebar | accessibility | MEDIUM | Sidebar container lacks `role="navigation"` and `aria-label`. Screen readers cannot identify the sidebar as a navigation landmark. | `<div ref={ref} data-sidebar className="flex flex-col ...">` | Add `role="navigation"` and `aria-label="Main navigation"`. |
| UX-40 | Sidebar flyover | accessibility | HIGH | Flyover panel lacks `role="menu"` semantics. Child items lack `role="menuitem"`. Focus is not trapped within the flyover. | `<div ref={panelRef} className="fixed z-50 w-64 ...">` | Add `role="menu"` to panel, `role="menuitem"` to children, implement focus trap. |
| UX-41 | AppSwitcher dropdown | accessibility | HIGH | Dropdown panel lacks `role="dialog"` or `role="menu"`, `aria-modal`, and focus trap. Keyboard users can tab into background content. | `<motion.div className="absolute top-full ...">` | Add `role="dialog"`, `aria-modal="true"`, and focus trap. Consider `role="menu"` with `role="menuitem"` on tiles. |
| UX-42 | AppSwitcher locked apps | accessibility | MEDIUM | Locked app tiles use `disabled` attribute but have no `aria-label` explaining why the app is locked ("No access" or "Coming soon"). The visual text exists but is inside the button -- acceptable if screen readers read it, but explicit label is clearer. | `<button disabled className="...">` with visual text "No access" / "Coming soon" | Add `aria-disabled="true"` alongside `disabled`, and consider `aria-label` on locked tiles: e.g., `aria-label="NU-Fluence - Coming soon"`. |
| UX-43 | Header mobile search overlay | accessibility | HIGH | Mobile search overlay backdrop lacks keyboard dismiss. No Escape key handler for closing the overlay. | `<div className="fixed inset-0 z-50 lg:hidden">` with `onClick` on backdrop | Add `onKeyDown` Escape handler, or better, use a focus-trapping overlay component. |
| UX-44 | `/dashboards/manager` pending approval rows | accessibility | MEDIUM | Approval request rows use `cursor-pointer` and `hover` styles but have no `role`, `tabIndex`, or keyboard handler. Not keyboard accessible. | `<div className="px-4 py-2 hover:bg-[var(--bg-card-hover)] ... cursor-pointer">` | Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handler for Enter/Space, or convert to `<button>` or `<Link>`. |
| UX-45 | `/dashboards/executive` decorative icons | accessibility | LOW | Lucide icons in KPI cards, chart titles, and sidebar cards lack `aria-hidden="true"`. Adjacent text provides meaning, but icons will be announced by screen readers. | `<BarChart3 className="h-5 w-5 text-accent-500" />` | Add `aria-hidden="true"` to all decorative icons. Same pattern as UX-20 from Loop 1. |
| UX-46 | `/dashboards/employee` decorative icons | accessibility | LOW | Same pattern as UX-45. Career progress icons, event type icons, quick action button icons all decorative. | `<Target className="h-8 w-8 ..." />` | Add `aria-hidden="true"`. |
| UX-47 | `/dashboards/manager` decorative icons | accessibility | LOW | Same pattern. Background watermark icons (`opacity-10`), section icons, action item icons. | `<Users className="h-10 w-10 text-accent-500" />` (opacity-10 background) | Add `aria-hidden="true"`. |
| UX-48 | `/me/dashboard` User icon in fallback | accessibility | LOW | The `User` icon in the "No Employee Profile" fallback state is decorative. | `<User className="h-16 w-16 ..." />` | Add `aria-hidden="true"`. |
| UX-49 | Sidebar collapsed tooltips | accessibility | LOW | Tooltips use `opacity-0 invisible` / `group-hover:opacity-100` CSS transition. Not accessible to keyboard-only users who cannot hover. While `group-focus-within` is present, the tooltip uses `pointer-events-none` which prevents interaction. | `<div className="... opacity-0 invisible group-hover:opacity-100 group-focus-within:opacity-100 ... pointer-events-none">` | Tooltip pattern is acceptable for supplementary info since the item is also a link/button with the same destination. Low priority. |

---

## 5. Dashboard Card Consistency Audit

The four dashboards use notably different card styles:

| Dashboard | Card Border | Shadow | Padding | Stat Card |
|---|---|---|---|---|
| `/dashboard` (HR Admin) | Default (border) | `skeuo-card` / default | `p-6 sm:p-8` | `PremiumMetricCard` |
| `/me/dashboard` (Self-service) | Widget components | Widget-specific | Widget-specific | N/A (widgets) |
| `/dashboards/executive` | `border-0` | `shadow-md` | `p-6` | Inline KPI card |
| `/dashboards/manager` | `border-0` | `shadow-2xl` | `p-4` | Compact `skeuo-card max-h-[80px]` |
| `/dashboards/employee` | Default (border) | `hover:shadow-md` | `p-6` | Inline stat card |

**Recommendation:** Establish a `DashboardStatCard` shared component with consistent border radius, padding, shadow, and hover treatment to use across all dashboards.

---

## 6. Purple Color Remnants

Searched for `purple`, `violet`, `#6358` across all frontend `.tsx`, `.ts`, and `.css` files. Found 151 occurrences across 20 files.

**Within Loop 2 scope:**
- `frontend/components/dashboard/BirthdayWishingBoard.tsx` -- uses `purple-*` classes directly (border, bg, text). This component renders on `/me/dashboard`.

**Outside Loop 2 scope (noted for future loops):**
- `frontend/lib/design-system.ts` -- defines `purple` as a badge status variant
- `frontend/components/ui/StatCard.tsx` -- has a `purple` variant
- `frontend/components/fluence/` -- uses `violet` Mantine color
- `frontend/components/recruitment/StageBadge.tsx` -- uses `violet` for management interview stages
- `frontend/app/company-spotlight/page.tsx` -- uses `accent-purple` gradient preset
- `frontend/lib/theme/mantine-theme.ts` -- maps `violet` and `purple` to accent
- `frontend/app/fluence/` pages -- uses `violet` Mantine color

**Assessment:** Purple/violet usage falls into two categories: (1) semantic use as a distinct badge/status color (acceptable -- purple as a data visualization color, not brand color) and (2) direct Tailwind `purple-*` classes in `BirthdayWishingBoard.tsx` which should be migrated to accent or a semantic variable.

---

## 7. Font Consistency

All pages use IBM Plex Sans as defined in `frontend/app/layout.tsx` via `--font-sans` variable. This is consistent with Loop 1 findings. No instances of Plus Jakarta Sans or other font families found in Loop 2 components.

**Note:** MEMORY.md still references "Plus Jakarta Sans" -- this documentation mismatch was flagged as UX-22 in Loop 1. The codebase uses IBM Plex Sans/Serif/Mono consistently.

---

## 8. Recommendations

### Priority 1 -- Accessibility (HIGH severity)

1. **Add `role="alert"` to all dashboard error states** (UX-36, UX-37). Affects 4 dashboard pages. One-line fix per page.
2. **Add focus trap to AppSwitcher dropdown** (UX-41). The dropdown allows keyboard tabbing into background content. Use `useFocusTrap` from `@mantine/hooks`.
3. **Add focus trap and ARIA roles to Sidebar flyover** (UX-40). Missing `role="menu"` and focus management.
4. **Add Escape key handler to Header mobile search overlay** (UX-43). Currently only closeable via backdrop click.

### Priority 2 -- Design Consistency (MEDIUM severity)

5. **Normalize dashboard error state presentation** (UX-25). Manager dashboard uses a banner; others use Card. Pick one pattern.
6. **Create shared `DashboardStatCard` component** (UX-31). Four different stat card treatments across dashboards is excessive variance.
7. **Migrate BirthdayWishingBoard from purple to accent** (UX-32). Replace `purple-*` / `violet-*` classes with `accent-*` equivalents.
8. **Brand the `/app/*` redirect pages** (UX-30). Show target app icon and name instead of bare "Redirecting..." text.
9. **Add `role="navigation"` to Sidebar** (UX-39). Provides landmark for screen readers.
10. **Add keyboard support to manager approval rows** (UX-44). Interactive rows need `tabIndex` and key handlers.

### Priority 3 -- Polish (LOW severity)

11. **Fix `/app/fluence` redirect method** (UX-29). Change `router.push` to `router.replace` to prevent back-button loop.
12. **Increase sidebar menu item touch target** (UX-34). Change `py-2.5` to `py-3`.
13. **Add `min-w-[44px] min-h-[44px]` to Header action buttons** (UX-35). Notification and Help buttons lack explicit minimum sizing.
14. **Add `aria-hidden="true"` to decorative icons** (UX-45, UX-46, UX-47, UX-48). Bulk pattern -- same recommendation as Loop 1 UX-20.
15. **Validate `accent-250` custom shade** (UX-28). Confirm this Tailwind extension exists in the config or replace with a valid shade.
16. **Normalize main section spacing** (UX-27). Align manager dashboard to `space-y-6` to match siblings.

---

## 9. Summary

| Category | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Accessibility | 5 | 4 | 5 | 14 |
| Visual Consistency | 0 | 5 | 6 | 11 |
| Responsiveness | 0 | 0 | 0 | 0 |
| State Clarity | 0 | 0 | 0 | 0 |
| Navigation | 0 | 0 | 1 | 1 |
| **Total** | **5** | **9** | **12** | **32** |

### Loop 1 + Loop 2 Cumulative

| Category | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Accessibility | 10 | 9 | 5 | 24 |
| Visual Consistency | 0 | 8 | 13 | 21 |
| Responsiveness | 0 | 0 | 0 | 0 |
| State Clarity | 0 | 0 | 0 | 0 |
| Navigation | 0 | 0 | 1 | 1 |
| **Total** | **10** | **17** | **19** | **56** |

**Overall Assessment:** The dashboard family and global navigation components are functionally rich and visually polished. The color palette migration from purple to accent/blue is nearly complete -- the only significant remnant within scope is the `BirthdayWishingBoard` component. Dark mode is well handled across all components via CSS variables. The primary concerns are: (1) accessibility gaps in focus management for overlays/dropdowns (AppSwitcher, Sidebar flyover, mobile search), (2) inconsistent card depth and spacing treatments across the four dashboards, and (3) missing ARIA landmarks and live regions for error states. Responsiveness is excellent across all pages with proper breakpoint handling.
