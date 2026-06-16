---
tags: [second-brain, setup, meta, claude-config]
---
Stood up the Second Brain protocol inside the nu-aura repo (which doubles as an Obsidian vault), preserving existing project config.

## What happened
- The vault folder is the **nu-aura production repo**, not an empty vault — it
  already had a tracked `CLAUDE.md` (Ruflo/nu-aura config) and a 47KB `MEMORY.md`.
- STEP 1 (don't overwrite) vs STEP 2 (write CLAUDE.md verbatim) conflicted.
  Asked the user; they chose **append**.
- Created folders `memory/`, `notes/`, `refs/` (all were missing).
- Appended the Second Brain PROTOCOL to `CLAUDE.md` as a new `# Second Brain`
  section — nu-aura config above it untouched.
- Created `memory/INDEX.md` (heading + `## Log`).
- Seeded `## About Me`, `## Projects`, `## Working-Style Preferences` in
  `CLAUDE.md` from vault evidence, flagging inferred vs confirmed.

## Decisions / conventions
- PROTOCOL lives appended in `CLAUDE.md`, NOT as a standalone file.
- Write-back target for durable facts = headings inside `CLAUDE.md`.
- Note `MEMORY.md` predates this protocol and is the larger project-state store.

## Open gaps — RESOLVED (interview answered)
- Role: **Tech Lead** (10+ yrs backend/platform). Tech Lead at **Sephora**
  (commerce P13N) + runs **NULOGIC** ecosystem + **food businesses in Madurai**
  (Crispy Kitchen / Arabian Grills / Hotel Buhari). Three threads to track:
  Sephora/consulting, NU-AURA, food business.
- Corrected inferred title: Tech Lead, NOT Principal/Staff — do not inflate.
- Full project list + always/never tone prefs now seeded in CLAUDE.md.

## Flag to verify later (do not silently "fix")
- Owner describes NU-AURA stack as **React 18 + MUI, MySQL/HeatWave**, but this
  repo's `MEMORY.md` / `.claude/CLAUDE.md` document **Next.js 14 + Mantine +
  Postgres (Neon/PG16)**. Likely: owner's mental/canonical model vs this specific
  repo's current impl, OR two NU-AURA codebases. Recorded owner's words as-is in
  CLAUDE.md ("per owner"); reconcile when it matters.
