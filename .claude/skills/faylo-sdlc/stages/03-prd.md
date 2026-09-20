# Stage 03 — PRD

`faylo log 03-prd faylo-prd-creator <EP-id> started`.

Invoke `faylo-prd-creator` again, against the BRD from Stage 02, to derive the user stories and
EARS acceptance criteria (WHEN / IF / SHALL) into `artifacts/03-prd/prd.md`. Every acceptance
criterion must be phrased so that Stage 06 can attach a `--verify "shell <cmd>"` to it; one that
cannot be is marked `manual` there and will need a human's `faylo verify mark`.

`faylo log 03-prd faylo-prd-creator <EP-id> ok`, then straight to Stage 04. No manual handoff.
