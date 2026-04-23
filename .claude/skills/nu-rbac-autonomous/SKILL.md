---
name: nu-rbac-autonomous
description: Fully autonomous RBAC + QA orchestrator. Parent coordinates; parallel subagents probe each role via curl; dev subagents apply ≤3-line fixes; parent verifies via Chrome MCP. Designed to run unattended — no human prompts, self-pacing, self-healing. Uses the bootstrap + fallback infrastructure from nu-chrome-e2e.
---

# nu-rbac-autonomous

One skill, one verdict. Kicks off a fully autonomous QA + fix loop across all 9
roles without needing the operator to babysit. Complements `nu-chrome-e2e`
(browser-driven, single-session) — this one is **agentic**: the parent
orchestrates, subagents do the mechanical work in parallel, and the fix loop
closes itself.

---

## Why this exists (vs `nu-chrome-e2e`)

`nu-chrome-e2e` is a runbook for one LLM with a Chrome tab. 900 UCs × 9 roles
does not fit in one conversation's context. `nu-rbac-autonomous` solves that by:

1. **Splitting what actually needs a browser from what doesn't.** RBAC status
   matrices (403 vs 200 vs 302) are just HTTP — curl is faster and context-free.
   Only hydration, render, and interactive flows need Chrome. We do both.
2. **Dispatching subagents in parallel** — one per role for API probes, one per
   P0/P1 bug for the fix. Each subagent has its own context. The parent keeps
   only the bug sheet, not the transcripts.
3. **Verifying via Chrome MCP from the parent** — only the ~20 routes that
   subagents flag as suspicious get the expensive DOM-level check.

---

## Autonomy contract

Once invoked, the skill will:
- self-check + bootstrap the stack (reuses `nu-chrome-e2e`'s Bootstrap
  Medic — Docker → infra → backend → frontend → Chrome MCP);
- dispatch 9 **parallel QA subagents** (one per role) to probe the RBAC matrix;
- merge results into a single bug sheet;
- browser-verify the top flagged routes itself;
- for each confirmed P0/P1, dispatch a **dev subagent** with a scoped prompt
  ("change ≤3 lines at file:line to achieve Y");
- compile-verify (`tsc --noEmit` + `mvn compile -q`);
- re-probe the fixed route via curl AND browser;
- loop until clean or iteration cap.

**The parent never asks the user anything.** Hard rule.

---

## Roles × credentials

Identical to `nu-chrome-e2e` — do not diverge.

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | fayaz.m@nulogic.io | Welcome@123 |
| TENANT_ADMIN | sarankarthick.maran@nulogic.io | Welcome@123 |
| HR_ADMIN | jagadeesh@nulogic.io | Welcome@123 |
| HR_MANAGER | jagadeesh@nulogic.io | Welcome@123 |
| MANAGER | sumit@nulogic.io | Welcome@123 |
| TEAM_LEAD | mani@nulogic.io | Welcome@123 |
| EMPLOYEE | saran@nulogic.io | Welcome@123 |
| RECRUITMENT_ADMIN | suresh@nulogic.io | Welcome@123 |
| FINANCE_ADMIN | jagadeesh@nulogic.io | Welcome@123 |

Auth rate limit is 5 req/min **per IP**, not per role. Stagger the 9 logins
with ≥15s spacing (subagents coordinate via the lockfile described below).

---

## Architecture

```
┌───────────────────────────── Parent (this skill) ──────────────────────────────┐
│                                                                                │
│  Phase A: Bootstrap  (reuses nu-chrome-e2e Bootstrap Medic verbatim)           │
│       │                                                                        │
│  Phase B: Dispatch 9 QA subagents in ONE message (parallel)                    │
│       │                                                                        │
│       ▼                                                                        │
│     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ...         │
│     │ QA-SUPER_ADMIN  │  │ QA-EMPLOYEE     │  │ QA-HR_ADMIN     │              │
│     │ curl-logs-in    │  │ curl-logs-in    │  │ curl-logs-in    │              │
│     │ probes N routes │  │ probes N routes │  │ probes N routes │              │
│     │ returns JSON    │  │ returns JSON    │  │ returns JSON    │              │
│     └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│       │         │                │                      │                      │
│       └─────────┴────────────────┴──────────────────────┘                      │
│                              │                                                 │
│  Phase C: Aggregate → bug-sheet.md (atomic write)                              │
│                              │                                                 │
│  Phase D: Parent Chrome MCP browser-verifies top 20 suspicious rows            │
│                              │                                                 │
│  Phase E: For each confirmed P0/P1: dispatch 1 Dev subagent                    │
│                              │                                                 │
│     ┌─────────────────┐  ┌─────────────────┐                                   │
│     │ DEV-bug-042     │  │ DEV-bug-043     │  (max 2 concurrent — FE, BE)      │
│     │ flock file      │  │ flock file      │                                   │
│     │ ≤3-line edit    │  │ ≤3-line edit    │                                   │
│     │ tsc / mvn       │  │ tsc / mvn       │                                   │
│     │ returns diff    │  │ returns diff    │                                   │
│     └─────────────────┘  └─────────────────┘                                   │
│                              │                                                 │
│  Phase F: Parent re-probes fixed routes (curl + Chrome)                        │
│                              │                                                 │
│  Phase G: Loop to Phase B if any OPEN rows, else CLEAN SWEEP exit              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

Parallelism contract:
- Phase B: `9 parallel` — one `Agent` tool call per role in a single message.
- Phase E: `≤2 parallel` — one frontend, one backend, per the file-lock rule.
- All other phases are serial in the parent.

---

## Invocation

```
/nu-rbac-autonomous                    # full run, 9 roles × full endpoint list
/nu-rbac-autonomous --roles=EMPLOYEE,MANAGER   # subset
/nu-rbac-autonomous --no-fix           # probe-only, log bugs, skip dev subagents
/nu-rbac-autonomous --max-iters=3      # safety cap (default 5)
```

Zero args → full autonomous run.

---

## Parent execution plan (what you, the assistant, do on invocation)

Execute these phases **without asking for confirmation**, in order. Each phase
has an acceptance gate; don't advance until it passes.

### Phase A — Bootstrap
1. Read `.claude/skills/nu-chrome-e2e/SKILL.md` section "Bootstrap Phase" +
   "Bootstrap Medic" — execute it verbatim. Write to
   `qa-reports/nu-rbac-autonomous/<run>/bootstrap.log`.
2. Only advance when `[BOOT] summary: ... → proceed` is written.

### Phase B — Dispatch parallel QA subagents
In a **single assistant message**, issue 9 `Agent` tool calls — one per role —
with `subagent_type: tester`. Each prompt must be self-contained (see
`subagents/qa-prompt-template.md`). Key constraints per subagent:
- It does NOT drive a browser; it uses curl + Bash only.
- It must log in via `POST /api/v1/auth/login` and keep the cookie jar.
- It must respect a 15s delay before its own first request (to honor the global
  5/min auth limit). Use `sleep $(( (RANDOM % 10) + 15 ))` for natural jitter.
- It probes every row in `endpoints.yaml` for its role.
- It returns ONE JSON object: `{"role":"...","results":[{"endpoint":"...","method":"GET","status":200,"expected":403,"verdict":"FAIL"}, ...]}`.

### Phase C — Aggregate
1. Collect all 9 JSON blobs from the subagents.
2. Any `verdict:FAIL` row becomes a candidate bug.
3. Deduplicate by `(endpoint, role)`.
4. Atomically write `qa-reports/nu-rbac-autonomous/<run>/bug-sheet.md` from
   the template in this directory.

### Phase D — Browser verify (parent only)
1. Via Chrome MCP, log in once per unique-role-of-a-failing-row.
2. Navigate to the failing route.
3. Run the three-verification check from `nu-chrome-e2e`:
   URL / DOM / negative-API.
4. If all three agree with the candidate → promote to CONFIRMED. If any
   disagree (e.g. route returns 403 to curl but renders correctly in the
   browser due to session cookie differences) → mark FLAKY and demote to P3.

### Phase E — Dispatch Dev subagents
For each CONFIRMED P0 or P1:
1. Locate the root-cause file. For RBAC leaks the pattern is either a missing
   `@RequiresPermission` in `backend/src/main/java/com/hrms/api/**Controller.java`
   or a missing route guard in `frontend/app/**/page.tsx`.
2. Dispatch ONE `Agent(subagent_type: coder)` per bug with the prompt from
   `subagents/dev-prompt-template.md`. Hard constraints in the prompt:
   - Change **≤ 3 lines**.
   - No new files, no new abstractions.
   - `flock` the file before editing (path: `qa-reports/nu-rbac-autonomous/<run>/locks/`).
   - Run `tsc --noEmit` (frontend fixes) or `mvn -q compile` (backend fixes).
   - On compile red → revert and return `{"status":"reverted","reason":"..."}`.
3. Max 2 concurrent dev subagents (1 FE + 1 BE).

### Phase F — Verify fixes
1. Re-run the curl probe for just the fixed endpoints (no full sweep).
2. Re-run the Chrome MCP check for just those routes.
3. Update the bug-sheet row status accordingly:
   - PASS both → VERIFIED
   - Fails either → revert the dev diff, mark UNRESOLVED, row.Iter++

### Phase G — Loop
- If any OPEN/UNRESOLVED P0 and `iter == max_iters` → `SKILL_EXIT: failed`.
- If every row VERIFIED/REJECTED and no new rows → `SKILL_EXIT: ok`.
- Else increment iter and return to Phase B.

---

## Endpoint matrix

The authoritative role × endpoint table lives in
`.claude/skills/nu-rbac-autonomous/endpoints.yaml`. Each row:

```yaml
- endpoint: /api/v1/payroll/runs
  method: GET
  expected:
    SUPER_ADMIN: 200
    TENANT_ADMIN: 200
    HR_ADMIN: 200
    HR_MANAGER: 200
    FINANCE_ADMIN: 200
    MANAGER: 403
    TEAM_LEAD: 403
    EMPLOYEE: 403
    RECRUITMENT_ADMIN: 403
```

Any deviation is a bug. Severity:
- P0: lower privilege got `200` where table says `403` or `302` (RBAC leak).
- P1: higher privilege got `403` where table says `200` (broken access).
- P2: `500` (server error).
- P3: `404` on an expected endpoint (path drift — worth logging, not blocking).

---

## File layout per run

```
qa-reports/nu-rbac-autonomous/<YYYY-MM-DD-HHMM>/
├── bootstrap.log
├── bug-sheet.md           # atomic single source of truth
├── probe-results/         # one <role>.json per subagent
├── locks/                 # flock files for dev subagents
├── screenshots/           # optional, from Phase D
└── report.md              # terminal summary
```

---

## Constraints the parent must never violate

- **No user prompts.** If a step is ambiguous, take the safer-of-two-alternatives
  action and note it in `report.md`. The operator is AFK.
- **No destructive git.** Fixes happen in-place; if the fix fails after 3
  retries the diff is reverted, not committed.
- **No new npm / maven deps** — if a fix needs one, it's out of scope, mark
  the bug REJECTED with reason.
- **Do not rerun a passing probe** in the same iteration — wastes context.
- **When a subagent times out** (> 180s), treat its role as UNTESTED and
  re-dispatch once. Second timeout → mark role SKIPPED and continue with the
  other 8.

---

## Exit protocol

Final message of the run — emit all three:

```
[ROLLUP] iterations=N p0_open=X p1_open=Y verified=Z rejected=W flaky=V
[REPORT] qa-reports/nu-rbac-autonomous/<run>/report.md
SKILL_EXIT: ok|partial|failed reason=<one-sentence>
```

No closing prose after `SKILL_EXIT:`. That line is the machine-readable
verdict.
