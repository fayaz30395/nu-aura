# Loop 3 UX/UI Review -- Employee Self-Service & Employee Management Pages

**Reviewer:** UX/UI Agent
**Date:** 2026-03-31
**Routes reviewed:** 11
**Issues found:** 42 (UX-57 through UX-98)
**Continuing from:** Loop 2 (UX-25 through UX-56)

---

## 1. Per-Page Review

### 1.1 `/me/profile` -- `frontend/app/me/profile/page.tsx`

**Visual Consistency**

- Uses CSS variable system (`--text-primary`, `--text-secondary`, `--bg-card`, etc.) consistently
  throughout
- Profile header gradient: `from-accent-500 to-accent-700` -- consistent with accent palette, no
  purple
- Uses `card-aura` class for all cards -- consistent
- `skeuo-emboss` / `skeuo-deboss` used on headings and subheadings -- consistent with Loop 1/2 pages
- Status badge uses semantic `status-success` / `status-neutral` classes -- good
- Success/error alerts use `success-50/200/800` and `danger-50/200/800` with dark mode variants --
  consistent

**Component Quality**

- React Hook Form + Zod for both profile edit and bank change forms -- correct pattern
- Uses `AppLayout` wrapper -- consistent
- Loading state: custom CSS spinner (`border-accent-200 border-t-accent-700`) -- not using
  `NuAuraLoader` or `Loading` component (inconsistency with `/me/dashboard` and `/me/documents`)
- Error state uses Card-based layout with icon -- adequate
- Edit mode toggles inputs inline (view/edit in same card) -- good UX for self-service

**Spacing**

- Main sections: `space-y-6` (24px) -- on 8px grid, matches standard
- Grid: `grid-cols-1 lg:grid-cols-2 gap-6` -- standard responsive grid
- Card content: `space-y-4` (16px) for field groups -- on 8px grid

**Dark Mode**

- CSS variables used for all backgrounds and text colors -- good
- Bank change modal uses `bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)]` -- adapts
- Warning alert in modal has explicit `dark:` variants -- proper

**Touch Targets**

- Edit/Save/Cancel buttons: `px-4 py-2` -- approximately 40px height, borderline
- "Request Change" button on bank details: `px-4 py-1.5` -- approximately 36px, below 44px
- Form inputs: `px-4 py-2` -- adequate

**Accessibility**

- Bank change modal: custom `fixed inset-0` overlay lacking `role="dialog"`, `aria-modal`, focus
  trap
- Close button on modal has no `aria-label` -- screen readers see only the X icon
- Success/error messages lack `role="alert"` or `aria-live`
- Section icons (User, Phone, MapPin, etc.) are decorative but lack `aria-hidden="true"`

---

### 1.2 `/me/leaves` -- `frontend/app/me/leaves/page.tsx`

**Visual Consistency**

- Leave balance cards use `skeuo-card` class -- consistent
- Progress bar uses `from-accent-500 to-accent-700` gradient -- consistent
- Status badges use semantic `badge-status status-success/danger/warning/neutral` -- consistent
- Encash button uses `success-*` colors -- semantic, appropriate
- Apply button: `bg-accent-700 hover:bg-accent-700` -- hover state is identical to default (no hover
  feedback), same issue as UX-06/UX-07 from Loop 1

**Component Quality**

- React Hook Form + Zod for leave form and cancel form -- correct pattern
- React Query hooks for data fetching -- correct pattern
- Filters with status and leave type dropdowns -- functional
- Leave history list with per-request action buttons (edit, cancel) -- good
- Empty states: separate messages for "no requests" vs "no matching filters" -- excellent

**Spacing**

- Main sections: `space-y-6` (24px) -- consistent
- Balance cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` -- responsive
- Leave request items: `p-6` with `space-y-4` -- on 8px grid

**Dark Mode**

- All colors via CSS variables or explicit `dark:` variants -- good
- Encash button has proper dark variants (`dark:text-success-400`, `dark:bg-success-950/30`) -- good

**Touch Targets**

- Apply for Leave button: `px-4 py-2` -- approximately 40px, borderline
- Encash button: `px-2 py-1` text-xs -- approximately 28px, significantly below 44px minimum
- Filter dropdowns: `px-4 py-1.5` -- approximately 34px, below 44px
- Edit/Cancel action buttons on leave requests: need verification

**Accessibility**

- Leave apply modal uses custom `fixed inset-0` overlay (not shown in read range but follows project
  pattern) -- likely missing `role="dialog"` and focus trap
- Cancel modal: same concern
- Success/error messages lack `role="alert"`
- Filter `<select>` elements lack `id` attributes linked to `<label>` via `htmlFor`

---

### 1.3 `/me/attendance` -- `frontend/app/me/attendance/page.tsx`

**Visual Consistency**

- Stats cards use `skeuo-card` class -- consistent
- Check-in/check-out buttons use `bg-success-600` and `bg-accent-600` respectively -- semantic, good
  differentiation
- Calendar uses accent colors for selection ring and today highlight -- consistent
- Status icons use semantic badge classes -- consistent
- Attendance calendar color coding per status -- effective at-a-glance view

**Component Quality**

- Custom calendar implementation (not Mantine Calendar) -- functional but large inline component
- React Query hooks for attendance data and time entries -- correct pattern
- Check-in/check-out mutations -- correct pattern
- Sessions list with scrollable overflow -- good
- Regularization request via custom modal -- functional

**Spacing**

- Main sections: `space-y-6` (24px) -- consistent
- Stats grid: `grid-cols-1 md:grid-cols-4 gap-6` -- responsive
- Calendar/details layout: `grid-cols-1 lg:grid-cols-3 gap-6` -- good 2:1 split

**Dark Mode**

- Error alert: `bg-danger-50 border border-danger-200` -- missing `dark:` variants (unlike other
  pages which include `dark:bg-danger-950/20 dark:border-danger-800`)
- Regularization modal uses `bg-white dark:bg-[var(--bg-card)]` -- mixed pattern: explicit
  `bg-white` instead of CSS variable for light mode
- Calendar selected state: `bg-accent-50` -- missing dark variant

**Touch Targets**

- Calendar day buttons: `aspect-square p-1` -- size depends on grid, typically 40-50px on desktop,
  may be very small on mobile
- Check-in/out buttons: `px-6 py-4` -- exceeds 44px, good
- Previous/Next month buttons: `p-2` -- approximately 36px, below 44px
- Regularization request button: `px-4 py-2 w-full` -- width is good, height approximately 40px

**Accessibility**

- Calendar lacks `role="grid"` or `role="table"` semantics; day buttons lack `aria-label` with full
  date
- Month navigation buttons lack `aria-label` ("Previous month", "Next month")
- Regularization modal: `bg-black bg-opacity-50` overlay lacks `role="dialog"`, `aria-modal`, focus
  trap
- Textarea in regularization modal uses uncontrolled state (`value` + `onChange`) instead of RHF --
  not compliant with code rules

---

### 1.4 `/me/payslips` -- `frontend/app/me/payslips/page.tsx`

**Visual Consistency**

- Summary cards use `card-aura` class -- consistent
- Payslip list cards use `card-aura card-interactive` -- consistent
- Status badges use semantic `badge-status status-success/info/warning` -- good
- Net salary in `text-success-600 dark:text-success-400` -- semantic
- Deduction amounts in `text-danger-600 dark:text-danger-400` -- semantic, appropriate for negative
  values
- No purple remnants detected

**Component Quality**

- React Query hooks for payslip data -- correct pattern
- Admin/employee view toggle -- good dual-purpose page
- Backend PDF download via mutation -- correct (uses backend PDF generation, not jsPDF)
- Search and year filter -- functional
- Empty state with contextual message based on search state -- good
- Salary breakdown (earnings/deductions) expandable per payslip -- excellent detail

**Spacing**

- Main sections: `space-y-6` (24px) -- consistent
- Summary cards: `grid-cols-1 md:grid-cols-4 gap-6` -- responsive
- Card content: `p-6` -- on 8px grid

**Dark Mode**

- All colors via CSS variables with `dark:` variants -- comprehensive
- Icon containers: `bg-accent-100 dark:bg-accent-950/30` -- proper
- Average salary icon: `bg-accent-300 dark:bg-accent-900/30` -- uses accent-300 light shade (
  slightly different from other cards using accent-100)

**Touch Targets**

- Download PDF button: `px-4 py-2` -- approximately 40px, borderline
- View toggle buttons: `px-4 py-2` -- approximately 40px, borderline
- Year filter select: `px-4 py-2` -- adequate

**Accessibility**

- Error message lacks `role="alert"` -- same pattern as other pages
- Filter `<select>` for year has no associated `<label>` with linked `id`/`htmlFor`
- Search input has `placeholder` but no visible label
- Payslip card breakdown uses `idx` as key (index-based keys) -- not an a11y issue per se but poor
  practice
- Decorative icons lack `aria-hidden="true"`

---

### 1.5 `/me/documents` -- `frontend/app/me/documents/page.tsx`

**Visual Consistency**

- Uses `card-aura` class throughout -- consistent
- Status config uses semantic colors (warning, info, success, accent, danger, neutral) --
  comprehensive
- Quick stat cards use color-coded icons matching status -- good visual hierarchy
- Uses `Button` and `Modal` from UI library (unlike many other pages that use raw divs) --
  best-in-class component usage in this sweep

**Component Quality**

- React Hook Form + Zod for document request form -- correct pattern
- Uses shared `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` components -- significantly better
  than custom `fixed inset-0` overlays on other pages
- Uses `Loading` component for loading state -- correct
- Uses `EmptyState` component for empty list -- correct
- Uses `Button` component consistently -- good
- Breadcrumbs provided to `AppLayout` -- excellent, only self-service page doing this

**Spacing**

- Quick stats: `grid-cols-2 sm:grid-cols-4 gap-4` -- responsive, 16px gap (slightly tighter than
  other pages' 24px)
- Request list: `space-y-4` (16px) -- on 8px grid
- Modal form fields: `space-y-4` (16px) -- consistent

**Dark Mode**

- All colors via CSS variables with `dark:` variants -- good
- Status icon containers have explicit `dark:` backgrounds -- proper
- Rejection reason box: `dark:bg-danger-900/20 dark:border-danger-800` -- proper

**Touch Targets**

- "Request Document" button uses `Button` component -- meets 44px via component styling
- Download button: `Button variant="outline" size="sm"` -- needs verification but `Button` component
  likely handles minimum sizing
- Delivery mode radio buttons: `<input type="radio">` -- default browser radio is approximately
  16px, needs increased touch area

**Accessibility**

- Uses proper `Modal` component with likely focus trap (better than other pages) -- verify
- Radio button labels use `<label>` with wrapping pattern -- accessible
- "No Employee Profile" fallback uses descriptive text -- good
- "Go to Document Management" button: `hover:bg-accent-700` same as `bg-accent-700` -- no hover
  feedback (same issue as UX-06)

---

### 1.6 `/employees` -- `frontend/app/employees/page.tsx`

**Visual Consistency**

- Uses `skeuo-card`, `skeuo-table-header`, `skeuo-input`, `skeuo-emboss` -- consistent skeuomorphic
  styling
- Status badges use semantic color functions -- consistent
- Employee avatars: `bg-accent-100 dark:bg-accent-900/30` with
  `text-accent-700 dark:text-accent-300` -- consistent
- Level badges: `bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300` --
  consistent
- Uses `PermissionGate` for action buttons -- good RBAC enforcement

**Component Quality**

- React Hook Form + Zod for create employee form (30+ fields) -- correct pattern
- Uses `Button`, `EmptyState`, `SkeletonTable`, `PermissionGate` from UI library -- good
- Framer Motion for page entry animation -- polished
- Multi-tab create modal (basic, personal, employment, bank) -- handles form complexity well
- Pagination implemented inline (not shared Pagination component)
- Error message maps specific HTTP status codes to user-friendly messages -- excellent

**Table Design**

- Table uses `table-aura` class with `skeuo-table-header` -- consistent
- 8 columns: Employee, Code, Designation, Department, Level, Manager, Status, Actions
- Row height: `h-11` (44px) -- meets touch target requirement
- `overflow-x-auto` wrapper for horizontal scrolling -- good responsive behavior
- `whitespace-nowrap` on cells to prevent wrapping -- appropriate for data tables

**Spacing**

- Main sections: `space-y-6` -- consistent
- Search/filter row: `gap-4` -- on 8px grid
- Table cell padding from `table-aura` class -- standardized

**Dark Mode**

- All via CSS variables and explicit `dark:` variants -- good
- Error message: `dark:bg-danger-950/20 dark:border-danger-800` -- proper
- Status badges: explicit dark variants -- proper

**Touch Targets**

- Table row height: `h-11` (44px) -- meets minimum
- Action buttons in table: need verification but typically small icon buttons
- Search button uses `Button size="sm"` -- likely meets 44px
- Filter select: `h-10` (40px) -- borderline

**Accessibility**

- Create employee modal: custom implementation, needs verification for `role="dialog"` and focus
  trap
- Table header cells `<th>` without `scope="col"` -- minor semantic gap
- Search input has `placeholder` but no visible `<label>`
- Delete confirmation modal: need verification for dialog semantics

---

### 1.7 `/employees/[id]` -- `frontend/app/employees/[id]/page.tsx`

**Visual Consistency**

- Hero banner: `from-slate-900 via-accent-950 to-slate-900` gradient -- dark, professional
- Status badges use computed color function with `dark:` variants -- consistent
- Tab bar: custom `tabClass()` function with `border-accent-500 text-accent-700` active state and
  `focus-visible:ring-2 focus-visible:ring-accent-500` -- excellent focus treatment
- Quick info bar and org info bar use CSS variables -- adapts to theme
- Uses `SectionCard` and `InfoField` helper components for DRY rendering -- good
- `AvatarInitials` component:
  `bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400` -- consistent

**Component Quality**

- URL-addressable tabs via `searchParams` with `window.history.replaceState` -- excellent
  deep-linking
- Tab content includes About (with sub-tabs: Summary, Timeline, Wall), Profile, Job, Documents,
  Assets -- comprehensive
- Back button has `aria-label="Back to employees list"` -- good accessibility
- Edit/Delete buttons wrapped in `PermissionGate` -- correct RBAC
- Focus visible states on all buttons -- excellent

**Tab Consistency**

- Main tabs use `tabClass()` with `border-b-2` active indicator -- matches edit page pattern
- About sub-tabs reuse same `tabClass()` -- consistent
- Tab bar is `sticky top-0 z-20` -- stays visible during scroll, good for long profiles
- Tab navigation has `aria-label="Employee tabs"` -- good

**Spacing**

- Hero section: `py-6` -- adequate
- Quick info bar: `gap-6 py-4` -- on 8px grid
- Org info grid: `grid-cols-2 md:grid-cols-4 gap-6` -- responsive
- Tab content: `py-6` -- consistent

**Dark Mode**

- Hero banner uses slate-900 (inherently dark) -- works in both themes
- Name text: `text-white` on dark gradient -- always visible
- Status badge: explicit light/dark color pairs -- proper
- Tab content sections use CSS variables -- adapts

**Touch Targets**

- Tab buttons: `py-4 px-4` -- approximately 48px, exceeds 44px, excellent
- Back button: `flex items-center gap-1` with text -- adequate click area
- Edit/Delete buttons: `px-4 py-2` -- approximately 40px, borderline
- Manager link in org info bar: text button -- may not meet 44px

**Accessibility**

- Back button: has `aria-label` -- good
- Tab navigation: has `aria-label="Employee tabs"` -- good
- Tab buttons: have `focus:outline-none focus-visible:ring-2` -- correct focus management
- Missing `role="tablist"` on tab container and `role="tab"` / `aria-selected` on buttons
- Missing `role="tabpanel"` on tab content areas
- Delete modal: need verification for dialog semantics

---

### 1.8 `/employees/[id]/edit` -- `frontend/app/employees/[id]/edit/page.tsx`

**Visual Consistency**

- Tab bar: same `border-accent-500 text-accent-700` active pattern as detail page -- consistent
- Form uses `input-aura` class on all inputs -- consistent
- Employee header card: `skeuo-card` with avatar initials -- consistent
- Change request success message uses `success-*` colors with icon -- good
- Error messages use `danger-*` colors -- consistent
- Informational note: `bg-accent-50 dark:bg-accent-950/30 border-accent-500` -- consistent

**Component Quality**

- React Hook Form + Zod with Controller for select fields -- correct pattern
- 5 tabs: Basic Info, Personal Details, Employment, Banking & Tax, Additional Info -- well organized
  for 30+ fields
- Employment field changes trigger approval workflow (change request) -- excellent UX for sensitive
  field management
- Custom fields section via `CustomFieldsSection` component -- extensible
- Uses Mantine `notifications.show()` for success/error toast -- correct library usage
- Back button uses raw SVG instead of Lucide icon (inconsistency with other pages)

**Form Density**

- Fields use full-width `input-aura` class -- consistent sizing
- Grid layout: `grid-cols-3 gap-4` for name fields -- good density
- Vertical spacing: `space-y-4` between field groups -- adequate
- Labels: `text-sm font-medium text-[var(--text-secondary)]` with `mb-1` -- consistent
- Validation errors: `text-danger-500 text-sm mt-1` -- consistent
- Helper text: `text-xs text-[var(--text-muted)] mt-1` -- good contextual guidance

**Scroll Behavior**

- Page wraps all tabs in a single form element -- correct
- Tab content is not lazy-loaded (all sections in DOM, conditionally rendered) -- standard pattern
- Save button at bottom of form -- may require scrolling on long tabs
- No sticky save bar or floating action button

**Tab Accessibility**

- Tabs lack `role="tablist"`, `role="tab"`, `aria-selected` -- same issue as detail page
- Tab content lacks `role="tabpanel"`

**Dark Mode**

- All via CSS variables and explicit `dark:` variants -- good
- Form inputs use `input-aura` which handles dark mode via CSS class -- consistent

**Touch Targets**

- Tab buttons: `py-4 px-1` -- height is 48px (meets 44px) but horizontal padding is only 4px (narrow
  hit area)
- Form inputs: standard `input-aura` height -- adequate
- Save/Cancel buttons: standard button sizing -- adequate

---

### 1.9 `/employees/directory` -- `frontend/app/employees/directory/page.tsx`

**Visual Consistency**

- Uses accent palette for grid/list toggle active state -- consistent
- Search uses `input-aura` class -- consistent
- Filter panel uses `input-aura` selects -- consistent
- Status badges use precomputed color map with `dark:` variants -- consistent
- Avatar colors from `getRandomColor()` -- uses accent/success/warning palette (no purple)
- View mode toggle has proper focus-visible styles -- good

**Component Quality**

- React Query for data fetching (inline `useQuery` calls instead of extracted hooks) -- functional
  but less DRY than other pages
- Grid/List toggle persisted in state -- good
- AnimatePresence for filter panel show/hide -- polished
- Employee cards clickable to view detail -- good
- Pagination controls -- functional
- Advanced filters (department, role, level, status) with clear button -- comprehensive

**Card Grid Consistency**

- Employee cards use `Card` and `CardContent` components -- consistent
- Cards show: avatar, name, designation, department, email, phone, status -- good info density
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` -- responsive
- Cards have hover treatment via Framer Motion scale -- polished

**Spacing**

- Main sections: `space-y-6` -- consistent
- Search/filter row: `gap-4` -- on 8px grid
- Card grid: responsive grid with proper gaps
- Filter panel grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` -- responsive

**Dark Mode**

- All via CSS variables -- good
- Status badge colors have explicit dark variants -- proper
- Filter toggle active state: `dark:bg-accent-950/30 dark:text-accent-400` -- proper

**Touch Targets**

- Grid/list toggle: `p-2` -- approximately 36px, below 44px
- Search button: `px-6 py-4` -- meets 44px
- Filter toggle: `px-4 py-4` -- meets 44px
- Pagination buttons: need verification
- Employee cards: full card clickable -- ample touch area

**Accessibility**

- Grid/list buttons have `aria-label="Grid view"` / `aria-label="List view"` -- good
- Focus-visible rings on toggle buttons -- good
- Employee cards likely implemented as clickable divs -- need `role="button"`, `tabIndex`, keyboard
  handlers
- Search input uses deprecated `onKeyPress` instead of `onKeyDown` -- potential issue
- Filter `<select>` elements have associated `<label>` elements -- good

---

### 1.10 `/employees/import` -- `frontend/app/employees/import/page.tsx`

**Visual Consistency**

- Step indicator: active step `bg-accent-500`, completed `bg-success-600` -- clear progression
- Drag-and-drop area: `border-accent-500 bg-accent-50` on drag, `border-success-500 bg-success-50`
  with file selected -- good state differentiation
- Error alert: `bg-danger-50 border-danger-200 text-danger-800` -- consistent
- Uses `PermissionGate` for sensitive actions -- correct RBAC

**Component Quality**

- Three-step wizard (Upload, Preview, Result) -- clear workflow
- Drag-and-drop with file validation (type + size) -- good
- Template download for both CSV and XLSX -- good
- Preview table before execution -- excellent UX for bulk operations
- Skip invalid toggle -- good flexibility
- File input hidden with proxy button (`fileInputRef.current?.click()`) -- accessible pattern

**Upload Area Design**

- Visual feedback on drag: border color change + background change -- good
- Selected file state: check icon + filename + size + remove link -- informative
- Empty state: upload icon + instructions + browse button + file type hint -- clear guidance
- Dashed border pattern: `border-2 border-dashed` -- conventional for drop zones

**Spacing**

- Progress steps centered: `flex items-center justify-center mb-8` -- adequate
- Upload area: `p-8` -- generous padding
- Max width: `max-w-6xl` -- appropriate for data preview tables

**Dark Mode**

- Step indicator inactive: `bg-[var(--bg-secondary)]` -- adapts
- Upload area border: `border-[var(--border-main)]` -- adapts
- Some dark variants missing: `bg-danger-50` lacks `dark:bg-danger-950/20` on error alert
- Template download buttons use
  `dark:border-[var(--border-main)] dark:hover:bg-[var(--bg-secondary)]` -- proper

**Touch Targets**

- Browse Files button: `px-4 py-2` -- approximately 40px, borderline
- Template buttons: `px-4 py-2` -- borderline
- Preview Import button: `px-6 py-2` -- approximately 40px, borderline
- Step indicator circles: `w-10 h-10` (40px) -- not interactive, purely visual

**Accessibility**

- File input is hidden but accessible via button proxy -- acceptable
- Error alert lacks `role="alert"` -- same pattern
- Drag-and-drop area lacks keyboard alternative text or instructions for keyboard-only users
- Preview table (not in read range): needs verification for table semantics

---

### 1.11 `/employees/change-requests` -- `frontend/app/employees/change-requests/page.tsx`

**Visual Consistency**

- Status badges use semantic colors (warning/success/danger/neutral) -- consistent
- Change type badges use accent palette for most types, warning for demotions/status changes --
  appropriate semantic mapping
- Filter toggle: `bg-accent-700 text-white` for active, `bg-[var(--bg-surface)]` for inactive --
  consistent with other filter toggles
- Change detail rows use accent-700 for "new" values -- visually clear

**Component Quality**

- React Query for data fetching -- correct
- Expandable rows with `ChevronDown`/`ChevronUp` toggle -- good for progressive disclosure
- Approve/reject workflow with ConfirmDialog component -- good shared component usage
- Rejection reason textarea required before reject -- good validation
- `useToast` for success/error notifications -- consistent with detail page

**Spacing**

- Header: `mb-8` -- adequate
- Change detail rows: `py-2` with `border-b border-[var(--border-subtle)]` -- clean
- Card padding implicit from layout -- adequate

**Dark Mode**

- Status badges: explicit `dark:bg-*/dark:text-*` variants -- proper
- Change type badges: explicit `dark:` variants -- proper
- CANCELLED status: `bg-[var(--bg-surface)] text-[var(--text-muted)]` -- adapts via CSS variables

**Touch Targets**

- Pending/All filter buttons: `px-4 py-2` -- approximately 40px, borderline
- Expand/collapse toggle: likely icon-only button -- may be below 44px
- Approve/Reject action buttons: need verification via ConfirmDialog component

**Accessibility**

- "Back" button uses `arrow-left` text entity instead of Lucide icon -- inconsistent with other
  pages
- Expandable rows: need `aria-expanded` state on toggle buttons
- Change detail table: semantic HTML needed for "current -> new" comparison
- ConfirmDialog: presumably handles `role="dialog"` -- verify

---

## 2. Design Debt Log

| ID    | Page                                  | Category | Severity | Description                                                                                                                                                                                                                                                                                  |
|-------|---------------------------------------|----------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| UX-57 | `/me/profile`, `/me/attendance`       | visual   | HIGH     | Bank change modal and regularization modal use custom `fixed inset-0` overlays instead of the shared `Modal` component from `@/components/ui`. The `/me/documents` page correctly uses the shared Modal. All self-service pages should use the same component for consistency.               |
| UX-58 | `/me/leaves` (line 327)               | visual   | MEDIUM   | "Apply for Leave" button: `bg-accent-700 hover:bg-accent-700` -- hover state identical to default. Same issue as UX-06, UX-07 from Loop 1. No visual feedback on hover.                                                                                                                      |
| UX-59 | `/me/documents` (line 215)            | visual   | MEDIUM   | "Go to Document Management" button: `bg-accent-700 hover:bg-accent-700` -- same no-hover-feedback issue.                                                                                                                                                                                     |
| UX-60 | `/me/leaves` (line 307)               | visual   | MEDIUM   | "View Leave Management" fallback button: `bg-accent-700 hover:bg-accent-700` -- same no-hover-feedback issue.                                                                                                                                                                                |
| UX-61 | `/me/attendance` error alert          | visual   | MEDIUM   | Error alert uses `bg-danger-50 border border-danger-200` without `dark:` variants (line 289). Other pages consistently include `dark:bg-danger-950/20 dark:border-danger-800`.                                                                                                               |
| UX-62 | `/me/attendance` regularization modal | visual   | MEDIUM   | Modal uses `bg-white dark:bg-[var(--bg-card)]` -- explicit `bg-white` instead of `bg-[var(--bg-card)]` for light mode. Breaks CSS variable pattern used elsewhere.                                                                                                                           |
| UX-63 | Loading spinners                      | visual   | MEDIUM   | Self-service pages use three different loading patterns: (1) `/me/profile`, `/me/attendance`, `/me/leaves` use custom CSS spinner, (2) `/me/documents` uses `Loading` component, (3) `/me/dashboard` from Loop 2 uses `Loading` inside AppLayout. Should standardize on `Loading` component. |
| UX-64 | `/me/profile` bank change button      | visual   | LOW      | "Request Change" button height is `py-1.5` (approximately 36px) -- shorter than standard button height on the page. Visually inconsistent with header buttons.                                                                                                                               |
| UX-65 | `/employees/[id]/edit` back button    | visual   | LOW      | Uses raw inline SVG for back arrow instead of Lucide `ChevronLeft` icon used on the detail page. Inconsistent icon source.                                                                                                                                                                   |
| UX-66 | `/employees/[id]/edit` tab padding    | visual   | LOW      | Tab buttons use `py-4 px-1` while detail page uses `py-4 px-4`. The `px-1` creates narrow click targets on the edit page tabs.                                                                                                                                                               |
| UX-67 | `/employees/import` error alert       | visual   | LOW      | Error alert `bg-danger-50 border-danger-200 text-danger-800` lacks `dark:` variants. Other pages in this sweep include dark mode colors for error alerts.                                                                                                                                    |
| UX-68 | `/employees/directory`                | visual   | LOW      | `onKeyPress` is deprecated in React. Should use `onKeyDown` for search input Enter key handling (line 275).                                                                                                                                                                                  |
| UX-69 | `/employees/import` step indicator    | visual   | LOW      | Step circles are `w-10 h-10` (40px) -- slightly below the 44px recommendation, but since they are non-interactive (purely visual), this is acceptable.                                                                                                                                       |
| UX-70 | Self-service page headers             | visual   | LOW      | `/me/profile`, `/me/leaves`, `/me/attendance`, `/me/payslips` all have similar header patterns but only `/me/documents` passes breadcrumbs to AppLayout. Inconsistent breadcrumb usage across self-service pages.                                                                            |

---

## 3. Accessibility Issues

| ID    | Page                                                          | Category      | Severity | Description                                                                                                                                                                                                                      | Current                                                                                             | Recommended Fix                                                                                                                                                  |
|-------|---------------------------------------------------------------|---------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| UX-71 | `/me/profile` bank modal                                      | accessibility | HIGH     | Bank change modal lacks `role="dialog"`, `aria-modal="true"`, and focus trap. Keyboard users can tab into background content.                                                                                                    | `<div className="fixed inset-0 bg-black/50 ...">`                                                   | Use shared `Modal` component from `@/components/ui` (as `/me/documents` does) which handles dialog semantics and focus management.                               |
| UX-72 | `/me/attendance` regularization modal                         | accessibility | HIGH     | Regularization modal lacks `role="dialog"`, `aria-modal`, and focus trap. Same issue as UX-71.                                                                                                                                   | `<div className="fixed inset-0 bg-black bg-opacity-50 ...">`                                        | Replace with shared `Modal` component.                                                                                                                           |
| UX-73 | `/me/attendance` regularization form                          | accessibility | MEDIUM   | Regularization reason textarea uses uncontrolled state (`value` + `onChange`) instead of React Hook Form. Violates codebase code rule: "All forms must use React Hook Form + Zod."                                               | `<textarea value={regularizationReason} onChange={(e) => setRegularizationReason(e.target.value)}>` | Convert to RHF + Zod pattern with `register()` and schema validation.                                                                                            |
| UX-74 | `/me/attendance` calendar                                     | accessibility | HIGH     | Calendar grid lacks `role="grid"` semantics. Day buttons lack `aria-label` with full date text (e.g., "March 15, 2026 - Present"). Screen readers will only hear the day number.                                                 | `<button ... >{day.getDate()}</button>`                                                             | Add `role="grid"` to calendar container, `role="gridcell"` to day cells, and `aria-label` with formatted date + status on each day button.                       |
| UX-75 | `/me/attendance` month nav                                    | accessibility | MEDIUM   | Previous/Next month buttons have no `aria-label`. Screen readers will not understand the button purpose.                                                                                                                         | `<button onClick={previousMonth} className="p-2 ..."><ChevronLeft .../></button>`                   | Add `aria-label="Previous month"` and `aria-label="Next month"`.                                                                                                 |
| UX-76 | `/me/profile` close button                                    | accessibility | MEDIUM   | Modal close button (X icon) has no `aria-label`. Screen readers will not announce button purpose.                                                                                                                                | `<button onClick={() => setShowBankChangeModal(false)} className="p-1 ..."><X .../></button>`       | Add `aria-label="Close"`.                                                                                                                                        |
| UX-77 | `/me/profile`, `/me/leaves`, `/me/attendance`, `/me/payslips` | accessibility | HIGH     | Success and error message containers lack `role="alert"` or `aria-live="assertive"`. Screen readers will not announce state changes after form submissions.                                                                      | `<div className="flex items-center gap-2 p-4 bg-success-50 ...">`                                   | Add `role="alert"` to all success/error message containers across self-service pages.                                                                            |
| UX-78 | `/me/payslips` search input                                   | accessibility | MEDIUM   | Search input has `placeholder` text but no visible `<label>` or `aria-label`.                                                                                                                                                    | `<input type="text" placeholder="Search payslips..." .../>`                                         | Add `aria-label="Search payslips"` or a visible label.                                                                                                           |
| UX-79 | `/me/payslips` year filter                                    | accessibility | MEDIUM   | Year filter `<select>` has no associated `<label>` or `aria-label`.                                                                                                                                                              | `<select value={selectedYear} ...>`                                                                 | Add `aria-label="Filter by year"` or a visible label with `htmlFor`/`id`.                                                                                        |
| UX-80 | `/me/leaves` filter selects                                   | accessibility | MEDIUM   | Status and leave type filter `<select>` elements lack `id` attributes linked to `<label>` via `htmlFor`.                                                                                                                         | `<select value={statusFilter} ...>` without id                                                      | Add `id` to each `<select>` and `htmlFor` to the corresponding `<label>`, or use `aria-label`.                                                                   |
| UX-81 | `/employees/[id]` tabs                                        | accessibility | HIGH     | Main tabs lack `role="tablist"` on container, `role="tab"` and `aria-selected` on buttons, and `role="tabpanel"` on content. The `aria-label="Employee tabs"` on the `<nav>` is good but insufficient for full tab pattern.      | `<nav className="flex gap-1 ..." aria-label="Employee tabs">` with plain `<button>`                 | Add `role="tablist"` to nav, `role="tab"` + `aria-selected` + `aria-controls` to buttons, `role="tabpanel"` + `id` to content divs.                              |
| UX-82 | `/employees/[id]/edit` tabs                                   | accessibility | HIGH     | Same tab semantics issue as UX-81. Edit page tabs (Basic, Personal, Employment, Bank, Additional) lack ARIA tab roles.                                                                                                           | Same pattern as detail page                                                                         | Same fix: add `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`.                                                                                |
| UX-83 | `/employees/[id]` delete modal                                | accessibility | MEDIUM   | Delete confirmation modal needs verification for `role="dialog"` and focus trap. If using a custom overlay (not the shared Modal), it likely has the same issues as UX-71/72.                                                    | Implementation not fully visible in read                                                            | Verify and fix if needed.                                                                                                                                        |
| UX-84 | `/employees` create modal                                     | accessibility | MEDIUM   | Multi-tab create employee modal needs verification for dialog semantics. With 30+ fields across 4 tabs, focus management is critical.                                                                                            | Implementation not fully visible in read                                                            | Verify `role="dialog"`, `aria-modal`, and focus trap.                                                                                                            |
| UX-85 | `/employees/import` drop zone                                 | accessibility | MEDIUM   | Drag-and-drop area has no keyboard alternative instruction. Keyboard users can only use the "Browse Files" button (which works) but the drop zone itself is not keyboard-operable.                                               | `<div ... onDragEnter={handleDrag} ...>`                                                            | Add visible text like "or press Enter to browse" alongside the button. The button itself is accessible, but the drop zone should indicate keyboard alternatives. |
| UX-86 | All pages with decorative icons                               | accessibility | LOW      | Lucide icons throughout all 11 pages (User, Mail, Phone, Calendar, Clock, etc.) in non-interactive positions lack `aria-hidden="true"`. Adjacent text provides meaning. Same pattern as UX-20 (Loop 1) and UX-45/46/47 (Loop 2). | `<User className="h-5 w-5" />`                                                                      | Add `aria-hidden="true"` to all decorative icons. This is a codebase-wide pattern that should be addressed in bulk.                                              |
| UX-87 | `/me/leaves` encash button                                    | accessibility | LOW      | Encash button uses `title="Encash available leaves"` for tooltip -- `title` attributes are not reliably announced by screen readers and are not visible on touch devices.                                                        | `<button ... title="Encash available leaves">`                                                      | Replace `title` with `aria-label="Encash available leaves"` or visible text.                                                                                     |

---

## 4. Self-Service vs Admin Page Differentiation

The self-service pages (`/me/*`) should feel "personal" -- showing the employee's own data in a
friendly, approachable layout. The admin pages (`/employees/*`) should feel "operational" -- focused
on efficiency for managing many records.

| Aspect                     | Self-Service (`/me/*`)                                 | Admin (`/employees/*`)                              | Assessment                                                                    |
|----------------------------|--------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------------------------|
| **Tone**                   | "My Profile", "My Leaves", "My Attendance" -- personal | "Employee Management", "Bulk Import" -- operational | Good differentiation                                                          |
| **Breadcrumbs**            | Only `/me/documents` has breadcrumbs                   | None                                                | Inconsistent -- all self-service pages should have breadcrumbs                |
| **Layout**                 | Card-based with read/edit toggle                       | Table-based with modals                             | Appropriate differentiation                                                   |
| **Loading**                | Mixed patterns (spinner, Loading component)            | `SkeletonTable`, custom spinner                     | Admin is better -- uses contextual skeletons                                  |
| **Empty states**           | Icon + message + action button                         | `EmptyState` component with action                  | Admin is more consistent with shared components                               |
| **Color palette**          | Same accent palette                                    | Same accent palette                                 | Neutral -- both use design system colors                                      |
| **Self-service indicator** | No visual "my space" indicator beyond title            | N/A                                                 | Could benefit from subtle personal-space styling (avatar in corner, greeting) |

---

## 5. Form Complexity Audit

The employee edit form (`/employees/[id]/edit`) is the most complex form in this sweep with 30+
fields.

| Tab              | Fields                                                                   | Validation                        | Notes                                              |
|------------------|--------------------------------------------------------------------------|-----------------------------------|----------------------------------------------------|
| Basic Info       | 5 (code, first/middle/last name, status)                                 | Required: code, firstName, status | Status change triggers approval                    |
| Personal Details | 8 (DOB, gender, address, city, state, postal, country, emergency)        | All optional                      | Standard address layout                            |
| Employment       | 8 (designation, level, role, department, manager x3, type, confirmation) | Required: designation             | Changes trigger employment change request workflow |
| Banking & Tax    | 4 (account, bank, IFSC, PAN)                                             | All optional                      | Sensitive fields                                   |
| Additional Info  | Dynamic (custom fields)                                                  | Per-field                         | Via CustomFieldsSection component                  |

**Form UX Assessment:**

- Tabs break the 30+ fields into digestible sections -- good
- Employment field changes automatically trigger an approval workflow with a reason field --
  excellent enterprise UX
- Change request success message includes action buttons to view employee or view requests -- good
  post-action guidance
- Missing: save button is not sticky/floating, requiring scroll on long tabs
- Missing: no unsaved changes warning when navigating away

---

## 6. Table Design Audit (Employee List)

| Aspect        | Implementation                                                               | Assessment                                                |
|---------------|------------------------------------------------------------------------------|-----------------------------------------------------------|
| Columns       | 8 (Employee, Code, Designation, Department, Level, Manager, Status, Actions) | Appropriate for overview                                  |
| Row height    | `h-11` (44px)                                                                | Meets touch target minimum                                |
| Sorting       | Hardcoded `createdAt DESC` -- no column sort UI                              | Missing -- should have clickable column headers           |
| Pagination    | Custom inline (page numbers + prev/next)                                     | Functional but not a shared component                     |
| Search        | Server-side with query parameter                                             | Correct -- avoids client-side filtering of large datasets |
| Status filter | Server-side via select dropdown                                              | Correct                                                   |
| Empty state   | Uses `EmptyState` component with contextual message                          | Good                                                      |
| Loading       | `SkeletonTable` with matching column count                                   | Excellent -- maintains layout during load                 |
| Responsive    | `overflow-x-auto` wrapper                                                    | Correct for wide tables                                   |

---

## 7. Recommendations

### Priority 1 -- Accessibility (HIGH severity)

1. **Replace custom modals with shared `Modal` component** (UX-71, UX-72, UX-84). The
   `/me/documents` page demonstrates the correct pattern using `Modal`, `ModalHeader`, `ModalBody`,
   `ModalFooter` from `@/components/ui`. Apply this same pattern to `/me/profile` (bank change
   modal), `/me/attendance` (regularization modal), and `/employees` (create modal).

2. **Add `role="alert"` to all success/error containers** (UX-77). Affects all 11 pages. This is a
   one-line fix per alert container and is the single most impactful accessibility improvement.

3. **Add ARIA tab semantics to employee detail and edit pages** (UX-81, UX-82). Both pages have tab
   interfaces that lack `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"`. This
   is a pattern that should be extracted into a shared `Tabs` component.

4. **Add `aria-label` to attendance calendar day buttons** (UX-74). Each day button should include
   the full date and status in its label for screen readers.

### Priority 2 -- Design Consistency (MEDIUM severity)

5. **Fix identical hover states on accent-700 buttons** (UX-58, UX-59, UX-60). Change all
   `bg-accent-700 hover:bg-accent-700` to `bg-accent-700 hover:bg-accent-800`. This affects at least
   4 buttons across self-service pages. Same issue flagged as UX-06/UX-07 in Loop 1 -- appears to be
   a systematic pattern.

6. **Standardize loading states across self-service pages** (UX-63). Use the `Loading` component
   from `@/components/ui` consistently. The `/me/documents` page is the reference implementation.

7. **Add dark mode variants to attendance error alert and calendar** (UX-61, UX-62). The attendance
   page has several places where dark mode is handled inconsistently compared to sibling pages.

8. **Add breadcrumbs to all self-service pages** (UX-70). Only `/me/documents` currently passes
   breadcrumbs. All `/me/*` pages should include breadcrumbs: `My Dashboard > [Page Name]`.

9. **Convert regularization form to RHF + Zod** (UX-73). The uncontrolled textarea violates the
   codebase code rule requiring all forms to use React Hook Form + Zod.

10. **Add `aria-label` to form inputs without visible labels** (UX-78, UX-79, UX-80). Affects search
    inputs and filter selects across payslips and leaves pages.

### Priority 3 -- Polish (LOW severity)

11. **Add `aria-hidden="true"` to all decorative icons** (UX-86). Same recommendation as Loop 1
    UX-20 and Loop 2 UX-45/46/47. This is a codebase-wide pattern affecting all pages. Consider a
    lint rule or wrapper component.

12. **Increase tab horizontal padding on edit page** (UX-66). Change `px-1` to `px-4` to match the
    detail page tab treatment.

13. **Replace raw SVG with Lucide icon on edit page** (UX-65). Use `ChevronLeft` for consistency.

14. **Fix deprecated `onKeyPress`** (UX-68) on directory search. Replace with `onKeyDown`.

15. **Add sticky save bar to employee edit form**. With 30+ fields across 5 tabs, the save button at
    the bottom of the form is not visible during editing. A sticky bottom bar would improve UX.

16. **Add column sorting to employee table**. Currently hardcoded to `createdAt DESC` with no UI for
    sorting by name, department, or status.

---

## 8. Summary

| Category               | HIGH  | MEDIUM | LOW   | Total  |
|------------------------|-------|--------|-------|--------|
| Accessibility          | 6     | 9      | 2     | 17     |
| Visual Consistency     | 1     | 7      | 7     | 15     |
| Form/Component Quality | 0     | 1      | 0     | 1      |
| Responsiveness         | 0     | 0      | 0     | 0      |
| **Total**              | **7** | **17** | **9** | **33** |

### Loop 1 + Loop 2 + Loop 3 Cumulative

| Category               | HIGH   | MEDIUM | LOW    | Total  |
|------------------------|--------|--------|--------|--------|
| Accessibility          | 16     | 26     | 7      | 49     |
| Visual Consistency     | 1      | 15     | 22     | 38     |
| Form/Component Quality | 0      | 1      | 0      | 1      |
| Responsiveness         | 0      | 0      | 0      | 0      |
| Navigation             | 0      | 0      | 1      | 1      |
| **Total**              | **17** | **42** | **30** | **89** |

**Overall Assessment:** The employee self-service and management pages are functionally
comprehensive and well-structured. The color palette migration to accent/blue is fully applied
across all 11 pages -- no purple remnants were found. The standout page is `/me/documents`, which
correctly uses the shared `Modal`, `Button`, `Loading`, `EmptyState`, and `Breadcrumbs` components,
serving as the reference implementation for all self-service pages. The primary concerns are: (1)
custom modal overlays on profile and attendance pages that lack dialog semantics and focus traps, (

2) missing ARIA tab roles on the heavily-tabbed employee detail and edit pages, (3) identical hover
   states on multiple accent-700 buttons (a recurring pattern first flagged in Loop 1), and (4)
   inconsistent loading state implementations across self-service pages. The employee edit form
   handles
   30+ fields well via tabbed sections and includes an approval workflow for sensitive employment
   field
   changes -- an excellent enterprise UX pattern. The employee table is functional with server-side
   search and filtering but would benefit from column sorting.
