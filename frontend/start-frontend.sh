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

echo "Starting NU-AURA Frontend..."
echo "Port: ${PORT:-3001}"

# NODE_OPTIONS: cap heap at 3GB, use old V8 GC for stability
export NODE_OPTIONS="--max-old-space-size=3072"

exec npx next dev -p "${PORT:-3001}"
