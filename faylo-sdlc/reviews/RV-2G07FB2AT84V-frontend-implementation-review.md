# RV-2G07FB2AT84V: Frontend implementation review

> **Story:** US-2G00ZB6A6FE0
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-automation-engineer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Shift Management group stays visible for users with only ungated My Schedule access (correct, since the group's child filter already handles this), but its parent label had a static href='/shifts' which always routed clicks to the SHIFT_VIEW-gated dashboard regardless of which child made the group visible. Removed the static href so NavPanel's existing fallback picks the first visible child's href instead - a My-Schedule-only user now lands on /shifts/my-schedule, not a page the backend blocks them from. tsc + eslint clean.
