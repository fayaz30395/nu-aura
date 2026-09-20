# Stage 01 — Clarify (optional, tier-gated)

Do not run this stage by default. Only invoke `faylo-business-analyst` when the one-line request is
ambiguous (no clear user, no clear success metric) or when a fast provisional read of the request
looks like it will land at async-review or hard-gate tier. On a clear, small request, skip straight
to Stage 02 — asking questions nobody needs answered is a violation of this pipeline's "never stalls
by default" principle, not a sign of thoroughness.

When triggered: `faylo log 01-clarify faylo-business-analyst <EP-id> started`; ask one fixed round
of scoping questions; fold the answers into `artifacts/01-clarify/answers.md`. A question only a
human can answer is `faylo decision defer <EP-id> "<question>" --option ... --option ...` — the
stage proceeds on the other answers, it does not wait. `faylo log 01-clarify faylo-business-analyst
<EP-id> ok`, then Stage 02.
