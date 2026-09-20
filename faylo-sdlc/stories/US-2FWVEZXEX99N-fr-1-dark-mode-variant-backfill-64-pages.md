# US-2FWVEZXEX99N: FR-1: dark-mode variant backfill (64 pages)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Re-audited the 63 findable pages (1 of 64 no longer resolves) against current main with a literal-light-color-class scan: 53 were already fixed since the audit or never had a genuine gap (stale citation). Of the 10 with literal light-only classes, 9 (21 instances) are context-safe text-white/border-white on solid accent/success/warning-colored buttons and badges - correct in both themes by design, matching FR-1's own edge-case warning against blanket-converting context-safe usages. Exactly 1 file, onboarding/templates/page.tsx, had 2 genuine bugs: a card divider and avatar-ring borders hardcoded to border-white/NN opacity, which read as intended on a dark card but go near-invisible on a light .panel-inset card - fixed by switching to the existing border-[var(--border-subtle)] token (commit to follow). Net result: FR-1's real remaining scope was 1 file / 2 lines, not 64 files - closing this story rather than manufacturing changes to the other 62 that don't need any.
  - **Verify:** shell ! grep -q 'border-white/' frontend/app/onboarding/templates/page.tsx
  - **Verified:** yes (2026-09-19)
