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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Retrieves relevant NU-Fluence content chunks for the RAG pipeline.
 *
 * Current approach: keyword-based search using existing repository search methods.
 * Future enhancement: swap to vector/embedding-based search when pgvector is enabled.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceContentRetriever {

    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final DocumentTemplateRepository documentTemplateRepository;

    private static final int MAX_CHUNKS = 5;
    private static final int MAX_CONTENT_LENGTH = 1500; // chars per chunk

    /**
     * Retrieve the most relevant content chunks for a given query.
     * Returns a list of ContentChunks with metadata for citation.
     */
    @Transactional(readOnly = true)
    public List<ContentChunk> retrieveRelevantContent(String query) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Pageable limit = PageRequest.of(0, MAX_CHUNKS);
        List<ContentChunk> chunks = new ArrayList<>();

        try {
            // Search wiki pages
            var wikiResults = wikiPageRepository.searchByTenant(tenantId, query, limit);
            for (WikiPage page : wikiResults.getContent()) {
                chunks.add(ContentChunk.builder()
                        .id(page.getId().toString())
                        .type("wiki")
                        .title(page.getTitle())
                        .content(truncate(stripJsonMarkup(page.getContent()), MAX_CONTENT_LENGTH))
                        .url("/fluence/wiki/" + page.getId())
                        .build());
            }

            // Search blog posts
            var blogResults = blogPostRepository.searchByTenant(tenantId, query, limit);
            for (BlogPost post : blogResults.getContent()) {
                chunks.add(ContentChunk.builder()
                        .id(post.getId().toString())
                        .type("blog")
                        .title(post.getTitle())
                        .content(truncate(stripJsonMarkup(post.getContent()), MAX_CONTENT_LENGTH))
                        .url("/fluence/blogs/" + post.getId())
                        .build());
            }

            // Search templates
            var templateResults = documentTemplateRepository.searchByTenant(tenantId, query, limit);
            for (DocumentTemplate template : templateResults.getContent()) {
                chunks.add(ContentChunk.builder()
                        .id(template.getId().toString())
                        .type("template")
                        .title(template.getName())
                        .content(truncate(template.getDescription() != null ? template.getDescription() : "", MAX_CONTENT_LENGTH))
                        .url("/fluence/templates/" + template.getId())
                        .build());
            }
        } catch (Exception e) {
            log.error("Error retrieving content for RAG query: {}", query, e);
        }

        // Keep only top MAX_CHUNKS overall
        if (chunks.size() > MAX_CHUNKS) {
            chunks = chunks.subList(0, MAX_CHUNKS);
        }

        log.debug("Retrieved {} content chunks for query: {}", chunks.size(), query);
        return chunks;
    }

    /**
     * Strip JSON/HTML markup from content to get a plain-text approximation.
     * TipTap stores content as JSON; this is a lightweight extraction.
     * TODO: implement proper TipTap JSON → plain text converter
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

        /** Format this chunk for inclusion in the LLM prompt */
        public String toPromptBlock() {
            return String.format("[%s] %s\n%s\nSource: %s\n", type.toUpperCase(), title, content, url);
        }
    }
}
