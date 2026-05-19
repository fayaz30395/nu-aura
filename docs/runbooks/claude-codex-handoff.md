# Claude ↔ Codex Handoff Protocol

Two CLI coding agents (Claude Code and Codex CLI) collaborate on the same repo using
the local filesystem as a message bus. No daemons, no network — just files that both
agents read and append to.

## Roles

| Agent      | Owns (writes)                                                  | Reads                                             |
|------------|----------------------------------------------------------------|---------------------------------------------------|
| **Claude** | `docs/handoff/plan.md`, `docs/handoff/audit-findings.md`, `docs/handoff/followups/*` | `docs/handoff/diffs/*` (Codex output)             |
| **Codex**  | `docs/handoff/diffs/*`                                         | `plan.md`, `audit-findings.md`, `followups/*`     |

Ownership is enforced two ways:
1. **File locks** (`docs/handoff/.locks/`) — runtime mutual exclusion via the helper scripts.
2. **`.gitignore`** — message content is never committed, so divergent edits never end up in history.

## Loop

```
Claude  ──writes──▶  docs/handoff/plan.md
                     docs/handoff/audit-findings.md
                                │
                                ▼
                          (Codex reads)
                                │
Codex   ──writes──▶  docs/handoff/diffs/<topic>.md
                                │
                                ▼
                         (Claude reads)
                                │
Claude  ──writes──▶  docs/handoff/followups/<topic>.md
```

Repeat until done.

## Message format

Every entry in a handoff file is a markdown block with a fixed header. The helper
scripts produce it for you; if you write by hand, follow this shape:

```markdown
## [2026-05-18T14:32:10Z] claude → codex
**re:** initial audit plan

<message body — markdown, code blocks, paths, line refs all welcome>

---
```

Rules:
- UTC ISO-8601 timestamp in square brackets.
- `<from> → <to>` identifies sender + intended reader. Use `claude` and `codex` (lowercase).
- Optional `**re:**` subject line for threading.
- Body is free-form markdown.
- Closing `---` separates entries.

Files are append-only message logs. Never edit a previous entry — append a new one.

## Lifecycle

These files live in the repo so both agents can see them, but their content is **never
committed**. `docs/handoff/.gitignore` keeps message bodies out of git. Treat them like
a chat scrollback: ephemeral, in-process, throw-away.

If you need a permanent record of a decision, lift it into a real artifact:
- `docs/adr/` for architectural decisions,
- `docs/audit/` for audit reports,
- a real commit message + PR for code changes.

## Helper scripts

All under `scripts/handoff/`. Run them from the repo root.

```bash
# Claim a file before writing (optional but recommended)
./scripts/handoff/claim.sh --file plan.md --agent claude

# Append a message
./scripts/handoff/append.sh --file plan.md --from claude --to codex \
  --re "initial audit plan" --body "1. Run the unzoned-now audit. 2. ..."

# Or pipe the body in
cat <<'EOF' | ./scripts/handoff/append.sh --file plan.md --from claude --to codex --re "plan"
1. Run the unzoned-now audit.
2. Land V172 indexes.
EOF

# Release the claim when you're done writing
./scripts/handoff/release.sh --file plan.md --agent claude

# See what's on the bus right now
./scripts/handoff/status.sh
```

Codex equivalents — just swap `--from codex --to claude` and use `diffs/<topic>.md`:

```bash
./scripts/handoff/claim.sh   --file diffs/unzoned-now.md --agent codex
./scripts/handoff/append.sh  --file diffs/unzoned-now.md --from codex --to claude --re "round 1"
./scripts/handoff/release.sh --file diffs/unzoned-now.md --agent codex
```

`append.sh` honors the lock: if the file is held by a different agent it errors out.

## Pre-commit hook

`scripts/handoff/install-hook.sh` installs a pre-commit hook that blocks accidental
commits of message content (in case someone runs `git add -f` or stages a file the
gitignore didn't catch). Install once per clone:

```bash
./scripts/handoff/install-hook.sh
```

It's a small wrapper that delegates to `scripts/handoff/pre-commit-check.sh` — chain it
into an existing pre-commit hook if you already have one.

## Example session

```bash
# --- Claude side ---
./scripts/handoff/claim.sh --file plan.md --agent claude
./scripts/handoff/append.sh --file plan.md --from claude --to codex --re "kickoff" --body "$(cat <<'EOF'
Goal: kill the 145 P0 unzoned-now() callsites in docs/audit/unzoned-now-audit.md.
- Touch one module at a time so diffs stay reviewable.
- Use TenantTimeService.nowAtTenant() per docs/patterns/tenant-time.md.
Start with the attendance package. Drop your diff in diffs/unzoned-now-attendance.md.
EOF
)"
./scripts/handoff/release.sh --file plan.md --agent claude

# --- Codex side (in another shell, same repo) ---
./scripts/handoff/status.sh                                       # sees the new message
./scripts/handoff/claim.sh   --file diffs/unzoned-now-attendance.md --agent codex
# … Codex generates the diff, writes a summary + the unified diff into the file …
./scripts/handoff/release.sh --file diffs/unzoned-now-attendance.md --agent codex

# --- Claude side ---
./scripts/handoff/status.sh                                       # sees Codex's diff is ready
# Claude reviews, writes findings:
./scripts/handoff/append.sh --file followups/unzoned-now-attendance.md \
  --from claude --to codex --re "round 1 review" --body "..."
```

## Anti-patterns

- **Don't poll** by re-reading files in a tight loop. `tail -f docs/handoff/plan.md`
  if you need to watch.
- **Don't commit** handoff content. If `git status` shows `docs/handoff/plan.md`
  staged, you've broken the protocol — un-stage and check why `.gitignore` missed it.
- **Don't share a single file for two-way chatter.** Use the role-owned files: Claude
  writes to `plan.md`/`audit-findings.md`, Codex writes to `diffs/*`. Cross-writes
  defeat the lock model.
- **Don't long-hold a claim.** Claim, write, release. If you need to think, release
  first.
