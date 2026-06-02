#!/usr/bin/env bash
# Verify that this checkout is ready for NU-AURA multi-agent work.
#
# Usage:
#   ./scripts/agents/ready.sh
#   ./scripts/agents/ready.sh --fix   # sync runtime swarm YAMLs from docs/swarm/

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

FIX=0
if [ "${1:-}" = "--fix" ]; then
    FIX=1
elif [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
fi

if [ -t 1 ]; then
    RED=$'\033[0;31m'; YEL=$'\033[0;33m'; GRN=$'\033[0;32m'; DIM=$'\033[2m'; RST=$'\033[0m'
else
    RED=''; YEL=''; GRN=''; DIM=''; RST=''
fi

failures=0
warnings=0

ok() { printf "%s✓%s %s\n" "$GRN" "$RST" "$*"; }
warn() { printf "%s!%s %s\n" "$YEL" "$RST" "$*"; warnings=$((warnings + 1)); }
fail() { printf "%s✗%s %s\n" "$RED" "$RST" "$*"; failures=$((failures + 1)); }
info() { printf "%s%s%s\n" "$DIM" "$*" "$RST"; }

run_with_timeout() {
    local seconds="$1"
    shift
    if command -v timeout >/dev/null 2>&1; then
        timeout "$seconds" "$@"
    else
        "$@"
    fi
}

require_file() {
    if [ -f "$1" ]; then
        ok "$1"
    else
        fail "missing required file: $1"
    fi
}

require_command() {
    if command -v "$1" >/dev/null 2>&1; then
        ok "$1 available ($(command -v "$1"))"
    else
        fail "missing command: $1"
    fi
}

optional_command() {
    if command -v "$1" >/dev/null 2>&1; then
        ok "$1 available ($(command -v "$1"))"
    else
        warn "optional command missing: $1"
    fi
}

echo "NU-AURA agent orchestration readiness"
echo

echo "Required project rules"
for f in \
    AGENTS.md \
    CLAUDE.md \
    MEMORY.md \
    tools/PROCESS-RULES.md \
    tools/CONSTRAINT.md \
    tools/MERMAID.md \
    docs/adr/README.md \
    docs/patterns/README.md \
    docs/security/baseline.md \
    docs/runbooks/swarm-pipelines.md \
    docs/swarm/README.md \
    docs/swarm/domains.yaml \
    docs/swarm/registry.yaml; do
    require_file "$f"
done

echo
echo "Pipeline definitions"
for workflow in \
    docs/swarm/workflows/feature-pipeline.yaml \
    docs/swarm/workflows/bug-pipeline.yaml \
    docs/swarm/workflows/security-pipeline.yaml \
    docs/swarm/workflows/refactor-pipeline.yaml \
    docs/swarm/workflows/perf-pipeline.yaml \
    docs/swarm/workflows/opus4-8-dynamic-workflow.yaml; do
    require_file "$workflow"
done

echo
echo "Runtime sync"
if [ -x scripts/ruflo-sync.sh ]; then
    if [ "$FIX" = "1" ]; then
        if ./scripts/ruflo-sync.sh --no-memory; then
            ok "runtime swarm configs synced"
        else
            fail "scripts/ruflo-sync.sh --no-memory failed"
        fi
    elif ./scripts/ruflo-sync.sh --check --no-memory >/tmp/nu-aura-ruflo-sync-check.log 2>&1; then
        ok "docs/swarm and .claude-flow runtime configs are in sync"
    else
        fail "swarm runtime config drift detected"
        info "run: ./scripts/agents/ready.sh --fix"
        info "details: /tmp/nu-aura-ruflo-sync-check.log"
    fi
else
    fail "scripts/ruflo-sync.sh is missing or not executable"
fi

echo
echo "Toolchain"
require_command git
require_command java
require_command mvn
require_command node
require_command npm
require_command npx
optional_command docker

echo
echo "Local orchestration commands"
if [ -x scripts/agents/start-work.sh ]; then
    ok "scripts/agents/start-work.sh"
else
    fail "scripts/agents/start-work.sh is missing or not executable"
fi

if [ -x scripts/handoff/status.sh ]; then
    ok "handoff bus scripts available"
    if ./scripts/handoff/status.sh >/tmp/nu-aura-handoff-status.log 2>&1; then
        ok "handoff status command works"
    else
        warn "handoff status command returned non-zero"
        info "details: /tmp/nu-aura-handoff-status.log"
    fi
else
    warn "handoff bus scripts are not executable"
fi

echo
echo "Ruflo daemon"
if command -v npx >/dev/null 2>&1; then
    if run_with_timeout 8 npx ruflo@latest swarm status >/tmp/nu-aura-swarm-status.log 2>&1; then
        ok "swarm daemon responsive"
    else
        warn "swarm daemon is not responsive"
        info "start/check manually: ./scripts/ruflo-start.sh"
        info "details: /tmp/nu-aura-swarm-status.log"
    fi
fi

echo
if [ "$failures" -gt 0 ]; then
    fail "readiness failed: $failures failure(s), $warnings warning(s)"
    exit 1
fi

ok "ready for agent-orchestrated work ($warnings warning(s))"
echo
echo "Start examples:"
echo "  ./scripts/ruflo-start.sh"
echo "  ./scripts/agents/start-work.sh feature \"Add employee document expiry reminders\""
echo "  ./scripts/agents/start-work.sh opus4.8 \"Handle mixed feature/regression/security requirement\""
echo "  ./scripts/agents/start-work.sh bug \"Fix payroll approval 403 for HR_MANAGER\""
echo "  ./scripts/agents/start-work.sh security \"Close file upload path traversal audit finding\""
