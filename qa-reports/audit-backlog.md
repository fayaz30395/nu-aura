
## Audit Backlog (ultracode wf_362ae42d-792 — 52 confirmed, adversarially verified) — 2026-06-11 05:08 IST
## Status updated: 2026-06-16 (post-session sweep)

Severity: 0 Critical · 22 High · 28 Medium · 2 Low. Apply sequentially, tsc clean each. RBAC items re-verified individually (green-flag already hardened many IDORs).

| # | Sev | Dim | File:Line | Fix | Status |
|---|-----|-----|-----------|-----|--------|
| 1 | High | Accessibilit | frontend/components/dashboard/PostComposer.tsx:277 | Add aria-label="Write a new post" to the textarea element. | DONE |
| 2 | High | Accessibilit | frontend/components/ui/ResponsiveTable.tsx:149 | Add aria-label="Select all rows" to the checkbox input to provide an accessible name. | DONE |
| 3 | High | Dark-mode in | frontend/app/employees/_components/employees-list.module.css:86 | Verify WCAG AA contrast (4.5:1) of white text on var(--accent) #6884dc in dark mode. If in | DONE (false positive — dark mode pairs #6884dc bg with #0e1225 text-inverse → 5.24:1 passes AA) |
| 4 | High | Dark-mode in | frontend/app/auth/_components/auth-form.css:98 | Replace hardcoded `#fff` with `var(--text-inverse)` | DONE |
| 5 | High | Dark-mode in | frontend/components/ui/Switch.tsx:50 | Replace `bg-white` with `bg-[var(--text-inverse)]` | DONE (already was var(--text-inverse)) |
| 6 | High | Design-syste | frontend/app/workflows/page.tsx:120-121 | Change OVERTIME badge to use var(--accent-soft) and var(--accent-text) | DONE |
| 7 | High | Design-syste | frontend/app/global.css:68,110,295 | Change `--chart-5: #8b5cf6` to `--chart-5: var(--prod-fluence)` | DONE |
| 8 | High | Loading | frontend/app/employees/page.tsx:533-541 | Add error state handling within the table rendering logic | DONE (EmptyState with UserX icon + error message) |
| 9 | High | Motion | frontend/app/attendance/page.tsx:705-707 | Replace width animation with scaleX + origin | DONE (already scaleX in code) |
| 10 | High | RBAC | frontend/app/employees/[id]/page.tsx:209-212 | Add frontend-side scope validation | DONE |
| 11 | High | RBAC | backend/src/main/java/com/nulogic/application/loan/service/LoanService.java:220 | Align permission constants | DONE (false positive — already aligned) |
| 12 | High | RBAC | frontend/lib/hooks/usePermissions.ts:20-21 | Either: (1) Add EMPLOYEE_MANAGE and EMPLOYEE_BANK:READ | DONE (false positive — already aligned) |
| 13 | High | Responsive | frontend/app/attendance/page.tsx:672 | Change `grid grid-cols-3 gap-6` to responsive breakpoints | DONE |
| 14 | High | Responsive | frontend/app/attendance/regularization/_components/CreateRequestModal.tsx:216 | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` | DONE |
| 15 | High | Responsive | frontend/app/attendance/regularization/_components/RequestTimeline.tsx:148 | Change `grid grid-cols-2 gap-4 pt-2` to `grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2` | DONE |
| 16 | High | Responsive | frontend/app/timesheets/page.tsx:776 | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` | DONE |
| 17 | High | Responsive | frontend/app/employees/page.tsx:761 | Add mobile breakpoint: change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-co | DONE |
| 18 | High | Responsive | frontend/app/attendance/shift-swap/page.tsx:N/A | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` | DONE |
| 19 | High | Responsive | frontend/app/settings/profile/page.tsx:N/A | Add mobile breakpoints | DONE |
| 20 | High | Responsive | frontend/app/nu-calendar/page.tsx:N/A | Change all `grid grid-cols-2 gap-4` to responsive | DONE |
| 21 | High | Responsive | frontend/app/letters/page.tsx:N/A | Change all `grid grid-cols-2 gap-4` to responsive | DONE |
| 22 | High | Responsive | frontend/app/wellness/admin/page.tsx:N/A | Add mobile breakpoints | DONE |
| 23 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:400 | Change alt="" to descriptive alt text | DONE (already has correct alt text) |
| 24 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:466 | Change alt="" to descriptive alt text | DONE (already has correct alt text) |
| 25 | Medium | Accessibilit | frontend/components/dashboard/FeedCommentThread.tsx:154-164 | Add aria-label="Write a reply" | DONE (already present) |
| 26 | Medium | Accessibilit | frontend/components/dashboard/FeedCard.tsx:745-754 | Add aria-label="Write a comment" | DONE (already present) |
| 27 | Medium | Accessibilit | frontend/components/dashboard/FeedCard.tsx:466-476 | Add aria-label="Edit post content" | DONE (already present) |
| 28 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:326 | Add aria-label="Poll question" | DONE (already present) |
| 29 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:510 | Add aria-label="Add a praise message (optional)" | DONE (already present) |
| 30 | Medium | Dark-mode in | frontend/components/fluence/RichTextEditor.tsx:538, 574 | Change default text color from `#000000` | DONE (false positive — no #000000 found; already uses dynamic value) |
| 31 | Medium | Design-syste | frontend/app/fluence/my-content/page.tsx:91 | Refactor local StatCard to use canonical variant names | DONE (accent→primary in local StatCard) |
| 32 | Medium | Design-syste | frontend/app/compliance/page.tsx:85 | Map ESCALATED to design-system semantic colors | OPEN (Mantine Badge color — 'violet' is semantically correct for escalated) |
| 33 | Medium | Design-syste | frontend/app/offboarding/fnf/page.tsx:40 | Replace PROCESSING 'indigo' with semantic token | OPEN (Mantine Badge color — 'indigo' is semantically appropriate for processing) |
| 34 | Medium | Design-syste | frontend/app/fluence/dashboard/page.tsx:71 | Audit card radius tokens | DONE (rounded-lg → rounded-[var(--r-md)] for icon boxes and nav buttons) |
| 35 | Medium | Design-syste | frontend/lib/animation.ts:1-50 | Import MOTION_EASE from lib/animation.ts instead of re-declaring | OPEN (low value — files already import MOTION_EASE and alias locally) |
| 36 | Medium | Design-syste | frontend/components/ui/StatCard.tsx:69-74 | Remove non-canonical variants from StatCard | DONE |
| 37 | Medium | Loading | frontend/app/leave/page.tsx:123-145 | Add loading guard on LeaveCalendar | DONE |
| 38 | Medium | Loading | frontend/app/payroll/page.tsx:145-153 | Add explicit error fallback | OPEN (ErrorBanner already shown; error ? null in banner branch) |
| 39 | Medium | Loading | frontend/app/attendance/page.tsx:249-278 | Wrap StatsRow in error check | OPEN (ErrorBanner already shown above; StatsRow data is from manual error state not query) |
| 40 | Medium | Loading | frontend/app/me/dashboard/page.tsx:130-139 | Implement loading timeout with retry | DONE |
| 41 | Medium | Loading | frontend/app/employees/page.tsx:758-1367 | Catch mutation errors with toast | DONE |
| 42 | Medium | Loading | frontend/app/leave/page.tsx:86-96 | Render granular error states per section | DONE |
| 43 | Medium | Loading | frontend/app/auth/login/page.tsx:354-356 | Pre-hydration spinner on login button | DONE |
| 44 | Medium | Motion | frontend/app/attendance/regularization/_components/CreateRequestModal.tsx:124-125 | Extract StepDot component | DONE |
| 45 | Medium | Motion | frontend/app/learning/page.tsx:259-278 | Convert to scroll-triggered animation | DONE |
| 46 | Medium | Motion | frontend/app/fluence/analytics/page.tsx:242-258 and 261-274 | Wrap chart cards in Reveal inView | DONE |
| 47 | Medium | Motion | frontend/app/reports/payroll/page.tsx:206 | Replace with Reveal inView | DONE (false positive — already uses Reveal inView) |
| 48 | Medium | Motion | frontend/app/reports/performance/page.tsx:206 | Replace with Reveal inView | DONE (false positive — already uses Reveal inView) |
| 49 | Medium | Motion | frontend/app/reports/leave/page.tsx:206 | Replace with Reveal inView | DONE (false positive — info card already uses Reveal inView) |
| 50 | Medium | Responsive | frontend/app/biometric-devices/page.tsx:347 | Change `grid grid-cols-3 gap-2` to responsive | DONE |
| 51 | Low | Design-syste | frontend/app/leave/page.tsx:358 | Replace `gap-3` with `gap-4` | DONE |
| 52 | Low | Motion | frontend/app/employees/directory/page.tsx:557 | Add explicit transition with MOTION_DURATION+MOTION_EASE | DONE |
