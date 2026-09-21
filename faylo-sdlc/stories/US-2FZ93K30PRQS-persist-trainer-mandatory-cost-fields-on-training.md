# US-2FZ93K30PRQS: Persist trainer/mandatory/cost fields on Training Program create/update

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

- **AC1:** Creating/editing a program with trainerName/trainerEmail/isMandatory/costPerParticipant/materialsUrl/certificateTemplateUrl persists and round-trips all fields
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
