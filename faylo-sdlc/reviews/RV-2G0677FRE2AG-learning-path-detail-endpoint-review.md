# RV-2G0677FRE2AG: Learning path detail endpoint review

> **Story:** US-2G04TR3X33SD
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Investigated: no learning-paths backend endpoint existed at all (list or detail) - LearningPath/LearningPathCourse entities and V11 schema existed but no repository/service/controller wiring. Added LearningPathRepository (JOIN FETCH courses, since open-in-view=false), LmsService.getLearningPathById, and GET /api/v1/lms/learning-paths/{id} returning the path with its @OrderBy(orderIndex)-sorted courses. Scoped to just the detail endpoint per AC1 - the list endpoint the frontend also calls and the enroll endpoint are separate pre-existing gaps, out of this ticket's scope. Compiles clean.
