#!/usr/bin/env bash
# Compatibility wrapper for starting NU-AURA agent pipelines.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$REPO_ROOT/scripts/agents/start-work.sh" "$@"

