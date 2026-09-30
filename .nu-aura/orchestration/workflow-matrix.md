<!--
GENERATED FROM:
.nu-aura/orchestration/workflow.yaml

DO NOT EDIT MANUALLY.
Regenerate with: node scripts/nu-aura-workflow-validate.mjs --generate

Workflow version: 1.0
-->

# NU-AURA Canonical Workflow Matrix

Workflow Version: 1.0

This is the human-readable, audit-oriented view of the canonical workflow.
`.nu-aura/orchestration/workflow.yaml` is the authoritative machine-readable definition.
If this view and `workflow.yaml` disagree, `workflow.yaml` wins and this view must be regenerated.

## 1. Canonical statuses

| Status | Meaning | Terminal? | Reopenable? |
|---|---|---|---|
| `BACKLOG` | Known work not yet prepared for execution | No | No |
| `READY` | Work is prepared, owned, and executable | No | No |
| `IN_PROGRESS` | Active implementation or remediation is underway | No | No |
| `BLOCKED` | Technical/dependency condition prevents progress | No | No |
| `HUMAN_REQUIRED` | Authorized human action/authority is required | No | No |
| `VALIDATION` | Work is undergoing independent verification | No | No |
| `FAILED` | Validation demonstrated that required criteria are not satisfied | No | No |
| `ACCEPTED` | Work has been verified and accepted into the trusted baseline | No | Yes |
| `CANCELLED` | Work has been intentionally abandoned | Yes | No |

## 2. Transition matrix (allowed)

| From | To | Allowed | Primary purpose |
|---|---|---|---|
| `BACKLOG` | `READY` | ✅ | Work is sufficiently defined and executable |
| `BACKLOG` | `CANCELLED` | ✅ | Work is intentionally abandoned |
| `READY` | `IN_PROGRESS` | ✅ | Begin execution |
| `READY` | `BLOCKED` | ✅ | Newly discovered blocker prevents execution |
| `READY` | `HUMAN_REQUIRED` | ✅ | Human action is required before execution |
| `READY` | `CANCELLED` | ✅ | Work is intentionally abandoned |
| `IN_PROGRESS` | `VALIDATION` | ✅ | Implementation is complete and ready for verification |
| `IN_PROGRESS` | `BLOCKED` | ✅ | Execution is prevented by a technical/dependency blocker |
| `IN_PROGRESS` | `HUMAN_REQUIRED` | ✅ | Human action/authority is required |
| `IN_PROGRESS` | `CANCELLED` | ✅ | Work is intentionally abandoned |
| `BLOCKED` | `READY` | ✅ | Blocker resolved; work needs to be prepared/revalidated |
| `BLOCKED` | `IN_PROGRESS` | ✅ | Blocker resolved; execution can resume |
| `BLOCKED` | `HUMAN_REQUIRED` | ✅ | Resolution now requires human action |
| `BLOCKED` | `CANCELLED` | ✅ | Blocked work is abandoned |
| `HUMAN_REQUIRED` | `READY` | ✅ | Human action completed; work requires normal readiness |
| `HUMAN_REQUIRED` | `IN_PROGRESS` | ✅ | Human action completed; execution can continue |
| `HUMAN_REQUIRED` | `VALIDATION` | ✅ | Human action completed and work is ready for validation |
| `HUMAN_REQUIRED` | `BLOCKED` | ✅ | Human action did not resolve the blocking condition |
| `HUMAN_REQUIRED` | `CANCELLED` | ✅ | Work is abandoned |
| `VALIDATION` | `ACCEPTED` | ✅ | Required validation passed |
| `VALIDATION` | `FAILED` | ✅ | Validation demonstrated unmet criteria |
| `VALIDATION` | `BLOCKED` | ✅ | Validation cannot continue because of a blocker |
| `VALIDATION` | `HUMAN_REQUIRED` | ✅ | Validation requires human action/authority |
| `FAILED` | `IN_PROGRESS` | ✅ | Failure understood; remediation begins |
| `FAILED` | `BLOCKED` | ✅ | Remediation cannot proceed |
| `FAILED` | `HUMAN_REQUIRED` | ✅ | Remediation requires human action/authority |
| `FAILED` | `CANCELLED` | ✅ | Failed work is intentionally abandoned |
| `ACCEPTED` | `IN_PROGRESS` | ✅ | Previously accepted work is legitimately reopened |

Any directed status pair not listed above is **not permitted**.

## 3. Actor transition matrix

| From | To | ORCHESTRATOR | DEV | QA | SECURITY | RELEASE | HUMAN |
|---|---|---|---|---|---|---|---|
| `BACKLOG` | `READY` | ✅ | — | — | — | — | — |
| `BACKLOG` | `CANCELLED` | ✅ | — | — | — | — | — |
| `READY` | `IN_PROGRESS` | ✅ | — | — | — | — | — |
| `READY` | `BLOCKED` | ✅ | — | — | — | — | — |
| `READY` | `HUMAN_REQUIRED` | ✅ | — | — | — | — | — |
| `READY` | `CANCELLED` | ✅ | — | — | — | — | — |
| `IN_PROGRESS` | `VALIDATION` | ✅ | ✅ | — | — | — | — |
| `IN_PROGRESS` | `BLOCKED` | ✅ | ✅ | — | — | — | — |
| `IN_PROGRESS` | `HUMAN_REQUIRED` | ✅ | ✅ | — | — | — | — |
| `IN_PROGRESS` | `CANCELLED` | ✅ | — | — | — | — | — |
| `BLOCKED` | `READY` | ✅ | — | — | — | — | — |
| `BLOCKED` | `IN_PROGRESS` | ✅ | — | — | — | — | — |
| `BLOCKED` | `HUMAN_REQUIRED` | ✅ | — | — | — | — | — |
| `BLOCKED` | `CANCELLED` | ✅ | — | — | — | — | — |
| `HUMAN_REQUIRED` | `READY` | ✅ | — | — | — | — | ✅ |
| `HUMAN_REQUIRED` | `IN_PROGRESS` | ✅ | — | — | — | — | ✅ |
| `HUMAN_REQUIRED` | `VALIDATION` | ✅ | — | — | — | — | ✅ |
| `HUMAN_REQUIRED` | `BLOCKED` | ✅ | — | — | — | — | ✅ |
| `HUMAN_REQUIRED` | `CANCELLED` | ✅ | — | — | — | — | ✅ |
| `VALIDATION` | `ACCEPTED` | ✅ | — | ✅ | ✅ | ✅ | — |
| `VALIDATION` | `FAILED` | ✅ | — | ✅ | ✅ | ✅ | — |
| `VALIDATION` | `BLOCKED` | ✅ | — | ✅ | ✅ | ✅ | — |
| `VALIDATION` | `HUMAN_REQUIRED` | ✅ | — | ✅ | ✅ | ✅ | — |
| `FAILED` | `IN_PROGRESS` | ✅ | — | — | — | — | — |
| `FAILED` | `BLOCKED` | ✅ | — | — | — | — | — |
| `FAILED` | `HUMAN_REQUIRED` | ✅ | — | — | — | — | — |
| `FAILED` | `CANCELLED` | ✅ | — | — | — | — | — |
| `ACCEPTED` | `IN_PROGRESS` | ✅ | — | — | — | — | — |

`*` in `workflow.yaml` (ORCHESTRATOR) means all transitions are allowed.
QA/SECURITY/RELEASE acceptance is scope-level; the Orchestrator owns release acceptance.

## 4. Transition requirements

| Transition | Required (all must pass) |
|---|---|
| `BACKLOG->READY` | `requirements_defined`, `acceptance_criteria_defined`, `owner_assigned`, `dependencies_identified`, `work_scope_defined` |
| `BACKLOG->CANCELLED` | `cancellation_reason_defined`, `cancellation_authorized` |
| `READY->IN_PROGRESS` | `owner_assigned`, `work_scope_defined`, `acceptance_criteria_defined`, `no_unresolved_blocking_dependency`, `no_unresolved_blocking_human_requirement` |
| `READY->BLOCKED` | `blocker_identified`, `blocker_description_defined`, `blocker_severity_defined`, `blocker_owner_or_dependency_defined` |
| `READY->HUMAN_REQUIRED` | `human_action_defined`, `human_authority_defined`, `reason_defined`, `human_action_is_not_automatable_or_not_authorized` |
| `READY->CANCELLED` | `cancellation_reason_defined`, `cancellation_authorized` |
| `IN_PROGRESS->VALIDATION` | `implementation_complete`, `acceptance_criteria_implemented`, `developer_validation_complete`, `relevant_tests_executed`, `relevant_build_completed`, `known_limitations_documented`, `changed_files_reviewed`, `no_known_unaddressed_p0`, `no_known_unaddressed_p1` |
| `IN_PROGRESS->BLOCKED` | `blocker_identified`, `blocker_description_defined`, `blocker_severity_defined`, `blocker_owner_or_dependency_defined`, `attempted_resolution_documented` |
| `IN_PROGRESS->HUMAN_REQUIRED` | `human_action_defined`, `human_authority_defined`, `reason_defined`, `agent_cannot_safely_or_legitimately_complete_action` |
| `IN_PROGRESS->CANCELLED` | `cancellation_reason_defined`, `work_abandonment_authorized`, `no_required_retention_or_migration_action_missing` |
| `BLOCKED->READY` | `blocker_resolved`, `blocker_resolution_evidence_present`, `dependencies_rechecked`, `acceptance_criteria_still_valid`, `owner_available` |
| `BLOCKED->IN_PROGRESS` | `blocker_resolved`, `blocker_resolution_evidence_present`, `dependencies_rechecked`, `owner_available` |
| `BLOCKED->HUMAN_REQUIRED` | `technical_blocker_confirmed`, `human_action_defined`, `human_authority_defined`, `reason_defined` |
| `BLOCKED->CANCELLED` | `cancellation_reason_defined`, `cancellation_authorized`, `blocker_outcome_documented` |
| `HUMAN_REQUIRED->READY` | `human_action_completed`, `human_action_evidence_present`, `human_action_verified`, `requirements_still_valid`, `owner_assigned` |
| `HUMAN_REQUIRED->IN_PROGRESS` | `human_action_completed`, `human_action_evidence_present`, `human_action_verified`, `owner_available` |
| `HUMAN_REQUIRED->VALIDATION` | `human_action_completed`, `human_action_evidence_present`, `human_action_verified`, `implementation_or_required_work_complete`, `validation_scope_defined` |
| `HUMAN_REQUIRED->BLOCKED` | `human_action_attempted_or_declined`, `blocking_condition_documented`, `blocker_owner_or_dependency_defined` |
| `HUMAN_REQUIRED->CANCELLED` | `cancellation_reason_defined`, `cancellation_authorized`, `human_requirement_outcome_documented` |
| `VALIDATION->ACCEPTED` | `validation_executed`, `validation_result_is_pass`, `acceptance_criteria_satisfied`, `required_evidence_present`, `required_validation_types_passed`, `no_unresolved_p0`, `no_unresolved_p1`, `no_unresolved_release_blocker`, `current_commit_matches_validated_commit` |
| `VALIDATION->FAILED` | `validation_executed`, `validation_result_is_fail`, `failure_reproduced_or_verified`, `failure_evidence_present`, `failed_acceptance_criteria_identified` |
| `VALIDATION->BLOCKED` | `validation_started`, `blocking_condition_identified`, `blocker_description_defined`, `blocker_owner_or_dependency_defined`, `validation_cannot_continue` |
| `VALIDATION->HUMAN_REQUIRED` | `validation_started`, `human_action_defined`, `human_authority_defined`, `validation_cannot_continue_without_human_action` |
| `FAILED->IN_PROGRESS` | `failure_understood`, `failed_acceptance_criteria_identified`, `remediation_scope_defined`, `owner_assigned` |
| `FAILED->BLOCKED` | `failure_understood`, `blocker_identified`, `blocker_description_defined`, `blocker_owner_or_dependency_defined` |
| `FAILED->HUMAN_REQUIRED` | `failure_understood`, `human_action_defined`, `human_authority_defined` |
| `FAILED->CANCELLED` | `cancellation_reason_defined`, `cancellation_authorized`, `failure_outcome_documented` |
| `ACCEPTED->IN_PROGRESS` | `reopen_reason_defined`, `reopen_authorized`, `reason_is_regression_or_new_requirement_or_security_issue_or_production_defect_or_incorrect_acceptance`, `affected_scope_identified`, `owner_assigned`, `previous_acceptance_preserved_in_history` |

## 5. Terminal & reopen rules

- Terminal statuses: `CANCELLED`
- Reopenable statuses: `ACCEPTED`
- Reopen categories: `REGRESSION`, `NEW_REQUIREMENT`, `SECURITY_ISSUE`, `PRODUCTION_DEFECT`, `INCORRECT_ACCEPTANCE`

## 6. Acceptance, failure, blocker, human and reopen paths

```text
Acceptance: IN_PROGRESS -> VALIDATION -> ACCEPTED
Failure:    VALIDATION -> FAILED -> IN_PROGRESS -> VALIDATION
Blocker:    <ACTIVE> -> BLOCKED -> READY | IN_PROGRESS
Human:      <ACTIVE> -> HUMAN_REQUIRED -> READY | IN_PROGRESS | VALIDATION
Reopen:     ACCEPTED -> IN_PROGRESS (documented reason required)
Cancel:     BACKLOG | READY | IN_PROGRESS | BLOCKED | HUMAN_REQUIRED | FAILED -> CANCELLED
```

## 7. Invariants

- **INV-001** — Every transition has a defined requirement set
- **INV-002** — Every transition references canonical statuses
- **INV-003** — Every actor permission references a valid transition
- **INV-004** — ACCEPTED requires successful validation
- **INV-005** — UNKNOWN cannot satisfy a mandatory requirement
- **INV-006** — NOT_RUN cannot satisfy a mandatory validation
- **INV-007** — P0/P1 blockers prevent acceptance when they affect accepted scope
- **INV-008** — Validated evidence must correspond to the accepted commit
- **INV-009** — Every HUMAN_REQUIRED transition identifies a concrete human action
- **INV-010** — Every BLOCKED transition identifies a concrete blocker
- **INV-011** — Every FAILED transition identifies failed criteria
- **INV-012** — Every ACCEPTED->IN_PROGRESS transition preserves previous acceptance history
- **INV-013** — No transition may bypass VALIDATION to reach ACCEPTED
- **INV-014** — No legacy workflow status may be written to new state
- **INV-015** — Workflow semantics are sourced only from workflow.yaml

## 8. Authority and consistency contract

- `workflow.yaml` = machine/runtime authority (semantics, transitions, requirements, permissions).
- `workflow-matrix.md` = human/audit authority view, generated from `workflow.yaml`.
- Both must declare the same version; a mismatch is a workflow integrity failure.
- A workflow change updates `workflow.yaml`, regenerates this file, bumps the version, and records a `workflow_change` decision.
- When the two representations disagree: stop, mark workflow integrity FAILED, reconcile, then resume.

## 9. Legacy status migration

| Legacy | Canonical |
|---|---|
| `DONE` | `ACCEPTED` |
| `COMPLETE` | `ACCEPTED` |
| `COMPLETED` | `ACCEPTED` |
| `FIXED` | `ACCEPTED` |
| `VERIFIED` | `ACCEPTED` |
| `PASSED` | `ACCEPTED` |
| `QA_READY` | `VALIDATION` |
| `QA_IN_PROGRESS` | `VALIDATION` |
| `QA_PASSED` | `ACCEPTED` |
| `DEPLOYING` | `VALIDATION` |
| `DEPLOYED` | `ACCEPTED` |
| `READY_TO_DEPLOY` | `VALIDATION` |
| `WAITING` | `BLOCKED` |
| `WAITING_FOR_HUMAN` | `HUMAN_REQUIRED` |
| `PENDING_APPROVAL` | `HUMAN_REQUIRED` |

Legacy tokens must not be written to new records; this table is migration guidance only.

## 10. Canonical snapshot (machine-checked)

The block below must deep-equal `workflow.yaml`.

<!-- CANONICAL-SNAPSHOT:BEGIN workflow-version=1.0 -->
```yaml
# NU-AURA canonical workflow definition (machine authority).
#
# This file is the ONLY normative source of NU-AURA workflow semantics:
# canonical statuses, results, severities, validation types, work types,
# valid transitions, transition requirements, actor permissions, terminal
# and reopenable statuses, reopen categories, legacy mapping, and invariants.
#
# Human-readable view: .nu-aura/orchestration/workflow-matrix.md
#   (generated by: node scripts/nu-aura-workflow-validate.mjs --generate)
#   Its embedded CANONICAL-SNAPSHOT must deep-equal this file.
#
# Validate: node scripts/nu-aura-workflow-validate.mjs
# Do not hand-edit workflow-matrix.md. Change this file, regenerate, bump version.
workflow:
  name: nu-aura
  version: "1.0"
  statuses:
    - BACKLOG
    - READY
    - IN_PROGRESS
    - BLOCKED
    - HUMAN_REQUIRED
    - VALIDATION
    - FAILED
    - ACCEPTED
    - CANCELLED
  results:
    - PASS
    - FAIL
    - NOT_RUN
    - NOT_APPLICABLE
    - UNKNOWN
  severities:
    - P0
    - P1
    - P2
    - P3
  validation_types:
    - QA
    - REGRESSION
    - SECURITY
    - ARCHITECTURE
    - DATABASE
    - PERFORMANCE
    - INTEGRATION
    - RELEASE
    - DEPLOYMENT
  work_types:
    - DISCOVERY
    - REQUIREMENTS
    - ARCHITECTURE
    - IMPLEMENTATION
    - REFACTOR
    - BUG_FIX
    - TESTING
    - SECURITY_REMEDIATION
    - DATABASE
    - INFRASTRUCTURE
    - DOCUMENTATION
    - RELEASE
  gate_values:
    - PASS
    - FAIL
    - NOT_RUN
    - NOT_APPLICABLE
    - UNKNOWN
    - HUMAN_REQUIRED
  terminal_statuses:
    - CANCELLED
  reopenable_statuses:
    - ACCEPTED
  reopen_categories:
    - REGRESSION
    - NEW_REQUIREMENT
    - SECURITY_ISSUE
    - PRODUCTION_DEFECT
    - INCORRECT_ACCEPTANCE
  transitions:
    BACKLOG:
      - READY
      - CANCELLED
    READY:
      - IN_PROGRESS
      - BLOCKED
      - HUMAN_REQUIRED
      - CANCELLED
    IN_PROGRESS:
      - VALIDATION
      - BLOCKED
      - HUMAN_REQUIRED
      - CANCELLED
    BLOCKED:
      - READY
      - IN_PROGRESS
      - HUMAN_REQUIRED
      - CANCELLED
    HUMAN_REQUIRED:
      - READY
      - IN_PROGRESS
      - VALIDATION
      - BLOCKED
      - CANCELLED
    VALIDATION:
      - ACCEPTED
      - FAILED
      - BLOCKED
      - HUMAN_REQUIRED
    FAILED:
      - IN_PROGRESS
      - BLOCKED
      - HUMAN_REQUIRED
      - CANCELLED
    ACCEPTED:
      - IN_PROGRESS
    CANCELLED: []
  transition_requirements:
    "BACKLOG->READY":
      all:
        - requirements_defined
        - acceptance_criteria_defined
        - owner_assigned
        - dependencies_identified
        - work_scope_defined
    "BACKLOG->CANCELLED":
      all:
        - cancellation_reason_defined
        - cancellation_authorized
    "READY->IN_PROGRESS":
      all:
        - owner_assigned
        - work_scope_defined
        - acceptance_criteria_defined
        - no_unresolved_blocking_dependency
        - no_unresolved_blocking_human_requirement
    "READY->BLOCKED":
      all:
        - blocker_identified
        - blocker_description_defined
        - blocker_severity_defined
        - blocker_owner_or_dependency_defined
    "READY->HUMAN_REQUIRED":
      all:
        - human_action_defined
        - human_authority_defined
        - reason_defined
        - human_action_is_not_automatable_or_not_authorized
    "READY->CANCELLED":
      all:
        - cancellation_reason_defined
        - cancellation_authorized
    "IN_PROGRESS->VALIDATION":
      all:
        - implementation_complete
        - acceptance_criteria_implemented
        - developer_validation_complete
        - relevant_tests_executed
        - relevant_build_completed
        - known_limitations_documented
        - changed_files_reviewed
        - no_known_unaddressed_p0
        - no_known_unaddressed_p1
    "IN_PROGRESS->BLOCKED":
      all:
        - blocker_identified
        - blocker_description_defined
        - blocker_severity_defined
        - blocker_owner_or_dependency_defined
        - attempted_resolution_documented
    "IN_PROGRESS->HUMAN_REQUIRED":
      all:
        - human_action_defined
        - human_authority_defined
        - reason_defined
        - agent_cannot_safely_or_legitimately_complete_action
    "IN_PROGRESS->CANCELLED":
      all:
        - cancellation_reason_defined
        - work_abandonment_authorized
        - no_required_retention_or_migration_action_missing
    "BLOCKED->READY":
      all:
        - blocker_resolved
        - blocker_resolution_evidence_present
        - dependencies_rechecked
        - acceptance_criteria_still_valid
        - owner_available
    "BLOCKED->IN_PROGRESS":
      all:
        - blocker_resolved
        - blocker_resolution_evidence_present
        - dependencies_rechecked
        - owner_available
    "BLOCKED->HUMAN_REQUIRED":
      all:
        - technical_blocker_confirmed
        - human_action_defined
        - human_authority_defined
        - reason_defined
    "BLOCKED->CANCELLED":
      all:
        - cancellation_reason_defined
        - cancellation_authorized
        - blocker_outcome_documented
    "HUMAN_REQUIRED->READY":
      all:
        - human_action_completed
        - human_action_evidence_present
        - human_action_verified
        - requirements_still_valid
        - owner_assigned
    "HUMAN_REQUIRED->IN_PROGRESS":
      all:
        - human_action_completed
        - human_action_evidence_present
        - human_action_verified
        - owner_available
    "HUMAN_REQUIRED->VALIDATION":
      all:
        - human_action_completed
        - human_action_evidence_present
        - human_action_verified
        - implementation_or_required_work_complete
        - validation_scope_defined
    "HUMAN_REQUIRED->BLOCKED":
      all:
        - human_action_attempted_or_declined
        - blocking_condition_documented
        - blocker_owner_or_dependency_defined
    "HUMAN_REQUIRED->CANCELLED":
      all:
        - cancellation_reason_defined
        - cancellation_authorized
        - human_requirement_outcome_documented
    "VALIDATION->ACCEPTED":
      all:
        - validation_executed
        - validation_result_is_pass
        - acceptance_criteria_satisfied
        - required_evidence_present
        - required_validation_types_passed
        - no_unresolved_p0
        - no_unresolved_p1
        - no_unresolved_release_blocker
        - current_commit_matches_validated_commit
    "VALIDATION->FAILED":
      all:
        - validation_executed
        - validation_result_is_fail
        - failure_reproduced_or_verified
        - failure_evidence_present
        - failed_acceptance_criteria_identified
    "VALIDATION->BLOCKED":
      all:
        - validation_started
        - blocking_condition_identified
        - blocker_description_defined
        - blocker_owner_or_dependency_defined
        - validation_cannot_continue
    "VALIDATION->HUMAN_REQUIRED":
      all:
        - validation_started
        - human_action_defined
        - human_authority_defined
        - validation_cannot_continue_without_human_action
    "FAILED->IN_PROGRESS":
      all:
        - failure_understood
        - failed_acceptance_criteria_identified
        - remediation_scope_defined
        - owner_assigned
    "FAILED->BLOCKED":
      all:
        - failure_understood
        - blocker_identified
        - blocker_description_defined
        - blocker_owner_or_dependency_defined
    "FAILED->HUMAN_REQUIRED":
      all:
        - failure_understood
        - human_action_defined
        - human_authority_defined
    "FAILED->CANCELLED":
      all:
        - cancellation_reason_defined
        - cancellation_authorized
        - failure_outcome_documented
    "ACCEPTED->IN_PROGRESS":
      all:
        - reopen_reason_defined
        - reopen_authorized
        - reason_is_regression_or_new_requirement_or_security_issue_or_production_defect_or_incorrect_acceptance
        - affected_scope_identified
        - owner_assigned
        - previous_acceptance_preserved_in_history
  actor_permissions:
    ORCHESTRATOR:
      - "*"
    DEV:
      - "IN_PROGRESS->VALIDATION"
      - "IN_PROGRESS->BLOCKED"
      - "IN_PROGRESS->HUMAN_REQUIRED"
    QA:
      - "VALIDATION->FAILED"
      - "VALIDATION->ACCEPTED"
      - "VALIDATION->BLOCKED"
      - "VALIDATION->HUMAN_REQUIRED"
    SECURITY:
      - "VALIDATION->FAILED"
      - "VALIDATION->ACCEPTED"
      - "VALIDATION->BLOCKED"
      - "VALIDATION->HUMAN_REQUIRED"
    RELEASE:
      - "VALIDATION->FAILED"
      - "VALIDATION->ACCEPTED"
      - "VALIDATION->BLOCKED"
      - "VALIDATION->HUMAN_REQUIRED"
    HUMAN:
      - "HUMAN_REQUIRED->READY"
      - "HUMAN_REQUIRED->IN_PROGRESS"
      - "HUMAN_REQUIRED->VALIDATION"
      - "HUMAN_REQUIRED->BLOCKED"
      - "HUMAN_REQUIRED->CANCELLED"
  legacy_status_mapping:
    DONE: ACCEPTED
    COMPLETE: ACCEPTED
    COMPLETED: ACCEPTED
    FIXED: ACCEPTED
    VERIFIED: ACCEPTED
    PASSED: ACCEPTED
    QA_READY: VALIDATION
    QA_IN_PROGRESS: VALIDATION
    QA_PASSED: ACCEPTED
    DEPLOYING: VALIDATION
    DEPLOYED: ACCEPTED
    READY_TO_DEPLOY: VALIDATION
    WAITING: BLOCKED
    WAITING_FOR_HUMAN: HUMAN_REQUIRED
    PENDING_APPROVAL: HUMAN_REQUIRED
  invariants:
    INV-001: "Every transition has a defined requirement set"
    INV-002: "Every transition references canonical statuses"
    INV-003: "Every actor permission references a valid transition"
    INV-004: "ACCEPTED requires successful validation"
    INV-005: "UNKNOWN cannot satisfy a mandatory requirement"
    INV-006: "NOT_RUN cannot satisfy a mandatory validation"
    INV-007: "P0/P1 blockers prevent acceptance when they affect accepted scope"
    INV-008: "Validated evidence must correspond to the accepted commit"
    INV-009: "Every HUMAN_REQUIRED transition identifies a concrete human action"
    INV-010: "Every BLOCKED transition identifies a concrete blocker"
    INV-011: "Every FAILED transition identifies failed criteria"
    INV-012: "Every ACCEPTED->IN_PROGRESS transition preserves previous acceptance history"
    INV-013: "No transition may bypass VALIDATION to reach ACCEPTED"
    INV-014: "No legacy workflow status may be written to new state"
    INV-015: "Workflow semantics are sourced only from workflow.yaml"
  entity_schemas:
    transition_record:
      purpose: "Append-only audit record for a status change"
      fields:
        - id
        - entity_id
        - from
        - to
        - owner
        - actor
        - timestamp
        - reason
        - evidence
        - workflow_version
    blocker:
      purpose: "Concrete technical or dependency blocker"
      fields:
        - id
        - title
        - description
        - severity
        - detected_at
        - detected_commit
        - affected_area
        - status
        - owner
        - dependency
        - root_cause
        - required_action
        - human_required
        - resolution_required
        - verification_required
    human_requirement:
      purpose: "Action that only an authorized human may perform"
      fields:
        - action
        - reason
        - authority_required
        - why_agent_cannot_execute
        - risk_if_skipped
        - evidence_required
        - verification_after_completion
        - reversible
    failure:
      purpose: "Verified validation failure"
      fields:
        - severity
        - criteria
        - expected
        - actual
        - reproduction
        - evidence
        - affected_area
        - affected_scope
    validation:
      purpose: "Independent verification run"
      fields:
        - type
        - result
        - scope
        - commit
        - environment
        - executed_at
        - validator
        - evidence
    cancellation:
      purpose: "Intentional abandonment preserving history"
      fields:
        - reason
        - requested_by
        - authorized_by
        - decided_by
        - cancelled_at
        - timestamp
        - outcome
    reopen:
      purpose: "Reopen of previously accepted work"
      fields:
        - reason
        - category
        - discovered_by
        - evidence
        - affected_scope
        - impact
        - authorized_by
        - orchestrator_approval
        - owner
    acceptance:
      purpose: "Verified acceptance record"
      fields:
        - criteria_satisfied
        - validation_result
        - evidence
        - accepted_by
    gate:
      purpose: "Release gate state"
      fields:
        - name
        - result
        - owner
        - evidence
        - waiver
```
<!-- CANONICAL-SNAPSHOT:END -->

