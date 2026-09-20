# Stage 11 — Verification

`faylo log 11-verification faylo-qa-reviewer <US-id> started`.

`faylo-qa-reviewer` coordinates: `faylo-qa-automation-engineer` always runs the automated suite;
`faylo-appsec-engineer` when the tier is async-review/hard-gate or the story touches
auth/payments/PII; `faylo-pentest-engineer` only for hard-gate on a genuinely new attack surface;
`faylo-performance-engineer` checks latency/payload budgets; `faylo-accessibility-engineer`
spot-checks if Stage 07 ran. Any specialist finding may tighten the tier: `faylo tier <US-id> <tier> --stage 11-verification --by faylo-qa-reviewer` (never loosens).

Then the acceptance criteria decide: **`faylo verify run <US-id>`**. This is the only thing that
writes `Verified:`. A `manual` AC stays pending until a human runs `faylo verify mark` — report it
and continue; the story cannot reach Verified until then.

On FAIL: `faylo route 11-verification <US-id> --note "AC<n>: <tail of output>"`. `retry` → hand
back to `faylo-developer` (Stage 10) for the failing ACs only, then re-run `verify run`;
`exhausted` → Blocked, back to `faylo next`.

On PASS: the independent review — a seat other than the author:
`faylo new review "<title>" --story <US-id> --author <implementing seat> --reviewer <qa or security seat> --verdict pass`
(`--verdict fail` routes exactly like a verify FAIL). Then **`faylo transition <US-id> Verified`**,
`faylo log 11-verification faylo-qa-reviewer <US-id> ok`, proceed to Stage 12.
