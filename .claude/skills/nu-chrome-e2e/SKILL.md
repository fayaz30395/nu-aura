---
name: nu-chrome-e2e
description: Use when asked to run E2E, QA sweep, validate in browser, RBAC check, CRUD validation, or any autonomous browser-driven testing of NU-AURA. Single entry point — Chrome DevTools MCP primary, Playwright fallback, curl degraded mode. Modes: --rbac, --crud, --full, --route <path>, --uc <id>, --module <name>.
---

# NU-AURA Autonomous Browser E2E

Single canonical autonomous browser-driven QA skill for NU-AURA. Replaces
`nu-validate-fix-loop`, `nu-aura-full-platform-qa`, `nu-e2e-qa`, `nu-e2e`,
`nu-aura-e2e-lifecycle`, `nu-validate`, `nu-design-check` and the other
nu-* QA skills. Chrome DevTools MCP primary, Playwright fallback, curl degraded
mode. Driven by a machine-readable use-case catalog (`use-cases.yaml`), executed
by a 7-persona loop, tracked in a single bug sheet.

---

## Autonomy Contract

### Prerequisites (self-check, no prompts)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # expect 200
curl -s http://localhost:8080/actuator/health | grep '"status":"UP"'
```

Also probe the Chrome DevTools MCP (`mcp__claude-in-chrome__tabs_context_mcp`).

On failure: attempt `docker-compose up -d && cd backend && ./start-backend.sh &
&& cd frontend && npm run dev &`, wait up to 120s for health, then abort with
full log in `qa-reports/nu-chrome-e2e/<run>/ABORTED.md`.

### Defaults

| Setting | Value |
|---------|------:|
| mode | `--full` |
| base_url | `http://localhost:3000` |
| first role | `SUPER_ADMIN` |
| MAX_ITERATIONS | `25` |
| MAX_DURATION (`--full`) | `90min` |
| MAX_DURATION (`--rbac`) | `25min` |
| MAX_DURATION (`--crud`) | `30min` |
| ROLE_SWITCH_PAUSE | `15s` |
| BATCH_SIZE (tabs per role) | `5` |
| RENDER_TIMEOUT | `10000ms` |
| NETWORK_IDLE_TIMEOUT | `5000ms` |
| SCREENSHOT_ON_PASS | `false` |
| SCREENSHOT_ON_FAIL | `true` |
| AUTO_COMMIT_FIXES | `false` |
| MAX_RETRIES_PER_BUG | `3` |

### Tool Fallback Chain

1. Chrome DevTools MCP (`mcp__claude-in-chrome__*`)
2. Playwright headless (`cd frontend && npx playwright test`)
3. curl + server logs (health + smoke only)
4. Abort with full diagnosis in the report

### Termination

Stop when all three are true **in the latest iteration**:

1. Every row in the sheet is `VERIFIED` or `REJECTED`.
2. The iteration ran the **full** catalog for its mode (not just requeued UCs).
3. The iteration added `0` new rows AND applied `0` fixes (clean sweep).

Always emit `SKILL_EXIT: ok|partial|failed reason=<...>` as the last line of the
report.

### Structured Output

```
qa-reports/nu-chrome-e2e/<YYYY-MM-DD-HHMM>/
├── report.md              # final report, verdict, metrics
├── bug-sheet.md           # single source of truth (see format below)
├── trace.log              # one line per persona handoff
├── console.log            # all console output captured during the run
├── network.log            # all failed network requests
├── locks/                 # file-lock directory for the developer pool
└── screenshots/           # fail screenshots (one per failed UC)
```

Write all files even on abort.

---

## Modes

| Flag | Behavior | Time budget |
|------|----------|------------:|
| `--full` *(default)* | All phases: baseline, RBAC matrix, CRUD, cross-cutting | 90 min |
| `--rbac` | Access/deny matrix only, all 9 roles × all routes (765 UCs) | 25 min |
| `--crud` | Interactive flows + approvals (44 + 6 UCs) | 30 min |
| `--route <path>` | Single route across all authorized roles | 5 min |
| `--uc <id>` | Single use case by ID, e.g. `UC-RBAC-042` | 3 min |
| `--module <name>` | All use cases touching a module, e.g. `--module leave` | 15 min |

Zero-args invocation defaults to `--full`.

---

## Roles & Credentials

| Role              | Email                          | Password    |
|-------------------|--------------------------------|-------------|
| SUPER_ADMIN       | fayaz.m@nulogic.io             | Welcome@123 |
| TENANT_ADMIN      | sarankarthick.maran@nulogic.io | Welcome@123 |
| HR_ADMIN          | jagadeesh@nulogic.io           | Welcome@123 |
| HR_MANAGER        | jagadeesh@nulogic.io           | Welcome@123 |
| MANAGER           | sumit@nulogic.io               | Welcome@123 |
| TEAM_LEAD         | mani@nulogic.io                | Welcome@123 |
| EMPLOYEE          | saran@nulogic.io               | Welcome@123 |
| RECRUITMENT_ADMIN | suresh@nulogic.io              | Welcome@123 |
| FINANCE_ADMIN     | jagadeesh@nulogic.io           | Welcome@123 |

Auth rate limit: **5 req/min**. Role switches pause ≥ 15s.

---

## Use Case Catalog

The skill drives itself from `use-cases.yaml` in this directory. Each use case
has a stable ID, inputs, expected outcome, and severity on failure.

**ID scheme**: `UC-<CATEGORY>-<NNN>`

| Category | Count | Source |
|----------|------:|--------|
| `UC-RBAC-*` | 765 | Generated from the role × route matrix via `generate-rbac-cases.sh` |
| `UC-CRUD-*` | 44  | Hand-authored interactive journeys |
| `UC-APPR-*` | 6   | Cross-role approval chains |
| `UC-FORM-*` | 30  | 10 forms × 3 checks (required / format / submit) |
| `UC-SESS-*` | 10  | Auth + session |
| `UC-A11Y-*` | 15  | 5 pages × 3 a11y checks |
| `UC-DS-*`   | 20  | Design system grep rules |
| `UC-PERF-*` | 10  | Top 10 heaviest routes |
| **Total**   | **900** | |

### Three verifications per RBAC case

So that "200 OK with admin data" cannot slip through:

1. **URL check** — after navigation, current URL matches `expect`/`redirect_target`.
2. **Content check** — `expect: render` → canonical heading present;
   `expect: redirect` → no admin-only selectors in DOM.
3. **Negative API check** — for redirects, a direct API call to the underlying
   endpoint as that role must return 403 (not 200, not silent redirect).

**P0 is raised if ANY of the three fails**, even when URL says redirected.

### Pass/fail rule (every use case)

```
PASS if all assertions in journey return expected within RENDER_TIMEOUT
   AND no console ERROR logged during the step
   AND no 4xx/5xx on network except those declared in negative_api_check.
PARTIAL if assertions pass but P3 warnings raised (perf, a11y, design).
FAIL otherwise → severity as declared → fix protocol kicks in per autonomy block.
```

### Severity & action

| Level  | Condition                                                                                     | Action                                           |
|--------|-----------------------------------------------------------------------------------------------|--------------------------------------------------|
| **P0** | RBAC leak, wrong tenant data, auth bypass, full page JS crash                                 | Fix immediately, block next batch until resolved |
| **P1** | Console ERROR from app code, 4xx on permitted endpoint, broken CRUD, form submit silent fail  | Fix in current batch                             |
| **P2** | Missing loading/empty/error state, design token violation, wrong redirect target, render > 3s | Fix if straightforward, continue if complex      |
| **P3** | A11y improvement, render 1–3s, dark mode edge case, visual polish                             | Log only — do NOT auto-fix                       |

---

## Internal Role Model — 7 Personas

The skill orchestrates itself as seven named personas. They are not separate
agents — they are named checkpoints in the loop that the single skill runs
through. Every bug touches all seven in order.

```
[1. Orchestrator] → [2. QA] → [3. Bug Validator] → [4. QA Lead]
  → [5. Developer Lead] → [6. Developer] → [7. Compiler & Composer]
  → (PASS → loop back to Orchestrator; still FAIL → back to Bug Validator)
```

| # | Persona | Responsibility | Outputs |
|--:|---------|----------------|---------|
| 1 | **Orchestrator** | Picks next iteration's work; decides termination. | iteration plan entry |
| 2 | **QA** | Runs use cases via Chrome MCP tabs. PASS/FAIL only — no diagnosis. | raw results |
| 3 | **Bug Validator** | Re-runs each FAIL alone to confirm (reject flakes); dedupes. | confirmed rows |
| 4 | **QA Lead** | Assigns severity (P0–P3), scopes the smallest affected area, defines "done". | severity + done criterion |
| 5 | **Developer Lead** | **Thinks first**: writes a one-line fix plan. Rejects anything requiring refactor or multi-file change beyond strict necessity. | one-line fix plan |
| 6 | **Developer** | Applies the approved minimal edit. No new abstractions, no extra comments. | diff |
| 7 | **Compiler & Composer** | Runs `tsc --noEmit` + `mvn compile -q`. On green: requeues the UC, updates the single sheet. On red: reverts, returns to Bug Validator. | sheet update |

### Think-before-fix rule (Persona 5)

- Proposed fix must change **≤ 3 lines** unless QA Lead's scope explicitly says otherwise.
- If the fix introduces a new file → Developer Lead rejects and re-scopes.
- If the fix suggests an abstraction ("let's extract a helper") → reject — duplicate three lines instead.
- If the fix "also touches" unrelated code → reject — separate concern.

### Worker pool (physical parallelism)

| Pool | Count | Owned by | Constraint |
|------|------:|----------|-----------|
| Chrome MCP tabs | 5 | QA | Same login session |
| Fixers | 2 | Developer | One FE, one BE. Per-file `flock` |
| Compile gate | 1 | Compiler & Composer | Serialized — only one `tsc`+`mvn` at a time |
| Bug Validator | 1 | Bug Validator | Serial — one re-run at a time |

### File-lock (prevents fix collisions)

Before Developer edits any file:

```bash
flock -w 30 "$LOCK_DIR/$(printf '%s' "$FILE" | md5sum | cut -d' ' -f1).lock" -c "true"
```

Lock dir: `qa-reports/nu-chrome-e2e/<run>/locks/`. On 30s timeout, Developer picks a different FIXING row.

---

## Single Bug Sheet — one source of truth

File: `qa-reports/nu-chrome-e2e/<run>/bug-sheet.md`.
Markdown table only. Tailable, grep-able, diff-able. Only the
Compiler & Composer writes to it (atomic `mv tmp bug-sheet.md`).

```markdown
# Bug Sheet — run 2026-04-21-1430

| # | UC | Sev | Route | Role | Symptom (≤80ch) | Root File:Line | Fix (≤80ch) | Status | Iter | Verified |
|--:|----|-----|-------|------|-----------------|----------------|-------------|--------|-----:|----------|
| 1 | UC-RBAC-042 | P0 | /payroll | MGR | rendered admin table, no redirect | PayrollController.java:67 | add @RequiresPermission("PAYROLL:VIEW") | VERIFIED | 1 | ✅ |
| 2 | UC-CRUD-LEAVE-001 | P1 | /me/leave | EMP | submit button silent, no toast | LeaveForm.tsx:112 | await mutate().then(toast) | VERIFIED | 1 | ✅ |
```

### Sheet invariants

- Columns are fixed — never add/remove during a run.
- Each row is a unique `(UC, Symptom)` pair. Duplicates are rejected by Bug Validator.
- Status transitions are one-way:
  `OPEN → FIXING → COMPILED → VERIFIED` or
  `OPEN → REJECTED` (Developer Lead) or
  `OPEN → UNRESOLVED` (after 3 tries).
- Run exits clean only when every row is `VERIFIED` or `REJECTED`/`UNRESOLVED` with P3 severity.

### Zero-bug exit — requires a CLEAN SWEEP

The skill does **not** exit the moment open-bug count hits zero. Termination
requires one additional iteration that produces **zero new bugs** and applies
**zero fixes** — proof the system is stable after the last fix.

- `SKILL_EXIT: ok` — latest iteration:
  (1) every row VERIFIED/REJECTED; (2) full catalog ran; (3) `new_rows=0` AND `fixes_applied=0`.
- `SKILL_EXIT: partial` — MAX_ITERATIONS/time exhausted; P0/P1 all VERIFIED, some P2/P3 UNRESOLVED.
- `SKILL_EXIT: failed` — any P0 OPEN/UNRESOLVED at termination, OR the clean-sweep iteration introduced new bugs (regression loop).

In practice: minimum 1 iteration on a clean system (the mandatory clean sweep),
otherwise N+1 where iteration N fixed the last bug and N+1 confirms no
regressions.

---

## Parallel validation — ONE login, MANY tabs

Key constraint: don't thrash auth. Batch by role, parallelize routes within that role.

```
For each role R:
  login once as R
  open 5 Chrome MCP tabs sharing the session cookie
  distribute R's ~62 routes across 5 tabs (~13 per tab)
  run all 5 tabs in parallel
  wait for join
  logout
  pause 15s
```

**Rules**:

- **One role at a time** (not one role per tab). Auth rate limit is per-login attempt.
- **5 tabs per role** sharing the same cookie (Chrome MCP supports multi-tab on one session; Playwright fallback uses 5 `browserContext` instances with shared storage state).
- **Routes batched evenly** across tabs.
- **15s pause between role switches**.

Math: 9 logins per iteration total, 5-way parallelism per role, ~5× speedup over serial.

---

## Iteration loop (authoritative)

```
iteration = 0
while iteration < MAX_ITERATIONS and duration_remaining > 0:

  new_rows_this_iter = 0
  fixes_applied_this_iter = 0

  [Orchestrator] pick work:
    - if any OPEN/FIXING/COMPILED rows → run ONLY those UCs (fast recheck)
    - else → run the FULL catalog for this mode (clean-sweep candidate)

  [QA] for each role in scope:
    login once; open 5 tabs; distribute UCs; run in parallel
    collect PASS/FAIL into temp buffer
    logout; pause 15s

  [Bug Validator] for each FAIL:
    re-run alone to confirm (reject flakes)
    dedupe against existing sheet rows
    append confirmed row Status=OPEN
    new_rows_this_iter++

  [QA Lead] for each OPEN row:
    assign Sev + define done-criterion

  [Developer Lead] for each OPEN row in severity order:
    read root-cause file; write ≤80-char Fix column
    if fix > 3 lines OR new file OR new abstraction → Status=REJECTED
    else → Status=FIXING

  [Developer] for each FIXING row:
    flock on root-file; apply minimal edit; release lock
    Status=COMPILED
    fixes_applied_this_iter++

  [Compiler & Composer] for each COMPILED row:
    tsc --noEmit + mvn compile -q
    if red: revert diff; Status=OPEN; row.Iter++; retry ≤ 3 times
    if green: wait 3s HMR; re-run the single UC
      if PASS: Status=VERIFIED; Verified=✅
      if FAIL: Status=OPEN; row.Iter++

  [Orchestrator] decide:
    if any P0 OPEN/UNRESOLVED and iteration == MAX_ITERATIONS: SKILL_EXIT: failed; break

    clean_sweep = (last_iteration_ran_full_catalog
                   AND new_rows_this_iter == 0
                   AND fixes_applied_this_iter == 0
                   AND no rows in OPEN/FIXING/COMPILED)
    if clean_sweep: SKILL_EXIT: ok; break

    iteration++

if any P0 OPEN/UNRESOLVED:  SKILL_EXIT: failed
elif any P1 OPEN/UNRESOLVED: SKILL_EXIT: failed
elif only P2/P3 UNRESOLVED:  SKILL_EXIT: partial
else:                         SKILL_EXIT: ok
```

### Live progress output

Two tailable files:

- `bug-sheet.md` — rewritten atomically by Composer after each row change.
- `trace.log` — one line per persona handoff:

```
[ORCH] iter=3 pending_ucs=42 open_bugs=0
[QA]   login SUPER_ADMIN ok, 5 tabs fan-out
[QA]   tab=1 UC-RBAC-001..013 complete, 13 PASS
[BV]   fail buffer=3, dedupe→2 confirmed
[QL]   BUG-014 P0, BUG-015 P1
[DL]   BUG-014 fix: add @RequiresPermission (1 line)
[DL]   BUG-015 fix: REJECTED — needs 12-line refactor, defer
[DEV]  BUG-014 edit PayrollController.java:67 applied
[CC]   tsc ok, mvn ok, HMR settled, requeue UC-RBAC-042
[QA]   UC-RBAC-042 re-run → PASS
[CC]   BUG-014 VERIFIED ✅
[ORCH] iter end: 0 open, 1 verified, exit ok
```

---

## Chrome DevTools MCP — tool usage

Prefer Chrome MCP over Playwright when connected:

```
1. mcp__claude-in-chrome__tabs_context_mcp({})                    → active tabs
2. mcp__claude-in-chrome__tabs_create_mcp({ url })                → new tab
3. mcp__claude-in-chrome__navigate({ tabId, url })                → nav
4. mcp__claude-in-chrome__read_page({ tabId })                    → DOM content
5. mcp__claude-in-chrome__read_console_messages({ tabId })        → console errors
6. mcp__claude-in-chrome__read_network_requests({ tabId })        → failed requests
7. mcp__claude-in-chrome__javascript_tool({ tabId, code })        → eval in page
8. mcp__claude-in-chrome__find({ tabId, selector })               → locate elements
9. mcp__claude-in-chrome__form_input({ tabId, selector, value })  → fill forms
10. mcp__claude-in-chrome__get_page_text({ tabId })               → text content
```

All 10 tools must be loaded via `ToolSearch` before first use, as they are
deferred MCP tools.

---

## Error handling

| Scenario                | Action                                      |
|-------------------------|---------------------------------------------|
| Service not running     | Attempt to start; abort if > 120s to health |
| Login fails             | Abort entire loop — auth is prerequisite    |
| Rate limit 429          | Wait 60s, retry                             |
| Fix causes TS errors    | Revert immediately; try alternative once    |
| Fix breaks other routes | Revert; mark UNRESOLVED                     |
| Network timeout         | Retry once; then mark infrastructure issue  |
| Chrome MCP disconnect   | Fall back to Playwright for remaining cases |
| Git lock file           | Remove `.git/HEAD.lock` and retry commit    |

---

## Example invocations

```
/nu-chrome-e2e                               # full sweep
/nu-chrome-e2e --rbac                        # 765 access/deny cases
/nu-chrome-e2e --crud                        # 47 interactive journeys
/nu-chrome-e2e --module leave                # ~15 leave cases
/nu-chrome-e2e --route /payroll              # single route, all authorized roles
/nu-chrome-e2e --uc UC-RBAC-042              # replay one case
```

---

## Files in this skill

```
.claude/skills/nu-chrome-e2e/
├── SKILL.md                          # this file
├── use-cases.yaml                    # 900-entry catalog
├── generate-rbac-cases.sh            # regenerates UC-RBAC-* from matrix
├── sheet-template.md                 # bug sheet header template
├── run.sh                            # entry point, parses mode flags
└── personas/
    ├── orchestrator.sh
    ├── qa.sh
    ├── bug-validator.sh
    ├── qa-lead.sh
    ├── dev-lead.sh
    ├── developer.sh
    └── compiler-composer.sh
```
