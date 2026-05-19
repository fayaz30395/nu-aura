---
name: "source-command-qa-dev-loop"
description: "Live-browser QA + real-time fixer loop (Chrome + DEV agent + sentinel-driven orchestrator)"
---

# source-command-qa-dev-loop

Use this skill when the user asks to run the migrated source command `qa-dev-loop`.

## Command Template

Invoke the `qa-dev-loop` skill. Spawn QA (Chrome) + DEV (fixer) in parallel; orchestrator waits on
`docs/qa/QA-DONE` sentinel. Final report to `docs/qa/qa-dev-report-<date>.md`.
