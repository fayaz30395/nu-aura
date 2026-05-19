#!/usr/bin/env bash
# Show current state of the handoff bus: files, sizes, last messages, active locks.
#
# Usage:
#   ./scripts/handoff/status.sh         # full status
#   ./scripts/handoff/status.sh --short # one-line summary

set -euo pipefail
# shellcheck source=./_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

SHORT=0
[[ "${1:-}" == "--short" ]] && SHORT=1

if [[ ! -d "${HANDOFF_DIR}" ]]; then
  echo "no handoff dir at ${HANDOFF_DIR}" >&2
  exit 1
fi

count_messages() {
  local f="$1"
  [[ -f "$f" ]] || { echo 0; return; }
  # grep -c always prints a number to stdout (including 0); swallow the
  # nonzero exit from no-match so the count isn't duplicated.
  grep -c '^## \[' "$f" 2>/dev/null || true
}

last_message_header() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  grep '^## \[' "$f" 2>/dev/null | tail -1 || true
}

lock_count=0
if [[ -d "${HANDOFF_LOCKS_DIR}" ]]; then
  lock_count="$(find "${HANDOFF_LOCKS_DIR}" -maxdepth 1 -name '*.lock' -type f 2>/dev/null | wc -l | tr -d ' ')"
fi

if [[ ${SHORT} -eq 1 ]]; then
  plan_n="$(count_messages "${HANDOFF_DIR}/plan.md")"
  audit_n="$(count_messages "${HANDOFF_DIR}/audit-findings.md")"
  diffs_n=0
  followups_n=0
  [[ -d "${HANDOFF_DIR}/diffs" ]]     && diffs_n="$(find "${HANDOFF_DIR}/diffs"     -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
  [[ -d "${HANDOFF_DIR}/followups" ]] && followups_n="$(find "${HANDOFF_DIR}/followups" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
  printf 'plan=%s audit=%s diffs=%s followups=%s locks=%s\n' \
    "${plan_n}" "${audit_n}" "${diffs_n}" "${followups_n}" "${lock_count}"
  exit 0
fi

printf '== handoff bus: %s ==\n\n' "${HANDOFF_DIR}"

for f in plan.md audit-findings.md; do
  n="$(count_messages "${HANDOFF_DIR}/${f}")"
  last="$(last_message_header "${HANDOFF_DIR}/${f}")"
  if [[ -n "${last}" ]]; then
    printf '  %-22s %s msgs   last: %s\n' "${f}" "${n}" "${last#\#\# }"
  else
    printf '  %-22s %s msgs\n' "${f}" "${n}"
  fi
done

for d in diffs followups; do
  if [[ -d "${HANDOFF_DIR}/${d}" ]]; then
    printf '\n  %s/\n' "${d}"
    found=0
    for f in "${HANDOFF_DIR}/${d}"/*.md; do
      [[ -e "$f" ]] || continue
      found=1
      n="$(count_messages "$f")"
      last="$(last_message_header "$f")"
      base="$(basename "$f")"
      if [[ -n "${last}" ]]; then
        printf '    %-30s %s msgs   last: %s\n' "${base}" "${n}" "${last#\#\# }"
      else
        printf '    %-30s %s msgs\n' "${base}" "${n}"
      fi
    done
    [[ ${found} -eq 0 ]] && printf '    (empty)\n'
  fi
done

printf '\n  locks (%s):\n' "${lock_count}"
if [[ ${lock_count} -gt 0 ]]; then
  for lock in "${HANDOFF_LOCKS_DIR}"/*.lock; do
    [[ -e "${lock}" ]] || continue
    name="$(basename "${lock}" .lock | tr '_' '/')"
    holder="$(cat "${lock}")"
    printf '    %-30s held by %s\n' "${name}" "${holder}"
  done
else
  printf '    (none)\n'
fi
