# US-2FX161HKZRS3: FR-2d: icon-only-button aria-label re-audit + backfill (32 cited, needs re-audit)

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

- **AC1:** Re-audit current icon-only-button gap against main, then backfill aria-label on the underlying control (not PermissionGate/FeatureGate wrappers)
  - **Verify:** shell bash -c "cd frontend && n=0; for f in app/admin/integrations/webhooks/page.tsx app/admin/permissions/page.tsx app/departments/page.tsx app/fluence/search/page.tsx app/integrations/slack/page.tsx app/leave/approvals/page.tsx app/leave/my-leaves/page.tsx app/me/profile/page.tsx app/nu-drive/_components/DriveToolbar.tsx app/nu-drive/_components/FileGridView.tsx app/nu-drive/_components/FileListView.tsx app/one-on-one/page.tsx app/performance/competency-framework/page.tsx app/performance/okr/page.tsx app/recruitment/scorecards/page.tsx app/reports/scheduled/page.tsx app/shifts/definitions/page.tsx app/shifts/my-schedule/page.tsx app/shifts/patterns/page.tsx app/shifts/swaps/page.tsx 'app/time-tracking/[id]/edit/page.tsx' 'app/time-tracking/[id]/page.tsx' 'app/travel/[id]/page.tsx' app/travel/new/page.tsx components/dashboard/PostComposer.tsx components/resource-management/EmployeeStep.tsx components/ui/AdvancedFilterPanel.tsx; do grep -q 'aria-label' \"\$f\" || n=\$((n+1)); done; [ \$n -eq 0 ]"
  - **Verified:** yes (2026-09-20)
