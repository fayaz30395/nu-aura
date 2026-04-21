#!/usr/bin/env bash
# Orchestrator persona — runs the iteration loop until clean-sweep or iteration-cap.
#
# Inputs (env): NU_RUN_ID NU_RUN_DIR NU_SHEET NU_FRONTEND NU_BACKEND NU_ITER_CAP NU_CATALOG
# Inputs (files): $NU_RUN_DIR/uc-list.txt  (UC ids for this run)
# Output: final $NU_SHEET with clean-sweep attestation, or exit 1 if cap reached.
#
# Contract: this script is the *only* caller of the other persona scripts below.
# It does NOT drive the browser itself — it hands off to qa.sh for that.

set -euo pipefail
: "${NU_RUN_DIR:?}"; : "${NU_SHEET:?}"; : "${NU_ITER_CAP:?}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PERSONAS="$SKILL_DIR/personas"

iter=0
while : ; do
  iter=$((iter+1))
  if [ "$iter" -gt "$NU_ITER_CAP" ]; then
    echo "[orchestrator] iteration cap $NU_ITER_CAP reached — stopping (not clean)" >&2
    exit 1
  fi

  ITER_DIR="$NU_RUN_DIR/iter-$(printf '%02d' "$iter")"
  mkdir -p "$ITER_DIR"
  export NU_ITER="$iter" NU_ITER_DIR="$ITER_DIR"

  echo "[orchestrator] ── iteration $iter ─────────────────────────"

  # Pre-flight (stack up, cache cleared, login cookies exist for 9 roles)
  "$PERSONAS/qa.sh" --preflight || { echo "[orchestrator] preflight failed"; exit 2; }

  # 1) QA: execute catalog in single-login-many-tabs mode, batched by role
  "$PERSONAS/qa.sh" --execute

  # 2) Bug Validator: confirm + dedupe candidate bugs from iter-NN/candidates.jsonl
  "$PERSONAS/bug-validator.sh"

  # 3) QA Lead: severity review + done-criterion check
  "$PERSONAS/qa-lead.sh"

  # 4) Dev Lead: think-before-fix gating for P0/P1
  "$PERSONAS/dev-lead.sh"

  # 5) Developer pool (2 parallel, flock-protected): apply minimal edits
  "$PERSONAS/developer.sh" --pool-size=2

  # 6) Compiler & Composer: tsc + mvn compile, atomic sheet write, emit iter stats
  "$PERSONAS/compiler-composer.sh"

  new_rows=$(cat "$ITER_DIR/stats.new_rows" 2>/dev/null || echo 0)
  fixes=$(cat "$ITER_DIR/stats.fixes_applied" 2>/dev/null || echo 0)
  full_ran=$(cat "$ITER_DIR/stats.full_catalog_ran" 2>/dev/null || echo 0)

  echo "[orchestrator] iter $iter: new_rows=$new_rows fixes=$fixes full_ran=$full_ran"

  if [ "$full_ran" = "1" ] && [ "$new_rows" = "0" ] && [ "$fixes" = "0" ]; then
    echo "[orchestrator] CLEAN SWEEP achieved on iteration $iter"
    "$PERSONAS/compiler-composer.sh" --attest
    exit 0
  fi
done
