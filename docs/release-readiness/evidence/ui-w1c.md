# UI Wave 1 batch C (W1-07, W1-08, W1-09)

- W1-07: ReviewCard rating fallback (overall, then self, then manager; "Not rated" when empty). Added `selfRating`/`managerRating` to `PerformanceReview` type. vitest 2/2 pass; tsc clean for touched files.
- W1-08: Removed nested `'&[data-active]'` from `styles/mantine-theme.ts`; added `.mantine-Tabs-tab[data-active]` to `app/globals.css`. `grep -rnF "'&[" styles/` returns nothing.
- W1-09: Added `data-testid` and `aria-label` to leave approve/reject buttons in `app/leave/approvals/page.tsx`. No logic change. eslint clean.
