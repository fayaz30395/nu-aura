# US-2FWVEQZADNJD: FR-3: table-header contrast fix (WCAG AA)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** tailwind-presets.ts table-header preset and TeamRequestsView.tsx's 5 table-header cells use a token that passes WCAG AA 4.5:1 in both themes. (FRD's second cited occurrence, attendance/page.tsx `text-2xs text-[var(--text-muted)]`, no longer exists verbatim in that file at drafting time vs now - remaining attendance/page.tsx `--text-muted` usages are caption/label text, not table headers, and are out of FR-3 scope per its own edge-case note against blanket token changes)
  - **Verify:** shell ! grep -rq 'text-\[var(--text-muted)\]' frontend/styles/tailwind-presets.ts "frontend/app/attendance/regularization/_components/TeamRequestsView.tsx"
  - **Verified:** yes (2026-09-24)
