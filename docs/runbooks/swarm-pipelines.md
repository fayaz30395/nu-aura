# Swarm Pipeline Runbook

Copy-paste templates for spawning a RuFlo agent swarm. Each pipeline matches a row in the
`CLAUDE.md` "Agent Routing" table and a canonical YAML definition under
`docs/swarm/workflows/`. Runtime copies are synced to `.claude-flow/workflows/`.

**Rule:** spawn ALL agents in ONE message with `run_in_background: true`, then kick off via a
single `SendMessage` to the first agent. Don't poll; agents message each other.

---

## Quickstart

From the repo root:

```bash
# 1) Verify local orchestration prerequisites and config drift
./scripts/agents/ready.sh

# 2) If drift is reported, sync tracked configs into .claude-flow/
./scripts/agents/ready.sh --fix

# 3) Dry-run a task-specific pipeline kickoff
./scripts/agents/start-work.sh feature "Add employee document expiry reminders"
./scripts/agents/start-work.sh opus4.8 "Classify mixed requirement and route dynamically"

# 4) Start/check Ruflo, then execute when the kickoff context looks right
./scripts/ruflo-start.sh
./scripts/ruflo-pipeline.sh feature "Add employee document expiry reminders" --execute
```

Use `feature`, `bug`, `security`, `refactor`, `perf`, or `opus4.8` as the first argument. The launcher
selects the matching YAML under `docs/swarm/workflows/`, injects the mandatory NU-AURA
rules into the kickoff context, checks swarm config drift, and then either prints or runs
the `npx ruflo@latest swarm ...` command.

If the MCP/RuFlo daemon is unavailable, `ready.sh` still validates the local repo setup and
prints the daemon start command.

---

## When to swarm

Per `CLAUDE.md`:

- **YES:** 3+ files, new feature, cross-module refactor, API change, security task,
  performance work
- **NO:** single-file edit, 1-2 line fix, docs-only, config tweak, question

If unsure, ask: "would I want a code review on this?" If yes → swarm.

---

## Pipeline 1: Feature

**Yaml:** `docs/swarm/workflows/feature-pipeline.yaml` (synced to `.claude-flow/workflows/feature-pipeline.yaml`)
**Flow:** architect → coder → tester → reviewer
**Use for:** new endpoints, new pages, new modules, anything in `PRD.md` rolling out.

```javascript
// ALL in one message
Agent({
  name: "architect",
  subagent_type: "system-architect",
  run_in_background: true,
  prompt: `You are the design lead for feature "<NAME>". Read CLAUDE.md, MEMORY.md, and
relevant docs/architecture/* files. Produce a 1-page design covering:
  - Affected bounded contexts (consult .claude-flow/domains.yaml)
  - Data model changes (note next Flyway V### from MEMORY.md)
  - API contracts (route, request, response, error codes)
  - RBAC permissions needed (@RequiresPermission)
  - Tenant-isolation impact (see ADR-010)
  - Test plan
SendMessage('coder', design) when ready.`
})
Agent({
  name: "coder",
  subagent_type: "coder",
  run_in_background: true,
  prompt: `Wait for design from 'architect'. Implement per CLAUDE.md non-negotiables:
  - Read existing files before editing; reuse frontend/lib/ Axios
  - RHF + Zod for forms; React Query for fetching; no any types
  - tenant_id on every query; @RequiresPermission on every endpoint
  - SuperAdmin bypasses — never block
Run cd frontend && npx tsc --noEmit; fix all errors.
SendMessage('tester', changeset).`
})
Agent({
  name: "tester",
  subagent_type: "tester",
  run_in_background: true,
  prompt: `Wait for changeset from 'coder'. Write tests for 80% JaCoCo coverage:
  - Unit (Mockito) for service
  - Integration (Testcontainers) for repo + controller
  - 1 e2e lifecycle per anthropic-skills:nu-aura-e2e-lifecycle
Run backend test suite. SendMessage('reviewer', results).`
})
Agent({
  name: "reviewer",
  subagent_type: "reviewer",
  run_in_background: true,
  prompt: `Wait for results from 'tester'. Run anthropic-skills:code-reviewer.
Validate: no tenant leak, SuperAdmin not blocked, no new Axios instance, no any,
forms use RHF+Zod, migration V### matches MEMORY.md.
Reply to Lead: APPROVE / CHANGES_REQUESTED / BLOCK.`
})

// Kick off
SendMessage({ to: "architect", summary: "Start feature <NAME>",
  message: "Feature: <NAME>\nContext: <2-line summary>\nAcceptance: <bullets>\nDeadline: <date>" })
```

---

## Pipeline 2: Bug

**Yaml:** `docs/swarm/workflows/bug-pipeline.yaml` (synced to `.claude-flow/workflows/bug-pipeline.yaml`)
**Flow:** researcher → coder → tester
**Use for:** any bug where root cause is unclear or fix is non-trivial.

```javascript
Agent({
  name: "researcher",
  subagent_type: "researcher",
  run_in_background: true,
  prompt: `Apply superpowers:systematic-debugging. Deliver:
  - Minimal reproduction
  - Root cause with file:line evidence
  - Blast radius (tenants/roles/modules affected)
  - Proposed fix (pseudocode only, DO NOT implement)
  - Regression test that would have caught it
SendMessage('coder', diagnosis).`
})
Agent({
  name: "coder",
  subagent_type: "coder",
  run_in_background: true,
  prompt: `Wait for diagnosis from 'researcher'. TDD: add regression test FIRST,
verify it fails, implement minimal fix, verify it passes. tsc --noEmit clean.
SendMessage('tester').`
})
Agent({
  name: "tester",
  subagent_type: "tester",
  run_in_background: true,
  prompt: `Wait for fix from 'coder'. Run new regression test + module suite +
relevant lifecycle test. Reply to Lead with PASS/FAIL + coverage delta.`
})

SendMessage({ to: "researcher", summary: "Investigate bug <ID>",
  message: "Bug: <description>\nSymptom: <observed>\nExpected: <should>\nRepro: <URL,role,error>" })
```

---

## Pipeline 3: Security

**Yaml:** `docs/swarm/workflows/security-pipeline.yaml` (synced to `.claude-flow/workflows/security-pipeline.yaml`)
**Flow:** security-architect → coder → security-auditor
**Use for:** closing audit findings, CVEs, hardening surfaces.

```javascript
Agent({
  name: "security-architect",
  subagent_type: "security-architect",
  run_in_background: true,
  prompt: `Threat-model the change. Per affected surface identify:
  - Attack vectors (OWASP Top 10)
  - Trust boundary crossed
  - Authn/authz gap
  - PII / financial exposure
  - Tenant isolation impact
  - Mitigations: defense-in-depth (edge, controller, service, DB)
Reference docs/security/baseline.md. SendMessage('coder', security design).`
})
Agent({
  name: "coder",
  subagent_type: "coder",
  run_in_background: true,
  prompt: `Wait for security design from 'security-architect'. Implement controls.
Mandatory: @RequiresPermission, input validation, tenant_id filter, audit emit
on writes, rate-limit if user-facing. No silent failure — log + throw.
tsc --noEmit. SendMessage('security-auditor').`
})
Agent({
  name: "security-auditor",
  subagent_type: "security-auditor",
  run_in_background: true,
  prompt: `Run anthropic-skills:senior-secops + senior-security.
Validate all controls present; static analysis clean; no new CVEs; audit-log entries
actually emitted (grep AuditService usage).
Reply to Lead: VERIFIED / GAPS_FOUND + scan output.`
})

SendMessage({ to: "security-architect", summary: "Close <finding ID>",
  message: "Task: <title>\nSource: <wave-N P0-X / CVE-YYYY-NNNN>\nSurface: <endpoint/module>\nSeverity: <P0/P1>\nRef: <audit file>" })
```

---

## Pipeline 4: Refactor

**Yaml:** `docs/swarm/workflows/refactor-pipeline.yaml` (synced to `.claude-flow/workflows/refactor-pipeline.yaml`)
**Flow:** architect → coder → reviewer
**Use for:** restructuring without behavior change. Hard rule: existing tests must pass
UNCHANGED.

```javascript
Agent({
  name: "architect",
  subagent_type: "system-architect",
  run_in_background: true,
  prompt: `Define refactor scope:
  - Current shape (files, deps, public API)
  - Target shape (proposed layout, new boundaries)
  - Migration path (one-shot vs incremental with feature flag)
  - What MUST NOT change (public API, DB schema, behavior)
  - Safety net (which tests catch regression)
If crossing a bounded context, consult .claude-flow/domains.yaml.
SendMessage('coder', migration plan).`
})
Agent({
  name: "coder",
  subagent_type: "coder",
  run_in_background: true,
  prompt: `Wait for plan from 'architect'. Refactor STRICTLY within scope.
RULES: no behavior change unless plan says so; existing tests must pass UNCHANGED;
if a test needs to change, the refactor is leaking — STOP and SendMessage architect.
Run full test suite at each commit. tsc --noEmit clean.
SendMessage('reviewer').`
})
Agent({
  name: "reviewer",
  subagent_type: "reviewer",
  run_in_background: true,
  prompt: `Verify: public API unchanged (diff base vs head); all tests pass with NO edits
(or only mechanical import-path updates); complexity/file size DOWN; no dead code.
Reply to Lead.`
})

SendMessage({ to: "architect", summary: "Refactor <area>",
  message: "Refactor: <description>\nMotivation: <debt/scaling/blocker>\nScope: <files>\nOut of scope: <NOT touched>" })
```

---

## Pipeline 5: Performance

**Yaml:** `docs/swarm/workflows/perf-pipeline.yaml` (synced to `.claude-flow/workflows/perf-pipeline.yaml`)
**Flow:** perf-engineer → coder
**Use for:** slow endpoints, N+1, slow batch jobs.

```javascript
Agent({
  name: "perf-engineer",
  subagent_type: "performance-engineer",
  run_in_background: true,
  prompt: `Quantify before changing. Steps:
  - Reproduce with a benchmark (JMH for backend / Lighthouse for frontend)
  - Capture baseline: p50/p95/p99 latency, CPU, memory, DB query count
  - Profile (async-profiler) or query log (pg_stat_statements) for hot path
  - Hypothesis: 1 change for ≥50% improvement
  - Rejected alternatives + why
Output: perf brief with numbers. SendMessage('coder', brief).`
})
Agent({
  name: "coder",
  subagent_type: "coder",
  run_in_background: true,
  prompt: `Wait for brief from 'perf-engineer'. Implement the fix. Re-run benchmark
with same input. Reply to Lead with before/after table. If fix is reusable, the brief
becomes a docs/patterns/ entry.`
})

SendMessage({ to: "perf-engineer", summary: "Perf <endpoint/job>",
  message: "Issue: <where>\nObserved: <numbers>\nTarget: <SLO or x% faster>\nRepro: <how>" })
```

---

## Pipeline 6: Opus4.8 Dynamic

**Yaml:** `docs/swarm/workflows/opus4-8-dynamic-workflow.yaml` (synced to `.claude-flow/workflows/opus4-8-dynamic-workflow.yaml`)
**Flow:** coordinator → selected dynamic tracks
**Use for:** mixed-signal requirements, ambiguous scope, or multi-track risk.

```javascript
Agent({
  name: "coordinator",
  subagent_type: "dynamic-coordinator",
  run_in_background: true,
  prompt: `Classify the requirement, then route to one or more tracks:
- feature
- bug
- security
- perf
If route includes security, require security-auditor reporting.
SendMessage to architect, tester, and security-auditor based on selected tracks.`
})

SendMessage({ to: "coordinator", summary: "Start Opus4.8 <task>",
  message: "Task: <description>\nAcceptance: <bullets>\nRisk: <P0/P1/P2>\nConstraints: <tenant_id, RBAC, @RequiresPermission>" })
```

---

## Anti-patterns

- **DON'T** spawn agents one at a time with sequential Agent() calls. They run in
  background; spawn ALL in one message.
- **DON'T** poll an agent's status. They `SendMessage` back when done.
- **DON'T** start a pipeline without naming agents. Names are the addressing scheme —
  unnamed agents can't `SendMessage` each other.
- **DON'T** omit `run_in_background: true`. Without it, the first Agent() call blocks
  the Lead.
- **DON'T** mix templates. If feature work has a security implication, run the feature
  pipeline AND add `security-auditor` as a final reviewer — don't half-pivot mid-flow.

---

## After the pipeline completes

The reviewer's final reply tells you what to do next:

- **APPROVE / VERIFIED:** changeset is ready. Lead commits (one bundled commit unless
  the work spans multiple features).
- **CHANGES_REQUESTED:** Lead reads the feedback, edits, re-runs the relevant agent (often
  just `coder` → `reviewer` again).
- **BLOCK:** Lead escalates to a human — there's a constraint the swarm can't resolve.

Lead then runs the post-task hooks:

```bash
npx ruflo@latest hooks post-task --task-id "<id>" --success true --store-results true
npx ruflo@latest memory store --namespace patterns --key "<name>" --value "<what worked>"
```

These feed RuFlo's AgentDB so the next session learns from this one.

---

## Quick reference: routing table

| Task type    | Pipeline file                                            | Agents                                         |
|--------------|----------------------------------------------------------|------------------------------------------------|
| Feature      | feature-pipeline.yaml                                    | architect → coder → tester → reviewer          |
| Bug          | bug-pipeline.yaml                                        | researcher → coder → tester                    |
| Security     | security-pipeline.yaml                                   | security-architect → coder → security-auditor  |
| Refactor     | refactor-pipeline.yaml                                   | architect → coder → reviewer                   |
| Performance  | perf-pipeline.yaml                                       | perf-engineer → coder                          |
| Opus4.8      | opus4-8-dynamic-workflow.yaml                            | dynamic-coordinator → dynamic tracks            |
