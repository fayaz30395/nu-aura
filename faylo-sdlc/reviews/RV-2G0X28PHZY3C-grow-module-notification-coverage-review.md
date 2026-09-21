# RV-2G0X28PHZY3C: Grow-module notification coverage review

> **Story:** US-2FZSWJE29CN9
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

MVP scope: wired FEEDBACK_RECEIVED (FeedbackService.giveFeedback, anonymizes giver name when isAnonymous), OKR_UPDATED (OkrService.updateKeyResultProgress), MEETING_SCHEDULED (MeetingService.scheduleMeeting), SURVEY_PUBLISHED (PulseSurveyService.publishSurvey, broadcast to first 500 active employees when survey goes ACTIVE immediately). Skipped wellness per ticket's 'MVP scope is fine' allowance. Also fixed a real bug found while testing: V326/V327 migrations (from a prior session) omitted BaseEntity's deleted_at column, breaking Hibernate schema validation for any Spring context test - added V328 to backfill it on all three affected tables. Full ReviewCycleControllerTest suite passes.
