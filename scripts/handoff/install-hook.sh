#!/usr/bin/env bash
# Install the handoff pre-commit guard into .git/hooks/pre-commit.
#
# Behavior:
#   - No existing hook → write a minimal one that delegates to pre-commit-check.sh.
#   - Existing hook    → append the delegation line if not already present.
#   - --uninstall      → remove the delegation line; leaves the rest intact.
#
# Idempotent. Safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOKS_DIR="${REPO_ROOT}/.git/hooks"
HOOK="${HOOKS_DIR}/pre-commit"
DELEGATE_LINE='exec "$(git rev-parse --show-toplevel)/scripts/handoff/pre-commit-check.sh"'
MARKER='# >>> handoff bus pre-commit guard >>>'
END_MARKER='# <<< handoff bus pre-commit guard <<<'

UNINSTALL=0
[[ "${1:-}" == "--uninstall" ]] && UNINSTALL=1

if [[ ! -d "${HOOKS_DIR}" ]]; then
  echo "ERROR: ${HOOKS_DIR} does not exist — is this a git repo?" >&2
  exit 1
fi

if [[ ${UNINSTALL} -eq 1 ]]; then
  if [[ -f "${HOOK}" ]] && grep -Fq "${MARKER}" "${HOOK}"; then
    awk -v m="${MARKER}" -v e="${END_MARKER}" '
      $0 == m { skip = 1; next }
      $0 == e { skip = 0; next }
      !skip   { print }
    ' "${HOOK}" > "${HOOK}.tmp"
    mv "${HOOK}.tmp" "${HOOK}"
    chmod +x "${HOOK}"
    echo "uninstalled  ${HOOK}"
  else
    echo "no handoff guard found in ${HOOK}"
  fi
  exit 0
fi

snippet=$(cat <<EOF
${MARKER}
${DELEGATE_LINE} || exit \$?
${END_MARKER}
EOF
)

if [[ ! -f "${HOOK}" ]]; then
  cat > "${HOOK}" <<EOF
#!/usr/bin/env bash
set -e
${snippet}
EOF
  chmod +x "${HOOK}"
  echo "installed    ${HOOK}"
  exit 0
fi

if grep -Fq "${MARKER}" "${HOOK}"; then
  echo "already-installed  ${HOOK}"
  exit 0
fi

{
  echo
  echo "${snippet}"
} >> "${HOOK}"
chmod +x "${HOOK}"
echo "appended     ${HOOK}"
