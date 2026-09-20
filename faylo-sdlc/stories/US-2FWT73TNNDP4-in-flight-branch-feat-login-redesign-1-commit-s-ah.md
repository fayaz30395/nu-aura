# US-2FWT73TNNDP4: In-flight: branch feat/login-redesign (1 commit(s) ahead of main)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Origin:** in-flight
> **Branch:** feat/login-redesign
> **Status:** Draft
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** maintainer
**I want** the work already in flight understood and decided on before new work starts
**So that** the pipeline continues from where the codebase actually is

Stage 00 describes what this change does (artifacts/00-adopt/in-flight.md); Stage 10 finishes or re-scopes it per the human's decision on AC1.

## Acceptance Criteria

- **AC1:** Cherry-pick attempted (commit d52cfc78, 4 files: BrandPanel.tsx, auth-form.css, brand-panel.css, login/page.tsx) and hits merge conflicts on all 4 files - main's auth surface has diverged too far since this branch's base (603 commits behind). This is auth/login-page code; a blind conflict resolution here is a security-review-triggering change per repo security rules, not something to force through mechanically. Recommend: drop this branch and re-derive the Studio Slate visual intent as a fresh, reviewed PR against current main, rather than reconciling a 603-commit-stale diff. Genuinely needs a human product/design call on whether the redesign intent is still wanted, not just a merge decision.
  - **Verify:** manual
  - **Verified:** pending
