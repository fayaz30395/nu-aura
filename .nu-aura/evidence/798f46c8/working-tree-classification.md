# BLOCKER-005 — Working-tree / release reconciliation

Base: `main @ 798f46c8` (HEAD) · release branch: `release/v339-security-remediation @ 7d481ca3`
Method: `git log main..<branch>`, `git diff --stat <branch>`, `git status --short`
Safety: no commit/merge/rebase/reset/stash performed.

## Branch relationship

`release/v339-security-remediation` = `main` + 12 commits:

```
7d481ca3 fix(rbac): V337 grants LMS to MANAGER not HR_MANAGER; fix stale RLS test assumptions
a05ce45a fix(e2e): disambiguate Team Attendance heading locator
d4e316e8 fix(security): permission cache after-commit eviction + IDOR closures (C1)
18415677 ci(e2e): raise Node heap for the frontend build
e7cefc5d ci(e2e): disposable SMTP sink
d6261b2b fix(frontend): parse date-only strings as local midnight, not UTC
127042dc fix(rbac): V339 grants WORKFLOW:DEFINITION_VIEW to DEPARTMENT_MANAGER
38bed304 release: V337 + V338 candidate (B3 workflow authorization + LMS/RLS migration)
060dbd96 feat(security): WORKFLOW:DEFINITION_VIEW
355c7059 test(security): WorkflowControllerTest pinned the pre-B3 contract
9121ab88 fix(security): workflow definition reads require WORKFLOW:MANAGE
```

`d4e316e8` explicitly states it "adopts ... a concurrent session's remediation batch found in the
primary checkout's uncommitted working tree" — i.e. the release branch is the committed form of the
same security work that is currently uncommitted locally.

## Working-tree classification (working tree vs release branch)

`git diff --stat release/v339-security-remediation` → 147 files, +3054 / -5516.

| Category | Examples | Disposition |
|---|---|---|
| Security remediation (intended in RC) | SecurityService, SecurityContext, PermissionCacheEvictor, IDOR closures, new RBAC/IDOR tests | BELONGS IN RC. Note: diff shows small line deltas on `Permission.java` (-6) and `RoleHierarchy.java` (-10) and untracked `PermissionCacheEvictor.java`; working tree is not byte-identical to the branch — needs careful comparison before freezing. |
| Frontend product pages | ~110 `frontend/app/**/page.tsx` (2–48 line deltas), PermissionGate, usePermissions, date.ts | BELONGS IN RC (frontend fixes). |
| Migration V341 | `V341__forward_only_rls_correction_for_v331_and_v334.sql` (untracked, 178 lines) | BELONGS IN RC (DB); verify ordering vs branch (branch ships V337–V340). |
| CI config | `.github/workflows/e2e.yml`, `pr-validation.yml` | BELONGS IN RC. |
| Tooling | `scripts/package.json`, `scripts/nu-aura-workflow-validate.mjs(.test)`, `scripts/faylo-*.mjs`, `scripts/security/pre-commit-secret-scan.sh` | MIXED — orchestrator/tooling additions; classify before freeze. |
| Generated / machine-local (EXCLUDE from RC) | `.claude/helpers/*`, `.claude/proven-config.json`, `.swarm/*.db*`, `.swarm/state.json`, `.mcp.json`, `frontend/next-env.d.ts`, e2e snapshot PNGs | EXCLUDE. |
| Delivery-state / reports (EXCLUDE or separate commit) | `faylo-sdlc/**`, `qa-reports/**` | EXCLUDE from product RC. |
| Orchestrator state | `.kilo/`, `.nu-aura/` | EXCLUDE from product RC (governance artifacts). |

## Unknowns

- Whether the working tree's security edits are a superset, subset, or parallel version of the
  branch's `d4e316e8`. Small deltas on `Permission.java`/`RoleHierarchy.java` indicate they differ.
- Whether V341 is intended to supersede/augment V337–V340 on the branch (gap V338–V340 uncommitted
  locally vs present on branch).

Status: IN_PROGRESS. The release candidate is not yet deterministic.
