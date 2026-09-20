# Stage 12 — Release

`faylo log 12-release faylo-release-agent <US-id> started`.

`faylo-release-agent` enacts the story's current tier, coordinating `faylo-devops-engineer`
(pipeline/containers), `faylo-cloud-engineer` (only if new infrastructure is needed),
`faylo-release-manager` (versioning, changelog), `faylo-data-engineer` (instrumentation the BRD's
success metric requires) and `faylo-technical-writer` (finalises the Stage 06 doc stub).

Then the gate for this story: **`faylo gate --release --story <US-id>`**. It runs every invariant,
re-executes this story's `Verify:` lines and checks its tier's sign-off requirement. (Plain
`faylo gate --release` is repo-wide — every hard-gate story must be signed — and is the human's
command for tagging a product release, not a per-story step.) On FAIL:
`faylo route 12-release <US-id> --note "<violations>"`.

On PASS, by tier — every path is logged, nothing ships silently:

- **autonomous** — `faylo transition <US-id> Done`. `faylo log 12-release faylo-release-agent <US-id> ok --note "shipped autonomous"`.
- **async-review** — the Stage 11 review is the review; `faylo transition <US-id> Done`, same log with `--note "shipped async-review"`.
- **hard-gate** — STOP. Do not transition. Report that a human must run `faylo signoff <US-id> --by <name>`.
  `faylo log 12-release faylo-release-agent <US-id> deferred --note "awaiting operator sign-off"`.
  `faylo next` holds this story as awaiting-human until the sign-off review exists; the next `run`
  then finishes it with `faylo transition <US-id> Done`.

After Done, Stage 13 begins for this story's surface.
