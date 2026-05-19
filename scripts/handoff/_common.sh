#!/usr/bin/env bash
# Shared helpers for handoff scripts.

set -euo pipefail

HANDOFF_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HANDOFF_DIR="${HANDOFF_REPO_ROOT}/docs/handoff"
HANDOFF_LOCKS_DIR="${HANDOFF_DIR}/.locks"

handoff_lock_path() {
  local rel="$1"
  printf '%s/%s.lock' "${HANDOFF_LOCKS_DIR}" "$(echo "${rel}" | tr '/' '_')"
}

handoff_validate_file() {
  local rel="$1"
  case "${rel}" in
    plan.md|audit-findings.md|diffs/*.md|followups/*.md) return 0 ;;
    *)
      echo "ERROR: '${rel}' is not a valid handoff path." >&2
      echo "       Allowed: plan.md, audit-findings.md, diffs/<name>.md, followups/<name>.md" >&2
      return 2
      ;;
  esac
}

handoff_validate_agent() {
  local agent="$1"
  if [[ -z "${agent}" || ! "${agent}" =~ ^[a-z0-9_-]+$ ]]; then
    echo "ERROR: agent name must be lowercase [a-z0-9_-]+ (got: '${agent}')" >&2
    return 2
  fi
}

handoff_utc_ts() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}
