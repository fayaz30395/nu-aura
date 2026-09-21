# RV-2FZJZ19DCCY1: Investigated and confirmed Fluence search runs on the DB ILIKE path in production, not Elasticsearch. application-render.yml (the live Railway prod profile) hardcodes app.elasticsearch.enabled=false and excludes ElasticsearchRepositoriesAutoConfiguration entirely, so FluenceSearchService (@ConditionalOnProperty app.elasticsearch.enabled=true) never registers as a Spring bean. FluenceSearchController's @Autowired(required=false) field is therefore always null in prod, so its documented fallback branch always executes: KnowledgeSearchService -> WikiPageRepository/BlogPostRepository ILIKE queries. This also covers the AI-chat retrieval path since it shares the same search stack. Documented the confirmed (not just theoretical) production behavior in docs/obsidian/02-Modules/Nu-Fluence.md. No code changed.

> **Story:** US-2FZFCY70T1C9
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
