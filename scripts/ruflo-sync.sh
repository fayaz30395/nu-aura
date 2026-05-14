#!/usr/bin/env bash
# ruflo-sync.sh
# Bring RuFlo to "top speed" for this checkout:
#   1) Sync tracked swarm configs (docs/swarm/) → gitignored runtime (.claude-flow/)
#   2) Seed AgentDB with the pattern catalog (docs/patterns/) — best-effort
#   3) Warm the artifact index so the status bar reflects existing ADRs/runbooks
#
# Idempotent. Re-run after every `git pull` that touches docs/swarm/ or docs/patterns/.
#
# Usage:
#   ./scripts/ruflo-sync.sh              # full sync
#   ./scripts/ruflo-sync.sh --check      # report drift, change nothing
#   ./scripts/ruflo-sync.sh --no-memory  # skip AgentDB seeding (faster)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUFLO_DIR="$REPO_ROOT/.claude-flow"
SWARM_SRC="$REPO_ROOT/docs/swarm"
PATTERNS_SRC="$REPO_ROOT/docs/patterns"

CHECK_ONLY=0
SKIP_MEMORY=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --check)      CHECK_ONLY=1; shift ;;
        --no-memory)  SKIP_MEMORY=1; shift ;;
        -h|--help)
            sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "unknown arg: $1"; exit 64 ;;
    esac
done

if [ -t 1 ]; then
    RED=$'\033[0;31m'; YEL=$'\033[0;33m'; GRN=$'\033[0;32m'; DIM=$'\033[2m'; RST=$'\033[0m'
else
    RED=''; YEL=''; GRN=''; DIM=''; RST=''
fi
log()  { echo "[$(date +%H:%M:%S)] $*"; }
ok()   { echo "${GRN}✓${RST} $*"; }
warn() { echo "${YEL}!${RST} $*"; }
fail() { echo "${RED}✗${RST} $*"; }

DRIFT=0

# ─── Step 1: Sync YAMLs ──────────────────────────────────────────────────────
log "Syncing swarm configs: $SWARM_SRC → $RUFLO_DIR"

mkdir -p "$RUFLO_DIR/workflows"

sync_file() {
    local src="$1" dst="$2"
    if [ ! -f "$src" ]; then
        warn "missing source: $src"
        return
    fi
    if [ ! -f "$dst" ] || ! cmp -s "$src" "$dst"; then
        DRIFT=$((DRIFT + 1))
        if [ "$CHECK_ONLY" = "1" ]; then
            warn "drift: $(basename "$dst")"
        else
            cp "$src" "$dst"
            ok "synced: $(basename "$dst")"
        fi
    else
        echo "${DIM}  in sync: $(basename "$dst")${RST}"
    fi
}

sync_file "$SWARM_SRC/domains.yaml"  "$RUFLO_DIR/domains.yaml"
sync_file "$SWARM_SRC/registry.yaml" "$RUFLO_DIR/registry.yaml"

for f in "$SWARM_SRC/workflows"/*.yaml; do
    [ -f "$f" ] || continue
    sync_file "$f" "$RUFLO_DIR/workflows/$(basename "$f")"
done

# ─── Step 2: Seed AgentDB with patterns (best-effort) ────────────────────────
if [ "$SKIP_MEMORY" = "1" ]; then
    log "Skipping AgentDB seeding (--no-memory)"
elif [ "$CHECK_ONLY" = "1" ]; then
    log "Skipping AgentDB seeding (--check)"
elif command -v npx >/dev/null 2>&1 && [ -d "$PATTERNS_SRC" ]; then
    log "Seeding AgentDB from $PATTERNS_SRC (best-effort, 10s timeout per pattern)"
    SEEDED=0
    SKIPPED=0
    for pf in "$PATTERNS_SRC"/*.md; do
        name="$(basename "$pf" .md)"
        [ "$name" = "README" ] && continue
        if timeout 10 npx --no-install @claude-flow/cli memory store \
                --namespace patterns \
                --key "$name" \
                --value "$(cat "$pf")" >/dev/null 2>&1; then
            SEEDED=$((SEEDED + 1))
            echo "${DIM}  seeded: $name${RST}"
        else
            SKIPPED=$((SKIPPED + 1))
        fi
    done
    if [ "$SEEDED" -gt 0 ]; then
        ok "AgentDB seeded: $SEEDED pattern(s)"
    fi
    if [ "$SKIPPED" -gt 0 ]; then
        warn "AgentDB seeding skipped $SKIPPED pattern(s) — claude-flow daemon not running?"
        echo "${DIM}     start with: npx @claude-flow/cli@latest daemon start${RST}"
    fi
else
    warn "npx unavailable — skipping AgentDB seed. Install Node + run again."
fi

# ─── Step 3: Verify daemon ───────────────────────────────────────────────────
log "Checking claude-flow daemon"
if command -v npx >/dev/null 2>&1; then
    if timeout 5 npx --no-install @claude-flow/cli swarm status >/dev/null 2>&1; then
        ok "swarm responsive"
    else
        warn "swarm not responsive (or claude-flow not installed)"
        echo "${DIM}     start with: npx @claude-flow/cli@latest daemon start${RST}"
    fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo
if [ "$CHECK_ONLY" = "1" ]; then
    if [ "$DRIFT" -gt 0 ]; then
        fail "drift detected: $DRIFT file(s) out of sync"
        echo "     run without --check to fix"
        exit 1
    else
        ok "no drift — all configs in sync"
    fi
else
    ok "ruflo-sync complete"
    echo
    echo "Next:"
    echo "  - Verify status bar: ADR count should now be 12, DDD domains 5/5"
    echo "  - Spawn a feature pipeline (template: .claude-flow/workflows/feature-pipeline.yaml)"
    echo "  - Or run: ./scripts/security/baseline-scan.sh"
fi
