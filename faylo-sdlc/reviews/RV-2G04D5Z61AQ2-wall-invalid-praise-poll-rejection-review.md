# RV-2G04D5Z61AQ2: Wall invalid PRAISE/POLL rejection review

> **Story:** US-2FZSYZJV437N
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

createPost now rejects (IllegalArgumentException -> 400) a PRAISE post with no praiseRecipientId, and a POLL post with no/empty pollOptions, instead of silently persisting an invalid post. WallServiceTest suite passes; compiles clean.
