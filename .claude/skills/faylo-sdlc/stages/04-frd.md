# Stage 04 — FRD

`faylo log 04-frd faylo-prd-creator <EP-id> started`.

Invoke `faylo-prd-creator` a third time, against the PRD, to derive concrete behavior,
inputs/outputs and known edge cases into `artifacts/04-frd/frd.md`, with `faylo-business-analyst`
folding in the edge-case pass. The FRD must be concrete enough for `faylo-architect` to assess
blast radius without a follow-up question. `faylo-prd-creator` then writes
`outputs/faylo-prd-creator-output.json` (paths to all three documents plus the extracted
acceptance criteria).

`faylo log 04-frd faylo-prd-creator <EP-id> ok`, then hand to Stage 05 automatically — do not stop
and wait here.
