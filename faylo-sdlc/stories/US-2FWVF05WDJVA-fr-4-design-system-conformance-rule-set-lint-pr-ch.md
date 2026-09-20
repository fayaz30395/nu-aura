# US-2FWVF05WDJVA: FR-4: design-system conformance rule set (lint/PR-check/codemod)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** In Progress
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** frontend/scripts/check-styling-drift.mjs (existing, reused per Stage-08 decision) flags border-l/r>1px colored-accent stripes and bg-clip-text gradient text (DESIGN.md Don'ts, section 6), plus an advisory blur-class rule for manual review. Chrome-accent-color and card-nesting rules are explicitly NOT automated (documented in the script header as needing semantic analysis, not regex) - verified against this codebase: var(--prod-hire) is legitimately used as a chart data-series color in app/reports/page.tsx, which a className regex would have false-flagged as a chrome violation.
  - **Verify:** shell node frontend/scripts/check-styling-drift.mjs --json | grep -q '"border-accent-stripe"'
  - **Verified:** pending
