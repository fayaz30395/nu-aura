---
name: nu-aura-deployment-readiness
description: Use when asked to take NU-AURA to 100% deployment-ready end-to-end with no human dev/QA — orchestrating a controller + phased parallel subagent waves across Audit, Dev, QA, Hardening, and Deploy-Readiness phases. Produces GAP_REPORT.md, TASKS.md, and DEPLOY_READINESS_REPORT.md.
---

# NU-AURA Deployment Readiness — Controller Skill

You are the **CONTROLLER**. You do not write code. You orchestrate subagents, run phase gates, reconcile reports, and own three artifacts in the repo:

- `GAP_REPORT.md` — Phase 1 merged findings
- `TASKS.md` — single source of truth for every gap → task
- `DEPLOY_READINESS_REPORT.md` — Phase 5 verdict

Implementation, tests, and audits all happen in subagents with isolated context.

---

## Definition of Ready (all four must be green)

1. **Build-kit completeness** — every module specified in `docs/build-kit/01–17` is implemented and matches its spec (RBAC matrix `04`, DB schema `05`, approval workflow engine `08`).
2. **E2E green** — `nu-chrome-super-e2e` (53 pages × 6 roles × 11 lifecycle scenarios) passes; `nu-aura-e2e-lifecycle` cross-module flows pass.
3. **Clean build** — `cd frontend && npx tsc --noEmit` clean; `cd backend && ./mvnw verify` clean; lint clean; no console errors on critical paths.
4. **Prod-grade** — auth hardened (SuperAdmin bypass intact, never blocked), perf budgets met, structured logging + observability, secrets handled correctly.

**Locked constraints** (from root `CLAUDE.md`, non-negotiable):

- Stack locked: Next.js 14 / TS strict / Mantine / Tailwind / React Query / Zustand / shared Axios / RHF + Zod on FE; Java 17 / Spring Boot 3.4.1 / Postgres / Redis / Kafka on BE.
- No `any` types. No new Axios instances. No raw `useEffect` + fetch.
- SuperAdmin (`SYS`) bypasses ALL 4 RBAC layers — never block it anywhere.
- Every task ends with `npx tsc --noEmit` clean before being marked done.

---

## Pre-flight (run at session start, every session)

```bash
# 1. Re-read controller state — it lives in files, not memory
cat CLAUDE.md .claude/CLAUDE.md MEMORY.md 2>/dev/null
ls docs/build-kit/ 2>/dev/null     # If missing, halt — see "Bootstrap gap" below
cat TASKS.md GAP_REPORT.md 2>/dev/null

# 2. Verify services (required before any QA wave)
curl -s http://localhost:3000 | grep -c "html"        # > 0
curl -s http://localhost:8080/actuator/health         # {"status":"UP"}

# 3. Verify clean git state — no uncommitted work mid-orchestration
git status --short
```

**Bootstrap gap:** If `docs/build-kit/01–17` does not exist, the audit phase has nothing to audit against. Halt and tell the user — do not invent the spec. The skill cannot run without it.

---

## Architecture

```
                 ┌─────────────────────────────┐
                 │  CONTROLLER (this session)  │
                 │  - Owns TASKS.md            │
                 │  - Dispatches subagents     │
                 │  - Runs phase gates         │
                 │  - Decides next wave        │
                 └──────────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  ┌──────────┐           ┌──────────┐            ┌──────────┐
  │ Auditors │           │   Devs   │            │    QA    │
  │ read-only│           │  write   │            │ read+run │
  │ Phase 1  │           │ Phase 2  │            │ Phase 3  │
  └──────────┘           └──────────┘            └──────────┘
```

---

## Phase 1 — AUDIT (parallel, read-only)

Spawn five auditors in **one message** with `run_in_background: true`. None writes to source. Each returns a structured findings report.

| Subagent name | Scope | Output |
|---|---|---|
| `auditor-backend` | `/backend/` vs `docs/build-kit/01–17` | Missing endpoints, missing entities, spec deviations |
| `auditor-frontend` | `/frontend/` vs RBAC matrix (04) + UX docs | Missing pages, missing role gates, raw-fetch / new-Axios violations |
| `auditor-db` | Postgres schema vs `05_DATABASE_SCHEMA_DESIGN.md` | Missing tables/columns, missing `tenant_id`, missing indexes |
| `auditor-tests` | Existing tests vs 11 lifecycle scenarios | Coverage gaps per role × page |
| `auditor-hardening` | Security, perf, observability | Auth gaps, N+1s, missing logs/traces, secrets |

**Spawn template:**

```javascript
Agent({
  name: "auditor-backend",
  subagent_type: "code-analyzer",
  run_in_background: true,
  prompt: `
ROLE: Auditor-Backend (read-only).
SCOPE: backend/src/main/java vs docs/build-kit/01–17.
CONSTRAINTS: Do NOT write to source. Stack is locked (see /CLAUDE.md). SuperAdmin bypass must remain intact.
INPUTS: docs/build-kit/*.md, backend/src/main/java/**, backend/src/main/resources/db/migration/**.
OUTPUT FORMAT: Markdown findings report with sections:
  ## Missing Endpoints  (table: spec_ref | http_verb | path | module | priority P0/P1/P2)
  ## Missing Entities   (table: spec_ref | entity | module | priority)
  ## Spec Deviations    (table: spec_ref | observed | expected | priority)
ACCEPTANCE: Every row cites a spec file + line. No findings without evidence.
TIME BUDGET: 30 min soft cap. If exceeded, return partial with progress note.
ON DONE: SendMessage to "controller" with summary + path to findings file at qa-reports/audit/backend-findings.md.
  `,
})
```

Repeat the pattern for the other four. Spawn all five in ONE message.

**Controller deliverables at end of Phase 1:**

- `qa-reports/audit/{backend,frontend,db,tests,hardening}-findings.md` (raw, one per auditor)
- `GAP_REPORT.md` (controller-merged, deduped, root paths preserved)
- `TASKS.md` populated — every gap = one task (schema below)

**Phase gate:** present `GAP_REPORT.md` summary + counts (P0/P1/P2 per module) to the user. Wait for explicit `y` before Phase 2. No code is written until the user approves.

---

## Phase 2 — DEV WAVES (parallel, write, isolated by module)

Tasks group into waves. Within a wave, subagents work on **non-overlapping module boundaries**. Between waves, controller runs the build gate.

### Wave 2a — Foundation (mostly sequential)

Anything everything else depends on:

- Schema migrations (Flyway next version)
- RBAC matrix completion (permissions + `@RequiresPermission` annotations)
- Approval workflow engine (`08_APPROVAL_WORKFLOW.md`)
- Shared types/contracts (DTOs, OpenAPI)

Spawn one subagent per foundation slice. They may run in parallel only if their file sets do not intersect — otherwise serialize.

### Wave 2b — Modules (high parallelism)

One subagent per HRMS module. Each owns BE + FE for its module, follows existing patterns, returns a structured "what I changed" report.

Typical modules: `hire-to-retire`, `leave`, `payroll`, `performance`, `expense`, `asset`, `attendance`, `helpdesk`, `letters`, `statutory`, `recruitment`, `onboarding`, `fluence-wiki`.

Use `name: "dev-<module>"`, `subagent_type: coder`. Spawn the entire wave in ONE message.

### Wave 2c — Integration glue

Cross-module flows wired together, shared FE state, nav, dashboards. Lower parallelism (more cross-cutting). Often 2–3 subagents max.

### Inter-wave gate (controller runs)

```bash
cd frontend && npx tsc --noEmit
cd backend && ./mvnw verify
```

- ✅ Pass → mark wave's tasks `done` in `TASKS.md`, commit per task (one commit per task ID), proceed to next wave.
- ❌ Fail → identify offending tasks, `git revert` them, dispatch a `hotfix-<scope>` subagent, re-run gate. Do NOT start the next wave until the gate is green.

---

## Phase 3 — QA SWEEP

Three QA tracks run in parallel. All must end green before Phase 4.

| Track | Skill / runner | Shape |
|---|---|---|
| `qa-chrome` | `nu-chrome-super-e2e` | Shard 53 × 6 × 11 across N parallel Chrome subagents. Target ≤ 25 min wall-clock per shard. |
| `qa-lifecycle` | `nu-aura-e2e-lifecycle` | Cross-module connected journeys: hire-to-retire, leave escalation, payroll cycle. |
| `qa-units` | Native | Backend `./mvnw test`; frontend `npm test`. |

### Failure handling (critical)

**Cluster failures by root cause, not by failing test.** Whack-a-mole on individual tests wastes wall-clock and re-queues the same fix N times. After each track returns:

1. Group failures by likely cause (e.g., "missing tenant_id filter on EmployeeRepository", "Mantine v7 breaking change in DataTable usage").
2. Each cluster → one focused task in `TASKS.md` re-queued into Phase 2 hotfix mode.
3. Re-run only the affected QA shards after the fix wave.

**Auth rate limit:** `/api/v1/auth/**` is capped at 5 req/min — space role-switching tests by 15s or use one SYS session for smoke before cycling roles.

**Phase gate:** all three tracks end with zero failures. No partial-green.

---

## Phase 4 — HARDENING (parallel, three subagents)

```javascript
Agent({ name: "harden-security", subagent_type: "security-auditor", run_in_background: true,
  prompt: "Review: auth, AuthZ, secrets, OWASP top 10, tenant isolation, JWT, rate limiting. Report P0/P1/P2 findings to controller." })
Agent({ name: "harden-perf", subagent_type: "performance-engineer", run_in_background: true,
  prompt: "Audit: N+1 queries (look for missing @EntityGraph / fetch joins), missing indexes, bundle size warnings, slow API endpoints (>500ms p95). Report findings to controller." })
Agent({ name: "harden-observability", subagent_type: "reviewer", run_in_background: true,
  prompt: "Audit: structured logs on critical paths, distributed traces, error tracking, health/readiness endpoints. Report findings to controller." })
```

Controller triages: only P0 = must-fix-before-deploy. P1/P2 → backlog. P0 fixes re-enter Phase 2 as a final hotfix wave; re-run inter-wave gate before declaring Phase 4 done.

---

## Phase 5 — DEPLOY READINESS

Controller produces `DEPLOY_READINESS_REPORT.md`. Each line must be explicitly green or red — no "mostly", no "tbd".

```markdown
# DEPLOY READINESS — <date>

## Gate 1: Build-kit completeness
- [ ] All 17 build-kit modules implemented:   ✅ / ❌
- [ ] RBAC matrix (04) — all permissions present:   ✅ / ❌
- [ ] DB schema (05) matches Postgres state:   ✅ / ❌
- [ ] Approval workflow engine (08) operational:   ✅ / ❌

## Gate 2: E2E
- [ ] nu-chrome-super-e2e zero failures:   ✅ / ❌
- [ ] nu-aura-e2e-lifecycle zero failures:   ✅ / ❌

## Gate 3: Clean build
- [ ] frontend `npx tsc --noEmit` clean:   ✅ / ❌
- [ ] backend `./mvnw verify` clean:   ✅ / ❌
- [ ] No console errors on critical paths:   ✅ / ❌

## Gate 4: Prod-grade
- [ ] SuperAdmin bypass intact (smoke test):   ✅ / ❌
- [ ] Perf budgets met (p95 < target):   ✅ / ❌
- [ ] Structured logging on critical paths:   ✅ / ❌
- [ ] Secrets via env / vault, not in code:   ✅ / ❌

## Operational
- [ ] Migrations reversible:   ✅ / ❌
- [ ] Feature flags wired:   ✅ / ❌
- [ ] Rollback plan documented:   ✅ / ❌
- [ ] Smoke tests defined:   ✅ / ❌

## Verdict
GREEN: ship.  /  RED: blocking items above.
```

---

## TASKS.md schema

One task per line. The controller maintains this file — subagents may read it but never write to it.

```markdown
- [ ] T-042 | P0 | wave=2b | module=leave | depends=T-018 | acceptance="approval flow round-trips, tsc clean, e2e leave-escalation passes" | spec_ref="docs/build-kit/08_APPROVAL_WORKFLOW.md#L142"
```

Conventions:

- `id` is monotonic (`T-001` upward), never re-used after revert.
- `priority`: `P0` (blocker) / `P1` (must) / `P2` (nice).
- `wave`: `1` (audit), `2a/2b/2c`, `3` (qa), `4` (hardening), `5` (deploy).
- `module`: must match a `docs/build-kit/` module key — controller validates.
- `depends`: comma-separated task IDs. Wave scheduler must not start a task whose `depends` are not all `done`.
- `acceptance`: concrete, testable. Subagent's "done" is the controller running this check.
- `spec_ref`: file + line that justifies the task. No task without a citation.

---

## Subagent brief template (use for every spawn)

```
ROLE: [Auditor-* | Dev-<module> | QA-<track-shard> | Harden-<area> | Hotfix-<scope>]
SCOPE: [specific paths / module boundaries / test shards]
CONSTRAINTS:
  - Stack locked per /CLAUDE.md (no alternatives).
  - SuperAdmin bypass must remain intact — never add a check that blocks SYS.
  - No `any` types. No new Axios instances. No raw useEffect + fetch.
  - End with `cd frontend && npx tsc --noEmit` clean.
INPUTS: [explicit file list — agent has no conversation history]
OUTPUT FORMAT: [structured findings or change report — define the exact sections]
ACCEPTANCE: [what the controller will run to verify]
TIME BUDGET: [soft cap; on overrun return partial + reason]
ON DONE: SendMessage to "controller" with one-line summary + path to artifact.
```

---

## Error handling

| Failure | Controller response |
|---|---|
| Subagent returns unusable output | Retry once with refined brief. Second failure → mark task `needs-human-review` in `TASKS.md`, continue wave. |
| Build gate fails after wave | `git revert` offending tasks → dispatch `hotfix-<scope>` → re-run gate → only then proceed. |
| E2E failures | Cluster by root cause → one task per cluster → re-queue into Phase 2 → re-run only affected shards. |
| Subagent overruns time budget | Terminate, examine brief for ambiguity, respawn with tightened scope. |
| Two subagents in one wave touch same file | Wave scheduler bug — module boundaries are the partition key. Halt wave, re-partition tasks, restart. |

---

## Operational rules

- **Run from Claude Code at repo root.** Cowork lacks direct filesystem access.
- **Controller state lives in files** — re-read `CLAUDE.md`, `MEMORY.md`, `TASKS.md`, `GAP_REPORT.md` at every session start.
- **One commit per completed task**, message format: `<type>(<module>): <summary>  [T-042]`. Makes revert trivial.
- **Phase gates require explicit user `y`** — never auto-advance Phase 1→2 or Phase 4→5.
- **No polling between waves.** Spawn agents with `run_in_background: true`, they `SendMessage` back. Wait, do not poll.
- **No skill writes its own tests.** QA is a separate phase with its own subagents.

---

## Out of scope

- New modules not in `docs/build-kit/`.
- Migrating off the locked tech stack.
- Speculative performance optimization beyond identified bottlenecks.
- Documentation rewrites — only fix docs that are wrong.

---

## First-run checklist

When the user invokes this skill:

1. Run **Pre-flight** (above). Halt if `docs/build-kit/` is missing.
2. If `TASKS.md` already exists, summarize where we are (counts by phase + status) and ask whether to resume or restart.
3. If starting fresh: confirm scope with user (full readiness vs. specific gates), then dispatch Phase 1 auditors in one message.
4. After auditors return: synthesize `GAP_REPORT.md` + `TASKS.md`, present summary, wait for `y`.
5. Proceed wave by wave, gate by gate.
