#!/usr/bin/env bash
# Release a claim. Only the holder may release (use --force to override).
#
# Usage:
#   ./scripts/handoff/release.sh --file plan.md --agent claude [--force]

set -euo pipefail
# shellcheck source=./_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

FILE=""
AGENT=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)  FILE="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help)
      echo "Usage: $0 --file <name> --agent <name> [--force]" >&2; exit 0 ;;
    *) echo "ERROR: unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -z "${FILE}" || -z "${AGENT}" ]] && {
  echo "Usage: $0 --file <name> --agent <name> [--force]" >&2
  exit 2
}

handoff_validate_file  "${FILE}"
handoff_validate_agent "${AGENT}"

LOCK_PATH="$(handoff_lock_path "${FILE}")"

if [[ ! -f "${LOCK_PATH}" ]]; then
  echo "no-lock  ${FILE}"
  exit 0
fi

HOLDER="$(cat "${LOCK_PATH}")"
if [[ "${HOLDER}" != "${AGENT}" && ${FORCE} -ne 1 ]]; then
  echo "ERROR: ${FILE} is locked by '${HOLDER}', not '${AGENT}'. Pass --force to override." >&2
  exit 3
fi

rm -f "${LOCK_PATH}"
echo "released  ${FILE}  (was: ${HOLDER})"
