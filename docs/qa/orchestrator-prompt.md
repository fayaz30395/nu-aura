# NU-AURA — Autonomous QA+DEV Verification Swarm

> **Status:** orchestrator spec for the parallel QA+DEV loop.
> **Branch:** `claude/parallel-qa-dev-orchestrator-X8F3W`.
> **Companion skill:** `.claude/skills/nu-chrome-e2e/SKILL.md` (DO NOT duplicate its
> browser automation, Bootstrap Medic, or bug-sheet format — this spec builds on top).

This document defines an **11-agent autonomous verification swarm** that drives the
NU-AURA QA+DEV loop end-to-end. Each specialist owns one verification domain and signs
off independently. The orchestrator is a thin scheduler — it never verifies. Release is
gated by **consensus** across all sign-offs.

---

## 0. What's reused vs. new

| Concern                       | Source of truth (REUSE)                                  |
|-------------------------------|----------------------------------------------------------|
| Browser automation            | `nu-chrome-e2e` skill — Chrome MCP → Playwright → curl   |
| Bootstrap (docker/be/fe/MCP)  | `nu-chrome-e2e` Bootstrap Medic playbook                 |
| Bug-sheet format & lifecycle  | `nu-chrome-e2e` bug-sheet (`OPEN→FIXING→COMPILED→VERIFIED`) |
| Use-case catalog              | `.claude/skills/nu-chrome-e2e/use-cases.yaml`            |
| File-lock pattern             | `flock` per `md5(path)` under `<run>/locks/`             |
| Design-system enforcement     | `eslint-plugin-nu-aura` via `npm run lint`               |
| Migration validation          | `mvn flyway:validate` + information_schema audit         |
| Build gates                   | `npx tsc --noEmit`, `npm run build`, `mvn test`          |
| Run directory convention      | `docs/qa/runs/super-e2e-<TIMESTAMP>Z/`                   |

**New in this spec:**
- 8 specialist verification agents that sign off in parallel on every HEAD.
- A `signoffs/` subdir under each run.
- A consensus-based exit gate (`release.json`).
- A regression-sentinel that re-runs previously-PASS routes after each fix batch.

---

## 1. Preflight gates (HARD — fail-fast, run in parallel)

Before any agent spawns:

```bash
RUN=docs/qa/runs/super-e2e-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$RUN"/{signoffs,locks,screenshots,logs,baseline}

# 1.1 Services
curl -sf http://localhost:8080/actuator/health | jq -e '.status=="UP"' >/dev/null  || exit 1
curl -sI http://localhost:3000 | head -1 | grep -qE "200|304"                     || exit 1

# 1.2 CSRF surface
curl -sf http://localhost:8080/api/v1/auth/csrf >/dev/null                         || exit 1

# 1.3 Baselines (compare-against, never absolute zero)
( cd frontend && npx tsc --noEmit 2>&1 ) | tee "$RUN/baseline/tsc.log" \
  | grep -c "error TS" > "$RUN/baseline/tsc.errors"
( cd backend && mvn -q compile 2>&1 )    | tee "$RUN/baseline/mvn-compile.log"
curl -sf http://localhost:8080/v3/api-docs > "$RUN/baseline/openapi.json"

# 1.4 Git checkpoint
git rev-parse HEAD                   > "$RUN/baseline/head.sha"
git status --porcelain               > "$RUN/baseline/dirty.txt"
[ ! -s "$RUN/baseline/dirty.txt" ]   || { echo "ABORT: dirty tree"; exit 1; }

# 1.5 Manifest
jq -n --arg sha "$(cat $RUN/baseline/head.sha)" \
      --arg ts  "$(date -u +%FT%TZ)" \
      '{run:$ts, head:$sha, mode:"full", workers:11}' > "$RUN/manifest.json"
```

If any gate fails, hand off to `nu-chrome-e2e`'s Bootstrap Medic (Persona 0) — do NOT
re-implement repair logic here. Medic owns docker/flyway/port/redis/kafka/es recovery.

---

## 2. Directory layout (per run)

```
docs/qa/runs/super-e2e-<TIMESTAMP>Z/
├── manifest.json                # {run, head_sha, mode, workers}
├── bug-sheet.md                 # single source of truth (nu-chrome-e2e format)
├── baseline/
│   ├── tsc.errors               # baseline TS error count
│   ├── tsc.log
│   ├── mvn-compile.log
│   ├── openapi.json             # /v3/api-docs snapshot at run start
│   ├── head.sha
│   └── dirty.txt
├── signoffs/                    # ONE json per specialist per HEAD (NEW)
│   ├── rbac-auditor.json
│   ├── design-guard.json
│   ├── migration-sentinel.json
│   ├── api-contract-verifier.json
│   ├── build-gate.json
│   ├── regression-sentinel.json
│   └── triage-arbiter.json
├── release.json                 # final consensus verdict (NEW)
├── locks/                       # flock(md5(path)) per source file
├── screenshots/                 # nu-chrome-e2e fail screenshots
├── logs/
│   ├── orchestrator.log         # progress table + 503 restarts ONLY
│   ├── qa.trace.log
│   ├── console.log
│   └── network.log
└── reports/
    └── SUPER-E2E-REPORT.md      # final, tech-lead lens
```

---

## 3. Shared contracts

### 3.1 Bug sheet (REUSED VERBATIM from `nu-chrome-e2e`)

`bug-sheet.md`:

```markdown
| # | UC | Sev | Route | Role | Symptom (≤80ch) | Root File:Line | Fix (≤80ch) | Status | Iter | Verified |
|--:|----|-----|-------|------|-----------------|----------------|-------------|--------|-----:|----------|
| 1 | UC-RBAC-042 | P0 | /payroll | MGR | rendered admin table, no redirect | PayrollController.java:67 | add @RequiresPermission("PAYROLL:VIEW") | VERIFIED | 1 | ✅ |
```

- Status: one-way `OPEN → FIXING → COMPILED → VERIFIED` (or `REJECTED` / `UNRESOLVED`).
- Severity: P0 (block), P1 (current batch), P2 (if cheap), P3 (log only).
- Columns are fixed. Composer atomically rewrites the file (`mv tmp bug-sheet.md`).

### 3.2 Sign-off JSON (NEW — one per specialist per HEAD)

`signoffs/<agent>.json`:

```json
{
  "agent": "rbac-auditor",
  "head_sha": "0b3aee04866bc12dacb7168dfb5590b7d5dc1386",
  "verdict": "GREEN",
  "evidence": ["docs/qa/runs/.../logs/rbac-diff.txt"],
  "blocking_findings": [],
  "timestamp": "2026-06-03T10:14:22Z",
  "retries": 0,
  "duration_ms": 4821
}
```

`verdict` ∈ `{GREEN, AMBER, RED}`. Amber = advisory (logged, does not block); Red blocks
release. Each specialist rewrites its own file atomically; never appends.

### 3.3 Release verdict (NEW — triage-arbiter only)

`release.json`:

```json
{
  "head_sha": "...", "approved": true,
  "signoffs_green": ["rbac-auditor","design-guard", "..."],
  "signoffs_amber": [],
  "signoffs_red":   [],
  "unresolved_bugs": [], "regressions": [],
  "skill_exit": "ok",
  "timestamp": "2026-06-03T10:42:11Z"
}
```

### 3.4 File ownership (collision-free)

| Writer                     | Owns                                                                |
|----------------------------|---------------------------------------------------------------------|
| `qa-browser`               | bug-sheet rows, screenshots, console.log, network.log               |
| `dev-fixer-fe`             | files under `frontend/` it has flocked, one-bug-per-commit          |
| `dev-fixer-be`             | files under `backend/` it has flocked, one-bug-per-commit           |
| Each specialist            | `signoffs/<itself>.json` only                                       |
| `triage-arbiter`           | `release.json`, `bug-sheet.md` status transitions to `VERIFIED`/`REJECTED`/`UNRESOLVED` |
| `orchestrator`             | `logs/orchestrator.log`, `manifest.json` updates only               |

Nobody else writes to those files. Violations are caught by the arbiter on signoff
review.

---

## 4. Agent roster (11)

Spawn ALL agents in ONE message with `run_in_background: true`. Each prompt is
self-contained; agents coordinate via files (sign-offs, bug-sheet) and `SendMessage`.

### 4.1 `qa-browser` (`subagent_type: tester`)

- **Charter:** invoke `nu-chrome-e2e` skill in `--full` mode. Do NOT reimplement Chrome
  automation. Hand off bug-sheet rows in the canonical format.
- **Input:** `use-cases.yaml`, current run dir.
- **Output:** `bug-sheet.md` (atomic rewrites), screenshots, console.log, network.log.
- **Sign-off:** does NOT sign off (work is consumed by other specialists).

### 4.2 `dev-fixer-fe` (`subagent_type: coder`)

- **Charter:** fix frontend bugs only. Read before edit. ≤3 lines per fix. No new
  abstractions, no new deps, no `any` casts.
- **Trigger:** bug-sheet row `Status=FIXING` with `Root File:Line` under `frontend/`.
- **Per fix:**
  1. `flock locks/$(md5 path)` — abort if already locked.
  2. Minimal Edit (never Write).
  3. `cd frontend && npx tsc --noEmit | grep -c "error TS"` — must equal baseline.
  4. `cd frontend && npx eslint <file> --max-warnings=0`.
  5. Commit `fix(<module>): <bug-id> <symptom>` — one bug, one commit.
  6. Update bug-sheet row `Status=COMPILED`.
- **Sign-off:** none (build-gate and regression-sentinel verify the fix landed).

### 4.3 `dev-fixer-be` (`subagent_type: backend-dev`)

- **Charter:** fix backend bugs only. Every new `@*Mapping` MUST carry
  `@RequiresPermission`. Migrations bump from current Vmax (V139 today, NOT V128).
- **Trigger:** bug-sheet row `Status=FIXING` under `backend/`.
- **Per fix:**
  1. flock the file.
  2. Edit minimally.
  3. `cd backend && mvn -q compile`.
  4. If touched controller: grep changed file for `@RequiresPermission` — required.
  5. If touched entity/migration: next version = `V$(maxV+1)__...sql`.
  6. Commit `fix(<module>): <bug-id> <symptom>`.
  7. Bug-sheet `Status=COMPILED`.
- **Sign-off:** none.

### 4.4 `rbac-auditor` (`subagent_type: security-auditor`)

- **Charter:** verify the 4 RBAC layers stay aligned after every commit.
- **Trigger:** new HEAD sha (poll `git log -1 --format=%H` every 30s).
- **Checks:**
  ```bash
  # Layer A — backend constants
  grep -rE "public static final String [A-Z_]+_(READ|WRITE|APPROVE|DELETE)" \
    backend/src/main/java/com/hrms/common/security/Permission.java > /tmp/rbac-a

  # Layer B — controller annotations
  grep -rnE "@RequiresPermission\([^)]+\)" backend/src/main/java > /tmp/rbac-b
  # Every @*Mapping must have one
  awk '/^@(Get|Post|Put|Delete|Patch)Mapping/{m=NR} \
       /@RequiresPermission/{seen[m]=1} \
       END{for(k in mappings) if(!seen[k]) print "MISSING", k}' backend/...

  # Layer C — DB seed
  grep -rE "INSERT INTO permissions" backend/src/main/resources/db/migration/V*.sql \
    > /tmp/rbac-c

  # Layer D — live JWT claims (login as SUPER_ADMIN, fetch /api/v1/users/me)
  curl -s -H "Cookie: $JWT_COOKIE" http://localhost:8080/api/v1/users/me | jq .permissions > /tmp/rbac-d

  # Diff: every Permission.* used in @RequiresPermission must appear in V*.sql AND in /me
  ```
- **Sign-off:** `GREEN` if all four layers align for changed permissions. `RED` for
  any missing controller annotation, any orphan permission string, any `/me`
  claim that doesn't appear in the DB seed.

### 4.5 `design-guard` (`subagent_type: reviewer`)

- **Charter:** enforce the design system after every commit.
- **Trigger:** new HEAD sha.
- **Checks:**
  ```bash
  cd frontend && npm run lint                                # eslint-plugin-nu-aura catches bans
  cd frontend && npm run lint:design                         # design-token scope
  # Belt + suspenders: regex changed files for banned tokens
  git diff "$BASE..HEAD" --name-only -- 'frontend/**/*.{ts,tsx,css}' | xargs grep -lE \
    'bg-(white|gray|slate|blue|sky|rose|amber|emerald)-|shadow-(sm|md|lg)\b|#[0-9a-fA-F]{3,8}\b' \
    && verdict=RED
  ```
- **Sign-off:** `GREEN` only if both lint commands pass AND no banned tokens in the
  diff. Lists offending file:line in `blocking_findings`.

### 4.6 `migration-sentinel` (`subagent_type: backend-dev`)

- **Charter:** Flyway integrity + standard audit columns on every new table.
- **Trigger:** new HEAD sha touching `backend/src/main/resources/db/migration/`.
- **Checks:**
  ```bash
  cd backend && mvn -q flyway:validate
  # Version continuity: no gaps from current Vmin..Vmax
  ls backend/src/main/resources/db/migration/V*.sql | \
    awk -F'V|__' '{print $2}' | sort -n | awk 'NR>1 && $1!=prev+1{print "GAP at",$1} {prev=$1}'

  # Standard audit columns on any new CREATE TABLE
  git diff "$BASE..HEAD" -- 'backend/src/main/resources/db/migration/V*.sql' | \
    awk '/^\+CREATE TABLE/{t=1} t && /\+\)/{t=0; print "TABLE:", table; table=""} \
         t && /^\+CREATE TABLE/{table=$3}' | while read T; do
      for col in tenant_id created_at updated_at version is_active; do
        grep -q "$col" <<< "$diff_block" || echo "MISSING $col on $T"
      done
    done
  ```
- **Sign-off:** `GREEN` if validate passes, no version gaps, all required columns
  present on new tables. `RED` otherwise.

### 4.7 `api-contract-verifier` (`subagent_type: api-docs`)

- **Charter:** prevent silent OpenAPI breakage.
- **Trigger:** new HEAD sha touching `backend/src/main/java`.
- **Checks:**
  ```bash
  curl -sf http://localhost:8080/v3/api-docs > /tmp/openapi.now.json
  # Diff against baseline. Breaking changes = removed paths, changed required params,
  # changed response status codes, removed schemas referenced by responses.
  npx -y openapi-diff "$RUN/baseline/openapi.json" /tmp/openapi.now.json --fail-on-incompatible
  ```
- **Sign-off:** `GREEN` if no breaking changes. `AMBER` for additive changes
  (new endpoints, new optional params). `RED` for breaking.

### 4.8 `build-gate` (`subagent_type: tester`)

- **Charter:** verify the codebase still compiles + tests still pass after every batch.
- **Trigger:** triage-arbiter posts `batch-closed` (see §5.2).
- **Checks:**
  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS"   # ≤ baseline
  cd frontend && npm run build                                # exit 0
  cd backend  && mvn -q test                                  # exit 0
  ```
- **Sign-off:** `GREEN` only when all three pass. `RED` triggers automatic revert of
  the latest unverified fix (one commit at a time, via `git revert HEAD`).

### 4.9 `regression-sentinel` (`subagent_type: tester`)

- **Charter:** catch new bugs introduced by fixes.
- **Trigger:** triage-arbiter posts `batch-closed`.
- **Checks:**
  - Read `bug-sheet.md` for all routes ever marked `PASS` in this run.
  - For each, invoke `nu-chrome-e2e --route <path>` (3min budget per route).
  - Any previously-PASS route that now FAILs → file a new bug-sheet row tagged
    `regression-of=<original-bug-id>`.
- **Sign-off:** `GREEN` if zero new regressions; `RED` with the failing route list.

### 4.10 `triage-arbiter` (`subagent_type: reviewer`)

- **Charter:** consensus judge. Final say on FIXED / REJECTED / UNRESOLVED.
- **Trigger:** bug-sheet row transition to `COMPILED`.
- **Per row:**
  1. Re-run the single UC via `nu-chrome-e2e --uc <id>`.
  2. If PASS → `Status=VERIFIED`, `Verified=✅`.
  3. If FAIL → `Status=OPEN`, `Iter++`. After 3 iters → `UNRESOLVED`.
  4. If `Iter>3` AND severity is P2/P3 → `UNRESOLVED` (acceptable for partial exit).
- **Batch close (every 5 minutes or 10 COMPILED rows, whichever first):**
  - Write `batch-closed` marker so build-gate + regression-sentinel run.
  - Wait for both to sign off.
  - If either is `RED`: revert the offending commit; mark the bugs back to `OPEN`.
- **Final release decision:**
  - All 6 signing specialists `GREEN` + no `OPEN`/`FIXING`/`COMPILED` rows
    + regression-sentinel green twice in a row → write `release.json` with
    `approved: true` and `skill_exit: ok`.
  - Otherwise: `approved: false` with reason.

### 4.11 `orchestrator` (`subagent_type: task-orchestrator`, foreground)

- **Charter:** scheduler only. Never verifies.
- **Loop (every 90s):**
  1. Health probe: services up? If frontend 503 → restart:
     ```bash
     lsof -ti:3000 | xargs -r kill -9
     rm -rf frontend/.next
     cd frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &
     until curl -sf http://localhost:3000 >/dev/null; do sleep 2; done
     ```
     Notify `qa-browser` to hard-refresh.
  2. Print progress table (below) to `logs/orchestrator.log`.
  3. Check exit consensus (§6).
  4. Sleep 90s.
- **Progress table:**
  ```
  ┌──────────┬────────┬──────┬──────┬──────┬──────┬────────┬───────┬──────────┐
  │ Phase    │ UCs    │ PASS │ FAIL │ Open │ Fix→ │ Verif. │ Regr. │ Signoffs │
  ├──────────┼────────┼──────┼──────┼──────┼──────┼────────┼───────┼──────────┤
  │ batch-3  │ 47/120 │  39  │  5   │  3   │  2   │  37    │  0    │ 4G/0A/0R │
  └──────────┴────────┴──────┴──────┴──────┴──────┴────────┴───────┴──────────┘
  TSC: base=0 curr=0 │ Build: pass │ BE✓ FE✓ │ HEAD: 0b3aee0
  ```

---

## 5. Autonomous-verification protocol

### 5.1 Trigger wiring

| Specialist                | Triggered by                                            |
|---------------------------|---------------------------------------------------------|
| `dev-fixer-fe/be`         | bug-sheet row `Status=FIXING`                           |
| `rbac-auditor`            | new HEAD sha                                            |
| `design-guard`            | new HEAD sha                                            |
| `migration-sentinel`      | new HEAD sha touching `db/migration/`                   |
| `api-contract-verifier`   | new HEAD sha touching `backend/src/main/java`           |
| `build-gate`              | `batch-closed` marker                                   |
| `regression-sentinel`     | `batch-closed` marker                                   |
| `triage-arbiter`          | bug-sheet row transition to `COMPILED`                  |
| `qa-browser`              | external (skill invocation) + retest-queue notification |

### 5.2 Batch-close handshake

Triage-arbiter writes:

```bash
echo "{\"head\":\"$SHA\",\"closed_at\":\"$(date -u +%FT%TZ)\",\"rows\":[...]}" \
  > "$RUN/markers/batch-closed-$SHA.json"
```

Build-gate and regression-sentinel watch this file. Both must sign off `GREEN` before
the next batch may open. The arbiter blocks new `FIXING` transitions until both green
or one revert lands.

### 5.3 Conflict resolution

- Two specialists disagree (e.g., rbac-auditor `GREEN`, design-guard `RED`): RED wins.
- Build-gate `RED` after a batch close → revert the most-recent commit; that bug
  re-opens with `Iter++`.
- If a specialist's `duration_ms > 120000` (2 min), the arbiter marks `AMBER` and
  schedules a retry. After 3 retries → escalate to user.

---

## 6. Exit criteria (consensus)

Release is approved (`release.json.approved: true`) **only when ALL hold**:

1. Every bug-sheet row `Status ∈ {VERIFIED, REJECTED, UNRESOLVED}`.
2. Every specialist sign-off for current HEAD is `GREEN`.
3. `regression-sentinel` is `GREEN` on the most recent two consecutive batches.
4. `build-gate` is `GREEN` for current HEAD with `tsc` errors ≤ baseline and
   `npm run build` exit 0 and `mvn test` exit 0.
5. No unresolved P0 or P1 bugs (P2/P3 may remain `UNRESOLVED` for partial exit).
6. `git status --porcelain` is empty (all fixes committed).

`SKILL_EXIT` mapping:
- All six hold → `ok`.
- P2/P3 unresolved but P0/P1 clean → `partial`.
- Any P0/P1 unresolved OR regression-sentinel still RED → `failed`.

---

## 7. Failure & recovery

| Symptom                                  | Owner             | Action                                                                 |
|------------------------------------------|-------------------|------------------------------------------------------------------------|
| Docker/Flyway/port/redis/kafka/es down   | Bootstrap Medic   | nu-chrome-e2e Persona 0 playbook                                       |
| Frontend 503 mid-run                     | orchestrator      | kill 3000, `rm -rf .next`, restart, wait for ready                     |
| dirty tree at preflight                  | orchestrator      | ABORT — never auto-stash                                               |
| dev-fixer stuck > 3 iters on same bug    | triage-arbiter    | mark `UNRESOLVED`, free the lock                                       |
| Two fixers want the same file            | flock             | second waits 30s, then picks a different `FIXING` row                  |
| Specialist hangs > 2 min                 | triage-arbiter    | mark `AMBER`, retry; escalate after 3                                  |
| Build-gate RED after a commit            | triage-arbiter    | `git revert HEAD`, re-open the bug with `Iter++`                       |
| New regression detected                  | regression-sent.  | file new bug-sheet row tagged `regression-of=<id>`, severity = original|
| Bug-sheet column drift                   | arbiter           | reject the write; restore from last atomic snapshot                    |

---

## 8. Launch sequence (single message — all agents in parallel)

```javascript
// Step 1: orchestrator (foreground) runs §1 preflight; aborts if any gate fails.

// Step 2: ONE message spawning all 10 background agents
Agent({ name:"qa-browser", subagent_type:"tester", run_in_background:true,
  prompt: `Invoke the nu-chrome-e2e skill in --full mode targeting run dir ${RUN}.
           Write rows to ${RUN}/bug-sheet.md in the canonical format. When the
           retest-queue file appears, prioritize those UCs first. Notify triage-arbiter
           via SendMessage when each role's batch completes.` })

Agent({ name:"dev-fixer-fe", subagent_type:"coder", run_in_background:true,
  prompt: `Tail ${RUN}/bug-sheet.md. For each row Status=FIXING with Root File under
           frontend/, flock locks/$(md5 path), apply ≤3-line Edit, run tsc + eslint,
           commit fix(<module>): <bug-id> <symptom>, set row Status=COMPILED.
           Never write a new file. Never add a dep.` })

Agent({ name:"dev-fixer-be", subagent_type:"backend-dev", run_in_background:true,
  prompt: `Tail ${RUN}/bug-sheet.md. For rows under backend/, flock, edit, mvn compile.
           Every new @*Mapping MUST have @RequiresPermission. Migrations bump from
           current Vmax (check ls db/migration). Commit fix(<module>): <bug-id> ...` })

Agent({ name:"rbac-auditor", subagent_type:"security-auditor", run_in_background:true,
  prompt: `On every new HEAD sha, run the 4-layer diff from §4.4. Write
           ${RUN}/signoffs/rbac-auditor.json with verdict GREEN/AMBER/RED and
           blocking_findings.` })

Agent({ name:"design-guard", subagent_type:"reviewer", run_in_background:true,
  prompt: `On every new HEAD sha, run npm run lint + npm run lint:design + regex
           sweep of changed files. Write ${RUN}/signoffs/design-guard.json.` })

Agent({ name:"migration-sentinel", subagent_type:"backend-dev", run_in_background:true,
  prompt: `On new HEAD touching db/migration/, run mvn flyway:validate + version-gap
           check + audit-column check per §4.6. Write ${RUN}/signoffs/migration-sentinel.json.` })

Agent({ name:"api-contract-verifier", subagent_type:"api-docs", run_in_background:true,
  prompt: `On new HEAD under backend/src/main/java, snapshot /v3/api-docs and diff
           against ${RUN}/baseline/openapi.json with openapi-diff. Write
           ${RUN}/signoffs/api-contract-verifier.json.` })

Agent({ name:"build-gate", subagent_type:"tester", run_in_background:true,
  prompt: `On batch-closed marker, run tsc/build/mvn test and write
           ${RUN}/signoffs/build-gate.json. If RED, SendMessage to triage-arbiter to
           revert.` })

Agent({ name:"regression-sentinel", subagent_type:"tester", run_in_background:true,
  prompt: `On batch-closed marker, replay every previously-PASS route via
           nu-chrome-e2e --route. File regression-of=<id> rows for new failures.
           Write ${RUN}/signoffs/regression-sentinel.json.` })

Agent({ name:"triage-arbiter", subagent_type:"reviewer", run_in_background:true,
  prompt: `Per §4.10: re-run COMPILED rows via nu-chrome-e2e --uc, transition status,
           batch-close every 5min or 10 rows, arbitrate signoffs, revert on RED build,
           write ${RUN}/release.json when consensus reached.` })

// Step 3: orchestrator enters the 90s monitoring loop (§4.11).
```

---

## 9. Final report template

`reports/SUPER-E2E-REPORT.md` (extends the existing format):

```markdown
# NU-AURA Super E2E Report — <RUN>

- **Run:** docs/qa/runs/<RUN>/
- **Mode:** FULL (11-agent autonomous swarm)
- **Git SHA (start → end):** <a> → <b>
- **Skill exit:** ok | partial | failed

## Specialist sign-off matrix

| Specialist              | Final Verdict | Duration | Retries | Blocking findings |
|-------------------------|--------------:|---------:|--------:|-------------------|
| rbac-auditor            | GREEN         |    4.8s  | 0       | 0                 |
| design-guard            | GREEN         |   12.1s  | 0       | 0                 |
| migration-sentinel      | GREEN         |    3.2s  | 0       | 0                 |
| api-contract-verifier   | AMBER         |    5.6s  | 0       | +3 endpoints      |
| build-gate              | GREEN         |   94.3s  | 1       | 0                 |
| regression-sentinel     | GREEN×2       |  121.0s  | 0       | 0                 |
| triage-arbiter          | APPROVED      |     —    | —       | —                 |

## Worker summary
(reuse the existing W1..W10 table from SUPER-E2E-REPORT.md)

## Bugs fixed
(group by root cause — Tech Lead lens)

## Unresolved (P2/P3)
(list with reason + recommendation)

## Code health (final)
- TSC: baseline=N current=N
- Build: PASS in Xs
- mvn test: PASS X/Y in Zs
- OpenAPI diff: <additive | breaking | none>
- Permission coverage: 100% of new @*Mapping carry @RequiresPermission
```

---

## 10. Operator checklist (start a run)

1. `git status --porcelain` is empty.
2. Services up (be:8080, fe:3000, Chrome MCP extension connected).
3. `mkdir -p docs/qa/runs/super-e2e-$(date -u +%Y%m%dT%H%M%SZ)Z`.
4. Run §1 preflight; abort on any RED gate.
5. Spawn the 10 background agents in one message (§8).
6. Watch `logs/orchestrator.log` for the progress table.
7. Exit when `release.json` exists with `approved: true` (or escalation on `failed`).

---

## 11. Out of scope (deliberate)

- Browser automation primitives (owned by `nu-chrome-e2e`).
- Bootstrap repair logic (owned by Bootstrap Medic / Persona 0).
- New ESLint / Flyway / OpenAPI tooling (use what exists; describe diffs in this spec).
- CLAUDE.md updates (V139 is current; CLAUDE.md says V128 — separate PR).
- The permission-diff CLI script — described here, implementation belongs in
  `scripts/audit/rbac-4layer-diff.sh` in a separate PR.
