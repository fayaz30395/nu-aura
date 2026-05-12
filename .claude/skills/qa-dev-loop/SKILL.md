---
name: qa-dev-loop
description: Use when the user wants the FULL release-readiness sweep — runs every UC in docs/qa/use-cases.v2.yaml (263 routes, 1563 endpoints, 2025 RBAC probes, 7155 API checks across 9 roles) AND auto-fixes findings in real time. Thin composition skill — delegates to nu-usecase-runner (UCs) + nu-rbac-autonomous (matrix) + a DEV fixer that listens on the shared findings stream. Triggers — "full qa loop", "release readiness", "all use cases + rbac", "/qa-dev-loop".
type: process
---

# QA + DEV Loop (composition)

This skill **does not** reinvent QA. It composes three already-mature pieces:

| Piece                      | Owns                                                                          | Output                                       |
|----------------------------|-------------------------------------------------------------------------------|----------------------------------------------|
| `nu-usecase-runner`        | parses `docs/qa/use-cases.v2.yaml`, runs API + Chrome UCs, 9 QA + 2 Dev pools | `docs/qa/findings/usecase/<uc-id>.json`      |
| `nu-rbac-autonomous`       | 2025-probe matrix across 9 roles via curl, browser-verifies suspicious        | `docs/qa/findings/rbac/<role>__<route>.json` |
| **DEV fixer** (this skill) | watches both findings streams, applies ≤3-line fixes, queues retest           | `docs/qa/fixed.log`, `docs/qa/queue/retest`  |

The orchestrator (you) just spawns three things in parallel and waits on two sentinels —
`USECASE-DONE` and `RBAC-DONE`. No polling, no narration, no ASCII tables.

## Source of truth

```
docs/qa/use-cases.v2.yaml   ← the contract. 263 routes, 1563 endpoints, 9 roles.
                              regenerate via: python3 docs/qa/regenerate-use-cases.py
```

If it's stale (last `git log -1 docs/qa/use-cases.v2.yaml` >24h or `mtime <
backend/src` mtime), regenerate first. Don't run on a stale catalog.

## Coordination contract

```
docs/qa/findings/usecase/<uc-id>.json   ← runner writes
docs/qa/findings/rbac/<role>__<slug>.json ← rbac writes
docs/qa/queue/retest                     ← DEV appends slugs (atomic)
docs/qa/fixed.log                        ← DEV appends "<bug_id> <ref>"
docs/qa/USECASE-DONE                     ← runner touches at end
docs/qa/RBAC-DONE                        ← rbac touches at end
docs/qa/LOOP-DONE                        ← orchestrator touches at exit
docs/qa/needs-review.md                  ← cross-cutting, human decides
```

Any finding file with `status != PASS` and a `bug_id` (sha1 of `file:line:msg`[:6])
is a fix candidate. DEV de-dupes via `fixed.log`.

## Step 0 — Bootstrap (100% autonomous)

Use the shared bootstrap (docker infra + backend + frontend) — one script, idempotent:

```bash
bash .claude/skills/playwright-autonomous/scripts/bootstrap.sh || exit 1
```

That brings up redis/kafka/elasticsearch via docker-compose, then backend on :8080, then frontend
on :3000. On failure it tails the relevant log inline and exits — no silent retries. Then the legacy
verify block below is the safety net (which you can keep or replace):

```bash
test -f docs/qa/use-cases.v2.yaml || { echo "NO YAML — regenerate first"; exit 1; }

# Backend — auto-start if down
if ! curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
  echo "BE-DOWN — auto-starting"
  (cd backend && nohup ./start-backend.sh > /tmp/backend.log 2>&1 &)
  for i in $(seq 1 60); do
    curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1 && { echo BE-UP; break; }
    sleep 5
  done
  curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1 || { echo "BE failed to start — see /tmp/backend.log"; exit 1; }
fi

# Frontend — auto-start if down (any HTTP response = up; root may 404, /login 307s)
fe_up() { curl -sI http://localhost:3000 2>/dev/null | head -1 | grep -q '^HTTP/'; }
if ! fe_up; then
  echo "FE-DOWN — auto-starting"
  (cd frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &)
  for i in $(seq 1 60); do
    fe_up && { echo FE-UP; break; }
    sleep 5
  done
  fe_up || { echo "FE failed to start — see /tmp/frontend.log"; exit 1; }
fi

mkdir -p docs/qa/findings/{usecase,rbac} docs/qa/queue docs/screenshots
rm -f docs/qa/{USECASE-DONE,RBAC-DONE,LOOP-DONE,queue/retest,fixed.log}
: > docs/qa/queue/retest
: > docs/qa/fixed.log
```

Auto-start is the default. Servers are launched in the background (5min timeout each, ~5s poll).
Only stop and tell the user if startup itself fails — check `/tmp/backend.log` / `/tmp/frontend.log`
for the cause. If the user explicitly says "don't start servers", honor that and stop on DOWN
instead.

## Step 1 — Spawn three agents (single message, parallel)

### Agent A — Use-case runner

```
description: "Use-case runner — full catalog"
subagent_type: tester
run_in_background: true
prompt: |
  Invoke the nu-usecase-runner skill against docs/qa/use-cases.v2.yaml.
  Credentials: same fallback as RBAC — env $QA_PASS_<ROLE_CODE> if set,
  else "Welcome@123" (shared dev test password). Do NOT abort on missing
  env vars.
  Constraints (for this orchestrator):
  - Write per-UC results to docs/qa/findings/usecase/<uc-id>.json (atomic .tmp+mv).
  - bug_id = sha1(file:line:msg)[0:6] when status != PASS, else null.
  - Drain docs/qa/queue/retest BEFORE each new UC batch — if a route is queued,
    re-run the UCs for that route first (with iter+1).
  - When the catalog is exhausted AND retest queue empty, touch
    docs/qa/USECASE-DONE and exit.
  - Do not invoke any DEV agent — fixes are owned by the parallel DEV fixer.
```

### Agent B — RBAC matrix

```
description: "RBAC matrix — 9 roles × all routes"
subagent_type: security-auditor
run_in_background: true
prompt: |
  Invoke the nu-rbac-autonomous skill against docs/qa/use-cases.v2.yaml's
  rbac matrix. Use the 9 role credentials defined in the YAML's `roles:` block
  (each entry has `email`). Password resolution order:
    1. env $QA_PASS_<ROLE_CODE> if set
    2. fallback to "Welcome@123" (documented shared test password — see
       docs/qa/NU-AURA-QA-USE-CASES.md line 49)
  Do NOT abort on missing env vars — use the fallback. All seed/test users
  share Welcome@123 in dev.
  Constraints:
  - Write per-cell results to docs/qa/findings/rbac/<ROLE>__<route_slug>.json
    (atomic). Slug = route with / → _.
  - bug_id = sha1(role:route:expected_vs_actual)[0:6] when leak/mismatch.
  - Drain docs/qa/queue/retest before each role batch.
  - When the matrix is fully covered AND retest queue empty, touch
    docs/qa/RBAC-DONE and exit.
  - Do NOT spawn dev subagents — DEV is owned by the parallel fixer.
```

### Agent C — DEV fixer

```
description: "DEV fixer — listens on both findings streams"
subagent_type: coder
run_in_background: true
prompt: |
  Fix bugs as they appear. Repo /Users/fayaz.m/IdeaProjects/nulogic/nu-aura.
  
  Watch loop (event-driven):
    fswatch -1 docs/qa/findings/usecase docs/qa/findings/rbac
    → on wake: scan both dirs for status != PASS with bug_id not in fixed.log
    → for each new bug:
        a. Infer source from finding (route → frontend/app/<path>/page.tsx
           OR controller/service from API path).
        b. Read file. Diagnose root cause from screenshot + console_error +
           expected_vs_actual.
        c. Edit (≤3 lines preferred; never rewrite). Verify:
             frontend → npm run typecheck
             backend  → mvn -q -pl <module> compile
        d. Append "<bug_id> <ref>" to docs/qa/fixed.log (atomic).
        e. Append slug (route or endpoint path) to docs/qa/queue/retest.
    → loop back to fswatch
  
  Exit when BOTH USECASE-DONE and RBAC-DONE exist AND
  fixed.log line count >= total bug count across both findings dirs
  (or >= cap, whichever first).
  
  CLAUDE.md is law (inline summary, do not deviate):
  - Mantine UI (NOT MUI). Tokens only — NO bg-white/raw hex/gray-*/blue-*.
  - h-9 buttons, p-2/4/6/8, text-xs labels (desktop-first, NOT mobile sizing).
  - @RequiresPermission("module.action") on EVERY backend endpoint.
  - No `any` in TS, no @ts-ignore, no try/catch swallowing, no test.skip.
  - Read before write. rm -f .git/index.lock before any git op.
  - No git push, no PR — just edit.
  
  Cap: 50 fixes/session. Hit cap → append "CAP-REACHED" to needs-review.md, exit.
  
  Cross-cutting (new perm row, schema, architecture decision) → append to
  docs/qa/needs-review.md, mark bug_id in fixed.log so it's not re-attempted.
```

## Step 2 — Orchestrator wait

You spawned three; now block on two sentinels via Monitor:

```bash
until [ -f docs/qa/USECASE-DONE ] && [ -f docs/qa/RBAC-DONE ]; do sleep 60; done
echo BOTH-DONE
# Wait for DEV to drain its queue
until ! pgrep -f "fswatch.*qa/findings" >/dev/null; do sleep 30; done
echo DEV-DRAINED
```

Don't ping agents. Don't print tables. The agents work.

**Crash recovery** (only on background-task notification of agent death):

- If runner/rbac agent died → respawn it; their per-UC files are idempotent.
- If DEV died from a build break →
  `cd frontend && lsof -ti:3000 | xargs kill -9; nohup npm run dev > /tmp/frontend.log 2>&1 &` then
  respawn DEV.
- Don't `rm -rf .next` unless graceful restart fails twice.

## Step 3 — Final report

```bash
DATE=$(date +%F)
UC_TOTAL=$(ls docs/qa/findings/usecase/*.json 2>/dev/null | wc -l)
UC_FAIL=$(grep -l '"status": "FAIL\|BUG"' docs/qa/findings/usecase/*.json 2>/dev/null | wc -l)
RBAC_TOTAL=$(ls docs/qa/findings/rbac/*.json 2>/dev/null | wc -l)
RBAC_LEAK=$(grep -l '"status": "LEAK\|FAIL"' docs/qa/findings/rbac/*.json 2>/dev/null | wc -l)
FIXED=$(wc -l < docs/qa/fixed.log)
NEEDS=$([ -f docs/qa/needs-review.md ] && grep -c '^## ' docs/qa/needs-review.md || echo 0)
```

Write `docs/qa/qa-dev-report-${DATE}.md`:

```
## Full QA+DEV Sweep — ${DATE}
Catalog: docs/qa/use-cases.v2.yaml (263 routes / 9 roles)
UCs: ${UC_TOTAL} run / ${UC_FAIL} fail
RBAC: ${RBAC_TOTAL} cells / ${RBAC_LEAK} leaks
Fixed: ${FIXED}   Needs-review: ${NEEDS}
TS: $(cd frontend && npm run typecheck 2>&1 | tail -1)
BE: $(cd backend && mvn -q -DskipTests compile 2>&1 | tail -1)
Findings: docs/qa/findings/  Screenshots: docs/screenshots/
```

Touch `docs/qa/LOOP-DONE`. Exit. Do not ask "anything else?".

## Hard rules

1. **Compose, don't reinvent.** This skill spawns the existing skills. If runner/rbac semantics need
   to change, change those skills, not this one.
2. **Single source of truth = `use-cases.v2.yaml`.** Regenerate before running if stale.
3. **Two parallel testers + one fixer + one dumb orchestrator.** Four roles, no more.
4. **Sentinels only for exit.** No SendMessage timers, no progress narration, no tables.
5. **DEV cap = 50 fixes/session.** Forces triage on big leaks instead of runaway editing.
6. **Cross-cutting → `needs-review.md`.** Schema/perms/architecture = human gate.
7. **No git push.** Sweep changes the working tree only.

## Why this is the right shape

Old `qa-dev-loop` (v1) reinvented QA and tested 20 routes. Wrong abstraction. The user already has:

- a YAML catalog covering 263 routes / 1563 endpoints / 9 roles / 9180 total UCs
- two skills that consume it and produce findings
- a memory entry confirming 2016 RBAC probes ran with 0 escalations last sweep

So the right primitive is a **thin parallel-and-listen** wrapper. ~150 lines of skill instead of ~

600. The two existing skills do all the heavy lifting; this one only adds: (a) a parallel DEV fixer
     that consumes their unified findings stream, (b) a sentinel-based exit.

## Invocation

User: "full qa loop" / "release readiness" / `/qa-dev-loop`

Skill response (one line, then go):

> "Running full QA+DEV sweep against use-cases.v2.yaml (UC + RBAC + DEV). Will write report to
> docs/qa/qa-dev-report-<date>.md."

Then Step 0 → Step 1 (single message, three Agent calls).
