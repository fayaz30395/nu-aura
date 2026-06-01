#!/usr/bin/env bash
# Start the NU-AURA Codex MCP over stdio. All setup output goes to stderr so
# stdout remains reserved for MCP JSON-RPC frames.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$DIR/node_modules/@modelcontextprotocol/sdk" ]; then
  echo "[nu-aura-codex-mcp] installing dependencies" >&2
  npm --prefix "$DIR" install --no-package-lock >&2
fi

NEEDS_BUILD=0
if [ ! -f "$DIR/dist/index.js" ]; then
  NEEDS_BUILD=1
elif find "$DIR/src" -type f -newer "$DIR/dist/index.js" | grep -q .; then
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" = "1" ]; then
  echo "[nu-aura-codex-mcp] building TypeScript" >&2
  npm --prefix "$DIR" run build >&2
fi

exec node "$DIR/dist/index.js"
