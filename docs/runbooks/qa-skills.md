# QA skills — canonical set

Canonical set of NU-AURA QA / E2E / fix-loop Claude skills. Picked during Phase 7 of the 2026-05-13 repo layout cleanup. Each axis has exactly one canonical skill; the rest were deprecated and removed from `.claude/skills/`.

## Canonical skills

| Axis                      | Skill                                              | When to invoke                                                                                          |
|---------------------------|----------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| E2E test authoring        | `nu-e2e`                                           | "Write an E2E test for X", "add a Playwright spec for the leave page", route-level `.spec.ts` generation |
| Cross-platform QA sweep   | `nu-aura-full-platform-qa`                         | "Full QA sweep", "pre-release validation", granular check across all sub-apps × 9 roles × CRUD flows; produces an Excel bug report |
| Autonomous fix loop       | `nu-validate-fix-loop`                             | "Validate and fix", "browser QA loop", multi-role browser validate→fix→recheck across 14 dimensions      |
| Code + UX audit (single)  | `nu-validate`                                      | "Validate code", "code review", "UX audit", "accessibility check" — combined quality + UI/UX audit       |

## Deprecated skills (removed)

| Removed skill                  | Replaced by                  | Reason                                                                |
|--------------------------------|------------------------------|-----------------------------------------------------------------------|
| `nu-aura-e2e-lifecycle`        | `nu-e2e`                     | Cross-module flows can be authored case-by-case via `nu-e2e`           |
| `nu-e2e-qa`                    | `nu-aura-full-platform-qa`   | Lighter phased report subsumed by the comprehensive sweep              |
| `nu-chrome-e2e`                | `nu-aura-full-platform-qa`   | Incomplete (no `SKILL.md`)                                             |
| `playwright-autonomous`        | `nu-validate-fix-loop`       | Playwright-only fixer; `nu-validate-fix-loop` is multi-role + 14 dims  |
| `qa-dev-loop`                  | `nu-validate-fix-loop`       | Thin composition skill subsumed by the broader fix loop                |
| `autonomous-fix-loop`          | `nu-validate-fix-loop`       | Generic check→fix loop subsumed by the QA-specific fix loop            |

## Decision rationale

The QA/e2e/fix-loop space had 10 overlapping skills accreted from sprint pushes. Three axes (authoring, sweep, fix loop) each had 2–4 candidates that did similar work with different scope or detail level. The plan called for picking one canonical per axis to reduce decision fatigue when invoking from chat.

If an axis grows a real second-shape need later (e.g. cross-module lifecycle flows that don't fit `nu-e2e`'s single-route pattern), revisit by re-introducing a focused skill rather than reviving the deprecated one.

## Note on storage

`.claude/skills/` is in `.gitignore`. Skill installs/removes are local-only and not tracked in git. This document is the source of truth for which skills should be installed.
