# Stage 10 — Implementation

`faylo log 10-implementation faylo-developer <US-id> started`, then
**`faylo transition <US-id> "In Progress"`**.

`faylo-developer` routes the story to exactly one specialist implied by its implementation surface
(`specialist_routing["10-implementation"]` in `faylo-sdlc/stage-registry.json`):
`faylo-frontend-engineer`, `faylo-backend-engineer`, `faylo-fullstack-engineer` (small, both
surfaces), `faylo-database-engineer` (anything schema-touching, always in the loop for schema
changes), or `faylo-mobile-engineer`. Work happens on `feature/{US-id}-{slug}` in the target repo.
Specialists consult `faylo-architect` directly for design questions; a judgment call that would
change scope, a business rule, or a shared contract is **deferred** —
`faylo decision defer <US-id> "<question>" --option a --option b` — and work continues on what does
not depend on it.

The specialist writes `outputs/faylo-developer-output.json` (files touched, tests added, open
questions) and runs the project's own tests. `faylo gate` before every commit.

If the specialist cannot complete (tests it wrote fail after its own fix attempt, or the surface
turns out larger than sized): `faylo route 10-implementation <US-id> --note "..."` — on `retry`,
re-route once (a larger-than-sized story goes to split specialists); on `exhausted` the story is
Blocked and the loop moves on. Otherwise `faylo log 10-implementation faylo-developer <US-id> ok`
and proceed to Stage 11.
