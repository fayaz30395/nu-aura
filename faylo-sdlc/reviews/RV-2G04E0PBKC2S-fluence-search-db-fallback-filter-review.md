# RV-2G04E0PBKC2S: Fluence search DB fallback filter review

> **Story:** US-2FZSYZR0FG6P
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

PostgreSQL fallback (used when Elasticsearch is unavailable) previously ignored both contentType and visibility filters, always returning unfiltered wiki-only results. Now branches searchWikiPages/searchBlogPosts by contentType and applies a best-effort post-filter for visibility (documented trade-off: page totals can undercount in this degraded mode since the native search queries don't take a visibility parameter). searchAllContent's pre-existing wiki-only scope for the no-contentType case is unchanged (separate issue). Compiles clean.
