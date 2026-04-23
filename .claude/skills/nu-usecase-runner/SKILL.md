---
name: nu-usecase-runner
description: Agentic team (Orchestrator + QA pool + Dev pool) that executes NU-AURA's canonical 1500+ use-case catalog (docs/qa/use-cases.yaml), captures rich Chrome validation notes per UC, and auto-fixes P0/P1 findings. Parallelism at every safe layer — 9 QA subagents concurrent for RBAC/CRUD, 2 Dev subagents concurrent for fixes, 1 static-check subagent, parent owns Chrome MCP. Fully autonomous.
---

# nu-usecase-runner

**Agentic team** that consumes the canonical use-case catalog and produces a
release-readiness verdict. Three role-archetypes, all coordinated by a parent
Orchestrator:

```
                       ┌─────────────────────────┐
                       │     ORCHESTRATOR        │
                       │  (parent conversation)  │
                       │  • parses catalog       │
                       │  • stratifies plan      │
                       │  • dispatches pools     │
                       │  • aggregates notes     │
                       │  • Chrome MCP owner     │
                       └────────────┬────────────┘
         ┌───────────────┬──────────┼──────────┬─────────────────┐
         ▼               ▼          ▼          ▼                 ▼
   ┌───────────┐   ┌───────────┐  ┌───────┐  ┌───────────┐  ┌───────────┐
   │ QA POOL   │   │ QA POOL   │  │ ...   │  │ STATIC    │  │ DEV POOL  │
   │ role=A    │   │ role=B    │  │ 9×    │  │ CHECKS    │  │ pool≤2    │
   │ curl+bash │   │ curl+bash │  │ roles │  │ grep+ast  │  │ flock+fix │
   │ tester    │   │ tester    │  │       │  │ tester    │  │ coder     │
   └───────────┘   └───────────┘  └───────┘  └───────────┘  └───────────┘
   │  Phase C (parallel, 1 msg) │            │  Phase C  │  │  Phase F  │
```

---

## Team roles

### Orchestrator (parent conversation)
- **Owns**: Chrome MCP, bug sheet, all JSONL merges, decision gates.
- **Runs serially**: browser-driven UCs that need a real DOM (forms, journeys, module smoke). Subagents can't inherit the Chrome MCP connection — only the parent can drive it.
- **Runs in parallel**: dispatches QA pool (9 subagents, one per role) + Static pool (1 subagent) **in a single message** so they execute concurrently.
- **Never**: fixes code, writes to `fixes.jsonl`, or directly edits source.

### QA pool (9 × `subagent_type: tester`)
- **Fan-out**: one subagent per role.
- **Runs in parallel** — spawned from ONE assistant message.
- **Work per subagent**: read its slice of `uc-plan.jsonl`, log in once, curl every API/static UC in that slice, append one Validation Note per UC to `notes/<ROLE>.jsonl`, return a ≤200-word summary.
- **Never**: touches source code, opens a browser, installs packages.

### Static-check pool (1 × `subagent_type: tester`)
- **Runs alongside** the 9 QA agents (same dispatch message — 10 concurrent subagents total).
- **Work**: grep-based checks (design-system tokens, missing `@RequiresPermission`, secret leak scan). No login needed.
- **Writes**: `notes/static.jsonl`.

### Dev pool (≤ 2 × `subagent_type: coder`, dispatched in Phase F)
- **Concurrency = 2**: one frontend fixer + one backend fixer (file-lock enforced, so two can never edit the same file).
- **Runs in parallel** — spawned in one assistant message when multiple P0/P1 bugs land.
- **Work per subagent**: read the bug JSON, apply ≤ 3-line minimal edit, run `tsc --noEmit` (frontend) or `mvn -q compile` (backend), return JSON verdict. On red → revert diff.
- **Never**: writes new files, adds deps, rewrites >3 lines, bypasses compile gate.

---

## Known credential issues (roles with caveats)

| Role | Email | Status | Handling |
|---|---|---|---|
| SUPER_ADMIN | fayaz.m@nulogic.io | ✅ valid | — |
| TENANT_ADMIN | sarankarthick.maran@nulogic.io | ⚠️ **login returns 401** in current DB (password drift or account disabled) | Subagent writes one `login_failed` JSONL row and exits 0. Orchestrator marks the slice `BLOCKED` and continues with other 8 roles. |
| HR_ADMIN / HR_MANAGER / FINANCE_ADMIN | jagadeesh@nulogic.io | ⚠️ shared account — server binds role `HR_MANAGER` | Treat `FINANCE_ADMIN` and `HR_ADMIN` probes as HR_MANAGER in the aggregator. Shared-credential artifacts aren't real bugs. |
| MANAGER | sumit@nulogic.io | ✅ valid | — |
| TEAM_LEAD | mani@nulogic.io | ✅ valid | — |
| EMPLOYEE | saran@nulogic.io | ✅ valid | Most important role for RBAC-leak detection. |
| RECRUITMENT_ADMIN | suresh@nulogic.io | ✅ valid | — |

When any slice fails to log in, the Orchestrator does **not** abort the run —
login-fail is a per-slice partial, not a global failure. Overall exit code is
`partial` if any slice is `BLOCKED`, `ok` only if all 9 slices completed plus
zero real P0s.

## Autonomy contract

- Zero prompts to operator.
- Reuses `nu-chrome-e2e` Bootstrap Medic verbatim for stack-up.
- Stratified sampling under a time budget so the parent always finishes.
- Self-healing: 503 sentinel → parent restarts frontend; subagent timeout → parent re-dispatches once.
- Exit codes: `ok | partial | failed` with machine-readable `[ROLLUP]`.

---

## Invocation

```
/nu-usecase-runner                          # --smoke (default; ~100 UCs, ~10 min)
/nu-usecase-runner --full                   # 1561 UCs; needs compaction — use with care
/nu-usecase-runner --category=RBAC          # just RBAC UCs
/nu-usecase-runner --role=EMPLOYEE          # every UC where actor/role == EMPLOYEE
/nu-usecase-runner --no-fix                 # probe only; skip Dev pool
/nu-usecase-runner --uc=UC-WF-0001,UC-WF-0002   # ad-hoc list
```

---

## Phase plan (what the Orchestrator executes)

### Phase A — Bootstrap (serial)
Inherit `.claude/skills/nu-chrome-e2e/SKILL.md` "Bootstrap Phase + Medic".
All 5 health gates green before advancing.

### Phase B — Stratify (serial, ~1s)
```bash
python3 .claude/skills/nu-usecase-runner/lib/stratify.py \
   --mode=smoke --out=<run_dir>/uc-plan.jsonl
```
Produces one JSON line per scheduled UC with `run_mode` ∈ {api, browser, static}.

### Phase C — Parallel dispatch: **10 subagents in ONE message**
Single assistant message with **10 `Agent` tool uses**:
- 9 × `tester` — one per role, prompt = `subagents/qa-api-prompt.md`
- 1 × `tester` — static checks, prompt = `subagents/static-prompt.md`

All 10 run concurrently. Each writes its own JSONL (no contention — separate files).

### Phase D — Parent browser sweep (serial, parent only)
For every `run_mode: browser` UC in the plan:
1. `mcp__claude-in-chrome__navigate` → wait network-idle.
2. One `javascript_tool` call returns all Chrome notes in one round-trip (see Capture Helper below).
3. `mcp__claude-in-chrome__read_console_messages({pattern:"error|warning", clear:true})` — counts.
4. Append Validation Note to `notes/browser.jsonl`.

Parent handles these serially because the Chrome MCP is a single-connection resource.

### Phase E — Aggregate (serial, ~1s)
Concatenate `notes/*.jsonl` → `validation-notes.jsonl`. Compute per-category pass rates.
Extract failing rows (P0/P1 only, by default) into `fix-queue.jsonl`.

### Phase F — Parallel Dev pool (if `--no-fix` not set and P0/P1 present)
Single assistant message with **up to 2 `Agent` tool uses** (`coder`):
- Dev #1: takes next frontend bug from `fix-queue.jsonl`.
- Dev #2: takes next backend bug from `fix-queue.jsonl`.

Prompt = `subagents/dev-prompt.md`. Each subagent:
- `flock`s the target file (path hashed into lock name).
- Applies ≤ 3-line edit.
- Compiles; reverts on red.
- Returns JSON verdict.

When both return, Orchestrator re-queues the fixed UCs for retest in Phase G.

### Phase G — Parallel re-verify
If fixes landed, dispatch the same QA pool for ONLY the fixed UCs (same message, 1–9 subagents depending on which roles own the fixed UCs). Parent re-runs browser UCs affected by the fix.

### Phase H — Report + exit
```
[ROLLUP] executed=N pass=X fail=Y skip=Z fixed=F verified=V p0_open=A p1_open=B
[REPORT] qa-reports/nu-usecase-runner/<run>/report.md
SKILL_EXIT: ok|partial|failed reason=<short>
```

---

## Parallelism summary (what runs concurrently)

| Phase | Parallel units | Serial because |
|---|---|---|
| A Bootstrap | 4 health gates probed in parallel | Docker restart is serial |
| B Stratify | — | Single script, <1s |
| **C QA + Static** | **10 subagents** (9 role + 1 static) | — |
| D Browser | — | Chrome MCP is a single connection |
| E Aggregate | — | File merge |
| **F Dev** | **≤ 2 subagents** (1 FE + 1 BE) | File-lock safety |
| **G Re-verify** | **≤ 9 subagents** | — |
| H Report | — | — |

Peak concurrency: **10 subagents** (Phase C). Steady concurrency through
C + D (D happens after C returns, so not simultaneous). Fix/verify cycles in
F + G happen after the initial sweep.

---

## Validation Note schema

Every executed UC produces exactly one JSON line on this schema. Browser UCs
fill `chrome_notes`; API/static fill `api_notes` or `static_notes`.

```json
{
  "uc_id": "UC-JRN-0042",
  "category": "JOURNEY",
  "executed_at": "2026-04-23T19:30:00Z",
  "duration_ms": 1820,
  "mode": "browser|api|static",
  "actor_role": "EMPLOYEE",
  "route_or_endpoint": "/me/leave",
  "verdict": "PASS|FAIL|SKIP|BLOCKED",
  "severity_on_fail": "P1",
  "expected": { "http": 200, "render_key": "h1=My Leaves" },
  "observed": { "main_doc_status": 200, "url_final": "/me/leave" },
  "chrome_notes": {
    "title": "NU-AURA …",
    "h1": ["My Leaves"],
    "h2": ["Current balance", "Pending requests"],
    "body_chars": 1284,
    "blank_page": false,
    "error_boundary": false,
    "empty_state": false,
    "console_errors_count": 0,
    "console_errors_sample": [],
    "console_warnings_count": 1,
    "network_failures": [],
    "network_slow_over_3s": [{"url":"/api/v1/leaves/me","ms":3412}],
    "banned_design_tokens": [],
    "raw_hex_in_inline_styles": [],
    "icon_buttons_missing_aria": 0,
    "focus_ring_present": true,
    "screenshot": null,
    "viewport": "864x869"
  },
  "api_notes": null,
  "static_notes": null,
  "retry_count": 0,
  "fix_attached": null
}
```

---

## Chrome capture helper (parent runs this on every browser UC)

Inline one `javascript_tool` call that returns every signal in a single
round-trip — no per-field navigations, no extra read_page calls:

```javascript
(()=>{
  const bad=['bg-white','text-gray-','bg-slate-','bg-blue-','sky-','rose-','amber-','emerald-','shadow-sm','shadow-md','shadow-lg'];
  const html=document.body.innerHTML;
  const banned=bad.filter(t=>html.includes(t));
  const text=document.body.innerText||'';
  const h1=[...document.querySelectorAll('h1')].map(e=>e.innerText).slice(0,3);
  const h2=[...document.querySelectorAll('h2')].map(e=>e.innerText).slice(0,5);
  const iconBtns=[...document.querySelectorAll('button')].filter(b=>!b.innerText.trim()&&!b.getAttribute('aria-label')).length;
  const perf=performance.getEntriesByType('resource')
    .filter(r=>r.name.includes('/api/')||r.name.includes(':8080'))
    .map(r=>({u:r.name.replace('http://localhost:8080',''),ms:Math.round(r.duration)}));
  const slow=perf.filter(e=>e.ms>3000);
  const rawHex=[...document.querySelectorAll('[style]')]
    .map(e=>e.getAttribute('style'))
    .filter(s=>/#[0-9a-fA-F]{3,8}/.test(s)).slice(0,5);
  return {
    url_final:location.pathname, title:document.title, h1, h2,
    body_chars:text.length,
    blank_page:text.length<50,
    error_boundary:text.includes('Something went wrong')||text.includes('Application error'),
    banned_design_tokens:banned,
    raw_hex_in_inline_styles:rawHex,
    icon_buttons_missing_aria:iconBtns,
    viewport:innerWidth+'x'+innerHeight,
    network_slow_over_3s:slow.slice(0,10)
  };
})()
```

Follow with:
```
mcp__claude-in-chrome__read_console_messages({
  pattern: "error|warning", onlyErrors:false, limit:20, clear:true
})
```
and merge both into `chrome_notes`.

---

## File ownership (prevents pool collision)

| Who | Writes | Never touches |
|---|---|---|
| Orchestrator | `uc-plan.jsonl`, `validation-notes.jsonl` (merge only), `fix-queue.jsonl`, `report.md`, `bug-sheet.md`, `notes/browser.jsonl` | subagent note files |
| QA pool | `notes/<ROLE>.jsonl`, `cookies/<ROLE>.jar` | source code, other subagent's files |
| Static pool | `notes/static.jsonl` | source code |
| Dev pool | source files under `frontend/` + `backend/`, `fixes.jsonl` | note files |

Locks live in `<run_dir>/locks/<md5(path)>.lock` — used only by Dev pool.

---

## Outputs

```
qa-reports/nu-usecase-runner/<YYYY-MM-DD-HHMM>/
├── bootstrap.log
├── uc-plan.jsonl                  # Phase B
├── cookies/                       # per-role jars (QA pool)
├── notes/
│   ├── SUPER_ADMIN.jsonl
│   ├── TENANT_ADMIN.jsonl
│   ├── … (9 roles)
│   ├── static.jsonl
│   └── browser.jsonl              # parent-written
├── validation-notes.jsonl         # merged single source of truth
├── fix-queue.jsonl                # P0/P1 fail rows
├── fixes.jsonl                    # Dev pool verdicts
├── bug-sheet.md                   # FAIL-only markdown
├── report.md                      # final verdict + stats
└── locks/                         # flocks used during Phase F
```

---

## Exit rules

- `ok` — every scheduled UC has a Validation Note; zero P0/P1 `FAIL`; no `BLOCKED`.
- `partial` — budget exhausted OR only P2/P3 `FAIL` left after fix loop.
- `failed` — ≥ 1 P0 `FAIL` unresolved OR Bootstrap aborted OR catastrophic subagent failure.

---

## Hard constraints

- **Catalog is read-only during a run** — regenerate via `python3 docs/qa/generate-use-cases.py`.
- **Never rerun a PASSing UC** in the same run (waste).
- **Subagents may NOT use Chrome MCP** — enforce `run_mode: browser` for parent only.
- **Dev pool edits ≤ 3 lines** per bug; compile-or-revert; no new files.
- **File-lock before edit**: `flock -w 30 <run_dir>/locks/$(echo <path> | md5sum | awk '{print $1}').lock`.
- **If same UC fails twice with identical evidence → `VERIFIED_FAIL`**; skip further retries in this run.

---

## See also

- Catalog: `docs/qa/use-cases.yaml` (1561 UCs)
- Generator: `docs/qa/generate-use-cases.py`
- Stratifier: `.claude/skills/nu-usecase-runner/lib/stratify.py`
- QA prompt: `.claude/skills/nu-usecase-runner/subagents/qa-api-prompt.md`
- Static prompt: `.claude/skills/nu-usecase-runner/subagents/static-prompt.md`
- Dev prompt: `.claude/skills/nu-usecase-runner/subagents/dev-prompt.md`
