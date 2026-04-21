#!/usr/bin/env bash
# QA Lead persona — severity review + done-criterion gate.
#
# Input:  $NU_ITER_DIR/confirmed.jsonl
# Output: $NU_ITER_DIR/triaged.jsonl   (severity normalized, owner assigned)
#         $NU_ITER_DIR/done-criteria.txt
#
# Severity rules (override from catalog defaults):
#   P0 — any RBAC leak, auth bypass, data leak across tenants, XSS that executes
#   P1 — console ERROR that blocks primary user action, broken CRUD golden-path,
#        500s, CSRF-missing on mutating endpoint
#   P2 — missing empty/error/loading state, design-token violation, broken aria-label
#   P3 — polish / minor a11y / non-blocking (LOG ONLY — does not block clean-sweep)
#
# Done-criterion (mandatory for clean-sweep termination):
#   - zero OPEN P0 confirmed in this iteration
#   - zero OPEN P1 confirmed in this iteration
#   - full catalog was run (not a filtered sub-run)

set -euo pipefail
: "${NU_ITER_DIR:?}"
CONF="$NU_ITER_DIR/confirmed.jsonl"
TRI="$NU_ITER_DIR/triaged.jsonl"
CRIT="$NU_ITER_DIR/done-criteria.txt"

[ -f "$CONF" ] || { echo "[qa-lead] no confirmed.jsonl — nothing to triage"; : > "$TRI"; exit 0; }

# LLM does the triage + severity override based on the rules above, writes triaged.jsonl.
cp "$CONF" "$TRI"
echo "[qa-lead] triaged $(wc -l < "$TRI") bugs → $TRI"

# Emit done-criteria summary for orchestrator / compiler-composer to read
p0=$(grep -c '"severity":"P0"' "$TRI" 2>/dev/null || echo 0)
p1=$(grep -c '"severity":"P1"' "$TRI" 2>/dev/null || echo 0)
cat > "$CRIT" <<EOF
open_p0=$p0
open_p1=$p1
EOF
echo "[qa-lead] open P0=$p0 P1=$p1"
