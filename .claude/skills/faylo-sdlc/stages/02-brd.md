# Stage 02 — BRD

**The epic is the engagement's anchor.** If the human already ran `faylo new epic "<request>"`
(check `faylo status`: a Draft epic with no stories whose title matches the request), use that
`EP-id`. Otherwise create it now — `faylo new epic "<one-line request>"` — and use the id it
prints. Every engagement-level stage logs against it, so `faylo history --artifact-id <EP-id>` is
the engagement's timeline and its resume point.

`faylo log 02-brd faylo-prd-creator <EP-id> started`.

Derive `engagement_name` from the request: kebab-case, max 50 chars, pattern
`^[a-z0-9]+(-[a-z0-9]+)*$` (`agents/_contracts/WORKSPACE-CONVENTION.md`). Record it in the BRD
header and in `--note`. Do not stop to have it confirmed — a human who wants a different name
resolves it as a decision later; the folder can be renamed, the pipeline should not wait.

If `faylo-sdlc/baseline.json` exists, this is a delta: read `artifacts/00-adopt/as-is-product.md` and `as-is-requirements.md` first and state what changes against them. Invoke `faylo-prd-creator` with the one-line request, the relevant `business-context/` file(s), and
`artifacts/01-clarify/answers.md` if Stage 01 ran. Draft the BRD (`artifacts/02-brd/brd.md`)
automatically — do not wait on a human to write it. A business rule that is missing from
`business-context/` is an open question in the BRD and a `faylo decision defer <EP-id> ...`, never
an invention (AGENTS.md rule 4).

`faylo log 02-brd faylo-prd-creator <EP-id> ok --note "engagement_name=<name>"`, then straight to
Stage 03.
