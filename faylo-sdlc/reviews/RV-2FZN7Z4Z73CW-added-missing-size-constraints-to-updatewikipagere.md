# RV-2FZN7Z4Z73CW: Added missing @Size constraints to UpdateWikiPageRequest and UpdateBlogPostRequest matching their Create-request counterparts (title<=300, slug<=300, excerpt<=500, content<=100000, visibility/status<=20, plus featuredImageUrl<=1000/readTimeMinutes>=0 for blog and changeSummary<=1000 for wiki). Both update endpoints already had @Valid. Added oversized-title/content 400 tests to BlogPostControllerTest (passes) and WikiPageControllerTest (compiles correctly but that test class's context fails to load for a pre-existing, unrelated reason — confirmed via git stash that it fails on main before my change too).

> **Story:** US-2FZFCXTHMV0F
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
