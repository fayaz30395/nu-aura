---
description: Autonomous multi-iteration Chrome QA goal loop — tests, fixes, deploys, and re-verifies until NU-AURA scores 95+ with zero CRITICAL/HIGH open, then outputs a GO/NO-GO release gate verdict
---

Read and follow `.agents/skills/nu-aura-chrome-demo-qa/SKILL.md`.

Run **Autonomous Goal Loop mode** unless `$ARGUMENTS` explicitly says `test-only`.

Hard requirements:
- Use Chrome only (clean incognito or cleared profile).
- Use the deployed Vercel URL only for authenticated QA.
- Use only the listed UAT demo accounts — no owner/SUPER_ADMIN accounts.
- Treat demo accounts as expected in UAT; do not report their existence as a defect.
- Screenshot every route visited. No route is PASS without a screenshot.
- Fix reproduced defects: gate locally → commit to `main` → deploy → re-check live in Chrome.
- Continue iterating (stagnation-based stop — no hard cap) until score ≥ 95 AND zero CRITICAL/HIGH open.
- Generate `RELEASE-GATE.md` with final GO / CONDITIONAL-GO / NO-GO verdict.
- Stop only for stop conditions defined in the skill.

User arguments:

```text
$ARGUMENTS
```
