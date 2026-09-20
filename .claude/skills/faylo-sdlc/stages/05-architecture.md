# Stage 05 — Architecture

`faylo log 05-architecture faylo-architect <EP-id> started`.

Invoke `faylo-architect` against the FRD, `architecture-principles/*.md`, and — for an adopted codebase — `artifacts/00-adopt/as-is-architecture.md`, whose blast-radius map is the starting point. It assigns the
engagement's autonomy tier — `autonomous`, `async-review` or `hard-gate` — and flags the blast
radius, into `outputs/faylo-architect-output.json`. If the provisional read is
async-review/hard-gate, or the FRD touches auth, payments, PII or a shared contract,
`faylo-architect` invokes `faylo-security-architect` for a threat-model pass
(`artifacts/05-architecture/threat-model.md`) before finalizing — AGENTS.md rule 3. A shared
contract or public client commerce logic is never `autonomous`.

The tier from this stage is what Stage 06 passes as `--tier` on every `faylo new story`. It can
only tighten downstream, never loosen (`faylo tier-gate`).

If the FRD is not concrete enough to size: `faylo route 05-architecture <EP-id> --note "..."`
(`retry` → `faylo-tech-lead` helps decompose; `exhausted` → deferred to a human).
Otherwise `faylo log 05-architecture faylo-architect <EP-id> ok --note "tier=<tier>"`, then Stage
06 automatically.
