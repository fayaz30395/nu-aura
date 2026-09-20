# US-2FX1618JXKEP: FR-2b: unlabeled-input re-audit + backfill (154 cited, needs re-audit)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Re-audited against current main - real gap is 115 form-field instances across 71 files (not 154; two independent re-audit passes got 99 and 151 respectively due to scan methodology drift and one pass losing context of already-fixed icon-buttons - 115 is the reconciled, file-verified count excluding the already-shipped FR-2d icon-button work). Full list at /private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/cae6655b-8070-4b33-bfc8-16dc5618c996/scratchpad/input_gaps_table.md. Split into 2 disjoint file-halves for parallel faylo-frontend-engineer fixers to avoid write collisions.
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit --pretty false && npx eslint . --max-warnings=0"
  - **Verified:** yes (2026-09-20)
