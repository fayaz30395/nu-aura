---
name: nu-aura-qa-dev-loop
description: Validation-hardened QA + DEV parallel loop for NU-AURA. Three concurrent agent pools (qa-chrome, dev-fixer, orchestrator) coordinate via append-only JSONL files with strict file-ownership rules. Enforces per-page console/network/a11y/design-system/RBAC checks, independent orchestrator re-verification, and explicit exit gates (tsc baseline, build pass, zero regressions, git clean). Runs fully autonomous — no operator prompts.
---

# nu-aura-qa-dev-loop

The v2 Validation-Hardened QA+DEV Parallel Loop, persisted as a skill.
Three concurrent roles coordinated through append-only JSONL files with
strict file ownership so QA, DEV, and Orchestrator can never step on each
other.

---

## Three concurrent roles

| Role | Agent type | Writes | Reads |
|---|---|---|---|
| **qa-chrome** | parent (Chrome MCP) | `docs/qa/findings.jsonl`, `docs/screenshots/*`, `docs/qa/network/*` | `docs/qa/retest-queue.jsonl` |
| **dev-fixer** | `subagent_type: coder` (pool ≤2) | `docs/qa/fixes.jsonl`, source under `frontend/`+`backend/` | `docs/qa/findings.jsonl` (tail-byte-offset) |
| **Orchestrator** | parent (foreground) | `docs/qa/retest-queue.jsonl`, `docs/qa/loop-report.md` | both jsonls, every 90s |

Neither DEV nor QA touches `.next/`, `node_modules/`, or the other agent's log.

---

## Step 0 — Preflight (HARD GATES, fail-fast, all parallel)

```bash
# Services
curl -sf http://localhost:8080/actuator/health | jq -e '.status=="UP"' >/dev/null && echo "BACKEND: UP" || echo "BACKEND: DOWN"
curl -sI http://localhost:3000 | head -1 | grep -q "200\|304" && echo "FRONTEND: UP" || echo "FRONTEND: DOWN"

# CSRF surface (informational — nu-aura uses double-submit cookie)
curl -sf http://localhost:8080/api/v1/auth/csrf >/dev/null && echo "CSRF: OK" || echo "CSRF: skipped (double-submit cookie stack)"

# Baseline code health — establishes "no regressions introduced by DEV agent"
cd frontend && npx tsc --noEmit 2>&1 | tee /tmp/tsc-baseline.log | grep -c "error TS"

# Git clean-state checkpoint
git rev-parse HEAD > /tmp/qa-loop-baseline-sha
git status --porcelain > /tmp/qa-loop-baseline-dirty
```

Then:
```bash
mkdir -p docs/qa docs/screenshots docs/qa/network docs/qa/a11y
: > docs/qa/findings.jsonl
: > docs/qa/fixes.jsonl
: > docs/qa/retest-queue.jsonl
```

**Gate to proceed:** `BACKEND=UP`, `FRONTEND=UP`, tsc baseline error count recorded.

---

## Step 1 — Shared contracts

### Finding schema (`docs/qa/findings.jsonl` — one JSON per line, append-only)

```json
{
  "id": "BUG-2026-04-23-0001",
  "timestamp": "ISO-8601",
  "url": "/employees",
  "route_file_guess": "frontend/app/employees/page.tsx",
  "status": "PASS | PASS-EMPTY | FAIL | BUG | BLOCKED",
  "role_tested": "SUPER_ADMIN | HR_ADMIN | EMPLOYEE",
  "http": { "main_doc": 200, "api_calls": [{"url":"/api/v1/employees","status":200,"ms":142}] },
  "console": { "errors": [], "warnings": [] },
  "network_failures": [],
  "rbac": { "expected": "allow", "actual": "allow", "violation": false },
  "a11y": { "missing_aria_label": 0, "contrast_fail": 0, "focusable_without_outline": 0 },
  "design_system": { "banned_tokens": [], "raw_hex": [], "disallowed_shadows": [] },
  "visual": { "blank_page": false, "layout_broken": false, "notes": "" },
  "screenshot": "docs/screenshots/employees-hradmin.png",
  "retest_of": null,
  "severity": "P0 | P1 | P2 | P3"
}
```

### Fix schema (`docs/qa/fixes.jsonl`)

```json
{
  "bug_id": "BUG-2026-04-23-0001",
  "file": "frontend/app/employees/page.tsx",
  "root_cause": "…",
  "diff_summary": "…",
  "verifications": {
    "tsc": "pass",
    "eslint": "pass",
    "unit_test": "pass|skipped|n/a",
    "permission_annotation": "present|n/a",
    "design_tokens_ok": true
  },
  "commit_sha": "…",
  "status": "FIXED | NEEDS-REVIEW | REVERTED",
  "retest_requested": true
}
```

### File ownership (HARD rule)

- QA writes only: `docs/qa/findings.jsonl`, `docs/screenshots/*`, `docs/qa/network/*`
- DEV writes only: `docs/qa/fixes.jsonl`, source files under `frontend/`+`backend/`
- Orchestrator writes only: `docs/qa/retest-queue.jsonl`, `docs/qa/loop-report.md`

---

## Step 2 — Launch three agents in ONE message

### Agent 1 — qa-chrome (background, parent owns Chrome MCP)

Per-page validation checklist (all recorded in one finding):

1. Navigate → wait for network-idle (max 15 s; not a blind sleep).
2. Main-doc HTTP status must be 200 (flag 500/404/503).
3. `mcp__claude-in-chrome__read_console_messages` — capture errors AND warnings, dedupe.
4. `mcp__claude-in-chrome__get_network_requests` — flag ≥400, >3000 ms, CORS/CSRF fails.
5. Full-page screenshot → `docs/screenshots/{route-slug}-{role}.png`.
6. **Page-text heuristics**
   - Blank page = `body.innerText.length < 50` AND `!main > *`
   - Error boundary = text contains `"Something went wrong"` / `"Application error"`
   - Empty state = contains configured empty-state copy
7. **Design-system lint** (regex on rendered DOM / computed styles)
   - Banned classes: `bg-white`, `text-gray-*`, `bg-slate-*`, `bg-blue-*`, `shadow-sm|md|lg`
   - Raw hex colors in `style=` attributes
   - Icon-only buttons without `aria-label`
   - Interactive elements without `cursor-pointer`
8. **A11y** — tab through first 10 focusables; any without visible outline = fail.
9. **RBAC matrix** (run once per role — SUPER_ADMIN, HR_ADMIN, EMPLOYEE):

   | Route | SUPER_ADMIN | HR_ADMIN | EMPLOYEE |
   |---|---|---|---|
   | `/admin` | allow | deny | deny |
   | `/payroll/runs` | allow | allow | deny |
   | `/recruitment` | allow | allow | deny |
   | `/me/profile` | allow | allow | allow |

10. Append one JSONL line per finding (never overwrite). Flush after each page.

**Retest handshake**: before starting a new page, read `docs/qa/retest-queue.jsonl` and prioritize queued retests. Mark finding with `"retest_of": "<original-id>"`.

**Recovery rules**
- Nav timeout → try `window.location.assign(url)`; if still fails, log `BLOCKED` not `FAIL`.
- 503 on CSS → wait 10 s, retry once; if still 503 → touch `docs/qa/SIGNAL-503` sentinel.
- Every 5 pages: hard reload + clear in-memory state.

### Agent 2 — dev-fixer (background, `subagent_type: coder`, pool ≤2)

**Before touching code**
- Poll `docs/qa/findings.jsonl` every 20 s (track byte offset; don't reprocess).
- Skip any finding where `retest_of != null` AND a `FIXED` entry already exists for `bug_id`.
- Only accept P0/P1 automatically; queue P2/P3 in a batch.

**Fix workflow (strict order, abort on failure)**
1. `git status` — abort if dirty from an unfinished fix.
2. Read the file (never blind-edit).
3. Classify root cause into one category:
   `console-error | rbac-gate-missing | blank-page-data | hydration-mismatch | design-violation | type-error | api-contract | permission-annotation-missing`
4. Apply minimal edit (per CLAUDE.md rule: *"Read before writing — never rewrite"*).

**Validation stack** (ALL must pass before logging `FIXED`)

```bash
# Frontend fix
cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS"   # must equal baseline
cd frontend && npx eslint <changed-file> --max-warnings=0
cd frontend && npx prettier --check <changed-file>
# Design-system guard on the changed file
! grep -E "bg-(white|gray|slate|blue|sky|rose|amber|emerald)-|shadow-(sm|md|lg)\b|#[0-9a-fA-F]{3,8}" <changed-file>

# Backend fix
cd backend && mvn -q -pl . -am compile
cd backend && mvn -q test -Dtest=<RelatedTest>   # if test exists
# Permission guard: every new @*Mapping must carry @RequiresPermission
```

Then:
- If fix touches a controller → verify `@RequiresPermission("module.action")` present.
- If fix touches an entity/migration → next Flyway version is `V129+` per CLAUDE.md.
- Commit with `fix(module): <bug-id> <summary>` — one bug per commit.
- Append to `docs/qa/fixes.jsonl` with `retest_requested: true`.

**Never do**
- `git add -A` (risks `.env`).
- Introduce a new axios instance, npm package, or any `any` type.
- Rewrite a file wholesale.
- `--no-verify` on commits.

If validation fails twice in a row → `git restore` the file, log `NEEDS-REVIEW`, move on.

### Agent 3 — Orchestrator (YOU, foreground)

**Monitoring loop every 90 s**

1. **Ingest** (O(1) append-only reads):
   ```bash
   wc -l docs/qa/findings.jsonl docs/qa/fixes.jsonl
   ```
2. **Cross-reference**: each `FIXED` fix with `retest_requested:true` and no matching `retest_of` finding yet → append to `docs/qa/retest-queue.jsonl`.
3. **Regression detection**: if a `PASS` page later turns `FAIL` after a fix landed → flag `REGRESSION (P0)` and send revert instruction to DEV.
4. **Health probes**: re-run Step 0.1 every cycle. If `docs/qa/SIGNAL-503` OR tsc baseline error count increased → restart frontend:
   ```bash
   lsof -ti:3000 | xargs -r kill -9
   rm -rf frontend/.next
   cd frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &
   until curl -sf http://localhost:3000 >/dev/null; do sleep 2; done
   rm -f docs/qa/SIGNAL-503
   ```

**Progress table (print each cycle)**
```
┌──────────┬────────┬──────┬─────────┬──────┬──────┬────────┬────────┬───────┬─────────┐
│ Phase    │ Tested │ Pass │ P-Empty │ Fail │ Bugs │ Fixed  │ Retest │ Regr. │ NeedsRv │
├──────────┼────────┼──────┼─────────┼──────┼──────┼────────┼────────┼───────┼─────────┤
│ Core     │  12/20 │   9  │    2    │  1   │  3   │   2    │   1    │   0   │    1    │
│ RBAC     │   6/12 │   5  │    0    │  1   │  1   │   1    │   0    │   0   │    0    │
└──────────┴────────┴──────┴─────────┴──────┴──────┴────────┴────────┴───────┴─────────┘
TSC: baseline=0 current=0 | Build: not-yet-run | Services: BE✓ FE✓
```

**SendMessage cadence**
- To QA only when the retest queue has items or a 503 restart occurred.
- To DEV only if `fixes.jsonl` hasn't advanced in 5 min despite pending P0/P1 bugs.
- Never spam either agent with "status update" every cycle.

**Exit criteria — ALL must hold**
1. All routes in the test list have a finding (not `BLOCKED`).
2. Every `FAIL`/`BUG` has a matching `FIXED` or `NEEDS-REVIEW`.
3. Every `FIXED` has a green retest entry.
4. `tsc` error count ≤ baseline.
5. `npm run build` passes (run once, at the end).
6. Zero `REGRESSION` entries unresolved.
7. No uncommitted changes (`git status --porcelain` empty).

---

## Step 3 — Final validation battery (Orchestrator, independent re-verification)

Don't trust the agents' self-reports — verify:

```bash
# Code correctness
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npm run build 2>&1 | tee /tmp/build.log
cd backend && mvn -q test

# Security / convention guards
grep -rE "bg-(white|gray|slate|blue)-|shadow-(sm|md|lg)\b" frontend/app frontend/components | grep -v node_modules | head -50
grep -rnE "@(Get|Post|Put|Delete)Mapping" backend/src/main/java | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  grep -q "@RequiresPermission" "$file" || echo "MISSING PERMISSION: $line"
done

# Agent discipline
git log --since="6 hours ago" --oneline | grep -vE "^[0-9a-f]+ (feat|fix|refactor)\(" && echo "NON-CONVENTIONAL COMMITS FOUND"
git log --since="6 hours ago" --stat | grep -E "\.env|credentials|\.pem" && echo "WARNING: secret-looking files touched"
```

---

## Step 4 — Report (`docs/qa/loop-report.md`)

```
=== QA+DEV Loop Report — YYYY-MM-DD ===
Duration: Xm | Pages tested: X/Y | Screenshots: Z
PASS: A | PASS-EMPTY: B | FAIL: C | BLOCKED: D
Roles exercised: SUPER_ADMIN, HR_ADMIN, EMPLOYEE

RBAC matrix: X/Y cells correct (list violations with route + role)

Bugs:
  P0: n fixed / n total
  P1: n fixed / n total
  P2–P3: queued, see fixes.jsonl

Regressions detected & resolved: n
Needs-Review: n (list with reasons)

Code Quality:
  tsc:   baseline=0 final=0 ✓
  lint:  0 errors, 0 warnings
  build: PASS (Xs)
  mvn test: PASS (X/Y, Zs)

Design system: 0 banned tokens introduced
Permission annotations: 100% coverage on new endpoints
===
```

---

## Key differences from v1 (informational)

| Area | v1 | v2 (this) |
|---|---|---|
| Findings format | Markdown headings | JSONL (machine-parseable, append-only) |
| Readiness gate | Curl checks | + baseline tsc, git SHA, CSRF probe |
| Per-page checks | Screenshot + console | + network status, a11y, design-system lint, full-page shot |
| RBAC | Spot checks | Explicit expected-vs-actual matrix across 3 roles |
| DEV validation | tsc only | + eslint + prettier + design-lint + permission-annotation guard |
| Coordination | Polling Markdown | File ownership + byte-offset tail + retest-queue handshake |
| Regression | Not detected | Explicit check when previously-passing page fails |
| Restart logic | Blind sleep | Poll until ready + 503 sentinel file |
| Exit | "All pages tested" | 7 measurable gates incl. build, regressions, git clean |
| Trust | Agents self-report | Orchestrator re-verifies independently |

---

## Invocation

```
/nu-aura-qa-dev-loop                         # run full loop
/nu-aura-qa-dev-loop --no-fix                # QA only (skip DEV pool)
/nu-aura-qa-dev-loop --routes=/payroll,/hr   # subset
/nu-aura-qa-dev-loop --role=EMPLOYEE         # single role
```

---

## Hard constraints

- **Retry budget**: a bug that fails validation twice is marked `NEEDS-REVIEW` — never a third attempt.
- **No spec-bypass**: DEV never uses `--no-verify`, `git add -A`, or introduces new deps.
- **No silent ignores**: every finding gets a fate (`FIXED` / `NEEDS-REVIEW` / `WONTFIX` / `DUP`) before exit.
- **Orchestrator re-verifies**: skip agents' self-reports; always re-run the independent validation battery before emitting the final report.
