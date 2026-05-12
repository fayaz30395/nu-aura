#!/usr/bin/env bash
# Verify the 4 NU-AURA-owned skills are present and well-formed.
#
# Checks (ignores framework-installed sibling dirs under .claude/skills/):
#   1. These 4 skills exist under .claude/skills/:
#        nu-chrome-e2e, nu-migration, nu-permission, skill-management
#   2. Each SKILL.md has YAML frontmatter with `name:` and `description:`
#   3. Each SKILL.md contains an `## Autonomy Contract` section
#
# Exit 0 on success, 1 on any failure (prints which check failed).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../skills" && pwd)"
EXPECTED=(nu-chrome-e2e nu-migration nu-permission skill-management)

fail=0

# Check 1: each required skill dir is present (extras permitted — framework-installed)
for s in "${EXPECTED[@]}"; do
  [ -d "$SKILLS_DIR/$s" ] || { echo "[FAIL] required skill dir missing: $s"; fail=1; }
done

# Check 2+3: per-skill frontmatter + autonomy contract
for s in "${EXPECTED[@]}"; do
  f="$SKILLS_DIR/$s/SKILL.md"
  if [ ! -f "$f" ]; then
    echo "[FAIL] $s: SKILL.md missing"
    fail=1; continue
  fi
  head -1 "$f" | grep -q '^---$' || { echo "[FAIL] $s: missing YAML frontmatter opener"; fail=1; }
  grep -q '^name: ' "$f"        || { echo "[FAIL] $s: missing name:";        fail=1; }
  grep -q '^description: ' "$f" || { echo "[FAIL] $s: missing description:"; fail=1; }
  grep -q '^## Autonomy Contract' "$f" || { echo "[FAIL] $s: missing ## Autonomy Contract"; fail=1; }
done

if [ "$fail" = "0" ]; then
  echo "[OK] 4/4 skills present with frontmatter + autonomy contract"
  exit 0
fi
exit 1
