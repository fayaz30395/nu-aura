# Handoffs

How work flows between commands and agents.

## Command Handoff Chain

```
/architect        →  artifacts/adr_*.md, system_design_*.md
       ↓
/builder          →  Code + tests
       ↓
/swarm-review     →  Feedback → back to /builder if needed
```

Each command reads the previous artifacts and builds on them.

## Swarm Orchestration Handoffs

```
/swarm-plan       →  artifacts/plan_*.md + Beads tasks
       ↓
/swarm-execute    →  Parallel workers implement tasks
       ↓
/swarm-review     →  Multi-perspective review (2-3x loop)
       ↓
PR creation       →  gh pr create
```

## Worker Completion

Every worker or session MUST follow the "Landing the Plane" protocol in `AGENTS.md`. The critical requirement: work is NOT complete until `git push` succeeds.

## Session Handoffs

Leave context for the next session:

```bash
# Write handoff message
echo '{"message": "Completed API endpoints. Remaining: tests for /users route."}' > .claude/hooks/.state/handoff.json
```

The next session's `session-start-loader.sh` will display this message on startup.

## Beads-Based Handoffs

Use Beads for structured handoffs between agents:

```bash
bd create "Continue: implement pagination for /users" --type=task
bd dep add <new-id> <completed-id>  # link dependency
```

Workers discover available work via `bd ready`.

---

[← Back to README](../README.md)
