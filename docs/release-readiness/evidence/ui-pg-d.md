# UI PG-D: NU-Hire pages (recruitment, careers, onboarding)

Current state: done except the items listed under Open. Drift findings in these folders: 26 to 0. tsc clean. eslint clean on touched files.

## Changed
- `app/recruitment/candidates/CandidateTableRow.tsx`: row component replaced by `CandidateRowActions` (same buttons, handlers, PermissionGates and disabled/loading logic, moved verbatim) and `buildCandidateColumns` (same cell markup, optional columns follow the toggle).
- `app/recruitment/candidates/page.tsx`: table is now shared `ResponsiveTable` with `ColumnVisibilityToggle` in `toolbar`, shared `EmptyState` (keeps "Add First Candidate"), row click still opens the detail page. Header is `PageHeader` with the same two actions.
- `app/recruitment/pipeline/page.tsx`: `PageHeader` (job selector and Add Applicant as actions), `QueryErrorCard` for job load errors, shared `EmptyState` for "No job selected" (top-aligned, one action: go to job openings). Shell changed from `page-shell-centered` to `page-shell`. Kanban: neutral columns, 1px borders, shared `Badge` for counts, shared `Card` for candidate cards.
- `app/recruitment/interviews/page.tsx`, `app/recruitment/scorecards/page.tsx`: `PageHeader`.
- `components/ui/PageHeader.tsx` (shared): actions wrapper now wraps (`flex-wrap min-w-0 max-w-full`) instead of `shrink-0`. Fixes the Add Applicant button overflowing at 390px. Affects every page using PageHeader.
- Earlier: onboarding pages (tracking, `text-2xs`, aria-labels, removed `min-h-[600px]`), `scorecards` text sizes.

## Screenshots (`screenshots/NU-PG-D-*`)
- 390x844 pipeline light and dark: viewed. overflowX 0. Header and selector wrap, kanban scrolls inside its own container.
- 390x844 jobs light: overflowX 0. Not visually reviewed in this pass.
- 390x844 candidates light: viewed. Header, stats and actions render. Table is below the fold on mobile.
- 1440 candidates dark: viewed. Header and stats fine. The table scrolls horizontally inside its container and the Actions column is cut off at 1440 width. Open.
- 1440 jobs light and dark, pipeline light: captured earlier. Jobs was reviewed. Pipeline light 1440 captured after the header change, not reviewed.

## Open
- Candidates table at 1440: Actions column is off-screen; needs column widths tightened or the table moved to a denser layout.
- Shared `PageHeader` title is `text-2xl` (24px). The brief asked for 28-32px. Not changed: it is the shared component and changing it affects every page.
- Candidates table has no pagination. The list was never paginated, so none was added. `TablePagination` exists if wanted.
- Row actions are hover/focus-revealed (existing behaviour). On touch devices they are not visible until focus. Not changed.
- Chart tokens on the pipeline funnel (`STAGE_COLORS` bars, `TONE_FILL`) left as-is.
- Loading and error states on other Hire pages (onboarding, scorecards, interviews) still use their own markup. Only pipeline and candidates use shared components.
- Onboarding local `PageHeader` duplicates the shared one. Not converted.
- `git diff --stat` shows changes in files I did not edit (e.g. `scorecards/loading.tsx`). Left untouched.
