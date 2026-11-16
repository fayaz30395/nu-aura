# NU-Grow pages (worker ui-pg-e), partial

## Changed
- `frontend/app/surveys/pulse/page.tsx`: status/anon/meta text 10px -> text-xs tokens; Publish/Close/Del use Button variants (Close no longer amber, Del = destructive variant); removed slate/red/amber palette classes.
- `frontend/app/surveys/page.tsx`, `surveys/[id]/page.tsx`, `surveys/[id]/analytics/page.tsx`, `surveys/[id]/respond/page.tsx`: aria-label on icon-only buttons; respond card min-w-[80px] -> min-w-20.
- `frontend/app/training/_components/ManageProgramsTab.tsx`: aria-label on icon-only buttons.
- `frontend/app/training/catalog/page.tsx`: min-w arbitrary values -> scale classes.
- `frontend/app/learning/page.tsx`: tracking-[0.18em] -> tracking-widest; card icon 18px -> h-4 w-4.
- `frontend/app/performance/okr/_components/okrConfig.tsx`, `ObjectiveCard.tsx`: progress fill is accent-500 by default; warning/danger only for AT_RISK / BEHIND (was 4-step colour by percent).

## Checks
- `npm run lint:design-system`: 0 findings left in NU-Grow folders except 3 intentional embed heights (training catalog/[id] iframe/image, learning play iframe) and 1 layout height in respond page is fixed; global ratchet not re-run as a gate.
- `npx tsc --noEmit`: exit 0.
- `npx eslint` on touched files: exit 0.
- `npx vitest run app/performance/okr app/surveys app/learning app/training`: 1 file, 5/5 pass.

## Not done
- Screenshots (NU-PG-E-*): not taken, no Playwright run.
- Broad replacement of hand-rolled buttons/cards/tables/empty states across performance/** (118 files) not done.
- Charts, 390px overflow sweep, and dark-mode review not done.
- No app/reviews or app/feedback folder exists.

## Round 2
- `frontend/app/performance/reviews/_components/ReviewCard.tsx`: shared Card (bordered), Badge variants, ui Button; test ids and labels unchanged.
- `frontend/app/performance/okr/_components/ObjectiveCard.tsx`: article card-aura -> shared Card.
- Screenshots (employee arun@, demo): `NU-PG-E-employee-performance_okr-light-1440.png`, `...performance_reviews-light-1440.png`, `...learning-light-1440.png`, plus dark-1440 and 390 variants for the same three pages. Reviewed light-1440 and reviews-390 (no horizontal overflow, scrollWidth = clientWidth).
- Blocked: the shared dev server shows a Next build error from `app/admin/employees/page.tsx` (another worker's file). Several dark and 390 captures were overlaid by it; re-run once that file compiles.
- Not done: manager (sumit@) captures; the remaining ~20 pages in app/performance and app/learning still use hand-rolled cards and bespoke progress/chart markup.
