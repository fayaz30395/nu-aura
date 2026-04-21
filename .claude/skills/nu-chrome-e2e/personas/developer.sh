#!/usr/bin/env bash
# Developer persona — parallel fixer pool (flock-protected).
#
# Input:  $NU_ITER_DIR/fix-queue.jsonl   (enriched by dev-lead with root_cause + target_file)
# Output: $NU_ITER_DIR/fixes-applied.jsonl  (one line per applied fix)
#         $NU_RUN_DIR/fix-logs/<uc>.log
#
# Rules:
#   - Pool size default 2 (configurable via --pool-size=N)
#   - flock on $NU_RUN_DIR/fix-lock guards the shared fixes-applied.jsonl append
#   - Each fix is MINIMAL — single-file edit preferred, no refactor, no new abstractions
#   - If a fix requires >2 files or a migration, mark needs_review=true and skip (orchestrator picks up next iter)
#   - Each worker records the file(s) touched and a one-line rationale

set -euo pipefail
: "${NU_ITER_DIR:?}"; : "${NU_RUN_DIR:?}"
POOL=2
for arg in "$@"; do
  case "$arg" in
    --pool-size=*) POOL="${arg#*=}" ;;
  esac
done

QUEUE="$NU_ITER_DIR/fix-queue.jsonl"
APPLIED="$NU_ITER_DIR/fixes-applied.jsonl"
LOCK="$NU_RUN_DIR/fix-lock"
LOG_DIR="$NU_RUN_DIR/fix-logs"
mkdir -p "$LOG_DIR"
: > "$APPLIED"
: > "$LOCK"

[ -s "$QUEUE" ] || { echo "[developer] no fixes queued"; exit 0; }

echo "[developer] pool-size=$POOL queue=$(wc -l < "$QUEUE" | tr -d ' ')"
echo "[developer] LLM drives this step — reads fix-queue.jsonl, applies minimal edits,"
echo "            appends to fixes-applied.jsonl under flock on $LOCK."
echo "            Shell-side contract:"
echo "              ( flock -x 200; echo \"\$FIX_JSON\" >> \"$APPLIED\"; ) 200>\"$LOCK\""
