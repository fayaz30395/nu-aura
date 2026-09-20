# Stage 08 — Dependencies

`faylo log 08-dependencies faylo-architect <US-id> started`.

`faylo-architect` confirms the story's dependencies are resolvable (any shared contract, any external
system, any other story this one must wait for — recorded with
`faylo depends <US-id> --on <US-id>,<US-id>` so `faylo next` orders the work), flags the UI surface (decides whether Stage 07 runs) and the
implementation surface (decides which specialist `faylo-developer` routes to at Stage 10, per
`specialist_routing` in `faylo-sdlc/stage-registry.json`), and writes both to
`outputs/faylo-architect-output.json` for the ticket.

If a dependency cannot be resolved by an agent (a missing contract, an unanswered business rule):
`faylo decision defer <US-id> "<question>" --option ... --option ...` and
`faylo route 08-dependencies <US-id> --note "..."`.
Otherwise `faylo log 08-dependencies faylo-architect <US-id> ok` and proceed to Stage 09.
