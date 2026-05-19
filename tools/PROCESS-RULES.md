# Process Rules

These rules define the default workflow for coding, review, planning, and handoff work in NU-AURA.

## Required Task Flow

1. Read `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, and any task-specific handoff or audit file before changing code.
2. Scan the repo for existing standards, ADRs, patterns, and tests related to the requested area.
3. For design or architecture work, check `docs/adr/README.md` first and then open any relevant ADRs.
4. For implementation work, check `docs/patterns/README.md` first and reuse established patterns where applicable.
5. For security-sensitive work, read `docs/security/baseline.md` before editing.
6. Read every file before editing it.
7. Keep edits scoped to the requested task and avoid unrelated refactors.
8. Run the narrowest meaningful checks first, then broader checks when the blast radius justifies them.

## Coding Gates

- Backend changes must compile with Maven before handoff.
- Frontend TypeScript changes must pass `cd frontend && npx tsc --noEmit`.
- Lint and test commands should be run when relevant to the touched surface.
- New migrations must use the next Flyway version and must not modify old migrations.
- Tenant-aware code must preserve tenant scoping and RLS assumptions.
- RBAC-sensitive code must preserve `@RequiresPermission` behavior and SuperAdmin bypass semantics.

## Handoff Discipline

- Do not overwrite user or prior-agent changes.
- If `docs/handoff/` is used, write only through `scripts/handoff/*` and keep files append-only.
- Do not commit handoff contents, local runtime artifacts, secrets, `.env` files, or generated scratch files.
- Report missing required context explicitly instead of pretending it was read.

