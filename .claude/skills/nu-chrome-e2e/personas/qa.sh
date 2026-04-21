#!/usr/bin/env bash
# QA persona — drives the browser. Single-login-many-tabs, batched by role.
#
# This is a *runbook* — the actual browser calls happen through the Claude Code
# harness using mcp__claude-in-chrome__* tools. When invoked by the orchestrator,
# the LLM in QA persona reads this file and executes the steps.
#
# Modes:
#   --preflight   Verify stack + cookies, no UC execution
#   --execute     Run the current iteration's UC set
#
# Single-login-many-tabs rule (HARD):
#   - Log in ONCE per role per iteration (respect 5/min auth rate limit)
#   - Open exactly 5 tabs per role, fanned across that role's UC queue
#   - 15s pause between role switches
#   - Never re-login mid-iteration unless session expires (>30 min)
#
# Roles iterated in this order (severity-first for triage):
#   SUPER_ADMIN TENANT_ADMIN HR_ADMIN HR_MANAGER MANAGER TEAM_LEAD EMPLOYEE RECRUITMENT_ADMIN FINANCE_ADMIN
#
# Three-verification RBAC check (for each UC-RBAC-*):
#   1. URL check     — observed URL matches expect (render|redirect target)
#   2. DOM check     — page title + key selector present (or /me/dashboard H1 for redirect)
#   3. Negative API  — if redirect expected, GET api_endpoint must return 403
#
# Evidence captured per UC (pass or fail):
#   - screenshot.png       (mcp__claude-in-chrome__browser_screenshot)
#   - console.jsonl        (mcp__claude-in-chrome__read_console_messages)
#   - network.jsonl        (mcp__claude-in-chrome__read_network_requests, status+url only)
#
# Candidate bugs written to $NU_ITER_DIR/candidates.jsonl (one JSON obj per line):
#   {"uc":"UC-RBAC-017","role":"EMPLOYEE","route":"/employees","severity":"P0",
#    "expected":"redirect","observed":"render","evidence":"evidence/UC-RBAC-017/"}

set -euo pipefail
: "${NU_RUN_DIR:?}"; : "${NU_ITER_DIR:?}"; : "${NU_FRONTEND:?}"; : "${NU_BACKEND:?}"

mode="${1:---execute}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UC_LIST="$NU_RUN_DIR/uc-list.txt"
CAND="$NU_ITER_DIR/candidates.jsonl"
: > "$CAND"

case "$mode" in
  --preflight)
    # Stack checks
    curl -sf -o /dev/null "$NU_FRONTEND/api/health" || { echo "frontend down"; exit 1; }
    curl -sf -o /dev/null "$NU_BACKEND/actuator/health" || { echo "backend down"; exit 1; }
    # Cookie jars expected at $NU_RUN_DIR/cookies/<ROLE>.txt — created by first login
    mkdir -p "$NU_RUN_DIR/cookies"
    echo "[qa] preflight OK ($NU_FRONTEND, $NU_BACKEND)"
    exit 0
    ;;
  --execute)
    # The LLM executes this section using mcp__claude-in-chrome__* tools.
    # Shell-side stub just records that QA was invoked; real work happens via MCP.
    echo "[qa] execute — UCs=$(wc -l < "$UC_LIST") roles=9 tabs/role=5"
    echo "[qa] see SKILL.md 'QA execution loop' for the per-tool call sequence."
    # Mark that execution happened so downstream personas have something to read.
    : > "$CAND"
    echo "[qa] candidates at $CAND (populated by LLM driver during real run)"
    ;;
  *) echo "unknown qa mode: $mode" >&2; exit 3 ;;
esac
