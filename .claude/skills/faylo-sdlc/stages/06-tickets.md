# Stage 06 — Tickets

`faylo log 06-tickets faylo-prd-creator <EP-id> started`.

Invoke `faylo-prd-creator` to produce the ticket breakdown and the requirement-to-story traceability
mapping (`artifacts/06-tickets/requirement-to-story-mapping.v1.json`), with `faylo-tech-lead`
sanity-checking sequencing and sizing before anything is opened. `faylo-technical-writer` stubs a
documentation outline per ticket, filled in at Stage 12.

Then open the work under the engagement's epic (created at Stage 02) — ids come only from the CLI:

```
faylo new story "<title>" --epic <EP-id> --tier <tier from Stage 05> \
    --ac "Given ... When ... Then ..." --verify "shell <command>" \
    [--ac ... --verify ...] [--field Depends-On=<US-id>,<US-id>]
```

One `--verify` per `--ac`, positionally paired; `manual` only when no command can decide it. Put
`Depends-On` on any story that must wait for another — `faylo next` will not offer it until those
are Done. Every story must map to at least one requirement in the traceability file.

`faylo log 06-tickets faylo-prd-creator <EP-id> ok --note "<n> stories"`. This closes Phase 1.
Continue into `run` (`faylo next` picks the first story).
