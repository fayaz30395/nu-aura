# RV-2FZMN91MX0HX: Fixed silent data loss on TrainingProgram create/update: trainerName/trainerEmail/isMandatory/costPerParticipant/materialsUrl/certificateTemplateUrl already existed as entity columns but were entirely absent from TrainingProgramRequest/Response DTOs and never mapped in createProgram/updateProgram/buildProgramResponse — any value the client sent was silently dropped. Added all 6 fields to both DTOs and wired them through create/update/response mapping. Added round-trip tests for create and update.

> **Story:** US-2FZ93K30PRQS
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
