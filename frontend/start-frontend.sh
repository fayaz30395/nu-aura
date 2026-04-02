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

echo "Checking for existing processes on port 3000..."
PORT_PID=$(lsof -ti:3000 || true)
if [ -n "$PORT_PID" ]; then
  echo "Found process $PORT_PID on port 3000. Killing it..."
  kill -9 $PORT_PID
  sleep 1
  echo "Process killed."
else
  echo "No process found on port 3000."
fi

echo ""
echo "Starting NU-AURA Frontend..."
echo "Port: 3000"

# NODE_OPTIONS: cap heap at 3GB to prevent macOS OOM kills during compilation
export NODE_OPTIONS="--max-old-space-size=3072"

exec npx next dev -p 3000
