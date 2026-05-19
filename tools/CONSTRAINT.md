# Data Constraints

NU-AURA documentation and technical claims must be evidence-based. Use this file when producing plans, reviews, architecture notes, audit findings, or implementation summaries.

## Evidence Rules

- Cite only files, commands, logs, or source content that were opened or executed in the current task.
- Prefer file paths with line numbers for code and documentation claims.
- If disk state disagrees with memory, chat history, or handoff text, trust disk state and call out the conflict.
- Do not fabricate counts, percentages, pass rates, performance numbers, API behavior, or feature readiness.
- If a required source is missing, state that it is missing and continue with the best available evidence.

## Code Constraints

- Validate input at system boundaries.
- Never commit secrets, credentials, tokens, private keys, or `.env` files.
- Use environment variables or secret managers for configuration secrets.
- Preserve tenant isolation: tenant-specific queries and data paths must include `tenant_id` or use repository/RLS patterns that enforce it.
- Preserve security controls: do not bypass authentication, authorization, CSRF, audit logging, or feature-flag checks unless the task explicitly requires a controlled change.
- Avoid broad exception swallowing on security or persistence paths unless a local pattern documents the fail-open behavior.

## Reporting Constraints

- Separate verified facts from assumptions.
- Mark residual risk when tests could not be run.
- Include exact command names and outcomes for validation.
- Do not describe work as complete if required checks failed or were skipped.

