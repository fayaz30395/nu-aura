# RV-2G06B6MCV5NG: Frontend implementation review

> **Story:** US-2G00ZA0Y39D9
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-automation-engineer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Leave apply form had no client-side balance check (encashment form did). Added: blocks submit with an error message when requested days exceed available balance for the selected leave type, accounting for the days already held by the request being edited. Backend remains the source of truth; this is a UX guard. tsc + eslint clean.
