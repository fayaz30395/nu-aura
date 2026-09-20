---
name: faylo-skill-code-review
description: What faylo-qa-reviewer checks in a diff beyond passing tests — readability, blast-radius consistency with Stage 05's assessment.
---

# faylo-skill-code-review

Auto-loads for `faylo-qa-reviewer` at Stage 11. A diff that passes every test can still be flagged if it touches more of the codebase than Stage 05's blast-radius assessment expected — that mismatch is itself a finding, and can raise the ticket's tier.
