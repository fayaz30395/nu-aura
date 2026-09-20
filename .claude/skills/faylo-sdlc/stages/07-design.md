# Stage 07 — Design (conditional)

Runs only for a story whose Stage 08/09 output flags a UI surface; otherwise skip to Stage 08.

`faylo log 07-design faylo-ux-researcher <US-id> started`.

`faylo-ux-researcher` produces the interaction outline, `faylo-ui-designer` the component spec
(`artifacts/07-design/component-spec.md` under the ticket folder), and
`faylo-accessibility-engineer` reviews it for missing states and contrast before implementation.
Findings are folded into the spec, not deferred to Stage 11.

On a spec the accessibility review rejects twice: `faylo route 07-design <US-id> --note "..."`.
Otherwise `faylo log 07-design faylo-ux-researcher <US-id> ok` and proceed to Stage 08.
