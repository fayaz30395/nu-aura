# Plan: Create the NU-AURA Autonomous Engineering Orchestrator agent + canonical workflow artifacts

## Goal

Create a Kilo agent (`.kilo/agent/nu-aura-orchestrator.md`) that drives NU-AURA to a genuinely
production-ready, deployable state, plus the canonical workflow artifacts the agent's own rules
require (`workflow.yaml` as the single machine authority, `workflow-matrix.md` as the human view,
a consistency validator, and seeded state/orchestration files).

This plan only defines the agent and its governance artifacts. It does **not** start the
production-readiness campaign — that is the agent's job once created.

## Resolved decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Deliverable scope | Agent + canonical workflow artifacts + state seeds + orchestration docs + validator. `docs/architecture`, `docs/qa`, `docs/release` created lazily by the agent during real work. |
| D2 | Agent frontmatter | `mode: primary`; no model override; broad local permissions (`bash: allow`, `edit: allow`, `task: allow`). |
| D3 | Bootstrap extras | Include `.nu-aura/state/*` seeds and `scripts/nu-aura-workflow-validate.mjs`. |
| D4 | workflow.yaml format | Conventional YAML; validator is dependency-free Node ESM with a small constrained parser (Node >=18, already the repo standard per `scripts/package.json`). |
| D5 | Behavior location | Full behavioral spec lives in the agent system prompt (guaranteed loaded). This exceeds the repo's generic <500-line convention; accepted as a system-prompt exception. If strict <500 is required, split behavior to `.nu-aura/orchestration/operating-manual.md` and have the agent read it at startup. |

## Source-of-truth conflict resolutions (apply, do not re-litigate)

The pasted spec contains internal contradictions. Resolve in favor of the later, canonical sections
(the spec itself mandates this in §96–§127 and §170):

1. **Two state machines.** §66–§95 defines `BACKLOG→READY→IN_PROGRESS→IMPLEMENTED→QA_READY→QA_IN_PROGRESS→QA_PASSED→ACCEPTED`. §96–§221 defines the canonical 9-status vocabulary. → Use the 9-status vocabulary. Record the superseded machine + `legacy_status_mapping` (§163) in `workflow.yaml` and `decisions.md`.
2. **Transition requirements shape.** §132 (list-of-objects) vs §172 (map with `all:`). → Use §172 (complete, covers every transition).
3. **Actor permissions.** §141 vs §154/§164/§204. → Use §164 as authoritative in `workflow.yaml`; generate the §204 matrix from it so they cannot disagree.
4. **State-file field values.** §40 mixes workflow status with result values. → `status` uses canonical statuses; per-check fields use the result vocabulary (`PASS/FAIL/NOT_RUN/NOT_APPLICABLE/UNKNOWN`).

## Artifacts to create

All paths are repo-relative. None of these are gitignored (verified against `.gitignore`).

### 1. `.kilo/agent/nu-aura-orchestrator.md`  ← the agent

YAML frontmatter:

```yaml
---
description: Use when asked to take NU-AURA to production-ready/deployable, audit release readiness, run the DEV→QA→SECURITY→REGRESSION loop, or manage the canonical workflow state. Principal engineering orchestrator for NU-AURA.
mode: primary
permission:
  bash: allow
  edit: allow
  read: allow
  glob: allow
  grep: allow
  task: allow
color: "#1F6FEB"
---
```

Body (system prompt) must contain, in this order:

1. **Identity & mandate** — §1 primary objective, §2 role tree, §37 optimize-for list, "evidence beats claims".
2. **Boot sequence (mandatory first action)**:
   a. `node scripts/nu-aura-workflow-validate.mjs` — must exit 0; if not, workflow integrity is `FAILED` and no status transitions may occur (§169, §220).
   b. Read `.nu-aura/orchestration/workflow.yaml` (sole workflow authority) and `.nu-aura/state/*.yaml`.
   c. Run the DISCOVERY pass (§3): inspect repo, verify claims against code, never trust docs/prior agents.
3. **Operating model** — §6–§21 (requirements discovery, architecture review, DEV rules, DB rules, security, QA, test pyramid, E2E, frontend/backend QA, API contract, performance, observability, dependency audit, CI/CD, deployment readiness).
4. **Continuous loop & failure loop** — §29–§31, §36, §56 update order.
5. **Evidence & priority rules** — §22 release gate model, §24 evidence requirement, §25 severity, §26 no-false-completion, §31 stale-claim detection.
6. **Human-only actions** — §23, §71, §86, §102 — report using the exact `HUMAN ACTION REQUIRED` block; keep working on unblocked areas (§35).
7. **Artifact map & update convention** — §38, §43–§61, §53, §54, §57, §58. Point to `.nu-aura/` as machine state and `docs/` as human docs.
8. **Workflow governance pointer (do NOT restate the state machine)** — canonical 9 statuses, results, severities, validation types, work types, transitions, transition requirements, actor permissions, terminal/reopenable, and invariants all live in `.nu-aura/orchestration/workflow.yaml`. Use canonical statuses only; record every transition as an append-only record (§129, §143, §188). Legacy/non-canonical statuses are forbidden in new records (§163, §166).
9. **Requirement semantics & acceptance** — §173–§195 (traceability, acceptance path, current-commit match, P0/P1 gate, reopen/cancellation requirements).
10. **Start-now checklist** — §"START NOW" 1–11.

Rules: SL must reference `workflow.yaml` by path and must not embed the transition matrix or
status lists as a second source of truth.

### 2. `.nu-aura/orchestration/workflow.yaml`  ← canonical machine authority

Single root key `workflow:` with version `"1.0"` and these keys (values taken verbatim from the
cited spec sections):

- `statuses` — 9 canonical (§97): BACKLOG, READY, IN_PROGRESS, BLOCKED, HUMAN_REQUIRED, VALIDATION, FAILED, ACCEPTED, CANCELLED.
- `results` — PASS, FAIL, NOT_RUN, NOT_APPLICABLE, UNKNOWN (§108).
- `severities` — P0, P1, P2, P3 (§109).
- `validation_types` — QA, REGRESSION, SECURITY, ARCHITECTURE, DATABASE, PERFORMANCE, INTEGRATION, RELEASE, DEPLOYMENT (§110).
- `work_types` — DISCOVERY, REQUIREMENTS, ARCHITECTURE, IMPLEMENTATION, REFACTOR, BUG_FIX, TESTING, SECURITY_REMEDIATION, DATABASE, INFRASTRUCTURE, DOCUMENTATION, RELEASE (§111).
- `terminal_statuses` — [CANCELLED]; `reopenable_statuses` — [ACCEPTED] (§139).
- `transitions` — map form exactly as §164.
- `transition_requirements` — map form exactly as §172 (all transitions covered; `all:` lists).
- `actor_permissions` — exactly as §164 (ORCHESTRATOR `"*"`, DEV, QA, SECURITY, RELEASE, HUMAN).
- `reopen_categories` — REGRESSION, NEW_REQUIREMENT, SECURITY_ISSUE, PRODUCTION_DEFECT, INCORRECT_ACCEPTANCE (§185).
- `legacy_status_mapping` — exactly as §163.
- `invariants` — INV-001…INV-015 as §193.
- `gate_values` — `results` ∪ {HUMAN_REQUIRED} (reconciles §82 gate states with §161/§108).
- `entity_schemas` — field lists for `transition_record` (§129/§188), `blocker` (§174), `human_requirement` (§175), `failure` (§136/§184), `validation` (§135/§180), `cancellation` (§138/§186), `reopen` (§140/§185), `acceptance` (§137/§179).

### 3. `.nu-aura/orchestration/workflow-matrix.md`  ← human/audit view

- Starts with the generated-file marker (§213) including `Workflow version: 1.0`.
- Human sections: canonical status table (§196.1), full transition matrix (§196.2), lifecycle diagrams (§197), transition categories (§198), acceptance/failure/blocker/human/reopen paths (§199–§203), actor transition matrix (§204), decision rule (§205), matrix-integrity rule (§206), dual-representation contract and authority model (§207–§221).
- Must embed the **exact same canonical YAML** as `workflow.yaml` between markers so the validator can compare without parsing the human tables:
  ```
  <!-- CANONICAL-SNAPSHOT:BEGIN workflow-version=1.0 -->
  ```yaml
  ... identical content to workflow.yaml ...
  ```
  <!-- CANONICAL-SNAPSHOT:END -->
  ```

### 4. `.nu-aura/orchestration/decisions.md`
Seed ADRs:
- `ADR-001` — Adopt canonical 9-status workflow v1.0; §66–§95 state machine superseded; legacy mapping per §163.
- `ADR-002` — `workflow.yaml` is the sole workflow authority; `workflow-matrix.md` is a generated/derived human view; decisions override matrix per §170/§206.
- `ADR-003` — Validator implemented dependency-free in Node (D4).

### 5. `.nu-aura/orchestration/assumptions.md` and `.nu-aura/orchestration/agent-log.md`
Header + format from §45 and §52; one initial agent-log entry recording creation of the agent and workflow v1.0.

### 6. `.nu-aura/state/current-state.yaml`
Per §40 shape, but with canonical `status: BACKLOG` for the application and all capability fields
`UNKNOWN` (result vocabulary); empty `blockers`, `human_actions_required`, `warnings`. Include
`last_updated`, `branch`, `last_verified_commit`.

### 7. `.nu-aura/state/active-work.yaml`
Per §41: `current_task: null`, `queue: []`, with a documented task schema comment (id, title, description, owner, priority, status, dependencies, acceptance criteria).

### 8. `.nu-aura/state/blockers.yaml`
Empty list with the §42 field schema documented as a comment block.

### 9. `.nu-aura/evidence/.gitkeep`
Empty placeholder so the evidence tree exists (§47).

### 10. `scripts/nu-aura-workflow-validate.mjs`  ← required validator (§210, §169)

Dependency-free Node ESM (`node:fs`, `node:path`, `node:url`). CLI:

- default: verify and exit 0/1.
- `--generate`: regenerate `workflow-matrix.md` (full file) from `workflow.yaml` (implements §212 preferred model).

Checks (fail with a specific message and non-zero exit on any):
1. `workflow.yaml` exists and parses with the constrained parser.
2. All statuses unique and canonical.
3. Every transition references valid statuses; no transition outside §164.
4. `transition_requirements` has an entry for **every** transition and no extras (INV-001).
5. Every `actor_permissions` entry references a valid transition (INV-003).
6. `terminal_statuses` / `reopenable_statuses` reference valid statuses.
7. `workflow-matrix.md` exists, declares the same version, and its embedded
   `CANONICAL-SNAPSHOT` YAML deep-equals `workflow.yaml` (covers all 8 §210 checks:
   statuses, transitions, direction, requirements, permissions, terminal, reopenable, version).
8. Invariant spot-checks INV-004 (no path to ACCEPTED bypassing VALIDATION), INV-013, INV-014
   (no legacy status appears in `statuses`), INV-015.

Constrained parser scope (only what the schema needs): indentation-nested maps, `- ` sequences of
scalars, scalar values (string/number/bool/null), single/double-quoted strings, `#` comments,
`key: []` / `key: {}` empty forms. No anchors, multi-line block scalars, or flow collections with
nested content. Reject anything outside this scope with a clear error.

Add `scripts/nu-aura-workflow-validate.test.mjs` using `node --test` (repo standard,
`scripts/package.json`) covering: valid file passes; a mutated transition fails; version mismatch
fails; missing requirement fails; legacy status fails. Wire into `scripts/package.json` `test`
script list and add `"validate:workflow": "node nu-aura-workflow-validate.mjs"`.

## Content mapping (pasted spec → destination)

| Spec sections | Destination |
|---|---|
| §1–§37, §56, §173–§195, "START NOW" | agent system prompt |
| §38–§55, §57–§61 (artifact conventions) | agent system prompt |
| §62–§95 (operational status/ownership prose) | agent prompt as operational guidance; **normative machine rules** move to workflow.yaml |
| §96–§127, §128–§146, §147–§172, §196–§221 | workflow.yaml (authoritative) + workflow-matrix.md (human view) |
| §163, §193 | workflow.yaml (`legacy_status_mapping`, `invariants`) |
| §174, §175, §179–§186 | workflow.yaml (`entity_schemas`) |

## Implementation task list (ordered)

1. Create `.kilo/agent/nu-aura-orchestrator.md` with the frontmatter above and the 10-part body.
2. Create `.nu-aura/orchestration/workflow.yaml` per §2 with version `1.0`.
3. Create `.nu-aura/orchestration/workflow-matrix.md` including the embedded canonical snapshot.
4. Create `scripts/nu-aura-workflow-validate.mjs` + `scripts/nu-aura-workflow-validate.test.mjs`; update `scripts/package.json`.
5. Create `.nu-aura/orchestration/decisions.md`, `assumptions.md`, `agent-log.md`.
6. Create `.nu-aura/state/current-state.yaml`, `active-work.yaml`, `blockers.yaml`.
7. Create `.nu-aura/evidence/.gitkeep`.
8. (Optional) Add one-line pointer to the agent under the "Knowledge Base"/routing section of root `AGENTS.md`.

## Validation (run before declaring done)

- `node scripts/nu-aura-workflow-validate.mjs` → exit 0.
- `node --test scripts/nu-aura-workflow-validate.test.mjs` → all pass (mutations are detected).
- `node scripts/nu-aura-workflow-validate.mjs --generate` → no diff to `workflow-matrix.md` (idempotent).
- Confirm the agent appears in the Kilo agent list after restart (`.kilo/agent/*.md` is auto-discovered; no `kilo.json` change required).
- Confirm no legacy status token (`DONE`, `QA_PASSED`, `READY_TO_DEPLOY`, `DEPLOYED`, `WAITING`, …) appears as an active status anywhere under `.nu-aura/` (only inside `legacy_status_mapping`).

## Risks / watch-outs

- **Agent-level `bash: allow` may not override the user's global `bash` deny rules.** Verify after creation that the agent can actually run `node`/`npm`/`mvn` commands; if global `deny` wins, the user must relax the global rule for this agent. Note this in the final summary.
- **Line count.** The agent body will likely exceed 500 lines (D5). If strict compliance is required, split to `.nu-aura/orchestration/operating-manual.md`.
- **Workflow drift.** Any future edit to `workflow.yaml` must regenerate `workflow-matrix.md` via `--generate` and bump the version + record a `workflow_change` in `decisions.md` (§167, §215).
- **Scope creep.** Do not pre-create `docs/architecture|qa|release` skeletons; the agent creates them when it has real content (§54).

## Out of scope

- Executing the production-readiness campaign itself (DISCOVERY → DEV → QA → RELEASE).
- Any production deployment, secret handling, or destructive DB operation.
- Adding the validator to CI (can be a follow-up).

## Open question (only if the user wants strict <500 lines)

D5 defaults to a single large agent prompt. Confirm if the split into
`.nu-aura/orchestration/operating-manual.md` is desired instead.
