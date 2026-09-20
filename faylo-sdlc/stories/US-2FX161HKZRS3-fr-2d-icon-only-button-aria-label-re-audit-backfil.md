# US-2FX161HKZRS3: FR-2d: icon-only-button aria-label re-audit + backfill (32 cited, needs re-audit)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** In Progress
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Re-audit current icon-only-button gap against main, then backfill aria-label on the underlying control (not PermissionGate/FeatureGate wrappers)
  - **Verify:** `cd frontend && for pair in \
      "app/admin/integrations/webhooks/page.tsx:Copy secret" \
      "app/admin/integrations/webhooks/page.tsx:Dismiss" \
      "app/admin/permissions/page.tsx:Edit role" \
      "app/admin/permissions/page.tsx:Delete role" \
      "app/departments/page.tsx:Dismiss error" \
      "app/fluence/search/page.tsx:Clear type filter" \
      "app/fluence/search/page.tsx:Clear visibility filter" \
      "app/integrations/slack/page.tsx:Back to integrations" \
      "app/leave/approvals/page.tsx:Dismiss error" \
      "app/leave/my-leaves/page.tsx:Dismiss error" \
      "app/me/profile/page.tsx:Close" \
      "app/nu-drive/_components/DriveToolbar.tsx:Grid view" \
      "app/nu-drive/_components/DriveToolbar.tsx:List view" \
      "app/nu-drive/_components/FileGridView.tsx:More options" \
      "app/nu-drive/_components/FileListView.tsx:More options" \
      "app/one-on-one/page.tsx:Delete agenda item" \
      "app/performance/competency-framework/page.tsx:Delete competency" \
      "app/performance/okr/page.tsx:Expand objective" \
      "app/performance/okr/page.tsx:Edit objective" \
      "app/performance/okr/page.tsx:Delete objective" \
      "app/performance/okr/page.tsx:Delete key result" \
      "app/recruitment/scorecards/page.tsx:Remove criterion" \
      "app/recruitment/scorecards/page.tsx:Delete scorecard" \
      "app/reports/scheduled/page.tsx:Remove recipient" \
      "app/shifts/definitions/page.tsx:Back to shifts" \
      "app/shifts/my-schedule/page.tsx:Back to shifts" \
      "app/shifts/patterns/page.tsx:Back to shifts" \
      "app/shifts/swaps/page.tsx:Back to shifts" \
      "app/time-tracking/[id]/edit/page.tsx:Back" \
      "app/time-tracking/[id]/page.tsx:Back" \
      "app/travel/[id]/page.tsx:Back to travel requests" \
      "app/travel/new/page.tsx:Back" \
      "components/dashboard/PostComposer.tsx:Remove option" \
      "components/dashboard/PostComposer.tsx:Clear recipient" \
      "components/resource-management/EmployeeStep.tsx:Remove employee" \
      "components/ui/AdvancedFilterPanel.tsx:Filter presets" \
    ; do f="${pair%%:*}"; label="${pair#*:}"; grep -qF "$label" "$f" && grep -q "aria-label" "$f" || echo "MISSING: $pair"; done` — expect no `MISSING:` lines (all 36 file/label pairs found; per-file checks are not line-scoped so a file appearing multiple times just re-confirms `aria-label` presence, but the label-text match is exact — `app/performance/okr/page.tsx:Expand objective` matches via the dynamic `aria-label={expandedObjectives.has(...) ? 'Collapse objective' : 'Expand objective'}` expression); also `npx tsc --noEmit --pretty false` and `npx eslint <changed files> --max-warnings=0` must both be clean
  - **Verified:** pending
