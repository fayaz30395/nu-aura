# RV-2G0XA9W36HDW: Forgot-password authProvider leak review

> **Story:** US-2G08K1MZJEP4
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Removed authProvider from the forgot-password response body (frontend already stopped branching on it in US-2G00ZBE7EFEN). Response is now the same generic message regardless of account existence/provider. Compiles clean.
