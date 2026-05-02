#!/bin/bash

# NU-AURA Frontend — Local Development Startup Script
# Caps Node.js heap to prevent macOS OOM kills during hot compilation

set -euo pipefail

cd "$(dirname "$0")"

# Load .env files
if [ -f "../.env" ]; then
  set -a; source "../.env"; set +a
elif [ -f ".env.local" ]; then
  set -a; source ".env.local"; set +a
fi

# ── Ports (never change these) ──────────────────────────────────
# Frontend: 3000  |  Backend: 8080
# ─────────────────────────────────────────────────────────────────
DEV_PORT=3000

echo "Checking for existing processes on port $DEV_PORT..."
PORT_PIDS=$(lsof -ti:"$DEV_PORT" 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
  echo "Found process(es) $PORT_PIDS on port $DEV_PORT. Killing..."
  echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  echo "Cleared."
else
  echo "Port $DEV_PORT is free."
fi

echo ""
echo "Starting NU-AURA Frontend (dev)..."
echo "  Frontend → http://localhost:$DEV_PORT"
echo "  Backend  → http://localhost:8080"

# NODE_OPTIONS: cap heap at 3GB to prevent macOS OOM kills during compilation
export NODE_OPTIONS="--max-old-space-size=3072"

exec npx next dev -p "$DEV_PORT"
