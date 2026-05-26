# Migration Chain Classification - 2026-05-24

Status: P0 blocker

## Evidence

- `git status --short -- backend/src/main/resources/db/migration` reports:
  - modified old migration files: 24
  - untracked new migration files: 74
- `git diff --numstat -- backend/src/main/resources/db/migration` largest old-migration deltas:
  - `V0__init.sql`: 961 insertions, 108 deletions
  - `V18__document_workflow_enhancement.sql`: 98 insertions, 88 deletions
  - `V15__knowledge_fluence_schema.sql`: 65 insertions, 13 deletions
  - `V16__contract_management_schema.sql`: 26 insertions, 6 deletions
  - `V34__production_hardening_indexes.sql`: 23 insertions, 22 deletions
- Untracked migration sequence currently spans `V180` through `V253`.

## Release Risk

Old Flyway migrations may already be applied in any shared or production-like database. Changing them changes checksums and can break upgrades unless the release intentionally repairs Flyway metadata. NU-AURA rules require new forward-only migrations rather than editing historic migrations.

## Execution Plan

1. Preserve the current old-migration edits until their intent is understood.
2. Compare old-migration edits against the `V180`-`V253` files to identify duplicated schema changes.
3. Move required old-migration behavior into forward-only migrations where missing.
4. Restore old migrations only after the replacement forward migrations are verified.
5. Run a fresh-database Flyway migration.
6. Run an upgrade-database Flyway migration from the latest known deployed schema.

## Current Decision

No old migration has been reverted in this pass. Reverting them without first preserving the intent would risk losing active schema alignment work.
