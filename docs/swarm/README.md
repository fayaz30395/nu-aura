# Swarm Configuration

Canonical, version-controlled copies of the RuFlo swarm configuration that lives in the
runtime-only `.claude-flow/` directory (which is in `.gitignore` per RuFlo convention).

| File                  | Mirrors                                | Purpose                                          |
|-----------------------|----------------------------------------|--------------------------------------------------|
| `domains.yaml`        | `.claude-flow/domains.yaml`            | 5 DDD bounded contexts mapping the 70+ subdirs  |
| `registry.yaml`       | `.claude-flow/registry.yaml`           | Pointers to ADRs, runbooks, patterns, audits     |
| `workflows/*.yaml`    | `.claude-flow/workflows/*.yaml`        | Agent pipeline templates (feature, bug, etc.)    |

## How to sync

After editing the canonical version here, copy to the runtime mount:

```bash
cp docs/swarm/domains.yaml      .claude-flow/domains.yaml
cp docs/swarm/registry.yaml     .claude-flow/registry.yaml
cp docs/swarm/workflows/*.yaml  .claude-flow/workflows/
```

This is the manual step until RuFlo supports reading directly from a tracked path. A
follow-up could add a `make sync-swarm` target.

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
