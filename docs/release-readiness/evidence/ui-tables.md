# UI tables, dialogs, states, toasts (worker ui-tables)

Scope: shared table, dialog, drawer, skeleton, empty/error state, toast components. All prop APIs additive; data-testid/aria ids untouched.

| Area | File | Change |
|---|---|---|
| Table | components/ui/ResponsiveTable.tsx | Header 12px/500 secondary text; rows 48px (new `density="compact"` = 36px); 1px `--border-subtle` separators; hover `--surface-hover` on all rows; selected `--accent-subtle`; new `toolbar` slot (also shown in loading/empty/error); skeleton uses `skeleton-aura` (shimmer stops under reduced motion) with `role=status`; sticky header gets an opaque bg. |
| Pagination | same (TablePagination) | `x-y of n` range text, "Rows per page", icon first/prev/next/last buttons (32px, focus ring), `nav` landmark, `0-0 of 0` when empty. |
| Modal | components/ui/Modal.tsx | 16px radius, 24px body padding, 18px title, token overlay, `--sh-overlay` shadow, footer gap 12px (secondary left, primary right). Focus trap / Escape / focus return / aria-labelledby already present, unchanged. |
| Mantine Modal/Drawer | styles/mantine-theme.ts | Overlay = `--overlay` token, no blur; padding 24; 220ms transition; 18px/600 title; overlay shadow. |
| ConfirmDialog | components/ui/ConfirmDialog.tsx | 16px radius, 40px icon circle, 16px title, 13px consequence line, right-aligned Cancel (left) + confirm (right) buttons. |
| EmptyState | components/ui/EmptyState.tsx | Neutral icon circle (48px), 16px title, 13px secondary text, no large illustration. |
| Toast | components/ui/Toast.tsx | error 7s (success/info 5s, warning 6s); status icon, status-token icon colours, close button, `role=alert` for errors and `role=status` otherwise. |
| Skeleton, QueryState | unchanged | Already shape-matched with reduced-motion stop. |

Tests: ResponsiveTable.test.tsx (updated + density/toolbar/selected/pagination), new Toast.test.tsx, new ConfirmDialog.test.tsx (also EmptyState).

Checks: `npx tsc --noEmit` clean; eslint on touched files clean; `npm run lint:design-system` at baseline; full vitest 130 files / 2659 tests pass.

Screenshots (`evidence/screenshots/NU-TABLES-hr-*`, jagadeesh@ HR_MANAGER demo): employee directory loading, empty (search no match), projects table (ResponsiveTable + pagination), light + dark at 1440x900 and 390x844. Looked at 8 of them: empty (light/dark, 1440/390), loading, projects tables; no alignment or contrast defects found in shared components.

Known gaps
- No modal screenshot: the Export control on /projects is a menu, not a dialog, and no other dialog trigger was reachable in the time spent (the dialog capture hit the Next dev-overlay). Modal/ConfirmDialog are covered by unit tests only.
- Disabled pagination chevrons are intentionally faint (opacity 40%).
- Employee directory page is a card grid with its own skeleton, so the loading shot shows the page's skeleton not ResponsiveTable's.
- Individual pages still pass their own row classes; only the shared components were changed.
- Mantine notifications are not mounted with a per-type aria-live region; role override is passed per notification.
