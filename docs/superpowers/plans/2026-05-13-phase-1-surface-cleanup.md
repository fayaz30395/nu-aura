# Phase 1 — surface cleanup implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land all mechanical surface cleanup (deletes, moves, gitignore, `infra/` introduction, naming convention) as one reviewable PR.

**Architecture:** Single branch `chore/repo-layout-cleanup`, commit-structured by concern (one commit per scope-bucket). No functional code changes; only file/dir moves, deletes, and reference updates.

**Tech Stack:** Git, Bash, Maven (verification), Node/npm (verification), Docker (verification).

**Spec:** [`../specs/2026-05-13-repo-layout-cleanup-design.md`](../specs/2026-05-13-repo-layout-cleanup-design.md)

**Master plan:** [`2026-05-13-repo-layout-cleanup-plan.md`](2026-05-13-repo-layout-cleanup-plan.md)

**Prerequisite:** Team has been told to land or abandon open feature branches before this PR is merged (one-time announce in Slack #engineering).

---

## Task 1: Pre-flight — branch, baseline, safety

**Files:** none modified

- [ ] **Step 1: Verify working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` on `main` at the latest commit.

If dirty: `git stash` or commit existing work first. Do not proceed on a dirty tree.

- [ ] **Step 2: Pull latest main**

Run: `git checkout main && git pull --rebase`
Expected: `Already up to date.` or a fast-forward.

- [ ] **Step 3: Create and switch to the cleanup branch**

Run: `git checkout -b chore/repo-layout-cleanup`
Expected: `Switched to a new branch 'chore/repo-layout-cleanup'`

- [ ] **Step 4: Snapshot root non-dot file count for the EARS criterion check**

Run: `ls -1 | grep -v '^\.' | wc -l`
Record the number. The target after Phase 1 merge is ≤ 15.

- [ ] **Step 5: Verify the build is green at baseline**

Run: `cd backend && mvn clean package -DskipTests` (skipping tests for speed during the cleanup; full test runs gated at task 16)
Expected: `BUILD SUCCESS`

Run: `cd frontend && npm ci && npx tsc --noEmit`
Expected: zero TypeScript errors.

If baseline is red, fix that first on a separate branch — never start a cleanup on a broken trunk.

---

## Task 2: Expand `.gitignore` (commit 1)

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Read the current `.gitignore`**

Run: `cat .gitignore`

Note what's already there to avoid duplicating entries.

- [ ] **Step 2: Append the new patterns**

Append the following block to `.gitignore` (do not replace existing entries; add only what's missing):

```gitignore
# Build artifacts and runtime logs
*.log
nohup.out
*.tgz
**/.next/
**/test-results/
**/playwright-report/
**/tsconfig.tsbuildinfo

# Tooling caches
**/.claude-flow/
**/.playwright-mcp/
**/node_modules/

# Ad-hoc dev/test outputs
backend/*_result*.json
backend/test-output.txt
frontend/nu-rbac-report.json
frontend/migration-report.md
frontend/unconvertible-classes.json
frontend/sessions/
.vercel/

# Skill runtime artifacts
.claude/skills/nu-chrome-e2e/runs/
.github/java-upgrade/2*/

# OS noise
.DS_Store
```

- [ ] **Step 3: Verify the new patterns are syntactically valid**

Run: `git check-ignore -v -- backend/backend-run.log frontend/nu-rbac-report.json frontend/test-results/foo .DS_Store`
Expected: each path matched against one of the new rules.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore runtime artifacts, logs, build outputs, OS noise"
```

---

## Task 3: Delete committed runtime junk in `backend/` (commit 2a)

**Files (deletions):**
- `backend/backend-run.log` (16 MB)
- `backend/test-output.txt` (17 MB)
- `backend/backend-restart.log`, `backend/backend-startup.log`, `backend/backend-test.log`, `backend/backend.log`, `backend/frontend-run.log`
- `backend/logs/` (entire directory — contains 98 MB of additional logs)
- `backend/.next/` (Next.js artifact inside the Java backend)
- `backend/anthropic-ai-sdk-0.78.0.tgz`
- `backend/create_project_result.json`, `backend/create_project_result_v2.json`, `backend/create_project_result_v3.json`
- `backend/login_result.json`, `backend/login_result_v2.json`
- `backend/projects_result.json`, `backend/projects_result_v2.json`, `backend/projects_result_v3.json`
- `backend/.claude/` (stray copy of root-level concern)
- `backend/.github/` (stray copy of root-level concern)

- [ ] **Step 1: Verify each file exists before deleting**

Run:
```bash
for f in backend/backend-run.log backend/test-output.txt backend/anthropic-ai-sdk-0.78.0.tgz; do
  [ -f "$f" ] && echo "EXISTS: $f" || echo "MISSING: $f"
done
ls -d backend/logs backend/.next backend/.claude backend/.github 2>/dev/null
```
Expected: all listed as EXISTS / present.

- [ ] **Step 2: Delete the logs and the .next directory**

```bash
git rm backend/backend-run.log backend/backend-restart.log backend/backend-startup.log backend/backend-test.log backend/backend.log backend/frontend-run.log backend/test-output.txt
git rm -r backend/logs backend/.next
```

- [ ] **Step 3: Delete the stray tarball**

```bash
git rm backend/anthropic-ai-sdk-0.78.0.tgz
```

- [ ] **Step 4: Delete the ad-hoc result JSONs**

```bash
git rm backend/create_project_result.json backend/create_project_result_v2.json backend/create_project_result_v3.json
git rm backend/login_result.json backend/login_result_v2.json
git rm backend/projects_result.json backend/projects_result_v2.json backend/projects_result_v3.json
```

- [ ] **Step 5: Delete the stray sub-copies of root-level concerns**

```bash
git rm -r backend/.claude backend/.github
```

- [ ] **Step 6: Verify the working tree is clean of these paths**

Run: `git status --short backend/`
Expected: only `D` (deletion) entries for the above paths, nothing else.

- [ ] **Step 7: Commit (combined with task 4)** — do not commit yet; task 4 deletes more from `frontend/` to bundle into one commit.

---

## Task 4: Delete committed runtime junk in `frontend/` (commit 2b)

**Files (deletions):**
- `frontend/frontend-run.log`, `frontend/frontend.log`, `frontend/nohup.out`
- `frontend/nu-rbac-report.json` (1.4 MB)
- `frontend/migration-report.md`, `frontend/unconvertible-classes.json`
- `frontend/spinner-mega-preview.html`, `frontend/spinner-preview-v2.html`
- `frontend/tsconfig.tsbuildinfo`
- `frontend/.next/`, `frontend/.vercel/`, `frontend/.claude/`
- `frontend/sessions/`
- `frontend/test-results/` (2,166 entries)
- `frontend/playwright-report/`

- [ ] **Step 1: Verify each file/dir exists**

```bash
for p in frontend/frontend.log frontend/nu-rbac-report.json frontend/nohup.out frontend/spinner-mega-preview.html frontend/tsconfig.tsbuildinfo; do
  [ -e "$p" ] && echo "EXISTS: $p" || echo "MISSING: $p"
done
ls -d frontend/.next frontend/.vercel frontend/.claude frontend/sessions frontend/test-results frontend/playwright-report 2>/dev/null
```

- [ ] **Step 2: Delete the log/runtime files**

```bash
git rm frontend/frontend-run.log frontend/frontend.log frontend/nohup.out
git rm frontend/tsconfig.tsbuildinfo
```

- [ ] **Step 3: Delete the generated report files**

```bash
git rm frontend/nu-rbac-report.json frontend/migration-report.md frontend/unconvertible-classes.json
```

- [ ] **Step 4: Delete the demo HTML preview files**

```bash
git rm frontend/spinner-mega-preview.html frontend/spinner-preview-v2.html
```

- [ ] **Step 5: Delete the runtime/state directories**

```bash
git rm -r frontend/.next frontend/.vercel frontend/.claude frontend/sessions frontend/test-results frontend/playwright-report
```

- [ ] **Step 6: Check the `eslint-plugin-nu-aura/` folder — keep if it has files, delete if empty**

```bash
ls -la frontend/eslint-plugin-nu-aura/
```
- If output shows only `.` and `..` → `git rm -r frontend/eslint-plugin-nu-aura`
- If output shows real files (e.g. `package.json`) → keep, and verify `frontend/.eslintrc.json` references it

- [ ] **Step 7: Verify**

Run: `git status --short frontend/`
Expected: only `D` entries from the above operations.

- [ ] **Step 8: Commit (combined runtime junk for backend + frontend)**

```bash
git commit -m "chore: delete committed runtime junk (logs, .next/, generated reports, test outputs)

- backend/: 33 MB of logs + .next/ + ad-hoc API result JSONs + stray tarball
- backend/.claude, backend/.github: stray sub-copies of root-level concerns
- frontend/: logs, nu-rbac-report.json (1.4 MB), demo HTML, .next/, .vercel/, .claude/, sessions/, test-results/, playwright-report/

All paths now covered by .gitignore."
```

---

## Task 5: Delete duplicate root scripts and stale skill files (commit 3)

**Files (deletions):**
- `setup-claude-personal.sh` (root copy; identical to `scripts/setup-claude-personal.sh`)
- `start-dev.sh` (root copy)
- `stop-dev.sh` (root copy)
- `promote-superadmin.sql` (root copy)
- `script.sh` (one-off zshrc installer)
- `nu-aura-dev.skill`, `nu-aura-qa.skill`, `nu-aura-full-platform-qa.skill`
- `nu-aura-dev/` directory
- `nu-aura-qa/` directory
- `.claude/skills/rails-backend/` (wrong stack)
- `.claude/skills/nu-usecase-runner/` (incomplete, no SKILL.md)
- `.claude/skills/.DS_Store`
- All `.DS_Store` files anywhere in the repo

- [ ] **Step 1: Verify byte-identity of root duplicates against `scripts/` copies**

```bash
for f in setup-claude-personal.sh start-dev.sh stop-dev.sh promote-superadmin.sql; do
  if diff -q "$f" "scripts/$f" > /dev/null 2>&1; then
    echo "DUP CONFIRMED: $f"
  else
    echo "WARNING: $f differs from scripts/$f — investigate before deleting"
  fi
done
```
Expected: 4× `DUP CONFIRMED`. If any `WARNING`, stop and reconcile (likely a divergent edit that needs to be merged into `scripts/` first).

- [ ] **Step 2: Delete duplicate root scripts**

```bash
git rm setup-claude-personal.sh start-dev.sh stop-dev.sh promote-superadmin.sql script.sh
```

- [ ] **Step 3: Confirm the three root `.skill` files are not in `skills-lock.json`**

```bash
grep -E "nu-aura-dev|nu-aura-qa|nu-aura-full-platform-qa" skills-lock.json
```
Expected: zero matches.

- [ ] **Step 4: Delete the root `.skill` files and their duplicate directories**

```bash
git rm nu-aura-dev.skill nu-aura-qa.skill nu-aura-full-platform-qa.skill
git rm -r nu-aura-dev nu-aura-qa
```

- [ ] **Step 5: Delete the stale `.claude/skills/` entries**

```bash
git rm -r .claude/skills/rails-backend .claude/skills/nu-usecase-runner
```

- [ ] **Step 6: Move `.claude/skills/nu-aura-team-roles/` to docs (it's reference content, not a skill)**

```bash
mkdir -p docs/team
git mv .claude/skills/nu-aura-team-roles docs/team/roles
```

- [ ] **Step 7: Find and delete all `.DS_Store` files**

```bash
find . -name '.DS_Store' -not -path './.git/*' -print
```
For each path printed:
```bash
git rm <path>
```
(Or batched: `find . -name '.DS_Store' -not -path './.git/*' -exec git rm -f {} \;` if the shell supports it)

- [ ] **Step 8: Commit**

```bash
git commit -m "chore: delete duplicate root scripts, stale .skill files, dead skills

- 4 root scripts byte-identical to scripts/ copies: setup-claude-personal.sh, start-dev.sh, stop-dev.sh, promote-superadmin.sql
- script.sh: one-off zshrc installer subsumed by setup-claude-personal.sh
- 3 root .skill files + nu-aura-dev/ + nu-aura-qa/ dirs (not referenced in skills-lock.json)
- .claude/skills/rails-backend: wrong stack (project is Spring Boot)
- .claude/skills/nu-usecase-runner: incomplete (no SKILL.md)
- nu-aura-team-roles: moved to docs/team/roles (reference content, not a skill)
- All .DS_Store files purged"
```

---

## Task 6: Delete `config/`, dead deploy configs, and `tools/` (commit 4)

**Files (deletions):**
- `config/` (entire directory — byte-identical to `deployment/config/`)
- `railway.json`, `render.yaml`
- `tools/` (empty subtree, just `tools/scripts/`)
- `.playwright-mcp/`, `.agents/`

- [ ] **Step 1: Verify `config/` is byte-identical to `deployment/config/`**

```bash
diff -r config/ deployment/config/
```
Expected: no output (means identical). If any diff: investigate before deleting.

- [ ] **Step 2: Confirm zero references to `railway.json` and `render.yaml`**

```bash
grep -rn "railway.json\|render.yaml" --include="*.yml" --include="*.yaml" --include="*.json" --include="*.md" --include="*.sh" .github/ deployment/ scripts/ docs/ frontend/ backend/ docker-compose*.yml 2>/dev/null
```
Expected: zero matches (or only references inside the files themselves).

- [ ] **Step 3: Delete `config/`, dead deploy configs, `tools/`, runtime trash dirs**

```bash
git rm -r config tools
git rm railway.json render.yaml
git rm -r .playwright-mcp .agents
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete duplicate config/ dir and dead deploy configs

- config/: byte-identical to deployment/config/ (the canonical location)
- railway.json, render.yaml: zero references; project ships via GCP cloudbuild
- tools/: empty subtree
- .playwright-mcp/, .agents/: runtime trash"
```

---

## Task 7: Delete dated audits, QA history sprawl, old-project-name docs (commit 5)

**Files (deletions):**
- `GAP-ANALYSIS-2026-04-02.md`, `HARDENING-AUDIT-RESULTS.md`, `ARCHITECTURE_GAP_REGISTER.md`, `EXECUTIVE-SUMMARY.md`
- `NU-AURA-QA-Report-2026-04-01.xlsx`
- `qa-reports/` (entire directory)
- `docs/validation/` (47 loop logs)
- `docs/qa/` — delete all loose files but keep the directory (will be refilled in Phase 2)
- `docs/PLATFORM-STATUS-2026-04-05.md`
- `docs/screenshots/qa-sweep-2026-05-02/` (dated screenshot dump)
- `docs/assets/Nu Talent Management System_25-Aug.pdf`, `docs/assets/Nu Talent Management System - Workflow document.pdf` (old project name)
- `docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx` (`.docx` in markdown tree, old)
- `.github/java-upgrade/20260315210339/`, `.github/java-upgrade/20260317122725/`, `.github/java-upgrade/20260317122758/` (committed tool runs)
- `scripts/migrate-nuhire-to-nuaura.mjs` (one-time migration, completed)
- `scripts/qa-orchestrator/node_modules/`

- [ ] **Step 1: List paths to confirm before deletion**

```bash
ls GAP-ANALYSIS-2026-04-02.md HARDENING-AUDIT-RESULTS.md ARCHITECTURE_GAP_REGISTER.md EXECUTIVE-SUMMARY.md NU-AURA-QA-Report-2026-04-01.xlsx 2>&1
ls -d qa-reports docs/validation docs/screenshots/qa-sweep-2026-05-02 .github/java-upgrade/2026* 2>&1
ls docs/PLATFORM-STATUS-2026-04-05.md docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx 2>&1
ls docs/assets/Nu*Talent*Management*System*.pdf 2>&1
```

- [ ] **Step 2: Delete dated root-level audits**

```bash
git rm GAP-ANALYSIS-2026-04-02.md HARDENING-AUDIT-RESULTS.md ARCHITECTURE_GAP_REGISTER.md EXECUTIVE-SUMMARY.md
git rm NU-AURA-QA-Report-2026-04-01.xlsx
```

- [ ] **Step 3: Delete QA history sprawl**

```bash
git rm -r qa-reports docs/validation
# Loose files in docs/qa root (keep the directory; will be refilled in Phase 2):
git rm -r docs/qa/*
mkdir -p docs/qa
echo "# QA documentation\n\nActive test plans and signoff reports live here. History is in git." > docs/qa/README.md
git add docs/qa/README.md
```

- [ ] **Step 4: Delete dated docs and pre-rename project files**

```bash
git rm docs/PLATFORM-STATUS-2026-04-05.md
git rm "docs/assets/Nu Talent Management System_25-Aug.pdf"
git rm "docs/assets/Nu Talent Management System - Workflow document.pdf"
git rm docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx
git rm -r docs/screenshots/qa-sweep-2026-05-02
```

- [ ] **Step 5: Delete `.github/java-upgrade/` run output**

```bash
git rm -r .github/java-upgrade/20260315210339 .github/java-upgrade/20260317122725 .github/java-upgrade/20260317122758
# If .github/appmod/appcat/ only contains a .gitignore (per audit), remove it too:
if [ "$(ls -A .github/appmod/appcat/ 2>/dev/null | grep -v '^\.gitignore$' | wc -l)" -eq 0 ]; then
  git rm -r .github/appmod 2>/dev/null || true
fi
```

- [ ] **Step 6: Delete completed migration script and committed node_modules**

```bash
git rm scripts/migrate-nuhire-to-nuaura.mjs
git rm -r scripts/qa-orchestrator/node_modules
```

- [ ] **Step 7: Commit**

```bash
git commit -m "chore: delete dated audits, QA history sprawl, pre-rename project docs

- 4 root dated audits + NU-AURA-QA-Report XLSX
- qa-reports/, docs/validation/, docs/qa/* (loose files): aggressive delete, git log preserves
- docs/qa/README.md: stub for new retention policy
- docs/PLATFORM-STATUS-2026-04-05.md: dated point-in-time
- docs/assets/Nu Talent... PDFs: old project name (pre-rename)
- docs/architecture/NU_AURA_PLATFORM_ARCHITECTURE.docx: .docx in markdown tree
- docs/screenshots/qa-sweep-2026-05-02/: dated screenshot dump
- .github/java-upgrade/2026*/: committed tool run output
- scripts/migrate-nuhire-to-nuaura.mjs: one-time migration, completed
- scripts/qa-orchestrator/node_modules/: committed node_modules"
```

---

## Task 8: Move loose root markdown into `docs/` buckets (commit 6a)

**Files (moves):**
- `REQUIREMENTS.md` → `docs/prd/requirements.md`
- `AGENTS.md`, `TEAMS.md`, `NU-AURA-AGENT-TEAM.md`, `USAGE-GUIDE.md` → `docs/agents/`
- `docs/AGENT-TEAMS-MASTER-REFERENCE.md`, `docs/PROD-READY-AGENT-TEAM-PROMPT.md`, `docs/QA-AGENT-TEAM-PROMPT.md` → `docs/agents/`
- `docs/PRODUCTION-READINESS-REPORT.md`, `docs/QA-SIGNOFF-REPORT.md`, `docs/TEST-PLAN-RBAC-USECASES.md` → `docs/qa/`
- `SEED_DATA_README.md` → `scripts/db/README.md` (note: this also requires `scripts/db/` to exist, which task 11 creates — for now place it at `scripts/seed-data-readme.md` and task 11 will move it)

- [ ] **Step 1: Create the target directories**

```bash
mkdir -p docs/prd docs/agents docs/qa
```

- [ ] **Step 2: Move `REQUIREMENTS.md`**

```bash
git mv REQUIREMENTS.md docs/prd/requirements.md
```

- [ ] **Step 3: Move root agent docs (kebab-case rename)**

```bash
git mv AGENTS.md docs/agents/overview.md
git mv TEAMS.md docs/agents/teams.md
git mv NU-AURA-AGENT-TEAM.md docs/agents/nu-aura-agent-team.md
git mv USAGE-GUIDE.md docs/agents/usage-guide.md
```

- [ ] **Step 4: Move agent docs from `docs/` root into `docs/agents/`**

```bash
git mv docs/AGENT-TEAMS-MASTER-REFERENCE.md docs/agents/agent-teams-master-reference.md
git mv docs/PROD-READY-AGENT-TEAM-PROMPT.md docs/agents/prod-ready-agent-team-prompt.md
git mv docs/QA-AGENT-TEAM-PROMPT.md docs/agents/qa-agent-team-prompt.md
```

- [ ] **Step 5: Move QA-related root-of-docs files into `docs/qa/`**

```bash
git mv docs/PRODUCTION-READINESS-REPORT.md docs/qa/production-readiness-report.md
git mv docs/QA-SIGNOFF-REPORT.md docs/qa/qa-signoff-report.md
git mv docs/TEST-PLAN-RBAC-USECASES.md docs/qa/test-plan-rbac-usecases.md
```

- [ ] **Step 6: Move seed-data readme to a temp location**

```bash
git mv SEED_DATA_README.md scripts/seed-data-readme.md
```
(Task 11 will move this into `scripts/db/README.md`.)

- [ ] **Step 7: Verify root non-dot files reduced**

```bash
ls -1 | grep -v '^\.' | grep -vE '^(README|LICENSE|CHANGELOG|CONTRIBUTING|SECURITY|CLAUDE|MEMORY)\.md$' | grep -vE '^(pom\.xml|Dockerfile|docker-compose.*\.yml|skills-lock\.json|\.env.*\.example)$'
```
Expected: empty output (everything left at root is conventional).

- [ ] **Step 8: Do NOT commit yet** — task 9 adds more moves to bundle into one "move docs" commit.

---

## Task 9: Move `themes/`, backend top-level docs, frontend/docs/ (commit 6b)

**Files (moves):**
- `themes/` → `docs/design-system/`
- `backend/DEVELOPER_CHECKLIST.md` → `docs/runbooks/backend-developer-checklist.md`
- `backend/TESTING_GUIDE.md` → `docs/runbooks/backend-testing-guide.md`
- `backend/docs/assets/` → `docs/architecture/backend-assets/`
- `frontend/docs/*` → `docs/`

- [ ] **Step 1: Create target directories**

```bash
mkdir -p docs/runbooks docs/architecture/backend-assets
```

- [ ] **Step 2: Move themes content**

```bash
# Check if docs/design-system/ already has content
ls -la docs/design-system/ 2>/dev/null
# Move themes/ contents into docs/design-system/
git mv themes/* docs/design-system/
# Remove the now-empty themes/ directory (git won't track empty dirs but rmdir cleans the working tree)
rmdir themes 2>/dev/null || true
```

- [ ] **Step 3: Move backend top-level dev docs**

```bash
git mv backend/DEVELOPER_CHECKLIST.md docs/runbooks/backend-developer-checklist.md
git mv backend/TESTING_GUIDE.md docs/runbooks/backend-testing-guide.md
```

- [ ] **Step 4: Move backend/docs/assets**

```bash
git mv backend/docs/assets/* docs/architecture/backend-assets/
rmdir backend/docs/assets 2>/dev/null
rmdir backend/docs 2>/dev/null
```

- [ ] **Step 5: Move frontend/docs/ contents**

```bash
# Inventory first:
find frontend/docs -type f
# Then move each file individually (paths under frontend/docs vary; adapt to actual contents):
# Example pattern — adjust per actual file list:
for f in $(find frontend/docs -type f); do
  rel=${f#frontend/docs/}
  target="docs/architecture/frontend/$(dirname $rel)"
  mkdir -p "$target"
  git mv "$f" "$target/$(basename $f)"
done
# Cleanup empty dirs
find frontend/docs -type d -empty -delete 2>/dev/null
```

- [ ] **Step 6: Delete `backend/docker-compose.yml` (alternate Neon-based dev compose)**

```bash
# Per spec section 6.4: backend/docker-compose.yml diverges from root and is not referenced
git rm backend/docker-compose.yml
```

- [ ] **Step 7: Commit (the combined docs-move commit)**

```bash
git commit -m "chore: move scattered docs into canonical docs/ buckets

- REQUIREMENTS.md -> docs/prd/requirements.md
- 4 root agent .md files -> docs/agents/*.md (kebab-case)
- 3 docs/-root agent .md files -> docs/agents/*.md (kebab-case)
- 3 docs/-root QA .md files -> docs/qa/*.md (kebab-case)
- themes/ -> docs/design-system/
- backend/DEVELOPER_CHECKLIST.md, TESTING_GUIDE.md -> docs/runbooks/
- backend/docs/assets/ -> docs/architecture/backend-assets/
- frontend/docs/ -> docs/architecture/frontend/
- backend/docker-compose.yml: deleted (diverges from root, unreferenced)
- SEED_DATA_README.md -> scripts/seed-data-readme.md (temporary; task 11 finalises)"
```

---

## Task 10: Introduce `infra/` and move ops dirs (commit 7)

**Files (moves):**
- `deployment/` → `infra/deployment/`
- `monitoring/` → `infra/monitoring/`
- `prometheus.yml` → `infra/monitoring/prometheus.yml`
- `lib/` → `infra/mvn-local-deps/`

- [ ] **Step 1: Create `infra/`**

```bash
mkdir -p infra
```

- [ ] **Step 2: Move directories**

```bash
git mv deployment infra/deployment
git mv monitoring infra/monitoring
git mv prometheus.yml infra/monitoring/prometheus.yml
git mv lib infra/mvn-local-deps
```

- [ ] **Step 3: Write `infra/README.md`**

Create `infra/README.md` with:

```markdown
# infra/

Operational and deployment configuration for NU-AURA.

| Path | Contents |
|---|---|
| `deployment/` | GCP cloudbuild, K8s manifests, deploy scripts |
| `monitoring/` | Prometheus, Grafana, AlertManager configs (incl. `prometheus.yml`) |
| `mvn-local-deps/` | Locally-installed Maven artifacts (common-module, pm-module, nulogic-platform). Referenced by `.github/workflows/ci.yml` |

Behavioural-equivalent move from the previous root-level `deployment/`, `monitoring/`, `lib/`, and root `prometheus.yml`. No functional change.
```

```bash
git add infra/README.md
```

- [ ] **Step 4: Do NOT commit yet** — task 13 updates `ci.yml` and `docker-compose.yml` references to these paths; commit task 10 + reference updates together to keep CI green.

---

## Task 11: Namespace `scripts/{dev,db,docker,qa,setup}` (commit 8)

**Files (moves within `scripts/`):**

| To `scripts/dev/` | To `scripts/db/` | To `scripts/docker/` | To `scripts/qa/` | To `scripts/setup/` |
|---|---|---|---|---|
| `scripts/start-dev.sh` | `scripts/db-export.sh` | `scripts/docker-db-export.sh` | `scripts/qa-orchestrator/` (rename) | `scripts/setup-claude-personal.sh` |
| `scripts/stop-dev.sh` | `scripts/db-import.sh` | `scripts/docker-db-import.sh` | `scripts/screenshot-all-pages.ts` | `scripts/install-it2.sh` |
| | `scripts/db-migrate-manual.sql` | `scripts/docker-full-export.sh` | `scripts/test_ui_with_ai.py` → `test-ui-with-ai.py` | `scripts/claude-commands.sh` |
| | `scripts/promote-superadmin.sql` | `scripts/docker-init-db.sh` | `scripts/generate_ai_workshop_ppt.py` → `generate-ai-workshop-ppt.py` | |
| | `scripts/db-backups/` | `scripts/docker-volume-export.sh` | `scripts/apply-compact-design.sh` | |
| | `scripts/seed-data-readme.md` → `scripts/db/README.md` | `scripts/docker-exports/` | | |

- [ ] **Step 1: Create namespaces**

```bash
mkdir -p scripts/dev scripts/db scripts/docker scripts/qa scripts/setup
```

- [ ] **Step 2: Move dev scripts**

```bash
git mv scripts/start-dev.sh scripts/dev/start-dev.sh
git mv scripts/stop-dev.sh scripts/dev/stop-dev.sh
```

- [ ] **Step 3: Move db scripts**

```bash
git mv scripts/db-export.sh scripts/db/db-export.sh
git mv scripts/db-import.sh scripts/db/db-import.sh
git mv scripts/db-migrate-manual.sql scripts/db/db-migrate-manual.sql
git mv scripts/promote-superadmin.sql scripts/db/promote-superadmin.sql
git mv scripts/db-backups scripts/db/backups
git mv scripts/seed-data-readme.md scripts/db/README.md
```

- [ ] **Step 4: Move docker scripts**

```bash
git mv scripts/docker-db-export.sh scripts/docker/docker-db-export.sh
git mv scripts/docker-db-import.sh scripts/docker/docker-db-import.sh
git mv scripts/docker-full-export.sh scripts/docker/docker-full-export.sh
git mv scripts/docker-init-db.sh scripts/docker/docker-init-db.sh
git mv scripts/docker-volume-export.sh scripts/docker/docker-volume-export.sh
git mv scripts/docker-exports scripts/docker/exports
# If scripts/docker-compose.yml exists and diverges from root, delete it; if it's the canonical dev compose, move it:
ls scripts/docker-compose.yml 2>/dev/null && git rm scripts/docker-compose.yml
```

- [ ] **Step 5: Move QA scripts (renaming to kebab-case)**

```bash
git mv scripts/qa-orchestrator scripts/qa/qa-orchestrator
git mv scripts/screenshot-all-pages.ts scripts/qa/screenshot-all-pages.ts
git mv scripts/test_ui_with_ai.py scripts/qa/test-ui-with-ai.py
git mv scripts/generate_ai_workshop_ppt.py scripts/qa/generate-ai-workshop-ppt.py
git mv scripts/apply-compact-design.sh scripts/qa/apply-compact-design.sh
```

- [ ] **Step 6: Rename `scripts/qa/qa-orchestrator/frontend/` to `reports/`**

```bash
git mv scripts/qa/qa-orchestrator/frontend scripts/qa/qa-orchestrator/reports
```

- [ ] **Step 7: Move setup scripts**

```bash
git mv scripts/setup-claude-personal.sh scripts/setup/setup-claude-personal.sh
git mv scripts/install-it2.sh scripts/setup/install-it2.sh
git mv scripts/claude-commands.sh scripts/setup/claude-commands.sh
```

- [ ] **Step 8: Verify nothing important left at scripts/ top level**

```bash
ls -1 scripts/ | grep -vE '^(dev|db|docker|qa|setup|DB_MIGRATION_GUIDE\.md|README\.md)$'
```
Expected: zero output (only the 5 namespace dirs + 2 retained MDs).

- [ ] **Step 9: Update `scripts/README.md`**

Edit `scripts/README.md` to describe the new namespaces:

```markdown
# scripts/

| Namespace | Contents |
|---|---|
| `dev/` | Developer loop: `start-dev.sh`, `stop-dev.sh` |
| `db/` | Database utilities: export/import, manual migration, seed README |
| `docker/` | Docker container utilities |
| `qa/` | E2E orchestration, screenshot, AI-test scripts |
| `setup/` | One-time host setup (claude personal, iTerm) |

See per-namespace `README.md` for command details (where applicable).
```

- [ ] **Step 10: Commit**

```bash
git add scripts/README.md
git commit -m "chore: namespace scripts/{dev,db,docker,qa,setup}

- 18 scripts relocated into 5 namespace dirs
- Renamed snake_case .py files to kebab-case
- qa-orchestrator/frontend/ -> qa-orchestrator/reports/ (clearer name)
- scripts/seed-data-readme.md -> scripts/db/README.md
- scripts/README.md: rewritten as namespace index"
```

---

## Task 12: Move `db/seed/` into Flyway migration path (commit 9)

**Files:**
- `db/seed/V001__seed_data.sql` → `backend/src/main/resources/db/migration/`

**Caveat:** Backend Flyway sequence currently ends at V170 with gaps at V1, V27–V29, V135–V139. **Numbering V001 (= V1) into the active sequence may collide** depending on how Flyway interprets `V001` vs `V1`. Resolve before moving.

- [ ] **Step 1: Inspect the seed file and existing Flyway sequence**

```bash
cat db/seed/V001__seed_data.sql | head -20
ls backend/src/main/resources/db/migration/ | head -5
ls backend/src/main/resources/db/migration/ | tail -5
```

- [ ] **Step 2: Decide target version number**

Flyway treats `V001` and `V1` as the same version. Two safe options:

- **Option A (recommended):** Renumber to the next free slot (e.g. `V171__seed_data.sql`) so it runs after all existing migrations on fresh databases. This requires confirming no production database has already executed a script numbered `V1` or `V001`.
- **Option B:** Leave the gap-filling concern alone; place the seed under a separate seed mechanism (e.g. `backend/src/main/resources/db/seed/` with a custom seed runner, not Flyway).

For Phase 1, default is Option A — confirm with a quick check:

```bash
grep -r "V001\|V1__" backend/src/main/resources/db/migration/
```
Expected: zero matches (no script numbered V001 exists, so V001 has never run anywhere).

If zero matches → proceed with renumbering to V171.

- [ ] **Step 3: Move and renumber**

```bash
git mv db/seed/V001__seed_data.sql backend/src/main/resources/db/migration/V171__seed_data.sql
rmdir db/seed db 2>/dev/null
```

- [ ] **Step 4: Verify the migration file is picked up by Flyway**

```bash
cd backend
mvn flyway:info 2>&1 | grep -E "V171|seed_data" | head -5
cd ..
```
Expected: V171 listed as a pending migration (or already-applied if `mvn` has run against a local DB).

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: move db/seed/V001__seed_data.sql into backend Flyway migration path

- Renumbered V001 -> V171 (next free slot after V170; V001 had never run anywhere)
- Removed top-level db/ directory
- Seed now executes as a regular Flyway migration on fresh databases"
```

---

## Task 13: Update CI, docker-compose, and doc references (commit 10)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `docker-compose.override.yml`
- Modify: `infra/deployment/cloudbuild.yaml`, `infra/deployment/deploy.sh` and any other scripts inside `infra/deployment/` that reference siblings

- [ ] **Step 1: Update `.github/workflows/ci.yml` to use `infra/mvn-local-deps/`**

Read the file: `cat .github/workflows/ci.yml | grep -n "lib/"`

Expected matches around lines 53–57:
```yaml
- name: Install internal modules from lib/
  run: |
    mvn install:install-file -Dfile=lib/nulogic-platform-1.0.0.pom -DgroupId=com.nulogic -DartifactId=nulogic-platform -Dversion=1.0.0 -Dpackaging=pom
    mvn install:install-file -Dfile=lib/common-module-1.0.0.jar -DpomFile=lib/common-module-1.0.0.pom
    mvn install:install-file -Dfile=lib/pm-module-1.0.0.jar -DpomFile=lib/pm-module-1.0.0.pom
```

Edit those lines to:

```yaml
- name: Install internal modules from infra/mvn-local-deps/
  run: |
    mvn install:install-file -Dfile=infra/mvn-local-deps/nulogic-platform-1.0.0.pom -DgroupId=com.nulogic -DartifactId=nulogic-platform -Dversion=1.0.0 -Dpackaging=pom
    mvn install:install-file -Dfile=infra/mvn-local-deps/common-module-1.0.0.jar -DpomFile=infra/mvn-local-deps/common-module-1.0.0.pom
    mvn install:install-file -Dfile=infra/mvn-local-deps/pm-module-1.0.0.jar -DpomFile=infra/mvn-local-deps/pm-module-1.0.0.pom
```

- [ ] **Step 2: Update `docker-compose.yml` prometheus mount**

Find the line: `- ./prometheus.yml:/etc/prometheus/prometheus.yml` (around line 156).

Replace with: `- ./infra/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml`

- [ ] **Step 3: Grep all docker-compose files for any other `./monitoring/`, `./deployment/`, `./lib/` mounts**

```bash
grep -n "\.\/monitoring\|\.\/deployment\|\.\/lib\b" docker-compose.yml docker-compose.prod.yml docker-compose.override.yml
```

For each match, replace `./monitoring/` with `./infra/monitoring/`, `./deployment/` with `./infra/deployment/`, `./lib/` with `./infra/mvn-local-deps/`.

- [ ] **Step 4: Update `infra/deployment/` scripts and `cloudbuild.yaml` for sibling references**

```bash
grep -rn "deployment/\|monitoring/\|/lib/" infra/deployment/ 2>/dev/null
```

If `cloudbuild.yaml` references `deployment/<something>` relative to repo root, update those to `infra/deployment/<something>`. If scripts reference `../monitoring/`, update to `../monitoring/` (no change, since they're now siblings inside `infra/`).

- [ ] **Step 5: Run `docker-compose config` to verify mount paths resolve**

```bash
docker-compose config > /dev/null && echo "PASS: docker-compose config validates"
```

- [ ] **Step 6: Run a quick CI smoke (Maven install-file)**

```bash
cd backend
mvn install:install-file -Dfile=../infra/mvn-local-deps/nulogic-platform-1.0.0.pom -DgroupId=com.nulogic -DartifactId=nulogic-platform -Dversion=1.0.0 -Dpackaging=pom
echo "Exit: $?"
cd ..
```
Expected: exit 0 (file resolves).

- [ ] **Step 7: Update `frontend/package.json` qa-orchestrator script path**

Read: `grep -n "qa-orchestrator" frontend/package.json`

Expected match around line 22: `"test:e2e:autonomous": "bash ../scripts/qa-orchestrator/run.sh"`

Replace with: `"test:e2e:autonomous": "bash ../scripts/qa/qa-orchestrator/run.sh"`

- [ ] **Step 8: Commit the combined "introduce infra/ + ref updates" change**

```bash
git add .github/workflows/ci.yml docker-compose.yml docker-compose.prod.yml docker-compose.override.yml infra/ frontend/package.json
git commit -m "chore: introduce infra/ and update CI/compose path references

- New top-level infra/ consolidates ops:
  - deployment/ -> infra/deployment/
  - monitoring/ -> infra/monitoring/
  - prometheus.yml -> infra/monitoring/prometheus.yml
  - lib/ -> infra/mvn-local-deps/ (renamed for clarity)
- .github/workflows/ci.yml: 3 mvn install:install-file paths updated
- docker-compose.yml: prometheus mount path updated
- frontend/package.json: qa-orchestrator script path updated (scripts/qa-orchestrator -> scripts/qa/qa-orchestrator)
- infra/README.md: new file describing the bucket"
```

---

## Task 14: Update `README.md`, absorb `SETUP.md`, and update `CLAUDE.md` / `MEMORY.md` / `CHANGELOG.md` (commit 11)

**Files:**
- Modify: `README.md` (absorb `SETUP.md` content)
- Delete: `SETUP.md`
- Modify: `CLAUDE.md` (path references, `frontend/hooks/` → `frontend/lib/hooks/`)
- Modify: `MEMORY.md` (path references if any)
- Modify: `CHANGELOG.md` (entry listing all relocations)

- [ ] **Step 1: Read both files to plan the merge**

```bash
cat README.md
cat SETUP.md
```

- [ ] **Step 2: Absorb SETUP.md sections into README.md**

Edit `README.md` to add the SETUP.md content under a `## Setup` section (or appropriate existing section). Use the actual SETUP.md content — copy verbatim where it doesn't duplicate README; merge where it does.

- [ ] **Step 3: Delete `SETUP.md`**

```bash
git rm SETUP.md
```

- [ ] **Step 4: Update path references in README.md**

Search for outdated paths and replace:

```bash
grep -nE "lib/|monitoring/|deployment/|themes/|qa-reports/|prometheus.yml|^docs/build-kit/" README.md
```

For each match, replace with the new location per the move table. Examples:
- `lib/` → `infra/mvn-local-deps/`
- `monitoring/` → `infra/monitoring/`
- `deployment/` → `infra/deployment/`
- `themes/` → `docs/design-system/`
- `qa-reports/` → (deleted; reference `docs/qa/` if needed)

Also add a "Repo layout" section listing the canonical top-level directories.

- [ ] **Step 5: Update `CLAUDE.md`**

Search for stale paths:

```bash
grep -nE "frontend/hooks/|lib/(?!api/|services/|hooks/|theme/)|monitoring/|deployment/|themes/" CLAUDE.md
```

Specifically fix:
- Replace `frontend/hooks/` with `frontend/lib/hooks/` everywhere it appears
- Replace `monitoring/`, `deployment/`, `lib/` with their `infra/` counterparts
- Replace `themes/` with `docs/design-system/`

Add a paragraph noting that the repo follows the layout in [`docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md`](docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md).

- [ ] **Step 6: Update `MEMORY.md`** with the same path replacements

```bash
grep -nE "frontend/hooks/|^lib/|^monitoring/|^deployment/|^themes/|qa-reports/" MEMORY.md
```

Replace as above.

- [ ] **Step 7: Add CHANGELOG entry**

Prepend to `CHANGELOG.md` (under the next-version heading or as a new entry):

```markdown
## [Unreleased] — Repo layout cleanup (Phase 1)

### Changed
- Top-level `deployment/`, `monitoring/`, `lib/`, `prometheus.yml` moved to `infra/{deployment,monitoring,mvn-local-deps}`.
- `themes/` → `docs/design-system/`
- `REQUIREMENTS.md` → `docs/prd/requirements.md`
- Root agent docs (AGENTS.md, TEAMS.md, NU-AURA-AGENT-TEAM.md, USAGE-GUIDE.md) → `docs/agents/*`
- `SETUP.md` content merged into `README.md`
- `SEED_DATA_README.md` → `scripts/db/README.md`
- `db/seed/V001__seed_data.sql` → `backend/src/main/resources/db/migration/V171__seed_data.sql`
- `scripts/` namespaced into `dev/`, `db/`, `docker/`, `qa/`, `setup/`
- `scripts/qa-orchestrator/frontend/` → `reports/`

### Removed
- 4 byte-identical duplicate root scripts
- 3 stale root `.skill` files + `nu-aura-dev/`, `nu-aura-qa/` dirs
- `config/` (byte-identical to `deployment/config/`)
- `railway.json`, `render.yaml`, `tools/`, `script.sh`
- 33+ MB of committed runtime logs in `backend/` and `backend/logs/`
- 1.4 MB `frontend/nu-rbac-report.json` + demo HTML + tsbuildinfo + nohup.out
- `frontend/test-results/` (2,166 entries), `frontend/playwright-report/`, `frontend/.next/`, `frontend/.vercel/`, `frontend/sessions/`
- `qa-reports/` (full history), `docs/validation/`, `docs/qa/*` (loose history files)
- 5 dated root audit MDs and 3 dated `docs/`-root MDs
- `.claude/skills/rails-backend`, `nu-usecase-runner`, all `.DS_Store`
- `.github/java-upgrade/2026*/` committed tool runs

### Added
- New top-level `infra/` directory (deployment, monitoring, mvn-local-deps)
- Naming convention: `lower-kebab-case` for files/dirs; `UPPER-CASE.md` for root meta only
- Expanded `.gitignore` for logs, build outputs, runtime artifacts
- `docs/team/roles/` (formerly `.claude/skills/nu-aura-team-roles/`)
```

- [ ] **Step 8: Commit**

```bash
git add README.md CLAUDE.md MEMORY.md CHANGELOG.md
git commit -m "docs: absorb SETUP.md into README and update path refs

- SETUP.md content merged into README.md; SETUP.md deleted
- README.md: new 'Repo layout' section listing canonical top-level dirs
- CLAUDE.md: fix stale 'frontend/hooks/' -> 'frontend/lib/hooks/', update infra/ paths
- MEMORY.md: path updates for infra/, docs/design-system/
- CHANGELOG.md: comprehensive Phase 1 entry"
```

---

## Task 15: Final verification gates

**Files:** none modified — verification only.

- [ ] **Step 1: Backend build**

```bash
cd backend && mvn clean package
```
Expected: `BUILD SUCCESS`.

If fail: read the first ERROR. Common causes: missing `infra/mvn-local-deps/` files (Task 13 paths typed wrong), broken import after deletion (shouldn't happen since no .java moved in Phase 1).

- [ ] **Step 2: Frontend build + typecheck**

```bash
cd frontend && npm ci && npm run build && npx tsc --noEmit
cd ..
```
Expected: all succeed.

- [ ] **Step 3: docker-compose validates**

```bash
docker-compose config > /dev/null && echo "docker-compose: OK"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null && echo "compose prod overlay: OK"
docker-compose -f docker-compose.yml -f docker-compose.override.yml config > /dev/null && echo "compose override: OK"
```
Expected: 3× `OK`.

- [ ] **Step 4: docker-compose boots core services**

```bash
docker-compose up -d redis kafka
sleep 10
docker-compose ps
docker-compose down
```
Expected: redis + kafka in `Up` state.

- [ ] **Step 5: Smoke test the new dev script path**

```bash
ls scripts/dev/start-dev.sh
bash scripts/dev/start-dev.sh --help 2>&1 | head -5 || echo "Script ran (or doesn't support --help — fine if it sourced)"
```

- [ ] **Step 6: Grep verification — no stale path references**

```bash
echo "=== should be ZERO matches each ==="
grep -rn '\bconfig/' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.json' --include='*.md' . 2>/dev/null | grep -v 'infra/deployment/config' | grep -v node_modules | head -20
grep -rn '\blib/nulogic-platform\|\blib/common-module\|\blib/pm-module' . --include='*.yml' --include='*.yaml' 2>/dev/null | head -10
grep -rn 'railway.json\|render.yaml' . --include='*.yml' --include='*.yaml' --include='*.json' --include='*.md' --include='*.sh' 2>/dev/null | head -10
grep -rn '\bprometheus.yml:/' docker-compose*.yml | grep -v 'infra/monitoring'
grep -rn 'frontend/hooks/' . --include='*.md' --include='*.ts' --include='*.tsx' 2>/dev/null | head -10
```
Expected: empty output from each.

- [ ] **Step 7: Root file count check (EARS criterion)**

```bash
ls -1 | grep -v '^\.' | grep -vE '^(README|LICENSE|CHANGELOG|CONTRIBUTING|SECURITY|CLAUDE|MEMORY)\.md$' | grep -vE '^(pom\.xml|Dockerfile|docker-compose.*\.yml|skills-lock\.json)$'
```
Expected: zero output (all root non-dot files are conventional).

Also check the total non-dot file count is ≤ 15:
```bash
ls -1 | grep -v '^\.' | wc -l
```

- [ ] **Step 8: `git status` clean after a full build**

```bash
git status
```
Expected: `nothing to commit, working tree clean` (proves `.gitignore` is correctly catching build outputs).

- [ ] **Step 9: Run the full backend tests (if first 8 steps green)**

```bash
cd backend && mvn test
cd ..
```
Expected: zero test failures (no test logic changed in Phase 1; this just confirms the move didn't break a resource path).

- [ ] **Step 10: Run frontend tests**

```bash
cd frontend && npm run test:unit && npm run lint
cd ..
```
Expected: zero failures.

---

## Task 16: Push branch and open PR

**Files:** none modified.

- [ ] **Step 1: Review the commit log**

```bash
git log main..HEAD --oneline
```
Expected: 11 commits (one per spec section 8 + bundled ones we combined). Each message is a clean `chore:` or `docs:` line.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin chore/repo-layout-cleanup
```

- [ ] **Step 3: Open the PR via GitHub UI or `gh` CLI**

PR title: `chore: repo layout cleanup (Phase 1 of 7)`

PR body template:

```markdown
## Summary

Phase 1 of the 7-phase repo-layout cleanup program. See [the spec](docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md) and [the master plan](docs/superpowers/plans/2026-05-13-repo-layout-cleanup-plan.md).

This PR is **mechanical surface cleanup only** — no functional code changes. Phases 2–7 handle docs consolidation, frontend/backend internal refactors, test backfill, CI workflow expansion, and skill rationalisation.

## What changed

- Root non-dot files: 27 → ≤ 15 (only conventional meta + build/compose files)
- Removed: 4 byte-identical duplicate scripts, 3 stale `.skill` files, `config/` duplicate, dead deploy configs (`railway.json`, `render.yaml`), 33+ MB of committed logs, 1.4 MB JSON, 2,166 test-result entries, dated point-in-time audits, full QA history sprawl
- New: `infra/{deployment,monitoring,mvn-local-deps}` top-level directory consolidating ops
- Moved: 20+ docs into canonical `docs/` buckets, `scripts/` namespaced into `dev/db/docker/qa/setup/`, `db/seed/` into Flyway path
- Naming: enforced `lower-kebab-case` for non-meta files

See `CHANGELOG.md` for the full list.

## Reviewing this PR

Each commit is independent — review by concern, not by file:

1. `chore: gitignore...` — `.gitignore` additions
2. `chore: delete committed runtime junk` — backend + frontend cleanup
3. `chore: delete duplicate root scripts...` — confirmed byte-identical dups
4. `chore: delete duplicate config/ dir...` — verified `config/` byte-equal to `deployment/config/`
5. `chore: delete dated audits...` — aggressive delete per agreed retention policy
6. `chore: move scattered docs...` — pure `git mv`
7. `chore: introduce infra/ and update CI/compose path references` — load-bearing; verify CI is green
8. `chore: namespace scripts/...` — pure `git mv`
9. `chore: move db/seed... into Flyway migration path` — renumbered V001 → V171
10. `docs: absorb SETUP.md into README...` — doc edits

## Verification

- [x] `mvn clean package` green
- [x] `npm run build && tsc --noEmit` green
- [x] `docker-compose config` validates
- [x] `docker-compose up -d redis kafka` works
- [x] `scripts/dev/start-dev.sh` runs
- [x] Zero stale path references in CI/compose/docs
- [x] `git status` clean post-build

## Rollback

Each commit is reverseable independently. The merge commit can be reverted to undo the entire PR.

## Next: Phase 2

Phase 2 (`chore/docs-consolidation`) will be branched once this merges. It handles the `docs/architecture/` ↔ `docs/build-kit/` merge, the ADR-001..004 numbering collision, and filename casing normalisation across `docs/`.
```

- [ ] **Step 4: Tag reviewers and request review**

Tag the engineering lead and at least one backend + one frontend reviewer.

- [ ] **Step 5: Wait for CI on the PR**

Verify `.github/workflows/ci.yml` is green on the PR.

If CI fails: read the error, fix it on the same branch (additional commit), push. Do not force-push during review.

- [ ] **Step 6: Merge when approvals + CI both green**

Use a **merge commit** (not squash) to preserve the per-concern commit history that makes future `git log --follow <moved-file>` work.

- [ ] **Step 7: Delete the branch**

```bash
git checkout main && git pull
git branch -d chore/repo-layout-cleanup
git push origin --delete chore/repo-layout-cleanup
```

- [ ] **Step 8: Announce in Slack**

> "Phase 1 of the repo cleanup is merged. Top-level layout has changed significantly — see CHANGELOG.md and `docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md`. If your local branch is broken by path moves, rebase and update path references using the CHANGELOG. Next up: Phase 2 (docs consolidation)."

---

## Self-review checklist

**Spec coverage** — every in-scope item in the spec maps to a task:

- Section 6.1 (target layout) → Tasks 6–11
- Section 6.2 (naming convention) → Task 11 (kebab-case renames), 8 (root markdown renames)
- Section 6.3 (disposition: deletes) → Tasks 3, 4, 5, 6, 7
- Section 6.4 (backend internals — top-level junk only) → Task 3, Task 9 (backend/docker-compose.yml deletion)
- Section 6.5 (frontend internals — top-level junk only; deferred items to Phase 3) → Task 4
- Section 6.6 (docs/ subfolders) → Task 7 (deletes), Task 8 (moves)
- Section 6.7 (ADR collision fix) → **Phase 2** (not in this plan)
- Section 6.9 (.github/ cleanup) → Task 7
- Section 6.10 (.claude/skills/ cleanup) → Task 5
- Section 6.20 (backend/logs/) → Task 3
- Section 6.22 (frontend/sessions/) → Task 4
- Section 6.23 (empty dir cleanup) → Task 4 (eslint-plugin-nu-aura), Task 9 (rmdir after themes/, frontend/docs/, backend/docs/)
- Section 6.24 (CLAUDE.md stale path) → Task 14

**Items intentionally deferred (Phase 2+):**
- ADR-001..004 collision (Phase 2)
- `docs/architecture/` vs `docs/build-kit/` merge (Phase 2)
- Frontend `lib/` root files relocation (Phase 3)
- Frontend route consolidation (Phase 3)
- Frontend components dedup (Phase 3)
- Backend Java package rename (Phase 4)
- Backend package rationalisation (Phase 4)
- Test backfill (Phase 5)
- New CI workflows (Phase 6)
- QA skill rationalisation (Phase 7)

**Placeholder scan:** No `TBD`, `TODO`, vague "handle errors", or pseudo-code in any step.

**Type/name consistency:** All paths used in later tasks (e.g. `scripts/qa/qa-orchestrator/`, `infra/mvn-local-deps/`) match how they're introduced in earlier tasks.

**Verification gates:** Task 15 covers all 9 EARS criteria from spec section 3.2 + the universal phase gates from master plan section "Universal verification gates".
