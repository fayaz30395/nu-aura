# Dark-mode text contrast: static audit (NULogic)

Date: 2026-11-20. Read-only grep/regex scan of `frontend/app` and `frontend/components` (.ts/.tsx/.jsx). No builds or browser.

## How color and dark mode work today
- `darkMode: 'class'` in `frontend/tailwind.config.js`; `.dark` on `<html>` (also `:root[data-theme="dark"]`) in `app/globals.css`.
- `accent-*` (and `primary-*`) = `rgb(var(--aura-accent-N-rgb))`. That scale is theme-independent: identical in light and dark (700 = #1d4ed8, 50 = #eff4ff). Only `accent`/`accent-hover`/`accent-text` DEFAULT vars flip in dark (#6EA8FE).
- `danger-*`, `success-*`, `warning-*` are hard-coded hex in tailwind.config.js (e.g. danger-600 #DC2626). No dark override anywhere.
- No `.dark .text-accent-*` style overrides exist in globals.css.

## Method
Scanned every quoted/backtick string literal. A hit = string contains `text-(accent|danger|success|warning)-(600|700|800)` (hover/focus variants counted) and has no `dark:text-` in the same literal; or `bg-(accent|danger|success)-500` + `text-white` with no `dark:bg-`/`dark:text-` in the same literal. Checkbox/radio and border utilities are not matched. The literal-based scan can miss classes split across several strings (`cn('a', cond && 'b')`), and it counts hits whose dark counterpart lives in a sibling literal.

## Totals
**846 hits in 203 files.**

| Pattern | Hits |
|---|---|
| text-accent-700 | 239 |
| text-danger-600 | 166 |
| text-success-600 | 97 |
| text-accent-600 | 92 |
| text-warning-600 | 64 |
| text-success-700 | 39 |
| text-accent-800 | 36 |
| text-warning-700 | 31 |
| bg-accent-500 + text-white | 26 |
| text-danger-700 | 26 |
| text-success-800 | 10 |
| text-warning-800 | 8 |
| text-danger-800 | 8 |
| bg-danger-500 + text-white | 3 |
| bg-success-500 + text-white | 1 |

## Top 15 files
| # | File | Hits |
|---|---|---|
| 1 | app/recruitment/interviews/page.tsx | 26 |
| 2 | app/dashboards/executive/page.tsx | 23 |
| 3 | app/learning/courses/[id]/quiz/[quizId]/page.tsx | 22 |
| 4 | app/announcements/page.tsx | 18 |
| 5 | app/biometric-devices/page.tsx | 17 |
| 6 | app/admin/integrations/webhooks/page.tsx | 16 |
| 7 | app/recruitment/pipeline/page.tsx | 15 |
| 8 | app/settings/sso/page.tsx | 13 |
| 9 | app/learning/courses/[id]/play/page.tsx | 13 |
| 10 | app/admin/roles/page.tsx | 12 |
| 11 | app/restricted-holidays/page.tsx | 12 |
| 12 | app/reports/scheduled/page.tsx | 12 |
| 13 | app/expenses/[id]/page.tsx | 11 |
| 14 | app/expenses/mileage/page.tsx | 11 |
| 15 | app/resources/pool/page.tsx | 11 |

## Caveat: not all hits are real failures
About 140 of the text hits sit in the same string as a light tinted background (`bg-*-50/100/200`). Those are badges/chips. Because the scales do not flip in dark, light bg + dark text keeps its light-mode contrast and passes. Roughly 660 hits have no tinted bg in the same literal and are likely text directly on the dark surface (true risks), but some of these have the tinted bg in a neighboring literal. Treat 846 as an upper bound, ~660 as the likely-real count. Only a browser/axe pass can confirm.

## Can one central fix cover it?
Partially. Two central options:

1. Redefine the dark values of the 600/700/800 steps (e.g. in a `.dark` block, or make semantic scales CSS-var driven). Covers all 846 with no per-file edits. But it is unsafe as-is: the same tokens are used for text on light tinted badges (~140+ hits) and for icon/fill uses. Lightening `text-accent-700` in dark would put pale text on a still-light `bg-accent-50` badge and break those. It would only be safe if the 50-200 tints are also made dark-aware in the same change (`--aura-accent-50..200` becoming translucent dark tints, as `--accent-soft` already does). That is a large visual change: every badge, alert and highlight in dark mode shifts. It needs a full dark visual regression pass.
2. Codemod: append `dark:text-accent-300` / `dark:text-danger-400` / `dark:text-success-400` / `dark:text-warning-400` (and `dark:bg-accent-600` for white-on-500 solids) to each hit that does not already have a dark counterpart. Matches what commit 4c5cfb0f did by hand. Mechanical, local, reviewable per file. Exclude strings that also have a light tinted bg (or have the codemod add `dark:bg-*` tints too), otherwise badges break.

## Safest option
Codemod (option 2), scoped to hits with no light tinted bg in the same literal (~660), run in batches by the 15 files above first (they hold roughly 230 hits). Visual change: only dark mode; accent text goes from #1d4ed8 to #93b4fa, danger from #dc2626 to #f87171, success/warning to their 400 steps; solid blue buttons go from #3b82f6 to #2563eb. Light mode is unchanged. Follow with a re-run of axe on a sample of pages, since the scan cannot see split class strings.

Not changed: nothing applied; this file is the only artifact.
