# Stage 00 — Adopt (existing codebases only)

Runs once per existing application, before the first `start`. Skip entirely for a greenfield
repo (no source files beyond `faylo-sdlc/`). Re-run `faylo adopt` alone whenever the baseline
should be refreshed (new branches, a large merge); the documents below are then updated, not
rewritten.

**1. The deterministic half.** `faylo adopt --product <name>` — writes `faylo-sdlc/baseline.json`
(stack, test command guess, docs/CI present, source shape, git state: current branch, commits
ahead of the default branch, uncommitted changes, every unmerged branch), opens the adoption epic
`<EP-id>` (`Origin: adopt`), and creates one **in-flight story per unmerged branch / dirty tree**
(`Origin: in-flight`, `Branch:` field, one manual AC). Those stories come first in `faylo next`.

`faylo log 00-adopt faylo-architect <EP-id> started`.

**2. The as-is documents**, under `artifacts/00-adopt/` in the engagement folder — written from the
code and `baseline.json`, never from assumption; every claim cites a file path:

| File | Author | Contains |
|---|---|---|
| `as-is-product.md` | `faylo-business-analyst` | What the application does and for whom, as it exists: users, workflows, integrations, the success metric it evidently serves. Open questions the code cannot answer → `faylo decision defer <EP-id> "<question>" --option ...`. |
| `as-is-requirements.md` | `faylo-business-analyst` | The existing behaviour as EARS statements (WHEN/IF/SHALL), one per observable feature, each citing where it is implemented and whether a test covers it. This is the baseline every later PRD is a delta against. |
| `as-is-architecture.md` | `faylo-architect` | Modules and boundaries, data stores, external integrations and shared contracts, the test command and its current result (`baseline.json.test_command_guess` — run it), the invariants a change must not break, and a provisional blast-radius map (which areas are `hard-gate` by AGENTS.md rule 3: auth, payments, PII, shared contracts). |
| `in-flight.md` | `faylo-architect` | For every `Origin: in-flight` story: what the branch/diff actually changes (`git diff <default>...<branch>`), which as-is requirements it touches, its provisional tier, and a recommendation (ship / re-scope / drop) for the human to decide on AC1. |
| `business-context-draft.md` | `faylo-technical-writer` | A draft of the `business-context/<product>.md` page for the faylo-sdlc repo (1 page, agent-consumable, specific only). A human copies it into faylo-sdlc; until then, `faylo decision defer <EP-id> "adopt business-context-draft.md into faylo-sdlc/business-context/?" --option yes --option edit-first`. |

**3. Tier the in-flight work.** For each in-flight story, `faylo tier <US-id> <tier> --stage 00-adopt
--by faylo-architect` per `in-flight.md`. Never loosen.

`faylo log 00-adopt faylo-architect <EP-id> ok --note "<n> in-flight, <stack>"`. If the code
cannot be understood well enough to write `as-is-architecture.md` (no build, no entry point):
`faylo route 00-adopt <EP-id> --note "..."`.

**Then:** hand to `run`. `faylo next` returns the in-flight stories first; each one's Stage 10 is
"finish, re-scope or drop per the human's AC1 decision", not a fresh implementation. A new request
after adoption is `/faylo-sdlc start "<change>"`, and its Stages 02–05 are **deltas** against the
as-is documents: the BRD states what changes and why, the PRD adds or amends EARS statements by
reference to `as-is-requirements.md`, and Stage 05 sizes blast radius against
`as-is-architecture.md`.
