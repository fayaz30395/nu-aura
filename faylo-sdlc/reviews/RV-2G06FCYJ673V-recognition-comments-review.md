# RV-2G06FCYJ673V: Recognition comments review

> **Story:** US-2G04VHZA2AM9
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Added RecognitionComment entity + repository (mirroring RecognitionReaction's own-entity pattern, consistent with how recognition reactions already work independently of the linked wall post rather than delegating to WallService), V326 migration, RecognitionService.addComment/getComments/deleteComment (increments/decrements Recognition.commentsCount, which already existed but was unused), and POST/GET/DELETE /api/v1/recognition/{id}/comments on RecognitionController. Delete allows the comment's own author or RECOGNITION:MANAGE. Compiles clean.
