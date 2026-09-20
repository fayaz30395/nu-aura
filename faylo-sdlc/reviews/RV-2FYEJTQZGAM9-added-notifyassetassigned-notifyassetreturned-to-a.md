# RV-2FYEJTQZGAM9: Added notifyAssetAssigned/notifyAssetReturned to AssetManagementService, wired into assignAsset/returnAsset (distinct from the existing notifyAssetApproved/Rejected which only cover the approval-workflow decision). Follows the exact createNotification+WS-message+try/catch pattern already used for asset approval notifications. No ASSET_* enum values exist in Notification/NotificationMessage NotificationType, so reused GENERAL/TASK_ASSIGNED/ANNOUNCEMENT per existing codebase convention (notifyAssetApproved/Rejected also reuse generic APPROVAL_* types rather than adding asset-specific ones). mvn compile passes.

> **Story:** US-2FYE7QWNJ535
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
