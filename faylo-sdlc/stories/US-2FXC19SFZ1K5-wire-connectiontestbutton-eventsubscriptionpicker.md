# US-2FXC19SFZ1K5: Wire ConnectionTestButton + EventSubscriptionPicker into ConnectorConfigPanel (Integrations gap)

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

- **AC1:** ConnectorConfigPanel.tsx renders ConnectionTestButton and EventSubscriptionPicker (both complete, built, zero usages) so admins can test a connection and pick webhook event subscriptions from /admin/integrations
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
