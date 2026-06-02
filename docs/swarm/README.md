# Swarm Configuration

Canonical, version-controlled copies of the RuFlo swarm configuration that lives in the
runtime-only `.claude-flow/` directory (which is in `.gitignore` per RuFlo convention).

| File                  | Mirrors                                | Purpose                                          |
|-----------------------|----------------------------------------|--------------------------------------------------|
| `domains.yaml`        | `.claude-flow/domains.yaml`            | 5 DDD bounded contexts mapping the 70+ subdirs  |
| `registry.yaml`       | `.claude-flow/registry.yaml`           | Pointers to ADRs, runbooks, patterns, audits     |
| `workflows/*.yaml`    | `.claude-flow/workflows/*.yaml`        | Agent pipeline templates (feature, bug, etc.)    |

## How to sync

After editing the canonical version here, sync to the runtime mount:

```bash
./scripts/ruflo-sync.sh --check
./scripts/ruflo-sync.sh --no-memory
```

The sync script is idempotent and keeps `.claude-flow/` aligned with this tracked
directory. Use `--check` in CI or before starting a pipeline; use `--no-memory` when
you only need file sync and do not want AgentDB seeding.

## Companion documents

- **Runbook for using these pipelines:** `docs/runbooks/swarm-pipelines.md`
- **ADR for swarm topology choice:** documented in `CLAUDE.md` (hierarchical-mesh)
- **Authoritative agent routing table:** `CLAUDE.md` → "Agent Routing" section

## Why this duplication exists

RuFlo's runtime config lives in `.claude-flow/`, which is gitignored to keep machine-specific
state (caches, logs, neural-model weights) out of source control. The YAML configs in this
directory are intentionally shared across the team, so they live in git. The two copies stay
in sync via the manual `cp` shown above.

A cleaner long-term fix is to either:
1. Have RuFlo support a `.claude-flow.config/` tracked directory alongside the gitignored
   runtime dir.
2. Whitelist specific files within `.claude-flow/` in `.gitignore`.

Until then, treat `docs/swarm/` as the source of truth and `.claude-flow/` as the runtime
mount.

## Developer quickstart

Use the repo scripts instead of copying commands by hand:

```bash
# Verify orchestration prerequisites and config drift
./scripts/agents/ready.sh

# Fix docs/swarm → .claude-flow runtime drift
./scripts/agents/ready.sh --fix

# Dry-run a dynamic, adaptive workflow
./scripts/agents/start-work.sh opus4.8 "Classify and execute mixed requirement safely"

# Dry-run a pipeline kickoff
./scripts/agents/start-work.sh feature "Add employee document expiry reminders"

# Start/check the Ruflo runtime
./scripts/ruflo-start.sh

# Execute through Ruflo
./scripts/ruflo-pipeline.sh feature "Add employee document expiry reminders" --execute
```

Pipeline types:

| Type       | Workflow                                | Use for                                |
|------------|-----------------------------------------|----------------------------------------|
| `feature`  | `docs/swarm/workflows/feature-pipeline.yaml`  | New feature touching 3+ files or modules |
| `bug`      | `docs/swarm/workflows/bug-pipeline.yaml`      | Non-trivial root-cause + fix work      |
| `security` | `docs/swarm/workflows/security-pipeline.yaml` | Audit findings, CVEs, hardening        |
| `refactor` | `docs/swarm/workflows/refactor-pipeline.yaml` | Behavior-preserving restructure        |
| `perf`     | `docs/swarm/workflows/perf-pipeline.yaml`     | Slow endpoints, N+1, batch jobs        |
| `opus4.8`  | `docs/swarm/workflows/opus4-8-dynamic-workflow.yaml` | Adaptive routing by requirement risk |
