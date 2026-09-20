# US-2FXC19ZKBX9W: Delete confirmed-dead MacroRenderer.tsx (superseded by Tiptap NodeViews)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** MacroRenderer.tsx removed - confirmed superseded by TableOfContentsNodeView/ExpandCollapseNodeView which already render the same macros via native Tiptap NodeViews
  - **Verify:** shell bash -c "! test -f frontend/components/fluence/MacroRenderer.tsx && cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
