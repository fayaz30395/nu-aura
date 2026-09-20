---
name: faylo-skill-architecture
description: How faylo-architect assesses blast radius and assigns an autonomy tier against architecture-principles/.
---

# faylo-skill-architecture

Auto-loads for `faylo-architect` at Stage 05, 08, and 09. Blast radius is assessed against what the change touches (a shared contract, a single engagement's own code, a client's public-facing commerce logic), not against how large the diff looks. Tier can only tighten downstream, never loosen.
