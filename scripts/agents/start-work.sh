#!/usr/bin/env bash
# Prepare or start a NU-AURA multi-agent pipeline from the repo root.
#
# Usage:
#   ./scripts/agents/start-work.sh feature "Add employee document expiry reminders"
#   ./scripts/agents/start-work.sh security "Close P0 file upload finding" --execute
#
# Default mode is dry-run: prints the command and the pipeline kickoff context.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

usage() {
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    echo
    echo "Types: feature, bug, security, refactor, perf, opus4.8"
}

if [ $# -lt 2 ]; then
    usage
    exit 64
fi

TYPE="$1"
TASK="$2"
MODE="dry-run"
if [ "${3:-}" = "--execute" ]; then
    MODE="execute"
elif [ "${3:-}" = "--dry-run" ] || [ -z "${3:-}" ]; then
    MODE="dry-run"
else
    echo "unknown option: ${3:-}" >&2
    usage
    exit 64
fi

case "$TYPE" in
    feature)
        WORKFLOW="docs/swarm/workflows/feature-pipeline.yaml"
        STRATEGY="development"
        MODE_FLAG="hierarchical"
        MAX_AGENTS=4
        REVIEW_FLAGS=(--parallel --monitor --review --testing)
        ;;
    bug)
        WORKFLOW="docs/swarm/workflows/bug-pipeline.yaml"
        STRATEGY="maintenance"
        MODE_FLAG="hierarchical"
        MAX_AGENTS=3
        REVIEW_FLAGS=(--monitor --testing)
        ;;
    security)
        WORKFLOW="docs/swarm/workflows/security-pipeline.yaml"
        STRATEGY="testing"
        MODE_FLAG="hierarchical"
        MAX_AGENTS=3
        REVIEW_FLAGS=(--monitor --review --testing --verbose)
        ;;
    refactor)
        WORKFLOW="docs/swarm/workflows/refactor-pipeline.yaml"
        STRATEGY="optimization"
        MODE_FLAG="hierarchical"
        MAX_AGENTS=3
        REVIEW_FLAGS=(--parallel --monitor --review --testing)
        ;;
    opus4.8|opus4-8|opus4_8|opus-dynamic)
        TYPE="opus4.8"
        WORKFLOW="docs/swarm/workflows/opus4-8-dynamic-workflow.yaml"
        STRATEGY="adaptive"
        MODE_FLAG="hierarchical-mesh"
        MAX_AGENTS=7
        REVIEW_FLAGS=(--parallel --monitor --review --testing --verbose)
        ;;
    perf|performance)
        TYPE="perf"
        WORKFLOW="docs/swarm/workflows/perf-pipeline.yaml"
        STRATEGY="optimization"
        MODE_FLAG="hierarchical"
        MAX_AGENTS=2
        REVIEW_FLAGS=(--parallel --monitor --testing)
        ;;
    *)
        echo "unknown pipeline type: $TYPE" >&2
        usage
        exit 64
        ;;
esac

if [ ! -f "$WORKFLOW" ]; then
    echo "missing workflow: $WORKFLOW" >&2
    exit 1
fi

if [ -x scripts/ruflo-sync.sh ]; then
    ./scripts/ruflo-sync.sh --check --no-memory >/tmp/nu-aura-ruflo-sync-check.log 2>&1 || {
        echo "swarm config drift detected; run ./scripts/agents/ready.sh --fix" >&2
        echo "details: /tmp/nu-aura-ruflo-sync-check.log" >&2
        exit 1
    }
fi

read -r -d '' TASK_CONTEXT <<EOF || true
NU-AURA ${TYPE} pipeline

Task:
${TASK}

Before starting:
- Read AGENTS.md, CLAUDE.md, MEMORY.md.
- Read tools/PROCESS-RULES.md, tools/CONSTRAINT.md, tools/MERMAID.md.
- Read docs/adr/README.md and any relevant ADRs.
- Read docs/patterns/README.md before implementing.
- For security-sensitive work, read docs/security/baseline.md.
- Use ${WORKFLOW} and docs/runbooks/swarm-pipelines.md as the routing contract.

Hard constraints:
- Preserve tenant_id isolation and RLS assumptions.
- Preserve RBAC and SuperAdmin bypass semantics.
- Frontend: existing Axios client, React Query, RHF + Zod, no any.
- Backend: Java 21, Spring Boot 3.4.1, new Flyway migration only when schema changes.
- Validate with focused tests first, then compile/typecheck/lint as relevant.
EOF

CMD=(
    npx ruflo@latest swarm
    "$TASK_CONTEXT"
    --strategy "$STRATEGY"
    --mode "$MODE_FLAG"
    --max-agents "$MAX_AGENTS"
    "${REVIEW_FLAGS[@]}"
)

echo "Pipeline: $TYPE"
echo "Workflow: $WORKFLOW"
echo "Mode: $MODE"
echo
echo "Kickoff context:"
echo "----------------"
echo "$TASK_CONTEXT"
echo "----------------"
echo
echo "Command:"
printf ' %q' "${CMD[@]}"
echo

if [ "$MODE" = "execute" ]; then
    echo
    echo "Executing swarm..."
    exec "${CMD[@]}"
fi

echo
echo "Dry run only. Add --execute to run the swarm command."
