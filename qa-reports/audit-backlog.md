
## Audit Backlog (ultracode wf_362ae42d-792 — 52 confirmed, adversarially verified) — 2026-06-11 05:08 IST

Severity: 0 Critical · 22 High · 28 Medium · 2 Low. Apply sequentially, tsc clean each. RBAC items re-verified individually (green-flag already hardened many IDORs).

| # | Sev | Dim | File:Line | Fix | Status |
|---|-----|-----|-----------|-----|--------|
| 1 | High | Accessibilit | frontend/components/dashboard/PostComposer.tsx:277 | Add aria-label="Write a new post" to the textarea element. | OPEN |
| 2 | High | Accessibilit | frontend/components/ui/ResponsiveTable.tsx:149 | Add aria-label="Select all rows" to the checkbox input to provide an accessible name. | OPEN |
| 3 | High | Dark-mode in | frontend/app/employees/_components/employees-list.module.css:86 | Verify WCAG AA contrast (4.5:1) of white text on var(--accent) #6884dc in dark mode. If in | OPEN |
| 4 | High | Dark-mode in | frontend/app/auth/_components/employees-list.module.css:104, 127, 150 | Replace hardcoded `#fff` with `var(--text-inverse)` or `var(--sidebar-text-active)` which  | OPEN |
| 5 | High | Dark-mode in | frontend/components/ui/Switch.tsx:50 | Replace `bg-white` with `bg-[var(--text-inverse)]` (which equals #ffffff) to make it token | OPEN |
| 6 | High | Design-syste | frontend/app/workflows/page.tsx:120-121 | Change OVERTIME badge to use var(--accent-soft) and var(--accent-text) to match the design | OPEN |
| 7 | High | Design-syste | frontend/app/global.css:68,110,295 | Change `--chart-5: #8b5cf6` to `--chart-5: var(--chart-1)` (the primary #2952A3 blue) or d | OPEN |
| 8 | High | Loading | frontend/app/employees/page.tsx:533-541 | Add error state handling within the table rendering logic: before rendering `SkeletonTable | OPEN |
| 9 | High | Motion | frontend/app/attendance/page.tsx:705-707 | Replace width animation with scaleX + origin: `initial={{scaleX: 0}} animate={{scaleX: 1}} | OPEN |
| 10 | High | RBAC | frontend/app/employees/[id]/page.tsx:209-212 | Add frontend-side scope validation: (1) Check user permissions and current employee ID bef | OPEN |
| 11 | High | RBAC | backend/src/main/java/com/nulogic/application/loan/service/LoanService.java:220 | Align permission constants: either (1) change LoanService.getById() to use Permission.LOAN | OPEN |
| 12 | High | RBAC | frontend/lib/hooks/usePermissions.ts:20-21 | Either: (1) Add EMPLOYEE_MANAGE and EMPLOYEE_BANK:READ to backend Permission.java and seed | OPEN |
| 13 | High | Responsive | frontend/app/attendance/page.tsx:672 | Change `grid grid-cols-3 gap-6` to `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4`  | DONE |
| 14 | High | Responsive | frontend/app/attendance/regularization/_components/CreateRequestModal.tsx:216 | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` to stack inputs | DONE |
| 15 | High | Responsive | frontend/app/attendance/regularization/_components/RequestTimeline.tsx:148 | Change `grid grid-cols-2 gap-4 pt-2` to `grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2` to st | DONE |
| 16 | High | Responsive | frontend/app/timesheets/page.tsx:776 | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` to stack inputs | DONE |
| 17 | High | Responsive | frontend/app/employees/page.tsx:761 | Add mobile breakpoint: change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-co | DONE |
| 18 | High | Responsive | frontend/app/attendance/shift-swap/page.tsx:N/A | Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` throughout the  | DONE |
| 19 | High | Responsive | frontend/app/settings/profile/page.tsx:N/A | Add mobile breakpoints: change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-c | DONE |
| 20 | High | Responsive | frontend/app/nu-calendar/page.tsx:N/A | Change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` in calendar | DONE |
| 21 | High | Responsive | frontend/app/letters/page.tsx:N/A | Change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` in letter m | DONE |
| 22 | High | Responsive | frontend/app/wellness/admin/page.tsx:N/A | Add mobile breakpoints: change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-c | DONE |
| 23 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:400 | Change alt="" to alt={`${selectedRecipient.fullName}'s profile picture`} so screen readers | OPEN |
| 24 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:466 | Change alt="" to alt={`${emp.firstName} ${emp.lastName}'s profile picture`} to provide mea | OPEN |
| 25 | Medium | Accessibilit | frontend/components/dashboard/FeedCommentThread.tsx:154-164 | Add aria-label="Write a reply" to the input element, or wrap it in a proper <label> with h | OPEN |
| 26 | Medium | Accessibilit | frontend/components/dashboard/FeedCard.tsx:745-754 | Add aria-label="Write a comment" to the input element to give it an accessible name. | OPEN |
| 27 | Medium | Accessibilit | frontend/components/dashboard/FeedCard.tsx:466-476 | Add aria-label="Edit post content" to the textarea to provide context. | OPEN |
| 28 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:326 | Add aria-label="Poll question" to the textarea. | OPEN |
| 29 | Medium | Accessibilit | frontend/components/dashboard/PostComposer.tsx:510 | Add aria-label="Add a praise message (optional)" to the textarea. | OPEN |
| 30 | Medium | Dark-mode in | frontend/components/fluence/RichTextEditor.tsx:538, 574 | Change default text color from `#000000` to `editor.getAttributes('textStyle').color // va | OPEN |
| 31 | Medium | Design-syste | frontend/app/fluence/my-content/page.tsx:91 | Refactor StatCard to derive icon color from the component's variant prop (which already us | OPEN |
| 32 | Medium | Design-syste | frontend/app/compliance/page.tsx:85 | Map to design-system semantic colors: `ESCALATED: 'var(--accent-600)'` (or create a design | OPEN |
| 33 | Medium | Design-syste | frontend/app/offboarding/fnf/page.tsx:40 | Replace with `PROCESSING: 'var(--accent-600)'` or map to a semantic role (info, warning, n | OPEN |
| 34 | Medium | Design-syste | frontend/app/fluence/dashboard/page.tsx:71 | Audit card types: define canonical radius for each (e.g., primary hero → var(--r-xl), stat | OPEN |
| 35 | Medium | Design-syste | frontend/lib/animation.ts:1-50 | Import `MOTION_EASE` from lib/animation.ts in all pages instead of re-declaring. Example:  | OPEN |
| 36 | Medium | Design-syste | frontend/components/ui/StatCard.tsx:69-74 | Remove 'purple', 'teal', 'blue', 'orange' variants from StatCard. Keep only: 'default', 'p | OPEN |
| 37 | Medium | Loading | frontend/app/leave/page.tsx:123-145 | Add a conditional rendering layer around LeaveCalendar that checks `loading // requests.le | OPEN |
| 38 | Medium | Loading | frontend/app/payroll/page.tsx:145-153 | Add an explicit error fallback between the isLoading and success branches: `if (error) { r | OPEN |
| 39 | Medium | Loading | frontend/app/attendance/page.tsx:249-278 | Wrap the StatsRow conditional in an error check: `{error ? <ErrorBanner ... /> : dataLoadi | OPEN |
| 40 | Medium | Loading | frontend/app/me/dashboard/page.tsx:130-139 | Implement a loading timeout (e.g., 30 seconds) and render an error banner with a retry but | OPEN |
| 41 | Medium | Loading | frontend/app/employees/page.tsx:758-1367 | Catch mutation errors in the onSubmit handler and map backend errors back to form fields u | OPEN |
| 42 | Medium | Loading | frontend/app/leave/page.tsx:86-96 | Render granular error states for each section: `{balancesError && <ErrorBanner ... />}` ab | OPEN |
| 43 | Medium | Loading | frontend/app/auth/login/page.tsx:354-356 | Render a subtle loading spinner or disable animation on the button during the pre-hydratio | OPEN |
| 44 | Medium | Motion | frontend/app/attendance/regularization/_components/CreateRequestModal.tsx:124-125 | Extract to an isolated component (e.g., `<AnimatedStepDot isActive={true} />`) that handle | OPEN |
| 45 | Medium | Motion | frontend/app/learning/page.tsx:259-278 | Convert to use `<Stagger inView={true}>` wrapper instead of inline motion.section with ani | OPEN |
| 46 | Medium | Motion | frontend/app/fluence/analytics/page.tsx:242-258 and 261-274 | Wrap each card in `<Reveal>` or add inView logic to the motion.divs. Alternatively, let th | OPEN |
| 47 | Medium | Motion | frontend/app/reports/payroll/page.tsx:206 | Replace with `<Reveal inView={true} delay={0.2}>` or nest inside a scroll-aware parent con | OPEN |
| 48 | Medium | Motion | frontend/app/reports/performance/page.tsx:206 (assumed, same pattern as payroll) | Replace with `<Reveal inView={true} delay={0.2}>` for consistency with the motion foundati | OPEN |
| 49 | Medium | Motion | frontend/app/reports/leave/page.tsx:206 (assumed, same pattern) | Replace with `<Reveal inView={true} delay={0.2}>` for consistency. | OPEN |
| 50 | Medium | Responsive | frontend/app/biometric-devices/page.tsx:347 | Change `grid grid-cols-3 gap-2` to `grid grid-cols-1 sm:grid-cols-3 gap-2` to stack stats  | DONE |
| 51 | Low | Design-syste | frontend/app/leave/page.tsx:358 | Replace `gap-3` with `gap-4` (16px) or `gap-2` (8px). Audit the entire codebase: grep -r ' | OPEN |
| 52 | Low | Motion | frontend/app/employees/directory/page.tsx:557 | Add explicit transition: `transition={{duration: MOTION_DURATION.base, ease: MOTION_EASE.o | OPEN |