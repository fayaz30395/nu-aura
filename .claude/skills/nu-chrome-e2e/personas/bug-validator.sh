#!/usr/bin/env bash
# Bug Validator persona — confirms + dedupes candidate bugs.
#
# Input:  $NU_ITER_DIR/candidates.jsonl   (from qa.sh)
# Output: $NU_ITER_DIR/confirmed.jsonl    (dedupe key = uc+role+route+observed)
#         $NU_ITER_DIR/duplicates.jsonl
#
# Rules:
#   1. A candidate is CONFIRMED only if reproduction is deterministic (re-run the check,
#      must produce same observed). If flaky, downgrade severity by one and tag flaky=true.
#   2. A candidate is a DUP if (uc, role, route, observed) already exists in $NU_SHEET
#      under State ∈ {OPEN, IN_PROGRESS}. Increment repeat_count on existing row.
#   3. Bugs on FIXED/VERIFIED rows are regression — move row back to OPEN + note regression.
#
# This is a pure read/transform step — never touches browser.

set -euo pipefail
: "${NU_ITER_DIR:?}"; : "${NU_SHEET:?}"
CAND="$NU_ITER_DIR/candidates.jsonl"
CONF="$NU_ITER_DIR/confirmed.jsonl"
DUP="$NU_ITER_DIR/duplicates.jsonl"
: > "$CONF"; : > "$DUP"

[ -s "$CAND" ] || { echo "[bug-validator] no candidates"; exit 0; }

# Shell-side stub: the LLM in bug-validator persona reads candidates.jsonl, re-runs
# deterministic checks (typically just URL+DOM re-fetch via curl or MCP), and splits
# into confirmed.jsonl vs duplicates.jsonl. See SKILL.md 'Bug Validator' section.
echo "[bug-validator] input=$(wc -l < "$CAND") → see SKILL.md for LLM dedupe protocol"
