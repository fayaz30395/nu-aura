# Nu-Aura — Architectural & Workflow Decisions (ADR-style)

## ADR-001: Adopt the canonical 9-status workflow and supersede the legacy stage machine

Date: 2026-09-30
Status: Accepted

Context:
The orchestration specification defined two incompatible work lifecycles: an older stage machine
(`BACKLOG → READY → IN_PROGRESS → IMPLEMENTED → QA_READY → QA_IN_PROGRESS → QA_PASSED → ACCEPTED`,
with `REOPENED`/`UNBLOCKED`) and a newer canonical vocabulary of nine statuses. Maintaining both
creates drift and contradictions.

Decision:
Adopt the nine canonical statuses as the only workflow vocabulary:
`BACKLOG, READY, IN_PROGRESS, BLOCKED, HUMAN_REQUIRED, VALIDATION, FAILED, ACCEPTED, CANCELLED`.
The older stage machine is superseded. Legacy tokens are retained only in
`workflow.legacy_status_mapping` for migration and must never be written to new records.

Alternatives considered:
- Keep both vocabularies (rejected: violates single-source-of-truth and causes drift).
- Keep only the older stage machine (rejected: the newer vocabulary is defined as canonical and
  covers blocking/human/validation semantics more cleanly).

Consequences:
- `IN_PROGRESS → VALIDATION → ACCEPTED` is the only normal completion path; QA/regression/security
  are expressed as `validation_type` on a `VALIDATION` status, not as separate statuses.
- Any pre-existing artifact using a legacy status must be mapped via `legacy_status_mapping`.

Evidence:
`.nu-aura/orchestration/workflow.yaml`, `.nu-aura/orchestration/workflow-matrix.md`,
`scripts/nu-aura-workflow-validate.mjs`.

## ADR-002: workflow.yaml is the sole workflow authority; workflow-matrix.md is generated

Date: 2026-09-30
Status: Accepted

Context:
Workflow semantics (statuses, transitions, requirements, actor permissions) must not be duplicated
across prompts, docs, and state files.

Decision:
`.nu-aura/orchestration/workflow.yaml` is the only machine-readable authority.
`.nu-aura/orchestration/workflow-matrix.md` is a generated human/audit view that embeds a canonical
snapshot. The two must declare the same version and the snapshot must deep-equal `workflow.yaml`; a
mismatch is a workflow integrity failure.

Alternatives considered:
- Maintain both files by hand (rejected: drift-prone; the validator cannot guarantee equivalence).

Consequences:
- Regenerate the matrix with `node scripts/nu-aura-workflow-validate.mjs --generate` after any change.
- Documentation may explain or reference the workflow but must not redefine it.

Evidence:
`scripts/nu-aura-workflow-validate.mjs` (checks version + snapshot equality).

## ADR-003: Dependency-free Node validator (no YAML library)

Date: 2026-09-30
Status: Accepted

Context:
The repository has no root `package.json` and no `yaml`/`js-yaml` dependency installed, but Node
>= 18 is the established tooling runtime (`scripts/package.json`).

Decision:
Implement the workflow consistency validator as a dependency-free Node ESM script with a small
constrained YAML reader covering exactly the schema subset used by `workflow.yaml` (nested maps,
scalar sequences, quoted scalars, `[]`/`{}` empties, full-line comments). Unsupported constructs
fail loudly rather than being silently mis-parsed.

Alternatives considered:
- Add `yaml` as a devDependency (rejected: requires a network install and adds supply-chain surface).
- Store workflow as JSON (rejected: less readable for humans).

Consequences:
- `workflow.yaml` must stay within the supported subset; new constructs require parser updates and tests.

Evidence:
`scripts/nu-aura-workflow-validate.mjs`, `scripts/nu-aura-workflow-validate.test.mjs`.

## Workflow change record: workflow.yaml v1.0 created

workflow_change:
  from_version: null
  to_version: "1.0"
  changed: [statuses, results, severities, validation_types, work_types, transitions, transition_requirements, actor_permissions, terminal_statuses, reopenable_statuses]
  reason: "Initial canonical workflow definition for the Nu-Aura orchestrator."
  impact: "All future status transitions are governed by this definition."
  migration_required: false
