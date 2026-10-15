---
title: Savvy-flow improvement plan
tags: [runbook, tooling, savvy-flow, plan]
summary: Evidence-based plan to harden savvy-flow worker briefs, orchestrator review and task-stop handling, with acceptance criteria and regression coverage. Proposal only; nothing implemented.
---

# Savvy-flow improvement plan

Status: **proposal, nothing implemented**. Written 2026-10-10 after the payslip-gating work.

## Where changes may go

Savvy-flow is a third-party plugin (`claude-kit/savvy-flow` 1.2.0). Its files live in
`~/.claude/plugins/cache/claude-kit/savvy-flow/1.2.0/` (`skills/savvy-flow/SKILL.md`, `agents/savvy-*.md`).
That cache is replaced on plugin update, so edits there would be lost. The plan therefore uses a
**project-local addendum** that the orchestrator is told to include in every brief, and a small check
script. Wiring the addendum into `CLAUDE.md` or the global hook configuration is a configuration change
and needs your explicit approval. Note that agent, skill and settings files are also write-guarded by the
faylo hook in this repo.

## Evidence from this session

| # | Observation | Source |
|---|---|---|
| E1 | A light/haiku worker's implementation passed 25 unit tests yet returned HTTP 400, not 404, for an unreleased payslip (`IllegalArgumentException` maps to 400) and hid payslips from super admins. Both were found only by the DB-backed integration run | `GlobalExceptionHandler.java:366-374`; `PayrollControllerTest` failures |
| E2 | The worker's own report listed "DB-backed tests not run" as unverified; the orchestrator accepted it for review without running them | worker report |
| E3 | After `TaskStop`, the stopped task kept appearing as "running" in Stop-hook feedback, and so did a task that had finished and been verified | Stop-hook feedback, repeated 5 times |
| E4 | One worker's idle/completion report never arrived in the orchestrator's context; its result had to be recovered from the transcript | `fe-404-check` |
| E5 | `TaskStop` itself returned success with no completion signal | `TaskStop` result |

## Change 1: worker brief addendum

Every brief for work that touches endpoints, authorization, or data visibility must contain:

1. **Exception to HTTP status table** for every error the change can raise, checked against the global
   handler (not assumed). Example row: `IllegalArgumentException -> 400`, `ResourceNotFoundException -> 404`.
2. **Authorization path matrix**, each row with the expected result: self-view, other-employee view, manager,
   team lead, holder of the broad permission (for example `PAYROLL_VIEW_ALL`), **super admin and system admin
   (bypass paths)**, unauthenticated, wrong tenant.
3. **Test obligation**: unit tests plus at least one DB-backed test when a query or schema is involved; the
   worker must state which ran, with real counts, and which could not run and why.
4. **Prohibited claims**: "not found" must name the exception and status; "unchanged for admins" must cite the
   bypass check.

### Acceptance criteria
- A script `scripts/savvy/check-brief.sh <brief.md>` exits non-zero if a brief for a gated change lacks the
  status table, the authorization matrix (including a bypass row), or the test obligation.
- A replay of the payslip task with the new brief produces a worker report that names the 400-versus-404
  mapping and the super-admin path **before** implementation (checked against this repo's handler).

### Regression coverage
- `scripts/savvy/test-check-brief.sh`: three fixture briefs (complete, missing status table, missing bypass
  row) with expected exit codes 0, 1, 1.

## Change 2: orchestrator review gate

Before accepting a task whose diff touches `@RequiresPermission` endpoints, `SecurityContext` use, a
`@Query`, or `domain/` entities, the orchestrator must run the DB-backed suite for the touched area and
record the command and counts in the review step. Workers' unit-test results are not sufficient.

Local command shape (documented in memory): start Colima, then
`DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true mvn -Dtest='<Class>*' test`.

### Acceptance criteria
- Review output for a gated change contains the integration test command, the pass/fail counts, and the
  Docker state. "Not run" blocks acceptance and requires an explicit human waiver.
- Nested JUnit classes are matched by a glob (`Class*`), because the bare class name reports 0 tests.

### Regression coverage
- A canary task that deliberately maps a missing resource to `IllegalArgumentException`: the review gate
  must fail on the DB-backed run and the task must not be accepted.

## Change 3: stop handling and completion signals

Goal: a stopped task is terminal, produces exactly one completion record, and never keeps a Stop hook
alive.

1. On `TaskStop`, the orchestrator immediately records `stopped` with a reason in its own ledger and calls
   `mcp__savvy-progress__progress` so the panel matches.
2. The Stop hook decides "work still running" from a live `ListAgents` call (state `running`), not from a
   cached task list. This is a hook prompt change in the user's global settings, so it needs approval.
3. Every worker must send one final structured message (`result`, `status`, `evidence`) before going idle.
   If none arrives within a bound, the orchestrator reads the worker transcript once and records that it did.

### Acceptance criteria (to be measured, not assumed)
- Experiment: spawn a trivial haiku worker, `TaskStop` it mid-run, then end the turn. Expected: the panel
  shows `stopped`, `ListAgents` shows it not running, and the Stop hook fires **at most once** about it.
- Experiment: a worker that finishes normally yields exactly one completion record in the orchestrator's
  context.
- Current behaviour (E3, E4, E5) is the baseline these must beat.

### Regression coverage
- Scripted replay of the two experiments, with the expected record counts asserted.

## Not yet verified

The task asked to verify that completion signals survive `TaskStop` and that stopped tasks cannot retrigger
the Stop hook. **The existing evidence (E3 to E5) says they do not hold today.** The controlled experiments
above have not been run, because they need a throwaway worker and a Stop-hook observation window; run them
before any change ships.
