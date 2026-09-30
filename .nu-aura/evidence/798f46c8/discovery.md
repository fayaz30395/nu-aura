# DISCOVERY — 2026-09-30

Base commit: `798f46c8` (branch `main`)
Environment: local workstation (macOS), working tree DIRTY (uncommitted)
Method: repository inspection + `gh` CI history + live HTTP probes + git diff analysis

## Verified facts

| Fact | Evidence |
|---|---|
| Workflow integrity gate PASS | `node scripts/nu-aura-workflow-validate.mjs` → "9 statuses, 28 transitions. Matrix in sync." |
| main HEAD | `798f46c8` |
| Release branch ahead of main by 12 commits | `git log --oneline main..release/v339-security-remediation` |
| Live frontend reachable | GET https://hrms-frontend-vert.vercel.app → 200 (page content) |
| Production backend unreachable | GET https://nu-aura-backend.onrender.com/actuator/health → 404 |
| main "Security Scan" CI failing | `gh run list` run 36303355757, conclusion=failure (2026-09-27) |
| E2E isolated stack green on release branch | `gh run list` run 36219329597 (release/v339-security-remediation) = success (2026-09-26) |
| RBAC SEC-1 scope fix present in main | `git log -- JwtAuthenticationFilter.java` → `3bcb7f31` |
| Frontend generated client gitignored | `frontend/.gitignore:18: lib/generated/` |

## Working tree

Dirty: ~138 tracked modifications + 40 untracked entries (see working-tree-classification.md).
No commit/merge/rebase/reset/stash was performed.
