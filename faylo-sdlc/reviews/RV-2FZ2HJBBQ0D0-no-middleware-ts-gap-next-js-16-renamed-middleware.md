# RV-2FZ2HJBBQ0D0: No middleware.ts gap: Next.js 16 renamed middleware.ts to proxy.ts; existing frontend/proxy.ts is already the active edge auth gate (cookie-presence check + redirect to login + admin/payroll RBAC edge shortcuts + CSP/security headers), confirmed by runtime test (unauthenticated GET /employees -> 307 to /auth/login with proxy.ts headers) and by Next.js's own build error when a middleware.ts was added alongside it ('Both middleware file and proxy file are detected. Please use ./proxy.ts only'). Zero Server Components fetch sensitive data server-side (checked all 10 non-client pages; 7 are redirect stubs, 2 are static content, 1 fetches only the public careers endpoint) so there is no RSC data-leak exposure either. Only change: fixed 2 stale next.config.js comments that referenced a non-existent middleware.ts shim, which could mislead a future engineer into recreating the exact file that breaks the Next 16 build. tsc clean.

> **Story:** US-2FZ1RHSX3HKF
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
