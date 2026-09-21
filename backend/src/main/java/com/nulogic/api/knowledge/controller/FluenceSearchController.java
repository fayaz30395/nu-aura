package com.nulogic.api.knowledge.controller;

import com.nulogic.application.knowledge.service.KnowledgeSearchService;
import com.nulogic.common.api.ApiResponses;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.search.document.FluenceDocument;
import com.nulogic.infrastructure.search.service.FluenceSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Unified search endpoint for NU-Fluence content.
 *
 * <p>When Elasticsearch is enabled ({@code app.elasticsearch.enabled=true}), delegates
 * to {@link FluenceSearchService} for full-text multi-field boosted search. Otherwise,
 * falls back to PostgreSQL-based search via {@link KnowledgeSearchService}.</p>
 */
@RestController
@RequestMapping("/api/v1/fluence/search")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fluence Search", description = "Unified full-text search for NU-Fluence content")
public class FluenceSearchController {

    private final KnowledgeSearchService knowledgeSearchService;

    @Autowired(required = false)
    private FluenceSearchService fluenceSearchService;

    @GetMapping
    @Operation(summary = "Search all Fluence content (wiki, blog, templates)")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<FluenceDocument>> search(
            @RequestParam String query,
            @Parameter(description = "Filter by content type: wiki, blog, template")
            @RequestParam(required = false) String contentType,
            @Parameter(description = "Filter by visibility: PUBLIC, ORGANIZATION, TEAM, PRIVATE")
            @RequestParam(required = false) String visibility,
            Pageable pageable) {

        UUID tenantId = TenantContext.getCurrentTenant();

        if (fluenceSearchService != null) {
            log.debug("Fluence search via Elasticsearch: query='{}', tenantId={}", query, tenantId);
            Page<FluenceDocument> results = fluenceSearchService.searchWithFilters(
                    query, tenantId, contentType, visibility, pageable);
            return ResponseEntity.ok(results);
        }

        // Fallback to PostgreSQL search. AC1: honor the same contentType/visibility
        // filters the ES path applies, instead of silently ignoring them and returning
        // broader, unfiltered wiki-only results.
        log.debug("Fluence search via PostgreSQL fallback: query='{}', tenantId={}, contentType={}, visibility={}",
                query, tenantId, contentType, visibility);

        Page<FluenceDocument> fallbackResults;
        if ("blog".equalsIgnoreCase(contentType)) {
            fallbackResults = knowledgeSearchService.searchBlogPosts(query, pageable).map(this::toFluenceDocument);
        } else if ("wiki".equalsIgnoreCase(contentType)) {
            fallbackResults = knowledgeSearchService.searchWikiPages(query, pageable).map(this::toFluenceDocument);
        } else {
            // No contentType filter requested: searchAllContent only covers wiki pages
            // today (a pre-existing PostgreSQL-fallback limitation, unrelated to this
            // fix) — same set the caller would have gotten before this change.
            fallbackResults = knowledgeSearchService.searchAllContent(query, pageable).map(this::toFluenceDocument);
        }

        if (visibility != null && !visibility.isBlank()) {
            // Best-effort post-filter: the native search queries don't take a visibility
            // parameter, so this is applied after DB-level pagination — page totals can
            // undercount versus the true filtered count in this degraded (no-ES) mode.
            var filtered = fallbackResults.getContent().stream()
                    .filter(doc -> visibility.equalsIgnoreCase(doc.getVisibility()))
                    .toList();
            fallbackResults = new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        }

        return ResponseEntity.ok(fallbackResults);
    }

    private FluenceDocument toFluenceDocument(com.nulogic.domain.knowledge.WikiPage page) {
        return FluenceDocument.builder()
                .id(FluenceDocument.buildId("wiki", page.getId()))
                .tenantId(page.getTenantId())
                .contentType("wiki")
                .contentId(page.getId())
                .title(page.getTitle())
                .excerpt(page.getExcerpt())
                .slug(page.getSlug())
                .status(page.getStatus() != null ? page.getStatus().name() : null)
                .visibility(page.getVisibility() != null ? page.getVisibility().name() : null)
                .authorId(page.getCreatedBy())
                .viewCount(page.getViewCount())
                .likeCount(page.getLikeCount())
                .deleted(page.isDeleted())
                .build();
    }

    private FluenceDocument toFluenceDocument(com.nulogic.domain.knowledge.BlogPost post) {
        return FluenceDocument.builder()
                .id(FluenceDocument.buildId("blog", post.getId()))
                .tenantId(post.getTenantId())
                .contentType("blog")
                .contentId(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .slug(post.getSlug())
                .status(post.getStatus() != null ? post.getStatus().name() : null)
                .visibility(post.getVisibility() != null ? post.getVisibility().name() : null)
                .authorId(post.getCreatedBy())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .deleted(post.isDeleted())
                .build();
    }
}
