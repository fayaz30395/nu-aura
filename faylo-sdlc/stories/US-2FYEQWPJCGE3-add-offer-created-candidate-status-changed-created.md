# US-2FYEQWPJCGE3: Add OFFER_CREATED + CANDIDATE_STATUS_CHANGED/CREATED notifications

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** RecruitmentManagementService.createOffer notifies the candidate (not just the internal approver), and candidate creation/status-change events fire a notification matching the pattern used for OfferAccepted/Declined
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
