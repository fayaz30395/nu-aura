#!/usr/bin/env bash
# Claim a handoff file. Refuses if another agent already holds the lock.
#
# Usage:
#   ./scripts/handoff/claim.sh --file plan.md --agent claude

set -euo pipefail
# shellcheck source=./_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

FILE=""
AGENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)  FILE="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --file <name> --agent <name>" >&2; exit 0 ;;
    *) echo "ERROR: unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -z "${FILE}" || -z "${AGENT}" ]] && {
  echo "Usage: $0 --file <name> --agent <name>" >&2
  exit 2
}

handoff_validate_file  "${FILE}"
handoff_validate_agent "${AGENT}"

mkdir -p "${HANDOFF_LOCKS_DIR}"
LOCK_PATH="$(handoff_lock_path "${FILE}")"

if [[ -f "${LOCK_PATH}" ]]; then
  HOLDER="$(cat "${LOCK_PATH}")"
  if [[ "${HOLDER}" == "${AGENT}" ]]; then
    echo "already-claimed  ${FILE}  ${AGENT}"
    exit 0
  fi
  echo "ERROR: ${FILE} is locked by '${HOLDER}'." >&2
  exit 3
fi

# Atomic-ish: O_CREAT|O_EXCL via noclobber to avoid racing two claimers.
if ! (set -o noclobber; printf '%s\n' "${AGENT}" > "${LOCK_PATH}") 2>/dev/null; then
  HOLDER="$(cat "${LOCK_PATH}" 2>/dev/null || echo '?')"
  echo "ERROR: race — ${FILE} was just claimed by '${HOLDER}'." >&2
  exit 3
fi

echo "claimed  ${FILE}  ${AGENT}"
