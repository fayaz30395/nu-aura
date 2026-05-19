#!/usr/bin/env bash
# Append a message to a handoff file.
#
# Usage:
#   ./scripts/handoff/append.sh --file plan.md --from claude --to codex \
#     [--re "subject"] [--body "body"]
#
# If --body is omitted, the body is read from stdin.
#
# Honors locks under docs/handoff/.locks/: if a different agent holds the lock,
# the append is refused.

set -euo pipefail
# shellcheck source=./_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

FILE=""
FROM=""
TO=""
RE=""
BODY=""
HAVE_BODY_FLAG=0

print_usage() {
  cat >&2 <<EOF
Usage: $0 --file <plan.md|audit-findings.md|diffs/NAME.md|followups/NAME.md>
          --from <agent> --to <agent>
          [--re <subject>] [--body <body> | <stdin>]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --to)   TO="$2"; shift 2 ;;
    --re)   RE="$2"; shift 2 ;;
    --body) BODY="$2"; HAVE_BODY_FLAG=1; shift 2 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "ERROR: unknown arg: $1" >&2; print_usage; exit 2 ;;
  esac
done

if [[ -z "${FILE}" || -z "${FROM}" || -z "${TO}" ]]; then
  print_usage
  exit 2
fi

handoff_validate_file  "${FILE}"
handoff_validate_agent "${FROM}"
handoff_validate_agent "${TO}"

TARGET="${HANDOFF_DIR}/${FILE}"
mkdir -p "$(dirname "${TARGET}")"

LOCK_PATH="$(handoff_lock_path "${FILE}")"
if [[ -f "${LOCK_PATH}" ]]; then
  HOLDER="$(cat "${LOCK_PATH}")"
  if [[ "${HOLDER}" != "${FROM}" ]]; then
    echo "ERROR: ${FILE} is locked by '${HOLDER}' — refusing append for '${FROM}'." >&2
    echo "       Wait for release, or coordinate via status.sh." >&2
    exit 3
  fi
fi

if [[ ${HAVE_BODY_FLAG} -eq 0 ]]; then
  if [[ -t 0 ]]; then
    echo "ERROR: --body not given and stdin is a terminal. Pipe body in or pass --body." >&2
    exit 2
  fi
  BODY="$(cat)"
fi

TS="$(handoff_utc_ts)"

{
  printf '\n## [%s] %s → %s\n' "${TS}" "${FROM}" "${TO}"
  if [[ -n "${RE}" ]]; then
    printf '**re:** %s\n' "${RE}"
  fi
  printf '\n%s\n\n---\n' "${BODY}"
} >> "${TARGET}"

LINES="$(wc -l < "${TARGET}" | tr -d ' ')"
echo "appended  ${FILE}  (${FROM} → ${TO}, ${LINES} lines total)"
