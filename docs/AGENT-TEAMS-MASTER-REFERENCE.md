# Agent Teams — Master Reference Guide

> **Version**: Claude Code 2.1.32+ | **Last updated**: 2026-04-02
> **Purpose**: Definitive reference for building effective agent teams and subagents in Claude Code.
> **Audience**: AI engineering partners, future Claude Code sessions operating on this codebase.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Architecture & Mechanics](#2-architecture--mechanics)
3. [Subagents (Single-Session Workers)](#3-subagents-single-session-workers)
4. [Agent Teams (Multi-Session Coordination)](#4-agent-teams-multi-session-coordination)
5. [Subagent Definition Reference](#5-subagent-definition-reference)
6. [Agent Team Configuration Reference](#6-agent-team-configuration-reference)
7. [Decision Framework](#7-decision-framework)
8. [Team Composition Patterns](#8-team-composition-patterns)
9. [Task Dependency Patterns](#9-task-dependency-patterns)
10. [Prompt Engineering for Agents](#10-prompt-engineering-for-agents)
11. [Hooks & Quality Gates](#11-hooks--quality-gates)
12. [Cost & Token Management](#12-cost--token-management)
13. [Troubleshooting](#13-troubleshooting)
14. [Limitations](#14-limitations)
15. [NU-AURA Specific Configurations](#15-nu-aura-specific-configurations)

---

## 1. Core Concepts

### Three Layers of Agent Orchestration

```
Layer 1: Single Session + Role Prefix
  └── One Claude Code session, guided by @role tags in CLAUDE.md
  └── Cost: 1x baseline
  └── Best for: 70% of daily tasks

Layer 2: Subagents (delegated workers within one session)
  └── Main session spawns focused workers via the Agent tool
  └── Workers report results BACK to the main session only
  └── Workers CANNOT talk to each other
  └── Cost: 2-3x baseline
  └── Best for: 25% of tasks (sequential pipelines, parallel research)

Layer 3: Agent Teams (coordinated multi-session)
  └── Lead session creates a team of independent Claude Code instances
  └── Teammates share a task list and message each other directly
  └── Each teammate has its own full context window
  └── Cost: 5-15x baseline
  └── Best for: 5% of tasks (full module builds, complex debugging, sprint execution)
```

### Key Differences: Subagents vs Agent Teams

| Dimension         | Subagents                                   | Agent Teams                                                   |
|-------------------|---------------------------------------------|---------------------------------------------------------------|
| **Context**       | Own window; results return to caller        | Own window; fully independent                                 |
| **Communication** | Report results back to main agent only      | Teammates message each other directly                         |
| **Coordination**  | Main agent manages all work                 | Shared task list with self-coordination                       |
| **Task list**     | No shared task list                         | Shared task list (pending → in-progress → completed)          |
| **Nesting**       | Cannot spawn other subagents                | Teammates cannot spawn sub-teams                              |
| **Session**       | Runs within a single session                | Each teammate is a separate Claude Code session               |
| **Display**       | Invisible to user (runs in background)      | In-process (Shift+Down to cycle) or split panes (tmux/iTerm2) |
| **Token cost**    | Lower: results summarized back to main      | Higher: each teammate is a separate instance                  |
| **Best for**      | Focused tasks where only the result matters | Complex work requiring discussion and collaboration           |

---

## 2. Architecture & Mechanics

### Agent Team Components

| Component     | Role                                                                                   |
|---------------|----------------------------------------------------------------------------------------|
| **Team Lead** | The main Claude Code session that creates the team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances working on assigned tasks                               |
| **Task List** | Shared list of work items with states: pending, in-progress, completed                 |
| **Mailbox**   | Messaging system for inter-agent communication                                         |

### How Teams Start

Two paths:

1. **You request a team**: Describe the task and team structure. Claude creates the team.
2. **Claude proposes a team**: Claude detects the task benefits from parallelism and suggests a
   team. You confirm.

Claude never creates a team without your approval.

### Storage Locations

```
~/.claude/teams/{team-name}/config.json   # Team runtime state (auto-generated, DO NOT edit)
~/.claude/tasks/{team-name}/              # Task list storage
```

The team config contains a `members` array with each teammate's name, agent ID, and agent type.
Teammates can read this file to discover other team members.

**Important**: There is no project-level team config. A file like `.claude/teams/teams.json` in your
project directory is NOT recognized as configuration.

### Subagent Storage

```
~/.claude/agents/              # User-level (all projects, priority 3)
.claude/agents/                # Project-level (this repo, priority 2)
Plugin agents/ directory       # Plugin-provided (priority 4, lowest)
--agents CLI flag              # Session-only (priority 1, highest)
```

### Context & Communication

- Teammates load the same project context as a regular session: `CLAUDE.md`, MCP servers, skills
- Teammates receive the spawn prompt from the lead
- The lead's conversation history does NOT carry over
- **Automatic message delivery**: messages arrive at recipients automatically
- **Idle notifications**: when a teammate finishes, it notifies the lead automatically
- **Shared task list**: all agents see task status and claim available work

### Permissions

- Teammates start with the lead's permission settings
- If lead runs with `--dangerously-skip-permissions`, all teammates do too
- You can change individual teammate modes after spawning
- You cannot set per-teammate modes at spawn time

---

## 3. Subagents (Single-Session Workers)

### Built-in Subagents

| Agent                 | Model        | Tools     | Purpose                                                     |
|-----------------------|--------------|-----------|-------------------------------------------------------------|
| **Explore**           | Haiku (fast) | Read-only | File discovery, code search, codebase exploration           |
| **Plan**              | Inherits     | Read-only | Codebase research for plan mode                             |
| **General-purpose**   | Inherits     | All       | Complex research, multi-step operations, code modifications |
| **Bash**              | Inherits     | —         | Terminal commands in separate context                       |
| **statusline-setup**  | Sonnet       | —         | Configure status line                                       |
| **Claude Code Guide** | Haiku        | —         | Answer questions about Claude Code features                 |

### Creating Custom Subagents

#### Method 1: Interactive (`/agents` command)

```text
/agents → Create new agent → Personal or Project → Generate with Claude
```

#### Method 2: Manual file creation

Create a Markdown file with YAML frontmatter in `.claude/agents/` (project) or `~/.claude/agents/` (
user):

```markdown
---
name: my-agent
description: When Claude should delegate to this agent
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a specialist. When invoked, do X, Y, Z.
```

#### Method 3: CLI flag (session-only)

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### Invoking Subagents

| Method           | Syntax                                          | Behavior                           |
|------------------|-------------------------------------------------|------------------------------------|
| Natural language | "Use the code-reviewer subagent to..."          | Claude decides whether to delegate |
| @-mention        | `@"code-reviewer (agent)" review auth`          | Guarantees that subagent runs      |
| Session-wide     | `claude --agent code-reviewer`                  | Entire session uses that subagent  |
| Setting          | `{ "agent": "code-reviewer" }` in settings.json | Default for every session          |

### Foreground vs Background

- **Foreground**: Blocks main conversation. Permission prompts pass through to you.
- **Background**: Runs concurrently. Auto-denies unapproved permissions. Cannot ask clarifying
  questions.
- Claude decides automatically, or you can say "run this in the background" or press **Ctrl+B**.

### Resuming Subagents

Subagents retain full conversation history. To continue work:

```text
Use the code-reviewer subagent to review the auth module
[completes]
Continue that code review and now analyze the authorization logic
[Claude resumes with full prior context]
```

Requires agent teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) for the `SendMessage` tool.

---

## 4. Agent Teams (Multi-Session Coordination)

### Enabling Agent Teams

In `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "experimental": {
    "agentTeams": true
  }
}
```

### Display Modes

| Mode            | Description                                                          | Config                                           |
|-----------------|----------------------------------------------------------------------|--------------------------------------------------|
| **in-process**  | All teammates in main terminal. Shift+Down to cycle. Works anywhere. | Default if not in tmux                           |
| **split panes** | Each teammate in own pane. Requires tmux or iTerm2.                  | Set `"teammateMode": "tmux"` in `~/.claude.json` |
| **auto**        | Split panes if already in tmux, otherwise in-process.                | Default                                          |

Override per-session: `claude --teammate-mode in-process`

### Display Mode Controls (In-Process)

| Key            | Action                                                  |
|----------------|---------------------------------------------------------|
| **Shift+Down** | Cycle through teammates (wraps back to lead after last) |
| **Enter**      | View teammate's session                                 |
| **Escape**     | Interrupt teammate's current turn                       |
| **Ctrl+T**     | Toggle task list                                        |

### Spawning Teams

Natural language — describe the task and team structure:

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
```

### Specifying Models and Team Size

```text
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Plan Approval for Teammates

Require read-only planning before implementation:

```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

When the teammate finishes planning, it sends a plan approval request to the lead. The lead reviews
and approves or rejects with feedback. Rejected teammates revise and resubmit.

Influence the lead's approval criteria: "only approve plans that include test coverage" or "reject
plans that modify the database schema."

### Task Management

Tasks have three states: **pending**, **in-progress**, **completed**.

Tasks can have dependencies: a pending task with unresolved dependencies cannot be claimed until
dependencies complete.

Task claiming uses file locking to prevent race conditions.

| Assignment Method | Description                                                     |
|-------------------|-----------------------------------------------------------------|
| **Lead assigns**  | Tell lead which task to give to which teammate                  |
| **Self-claim**    | After finishing, teammate picks next unassigned, unblocked task |

### Talking to Teammates Directly

Each teammate is a full Claude Code session. You can:

- Message any teammate directly (additional instructions, questions, redirects)
- In-process: Shift+Down to cycle, then type
- Split panes: Click into teammate's pane

### Communication Primitives

| Primitive     | Description                                                                       |
|---------------|-----------------------------------------------------------------------------------|
| **message**   | Send to one specific teammate                                                     |
| **broadcast** | Send to all teammates simultaneously (use sparingly — costs scale with team size) |

### Shutting Down

```text
Ask the researcher teammate to shut down     # Graceful shutdown
Clean up the team                             # Remove shared team resources
```

**Always use the lead to clean up.** Teammates should not run cleanup — their team context may not
resolve correctly.

The lead checks for active teammates and fails if any are still running. Shut them all down first.

### Using Subagent Definitions for Teammates

Teammates can reference existing subagent definitions from any scope (project, user, plugin, CLI):

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

The teammate inherits that subagent's system prompt, tools, and model.

---

## 5. Subagent Definition Reference

### Frontmatter Fields (Complete)

| Field             | Required | Type        | Description                                                                                         |
|-------------------|----------|-------------|-----------------------------------------------------------------------------------------------------|
| `name`            | Yes      | string      | Unique identifier, lowercase letters and hyphens                                                    |
| `description`     | Yes      | string      | When Claude should delegate to this agent                                                           |
| `tools`           | No       | string/list | Tools the agent can use. Inherits all if omitted                                                    |
| `disallowedTools` | No       | string/list | Tools to deny (removed from inherited set)                                                          |
| `model`           | No       | string      | `sonnet`, `opus`, `haiku`, full model ID (e.g. `claude-opus-4-6`), or `inherit`. Default: `inherit` |
| `permissionMode`  | No       | string      | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`                                    |
| `maxTurns`        | No       | integer     | Maximum agentic turns before stopping                                                               |
| `skills`          | No       | list        | Skills to inject into context at startup (full content, not just availability)                      |
| `mcpServers`      | No       | list        | MCP servers: string references or inline definitions                                                |
| `hooks`           | No       | object      | Lifecycle hooks scoped to this subagent                                                             |
| `memory`          | No       | string      | Persistent memory scope: `user`, `project`, `local`                                                 |
| `background`      | No       | boolean     | Always run as background task. Default: `false`                                                     |
| `effort`          | No       | string      | Effort level: `low`, `medium`, `high`, `max` (Opus 4.6 only)                                        |
| `isolation`       | No       | string      | `worktree` for isolated git worktree copy                                                           |
| `initialPrompt`   | No       | string      | Auto-submitted first user turn when running as main session agent                                   |

### Model Resolution Order

1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable (if set)
2. Per-invocation `model` parameter (when Claude spawns)
3. Subagent definition's `model` frontmatter
4. Main conversation's model (inherit)

### Tool Control

**Allowlist** — only these tools:

```yaml
tools: Read, Grep, Glob, Bash
```

**Denylist** — inherit all except these:

```yaml
disallowedTools: Write, Edit
```

If both set: `disallowedTools` applied first, then `tools` resolved against remaining pool.

**Restrict spawnable subagents** (for `--agent` mode):

```yaml
tools: Agent(worker, researcher), Read, Bash
```

**Disable specific subagents** in settings.json:

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

### MCP Server Scoping

```yaml
mcpServers:
  # Inline definition: scoped to this subagent only
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  # Reference by name: reuses already-configured server
  - github
```

Inline MCP servers connect when subagent starts, disconnect when it finishes. The parent
conversation never sees the tools.

### Persistent Memory

| Scope     | Location                             | Use Case                            |
|-----------|--------------------------------------|-------------------------------------|
| `user`    | `~/.claude/agent-memory/<name>/`     | Learnings across all projects       |
| `project` | `.claude/agent-memory/<name>/`       | Project-specific, shareable via VCS |
| `local`   | `.claude/agent-memory-local/<name>/` | Project-specific, NOT in VCS        |

When memory is enabled:

- System prompt includes read/write instructions for the memory directory
- First 200 lines or 25KB of `MEMORY.md` in the memory directory is loaded
- Read, Write, Edit tools are auto-enabled

### Permission Modes

| Mode                | Behavior                                                |
|---------------------|---------------------------------------------------------|
| `default`           | Standard permission checking with prompts               |
| `acceptEdits`       | Auto-accept file edits                                  |
| `dontAsk`           | Auto-deny prompts (explicitly allowed tools still work) |
| `bypassPermissions` | Skip permission prompts (use with caution)              |
| `plan`              | Read-only exploration                                   |

If parent uses `bypassPermissions`, it takes precedence and cannot be overridden.
If parent uses auto mode, subagent inherits auto mode and `permissionMode` is ignored.

---

## 6. Agent Team Configuration Reference

### Team Hooks (settings.json)

| Hook Event      | Matcher Input   | When it Fires              | Exit Code 2 Behavior                 |
|-----------------|-----------------|----------------------------|--------------------------------------|
| `TeammateIdle`  | —               | Teammate about to go idle  | Send feedback, keep teammate working |
| `TaskCreated`   | —               | Task being created         | Prevent creation, send feedback      |
| `TaskCompleted` | —               | Task being marked complete | Prevent completion, send feedback    |
| `SubagentStart` | Agent type name | Subagent begins execution  | —                                    |
| `SubagentStop`  | Agent type name | Subagent completes         | —                                    |

### Example: Enforce Quality Gates

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db-connection.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup-db-connection.sh" }
        ]
      }
    ]
  }
}
```

---

## 7. Decision Framework

### When to Use What

```
Is this a simple, single-scope task?
  YES → Single session with @role prefix
  NO  ↓

Does the task decompose into sequential steps?
  YES → Subagents (one per step, results chain forward)
  NO  ↓

Do workers need to coordinate or share findings?
  YES → Agent Teams
  NO  → Parallel subagents (if independent, fan-out/fan-in)
```

### Decision Matrix

| Scenario                            | Approach               | Team Size |
|-------------------------------------|------------------------|-----------|
| Fix a bug in one service            | Single session         | 1         |
| Add a new API endpoint              | Single session         | 1         |
| Design + implement + test a feature | Subagents (sequential) | 3-4       |
| Research best practices             | Subagents (parallel)   | 2-3       |
| Build a full module end-to-end      | Agent Teams            | 5-6       |
| Debug complex cross-cutting issue   | Agent Teams (debate)   | 3-5       |
| Execute multiple sprint tickets     | Agent Teams (parallel) | 3-5       |
| Review a PR from multiple angles    | Agent Teams            | 3         |
| Refactor spanning multiple sub-apps | Agent Teams            | 3-4       |

### Strongest Use Cases for Agent Teams

1. **Research and review**: Multiple teammates investigate different aspects simultaneously, share
   and challenge findings
2. **New modules or features**: Each teammate owns a separate piece without stepping on each other
3. **Debugging with competing hypotheses**: Teammates test different theories in parallel and
   converge
4. **Cross-layer coordination**: Changes spanning frontend, backend, and tests, each owned by a
   different teammate

### When NOT to Use Agent Teams

- Sequential tasks (one depends on the next)
- Same-file edits (causes conflicts)
- Work with many interdependencies
- Routine tasks (single session is more cost-effective)

---

## 8. Team Composition Patterns

### Pattern A: Full Feature Build (5-6 agents)

```
LEAD ─── coordinates, reviews, merges
  ├── ARCHITECT ─── API contract, DB schema, RBAC, diagrams
  ├── BACKEND DEV ─── Controllers, services, entities, DTOs, tests
  ├── FRONTEND DEV ─── Pages, components, forms, data fetching
  ├── QA ENGINEER ─── RBAC boundary tests, E2E, edge cases
  ├── DEVOPS ─── Docker, CI/CD, K8s manifests (works in parallel)
  └── TECH WRITER ─── API docs, ADRs, module README (works incrementally)
```

**Dependency chain**: Architect → Backend + Frontend (parallel) → QA → Docs

### Pattern B: Cross-Module Refactor (3-4 agents)

```
LEAD ─── coordinates
  ├── CORE ENGINEER ─── Modify the shared layer (security, config, schema)
  ├── SUB-APP MIGRATOR ─── Update all consumers of the changed layer
  ├── FRONTEND UPDATER ─── Update UI permission checks and guards
  └── REGRESSION TESTER ─── Write tests scaffolds early, fill in as changes land
```

**Dependency chain**: Core → Sub-App + Frontend (parallel) → Regression tests

### Pattern C: Bug Hunt / Debugging (3-5 agents)

```
LEAD ─── synthesizes findings
  ├── INVESTIGATOR 1 ─── Hypothesis A (e.g., token lifecycle)
  ├── INVESTIGATOR 2 ─── Hypothesis B (e.g., gateway/routing)
  └── INVESTIGATOR 3 ─── Hypothesis C (e.g., cache/Redis)

  Rule: All investigators share findings and CHALLENGE each other's theories.
  The theory that survives peer review wins.
```

**No dependency chain** — fully parallel. Debate structure prevents anchoring bias.

### Pattern D: Sprint Execution (3-5 agents)

```
LEAD ─── monitors progress
  ├── TICKET-101 ─── Independent feature
  ├── TICKET-102 ─── Independent feature
  ├── TICKET-103 ─── Independent feature
  └── TICKET-104 ─── Independent feature

  Rule: If modifying a shared file, post to task list FIRST and wait for acknowledgment.
```

**No dependency chain** — fastest execution, highest token cost.

### Pattern E: Parallel Code Review (3 agents)

```
LEAD ─── synthesizes across all reviewers
  ├── SECURITY REVIEWER ─── Auth, injection, tenant isolation
  ├── PERFORMANCE REVIEWER ─── N+1, unbounded queries, caching
  └── COVERAGE REVIEWER ─── Test gaps, missing edge cases
```

Each reviewer applies a different lens to the same code. No overlap, thorough coverage.

---

## 9. Task Dependency Patterns

### Sequential Chain

```
architect → dev → qa → reviewer → docs
```

Each waits for the previous. Best for new features where design must precede implementation.

### Fan-Out / Fan-In

```
         ┌─ backend-dev ──┐
architect┤                 ├─ qa → reviewer
         └─ frontend-dev ──┘
```

Architect designs, dev work parallelizes, QA integrates. Most common for feature builds.

### Fully Parallel

```
ticket-1 ─────────────────→ done
ticket-2 ─────────────────→ done
ticket-3 ─────────────────→ done
```

Independent tickets, no dependencies. Fastest but highest token cost.

### Debate (Competing Hypotheses)

```
investigator-1 ──┐
investigator-2 ──┼─ challenge each other → converge
investigator-3 ──┘
```

Multiple hypotheses tested in parallel. The adversarial structure ensures the surviving theory is
more likely correct.

### Hybrid

```
         ┌─ backend-dev ─┐     ┌─ e2e-tests ─┐
architect┤                ├─ qa ┤              ├─ reviewer
         └─ frontend-dev ─┘     └─ perf-tests ─┘
```

Combines sequential and parallel phases. Best for large features with testing diversity.

---

## 10. Prompt Engineering for Agents

### Anatomy of an Effective Spawn Prompt

```text
ROLE: "You are the [ROLE] for [MODULE] in [PROJECT]."

CONTEXT:
- Project stack (languages, frameworks, key libraries)
- Architecture (multi-tenancy, RBAC, caching)
- Relevant file paths and directory structure
- Key constraints (permission format, naming conventions)

TASK:
- Specific deliverable (not vague goals)
- Acceptance criteria

BOUNDARIES:
- Which files/directories to work in
- Which files NOT to touch
- Dependencies on other agents' output

OUTPUT FORMAT:
- Expected deliverables (code files, test files, docs, diagrams)
- Reporting to task list

CONVENTIONS:
- Coding standards to follow
- Naming patterns
- Required annotations/decorators
```

### Common Prompt Mistakes

| Mistake             | Problem                               | Fix                                                  |
|---------------------|---------------------------------------|------------------------------------------------------|
| Vague task          | "Build the expense module"            | Specify entities, endpoints, RBAC, file paths        |
| Missing context     | Agent doesn't know the stack          | Include tech stack, package root, key conventions    |
| No file boundaries  | Two agents edit same file → conflicts | Assign explicit directory ownership                  |
| No dependency info  | Agent starts before design exists     | State "Wait for architect's design in the task list" |
| Missing conventions | Agent uses wrong patterns             | Include naming, annotation, and structure rules      |
| Too many tasks      | Agent context overflows               | One focused task per agent (5-6 tasks per teammate)  |

### Tips for Strong Prompts

1. **Be specific about file paths**: "Work in `backend/src/main/java/com/hrms/api/`"
2. **Reference the design**: "Based on the schema in `V94__create_leave_tables.sql`"
3. **Set performance constraints**: "Must handle 10K+ records, complete in < 200ms"
4. **One task per subagent**: Don't overload with unrelated responsibilities
5. **Include tenant context**: Always mention `tenant_id` filtering for multi-tenant queries
6. **State what to wait for**: "Wait for backend-dev to post API endpoints before starting"

---

## 11. Hooks & Quality Gates

### Subagent-Level Hooks (in frontmatter)

```yaml
---
name: safe-writer
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

### Team-Level Hooks (in settings.json)

```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/check-teammate-done.sh" }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/validate-task-output.sh" }
        ]
      }
    ]
  }
}
```

### Hook Exit Codes

| Exit Code | Behavior                                                   |
|-----------|------------------------------------------------------------|
| 0         | Allow (proceed normally)                                   |
| 1         | Error (halt)                                               |
| 2         | Block + send feedback (keeps agent working on corrections) |

### Hook Input

Hooks receive JSON via stdin with tool input details. Example for `PreToolUse` on Bash:

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /tmp/test"
  }
}
```

---

## 12. Cost & Token Management

### Token Cost by Approach

| Approach               | Relative Cost | When to Use                           |
|------------------------|---------------|---------------------------------------|
| Single session + role  | 1x (baseline) | Daily tasks, simple changes           |
| 2-3 subagents          | 2-3x          | Feature design → implement → test     |
| Agent Teams (3 agents) | 5-8x          | Debugging, research, code review      |
| Agent Teams (6 agents) | 10-15x        | Major module builds, sprint execution |

### Cost Optimization Rules

1. **Start simple, escalate when needed** — most tasks (70%) need only a single session
2. **Right-size your team** — 3-5 teammates is the sweet spot. Beyond that, coordination overhead
   grows faster than value
3. **Use cheaper models for simple agents** — Haiku for exploration, Sonnet for review, Opus for
   architecture
4. **5-6 tasks per teammate** — keeps everyone productive without excessive switching
5. **Kill early** — if an agent goes off-track, shut it down and respawn with clearer instructions
6. **Use subagents for focused tasks** — if agents don't need to talk to each other, subagents are
   cheaper than teams
7. **Avoid broadcast** — sending to all teammates costs N messages. Use targeted messages

### Optimal Team Sizing

| Number of Tasks | Recommended Teammates  | Reasoning                    |
|-----------------|------------------------|------------------------------|
| 3-5             | 1-2                    | Low parallelism benefit      |
| 6-10            | 2-3                    | Good task-to-agent ratio     |
| 11-18           | 3-4                    | Balanced coordination        |
| 19-30           | 4-5                    | Maximum practical team       |
| 30+             | 5-6 + phased execution | Diminishing returns beyond 6 |

---

## 13. Troubleshooting

### Agent Teams Issues

| Issue                            | Cause                                   | Fix                                                  |
|----------------------------------|-----------------------------------------|------------------------------------------------------|
| Teammates not appearing          | Task not complex enough or tmux missing | Press Shift+Down; verify `which tmux`                |
| Too many permission prompts      | Unapproved operations                   | Pre-approve common operations in permission settings |
| Teammates stopping on errors     | Error recovery not attempted            | Message teammate directly with instructions          |
| Lead shuts down before work done | Lead thinks team is finished            | Tell lead to wait for teammates before proceeding    |
| Orphaned tmux sessions           | Incomplete cleanup                      | `tmux ls` then `tmux kill-session -t <name>`         |
| Task status stuck                | Teammate didn't mark complete           | Tell lead to nudge teammate or update manually       |
| File conflicts                   | Two agents editing same file            | Assign explicit file/directory ownership             |

### Subagent Issues

| Issue                           | Cause                           | Fix                                  |
|---------------------------------|---------------------------------|--------------------------------------|
| Agent exits immediately         | Missing context in spawn prompt | Add more project context             |
| Wrong code patterns             | Stale or missing conventions    | Include coding conventions in prompt |
| Agent stuck waiting             | Dependency not posted           | Check task list, manually trigger    |
| High token burn, low output     | Task too vague                  | Be more specific in the spawn prompt |
| Agents contradicting each other | No shared design                | Always have architect design first   |

### Session Resumption

- `/resume` and `/rewind` do NOT restore in-process teammates
- After resuming, the lead may try to message nonexistent teammates
- Fix: tell the lead to spawn new teammates

---

## 14. Limitations

### Agent Teams (Experimental)

1. **No session resumption**: `/resume` and `/rewind` don't restore in-process teammates
2. **Task status can lag**: Teammates sometimes fail to mark tasks completed, blocking dependents
3. **Shutdown can be slow**: Teammates finish current request/tool call before shutting down
4. **One team per session**: Clean up current team before starting a new one
5. **No nested teams**: Teammates cannot spawn their own teams
6. **Lead is fixed**: Cannot promote a teammate to lead or transfer leadership
7. **Permissions set at spawn**: All teammates start with lead's mode; change individually after
8. **Split panes require tmux/iTerm2**: Not supported in VS Code terminal, Windows Terminal, or
   Ghostty

### Subagents

1. **Cannot spawn other subagents**: No nesting
2. **No inter-agent communication**: Report back to main session only
3. **Fresh context each invocation**: Unless explicitly resumed via `SendMessage`
4. **Plugin subagents cannot use hooks, mcpServers, or permissionMode**
5. **Background subagents auto-deny unapproved permissions**: Pre-approve before launching

### Both

- `CLAUDE.md` files load normally for both subagents and teammates
- Each agent context window is independent — no shared memory during execution
- Token usage scales linearly with number of active agents

---

## 15. NU-AURA Specific Configurations

### Current Setup

**Settings** (`.claude/settings.json`):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "experimental": {
    "agentTeams": true
  }
}
```

**Teammate mode** (`.claude/claude.json`):

```json
{
  "teammateMode": "in-process"
}
```

### NU-AURA Agent Role Definitions

Six roles defined in `CLAUDE.md` via `@role` prefix:

| Role         | Persona                     | Focus                                             |
|--------------|-----------------------------|---------------------------------------------------|
| `@architect` | Senior Systems Architect    | API contracts, DB schema, RBAC design, ADRs       |
| `@dev`       | Senior Full-Stack Developer | Feature implementation, tests alongside code      |
| `@qa`        | Senior QA Engineer          | RBAC boundary tests, E2E, edge cases, bug reports |
| `@reviewer`  | Tech Lead                   | Security, quality, patterns, performance review   |
| `@devops`    | Platform Engineer           | Docker, CI/CD, K8s, monitoring                    |
| `@docs`      | Technical Writer            | API docs, ADRs, READMEs, changelogs               |

### NU-AURA Subagent Library

Six pre-built spawn prompts in `AGENTS.md`:

1. **Architect Subagent** — Produces design options, API contracts, schema SQL, Mermaid diagrams
2. **Dev Subagent** — Implements code following all project conventions
3. **QA Subagent** — Generates test matrices, RBAC boundary tables, E2E test code
4. **Code Reviewer Subagent** — Reviews with severity ratings and fix suggestions
5. **DevOps Subagent** — Docker, CI/CD, K8s manifests, env var documentation
6. **Docs Subagent** — API docs, ADRs, module READMEs

### NU-AURA Team Configurations

Four pre-built team configs in `TEAMS.md`:

| Config                | Agents | Use Case                                         |
|-----------------------|--------|--------------------------------------------------|
| Full Feature Build    | 6      | New module (e.g., Expense Management)            |
| Cross-Module Refactor | 4      | Spanning multiple sub-apps (e.g., RBAC refactor) |
| Bug Hunt / Debugging  | 3      | Complex bug with competing hypotheses            |
| Sprint Execution      | 5      | Multiple independent tickets in parallel         |

### NU-AURA Context That Every Agent Needs

When spawning agents for this project, always include:

```text
PROJECT: NU-AURA (bundle app platform with 4 sub-apps)
STACK: Next.js 14 + Mantine UI + Tailwind CSS | Spring Boot 3.4.1 (Java 17)
DB: PostgreSQL (Neon dev / PG 16 prod) + Redis 7 + Kafka
PACKAGE ROOT: com.hrms (NOT com.nulogic.aura)
MULTI-TENANCY: Shared DB, shared schema, tenant_id UUID on all tables
RBAC: JWT in cookies (roles only), permissions from DB via SecurityService
PERMISSION FORMAT: module.action (DB) / MODULE:ACTION (code)
SUPERADMIN: Bypasses ALL checks
FLYWAY: V0-V93, next = V94
DESIGN SYSTEM: Blue monochrome (hue ~228), CSS variables, no bg-white/shadow-sm/gray-*
```

### File Ownership Rules for Parallel Work

```
ARCHITECT    → docs/, schemas, Mermaid diagrams
BACKEND DEV  → backend/src/main/java/com/hrms/api/
               backend/src/main/java/com/hrms/application/
               backend/src/main/java/com/hrms/domain/
FRONTEND DEV → frontend/app/<module>/
               frontend/components/<module>/
               frontend/lib/hooks/
               frontend/lib/services/
QA ENGINEER  → frontend/e2e/
               backend/src/test/
DEVOPS       → docker-compose.yml
               .github/workflows/
               deployment/kubernetes/
DOCS         → docs/
               Swagger annotations in controllers
```

**Shared files requiring coordination** (post to task list before editing):

- `backend/src/main/java/com/hrms/common/config/SecurityConfig.java`
- `backend/src/main/resources/application.yml`
- `frontend/lib/config/apps.ts`
- `frontend/app/globals.css`
- `frontend/tailwind.config.js`

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATION                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Single Session          Cost: 1x               │
│  └── @role prefix in prompt       70% of tasks           │
│                                                          │
│  Layer 2: Subagents               Cost: 2-3x             │
│  └── Agent tool, one-way comms    25% of tasks           │
│  └── Sequential or fan-out        Cannot talk to peers   │
│                                                          │
│  Layer 3: Agent Teams             Cost: 5-15x            │
│  └── Full sessions, bidirectional 5% of tasks            │
│  └── Shared task list + mailbox   Require TEAMS enabled  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  TEAM SIZING: 3-5 teammates, 5-6 tasks per teammate     │
│  FILE CONFLICTS: Assign directory ownership per agent    │
│  DESIGN FIRST: Always architect before dev               │
│  KILL EARLY: Respawn with clearer prompt if off-track    │
│  MONITOR: Check task list regularly for blocked tasks    │
└──────────────────────────────────────────────────────────┘
```
