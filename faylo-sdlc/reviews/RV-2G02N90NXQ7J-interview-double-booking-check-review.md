# RV-2G02N90NXQ7J: Interview double-booking check review

> **Story:** US-2FZSYY1R4MTM
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

scheduleInterview/updateInterview now reject overlapping [scheduledAt, scheduledAt+duration) windows for the same interviewer against other SCHEDULED/RESCHEDULED interviews, excluding the interview being updated. Compiles clean.
