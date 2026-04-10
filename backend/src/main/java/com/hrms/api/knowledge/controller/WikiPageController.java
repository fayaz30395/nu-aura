package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateWikiPageRequest;
import com.hrms.api.knowledge.dto.UpdateWikiPageRequest;
import com.hrms.api.knowledge.dto.WikiPageBreadcrumb;
import com.hrms.api.knowledge.dto.WikiPageDto;
import com.hrms.api.knowledge.dto.WikiPageTreeNode;
import com.hrms.application.knowledge.service.WikiExportService;
import com.hrms.application.knowledge.service.WikiPageService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge/wiki/pages")
@RequiredArgsConstructor
@Tag(name = "Wiki Pages", description = "Wiki page management")
public class WikiPageController {

    private final WikiPageService wikiPageService;
    private final WikiExportService wikiExportService;
    private final EmployeeRepository employeeRepository;

    /**
     * Convert WikiPage entity to DTO with author information (single page).
     */
    private WikiPageDto toDto(WikiPage page) {
        if (page == null) return null;

        if (page.getCreatedBy() == null) {
            return WikiPageDto.fromEntity(page, null, null);
        }

        UUID tenantId = TenantContext.getCurrentTenant();
        Employee author = employeeRepository.findByUserIdWithUser(page.getCreatedBy(), tenantId)
                .orElse(null);

        if (author == null) {
            return WikiPageDto.fromEntity(page, null, null);
        }

        String authorName = author.getFirstName() +
                (author.getLastName() != null ? " " + author.getLastName() : "");
        return WikiPageDto.fromEntity(page, authorName, resolveAuthorAvatarUrl(author));
    }

    /**
     * PERF-1: Batch-convert WikiPages to DTOs — fetches all authors in a single query
     * instead of N+1 individual queries.
     */
    private Page<WikiPageDto> toDtoBatch(Page<WikiPage> pages) {
        // Collect unique author user IDs
        Set<UUID> authorUserIds = pages.getContent().stream()
                .map(WikiPage::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Single batch query for all authors
        Map<UUID, Employee> authorsByUserId = authorUserIds.isEmpty()
                ? Map.of()
                : employeeRepository.findAllByUserIdIn(authorUserIds).stream()
                  .filter(e -> e.getUser() != null)
                  .collect(Collectors.toMap(e -> e.getUser().getId(), Function.identity(), (a, b) -> a));

        return pages.map(page -> {
            if (page.getCreatedBy() == null) {
                return WikiPageDto.fromEntity(page, null, null);
            }
            Employee author = authorsByUserId.get(page.getCreatedBy());
            if (author == null) {
                return WikiPageDto.fromEntity(page, null, null);
            }
            String authorName = author.getFirstName() +
                    (author.getLastName() != null ? " " + author.getLastName() : "");
            return WikiPageDto.fromEntity(page, authorName, resolveAuthorAvatarUrl(author));
        });
    }

    private String resolveAuthorAvatarUrl(Employee author) {
        return author != null && author.getUser() != null ? author.getUser().getProfilePictureUrl() : null;
    }

    @PostMapping
    @Operation(summary = "Create wiki page")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_CREATE)
    public ResponseEntity<WikiPageDto> createPage(@Valid @RequestBody CreateWikiPageRequest request) {
        WikiPage page = WikiPage.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .excerpt(request.getExcerpt())
                .content(request.getContent())
                .visibility(WikiPage.VisibilityLevel.valueOf(request.getVisibility()))
                .status(WikiPage.PageStatus.valueOf(request.getStatus()))
                .build();

        WikiPage created = wikiPageService.createPage(page);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @GetMapping
    @Operation(summary = "Get all wiki pages")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<WikiPageDto>> getAllPages(Pageable pageable) {
        Page<WikiPage> pages = wikiPageService.getAllPages(pageable);
        return ResponseEntity.ok(toDtoBatch(pages));
    }

    @GetMapping("/{pageId}")
    @Operation(summary = "Get wiki page by ID")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<WikiPageDto> getPageById(@PathVariable UUID pageId) {
        WikiPage page = wikiPageService.getPageById(pageId);
        return ResponseEntity.ok(toDto(page));
    }

    @GetMapping("/space/{spaceId}")
    @Operation(summary = "Get pages by space")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<WikiPageDto>> getPagesBySpace(
            @PathVariable UUID spaceId,
            Pageable pageable) {
        Page<WikiPage> pages = wikiPageService.getPagesBySpace(spaceId, pageable);
        return ResponseEntity.ok(toDtoBatch(pages));
    }

    @PutMapping("/{pageId}")
    @Operation(summary = "Update wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiPageDto> updatePage(
            @PathVariable UUID pageId,
            @Valid @RequestBody UpdateWikiPageRequest request) {
        WikiPage pageData = WikiPage.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .excerpt(request.getExcerpt())
                .content(request.getContent())
                .visibility(WikiPage.VisibilityLevel.valueOf(request.getVisibility()))
                .status(WikiPage.PageStatus.valueOf(request.getStatus()))
                .build();

        WikiPage updated = wikiPageService.updatePage(pageId, pageData);
        return ResponseEntity.ok(toDto(updated));
    }

    @PostMapping("/{pageId}/publish")
    @Operation(summary = "Publish wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_PUBLISH)
    public ResponseEntity<WikiPageDto> publishPage(@PathVariable UUID pageId) {
        WikiPage published = wikiPageService.publishPage(pageId);
        return ResponseEntity.ok(toDto(published));
    }

    @PostMapping("/{pageId}/archive")
    @Operation(summary = "Archive wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiPageDto> archivePage(@PathVariable UUID pageId) {
        WikiPage archived = wikiPageService.archivePage(pageId);
        return ResponseEntity.ok(toDto(archived));
    }

    @PostMapping("/{pageId}/toggle-pin")
    @Operation(summary = "Toggle pin status")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiPageDto> togglePin(@PathVariable UUID pageId) {
        WikiPage toggled = wikiPageService.togglePin(pageId);
        return ResponseEntity.ok(toDto(toggled));
    }

    @DeleteMapping("/{pageId}")
    @Operation(summary = "Delete wiki page")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)
    public ResponseEntity<Void> deletePage(@PathVariable UUID pageId) {
        wikiPageService.deletePage(pageId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search wiki pages")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<WikiPageDto>> searchPages(
            @RequestParam String query,
            Pageable pageable) {
        Page<WikiPage> results = wikiPageService.searchPages(query, pageable);
        return ResponseEntity.ok(toDtoBatch(results));
    }

    // ==================== Page Hierarchy Endpoints ====================

    @GetMapping("/space/{spaceId}/tree")
    @Operation(summary = "Get full page tree for a space")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiPageTreeNode>> getPageTree(@PathVariable UUID spaceId) {
        List<WikiPageTreeNode> tree = wikiPageService.getPageTree(spaceId);
        return ResponseEntity.ok(tree);
    }

    @GetMapping("/space/{spaceId}/root")
    @Operation(summary = "Get root pages in a space")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiPageDto>> getRootPages(@PathVariable UUID spaceId) {
        List<WikiPage> rootPages = wikiPageService.getRootPages(spaceId);
        return ResponseEntity.ok(rootPages.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @GetMapping("/{pageId}/children")
    @Operation(summary = "Get direct children of a page")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiPageDto>> getChildPages(@PathVariable UUID pageId) {
        List<WikiPage> children = wikiPageService.getChildPages(pageId);
        return ResponseEntity.ok(children.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @GetMapping("/{pageId}/breadcrumbs")
    @Operation(summary = "Get ancestor breadcrumb chain for a page")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiPageBreadcrumb>> getBreadcrumbs(@PathVariable UUID pageId) {
        List<WikiPageBreadcrumb> breadcrumbs = wikiPageService.getBreadcrumbs(pageId);
        return ResponseEntity.ok(breadcrumbs);
    }

    @PatchMapping("/{pageId}/move")
    @Operation(summary = "Move page to a new parent (or root)")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiPageDto> movePage(
            @PathVariable UUID pageId,
            @RequestBody Map<String, UUID> body) {
        UUID newParentPageId = body.get("parentPageId");
        WikiPage moved = wikiPageService.movePage(pageId, newParentPageId);
        return ResponseEntity.ok(toDto(moved));
    }

    // ==================== Export Endpoint ====================

    @GetMapping("/{pageId}/export")
    @Operation(summary = "Export wiki page as PDF or DOCX")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<byte[]> exportPage(
            @PathVariable UUID pageId,
            @RequestParam(defaultValue = "pdf") String format) {
        WikiPage page = wikiPageService.getPageById(pageId);
        byte[] content;
        String contentType;
        String filename;

        if ("docx".equalsIgnoreCase(format)) {
            content = wikiExportService.exportToDocx(page);
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            filename = page.getSlug() + ".docx";
        } else {
            content = wikiExportService.exportToPdf(page);
            contentType = "application/pdf";
            filename = page.getSlug() + ".pdf";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(content.length);

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    @GetMapping("/{pageId}/versions")
    @Operation(summary = "Get page version history")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<?>> getPageVersions(@PathVariable UUID pageId) {
        return ResponseEntity.ok(wikiPageService.getPageVersionHistory(pageId));
    }
}
