---
description: Run + auto-fix the generated Playwright suite (route smoke + RBAC + journeys) until green
---

Invoke the `playwright-autonomous` skill. Loops check→fix→retest with parallel cluster fixers (
≤5/iter), iter cap 5, wall cap 60min, fix cap 30. Final report to
`docs/qa/playwright/report-<date>.md`.
