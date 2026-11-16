# UI core components (buttons, inputs, cards, badges), Wave 2

## Changed
- `components/ui/Button.tsx`: flat primary/cta (no gradient, glow, lift), 8px radius on every size, 150ms colour-only transitions, 16px svg icons, `font-medium`, ring offset on the card surface. New `destructive` variant (solid err). `isLoading` now keeps the idle width (min-width captured), still `aria-busy` and disabled. Sizes unchanged (32/36/44/48; default md = 36) to keep the existing contract and tests.
- `Input.tsx`, `Select.tsx`, `Textarea.tsx`: heights sm 36 / md 40 / lg 44 (was 34/44/52 via `--control-height`), 8px radius, 12px padding, no inset shadow, 4px label and helper gaps, 13px labels, 12px helper/error text, `--text-tertiary` placeholder, error/success use `--err-fg` / `--ok-fg`, readOnly style, chevron no longer spins.
- `Card.tsx`: `--sh-xs` shadow, border/background hover only (no lift/press-scale).
- `Badge.tsx`: ok/warn/err/info/neutral token pairs (same colours as `StatusBadge`), 11-12px, weight 500, no entry animation.
- `Tabs.tsx`: weight 500 (was 600/700). `Switch.tsx`: neutral thumb shadow.
- `styles/mantine-theme.ts`: Button weight 500; Input surface/border; InputWrapper label 13px/description/error spacing; Checkbox/Radio/Switch defaults; Menu/Combobox/Popover/HoverCard dropdowns use `--surface-elevated` + `--sh-overlay` + 8px radius; Badge/Tab weight 500.
- `app/globals.css`: `.text-stat-large/medium`, `.text-aura-stat`, `.num`, `.tabular-nums`, `.tnum` now Geist Sans + tabular-nums (were Geist Mono).
- Dashboard (shared variant swap): `TimeClockWidget` (Clock In/Out = lg primary/secondary), `LeaveBalanceWidget` (Request Leave + View All Balances = md primary/secondary, same height and radius; removed orphaned colour-mix fallback), `HolidayCarousel` (neutral card, not accent-tinted).
- Tests: `Button.test.tsx` +4 (flat primary, 8px radius, destructive, aria-busy).

## Checks
- `npx tsc --noEmit` clean; eslint on touched files 0 errors; `lint:design-system` at baseline; full vitest 2640 passed (one transient `ResponsiveTable` failure from another worker's in-flight edit; passes on rerun, 17/17).
- Screenshots (looked at 9): `NU-CORE-emp-dashboard-{light,dark}-{1440,390}`, `NU-CORE-emp-leave_apply-*`, `NU-CORE-hr-employees-*` (Add Employee modal), admin@ = HR admin.

## Pages that hard-code controls (not edited, for the pages wave)
- `app/leave/apply/page.tsx`: Cancel / Submit and date inputs use their own classes (Cancel is white-on-white, date fields lack the new 40px height).
- `app/employees/_components/AddEmployeeModal.tsx`: modal sits at the bottom of the viewport at 1440x900 (dialog wave).
- Employee dashboard inline Inbox button (`app/dashboard`): different height from Button md.
- Quick Access "Inbox" row on dashboard still bespoke.
- `.input-aura` (globals) is h-9; pages using it are 36px, not 40.
- Clock time (`TimeClockWidget`) uses `.num`, now sans; check it reads well on 390px.

## Not done / notes
- Spec heights 36/40/44 for buttons conflict with the existing 32/36/44 contract and its tests; kept existing.
- Search field with clear button: not added (no shared search input exists; `Input` supports `icon` + `rightIcon`).
- Date picker wrappers not touched (Mantine DatePicker inherits Input styles through the theme).

## Follow-up: SearchField and date pickers
- New `components/ui/SearchField.tsx` (exported from `components/ui/index.ts`): leading Lucide search icon, clear button (`aria-label="Clear search"`) when non-empty, Escape clears, `fieldSize` sm 36 / md 40, token border/focus ring, tertiary placeholder, native cancel button hidden. Controlled (`value`, `onChange(string)`, optional `onClear`). No prior shared search input existed, so nothing was upgraded; pages still use Mantine `TextInput` (e.g. `app/employees/_components/EmployeesToolbar.tsx`) and can adopt it later. Tests: `SearchField.test.tsx` (4).
- Dates: no wrapper exists (about 10 pages use `@mantine/dates` directly), so styling is global. `mantine-theme.ts` sets DateInput / DatePickerInput / DateTimePicker / MonthPickerInput / TimeInput defaults (radius md, size sm = 36px, popover shadow md); the inputs inherit border and focus from the Input theme. `globals.css` (end of file) styles the calendar: accent-filled selected day, subtle today marker, subtle range fill, tertiary outside/disabled days, 8px day radius, focus-visible ring, neutral header text and arrows, elevated popover with overlay shadow. Selectors are attribute-based (`button[class*="-day "]`) because Mantine's class includes the host component name.
- Screenshots (viewed): `NU-CORE-date-{light,dark}-{1440,390}.png`; `NU-CORE-search-{light,dark}-1440.png` (same frame, top of page). Rendered from a temporary preview route that was deleted afterwards.
- Keyboard nav untouched (only visual CSS).
