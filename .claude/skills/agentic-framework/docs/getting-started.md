# Getting Started

## Prerequisites

Install [Beads](https://github.com/steveyegge/beads) — the issue tracker that coordinates swarm workers:

```bash
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

## Install

```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/dralgorhythm/claude-agentic-framework/main/scripts/init-framework.sh | bash -s .
```

The script copies the framework files, installs hook dependencies, initializes Beads, and prompts before overwriting anything.

## Manual Install

```bash
git clone https://github.com/dralgorhythm/claude-agentic-framework.git
cp -r claude-agentic-framework/.claude your-project/
cp claude-agentic-framework/.mcp.json your-project/
cp claude-agentic-framework/CLAUDE.md your-project/
cp claude-agentic-framework/AGENTS.md your-project/
mkdir -p your-project/artifacts
cd your-project/.claude/hooks && npm install
cd your-project && bd init
```

## What Gets Installed

```
.claude/         Commands, skills, rules, hooks, agents, templates
.mcp.json        MCP server configuration
.beads/          Issue tracking database (coordinates swarm workers)
artifacts/       Where generated docs go (empty at first)
CLAUDE.md        Project context — customize this
AGENTS.md        Agent instructions for session completion
```

## Verify It Works

```bash
claude
```

Then try:
```
/architect hello
```

You should see Claude adopt the Architect command.

## Next Steps

1. **Edit CLAUDE.md** — Add your build commands (`npm test`, etc.)
2. **Edit `.claude/rules/tech-strategy.md`** — Configure your tech stack
3. **Try the workflow** — `/architect my-feature` then `/builder` then `/swarm-review`
4. **Check artifacts/** — Your ADRs and design docs appear here

See [beads.md](beads.md) for Beads usage and team setup.

---

[← Back to README](../README.md)
