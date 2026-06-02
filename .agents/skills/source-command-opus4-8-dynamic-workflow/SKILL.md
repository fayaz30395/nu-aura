---
name: source-command-opus4-8-dynamic-workflow
description: Dynamic, requirement-aware orchestration workflow with runtime branch selection and recovery gates.
---

# Opus 4.8 Dynamic Workflow

Use this when the task requires adaptive orchestration (mixed feature + bug risk, or unknown
depth).

This workflow is designed for NU-AURA and follows the Opus4.8 pattern:
- classify requirement risk and scope
- branch into the right execution tracks
- run staged gates
- converge on a final decision and handoff

## Triggering

Use:

```bash
./scripts/agents/start-work.sh opus4.8 "<task>"
# Dry-run summary only

./scripts/ruflo-pipeline.sh opus4.8 "<task>" --execute
# Execute when the kickoff context is correct
```

## Workflow Design

1. **Intake + classification**: one coordinator detects complexity, impacted surfaces, risk,
   and required tracks.
2. **Dynamic branch routing**: coordinator emits a concrete execution plan for one or more of:
   - feature flow (architect → coder → tester → reviewer)
   - bug flow (researcher → coder → tester)
   - security flow (security-architect → coder → security-auditor)
   - performance flow (perf-engineer → coder)
3. **Execution**: track-specific agents implement the selected path.
4. **Recovery / hardening gates**: tester and auditors report failures before finalization.
5. **Delivery**: reviewer confirms gate closure and required evidence before status to Lead.

## Evidence Standards

- All claims in orchestration handoff must reference files or explicit agent outputs.
- The Lead must include:
  - task classification rationale
  - branches executed
  - pass/fail by gate (build/test/security/perf)
  - any deferred items and owners
