---
title: "NU-AURA Agent Orchestration Config"
tags: ["area/agents","type/config","area/devops","layer/platform"]
summary: "AI agent orchestration configuration: RuFlo swarm topology, agent routing tables, memory/learning workflows, and the knowledge-base routing rule for Claude Code agents."
---

# Ruflo — Codex Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries

## Knowledge Base — read before acting

Project knowledge is indexed in three places. **Consult them at task start**, not after
mistakes:

| Need                                              | Source of truth                                       |
|---------------------------------------------------|-------------------------------------------------------|
| **Navigable knowledge graph (start here)**        | `docs/obsidian/00-Home.md` — interlinked vault; coverage in `docs/obsidian/Documentation-Coverage-Report.md` |
| Architectural decisions (ADRs)                    | `docs/obsidian/11-Decisions/` (ADR-001…ADR-005)       |
| Reusable code patterns (Redis, RLS, Kafka, etc.)  | `docs/patterns/README.md`                             |
| Security baseline + audit                         | `docs/obsidian/08-Security/Security-Audit.md`         |
| RBAC roles / permissions / matrix                 | `docs/obsidian/05-RBAC/` (26 roles; `@RequiresPermission` enforcement) |
| Operational runbooks (incident, support)          | `docs/obsidian/10-Runbooks/` (templated — verify before relying) |
| Architecture deep dives                           | `docs/obsidian/01-Architecture/` + `docs/architecture/` |
| API / DB / migration reference (exhaustive)       | `docs/reference/`                                     |
| Evolving project state                            | `MEMORY.md`                                           |

**Routing rule:** before designing anything, read `docs/obsidian/01-Architecture/` and
`docs/obsidian/11-Decisions/` for prior decisions on the topic. Before implementing anything,
search `docs/patterns/` for an existing pattern. Before touching a security-sensitive path,
read `docs/obsidian/08-Security/Security-Audit.md` and `docs/architecture/data-flow.md` (auth + RLS).

**Sync RuFlo runtime configs:** the swarm YAMLs in `.claude-flow/` are gitignored. Run
`./scripts/ruflo-sync.sh` after pulling new commits to refresh them from `docs/swarm/`.

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
npx ruflo@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
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
npx ruflo@latest memory search --query "[task keywords]" --namespace patterns
npx ruflo@latest hooks route --task "[task description]"
```

### After Success

```bash
npx ruflo@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx ruflo@latest hooks post-task --task-id "[id]" --success true --store-results true
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
npx ruflo@latest hooks worker dispatch --trigger audit
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
npx ruflo@latest init --wizard           # Setup
npx ruflo@latest swarm init --v3-mode     # Start swarm
npx ruflo@latest memory search --query "" # Vector search
npx ruflo@latest hooks route --task ""    # Route to agent
npx ruflo@latest doctor --fix             # Diagnostics
npx ruflo@latest security scan            # Security scan
npx ruflo@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
codex mcp add ruflo -- npx -y ruflo@latest mcp start
npx ruflo@latest daemon start
npx ruflo@latest doctor --fix
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (
swarm, memory, hooks). **CLI** is the same via Bash.

## Related

- [[MEMORY|Architecture Memory]] — living project state consulted by agents at task start
- [[docs/patterns/README|Code Patterns]] — patterns agents reference during implementation
- [[docs/architecture/README|Architecture Overview]] — system context for agent routing decisions
- [[docs/Home|Home MoC]] — vault entry point

## Imported Claude Cowork project instructions

You are working on NU-AURA, an enterprise HRMS platform built with:
- Backend: Java 21 + Spring Boot 3.5.14 (DDD-layered modular monolith)
- Frontend: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Mantine UI 9
- Database: PostgreSQL 16 (multi-tenant with RLS)
- Caching: Redis 7
- Messaging: Kafka
- Storage: Google Drive (behind a `StorageProvider` abstraction; MinIO removed)

Code Standards:
- Always read existing files before modifying
- Use existing Axios client (frontend/lib/) - never create new instances
- All forms must use React Hook Form + Zod
- All data fetching must use React Query
- TypeScript strict mode - no 'any' types
- Backend JaCoCo enforces a ratcheting line-coverage floor (currently min 0.10; backlog target 0.80) — see `backend/pom.xml`

Architecture Rules:
- Multi-tenant: All queries must filter by tenant_id
- RBAC: enforce with `@RequiresPermission` (190 sites; ~95 permission families in `Permission.java`) — NOT Spring `@PreAuthorize`
- Never skip migrations - always create the next Flyway migration (latest V294; next: V295)
- SuperAdmin role bypasses all permission checks

Documentation:
- Check REQUIREMENTS.md for full spec
- Check MEMORY.md for architecture decisions
- Check CLAUDE.md for platform-specific rules
