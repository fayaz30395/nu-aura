#!/usr/bin/env bash
# Dev Lead persona — think-before-fix gate for P0/P1 bugs.
#
# Input:  $NU_ITER_DIR/triaged.jsonl
# Output: $NU_ITER_DIR/fix-queue.jsonl   (only P0/P1, enriched with root-cause hypothesis)
#         $NU_ITER_DIR/deferred.jsonl    (P2/P3 — logged, not fixed this iter)
#
# Gate rules:
#   - A P0/P1 enters the fix queue ONLY if a plausible minimal-edit hypothesis exists
#     (controller/service/permission/migration/component/guard).
#   - If no plausible minimal edit, tag needs_design=true and defer — do NOT queue.
#   - P2/P3 → deferred.jsonl (tracked in sheet under WONTFIX-THIS-ITER unless trivial).
#
# This is the LLM's reasoning step — it reads triaged.jsonl, thinks, and emits the queue.
# Shell side just splits by severity so downstream developer.sh has a clean input.

set -euo pipefail
: "${NU_ITER_DIR:?}"
TRI="$NU_ITER_DIR/triaged.jsonl"
QUEUE="$NU_ITER_DIR/fix-queue.jsonl"
DEFER="$NU_ITER_DIR/deferred.jsonl"
: > "$QUEUE"; : > "$DEFER"

[ -s "$TRI" ] || { echo "[dev-lead] no triaged bugs — empty queue"; exit 0; }

# Shell-side prefilter: P0/P1 → queue, P2/P3 → deferred.
# The LLM in dev-lead persona then enriches fix-queue.jsonl with root_cause + target_file + minimal_edit hint.
grep -E '"severity":"P[01]"' "$TRI" > "$QUEUE" 2>/dev/null || true
grep -E '"severity":"P[23]"' "$TRI" > "$DEFER" 2>/dev/null || true

q=$(wc -l < "$QUEUE" | tr -d ' ')
d=$(wc -l < "$DEFER" | tr -d ' ')
echo "[dev-lead] fix-queue=$q deferred=$d"
echo "[dev-lead] LLM must enrich $QUEUE with root_cause + target_file before developer.sh reads it"
