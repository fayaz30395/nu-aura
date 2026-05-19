#!/usr/bin/env bash
# Start/check the local RuFlo orchestration runtime for NU-AURA.
#
# Usage:
#   ./scripts/ruflo-start.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Syncing swarm runtime config..."
./scripts/ruflo-sync.sh --no-memory

echo
echo "Starting RuFlo daemon..."
npx ruflo@latest daemon start || true

echo
echo "Initializing swarm topology..."
npx ruflo@latest swarm init \
    --topology hierarchical-mesh \
    --max-agents 8 \
    --strategy specialized || true

echo
echo "Current swarm status:"
npx ruflo@latest swarm status

echo
echo "Ready command examples:"
echo "  ./scripts/ruflo-pipeline.sh feature \"Add employee document expiry reminders\""
echo "  ./scripts/ruflo-pipeline.sh security \"Close P0 file upload finding\" --execute"
