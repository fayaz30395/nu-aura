# NU-AURA Agent OS

A local, single-user control plane for spawning and watching real Claude agents
orchestrate work on this repo. Built as a hobby tool; localhost only.

## The pieces

| File | What it is | Tokens? |
|------|------------|---------|
| `qa-reports/orchestrator-os.html` | **Hierarchical comms visualization** (replay of a real QA run). Open directly in a browser. | none |
| `scripts/orchestrator-os-server.js` | **LIVE orchestrator** — you issue a directive, a real Lead `claude -p` plans a delegation tree, real agents run with handoffs, every message streams into the graph. | yes (live) |
| `qa-reports/agent-os.html` | Standalone **simulation** of the QA fleet (offline). | none |
| `scripts/agent-os-server.js` | Flat live control plane — real QA shell commands (free) + real Claude agents. | mixed |
| `scripts/orchestrator-core.js` (+ tests) | Pure, unit-tested orchestration logic (tree bounds, handoff wave scheduling). | none |

The **orchestrator-os-server** is the canonical product.

## Run it

```bash
node scripts/orchestrator-os-server.js          # → http://localhost:8789
# config (all optional):
ORCH_OS_PORT=8789        # listen port
ORCH_MAX_CALLS=24        # hard per-run spend ceiling (claude calls)
ORCH_AGENT_MAX_TURNS=14  # per-agent turn cap
CLAUDE_BIN=claude        # path to the claude CLI
```

Open the URL, edit the directive, press **▶ Issue directive** → **Launch**.

## Safety model

Three isolation tiers, auto-selected (override with `ORCH_SANDBOX`). `/api/health`
reports the active `sandboxMode`.

- **`docker` — hard guarantee on EVERY platform.** Each agent runs in a throwaway
  container with only `/work` mounted (edit agents → the worktree rw; everyone
  else → the repo read-only). **The host repo is never mounted, so an agent
  physically cannot reach it** — proven by `orchestrator-flow.test.js` (a
  containerized rogue agent's escape is blocked; the host tree stays byte-identical).
  Build the image once and opt in:
  ```bash
  docker build -f scripts/agent.Dockerfile -t nu-agent-os:latest .
  ORCH_SANDBOX=docker ANTHROPIC_API_KEY=sk-... node scripts/orchestrator-os-server.js
  ```
- **`sandbox-exec` — hard guarantee on macOS (default there).** Every agent runs
  under `sandbox-exec` denying all writes to the repo path — cannot modify your
  tree even via absolute paths or Bash. Proven by an adversarial escape test.
- **`none` — worktree-only (fallback).** Where neither is available, agents run
  in an isolated worktree; a post-run guard fingerprints the main tree and warns
  if anything escaped. Use `docker` for untrusted directives here.
- **Read-only agents** additionally run with `--permission-mode plan` and
  `--disallowedTools Edit Write MultiEdit NotebookEdit Bash` (defense in depth).
- **Edit mode is worktree-isolated.** Edit agents work in a throwaway
  `git worktree` (in `$TMPDIR`, outside the repo) seeded with your untracked
  files; the run produces a reviewable patch at `qa-reports/runs/<runId>.patch`
  — apply with `git apply <path>` if you want it. The worktree is auto-removed.
- **Stop** halts a run (SIGTERM → SIGKILL escalation) and a **call ceiling**
  caps spend. Every run is **persisted** under `qa-reports/runs/` and replays
  for free from the **Runs ▾** menu.

> **How we know:** an earlier version relied on `cwd`-based worktree isolation,
> which an agent escaped via an absolute path. The fix is the OS sandbox above,
> and the adversarial test guards against regressions.

## Tests (every tier — all token-free, claude is mocked)

```bash
cd scripts
npm test        # 22 node tests: unit + integration + e2e flow + adversarial security
npm run test:e2e  # Playwright browser E2E against a real chromium (uses frontend's install)
```

- **Unit** — pure core + client core (tree bounds, handoff wave scheduling,
  cycle safety, JSON extraction, graph layout, escaping).
- **Integration** — server boots, serves health/runs/page.
- **E2E flow** — full orchestrate run via a mocked claude: plan → agents →
  handoff → edit → worktree → reviewable patch → tree untouched → ceiling.
- **Adversarial** — an agent that tries to escape the worktree is blocked.
- **Browser E2E** — Playwright drives the live page: directive → graph builds →
  verdict, zero console errors.

CI runs the node suite on every `scripts/**` change (`.github/workflows/agent-os.yml`).

## Known limits (by design)

- **Hub-and-spoke, not unbounded autonomy.** The delegation tree is fixed at
  plan time (≤3 orchestrators × ≤2 agents). Agents report up to their
  orchestrator and across via handoffs; they do not recursively spawn more
  agents. This is a deliberate reliability/cost choice.
- **Localhost, single trusted user.** No auth, no multi-tenant.
- A live run is several real `claude -p` calls (plan + agents + verdict).
