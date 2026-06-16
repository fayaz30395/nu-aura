---
title: "Pendings — Docs / Knowledge-Base Workstream"
tags:
  - "type/tracker"
  - "area/documentation"
summary: "Open and in-progress items for the docs reset + Obsidian knowledge-base consolidation. Broader project blockers live in MEMORY.md."
updated: 2026-06-16
---

# Pendings — Docs / Knowledge-Base Workstream

Tracking the docs reset → regenerate → merge → ready effort. Broader project/production
blockers are tracked in `MEMORY.md`, not here.

## 📌 Pending — knowledge-base polish (proposed, not yet started)

- [ ] **Obsidian Bases dashboard**: every note has `area/* · type/* · layer/*` frontmatter,
      so build a `.base` index (filterable table of all notes by area/type) as a data-driven
      entry point. (`bases` core plugin is already enabled.)
- [ ] **Tidy residual section markers**: a few merged notes still have cosmetic `§2` / `§3.2`
      markers trailing wikilinks (e.g. `[[Services]] §2`) left over from citing the old flat
      docs by section. Harmless, but could be cleaned for polish.

## ❓ Open decisions (need user input)

- [ ] **Broken RuFlo sync**: `docs/swarm/` (DDD domains + RuFlo registry YAMLs) was deleted in
      the reset, so `./scripts/ruflo-sync.sh` (`docs/swarm/` → `.claude-flow/`) has no source.
      Decide: **restore** just `docs/swarm/*.yaml` from git history, **or** retire the sync.
      Currently flagged as a note in root `CLAUDE.md`.

## ✅ Done this workstream

- [x] Keep root project-wide Obsidian vault; remove `docs/.obsidian/`; track vault in git
      (workspace UI state ignored). Pushed.
- [x] Full `docs/` reset + regenerate from codebase via parallel workflow (15 evidence-based
      docs, Mermaid). Pushed (`ed6f023d`).
- [x] Update root `CLAUDE.md` "read before acting" routing table (v1, flat layout). Pushed
      (`6561522e`).
- [x] **Merge** the flat docs + the separately-added `docs/obsidian/` vault into ONE unified
      vault (`nu-aura-docs-merge`, 12 agents). New notes: `06-Database/Migrations.md`,
      `01-Architecture/Code-Patterns.md`, `07-DevOps/Local-Setup.md`. Vault = 42 notes.
- [x] Delete merged flat sources (`architecture/ reference/ apps/ patterns/ setup/ Home.md`)
      and empty placeholders (`advanced.md`, `app/getting-started.md`).
- [x] Delete stray root scratch files (`Untitled.base/.canvas`, daily note, `*-image.md`)
      and gitignore the patterns so the root-opened vault can't pollute the repo again.
- [x] Focus the Obsidian vault: `userIgnoreFilters` in `.obsidian/app.json` excludes
      `node_modules`, `frontend`, `backend`, `build`, etc. from graph/search.
- [x] Update root `CLAUDE.md` routing table (v2) to point at the unified `docs/obsidian/` vault
      (now also covers ADRs, RBAC, security, testing, runbooks).
- [x] Repoint all stale flat-doc citations across the vault to `[[wikilinks]]`; verified
      `docs/README.md` links and vault references resolve (no dangling `.md` paths).
