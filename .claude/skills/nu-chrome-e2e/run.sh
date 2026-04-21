#!/usr/bin/env bash
# Entry point for nu-chrome-e2e. Parses mode flags, prepares run dir, dispatches orchestrator.
#
# Modes (mutually exclusive — pick one):
#   --full              Full catalog (~900 UCs across 9 roles)
#   --rbac              Only UC-RBAC-* (765 entries)
#   --crud              Only UC-CRUD-* and UC-APPR-*
#   --route=PATH        Filter by route (e.g. --route=/leave)
#   --module=NAME       Filter by module prefix on UC id (e.g. --module=EMP,LEAVE)
#   --uc=ID[,ID,...]    Specific UC ids
#
# Common flags:
#   --iteration-cap=N   Safety cap, default 20
#   --frontend=URL      Override http://localhost:3000
#   --backend=URL       Override http://localhost:8080
#   --dry-run           Resolve + print UC set, do not execute
#
# Exit codes: 0 clean-sweep, 1 hit iteration cap, 2 preflight failed, 3 mode invalid

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CATALOG="$SCRIPT_DIR/use-cases.yaml"
RUNS_DIR="$SCRIPT_DIR/runs"

MODE=""
SELECTOR=""
ITER_CAP=20
FRONTEND="${NU_FRONTEND_URL:-http://localhost:3000}"
BACKEND="${NU_BACKEND_URL:-http://localhost:8080}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --full)           MODE="full" ;;
    --rbac)           MODE="rbac" ;;
    --crud)           MODE="crud" ;;
    --route=*)        MODE="route";    SELECTOR="${arg#*=}" ;;
    --module=*)       MODE="module";   SELECTOR="${arg#*=}" ;;
    --uc=*)           MODE="uc";       SELECTOR="${arg#*=}" ;;
    --iteration-cap=*) ITER_CAP="${arg#*=}" ;;
    --frontend=*)     FRONTEND="${arg#*=}" ;;
    --backend=*)      BACKEND="${arg#*=}" ;;
    --dry-run)        DRY_RUN=1 ;;
    -h|--help)        sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 3 ;;
  esac
done

[ -z "$MODE" ] && { echo "error: pick a mode (--full|--rbac|--crud|--route=|--module=|--uc=)" >&2; exit 3; }
[ -f "$CATALOG" ] || { echo "error: $CATALOG missing — regenerate with generate-rbac-cases.sh" >&2; exit 2; }

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$RUNS_DIR/$RUN_ID"
mkdir -p "$RUN_DIR"/{evidence,console,har,fix-logs}

# Resolve UC set deterministically (yq required; fall back to grep for portability)
resolve_ucs() {
  local mode="$1" sel="$2"
  if command -v yq >/dev/null 2>&1; then
    case "$mode" in
      full)   yq -r '.use_cases[].id' "$CATALOG" ;;
      rbac)   yq -r '.use_cases[] | select(.category=="RBAC") | .id' "$CATALOG" ;;
      crud)   yq -r '.use_cases[] | select(.category=="CRUD" or .category=="APPROVAL") | .id' "$CATALOG" ;;
      route)  yq -r --arg r "$sel" '.use_cases[] | select(.route==$r) | .id' "$CATALOG" ;;
      module) IFS=, read -ra M <<<"$sel"
              for m in "${M[@]}"; do yq -r --arg m "$m" '.use_cases[] | select(.id|test("^UC-"+$m)) | .id' "$CATALOG"; done ;;
      uc)     tr ',' '\n' <<<"$sel" ;;
    esac
  else
    # naive fallback: grep id lines, filter by category/route inline (slower but no dep)
    grep -E '^  - id:|^    category:|^    route:' "$CATALOG" | awk -v m="$mode" -v s="$sel" '
      /^  - id:/         { id=$3; cat=""; route=""; next }
      /^    category:/   { cat=$2; next }
      /^    route:/      { route=$2;
        if (m=="full") print id;
        else if (m=="rbac" && cat=="RBAC") print id;
        else if (m=="crud" && (cat=="CRUD" || cat=="APPROVAL")) print id;
        else if (m=="route" && route==s) print id;
      }'
  fi
}

mapfile -t UC_LIST < <(resolve_ucs "$MODE" "$SELECTOR")
TOTAL=${#UC_LIST[@]}
[ "$TOTAL" -eq 0 ] && { echo "error: 0 UCs matched mode=$MODE selector=$SELECTOR" >&2; exit 3; }

cat > "$RUN_DIR/manifest.txt" <<EOF
run_id=$RUN_ID
mode=$MODE
selector=$SELECTOR
total_ucs=$TOTAL
iteration_cap=$ITER_CAP
frontend=$FRONTEND
backend=$BACKEND
catalog_sha=$(shasum -a 256 "$CATALOG" | awk '{print $1}')
EOF

printf '%s\n' "${UC_LIST[@]}" > "$RUN_DIR/uc-list.txt"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] $TOTAL UCs → $RUN_DIR/uc-list.txt"
  head -20 "$RUN_DIR/uc-list.txt"
  exit 0
fi

# Seed sheet from template
SHEET="$RUN_DIR/bug-sheet.md"
sed -e "s|{{START_ISO}}|$(date -u +%FT%TZ)|" \
    -e "s|{{MODE}}|$MODE${SELECTOR:+=$SELECTOR}|" \
    -e "s|{{TOTAL_UC}}|$TOTAL|" \
    -e "s|{{RUN_ID}}|$RUN_ID|" \
    "$SCRIPT_DIR/sheet-template.md" > "$SHEET"

export NU_RUN_ID="$RUN_ID" NU_RUN_DIR="$RUN_DIR" NU_SHEET="$SHEET"
export NU_FRONTEND="$FRONTEND" NU_BACKEND="$BACKEND" NU_ITER_CAP="$ITER_CAP"
export NU_CATALOG="$CATALOG"

exec "$SCRIPT_DIR/personas/orchestrator.sh"
