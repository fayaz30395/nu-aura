package com.hrms.application.knowledge.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.DocumentTemplate;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Retrieves relevant NU-Fluence content chunks for the RAG pipeline.
 *
 * Strategy: BROAD retrieval (high recall) — the LLM handles precision.
 * Extracts keywords from the user query and searches each keyword independently
 * using ILIKE-based queries across title, excerpt, and content fields.
 * Deduplicates and ranks results by number of keyword hits (title matches weighted higher).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceContentRetriever {

    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final DocumentTemplateRepository documentTemplateRepository;

    private static final int MAX_CHUNKS = 8; // More context for RAG — LLM filters
    private static final int MAX_CONTENT_LENGTH = 2000; // chars per chunk
    private static final int RESULTS_PER_KEYWORD = 3;

    /** Common stop words to strip from queries for better keyword extraction */
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

    /**
     * Retrieve the most relevant content chunks for a given natural language query.
     * Uses broad ILIKE search per keyword for high recall — the LLM filters for relevance.
     */
    @Transactional(readOnly = true)
    public List<ContentChunk> retrieveRelevantContent(String query) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<String> keywords = extractKeywords(query);
        Map<String, ContentChunk> deduped = new LinkedHashMap<>();

        log.debug("RAG retrieval for query: '{}' → keywords: {}", query, keywords);

        if (keywords.isEmpty()) {
            // If no meaningful keywords, try the raw query as-is
            keywords = List.of(query.trim());
        }

        try {
            for (String keyword : keywords) {
                Pageable limit = PageRequest.of(0, RESULTS_PER_KEYWORD);

                // Search wiki pages (broad ILIKE)
                var wikiResults = wikiPageRepository.searchByTenantBroad(tenantId, keyword, limit);
                for (WikiPage page : wikiResults.getContent()) {
                    String key = "wiki-" + page.getId();
                    if (!deduped.containsKey(key)) {
                        deduped.put(key, ContentChunk.builder()
                                .id(page.getId().toString())
                                .type("wiki")
                                .title(page.getTitle())
                                .content(truncate(stripJsonMarkup(page.getContent()), MAX_CONTENT_LENGTH))
                                .url("/fluence/wiki/" + page.getId())
                                .relevanceScore(scoreTitleMatch(page.getTitle(), keywords))
                                .build());
                    }
                }

                // Search blog posts (broad ILIKE)
                var blogResults = blogPostRepository.searchByTenantBroad(tenantId, keyword, limit);
                for (BlogPost post : blogResults.getContent()) {
                    String key = "blog-" + post.getId();
                    if (!deduped.containsKey(key)) {
                        deduped.put(key, ContentChunk.builder()
                                .id(post.getId().toString())
                                .type("blog")
                                .title(post.getTitle())
                                .content(truncate(stripJsonMarkup(post.getContent()), MAX_CONTENT_LENGTH))
                                .url("/fluence/blogs/" + post.getId())
                                .relevanceScore(scoreTitleMatch(post.getTitle(), keywords))
                                .build());
                    }
                }

                // Search templates (already ILIKE-based)
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
        } catch (Exception e) {
            log.error("Error retrieving content for RAG query: '{}'", query, e);
        }

        // Sort by relevance score (higher = more keyword matches in title) and cap
        List<ContentChunk> chunks = deduped.values().stream()
                .sorted(Comparator.comparingInt(ContentChunk::getRelevanceScore).reversed())
                .limit(MAX_CHUNKS)
                .collect(Collectors.toList());

        log.debug("Retrieved {} content chunks for query: '{}'", chunks.size(), query);
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
     * Strip JSON/HTML markup from content to get a plain-text approximation.
     * TipTap stores content as JSON; this is a lightweight extraction.
     */
    private String stripJsonMarkup(String content) {
        if (content == null || content.isBlank()) return "";
        return content
                .replaceAll("<[^>]+>", " ")       // strip HTML tags
                .replaceAll("[{}\\[\\]\":]", " ")  // strip JSON syntax
                .replaceAll("\\s+", " ")
                .trim();
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

        /** Format this chunk for inclusion in the LLM prompt */
        public String toPromptBlock() {
            return String.format(
                    "Document: \"%s\" (Type: %s)\nURL: %s\nContent: %s\n",
                    title, type, url, content
            );
        }
    }
}
