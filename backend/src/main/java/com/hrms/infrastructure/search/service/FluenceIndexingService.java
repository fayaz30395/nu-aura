package com.hrms.infrastructure.search.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.DocumentTemplate;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.search.document.FluenceDocument;
import com.hrms.infrastructure.search.repository.FluenceDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service responsible for indexing NU-Fluence content into Elasticsearch.
 *
 * <p>Converts JPA entities (WikiPage, BlogPost, DocumentTemplate) into
 * {@link FluenceDocument} and persists them in the ES index for full-text search.</p>
 *
 * <p>Only active when {@code app.elasticsearch.enabled=true}.</p>
 */
@Service
@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class FluenceIndexingService {

    private final FluenceDocumentRepository fluenceDocumentRepository;
    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final DocumentTemplateRepository documentTemplateRepository;
    private final ObjectMapper objectMapper;

    /**
     * Index a wiki page into Elasticsearch.
     */
    public void indexWikiPage(WikiPage page) {
        FluenceDocument doc = FluenceDocument.builder()
                .id(FluenceDocument.buildId("wiki", page.getId()))
                .tenantId(page.getTenantId())
                .contentType("wiki")
                .contentId(page.getId())
                .title(page.getTitle())
                .excerpt(page.getExcerpt())
                .bodyText(extractTextFromTipTapJson(page.getContent()))
                .slug(page.getSlug())
                .status(page.getStatus() != null ? page.getStatus().name() : null)
                .visibility(page.getVisibility() != null ? page.getVisibility().name() : null)
                .authorId(page.getCreatedBy())
                .spaceId(page.getSpace() != null ? page.getSpace().getId() : null)
                .spaceName(page.getSpace() != null ? page.getSpace().getName() : null)
                .viewCount(page.getViewCount())
                .likeCount(page.getLikeCount())
                .createdAt(toInstant(page.getCreatedAt()))
                .updatedAt(toInstant(page.getUpdatedAt()))
                .publishedAt(toInstant(page.getPublishedAt()))
                .deleted(page.isDeleted())
                .build();

        fluenceDocumentRepository.save(doc);
        log.debug("Indexed wiki page: id={}, title={}", page.getId(), page.getTitle());
    }

    /**
     * Index a blog post into Elasticsearch.
     */
    public void indexBlogPost(BlogPost post) {
        FluenceDocument doc = FluenceDocument.builder()
                .id(FluenceDocument.buildId("blog", post.getId()))
                .tenantId(post.getTenantId())
                .contentType("blog")
                .contentId(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .bodyText(extractTextFromTipTapJson(post.getContent()))
                .slug(post.getSlug())
                .status(post.getStatus() != null ? post.getStatus().name() : null)
                .visibility(post.getVisibility() != null ? post.getVisibility().name() : null)
                .authorId(post.getCreatedBy())
                .category(post.getCategory() != null ? post.getCategory().getName() : null)
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .createdAt(toInstant(post.getCreatedAt()))
                .updatedAt(toInstant(post.getUpdatedAt()))
                .publishedAt(toInstant(post.getPublishedAt()))
                .deleted(post.isDeleted())
                .build();

        fluenceDocumentRepository.save(doc);
        log.debug("Indexed blog post: id={}, title={}", post.getId(), post.getTitle());
    }

    /**
     * Index a document template into Elasticsearch.
     */
    public void indexTemplate(DocumentTemplate template) {
        List<String> tags = null;
        if (template.getTags() != null && !template.getTags().isBlank()) {
            tags = Arrays.stream(template.getTags().split(","))
                    .map(String::trim)
                    .filter(t -> !t.isEmpty())
                    .collect(Collectors.toList());
        }

        FluenceDocument doc = FluenceDocument.builder()
                .id(FluenceDocument.buildId("template", template.getId()))
                .tenantId(template.getTenantId())
                .contentType("template")
                .contentId(template.getId())
                .title(template.getName())
                .excerpt(template.getDescription())
                .bodyText(extractTextFromTipTapJson(template.getContent()))
                .slug(template.getSlug())
                .status(template.getIsActive() ? "ACTIVE" : "INACTIVE")
                .tags(tags)
                .category(template.getCategory())
                .viewCount(template.getUsageCount())
                .createdAt(toInstant(template.getCreatedAt()))
                .updatedAt(toInstant(template.getUpdatedAt()))
                .deleted(template.isDeleted())
                .build();

        fluenceDocumentRepository.save(doc);
        log.debug("Indexed template: id={}, name={}", template.getId(), template.getName());
    }

    /**
     * Remove a document from the Elasticsearch index.
     */
    public void removeDocument(String contentType, UUID contentId) {
        String docId = FluenceDocument.buildId(contentType, contentId);
        fluenceDocumentRepository.deleteById(docId);
        log.debug("Removed document from index: type={}, id={}", contentType, contentId);
    }

    /**
     * Reindex all content for a given tenant. Used for initial backfill or repair.
     */
    public void reindexAll(UUID tenantId) {
        log.info("Starting full reindex for tenant: {}", tenantId);

        int page = 0;
        int size = 100;
        long totalIndexed = 0;

        // Reindex wiki pages
        Page<WikiPage> wikiPages;
        do {
            wikiPages = wikiPageRepository.findByTenantIdAndStatus(
                    tenantId, WikiPage.PageStatus.PUBLISHED, PageRequest.of(page, size));
            wikiPages.getContent().forEach(this::indexWikiPage);
            totalIndexed += wikiPages.getNumberOfElements();
            page++;
        } while (wikiPages.hasNext());

        // Reindex blog posts
        page = 0;
        Page<BlogPost> blogPosts;
        do {
            blogPosts = blogPostRepository.findByTenantIdAndStatus(
                    tenantId, BlogPost.BlogPostStatus.PUBLISHED, PageRequest.of(page, size));
            blogPosts.getContent().forEach(this::indexBlogPost);
            totalIndexed += blogPosts.getNumberOfElements();
            page++;
        } while (blogPosts.hasNext());

        // Reindex templates
        page = 0;
        Page<DocumentTemplate> templates;
        do {
            templates = documentTemplateRepository.findByTenantIdAndIsActiveTrue(
                    tenantId, PageRequest.of(page, size));
            templates.getContent().forEach(this::indexTemplate);
            totalIndexed += templates.getNumberOfElements();
            page++;
        } while (templates.hasNext());

        log.info("Full reindex complete for tenant: {}. Total documents indexed: {}", tenantId, totalIndexed);
    }

    /**
     * Extract plain text from TipTap JSON content.
     *
     * <p>TipTap stores content as a JSON AST. This method recursively walks the tree
     * and extracts all "text" values from text nodes, producing clean readable text.</p>
     */
    private String extractTextFromTipTapJson(String content) {
        if (content == null || content.isBlank()) return "";
        try {
            JsonNode root = objectMapper.readTree(content);
            StringBuilder sb = new StringBuilder();
            extractTextNodes(root, sb);
            return sb.toString().replaceAll("\\s+", " ").trim();
        } catch (Exception e) {
            // Fallback: crude regex extraction if JSON parsing fails
            log.trace("TipTap JSON parse failed, falling back to regex: {}", e.getMessage());
            return content
                    .replaceAll("<[^>]+>", " ")
                    .replaceAll("[{}\\[\\]\":]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
        }
    }

    /** Recursively walk TipTap JSON and collect text node values. */
    private void extractTextNodes(JsonNode node, StringBuilder sb) {
        if (node == null) return;

        if (node.isObject()) {
            JsonNode typeNode = node.get("type");
            if (typeNode != null && "text".equals(typeNode.asText())) {
                JsonNode textNode = node.get("text");
                if (textNode != null && !textNode.isNull()) {
                    sb.append(textNode.asText()).append(" ");
                }
            }
            if (typeNode != null && "heading".equals(typeNode.asText())) {
                sb.append("\n");
            }
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> extractTextNodes(entry.getValue(), sb));
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                extractTextNodes(child, sb);
            }
        }
    }

    private Instant toInstant(java.time.LocalDateTime ldt) {
        if (ldt == null) return null;
        return ldt.toInstant(ZoneOffset.UTC);
    }
}
