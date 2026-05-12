---
description: Live-browser QA + real-time fixer loop (Chrome + DEV agent + sentinel-driven orchestrator)
---

Invoke the `qa-dev-loop` skill. Spawn QA (Chrome) + DEV (fixer) in parallel; orchestrator waits on
`docs/qa/QA-DONE` sentinel. Final report to `docs/qa/qa-dev-report-<date>.md`.
