#!/usr/bin/env bash
# Pre-commit guard: block staged changes to handoff message content.
#
# Allowed to be committed:
#   docs/handoff/README.md
#   docs/handoff/.gitignore
#   docs/handoff/**/.gitkeep
#
# Anything else under docs/handoff/ is message-bus content and must NOT be
# committed. This protects against `git add -f` and stale staging.
#
# Exit 0 = OK, exit 1 = blocked.

set -euo pipefail

# Files staged for this commit.
staged="$(git diff --cached --name-only --diff-filter=ACMRT 2>/dev/null || true)"

[[ -z "${staged}" ]] && exit 0

violations=()
while IFS= read -r path; do
  [[ -z "${path}" ]] && continue
  case "${path}" in
    docs/handoff/README.md|docs/handoff/.gitignore) ;;
    docs/handoff/*/.gitkeep) ;;
    docs/handoff/*)
      violations+=("${path}")
      ;;
  esac
done <<< "${staged}"

if (( ${#violations[@]} > 0 )); then
  {
    echo
    echo "blocked: refusing to commit handoff message content."
    echo "         the claude↔codex bus is ephemeral and must stay out of git."
    echo
    echo "  offending paths:"
    for p in "${violations[@]}"; do echo "    - ${p}"; done
    echo
    echo "  to fix:"
    echo "    git restore --staged docs/handoff/..."
    echo "    # then commit again."
    echo
    echo "  if you genuinely meant to add a file to the bus structure"
    echo "  (README, .gitignore, .gitkeep), update scripts/handoff/pre-commit-check.sh"
    echo "  to allow-list it."
    echo
  } >&2
  exit 1
fi

exit 0
