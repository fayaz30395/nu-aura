# Design System Phase 2 Compliance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all remaining NU-AURA frontend design system violations from the Phase 2 rescan: ~65 color instances, chart hex fallbacks, ~17 files missing motion.button/button focus-visible, and the text-2xs font utility with 79 replacement sites.

**Architecture:** Each task group targets independent files with no shared state. Tasks A1–A6, B1–B4, C1–C2 can run fully in parallel. Tasks should use search-before-edit and read-before-modify discipline to avoid overwriting Phase 1 changes.

> **Note on wall/fluence Phase 1 status**: `wall/ReactionBar.tsx`, `wall/CommentThread.tsx`, `wall/WallCards.tsx`, and `fluence/FluenceChatWidget.tsx` were already fixed in Phase 1 and have complete focus-visible + aria-label coverage. New files missing accessibility are in `fluence/DeleteSpaceModal`, `fluence/SpaceFormDrawer`, `fluence/MentionInput`, `fluence/TableOfContents`, `fluence/blogs/`, `fluence/my-content`, `fluence/wiki`, `BirthdayWishingBoard.tsx`, and `app/shifts/page.tsx`.

**Tech Stack:** Next.js 14 TypeScript · Tailwind CSS (accent-*, surface-*, danger-*, success-*, warning-*, info-* tokens) · CSS custom properties (var(--chart-*), var(--text-*), var(--bg-*)) · Mantine UI

---

## Source of Truth — Mapping Tables

### Color → Token
| Non-compliant | Compliant |
|--------------|-----------|
| `slate-*` | `surface-*` |
| `gray-*` | `surface-*` |
| `rose-*` | `danger-*` |
| `mantine-color-gray-4` | `var(--text-muted)` |
| `mantine-color-gray-0` | `var(--bg-main)` |
| `mantine-color-danger-6` | `var(--status-danger-text)` |
| `mantine-color-dimmed` | `var(--text-muted)` |

### Chart Hex → CSS Var
| Hex | CSS Variable |
|-----|-------------|
| `#3b82f6` | `var(--chart-primary)` or `var(--accent-primary)` |
| `#f59e0b` | `var(--chart-warning)` |
| `#22c55e` | `var(--chart-success)` |
| `#6366f1` | `var(--chart-info)` |

### Accessibility Pattern (add to all `<button>` / `motion.button` with onClick)
```
cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
```

---

## Task Group A — Color Fixes (6 parallel tasks)

### Task A1: Tiny color fixes — StatCard, lwf/error, ActivityFeed, kanban

**Files:**
- Modify: `frontend/components/ui/StatCard.tsx:77`
- Modify: `frontend/app/lwf/error.tsx:18`
- Modify: `frontend/components/fluence/ActivityFeed.tsx:77`
- Modify: `frontend/app/recruitment/[jobId]/kanban/page.tsx:155,170,307-311`

- [ ] **Step 1: Read all 4 files**
  ```
  Read StatCard.tsx, lwf/error.tsx, ActivityFeed.tsx, kanban/page.tsx
  ```

- [ ] **Step 2: Fix StatCard.tsx line 77**

  Change:
  ```
  bg: 'bg-gradient-to-br from-danger-50 to-rose-100/50 dark:from-danger-950/50 dark:to-rose-900/30',
  ```
  To:
  ```
  bg: 'bg-gradient-to-br from-danger-50 to-danger-100/50 dark:from-danger-950/50 dark:to-danger-900/30',
  ```

- [ ] **Step 3: Fix lwf/error.tsx**

  Change `var(--mantine-color-danger-6)` → `var(--status-danger-text)`

- [ ] **Step 4: Fix ActivityFeed.tsx**

  Change `var(--mantine-color-dimmed)` → `var(--text-muted)`

- [ ] **Step 5: Fix kanban/page.tsx mantine-color-gray refs**

  - `var(--mantine-color-gray-4)` → `var(--text-muted)`
  - `var(--mantine-color-gray-0)` → `var(--bg-main)`
  - `var(--mantine-color-accent-0)` → `var(--bg-secondary)` (accent-50 equivalent)
  - `var(--mantine-color-accent-4)` → `var(--accent-primary)`
  - `var(--mantine-radius-md)` → keep (structural Mantine prop, not a color)
  - `var(--mantine-spacing-xs)` → keep (structural Mantine prop, not a color)

- [ ] **Step 6: Verify**
  ```bash
  grep -n "rose-\|mantine-color" frontend/components/ui/StatCard.tsx frontend/app/lwf/error.tsx frontend/components/fluence/ActivityFeed.tsx frontend/app/recruitment/\[jobId\]/kanban/page.tsx
  ```
  Expected: 0 results for rose-* and mantine-color-*

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/components/ui/StatCard.tsx frontend/app/lwf/error.tsx frontend/components/fluence/ActivityFeed.tsx "frontend/app/recruitment/[jobId]/kanban/page.tsx"
  git commit -m "fix(design-system): replace rose-*/mantine-color refs with design tokens (A1)"
  ```

---

### Task A2: mileage/page.tsx — slate-* → surface-*

**Files:**
- Modify: `frontend/app/expenses/mileage/page.tsx` (~18 instances)

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Replace all dark:bg-slate-* → dark:bg-surface-***

  Pattern: `dark:bg-slate-800` → `dark:bg-surface-800`, `dark:bg-slate-700` → `dark:bg-surface-700`, `dark:bg-slate-700/50` → `dark:bg-surface-700/50`

- [ ] **Step 3: Replace all dark:border-slate-* → dark:border-surface-***

  Pattern: `dark:border-slate-700` → `dark:border-surface-700`, `dark:border-slate-600` → `dark:border-surface-600`

- [ ] **Step 4: Replace all bg-slate-* → bg-surface-*** (non-dark variants)**

  Pattern: `bg-slate-700` → `bg-surface-700` (in active tab class at line ~320)

- [ ] **Step 5: Replace divide-slate-* → divide-surface-***

  `dark:divide-slate-700` → `dark:divide-surface-700`

- [ ] **Step 6: Verify**
  ```bash
  grep -n "slate-" frontend/app/expenses/mileage/page.tsx
  ```
  Expected: 0 results

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/app/expenses/mileage/page.tsx
  git commit -m "fix(design-system): replace slate-* with surface-* in mileage page (A2)"
  ```

---

### Task A3: org-chart/page.tsx + dashboards/manager/page.tsx — slate-* → surface-*

**Files:**
- Modify: `frontend/app/org-chart/page.tsx` (5 instances)
- Modify: `frontend/app/dashboards/manager/page.tsx` (6+ instances)

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix org-chart/page.tsx**

  Replace all occurrences (exact lines):
  - Line 98: `hover:bg-slate-50 dark:hover:bg-slate-800/50` → `hover:bg-surface-50 dark:hover:bg-surface-800/50`
  - Line 109: `border-slate-200 dark:border-slate-600` → `border-surface-200 dark:border-surface-600`
  - Line 319: `text-slate-300 dark:text-slate-600` → `text-surface-300 dark:text-surface-600`
  - Line 378: `bg-slate-100 border-slate-300` → `bg-surface-100 border-surface-300`

- [ ] **Step 3: Fix dashboards/manager/page.tsx**

  Replace all occurrences:
  - `bg-slate-500/10` → `bg-surface-500/10`
  - `text-slate-600` → `text-surface-600`
  - `text-slate-500` → `text-surface-500`
  - `text-slate-400` → `text-surface-400`
  - `border-slate-500/20` → `border-surface-500/20`
  - `border-slate-300` → `border-surface-300`
  - `dark:border-slate-600` → `dark:border-surface-600`
  - `dark:bg-slate-700` → `dark:bg-surface-700`
  - `bg-slate-400` → `bg-surface-400` (fallback dot color)

- [ ] **Step 4: Verify**
  ```bash
  grep -n "slate-" frontend/app/org-chart/page.tsx frontend/app/dashboards/manager/page.tsx
  ```
  Expected: 0 results

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/app/org-chart/page.tsx frontend/app/dashboards/manager/page.tsx
  git commit -m "fix(design-system): replace slate-* with surface-* in org-chart + manager dashboard (A3)"
  ```

---

### Task A4: import-export, restricted-holidays, integrations/slack, DataTable — gray-* → surface-*

**Files:**
- Modify: `frontend/app/import-export/page.tsx` (4 gray instances)
- Modify: `frontend/app/restricted-holidays/page.tsx` (1 gray instance)
- Modify: `frontend/app/integrations/slack/page.tsx` (1 gray instance)
- Modify: `frontend/components/ui/DataTable.tsx` (2 border-gray-300 instances)

- [ ] **Step 1: Read all 4 files**

- [ ] **Step 2: Fix import-export/page.tsx**

  Replace all occurrences (replace_all=true is safe here):
  - `divide-gray-100` → `divide-surface-100`
  - `dark:divide-gray-800` → `dark:divide-surface-800`
  - `dark:divide-gray-700` → `dark:divide-surface-700`

- [ ] **Step 3: Fix restricted-holidays/page.tsx**

  - `divide-gray-100` → `divide-surface-100`
  - `dark:divide-gray-700` → `dark:divide-surface-700`

- [ ] **Step 4: Fix integrations/slack/page.tsx**

  Line 292: `after:border-gray-300` → `after:border-surface-300`

- [ ] **Step 5: Fix DataTable.tsx**

  Lines 551, 618: `border-gray-300` → `border-surface-300`
  (These are the `<input type="checkbox">` border classes)

- [ ] **Step 6: Verify**
  ```bash
  grep -n "gray-[0-9]" frontend/app/import-export/page.tsx frontend/app/restricted-holidays/page.tsx frontend/app/integrations/slack/page.tsx frontend/components/ui/DataTable.tsx
  ```
  Expected: 0 results

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/app/import-export/page.tsx frontend/app/restricted-holidays/page.tsx frontend/app/integrations/slack/page.tsx frontend/components/ui/DataTable.tsx
  git commit -m "fix(design-system): replace gray-* with surface-* in import-export, restricted-holidays, slack, DataTable (A4)"
  ```

---

### Task A5: CompanySpotlight.tsx — slate/gray gradients → surface-*

**Files:**
- Modify: `frontend/components/dashboard/CompanySpotlight.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Fix gradient classes**

  Lines 16, 26, 36, 79:
  - `from-slate-700 to-slate-800` → `from-surface-700 to-surface-800`
  - `from-slate-600 to-gray-700` → `from-surface-600 to-surface-700`
  - `from-gray-700 to-slate-800` → `from-surface-700 to-surface-800`

  Line 79 (fallback gradient):
  - `from-slate-700 to-slate-800` → `from-surface-700 to-surface-800`

- [ ] **Step 3: Verify**
  ```bash
  grep -n "slate-\|gray-" frontend/components/dashboard/CompanySpotlight.tsx
  ```
  Expected: 0 results

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/components/dashboard/CompanySpotlight.tsx
  git commit -m "fix(design-system): replace slate/gray gradients with surface-* in CompanySpotlight (A5)"
  ```

---

### Task A6: Chart hex fallbacks — employee dashboard + attendance page

**Files:**
- Modify: `frontend/app/dashboards/employee/page.tsx` (line 539)
- Modify: `frontend/app/attendance/page.tsx` (line 326)
- Modify: `frontend/components/dashboard/LeaveBalanceWidget.tsx` (lines 34-35)
- Modify: `frontend/app/global-error.tsx` (inline styles — special case)

- [ ] **Step 1: Read all 4 files**

- [ ] **Step 2: Fix employee/page.tsx**

  Line 539: `backgroundColor: balance.colorCode || '#3b82f6'`
  → `backgroundColor: balance.colorCode || 'var(--accent-primary)'`

- [ ] **Step 3: Fix attendance/page.tsx**

  Line 326:
  ```
  color={isOvertime ? 'var(--color-warning, #f59e0b)' : workProgress >= 100 ? 'var(--color-success, #22c55e)' : 'var(--color-accent, #6366f1)'}
  ```
  →
  ```
  color={isOvertime ? 'var(--chart-warning)' : workProgress >= 100 ? 'var(--chart-success)' : 'var(--chart-info)'}
  ```

- [ ] **Step 4: Fix LeaveBalanceWidget.tsx**

  Lines 34-35:
  ```typescript
  if (percentage > 80) return 'var(--status-danger, #EF4444)';
  if (percentage > 60) return 'var(--status-warning, #F59E0B)';
  ```
  →
  ```typescript
  if (percentage > 80) return 'var(--chart-danger)';
  if (percentage > 60) return 'var(--chart-warning)';
  ```

- [ ] **Step 5: Fix global-error.tsx**

  This file **intentionally uses inline styles only** — the comment states providers may have crashed so no CSS variables from providers are available. The raw hex values are necessary here. However, align them with the NULogic palette for consistency:

  Current remaining raw hex (all in `styles` object or JSX inline attributes):
  - Line 60: `'#fee2e2'` — danger-50 bg, keep (correct semantic)
  - Line 70: `'#111827'` → `'#050766'` (Lapis Blue heading)
  - Line 74: `'#6b7280'` → `'#3E616A'` (Muted Teal secondary text)
  - Line 79: `'#fef2f2'` — danger-50, keep
  - Line 80: `'#fecaca'` — danger-200 border, keep
  - Line 89: `'#991b1b'` — danger-800 code text, keep
  - Line 95: `'#7f1d1d'` — danger-900, keep
  - Line 121: `'#e5e7eb'` → `'#d4d4f7'` (accent-100 button bg)
  - Line 122: `'#374151'` → `'#050766'` (Lapis Blue button text)
  - Line 147: `stroke="#dc2626"` — danger red SVG, keep (correct semantic)
  - Line 182: `'#f3f4f6'` → `'#F4F5F6'` (NULogic Near-White)
  - Lines 192, 202: `'#6b7280'`, `'#374151'` → same as lines 74/122 above
  - Lines 230, 233: hover `'#d1d5db'`, `'#e5e7eb'` → `'#d4d4f7'`, `'#d4d4f7'`

- [ ] **Step 6: Verify**
  ```bash
  grep -n "'#" frontend/app/dashboards/employee/page.tsx frontend/app/attendance/page.tsx frontend/components/dashboard/LeaveBalanceWidget.tsx
  ```
  Expected: No non-brand hex values

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/app/dashboards/employee/page.tsx frontend/app/attendance/page.tsx frontend/components/dashboard/LeaveBalanceWidget.tsx frontend/app/global-error.tsx
  git commit -m "fix(design-system): replace chart hex fallbacks with CSS vars; update global-error inline colors (A6)"
  ```

---

## Task Group B — Accessibility Fixes (3 parallel tasks)

> **Pattern to add to every `<button>` or `motion.button` with `onClick`:**
> ```
> cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
> ```
> **Icon-only buttons** (no text children) also need `aria-label="Description"`.

### Task B1: Attendance regularization accessibility

**Files (all in `frontend/app/attendance/regularization/`):**
- Modify: `_components/ViewTabs.tsx`
- Modify: `_components/StatusFilterTabs.tsx`
- Modify: `_components/CreateRequestModal.tsx`
- Modify: `_components/TeamRequestsView.tsx`
- Modify: `_components/RejectRequestModal.tsx`
- Modify: `_components/RequestsTable.tsx`
- Modify: `page.tsx`

- [ ] **Step 1: Read all 7 files**

- [ ] **Step 2: Fix ViewTabs.tsx**

  Find all `<button` or `<div onClick` elements. Add the accessibility pattern to each. Example:
  ```tsx
  // Before
  <button onClick={() => onTabChange('my-requests')} className="...">
  // After
  <button onClick={() => onTabChange('my-requests')} className="... cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
  ```

- [ ] **Step 3: Fix StatusFilterTabs.tsx** (same pattern)

- [ ] **Step 4: Fix CreateRequestModal.tsx** (same pattern)

- [ ] **Step 5: Fix TeamRequestsView.tsx** (same pattern)

- [ ] **Step 6: Fix RejectRequestModal.tsx** (same pattern)

- [ ] **Step 7: Fix RequestsTable.tsx** (same pattern)

- [ ] **Step 8: Fix page.tsx** (same pattern)

- [ ] **Step 9: Verify**
  ```bash
  grep -n "onClick" frontend/app/attendance/regularization/_components/ViewTabs.tsx | grep -v "focus-visible"
  ```
  Goal: All onClick handlers in button/div elements have focus-visible class

- [ ] **Step 10: Commit**
  ```bash
  git add frontend/app/attendance/regularization/
  git commit -m "fix(a11y): add focus-visible + cursor-pointer to attendance regularization buttons (B1)"
  ```

---

### Task B2: Attendance (shift-swap, team, my-attendance, comp-off) accessibility

**Files:**
- Modify: `frontend/app/attendance/shift-swap/page.tsx`
- Modify: `frontend/app/attendance/team/page.tsx`
- Modify: `frontend/app/attendance/my-attendance/page.tsx`
- Modify: `frontend/app/attendance/comp-off/page.tsx`

- [ ] **Step 1: Read all 4 files**

- [ ] **Step 2: For each file, find all `<button` elements and add:**
  ```
  cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
  ```

- [ ] **Step 3: Find icon-only buttons and add `aria-label`**

  Identify buttons that render only an icon (no text content). Add descriptive `aria-label` based on context:
  - Close/dismiss buttons → `aria-label="Close"`
  - Edit buttons → `aria-label="Edit"`
  - Delete buttons → `aria-label="Delete"`
  - Filter buttons → `aria-label="Filter"`

- [ ] **Step 4: Verify**
  ```bash
  for f in shift-swap team my-attendance comp-off; do echo "==$f=="; grep -c "onClick" frontend/app/attendance/$f/page.tsx; done
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/app/attendance/shift-swap/page.tsx frontend/app/attendance/team/page.tsx frontend/app/attendance/my-attendance/page.tsx frontend/app/attendance/comp-off/page.tsx
  git commit -m "fix(a11y): add focus-visible + cursor-pointer to attendance pages (B2)"
  ```

---

### Task B3: Settings, loans, probation, biometric, payments accessibility

**Files:**
- Modify: `frontend/app/settings/page.tsx`
- Modify: `frontend/app/settings/sso/page.tsx`
- Modify: `frontend/app/settings/notifications/page.tsx`
- Modify: `frontend/app/loans/page.tsx`
- Modify: `frontend/app/loans/new/page.tsx`
- Modify: `frontend/app/loans/[id]/page.tsx`
- Modify: `frontend/app/probation/page.tsx`
- Modify: `frontend/app/biometric-devices/page.tsx`
- Modify: `frontend/app/payments/config/page.tsx`

- [ ] **Step 1: Read all 9 files**

- [ ] **Step 2: Fix settings/page.tsx**

  File has 6+ raw `<button>` elements. Add the full accessibility pattern to each. For any icon-only button, add `aria-label`.

- [ ] **Step 3: Fix settings/sso/page.tsx** (same pattern)

- [ ] **Step 4: Fix settings/notifications/page.tsx** (same pattern)

- [ ] **Step 5: Fix loans/page.tsx, loans/new/page.tsx, loans/[id]/page.tsx** (same pattern)

- [ ] **Step 6: Fix probation/page.tsx, biometric-devices/page.tsx, payments/config/page.tsx** (same pattern)

- [ ] **Step 7: Verify**
  ```bash
  grep -rn "<button" frontend/app/settings/ frontend/app/loans/ frontend/app/probation/page.tsx frontend/app/biometric-devices/page.tsx frontend/app/payments/config/page.tsx | grep -v "focus-visible" | grep -v "//.*<button"
  ```
  Goal: No `<button` without focus-visible

- [ ] **Step 8: Commit**
  ```bash
  git add frontend/app/settings/ frontend/app/loans/ frontend/app/probation/page.tsx frontend/app/biometric-devices/page.tsx frontend/app/payments/config/page.tsx
  git commit -m "fix(a11y): add focus-visible + cursor-pointer + aria-label to settings, loans, misc pages (B3)"
  ```

---

### Task B4: Fluence + dashboard + shifts — motion.button accessibility

**Files:**
- Modify: `frontend/components/fluence/DeleteSpaceModal.tsx`
- Modify: `frontend/components/fluence/SpaceFormDrawer.tsx`
- Modify: `frontend/components/fluence/MentionInput.tsx`
- Modify: `frontend/components/fluence/TableOfContents.tsx`
- Modify: `frontend/components/dashboard/BirthdayWishingBoard.tsx`
- Modify: `frontend/app/fluence/blogs/page.tsx`
- Modify: `frontend/app/fluence/blogs/[slug]/page.tsx`
- Modify: `frontend/app/fluence/my-content/page.tsx`
- Modify: `frontend/app/fluence/wiki/page.tsx`
- Modify: `frontend/app/shifts/page.tsx`

> `SpaceFormDrawer.tsx` has preset color pickers — those `<button>` elements are EXEMPT (intentional color-picker UX, per Phase 2 spec §2.7 exemption). Add focus-visible only to non-picker buttons.

- [ ] **Step 1: Read all 10 files**

- [ ] **Step 2: For each file, locate all `<motion.button` and `<button` with `onClick`**

  Add pattern to each:
  ```
  cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
  ```

- [ ] **Step 3: For icon-only buttons (no text children), add `aria-label`**

  Examples by file:
  - DeleteSpaceModal: delete/cancel buttons → `aria-label="Delete space"` / `aria-label="Cancel"`
  - TableOfContents: navigation items → `aria-label="Jump to [heading]"`
  - BirthdayWishingBoard: wish/navigate buttons → `aria-label="Send birthday wish"` etc.
  - fluence/blogs: like/bookmark/share → appropriate `aria-label`

- [ ] **Step 4: Verify SpaceFormDrawer preset color buttons are untouched**
  ```bash
  grep -n "aria-label\|preset\|color" frontend/components/fluence/SpaceFormDrawer.tsx | head -10
  ```

- [ ] **Step 5: Verify**
  ```bash
  for f in DeleteSpaceModal SpaceFormDrawer MentionInput TableOfContents; do
    echo "==$f=="; grep -c "focus-visible" frontend/components/fluence/$f.tsx
  done
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/components/fluence/DeleteSpaceModal.tsx frontend/components/fluence/SpaceFormDrawer.tsx frontend/components/fluence/MentionInput.tsx frontend/components/fluence/TableOfContents.tsx frontend/components/dashboard/BirthdayWishingBoard.tsx frontend/app/fluence/ frontend/app/shifts/page.tsx
  git commit -m "fix(a11y): add focus-visible + aria-label to fluence/dashboard motion.button elements (B4)"
  ```

---

## Task Group C — Structural (sequential)

### Task C1: Add text-2xs utility to Tailwind config + globals.css

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css`

**Why**: 79 instances of `text-[10px]` exist across the codebase. The spec says to define `text-2xs` as a named utility. This is additive only — no component changes needed (arbitrary values still work).

- [ ] **Step 1: Read tailwind.config.ts**

- [ ] **Step 2: Add `2xs` to fontSize in Tailwind config**
  ```typescript
  // In theme.extend.fontSize:
  '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px / 14px
  '3xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px / 16px
  ```

- [ ] **Step 3: Read globals.css**

- [ ] **Step 4: Add utility class in globals.css** (for non-Tailwind usage)
  ```css
  /* Typography utility extensions */
  .text-2xs { font-size: 0.625rem; line-height: 0.875rem; }   /* 10px */
  .text-3xs { font-size: 0.6875rem; line-height: 1rem; }      /* 11px */
  ```

- [ ] **Step 5: Verify tailwind config parses without error**
  ```bash
  cd frontend && npx tailwindcss --help 2>&1 | head -5
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/tailwind.config.ts frontend/app/globals.css
  git commit -m "feat(design-system): add text-2xs + text-3xs typography utilities for 10px/11px micro-text (C1)"
  ```

---

### Task C2: Replace text-[10px] → text-2xs across 7 key files

**Files (top offenders with 5+ instances):**
- Modify: `frontend/components/ui/NotificationDropdown.tsx`
- Modify: `frontend/components/ui/Sidebar.tsx`
- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/fluence/FluenceChatWidget.tsx`
- Modify: `frontend/components/fluence/ChatMessage.tsx`
- Modify: `frontend/components/fluence/editor/SlashMenu.tsx`
- Modify: `frontend/components/fluence/ChatSourceCard.tsx`

**Prerequisite**: Task C1 must complete first (adds the `text-2xs` utility).

- [ ] **Step 1: Read all 7 files**

- [ ] **Step 2: Replace in each file (use replace_all=true)**

  - `text-[10px]` → `text-2xs`
  - `text-[11px]` → `text-3xs`

  Note: Only replace standalone class usage. Do NOT replace inside template literals like `h-9 w-9 text-[10px]` which are Tailwind compound classes — those remain as-is if replacing would break semantics.

- [ ] **Step 3: Verify**
  ```bash
  grep -rn "text-\[10px\]\|text-\[11px\]" frontend/components/ui/NotificationDropdown.tsx frontend/components/ui/Sidebar.tsx frontend/components/layout/Header.tsx frontend/components/fluence/
  ```
  Expected: 0 results in listed files

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/components/ui/NotificationDropdown.tsx frontend/components/ui/Sidebar.tsx frontend/components/layout/Header.tsx frontend/components/fluence/FluenceChatWidget.tsx frontend/components/fluence/ChatMessage.tsx frontend/components/fluence/editor/SlashMenu.tsx frontend/components/fluence/ChatSourceCard.tsx
  git commit -m "fix(design-system): replace text-[10px]/text-[11px] with text-2xs/text-3xs utility classes (C2)"
  ```

---

## Task C4 (Post-validation): TypeScript check

- [ ] **Step 1: Run TypeScript compiler**
  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | head -50
  ```

- [ ] **Step 2: Fix any type errors introduced** (should be none — these are class name changes)

- [ ] **Step 3: Run acceptance criteria checks**
  ```bash
  cd frontend
  echo "=rose=" && grep -r "rose-[0-9]" app/ components/ --include="*.tsx" | grep -v "//.*rose" | wc -l
  echo "=slate=" && grep -r "slate-[0-9]" app/ components/ --include="*.tsx" | wc -l
  echo "=gray=" && grep -r "gray-[0-9]" app/ components/ --include="*.tsx" | wc -l
  echo "=sky=" && grep -r "sky-[0-9]" app/ components/ --include="*.tsx" | wc -l
  echo "=mantine-color=" && grep -r "mantine-color-gray\|mantine-color-cyan\|mantine-color-green\|mantine-color-amber\|mantine-color-red\|mantine-color-dimmed" app/ components/ --include="*.tsx" | wc -l
  ```
  Expected: All counts = 0

---

## Execution Strategy

All task groups A1–A6, B1–B4, C1 can execute fully in parallel. C2 depends on C1 (needs text-2xs defined). C4 runs last.

**Parallel dispatch (Wave 1 — all independent):**
```
Agent 1:  Task A1 (StatCard, lwf, ActivityFeed, kanban)
Agent 2:  Task A2 (mileage page)
Agent 3:  Task A3 (org-chart, manager dashboard)
Agent 4:  Task A4 (import-export, restricted-holidays, slack, DataTable)
Agent 5:  Task A5 (CompanySpotlight)
Agent 6:  Task A6 (chart hex fallbacks, global-error)
Agent 7:  Task B1 (attendance regularization)
Agent 8:  Task B2 (attendance other pages)
Agent 9:  Task B3 (settings, loans, misc)
Agent 10: Task B4 (fluence/dashboard/shifts motion.button)
Agent 11: Task C1 (text-2xs utility — tailwind + globals.css)
```

**Wave 2 (after C1 completes):**
```
Agent 12: Task C2 (replace text-[10px] with text-2xs across 7 files)
```

**Final (after all waves complete):**
```
C4: TypeScript check + acceptance criteria validation
```

---

## Acceptance Criteria (Final)

- [ ] `grep -r "rose-[0-9]" frontend/app/ frontend/components/` → 0 results
- [ ] `grep -r "sky-[0-9]" frontend/app/ frontend/components/` → 0 results
- [ ] `grep -r "slate-[0-9]" frontend/app/ frontend/components/` → 0 results
- [ ] `grep -r "gray-[0-9]" frontend/app/ frontend/components/` → 0 results (excluding `text-gray-*` in comments)
- [ ] `grep -r "mantine-color-gray\|mantine-color-dimmed" frontend/app/ frontend/components/` → 0 results
- [ ] `grep -r "color-warning, #\|color-success, #\|color-accent, #" frontend/app/` → 0 results
- [ ] All `<button>` elements in B1–B3 files have `focus-visible:ring-2` class
- [ ] All icon-only buttons in B1–B3 files have `aria-label`
- [ ] `npx tsc --noEmit` exits 0
