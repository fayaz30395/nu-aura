# Ruflo — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries
- Codex will review the code — write changes expecting an external Codex code review pass

## Knowledge Base — read before acting

Project knowledge is indexed in three places. **Consult them at task start**, not after
mistakes:

All project docs live in ONE evidence-based Obsidian knowledge vault at `docs/obsidian/`
(numbered sections 00–12). Start at `docs/obsidian/00-Home.md` (vault map of content) or
`docs/README.md` (GitHub-readable index). Open the repo root in Obsidian to navigate.

| Need                                              | Source of truth                                       |
|---------------------------------------------------|-------------------------------------------------------|
| Doc map / entry point                             | `docs/obsidian/00-Home.md` · `docs/README.md`         |
| System architecture + C4 diagrams                 | `docs/obsidian/01-Architecture/`                      |
| Reusable code patterns (Redis, RLS, Kafka, etc.)  | `docs/obsidian/01-Architecture/Code-Patterns.md`      |
| Architecture decisions (ADRs)                     | `docs/obsidian/11-Decisions/` · `01-Architecture/Architecture-Decisions.md` |
| Per-sub-app deep dives (HRMS/Hire/Grow/Fluence)   | `docs/obsidian/02-Modules/`                           |
| Frontend (App Router, components, pages, routes)  | `docs/obsidian/03-Frontend/`                          |
| Backend (REST APIs, services, middleware)         | `docs/obsidian/04-Backend/`                           |
| RBAC (roles, permissions, matrix)                 | `docs/obsidian/05-RBAC/`                              |
| Database schema, ERD, Flyway migrations           | `docs/obsidian/06-Database/`                          |
| DevOps (CI/CD, deployment, local setup)           | `docs/obsidian/07-DevOps/`                            |
| Security baseline / audit                         | `docs/obsidian/08-Security/`                          |
| Testing (QA strategy, coverage)                   | `docs/obsidian/09-Testing/`                           |
| Operational runbooks (incident, prod support)     | `docs/obsidian/10-Runbooks/`                          |
| Request/data flows, module relationships          | `docs/obsidian/12-Knowledge-Graph/`                   |
| Evolving project state                            | `MEMORY.md`                                           |
| Open docs/KB tasks                                | `docs/pendings.md`                                    |

**Routing rule:** before designing anything, read the relevant `docs/obsidian/01-Architecture/`
note (and `11-Decisions/` for prior ADRs) for how the area works today. Before implementing,
check `docs/obsidian/01-Architecture/Code-Patterns.md` for an existing pattern. Before touching
a security-sensitive path, read `docs/obsidian/08-Security/` and the RLS flow in
`docs/obsidian/12-Knowledge-Graph/`.

### Code RAG — graphify knowledge graph (`graphify-out/`)

For **locating code/data across the codebase** ("where is X defined", "what calls Y", "how does
A reach B"), query the local graphify knowledge graph BEFORE falling back to broad grep/glob
sweeps. It is a code-only corpus of **58,753 nodes / 140,991 edges** built from this repo.

- **Location:** `graphify-out/` — **gitignored, local-only** (not committed; `graph.json` is ~85MB).
  If the directory is missing, rebuild with `/graphify .` (the `graphify` skill).
- **Scope:** **code only** — docs/`*.md`/images are excluded (see `.graphifyignore`). For prose
  knowledge use the Obsidian vault table above; for code structure use this graph.

| Query | Command |
|-------|---------|
| Broad context ("what is X connected to") | `graphify query "<question>"` (BFS) |
| Trace a chain ("how does X reach Y") | `graphify query "<question>" --dfs` |
| Shortest dependency path between two nodes | `graphify path "A" "B"` |
| Explain one node + its neighbors | `graphify explain "X"` |
| Plain-language overview | read `graphify-out/GRAPH_REPORT.md` |

Answer using **only** what the graph contains and cite `source_location` when quoting a fact;
if the graph lacks the edge, say so rather than inventing it. The graph is a point-in-time
snapshot (`built_at_commit` in `graph.json`, currently `7c9d0dd3`) — after large code changes
re-run `/graphify .` to refresh it.

> **Note:** the `docs/swarm/` YAMLs (DDD domains + RuFlo registry + 6 workflow pipelines) are
> the tracked source for `./scripts/ruflo-sync.sh` (`docs/swarm/` → gitignored `.claude-flow/`
> runtime). Removed in the `ed6f023d` docs reset, they were re-added in `b2801919` and are
> present at HEAD; `--check` reports no drift vs the live runtime. Keep them — the runtime is
> active (`ruflo-start.sh`, `start-work.sh`, `AGENTS.md` all depend on it). Re-run the sync after
> any pull that touches `docs/swarm/`.

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern        | Flow                  | Use When                                |
|----------------|-----------------------|-----------------------------------------|
| **Pipeline**   | A → B → C → D         | Sequential dependencies (feature dev)   |
| **Fan-out**    | Lead → A, B, C → Lead | Independent parallel work (research)    |
| **Supervisor** | Lead ↔ workers        | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config

- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task        | Agents                             | Topology     |
|-------------|------------------------------------|--------------|
| Bug Fix     | researcher, coder, tester          | hierarchical |
| Feature     | architect, coder, tester, reviewer | hierarchical |
| Refactor    | architect, coder, reviewer         | hierarchical |
| Performance | perf-engineer, coder               | hierarchical |
| Security    | security-architect, auditor        | hierarchical |
| Opus4.8     | dynamic-coordinator, architect, coder, tester, security-auditor, reviewer | hierarchical-mesh |

### When to Swarm

- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler              | Use Cases                                       |
|------|----------------------|-------------------------------------------------|
| 1    | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2    | Haiku                | Simple tasks, low complexity                    |
| 3    | Sonnet/Opus          | Architecture, security, complex reasoning       |

## Memory & Learning

### Before Any Task

```bash
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[task description]"
```

### After Success

```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category      | Key Tools                                                  |
|---------------|------------------------------------------------------------|
| **Memory**    | `memory_store`, `memory_search`, `memory_search_unified`   |
| **Bridge**    | `memory_import_claude`, `memory_bridge_status`             |
| **Swarm**     | `swarm_init`, `swarm_status`, `swarm_health`               |
| **Agents**    | `agent_spawn`, `agent_list`, `agent_status`                |
| **Hooks**     | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch`  |
| **Security**  | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker     | When                   |
|------------|------------------------|
| `audit`    | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features  |
| `map`      | Every 5+ file changes  |
| `document` | After API changes      |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (
swarm, memory, hooks). **CLI** is the same via Bash.

---

# Second Brain — Claude Code + Obsidian vault
This folder is my Obsidian vault and single source of truth.

## Start of every session
1. Read this file.
2. List memory/ and read the 3 most recent files.
3. Treat both as authoritative context about me, my projects, decisions.

## Answering
- Before anything non-trivial, grep/glob the vault for relevant notes, then
  read the hits. Cite filenames used. If nothing relevant exists, say so.
  Never invent.

## Write-back — do this WITHOUT being asked
When an exchange produces something worth keeping:
- Durable fact about me/a project -> append under the right heading in CLAUDE.md.
- Session note / summary / decision -> create memory/YYYY-MM-DD-<slug>.md with
  `tags:` frontmatter and a one-line summary at top, and add a line to
  memory/INDEX.md "## Log".
- Only append or create. NEVER overwrite or delete my hand-written notes.
- After writing, state exactly which file you changed.

## Folder map
- memory/ -> your written context & session notes
- notes/  -> my PKM (read freely; edit only if I ask)
- refs/   -> docs/code to retrieve over

## Discipline
- Direct, no preamble. Reference notes as `folder/file.md`.
- Search before answering; one file edit at a time; confirm each write.
- If a request needs a note I don't have, name what's missing.

## About Me
- Email: fayaz30395@gmail.com
- **Tech Lead** with 10+ years in backend & platform engineering — Java, Spring
  Boot, microservices, cloud-native architectures, composable commerce.
  (Title is Tech Lead — do not inflate to Principal/Staff.)
- Currently **Tech Lead at Sephora** (commerce personalization / platform
  engagements) and runs the **NULOGIC** product ecosystem.
- Also operates **food businesses in Madurai** — Crispy Kitchen; involvement with
  Arabian Grills and Hotel Buhari.
- This second brain holds context across **three threads** so nothing is lost on
  context-switch: (1) Sephora / consulting work, (2) NU-AURA platform dev,
  (3) the food business.

## Projects
- **Sephora** — Tech Lead on commerce platform / personalization: Routine Builder
  P13N, banner variant / NBC ranking; commercetools / MuleSoft / MACH stack;
  Avalara / Vertex (tax); Algolia / Bloomreach / Nosto (search & personalization).
- **NU-AURA platform ecosystem** — NU-HRMS, NU-Hire, NU-Grow, NU-Fluence.
  **Authoritative stack: React 18 + MUI, Spring Boot 3.x, MySQL/HeatWave, Redis,
  Google OAuth, 9-role RBAC.**
  Caveat: THIS checkout (`nu-aura/frontend`) currently ships Next.js 16 +
  Mantine 9 + React 19 — a different impl from the canonical stack. When advising
  on code in this repo, follow the repo's actual deps, not the canonical line.
- **NULOGIC brand / Nulogic Solution Team** — consulting proposals & deliverables.
- **Local-first PII detection agent** — Python, Microsoft Presidio, India-specific
  recognizers (Aadhaar, PAN, IFSC, UPI), detect-and-confirm flow.
- **Food businesses** — Crispy Kitchen, Arabian Grills design/menu collateral.
- **Trading automation experiments** — Zerodha Kite Connect, F&O / Bank Nifty.

## Working-Style Preferences
### Always
- Direct, minimal back-and-forth.
- Structured outputs; **design-before-code** discipline.
- Structured docs: requirements → design → tasks.
- Reference files as `path/file:line`.
### Never
- Unnecessary preamble.
- Jumping to code without design.
- Inflating my role/credentials.
- Overwriting my hand-written notes.
### Operating model (set 2026-06-16 — overrides protocol default)
- I **own** the knowledge base — author, not just assistant. The user does NOT
  write notes; Obsidian is their read-only window. Take control: write back
  proactively without being asked.
- Landing page / control center = `notes/HOME.md` (I maintain it). `notes/` is
  now AI-authored too (the protocol's "edit only if I ask" no longer applies here).
- Obsidian is optional for me — markdown on disk is the real store. Structure
  notes (frontmatter tags + `[[wikilinks]]`) so the graph/backlinks stay legible.

### Operational (from documented feedback memories)
- Work on the **`main`** branch — no feature branches.
- Dev ports fixed: **frontend 3000, backend 8080**.
- UI sizing **compact / desktop-first**: 36px buttons, `text-xs` labels, `w-8` icons.
- Multi-agent runs leave stale locks — always `rm -f` the git `index.lock`.
