# docs/handoff — Claude ↔ Codex message bus

Shared filesystem coordination point for two CLI coding agents working in this repo.

**Protocol:** `docs/runbooks/claude-codex-handoff.md`

## Layout

```
docs/handoff/
├── README.md             ← this file (committed)
├── .gitignore            ← keeps message content out of git (committed)
├── plan.md               ← Claude → Codex: plans, instructions      (gitignored)
├── audit-findings.md     ← Claude → Codex: audit findings, reviews  (gitignored)
├── diffs/                ← Codex → Claude: proposed diffs           (gitignored)
├── followups/            ← Claude → Codex: review feedback          (gitignored)
└── .locks/               ← runtime lock files                       (gitignored)
```

## Ownership

| File / dir            | Writer | Reader |
|-----------------------|--------|--------|
| `plan.md`             | Claude | Codex  |
| `audit-findings.md`   | Claude | Codex  |
| `diffs/*.md`          | Codex  | Claude |
| `followups/*.md`      | Claude | Codex  |

## Operate via the helpers

```bash
./scripts/handoff/status.sh                                                # see bus state
./scripts/handoff/claim.sh   --file plan.md --agent claude
./scripts/handoff/append.sh  --file plan.md --from claude --to codex --re "subj" --body "..."
./scripts/handoff/release.sh --file plan.md --agent claude
```

Full convention + examples: `docs/runbooks/claude-codex-handoff.md`.
