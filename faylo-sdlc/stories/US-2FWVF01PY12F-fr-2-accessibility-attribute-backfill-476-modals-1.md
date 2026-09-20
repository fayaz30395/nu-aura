# US-2FWVF01PY12F: FR-2: accessibility attribute backfill (476 modals, 154 inputs, 37 images, 32 icon buttons)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Modals re-scoped and fixed. Re-audit against current main found the real modal gap was 12 files / 20 instances using a custom "fixed inset-0 bg-black" pattern with no shared wrapper (not 476 - that figure counted, or has drifted far from, actual Modal/Drawer/Dialog usages: 157 total, 36 already Mantine-covered, 8 already had role=dialog via shared Modal.tsx/SlidePanel.tsx). All 20 fixed with role=dialog + aria-modal=true + aria-labelledby via useId() (commit 95cb1b8d). Held at Verified per hard-gate tier - awaiting operator sign-off before Done, not because more modal work remains.
  - **Verify:** shell bash -c "[ \$(grep -rl 'fixed inset-0 bg-black' frontend/app frontend/components --include='*.tsx' | xargs grep -L 'role=\"dialog\"' 2>/dev/null | grep -v 'components/ui/Loading.tsx' | wc -l) -eq 0 ]"
  - **Verified:** yes (2026-09-19)

Input-labeling (154 cited), image alt-text (37 cited), and icon-button aria-label (32 cited) sub-scopes were split out to US-2FX1618JXKEP, US-2FX161DHPZHC, and US-2FX161HKZRS3 respectively - each needs its own re-audit before backfilling, per this story's own AC1 experience that the original QA audit's counts have drifted significantly from current main.
