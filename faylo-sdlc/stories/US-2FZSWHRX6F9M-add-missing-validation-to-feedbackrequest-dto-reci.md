# US-2FZSWHRX6F9M: Add missing validation to FeedbackRequest DTO (recipientId, giverId, feedbackType, feedbackText all unvalidated despite @Valid on controller)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** FeedbackRequest rejects null/blank required fields with 400
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
