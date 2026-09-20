# US-2FX161DHPZHC: FR-2c: image alt-text re-audit + backfill (37 cited, needs re-audit)

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

- **AC1:** Re-audited against current main - real gap was 2 images, not 37. All 40 next/image usages already had real alt text; only components/ui/Avatar.tsx and app/employees/_components/EmployeeAvatar.tsx had alt="" despite already receiving a `name` prop unused for that purpose. Fixed both (commit 99390cf5).
  - **Verify:** shell bash -c "[ \$(grep -c 'alt=\"\"' frontend/components/ui/Avatar.tsx frontend/app/employees/_components/EmployeeAvatar.tsx | awk -F: '{s+=\$2} END {print s}') -eq 0 ]"
  - **Verified:** yes (2026-09-19)
