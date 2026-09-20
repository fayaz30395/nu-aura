---
name: faylo-skill-issue-triage
description: How faylo-tech-lead sanity-checks a ticket breakdown for sequencing and sizing before tickets open.
---

# faylo-skill-issue-triage

Auto-loads for `faylo-tech-lead` at Stage 06. Checks that tickets are sequenced by dependency (not just by PRD story order), that no ticket bundles more than one testable unit of behavior, and that cross-cutting tickets (touching a shared contract) are flagged for `faylo-architect` before Stage 08.
