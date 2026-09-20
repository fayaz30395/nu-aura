---
name: faylo-sdlc
description: Runs an engagement through the faylo-sdlc pipeline — 6 phases, 13 stages, 28 agents — from a one-line request to release, with the loop driven by `faylo next` / `faylo route` and every state change made by the faylo CLI. Humans drive; agents work.
disable-model-invocation: true
argument-hint: 'start "<one-line request>" | run | ticket <US-id> | observe <engagement-name>'
arguments: [command, request]
---

# faylo-sdlc

You were invoked as `/faylo-sdlc $command $request`. Only a human can invoke this skill
(`disable-model-invocation`) — the pipeline starts, resumes and stops on a human's say-so, never
on an agent's. `faylo-skill-handoff` governs every automatic stage transition below.

Orchestrates the subagents in `.claude/agents/faylo-*.md` against `faylo-sdlc/stage-registry.json`
(installed by `faylo init`). Per-stage prompts live in `stages/` and are read at runtime.

**Where you run.** In the product repo — the one with `faylo-sdlc/` and `.claude/settings.json`.
Every `faylo` command below assumes that is the working directory (`--root` otherwise).
Engagement documents go under `$FAYLO_WORKSPACE_ROOT/faylo-project-docs/2026/{engagement_name}/`
per `agents/_contracts/WORKSPACE-CONVENTION.md`; delivery state never leaves `faylo-sdlc/`.

## Usage

| Command | Does |
|---|---|
| `/faylo-sdlc adopt` | **Existing application?** Stage 00: `faylo adopt` inventories the repo and creates in-flight stories from unmerged branches and uncommitted work; the agents write the as-is documents (`stages/00-adopt.md`). Run once before the first `start`. `start` on a repo that has source code but no `faylo-sdlc/baseline.json` runs this first, automatically. |
| `/faylo-sdlc start "{one-line request}"` | Stage 01 (only if the request is ambiguous or provisionally async-review/hard-gate) → 02 → 03 → 04 → 05 → 06, back to back, all logged against the engagement's epic. Then continues into `run`. Interrupted during planning? Run `start` again with the same request: `faylo history --artifact-id <EP-id>` shows the last stage that logged `ok`; resume at the next one, don't redraft what exists. |
| `/faylo-sdlc run` | The loop: `faylo next` → work that story through Stages 07–12 → repeat, until `faylo next` says stop. This is the command to resume after any interruption. |
| `/faylo-sdlc ticket {ticket-id}` | One story, Stages 07–12, no loop. |
| `/faylo-sdlc observe {engagement-name}` | One Stage 13 pass on demand. |

## Brownfield: continuing from where the code is

After Stage 00, everything is a delta. Stages 02–05 read `artifacts/00-adopt/*` before drafting:
the BRD says what changes against `as-is-product.md`, the PRD amends `as-is-requirements.md` by
reference, Stage 05 uses `as-is-architecture.md` for blast radius. In-flight stories (`Origin:
in-flight`) are first in `faylo next`; a new story that touches the same area as an in-flight one
gets `faylo depends <new> --on <in-flight>` at Stage 08.

## The loop (`run`)

```
loop:
  faylo next                       # exit 0 → work; 3 → awaiting a human; 4 → all done; 5 → paused
  if exit != 0: report the JSON it printed and STOP. Do not work around it.
  story = <the returned story>; enter at its `resume_at` stage
  Stage 08 → 09 → (07 only if the 08/09 output flags a UI surface) → 10 → 11 → 12
                                   (each stage: read stages/NN-*.md and follow it exactly)
  iterations += 1
  if iterations >= max_stories_per_run (from `faylo next`): report and STOP.
```

`faylo next` tells you where to enter: `resume_at` is derived from the story's status and its last
ledger event (`last_event`), so a `Verified` story goes straight to Stage 12 and a story interrupted
mid-stage resumes in that stage. Never restart a story from Stage 08 because a session ended.
Before the first `faylo next` of a session, `faylo status` and `faylo history --limit 20` give the
overall picture.

**Every stage** begins with `faylo log <stage> <owning-agent> <id> started` and ends with
`faylo log <stage> <owning-agent> <id> ok` — `<id>` is the epic for Stages 01–06 and the story for
07–12. When the stage's `faylo` command exits non-zero,
or a specialist's output fails the stage's contract, run **`faylo route <stage> <story-id> --note
"<what failed>"`** and do what it says: `retry` → re-invoke the named agent once more for this
stage; `exhausted` → the story is now Blocked with a deferred decision; go back to `faylo next`.
Never retry on your own count — `route` holds the count and the bound.

## Stage 13 — continuous

After a release, Stage 13 runs for the life of the engagement. A finding there is a new work item:
`faylo new epic "<finding>"`, then Stages 02–06 for it (`triggers.13-observe.on_new_work_item`).
No tier is inherited.

## What agents never do — humans drive

These are enforced twice, not by good intentions: the `PreToolUse` hook blocks the tool call
(`faylo/_hooks/block_handwritten_state.py`), and the five human-only code paths themselves refuse
in any process Claude Code spawned (`CLAUDECODE=1`, `faylo/human.py`) -- so a script, a
`python -c`, or a renamed invocation is refused too. An agent that hits one defers with
`faylo decision defer` and moves on:

- **Resolve a decision** (`faylo decision resolve`), **mark a manual AC** (`faylo verify mark`),
  **sign a release** (`faylo signoff`, or any `Operator-Signoff:` text), **stop or restart the
  loop** (`faylo pause`, `faylo resume`). These are human actions, done in a terminal.
- Hand-write an id, a `Status:`, a `Verified:` or an `Operator-Signoff:` line, or edit a CLI-owned
  file (`INDEX.md`, `config.json`, `decisions.jsonl`, `stage-registry.json`, `.ledger/`).
- Loosen a tier. Tightening is `faylo tier` (Architect/QA seats); the CLI refuses to loosen and the hook blocks a hand-edit that would.
- Modify its own hooks, agent definitions or skills (`.claude/settings*.json`, `.claude/agents/`,
  `.claude/skills/`).
- Force-push, hard-reset, discard the working tree, delete branches, or `rm`/`mv` the workspace or
  anything under `faylo-sdlc/`.

## Every state change is a CLI call

| Stage | Command |
|---|---|
| 00 Adopt | `faylo adopt --product <name>` (existing codebases; once), then `faylo tier` per in-flight story |
| 02 BRD | `faylo new epic "<request>"` unless the human already created it — the engagement's anchor |
| 06 Tickets | `faylo new story "..." --epic EP-... --tier <tier> --ac "..." --verify "shell <cmd>" [--field Depends-On=US-...,US-...]` |
| 08 Dependencies | `faylo depends US-... --on US-...,US-...` |
| 09 Planning | `faylo tier US-... <tier> --stage 09-planning --by faylo-architect` if tightening; `faylo transition US-... Ready` (fails unless every AC has a `Verify:` line) |
| 10 Implementation | `faylo transition US-... "In Progress"`; a judgment call → `faylo decision defer US-... "question" --option a --option b` and keep going |
| 11 Verification | `faylo verify run US-...`, then `faylo new review "..." --story US-... --author <seat> --reviewer <other seat> --verdict pass\|fail`, then `faylo transition US-... Verified` |
| 12 Release | `faylo gate --release --story US-...`; autonomous / async-review → `faylo transition US-... Done`; hard-gate → stop and report "awaiting `faylo signoff`" |
| any failure | `faylo route <stage> US-... --note "..."` |
| any | `faylo log`, `faylo gate` before every commit, `faylo status`, `faylo decision list`, `faylo history --summary` |

Never write an id, a `Verified:` line, a `Status:` value or an `Operator-Signoff:` line by hand.
The hook blocks it at write time; the gate catches it after.
