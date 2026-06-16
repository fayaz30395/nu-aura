---
tags: [second-brain, obsidian, docs, workflow, meta]
---
Ran a Sonnet multi-agent Workflow to give the nu-aura docs a clean, valid Obsidian mapping.

## What was done
- Workflow `obsidian-doc-mapping` (31 agents, Sonnet, ~9 min): Analyze → Plan → Apply → Verify.
- Added nested-tag YAML frontmatter (`area/`, `layer/`, `app/`, `type/`) + a `## Related`
  full-path wikilink section to **23 knowledge docs** (docs/ tree + root product docs).
- Regenerated `docs/Home.md` as the Map of Content hub; linked `notes/HOME.md` → it.
- Scope deliberately excluded transient files (reports, ISSUE_BOARD, test-results, SKILLs).

## Fixes beyond the workflow
- 6 pre-existing broken links in `README.md` (dead docs/adr, docs/runbooks, docs/agents,
  docs/design-system, docs/team/roles, superpowers spec — removed in the docs reset) →
  repointed to the real current docs structure.
- 2 `notes/HOME.md` wikilinks made full-path (`[[memory/INDEX|...]]`).

## Verification
- Verify agent reported FAIL (8 links) but 2 were false positives (memory/ basename links)
  and 6 were pre-existing. Wrote a deterministic Python link checker (strips table `\|`
  escaping, skips code fences) → **all links across 21 mapped docs resolve. PASS.**
- Frontmatter 23/23 compliant.

## Gotchas for next time
- Obsidian table cells use `[[path\|Alias]]` — the `\` is table-pipe escaping, valid.
- Mermaid `[["..."]]` subroutine nodes look like wikilinks to naive regex; they're in code
  fences and Obsidian ignores them. A link checker must strip code blocks first.
- HEAD after this work: afd5ef43.
