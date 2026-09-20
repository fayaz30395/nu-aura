# Stage 09 — Planning

`faylo log 09-planning faylo-architect <US-id> started`.

`faylo-architect` plans the implementation approach. For an ambiguous or cross-cutting story only,
`faylo-tech-lead` mentors the sequencing of subtasks first and logs its pass with
`faylo log 09-planning faylo-tech-lead <US-id> ok`. The tier may be tightened here with
`faylo tier <US-id> <tier> --stage 09-planning --by faylo-architect` (the Architect seat's call; the
CLI refuses to loosen).

Then move the story: **`faylo transition <US-id> Ready`**. This fails if any AC lacks a `Verify:`
line — fix the story's `Verify:` lines (author-written) and re-run; if an AC genuinely cannot be
given a command, set `Verify: manual` and note that a human will `faylo verify mark` it.

On a transition that still fails: `faylo route 09-planning <US-id> --note "<error text>"`.
Otherwise `faylo log 09-planning faylo-architect <US-id> ok` and proceed to Stage 07 if the UI
surface is flagged and Stage 07 has not run, else Stage 10.
