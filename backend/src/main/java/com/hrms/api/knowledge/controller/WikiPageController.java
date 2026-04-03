package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateWikiPageRequest;
import com.hrms.api.knowledge.dto.UpdateWikiPageRequest;
import com.hrms.api.knowledge.dto.WikiPageDto;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge/wiki/pages")
@RequiredArgsConstructor
@Tag(name = "Wiki Pages", description = "Wiki page management")
public class WikiPageController {

    private final WikiPageService wikiPageService;
    private final EmployeeRepository employeeRepository;

    /**
     * Convert WikiPage entity to DTO with author information
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
        return ResponseEntity.ok(pages.map(this::toDto));
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
        return ResponseEntity.ok(results.map(this::toDto));
    }

    @GetMapping("/{pageId}/versions")
    @Operation(summary = "Get page version history")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<?>> getPageVersions(@PathVariable UUID pageId) {
        return ResponseEntity.ok(wikiPageService.getPageVersionHistory(pageId));
    }
}
