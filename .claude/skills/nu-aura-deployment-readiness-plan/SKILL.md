---
name: nu-aura-deployment-readiness-plan
description: Step-by-step executable plan for taking NU-AURA to deployment-ready via a controller-orchestrated multi-agent workflow (Bootstrap → Audit → Dev waves → QA → Hardening → Deploy verdict). Use this when executing the readiness workflow task-by-task — designed to be driven by superpowers:subagent-driven-development or superpowers:executing-plans. State lives in docs/superpowers/state/. The companion skill nu-aura-deployment-readiness covers the architecture / why; this one is the how, with checkboxes.
---

# NU-AURA Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive NU-AURA from current state to deployment-ready via a controller-orchestrated multi-agent workflow.

**Architecture:** A single controller (the Claude Code session in the repo) runs five phases. Each phase dispatches parallel subagents with structured briefs and reconciles their reports. The controller never writes feature code itself — it only orchestrates, runs build gates, and updates `TASKS.md`.

**Tech Stack:** Claude Code as the controller surface; built-in `Agent` tool for subagent dispatch; existing repo skills (`nu-chrome-super-e2e`, `nu-aura-e2e-lifecycle`, `senior-security`, `engineering:deploy-checklist`); Next.js 14 / TS / Mantine / Tailwind / React Query / Zustand on FE; Java Spring Boot on BE; Postgres.

**Run this from:** `~/IdeaProjects/nulogic/nu-aura` in Claude Code. Not Cowork.

---

## File Structure (state files the controller maintains)

| Path | Owner | Purpose |
|---|---|---|
| `docs/superpowers/state/TASKS.md` | controller | single source of truth for every task with id/phase/wave/priority/status |
| `docs/superpowers/state/GAP_REPORT.md` | controller | Phase 1 merged auditor findings |
| `docs/superpowers/state/AUDITOR_RAW/` | controller | raw per-auditor reports for traceability |
| `docs/superpowers/state/WAVE_REPORTS/` | controller | per-wave change reports from dev subagents |
| `docs/superpowers/state/QA_RESULTS/` | controller | Phase 3 test outputs and failure clusters |
| `docs/superpowers/state/DEPLOY_READINESS_REPORT.md` | controller | Phase 5 verdict |

All state lives in files, not memory. Every session start begins by reading these.

---

## Task 0: Bootstrap state files

**Files:**
- Create: `docs/superpowers/state/TASKS.md`
- Create: `docs/superpowers/state/GAP_REPORT.md`
- Create: `docs/superpowers/state/AUDITOR_RAW/.gitkeep`
- Create: `docs/superpowers/state/WAVE_REPORTS/.gitkeep`
- Create: `docs/superpowers/state/QA_RESULTS/.gitkeep`

- [ ] **Step 1: Create state directory structure**

```bash
mkdir -p docs/superpowers/state/AUDITOR_RAW
mkdir -p docs/superpowers/state/WAVE_REPORTS
mkdir -p docs/superpowers/state/QA_RESULTS
touch docs/superpowers/state/AUDITOR_RAW/.gitkeep
touch docs/superpowers/state/WAVE_REPORTS/.gitkeep
touch docs/superpowers/state/QA_RESULTS/.gitkeep
```

- [ ] **Step 2: Seed `TASKS.md`**

```markdown
# NU-AURA Readiness — TASKS

Schema: `- [ ] T-NNN | phase=N | wave=Nx | priority=P0|P1|P2 | module=<name> | depends=<id,id> | acceptance="<criteria>"`

## Phase 1 — AUDIT
(populated after Phase 1 auditors run)

## Phase 2 — DEV WAVES
(populated from GAP_REPORT.md after Phase 1 gate approval)

## Phase 3 — QA
- [ ] T-Q01 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="nu-chrome-super-e2e exits 0"
- [ ] T-Q02 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="nu-aura-e2e-lifecycle exits 0"
- [ ] T-Q03 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="mvn test and npm test both exit 0"

## Phase 4 — HARDENING
- [ ] T-H01 | phase=4 | wave=4a | priority=P0 | module=security | depends=phase-3-complete | acceptance="senior-security report has zero P0 findings"
- [ ] T-H02 | phase=4 | wave=4a | priority=P0 | module=perf | depends=phase-3-complete | acceptance="no N+1s on top 20 endpoints; bundle within budget"
- [ ] T-H03 | phase=4 | wave=4a | priority=P0 | module=observability | depends=phase-3-complete | acceptance="structured logs + traces on all critical paths"

## Phase 5 — DEPLOY READINESS
- [ ] T-D01 | phase=5 | wave=5a | priority=P0 | module=release | depends=phase-4-complete | acceptance="DEPLOY_READINESS_REPORT.md shows green on all 4 criteria"
```

- [ ] **Step 3: Seed `GAP_REPORT.md`**

```markdown
# NU-AURA Gap Report

Generated: <auto-fill>
Phase 1 status: pending

## Backend Gaps
(populated by Auditor-Backend)

## Frontend Gaps
(populated by Auditor-Frontend)

## DB Gaps
(populated by Auditor-DB)

## Test Gaps
(populated by Auditor-Tests)

## Hardening Gaps
(populated by Auditor-Hardening)
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/state/
git commit -m "chore: bootstrap deployment readiness state files"
```

---

## Task 1: Phase 1 — Dispatch five auditors in parallel

**Files:**
- Write: `docs/superpowers/state/AUDITOR_RAW/backend.md` (subagent output)
- Write: `docs/superpowers/state/AUDITOR_RAW/frontend.md`
- Write: `docs/superpowers/state/AUDITOR_RAW/db.md`
- Write: `docs/superpowers/state/AUDITOR_RAW/tests.md`
- Write: `docs/superpowers/state/AUDITOR_RAW/hardening.md`

- [ ] **Step 1: Dispatch all five auditor subagents in a single message (parallel)**

Call the `Agent` tool five times in one message with `subagent_type: "general-purpose"`. Use these exact briefs:

**Brief — Auditor-Backend:**
```
ROLE: Auditor-Backend (read-only)
SCOPE: /backend/ directory of NU-AURA
INPUTS:
  - Read every file under docs/build-kit/ (especially 01-17)
  - Read CLAUDE.md and MEMORY.md
  - Walk /backend/src/ structure
TASK:
  Compare what the build-kit specs require against what exists in /backend/.
  For each HRMS module (hire-to-retire, leave, payroll, performance, expense, asset, etc.),
  identify: missing controllers, missing services, missing entities, missing endpoints,
  endpoints that exist but deviate from spec, missing tenant_id enforcement.
CONSTRAINTS:
  - Read only. No writes.
  - Do not propose fixes. Just enumerate gaps.
OUTPUT FORMAT:
  Write a markdown report to docs/superpowers/state/AUDITOR_RAW/backend.md with sections:
    ## Missing endpoints
    ## Missing entities
    ## Spec deviations
    ## Tenant isolation gaps
    ## Other
  Each gap as a bullet with: severity (P0/P1/P2), module, file path, one-line description, build-kit doc reference.
TIME BUDGET: 30 min.
ACCEPTANCE: file exists, has all five sections, each gap has all required fields.
```

**Brief — Auditor-Frontend:**
```
ROLE: Auditor-Frontend (read-only)
SCOPE: /frontend/ directory of NU-AURA
INPUTS:
  - Read docs/build-kit/04_RBAC_PERMISSION_MATRIX.md and any UX docs
  - Walk /frontend/app/, /frontend/components/, /frontend/lib/
TASK:
  Enumerate gaps: missing pages per RBAC matrix, missing role guards,
  forms not using React Hook Form + Zod, data fetching not using React Query,
  Axios instances created outside frontend/lib/, any 'any' types,
  raw useEffect+fetch usage, missing SuperAdmin bypass paths.
CONSTRAINTS:
  - Read only.
  - Reference exact file paths and line numbers.
  - SuperAdmin must never be blocked — flag any code that does so.
OUTPUT FORMAT:
  Write to docs/superpowers/state/AUDITOR_RAW/frontend.md with sections:
    ## Missing pages
    ## Missing role guards
    ## Pattern violations (forms / data fetching / Axios / 'any')
    ## SuperAdmin bypass leaks
    ## Other
TIME BUDGET: 30 min.
ACCEPTANCE: file exists, gaps reference specific files and line numbers.
```

**Brief — Auditor-DB:**
```
ROLE: Auditor-DB (read-only)
SCOPE: Postgres schema and migration files
INPUTS:
  - Read docs/build-kit/05_DATABASE_SCHEMA_DESIGN.md
  - Read all migration files under /backend/src/main/resources/db/
  - Read entity classes under /backend/src/main/java/
TASK:
  Identify: missing tables, missing columns, missing indexes, missing tenant_id columns,
  missing foreign keys, schema deviations from spec, missing audit columns
  (created_at, updated_at, created_by, etc.).
OUTPUT FORMAT:
  docs/superpowers/state/AUDITOR_RAW/db.md with sections:
    ## Missing tables
    ## Missing columns
    ## Missing tenant_id
    ## Missing indexes
    ## Schema deviations
TIME BUDGET: 20 min.
ACCEPTANCE: file exists, every gap cross-references the spec section.
```

**Brief — Auditor-Tests:**
```
ROLE: Auditor-Tests (read-only)
SCOPE: All test directories
INPUTS:
  - Read the nu-aura-e2e-lifecycle skill (its 11 scenarios)
  - Read the nu-chrome-super-e2e skill (53 pages × 6 roles)
  - Walk existing tests
TASK:
  Produce a coverage matrix: which (role × page) combinations have no test,
  which lifecycle scenarios have no integration coverage, which modules have no unit tests.
OUTPUT FORMAT:
  docs/superpowers/state/AUDITOR_RAW/tests.md with:
    ## Coverage matrix (role × page table)
    ## Missing lifecycle scenarios
    ## Modules without unit tests
TIME BUDGET: 20 min.
ACCEPTANCE: matrix is complete; gaps enumerated.
```

**Brief — Auditor-Hardening:**
```
ROLE: Auditor-Hardening (read-only)
SCOPE: Whole codebase, focused on prod-readiness
INPUTS:
  - Walk both /backend/ and /frontend/
TASK:
  Identify: missing auth checks, secret leaks, missing input validation,
  N+1 query suspects, missing indexes on hot paths, missing structured logging,
  missing error tracking, missing health endpoints, missing rate limits.
OUTPUT FORMAT:
  docs/superpowers/state/AUDITOR_RAW/hardening.md with sections:
    ## Security gaps
    ## Perf gaps
    ## Observability gaps
TIME BUDGET: 25 min.
ACCEPTANCE: file exists; each gap has severity and remediation hint.
```

- [ ] **Step 2: Wait for all five subagents to return.** Do not move on while any are still running.

- [ ] **Step 3: Verify all five files exist and have required sections**

```bash
for f in backend frontend db tests hardening; do
  test -s "docs/superpowers/state/AUDITOR_RAW/${f}.md" || echo "MISSING: $f"
done
```
Expected: no output (all files present and non-empty).

- [ ] **Step 4: Commit raw audit reports**

```bash
git add docs/superpowers/state/AUDITOR_RAW/
git commit -m "docs: phase-1 raw auditor reports"
```

---

## Task 2: Reconcile audit findings into `GAP_REPORT.md`

**Files:**
- Modify: `docs/superpowers/state/GAP_REPORT.md`

- [ ] **Step 1: Read all five raw auditor reports yourself (controller, not subagent).**

Read each file in `docs/superpowers/state/AUDITOR_RAW/`. Do not summarize — preserve all findings.

- [ ] **Step 2: Deduplicate and merge into `GAP_REPORT.md`**

A "duplicate" is the same gap reported by two auditors (e.g., Backend says "leave-approval endpoint missing", QA-Tests says "no test for leave-approval"). Keep both, but cross-link.

Write the merged report with this structure:

```markdown
# NU-AURA Gap Report

Generated: <today>
Phase 1 status: complete
Total gaps: <N>  (P0: <a>, P1: <b>, P2: <c>)

## Backend Gaps
<all P0 first, then P1, then P2>
- [Severity] [Module] [File:line] [Description] [Build-kit ref] [Cross-ref to test gap if any]

## Frontend Gaps
...

## DB Gaps
...

## Test Gaps
...

## Hardening Gaps
...

## Cross-cutting clusters
<gaps that span multiple sections — e.g., "leave module missing across BE+FE+tests">
```

- [ ] **Step 3: Commit `GAP_REPORT.md`**

```bash
git add docs/superpowers/state/GAP_REPORT.md
git commit -m "docs: phase-1 merged gap report"
```

---

## Task 3: Generate `TASKS.md` for Phase 2 from gaps

**Files:**
- Modify: `docs/superpowers/state/TASKS.md`

- [ ] **Step 1: Convert each P0 gap to a task; group P1s; defer P2s to a backlog section**

For each gap in `GAP_REPORT.md`:
1. Assign a stable task ID (`T-NNN` incrementing).
2. Place in a wave:
   - Wave 2a if it's foundation (schema, RBAC, approval engine, shared types).
   - Wave 2b if it's module-level (one task = one module's worth of related fixes).
   - Wave 2c if it's integration glue (nav, dashboards, cross-module flows).
3. Encode dependencies (a Wave 2b leave-module task depends on Wave 2a's tenant_id schema task, etc.).
4. Write an acceptance criterion that is concrete and verifiable.

- [ ] **Step 2: Write the Phase 2 section of `TASKS.md`**

Example entries:
```markdown
## Phase 2 — DEV WAVES

### Wave 2a — Foundation
- [ ] T-001 | phase=2 | wave=2a | priority=P0 | module=schema | depends= | acceptance="all tables in 05_DATABASE_SCHEMA_DESIGN.md exist with tenant_id; migration is reversible; mvn flyway:info clean"
- [ ] T-002 | phase=2 | wave=2a | priority=P0 | module=rbac | depends=T-001 | acceptance="every role in 04_RBAC_PERMISSION_MATRIX.md has its permissions seeded; @PreAuthorize on every controller method; SuperAdmin bypass test green"
- [ ] T-003 | phase=2 | wave=2a | priority=P0 | module=approval-engine | depends=T-001 | acceptance="approval state machine matches 08_APPROVAL_WORKFLOW_ENGINE.md; unit tests for each transition green"

### Wave 2b — Modules (parallelizable)
- [ ] T-010 | phase=2 | wave=2b | priority=P0 | module=leave | depends=T-001,T-002,T-003 | acceptance="leave request → approval → balance update round-trip works; FE form uses RHF+Zod; React Query for fetching; tsc clean"
- [ ] T-011 | phase=2 | wave=2b | priority=P0 | module=payroll | depends=T-001,T-002 | acceptance="..."
... (one per module identified in gaps)

### Wave 2c — Integration glue
- [ ] T-030 | phase=2 | wave=2c | priority=P0 | module=nav | depends=<all 2b> | acceptance="every role sees only their permitted nav items; dashboards render for all 6 roles"
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/state/TASKS.md
git commit -m "docs: phase-2 task breakdown from gap report"
```

---

## Task 4: PHASE 1 GATE — user approval

- [ ] **Step 1: Pause and present to user**

Show:
- Total gap count by severity
- Number of Phase 2 tasks by wave
- Top 10 P0 cross-cutting clusters
- Estimated wave runtime

Prompt: *"Phase 1 audit complete. Review `GAP_REPORT.md` and `TASKS.md`. Approve to start Phase 2 dev waves? (yes / edit-tasks / re-audit)"*

- [ ] **Step 2: Do not proceed until user types approval.**

If user says "edit-tasks": loop back to Task 3 with their changes.
If user says "re-audit": loop back to Task 1.

---

## Task 5: Wave 2a — Foundation (sequential within wave)

**Why sequential:** schema → RBAC → approval engine each depends on the previous.

- [ ] **Step 1: For each task in Wave 2a (in dependency order), dispatch one Dev subagent**

Brief template — fill in `<id>`, `<module>`, `<acceptance>` from `TASKS.md`:

```
ROLE: Dev-<module>
TASK ID: <id>
SCOPE: <specific paths from gap report>
INPUTS:
  - Read CLAUDE.md, MEMORY.md
  - Read relevant build-kit doc(s)
  - Read the gap report entries referenced by this task
  - Read existing code in the scope to understand patterns
CONSTRAINTS:
  - Follow ALL non-negotiable rules in CLAUDE.md.
  - Use existing Axios instance in frontend/lib/.
  - No `any` types. RHF + Zod for forms. React Query for data.
  - Never block SuperAdmin.
  - Write tests first (TDD), then implementation.
  - Make a single commit at the end with message "feat(<module>): <id> <short summary>".
TASK:
  Implement the changes to satisfy: <acceptance>
OUTPUT FORMAT:
  Write a change report to docs/superpowers/state/WAVE_REPORTS/<id>.md with:
    ## Files changed (with one-line description each)
    ## Tests added
    ## Build verification (paste tsc and mvn output)
    ## Acceptance verification (how you verified the acceptance criterion)
TIME BUDGET: 60 min per task.
ACCEPTANCE: change report exists, `cd frontend && npx tsc --noEmit` clean, relevant backend build clean.
```

- [ ] **Step 2: After each Wave 2a subagent returns, run inter-task gate**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && ./mvnw verify -DskipTests=false
```
Expected: both clean.

If either fails, dispatch a Hotfix subagent with the failing output and the task's change report. Block the next 2a task until clean.

- [ ] **Step 3: Mark Wave 2a tasks complete in `TASKS.md`** (change `[ ]` to `[x]`).

- [ ] **Step 4: Commit state file updates**

```bash
git add docs/superpowers/state/TASKS.md docs/superpowers/state/WAVE_REPORTS/
git commit -m "chore: wave 2a complete"
```

---

## Task 6: Wave 2b — Modules (parallel)

- [ ] **Step 1: Identify all Wave 2b tasks whose dependencies are satisfied**

A task is dispatchable if every `depends=` id is checked off in `TASKS.md`.

- [ ] **Step 2: Dispatch up to 5 Dev subagents in parallel**

Use the same brief template from Task 5 — but only dispatch tasks that touch non-overlapping module boundaries (a leave-module task and a payroll-module task can run in parallel; two tasks both touching `/frontend/components/common/` cannot).

Call the `Agent` tool 5 times in one message.

- [ ] **Step 3: Wait for all five to return, then run wave gate**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && ./mvnw verify -DskipTests=false
```
Expected: both clean.

If failures, cluster by file/module, dispatch hotfix subagents in parallel (one per cluster), re-run gate.

- [ ] **Step 4: Mark completed tasks in `TASKS.md`. Loop to Step 1 until no Wave 2b tasks remain.**

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/state/TASKS.md docs/superpowers/state/WAVE_REPORTS/
git commit -m "chore: wave 2b complete"
```

---

## Task 7: Wave 2c — Integration glue

- [ ] **Step 1: Dispatch integration subagents (parallel where safe)**

Use the same Dev brief template. Integration tasks typically touch shared FE state, nav, dashboards — coordinate to avoid file conflicts.

- [ ] **Step 2: Wave gate**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && ./mvnw verify -DskipTests=false
```

- [ ] **Step 3: Mark complete, commit**

```bash
git add -A
git commit -m "chore: wave 2c complete — phase 2 done"
```

---

## Task 8: Phase 3 — QA Sweep (three tracks in parallel)

**Files:**
- Write: `docs/superpowers/state/QA_RESULTS/super-e2e.md`
- Write: `docs/superpowers/state/QA_RESULTS/lifecycle-e2e.md`
- Write: `docs/superpowers/state/QA_RESULTS/unit-integration.md`

- [ ] **Step 1: Dispatch three QA subagents in one message**

**Brief — QA-Super-E2E:**
```
ROLE: QA-Super-E2E
TASK: Invoke the nu-chrome-super-e2e skill and run the full sweep (53 × 6 × 11).
OUTPUT: Write results to docs/superpowers/state/QA_RESULTS/super-e2e.md with:
  ## Summary (pass/fail counts)
  ## Failures (grouped by root-cause cluster, NOT by individual test)
  ## Logs per cluster
TIME BUDGET: 90 min.
ACCEPTANCE: skill ran to completion; file exists with clusters.
```

**Brief — QA-Lifecycle-E2E:**
```
ROLE: QA-Lifecycle-E2E
TASK: Invoke nu-aura-e2e-lifecycle and run all cross-module scenarios.
OUTPUT: docs/superpowers/state/QA_RESULTS/lifecycle-e2e.md
TIME BUDGET: 60 min.
ACCEPTANCE: every scenario has a pass/fail result.
```

**Brief — QA-Unit-Integration:**
```
ROLE: QA-Unit-Integration
TASK:
  cd backend && ./mvnw test
  cd ../frontend && npm test -- --watchAll=false
OUTPUT: docs/superpowers/state/QA_RESULTS/unit-integration.md with full output and pass/fail counts.
TIME BUDGET: 30 min.
ACCEPTANCE: both commands ran; output captured.
```

- [ ] **Step 2: Cluster failures across all three tracks**

Controller reads all three QA result files. Group failures by root cause (same broken endpoint, same broken component, same broken migration). One cluster → one re-queue task.

- [ ] **Step 3: If any clusters exist, create Wave 2b' (re-queue tasks) and loop back to Task 6**

Append new tasks to `TASKS.md`:
```markdown
### Wave 2b' — QA-driven hotfixes
- [ ] T-100 | phase=2 | wave=2b' | priority=P0 | module=<inferred> | depends= | acceptance="cluster T-100 in QA_RESULTS resolved; re-run nu-chrome-super-e2e for affected pages passes"
```

Then dispatch Dev subagents for each. After they complete, re-run Phase 3.

- [ ] **Step 4: When all three QA tracks are green, mark Phase 3 complete**

```bash
git add -A
git commit -m "test: phase 3 QA green"
```

---

## Task 9: Phase 4 — Hardening (three tracks in parallel)

**Files:**
- Write: `docs/superpowers/state/QA_RESULTS/security.md`
- Write: `docs/superpowers/state/QA_RESULTS/perf.md`
- Write: `docs/superpowers/state/QA_RESULTS/observability.md`

- [ ] **Step 1: Dispatch three hardening subagents in parallel**

**Brief — Hardening-Security:**
```
ROLE: Hardening-Security
TASK: Invoke the senior-security skill on /backend/ and /frontend/.
  Cover: auth, AuthZ (RBAC enforcement on every endpoint), secrets, OWASP top 10,
  tenant isolation (every query filters by tenant_id), SuperAdmin bypass correctness.
OUTPUT: docs/superpowers/state/QA_RESULTS/security.md with findings classified P0/P1/P2.
TIME BUDGET: 60 min.
ACCEPTANCE: file exists with classified findings.
```

**Brief — Hardening-Perf:**
```
ROLE: Hardening-Perf
TASK:
  - Identify N+1 query suspects in /backend/ (look for @OneToMany without fetch strategy in hot paths).
  - Check FE bundle size: cd frontend && npm run build && check .next analysis output.
  - Identify the top 20 endpoints by expected traffic and flag any without indexes on filter columns.
OUTPUT: docs/superpowers/state/QA_RESULTS/perf.md
TIME BUDGET: 45 min.
ACCEPTANCE: file lists P0 perf issues with remediation.
```

**Brief — Hardening-Observability:**
```
ROLE: Hardening-Observability
TASK:
  Audit logging, tracing, error tracking, health endpoints, rate limits.
  Identify critical paths missing structured logs.
OUTPUT: docs/superpowers/state/QA_RESULTS/observability.md
TIME BUDGET: 30 min.
ACCEPTANCE: file lists P0 gaps with remediation.
```

- [ ] **Step 2: Convert P0 hardening findings to Dev tasks, re-queue**

Add to `TASKS.md` as Wave 4b. Dispatch Dev subagents using the standard brief.

- [ ] **Step 3: Re-run only the affected QA shards after fixes**

(Don't need full Phase 3 again — just the shards touching changed code.)

- [ ] **Step 4: When zero P0 hardening findings remain, mark Phase 4 complete**

```bash
git add -A
git commit -m "chore: phase 4 hardening green"
```

---

## Task 10: Phase 5 — Deploy Readiness Report

**Files:**
- Write: `docs/superpowers/state/DEPLOY_READINESS_REPORT.md`

- [ ] **Step 1: Invoke the deploy-checklist skill**

Use the `Skill` tool with `engineering:deploy-checklist`.

- [ ] **Step 2: Run final verification of all four readiness criteria**

```bash
# Criterion 1: Build-kit completeness
# (verified by zero P0 P1 gaps remaining in GAP_REPORT.md)

# Criterion 2: E2E green
cat docs/superpowers/state/QA_RESULTS/super-e2e.md | grep -E "FAIL|Failures: [1-9]"
cat docs/superpowers/state/QA_RESULTS/lifecycle-e2e.md | grep -E "FAIL"

# Criterion 3: Clean build
cd frontend && npx tsc --noEmit
cd ../backend && ./mvnw verify

# Criterion 4: Prod-grade
cat docs/superpowers/state/QA_RESULTS/security.md | grep "P0"
cat docs/superpowers/state/QA_RESULTS/perf.md | grep "P0"
cat docs/superpowers/state/QA_RESULTS/observability.md | grep "P0"
```

Each should produce empty output (no failures, no P0s).

- [ ] **Step 3: Write `DEPLOY_READINESS_REPORT.md`**

```markdown
# NU-AURA Deploy Readiness Report

Generated: <today>
Verdict: GREEN | RED

## Criterion 1 — Build-kit completeness
Status: ✅ | ❌
Evidence: <link to GAP_REPORT.md, all P0/P1 resolved>

## Criterion 2 — E2E green
Status: ✅ | ❌
Evidence: <super-e2e.md and lifecycle-e2e.md summaries>

## Criterion 3 — Clean build
Status: ✅ | ❌
Evidence: <tsc and mvn output>

## Criterion 4 — Prod-grade
Status: ✅ | ❌
Evidence: <security/perf/observability summaries>

## Rollback plan
<from deploy-checklist skill>

## Smoke tests
<from deploy-checklist skill>
```

- [ ] **Step 4: Final commit and present to user**

```bash
git add docs/superpowers/state/DEPLOY_READINESS_REPORT.md
git commit -m "docs: deployment readiness verdict"
```

Show user the verdict. If GREEN, declare done. If RED, identify the failing criterion and loop back to the relevant phase.

---

## Cross-Cutting Rules (apply to every task)

1. **Every Dev subagent commits exactly one commit** with the task ID in the message.
2. **Controller never edits source code** — only state files and dispatches subagents.
3. **Build gate is non-negotiable** — never advance a wave with a red gate.
4. **Failures cluster by root cause** — don't fix N tests for the same broken endpoint as N tasks.
5. **State files are the memory** — re-read on every session start.
6. **Phase gates require explicit user approval** before writing code.
7. **Time budgets are soft caps** — if a subagent exceeds, terminate and refine the brief.

---

## Self-Review Notes

Spec coverage check: every readiness criterion in the spec maps to at least one phase (1→audit, 2→dev, 3→E2E, 4→hardening, 5→deploy-checklist). Every phase in the spec has a task here. ✅

Type consistency: file paths, task ID format `T-NNN`, brief template fields, and gate commands are consistent throughout. ✅

No placeholders: every step contains either runnable commands, complete file contents, or fully-specified brief templates. The only "fill in" is parameterization from `TASKS.md` at runtime, which is the design intent for a meta-plan. ✅
