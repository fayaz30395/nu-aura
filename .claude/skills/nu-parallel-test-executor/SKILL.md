---
name: nu-parallel-test-executor
description: Special parallel-execution agent that fans out a test plan across N subagents in ONE assistant message. Generic fan-out primitive — takes a plan file (JSONL of tasks) and a worker count, dispatches worker subagents concurrently, aggregates results. Designed to be composed with other skills (nu-usecase-runner, nu-aura-qa-dev-loop) as their execution engine.
---

# nu-parallel-test-executor

A focused parallel-dispatch primitive. Not an end-to-end QA skill — it's the
**execution engine** that other skills call when they need to fan N tasks out
to M subagents in one shot.

If you want an end-to-end QA run, use:
- `/nu-usecase-runner --full` — catalog-driven, 1561 UCs, uses this primitive internally.
- `/nu-aura-qa-dev-loop` — 3-role loop with DEV fixes, uses this primitive for QA fan-out.

Use this skill directly when you have a **bespoke** parallel test batch that
doesn't fit either wrapper.

---

## Contract

### Input
A JSONL plan file, one JSON object per line, with at least:
```json
{"task_id": "T-0001", "worker_key": "EMPLOYEE", "payload": {...}}
```
- `worker_key` groups tasks — tasks sharing a key run in the same subagent.
- `payload` is pass-through data the subagent needs to execute.

### Output
- One JSONL line per task in `<run_dir>/results/<worker_key>.jsonl`.
- Merged `<run_dir>/results.jsonl`.
- Terminal summary: `[ROLLUP] workers=N tasks=M pass=X fail=Y blocked=Z`.

### Parallelism guarantees
- **All workers dispatched in one assistant message** — real concurrent execution by the harness.
- **Max 10 workers per dispatch** (harness subagent limit + practical noise floor).
- **File isolation**: each worker writes only its own JSONL; no locks needed.

---

## Invocation

```
/nu-parallel-test-executor --plan=<path> [--workers=N] [--per-worker-budget=Nm]
```

- `--plan` — required, JSONL file path.
- `--workers` — default 10 (max), min 1. Must equal the number of distinct `worker_key`s.
- `--per-worker-budget` — default `3m`; hard upper bound on each subagent's runtime.

---

## Phase plan

### Phase A — Plan validate (serial, <1 s)

```bash
python3 .claude/skills/nu-parallel-test-executor/lib/validate-plan.py --plan=$PLAN
```

Checks: JSON-per-line valid, required fields present, ≤ 10 distinct `worker_key`s, no duplicate `task_id`s.

### Phase B — Fan-out (ONE assistant message, N Agent tool calls)

For each distinct `worker_key`, issue one `Agent(subagent_type: tester)` call.
Prompt template: `subagents/worker-prompt.md`. Each worker:

1. Reads its slice from the plan.
2. Executes tasks per payload semantics (worker is agnostic — it just runs the
   command or curl described in the payload).
3. Writes one JSONL result per task to `<run_dir>/results/<worker_key>.jsonl`.
4. Returns ≤ 200-word summary to Orchestrator.

### Phase C — Aggregate (serial)

```bash
cat <run_dir>/results/*.jsonl > <run_dir>/results.jsonl
python3 .claude/skills/nu-parallel-test-executor/lib/summarize.py --results=<run_dir>/results.jsonl
```

Emits per-worker pass/fail rollup + top-10 FAIL ids.

### Phase D — Exit

```
[ROLLUP] workers=<N> tasks=<M> pass=<X> fail=<Y> blocked=<Z>
SKILL_EXIT: ok|partial|failed reason=<short>
```

---

## Task payload semantics (what the worker sees)

The primitive is agnostic — it just dispatches. But workers need SOME shape
to execute. Convention for NU-AURA usage:

```json
{
  "task_id": "T-0001",
  "worker_key": "EMPLOYEE",
  "payload": {
    "kind": "curl_probe | bash_cmd | http_check",
    "login": {"email": "...", "password": "..."},
    "method": "GET | POST | ...",
    "url": "/api/v1/...",
    "expected_http": "200",
    "timeout_s": 12
  }
}
```

The worker script interprets `payload.kind` and executes accordingly. Other
callers can define their own `kind` values — the primitive doesn't care.

---

## Worker prompt (`subagents/worker-prompt.md`)

Stored verbatim so Orchestrator calls are deterministic. Key rules the worker
must obey:

- curl + bash only (no browser, no new deps).
- One login per worker (cached cookie jar) if payload demands it.
- Always flush partial results before budget cut-off.
- Exit 0 even on login-failure (parent treats slice as BLOCKED, continues).

---

## What this skill is NOT

- Not a QA catalog (that's in `docs/qa/use-cases.yaml`).
- Not a browser driver (parent-only; this primitive is curl/bash-only).
- Not a fixer (DEV pool lives in `/nu-aura-qa-dev-loop`).
- Not a stratifier (use `nu-usecase-runner/lib/stratify.py` to build plans).

---

## Compatibility with existing skills

| Caller | Uses this primitive as |
|---|---|
| `/nu-usecase-runner` | 10-way fan-out for Phase C (QA + Static pools) |
| `/nu-aura-qa-dev-loop` | 3-way dispatch for QA / DEV / Orchestrator |
| Ad-hoc plan files | Direct invocation |

---

## Hard constraints

- **One assistant message = one fan-out**. Never issue two dispatch rounds in the same turn.
- **Max 10 subagents**. Harness-enforced + practical.
- **No shared writes**. Each worker owns its own JSONL path.
- **Budget is a hard wall**. Workers that exceed `per-worker-budget` are considered PARTIAL; their in-flight results are still merged.
