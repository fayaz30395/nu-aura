package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.FavoriteDto;
import com.hrms.application.knowledge.service.ContentEngagementService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.KnowledgeView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fluence/engagement")
@RequiredArgsConstructor
@Tag(name = "Content Engagement", description = "Likes, favorites, views, and watches for Fluence content")
public class ContentEngagementController {

    private final ContentEngagementService engagementService;

    // ==================== Likes ====================

    @PostMapping("/likes/wiki/{pageId}")
    @Operation(summary = "Toggle like on a wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> toggleWikiLike(@PathVariable UUID pageId) {
        boolean liked = engagementService.toggleWikiPageLike(pageId);
        return ResponseEntity.ok(Map.of("liked", liked));
    }

    @PostMapping("/likes/blog/{postId}")
    @Operation(summary = "Toggle like on a blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Map<String, Boolean>> toggleBlogLike(@PathVariable UUID postId) {
        boolean liked = engagementService.toggleBlogPostLike(postId);
        return ResponseEntity.ok(Map.of("liked", liked));
    }

    @GetMapping("/likes/wiki/{pageId}/status")
    @Operation(summary = "Check if current user liked a wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> isWikiLiked(@PathVariable UUID pageId) {
        return ResponseEntity.ok(Map.of("liked", engagementService.isWikiPageLiked(pageId)));
    }

    @GetMapping("/likes/blog/{postId}/status")
    @Operation(summary = "Check if current user liked a blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Map<String, Boolean>> isBlogLiked(@PathVariable UUID postId) {
        return ResponseEntity.ok(Map.of("liked", engagementService.isBlogPostLiked(postId)));
    }

    // ==================== Favorites ====================

    @PostMapping("/favorites/{contentType}/{contentId}")
    @Operation(summary = "Toggle favorite on content")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {
        boolean favorited = engagementService.toggleFavorite(contentId, contentType);
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }

    @GetMapping("/favorites/{contentType}/{contentId}/status")
    @Operation(summary = "Check if current user favorited content")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> isFavorited(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {
        return ResponseEntity.ok(Map.of("favorited", engagementService.isFavorited(contentId, contentType)));
    }

    @GetMapping("/favorites")
    @Operation(summary = "Get current user's favorites")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FavoriteDto>> getFavorites(Pageable pageable) {
        Page<FavoriteDto> favorites = engagementService.getFavorites(pageable)
                .map(FavoriteDto::fromEntity);
        return ResponseEntity.ok(favorites);
    }

    @GetMapping("/favorites/type/{contentType}")
    @Operation(summary = "Get current user's favorites filtered by type")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FavoriteDto>> getFavoritesByType(
            @PathVariable String contentType,
            Pageable pageable) {
        Page<FavoriteDto> favorites = engagementService.getFavoritesByType(contentType, pageable)
                .map(FavoriteDto::fromEntity);
        return ResponseEntity.ok(favorites);
    }

    // ==================== Views ====================

    @PostMapping("/views/{contentType}/{contentId}")
    @Operation(summary = "Record a view")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Void> recordView(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            HttpServletRequest request) {
        KnowledgeView.ContentType type = resolveContentType(contentType);
        engagementService.recordView(contentId, type, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/views/{contentType}/{contentId}/viewers")
    @Operation(summary = "Get viewers of content")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<KnowledgeView>> getViewers(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            Pageable pageable) {
        KnowledgeView.ContentType type = resolveContentType(contentType);
        return ResponseEntity.ok(engagementService.getViewers(contentId, type, pageable));
    }

    // ==================== Watches ====================

    @PostMapping("/watches/wiki/{pageId}")
    @Operation(summary = "Toggle watch on a wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> toggleWatch(@PathVariable UUID pageId) {
        boolean watching = engagementService.toggleWatch(pageId);
        return ResponseEntity.ok(Map.of("watching", watching));
    }

    @GetMapping("/watches/wiki/{pageId}/status")
    @Operation(summary = "Check if current user is watching a wiki page")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, Boolean>> isWatching(@PathVariable UUID pageId) {
        return ResponseEntity.ok(Map.of("watching", engagementService.isWatching(pageId)));
    }

    // ==================== Helpers ====================

    private KnowledgeView.ContentType resolveContentType(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> KnowledgeView.ContentType.WIKI_PAGE;
            case "blog", "blog_post" -> KnowledgeView.ContentType.BLOG_POST;
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
    }
}
