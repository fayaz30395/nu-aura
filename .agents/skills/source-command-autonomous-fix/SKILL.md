---
name: "source-command-autonomous-fix"
description: "Run the autonomous-fix-loop skill — check, fix, verify in parallel until repo is green"
---

# source-command-autonomous-fix

Use this skill when the user asks to run the migrated source command `autonomous-fix`.

## Command Template

Invoke the `autonomous-fix-loop` skill via the Skill tool. Run to completion without prompting the
user. Iteration cap 10, wall cap 90 min. Write the final report to
`docs/qa/autonomous-fix-<date>.md`.
