---
title: "Security Policy"
tags: ["area/security","type/policy","layer/platform"]
summary: "Vulnerability disclosure policy: how to report issues, what to include, triage/disclosure timeline, and which versions receive security updates."
---

# Security Policy

## Reporting a Vulnerability

NULogic takes the security of the NU-AURA platform seriously. If you
believe you have found a security vulnerability, please report it as
described below.

### How to Report

- **Email**: security@nulogic.io
- **PGP key**: (publish a public-key fingerprint here when available)

Do NOT report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

### What to Include

- Type of issue (e.g., SQL injection, XSS, IDOR, SSRF, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce
- Proof-of-concept or exploit code (if possible)
- Impact assessment

### Disclosure Process

- Acknowledgment within 3 business days
- Initial assessment within 7 business days
- Remediation timeline communicated within 14 business days
- Coordinated disclosure: we ask for 90 days before public disclosure

### Out-of-Scope

- Social engineering of NULogic staff
- Physical attacks against NULogic infrastructure
- Denial-of-service attacks
- Attacks requiring physical access to a user's device

## Supported Versions

Only the current `main` branch and the most recent tagged release receive
security updates.

## Related

- [[docs/architecture/data-flow|Data Flow & Request Lifecycle]] — auth and RLS tenancy model
- [[docs/architecture/backend|Backend Architecture]] — security filter chain and tenant isolation
- [[CONTRIBUTING|Contributing Guide]] — pre-push security checklist
- [[README|Project README]] — project overview
- [[docs/Home|Home MoC]] — vault entry point
