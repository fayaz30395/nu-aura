#!/usr/bin/env bash
# Release-artifact guard. Run this immediately before any `railway up`, image build or
# release commit.
#
# Why this exists: on 2026-09-25 a second Claude Code session (ab8fb9e2-…), started as a
# read-only code review but holding write tools, edited nine files in the shared working
# tree WHILE a release was being built — including V331 and V334, two migrations that had
# already been applied to production. The release itself was unaffected only because it
# was built from an isolated clean worktree. Nothing structural prevented the alternative.
#
#   ./scripts/release-guard.sh
#
# Exit 0 = safe to build/commit/deploy from here. Any failure exits non-zero.
set -uo pipefail

FAILED=0
ok()   { printf '  OK    %s\n' "$1"; }
bad()  { printf '  FAIL  %s — %s\n' "$1" "$2"; FAILED=1; }

echo "Release guard: $(pwd)"

# 1. Must be an isolated worktree, never the primary checkout. `railway up` and docker
#    build upload the WORKING DIRECTORY, not a commit, so a shared dirty tree ships
#    whatever anyone else happens to be editing.
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)"
COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"
if [[ -z "$GIT_DIR" ]]; then
  bad "git repository" "not inside a git repository"
elif [[ "$GIT_DIR" == "$COMMON_DIR" ]]; then
  bad "isolated worktree" "this is the PRIMARY checkout. Build from 'git worktree add', \
where a concurrent session editing the main tree cannot reach the artifact"
else
  ok "isolated worktree (git-dir differs from git-common-dir)"
fi

# 2. Clean tree: what is committed must be exactly what ships.
DIRTY="$(git status --porcelain | grep -vc '^$' || true)"
[[ "$DIRTY" == "0" ]] && ok "working tree clean" \
    || bad "working tree clean" "${DIRTY} modified/untracked path(s); the artifact would not match HEAD"

# 3. Migrations already applied in production are immutable. Editing one makes the next
#    deploy fail Flyway validation — the V316 incident. These are the versions production
#    actually ran at Flyway head 336. MigrationRlsGuardTest asserts the same hashes, so a
#    build cannot pass with either file altered.
check_hash() { # $1 file, $2 expected 16-hex prefix
  local f="backend/src/main/resources/db/migration/$1"
  [[ -f "$f" ]] || { bad "$1 present" "missing"; return; }
  local h; h="$(shasum -a 256 "$f" | cut -c1-16)"
  [[ "$h" == "$2" ]] && ok "$1 unmodified" \
      || bad "$1 immutability" "sha256 prefix ${h} != ${2}; applied migrations must never be edited — use a new V33x+"
}
check_hash "V331__refresh_demo_password_expiry.sql"                  "b15710f205b4409c"
check_hash "V334__restore_employee_lms_enroll_and_certificate_grants.sql" "265cf97f543fdb00"

# 4. No secret material in the tree about to be uploaded.
if git ls-files | grep -qE '(^|/)\.env$|(^|/)\.env\.(production|local)$'; then
  bad "no committed env files" "a .env file is tracked and would be uploaded"
else
  ok "no tracked .env files"
fi

echo
[[ "$FAILED" -eq 0 ]] && { echo "RELEASE GUARD: PASS"; exit 0; }
echo "RELEASE GUARD: FAIL — do not build, commit or deploy from this tree"
exit 1
