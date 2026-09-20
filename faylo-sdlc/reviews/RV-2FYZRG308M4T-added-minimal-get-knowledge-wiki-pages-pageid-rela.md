# RV-2FYZRG308M4T: Added minimal GET /knowledge/wiki/pages/{pageId}/related endpoint. No tags/similarity field exists on WikiPage, so related = same-space pages ordered by updatedAt desc, excluding the current page, capped at limit (default 5) — honest minimal signal, not a fabricated recommendation engine. New RelatedContentDto matches frontend RelatedItem shape exactly. Frontend: added fluenceService.getRelatedPages + useRelatedPages hook + wired RelatedContent into wiki page detail view below the content viewer. mvn compile clean; npx tsc --noEmit clean; eslint clean.

> **Story:** US-2FYZHMT7JTH0
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
