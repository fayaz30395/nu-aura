---
name: faylo-skill-handoff
description: How one agent hands context to the next without a human relay, used across every automatic stage transition.
---

# faylo-skill-handoff

Auto-loads whenever a stage transition is automatic (all of Phase 1, and any per-ticket stage below its tier's gate). The receiving agent must be able to act on the prior stage's `outputs/*.json` alone — needing a follow-up question from the same agent that just ran is treated as that stage's output being incomplete, not as normal handoff friction.
