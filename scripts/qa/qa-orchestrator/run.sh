#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing QA Orchestrator dependencies..."
npm install --silent 2>/dev/null || true

echo "Starting NU-AURA Autonomous QA Orchestrator..."
npx tsx src/index.ts "$@"
