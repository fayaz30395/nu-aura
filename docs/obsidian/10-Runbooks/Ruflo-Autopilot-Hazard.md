---
title: Ruflo Autopilot Hazard
tags: [runbook, ruflo, autopilot, process-risk, git, main-branch, incident]
---

# Ruflo-Autopilot-Hazard

> Part of the [[00-Home]] vault · Runbooks section. Related: [[Incident-Response]],
> [[Production-Support]], [[Readiness-Session-2026-06-18]]. Long-documented in project memory
> ("ruflo autopilot commits to main when on → blocks frozen-SHA release gating").

## Symptom

`main` advances with commits authored **"Claude"** that you did not make (e.g. `qa-iter6`,
`docs(qa): production-readiness assessment`, `fix(railway): … kafka`, `fix(security): remediate …`).
HEAD moves under active work; uncommitted edits get swept into mislabeled autopilot commits; stale
`.git/index.lock` appears; new DB migrations (V29x/V300) and even autonomous `fix(security)` changes
land unreviewed.

## Root cause (diagnosed 2026-06-17/18)

The autopilot is a **separate `claude --dangerously-skip-permissions` session** (NOT this interactive
session, NOT a daemon, NOT a launchd/cron job — none were found). That session hosts
`npm exec ruflo@latest mcp start` as a child **and** runs the commit loop.

- Killing the `ruflo mcp` children is **futile** — the parent claude session respawns them.
- `ruflo autopilot disable` reported "disabled" but **did not stop the commits**.
- Killing the parent claude session (SIGTERM) works — but a **fresh** `claude --dangerously-skip-permissions`
  session is relaunched from a **zsh shell** parent shortly after. Observed parent pids changed across
  respawns (77400 → 3425 → …) and process count climbed (2 → 12). So a **run-loop in a terminal/tmux**
  (or repeated manual relaunch) is the true source — it lives outside what an in-session agent can reach.

> ⚠️ `--dangerously-skip-permissions` is NOT a discriminator: the normal interactive session also runs
> under it. **Walk the ppid chain** and confirm a candidate pid is NOT an ancestor of your own shell
> (`$$`) before killing anything.

## Detection

```bash
pgrep -f ruflo | wc -l                      # >0 means it's up (saw 12 at peak)
git log --format='%h %an %ai %s' -10        # "Claude"-authored commits you didn't make
# find the parent claude session(s) hosting ruflo:
for p in $(pgrep -f "ruflo mcp"); do ps -o pid,ppid,command -p "$(ps -o ppid= -p $p|tr -d ' ')"; done
```

## How to stop it (must be done by the operator)

1. Identify the **terminal/tmux/loop** launching `claude --dangerously-skip-permissions` (its shell parent).
   An in-session agent cannot safely kill the operator's shells.
2. End that loop/terminal. Then:
   ```bash
   pkill -f "ruflo.*mcp start"; pkill -f "claude --dangerously-skip-permissions"   # operator's call
   ```
3. Verify quiescence: `pgrep -f ruflo | wc -l` → 0, and `git rev-parse HEAD` stays stable across ~10s.
4. Clear any stale lock: `rm -f .git/index.lock`.

## Containment while it's up

- It races the git index — **commit your own work promptly and atomically** (stage explicit paths) so it
  isn't swept into an autopilot commit (it already absorbed a `safeUrl` fix into its `fix(security)` commit).
- Prefer **new files** over editing existing ones when documenting (avoids read-modify-write collisions).
- Treat every autopilot commit as **unreviewed** — especially DB migrations and `fix(security)` changes —
  and audit before relying on them (see [[Readiness-Session-2026-06-18]] for the `d29ec59a` audit).

## Why it matters

Blocks frozen-SHA release gating, puts unreviewed code/migrations on `main`, and makes any readiness
verdict point-in-time. This is the top open **process** risk for go-live.
