#!/usr/bin/env bash
#
# run-qa-loop.sh — launcher for the NU-AURA Autonomous QA+DEV verification swarm.
#
# Does preflight gates + run-dir scaffolding, then execs into Claude Code with the
# orchestrator prompt (docs/qa/orchestrator-prompt.md). The swarm design lives in
# that spec; this script only gets you to a clean starting line.
#
# Usage:
#   bash scripts/run-qa-loop.sh --full              # 90min, baseline+RBAC+CRUD+x-cut (default)
#   bash scripts/run-qa-loop.sh --rbac              # 25min, access/deny matrix only
#   bash scripts/run-qa-loop.sh --crud              # 30min, interactive flows
#   bash scripts/run-qa-loop.sh --route /leave/x    # 5min, single route
#   bash scripts/run-qa-loop.sh --uc UC-RBAC-042    # 3min, single use case
#   bash scripts/run-qa-loop.sh --module leave      # 15min, single module
#
# Flags:
#   --dry-run        run preflight + scaffolding, print the launch plan, do NOT exec claude
#   --skip-chrome    skip the (manual) Claude-in-Chrome confirmation gate
#   -h | --help      show this help
#
set -euo pipefail

# ── Locate repo root (script lives in <root>/scripts/) ───────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

PROMPT_FILE="docs/qa/orchestrator-prompt.md"

# ── Colours ──────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
else
  RED=''; GRN=''; YLW=''; BLD=''; RST=''
fi
ok()    { printf '  %s✓%s %s\n' "$GRN" "$RST" "$1"; }
warn()  { printf '  %s!%s %s\n' "$YLW" "$RST" "$1"; }
die()   { printf '\n%s✗ ABORT:%s %s\n' "$RED" "$RST" "$1" >&2; exit 1; }
hdr()   { printf '\n%s%s%s\n' "$BLD" "$1" "$RST"; }

usage() { sed -n '3,29p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

# ── Parse args ─────────────────────────────────────────────────────────────
MODE="full"; BUDGET_MIN=90; TARGET=""; DRY_RUN=0; SKIP_CHROME=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)      MODE="full";   BUDGET_MIN=90; shift ;;
    --rbac)      MODE="rbac";   BUDGET_MIN=25; shift ;;
    --crud)      MODE="crud";   BUDGET_MIN=30; shift ;;
    --route)     MODE="route";  BUDGET_MIN=5;  TARGET="${2:-}"; [[ -z "$TARGET" ]] && die "--route needs a path, e.g. --route /leave/requests"; shift 2 ;;
    --uc)        MODE="uc";     BUDGET_MIN=3;  TARGET="${2:-}"; [[ -z "$TARGET" ]] && die "--uc needs an id, e.g. --uc UC-RBAC-042"; shift 2 ;;
    --module)    MODE="module"; BUDGET_MIN=15; TARGET="${2:-}"; [[ -z "$TARGET" ]] && die "--module needs a name, e.g. --module leave"; shift 2 ;;
    --dry-run)   DRY_RUN=1; shift ;;
    --skip-chrome) SKIP_CHROME=1; shift ;;
    -h|--help)   usage ;;
    *)           die "unknown flag: $1 (try --help)" ;;
  esac
done

hdr "NU-AURA Autonomous QA+DEV Swarm — launcher"
printf '  mode=%s  budget=%smin  target=%s\n' "$MODE" "$BUDGET_MIN" "${TARGET:-—}"

# ── Preflight gates (abort on any red) ───────────────────────────────────────
hdr "[1/4] Preflight gates"

# tools on PATH
for t in jq curl claude git node npm; do
  command -v "$t" >/dev/null 2>&1 || die "'$t' not on PATH"
done
ok "tools present: jq curl claude git node npm"

# spec must exist (this launcher hands control to it)
[[ -f "$PROMPT_FILE" ]] || die "orchestrator spec missing: $PROMPT_FILE"
ok "orchestrator spec found: $PROMPT_FILE"

# backend health
curl -sf -m 5 http://localhost:8080/actuator/health >/dev/null 2>&1 \
  || die "backend not healthy on :8080 (curl /actuator/health failed)"
ok "backend UP (:8080/actuator/health)"

# frontend
curl -sf -m 5 http://localhost:3000 >/dev/null 2>&1 \
  || die "frontend not reachable on :3000"
ok "frontend UP (:3000)"

# CSRF endpoint
curl -sf -m 5 http://localhost:3000/api/v1/auth/csrf >/dev/null 2>&1 \
  || die "CSRF endpoint unreachable (/api/v1/auth/csrf)"
ok "CSRF endpoint reachable"

# clean working tree
[[ -z "$(git status --porcelain)" ]] \
  || die "working tree is dirty — commit or stash first (git status --porcelain is non-empty)"
ok "working tree clean"

# frontend node_modules
[[ -d frontend/node_modules ]] || die "frontend/node_modules missing — run: cd frontend && npm install"
ok "frontend/node_modules installed"

# Claude-in-Chrome extension — cannot be auto-verified from a shell
if [[ "$SKIP_CHROME" -eq 1 ]]; then
  warn "Claude-in-Chrome check SKIPPED (--skip-chrome)"
elif [[ "$DRY_RUN" -eq 1 ]]; then
  warn "Claude-in-Chrome check skipped (dry-run)"
else
  printf '  %s?%s Confirm the Claude-in-Chrome extension is connected in your Chrome. [y/N] ' "$YLW" "$RST"
  read -r reply </dev/tty || reply=""
  [[ "$reply" =~ ^[Yy]$ ]] || die "Claude-in-Chrome not confirmed connected"
  ok "Claude-in-Chrome confirmed"
fi

# ── Scaffold run directory ───────────────────────────────────────────────────
hdr "[2/4] Scaffolding run directory"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="docs/qa/runs/super-e2e-${TS}"
GIT_SHA="$(git rev-parse --short HEAD)"
mkdir -p "$RUN_DIR/logs" "$RUN_DIR/signoffs"

cat > "$RUN_DIR/env" <<EOF
QA_MODE=$MODE
QA_BUDGET_MIN=$BUDGET_MIN
QA_TARGET=$TARGET
QA_GIT_SHA=$GIT_SHA
QA_RUN_DIR=$RUN_DIR
QA_FRONTEND=http://localhost:3000
QA_BACKEND=http://localhost:8080
QA_TS=$TS
EOF

cat > "$RUN_DIR/bug-sheet.md" <<EOF
# Bug sheet — super-e2e-${TS} (mode=$MODE)

States: OPEN → FIXING → COMPILED → VERIFIED → CLOSED
Owner: triage-arbiter only (others propose via SendMessage).

| ID | route/uc | layer | severity | state | owner | summary |
|----|----------|-------|----------|-------|-------|---------|
EOF

cat > "$RUN_DIR/release.json" <<EOF
{
  "approved": false,
  "ts": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mode": "$MODE",
  "git_sha": "$GIT_SHA",
  "cycles": 0,
  "signoffs": {},
  "open_rows": 0,
  "regression_green_streak": 0,
  "blocking_reasons": ["run not yet started"]
}
EOF

: > "$RUN_DIR/logs/orchestrator.log"
ok "scaffolded $RUN_DIR (env, bug-sheet.md, release.json, logs/, signoffs/)"

# ── Build the orchestrator launch prompt ─────────────────────────────────────
hdr "[3/4] Composing orchestrator prompt"
LAUNCH_PROMPT="$RUN_DIR/launch-prompt.md"
{
  echo "# RUN CONTEXT (generated by run-qa-loop.sh)"
  echo ""
  echo "- Run dir: \`$RUN_DIR\`"
  echo "- Mode: \`$MODE\`  Budget: \`${BUDGET_MIN}min\`  Target: \`${TARGET:-—}\`"
  echo "- Git SHA: \`$GIT_SHA\`  Frontend: :3000  Backend: :8080"
  echo ""
  echo "You are the orchestrator. Follow the spec below verbatim. Spawn the 10-agent"
  echo "swarm, schedule only, and exit when \`$RUN_DIR/release.json\` shows approved:true"
  echo "(or escalate skill_exit:failed if the budget elapses with blocking rows)."
  echo ""
  echo "---"
  echo ""
  cat "$PROMPT_FILE"
} > "$LAUNCH_PROMPT"
ok "wrote $LAUNCH_PROMPT"

# ── Hand off to Claude Code ──────────────────────────────────────────────────
hdr "[4/4] Launch"
if [[ "$DRY_RUN" -eq 1 ]]; then
  warn "DRY RUN — not exec'ing claude. Launch plan:"
  printf '      claude %q\n' "$(cat "$LAUNCH_PROMPT")" | head -c 200
  printf '\n  Tail in another terminal:\n'
  printf '      tail -f %s/logs/orchestrator.log %s/bug-sheet.md %s/signoffs/*.json\n' "$RUN_DIR" "$RUN_DIR" "$RUN_DIR"
  exit 0
fi

printf '  Tail in another terminal:\n'
printf '      tail -f %s/logs/orchestrator.log %s/bug-sheet.md\n\n' "$RUN_DIR" "$RUN_DIR"
exec claude "$(cat "$LAUNCH_PROMPT")"
