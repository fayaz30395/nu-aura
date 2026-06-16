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

## Stack — RESOLVED (owner ruled authoritative)
- **Canonical NU-AURA stack = React 18 + MUI, Spring Boot 3.x, MySQL/HeatWave**
  (owner-declared authoritative 2026-06-16).
- BUT verified `frontend/package.json` in this checkout: **Next.js 16 + Mantine 9
  + React 19** — this repo is a different impl from the canonical stack.
- Rule going forward: canonical line = how owner describes NU-AURA; for code edits
  in THIS repo, follow the repo's real deps (Next/Mantine/React19), not canonical.
- Repo docs (`MEMORY.md`, `.claude/CLAUDE.md` "Locked-In Stack" = Next 14/Mantine)
  are also stale vs the actual Next 16/React 19 — flag if asked to touch them.
