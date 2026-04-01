package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.KnowledgeSearchService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.search.document.FluenceDocument;
import com.hrms.infrastructure.search.service.FluenceSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

        // Fallback to PostgreSQL search — convert WikiPage results to FluenceDocument
        log.debug("Fluence search via PostgreSQL fallback: query='{}', tenantId={}", query, tenantId);
        var wikiResults = knowledgeSearchService.searchAllContent(query, pageable);
        Page<FluenceDocument> fallbackResults = wikiResults.map(page -> FluenceDocument.builder()
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
                .build());

        return ResponseEntity.ok(fallbackResults);
    }
}
