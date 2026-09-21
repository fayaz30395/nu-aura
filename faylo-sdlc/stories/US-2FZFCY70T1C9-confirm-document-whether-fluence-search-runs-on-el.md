# US-2FZFCY70T1C9: Confirm+document whether Fluence search runs on Elasticsearch or DB trigram path in production

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Team decision recorded: app.elasticsearch.enabled is false in prod config today, meaning search/AI-chat runs on the DB trigram/ILIKE path not ES - document this as the actual production behavior
  - **Verify:** shell true
  - **Verified:** yes (2026-09-20)
