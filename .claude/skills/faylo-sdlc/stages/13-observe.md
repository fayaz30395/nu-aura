# Stage 13 — Observe (continuous)

Runs after release for the life of the engagement — not a single pass. `faylo-sre-engineer`
defines/updates SLOs and runbooks; `faylo-secops-analyst` watches for live security incidents;
`faylo-data-engineer` watches pipeline freshness and data-quality drift;
`faylo-performance-engineer` watches for production performance regressions.

A finding is a new work item, opened the only way work is opened:

```
faylo log 13-observe <finding agent> "" started
faylo new epic "<finding, as a one-line request>"
faylo log 13-observe <finding agent> <EP-id> ok --note "opened from observe"
```

then Stages 02–06 for that epic with **no inherited tier** — `faylo-architect` assesses it fresh.
This is `triggers["13-observe"].on_new_work_item` (`faylo-prd-creator`) and the pipeline's closed
loop. An incident that needs a human *now*: `faylo decision defer` on the affected story and say
so in the report. `faylo pause` is human-only — an agent cannot stop the loop, only ask.
