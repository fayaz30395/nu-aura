package com.hrms.application.knowledge.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.DocumentTemplate;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Retrieves relevant NU-Fluence content chunks for the RAG pipeline.
 * <p>
 * Strategy: BROAD retrieval (high recall) — the LLM handles precision.
 * Extracts keywords from the user query and searches each keyword independently
 * using ILIKE-based queries across title, excerpt, and content fields.
 * Deduplicates and ranks results by number of keyword hits (title matches weighted higher).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceContentRetriever {

    private static final int MAX_CHUNKS = 8; // More context for RAG — LLM filters
    private static final int MAX_CONTENT_LENGTH = 2000; // chars per chunk
    private static final int RESULTS_PER_KEYWORD = 3;
    /**
     * Common stop words to strip from queries for better keyword extraction
     */
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "shall", "can", "need", "dare", "ought",
            "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
            "as", "into", "through", "during", "before", "after", "above", "below",
            "between", "out", "off", "over", "under", "again", "further", "then",
            "once", "here", "there", "when", "where", "why", "how", "all", "each",
            "every", "both", "few", "more", "most", "other", "some", "such", "no",
            "not", "only", "own", "same", "so", "than", "too", "very", "just",
            "because", "but", "and", "or", "if", "while", "about", "up", "down",
            "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
            "she", "her", "it", "its", "they", "them", "their", "what", "which",
            "who", "whom", "this", "that", "these", "those", "am", "tell", "know",
            "show", "give", "find", "get", "want", "like", "think", "say", "said"
    );
    // V152 (S6-A): wiki + blog lookups switched to native body_text queries via
    // EntityManager below. The matching repository methods (searchByTenantBroad)
    // remain in WikiPageRepository / BlogPostRepository for callers that still
    // need the legacy CAST(content AS TEXT) shape — S4-D owns their FTS
    // migration. Templates still go through their repository because
    // DocumentTemplate has no JSONB content column to seq-scan.
    private final DocumentTemplateRepository documentTemplateRepository;
    private final ObjectMapper objectMapper;

    /**
     * EntityManager used to issue body_text-targeted native queries that
     * bypass {@code wiki_pages.content / blog_posts.content} JSONB and instead
     * read the V152 plain-text projection column. Kept local to the retriever
     * so the existing repository {@code searchByTenantBroad} (owned by S4-D
     * for FTS migration) is not modified by this sprint.
     */
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Retrieve the most relevant content chunks for a given natural language query.
     * Uses broad ILIKE search per keyword for high recall — the LLM filters for relevance.
     */
    @Transactional(readOnly = true)
    public List<ContentChunk> retrieveRelevantContent(String query) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<String> keywords = extractKeywords(query);
        Map<String, ContentChunk> deduped = new LinkedHashMap<>();

        log.info("RAG retrieval for query: '{}' → keywords: {}, tenantId: {}", query, keywords, tenantId);

        if (keywords.isEmpty()) {
            // If no meaningful keywords, try the raw query as-is
            keywords = List.of(query.trim());
        }

        try {
            for (String keyword : keywords) {
                Pageable limit = PageRequest.of(0, RESULTS_PER_KEYWORD);

                // V152 (S6-A): switched off the broad ILIKE-on-CAST(content AS TEXT)
                // path — that path always seq-scanned wiki_pages because the planner
                // cannot use the GIN search_vector index when the WHERE clause casts
                // a JSONB column. The native query below targets the new body_text
                // column (populated by WikiPageService on every save) which is
                // covered by idx_wiki_pages_body_text_trgm (pg_trgm GIN, partial on
                // is_deleted = false).
                List<WikiPage> wikiResults = searchWikiByBodyText(tenantId, keyword, RESULTS_PER_KEYWORD);
                log.info("Wiki search for keyword '{}': {} results", keyword, wikiResults.size());
                for (WikiPage page : wikiResults) {
                    String key = "wiki-" + page.getId();
                    if (!deduped.containsKey(key)) {
                        deduped.put(key, ContentChunk.builder()
                                .id(page.getId().toString())
                                .type("wiki")
                                .title(page.getTitle())
                                .content(truncate(chooseBody(page.getBodyText(), page.getContent()), MAX_CONTENT_LENGTH))
                                .url("/fluence/wiki/" + page.getId())
                                .relevanceScore(scoreTitleMatch(page.getTitle(), keywords))
                                .build());
                    }
                }

                // V152 (S6-A): same body_text switch for blog posts (see wiki note above).
                List<BlogPost> blogResults = searchBlogByBodyText(tenantId, keyword, RESULTS_PER_KEYWORD);
                log.info("Blog search for keyword '{}': {} results", keyword, blogResults.size());
                for (BlogPost post : blogResults) {
                    String key = "blog-" + post.getId();
                    if (!deduped.containsKey(key)) {
                        deduped.put(key, ContentChunk.builder()
                                .id(post.getId().toString())
                                .type("blog")
                                .title(post.getTitle())
                                .content(truncate(chooseBody(post.getBodyText(), post.getContent()), MAX_CONTENT_LENGTH))
                                .url("/fluence/blogs/" + post.getId())
                                .relevanceScore(scoreTitleMatch(post.getTitle(), keywords))
                                .build());
                    }
                }

                // Search templates (already ILIKE-based; template.description is a plain TEXT column — no JSONB cast involved)
                var templateResults = documentTemplateRepository.searchByTenant(tenantId, keyword, limit);
                for (DocumentTemplate template : templateResults.getContent()) {
                    String key = "template-" + template.getId();
                    if (!deduped.containsKey(key)) {
                        deduped.put(key, ContentChunk.builder()
                                .id(template.getId().toString())
                                .type("template")
                                .title(template.getName())
                                .content(truncate(template.getDescription() != null ? template.getDescription() : "", MAX_CONTENT_LENGTH))
                                .url("/fluence/templates/" + template.getId())
                                .relevanceScore(scoreTitleMatch(template.getName(), keywords))
                                .build());
                    }
                }
            }
        } catch (Exception e) { // Intentional broad catch — search/content retrieval error boundary
            log.error("Error retrieving content for RAG query: '{}'", query, e);
        }

        // Sort by relevance score (higher = more keyword matches in title) and cap
        List<ContentChunk> chunks = deduped.values().stream()
                .sorted(Comparator.comparingInt(ContentChunk::getRelevanceScore).reversed())
                .limit(MAX_CHUNKS)
                .collect(Collectors.toList());

        log.info("Retrieved {} content chunks for query: '{}'. Titles: {}",
                chunks.size(), query,
                chunks.stream().map(ContentChunk::getTitle).collect(Collectors.joining(", ")));
        return chunks;
    }

    /**
     * Extract meaningful keywords from a natural language query.
     * Strips stop words, short tokens, and normalizes.
     */
    private List<String> extractKeywords(String query) {
        if (query == null || query.isBlank()) return List.of();

        return Arrays.stream(query.toLowerCase().split("[\\s,;.!?]+"))
                .map(String::trim)
                .filter(w -> w.length() >= 2)
                .filter(w -> !STOP_WORDS.contains(w))
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Score how many keywords appear in the title (case-insensitive).
     * Title matches are weighted 2x for ranking.
     */
    private int scoreTitleMatch(String title, List<String> keywords) {
        if (title == null) return 0;
        String lowerTitle = title.toLowerCase();
        int score = 0;
        for (String keyword : keywords) {
            if (lowerTitle.contains(keyword)) {
                score += 2; // Title match = high relevance
            }
        }
        return score;
    }

    /**
     * Look up wiki pages whose {@code body_text} column (V152) matches the
     * given keyword via case-insensitive {@code ILIKE '%keyword%'}.
     *
     * <p>Uses {@code idx_wiki_pages_body_text_trgm} (pg_trgm GIN, partial on
     * {@code is_deleted = false}) — leading-wildcard ILIKE is index-eligible
     * under pg_trgm. Tenant scope and the soft-delete filter are explicit so
     * the planner can prove they line up with the partial index predicate.</p>
     */
    private List<WikiPage> searchWikiByBodyText(UUID tenantId, String keyword, int limit) {
        String sql = "SELECT wp.* FROM wiki_pages wp " +
                "WHERE wp.tenant_id = :tenantId " +
                "  AND wp.is_deleted = false " +
                "  AND (" +
                "       LOWER(wp.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                "    OR LOWER(COALESCE(wp.excerpt, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                "    OR LOWER(COALESCE(wp.body_text, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
                "  ) " +
                "ORDER BY CASE WHEN LOWER(wp.title) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 0 ELSE 1 END, " +
                "         wp.updated_at DESC " +
                "LIMIT :lim";
        @SuppressWarnings("unchecked")
        List<WikiPage> rows = entityManager.createNativeQuery(sql, WikiPage.class)
                .setParameter("tenantId", tenantId)
                .setParameter("keyword", keyword)
                .setParameter("lim", limit)
                .getResultList();
        return rows;
    }

    /**
     * Look up blog posts whose {@code body_text} column (V152) matches the
     * given keyword. Symmetric to {@link #searchWikiByBodyText} — same index
     * strategy via {@code idx_blog_posts_body_text_trgm}.
     */
    private List<BlogPost> searchBlogByBodyText(UUID tenantId, String keyword, int limit) {
        String sql = "SELECT bp.* FROM blog_posts bp " +
                "WHERE bp.tenant_id = :tenantId " +
                "  AND bp.is_deleted = false " +
                "  AND (" +
                "       LOWER(bp.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                "    OR LOWER(COALESCE(bp.excerpt, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                "    OR LOWER(COALESCE(bp.body_text, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
                "  ) " +
                "ORDER BY CASE WHEN LOWER(bp.title) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 0 ELSE 1 END, " +
                "         bp.updated_at DESC " +
                "LIMIT :lim";
        @SuppressWarnings("unchecked")
        List<BlogPost> rows = entityManager.createNativeQuery(sql, BlogPost.class)
                .setParameter("tenantId", tenantId)
                .setParameter("keyword", keyword)
                .setParameter("lim", limit)
                .getResultList();
        return rows;
    }

    /**
     * Prefer the pre-extracted body_text (V152) when it exists, falling back
     * to extracting from the raw JSONB on the fly. Historical rows have a
     * null body_text until they are next saved — the V152 migration notes
     * cover the deferred backfill rationale.
     */
    private String chooseBody(String bodyText, String content) {
        if (bodyText != null && !bodyText.isBlank()) {
            return bodyText;
        }
        return extractTextFromTipTap(content);
    }

    /**
     * Extract plain text from TipTap JSON content.
     * <p>
     * TipTap stores content as a JSON AST like:
     * {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}
     * <p>
     * This method recursively walks the JSON tree and extracts all "text" values
     * from text nodes, producing clean readable text for the LLM prompt.
     * <p>
     * Retained alongside the new {@code TipTapTextExtractor} component because
     * this is the fallback path for historical rows without a populated
     * {@code body_text} column — see {@link #chooseBody(String, String)}.
     */
    private String extractTextFromTipTap(String content) {
        if (content == null || content.isBlank()) return "";
        try {
            JsonNode root = objectMapper.readTree(content);
            StringBuilder sb = new StringBuilder();
            extractTextNodes(root, sb);
            return sb.toString().replaceAll("\\s+", " ").trim();
        } catch (Exception e) { // Intentional broad catch — search/content retrieval error boundary
            // Fallback: crude regex extraction if JSON parsing fails
            log.trace("TipTap JSON parse failed, falling back to regex: {}", e.getMessage());
            return content
                    .replaceAll("<[^>]+>", " ")
                    .replaceAll("[{}\\[\\]\":]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
        }
    }

    /**
     * Recursively walk TipTap JSON and collect text node values
     */
    private void extractTextNodes(JsonNode node, StringBuilder sb) {
        if (node == null) return;

        // If this is a text node, extract the "text" value
        if (node.isObject()) {
            JsonNode typeNode = node.get("type");
            if (typeNode != null && "text".equals(typeNode.asText())) {
                JsonNode textNode = node.get("text");
                if (textNode != null && !textNode.isNull()) {
                    sb.append(textNode.asText()).append(" ");
                }
            }
            // Also check for heading — add a newline for readability
            if (typeNode != null && "heading".equals(typeNode.asText())) {
                sb.append("\n");
            }
        }

        // Recurse into children
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> extractTextNodes(entry.getValue(), sb));
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                extractTextNodes(child, sb);
            }
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        if (text.length() <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    }

    /**
     * A chunk of content retrieved for the RAG context window.
     */
    @Data
    @Builder
    public static class ContentChunk {
        private String id;
        private String type;  // "wiki", "blog", "template"
        private String title;
        private String content;
        private String url;
        @Builder.Default
        private int relevanceScore = 0;

        /**
         * Format this chunk for inclusion in the LLM prompt
         */
        public String toPromptBlock() {
            return String.format(
                    "Document: \"%s\" (Type: %s)\nURL: %s\nContent: %s\n",
                    title, type, url, content
            );
        }
    }
}
