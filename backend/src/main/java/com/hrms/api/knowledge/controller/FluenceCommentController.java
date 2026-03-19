package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateCommentRequest;
import com.hrms.api.knowledge.dto.WikiCommentDto;
import com.hrms.application.knowledge.service.BlogCommentService;
import com.hrms.application.knowledge.service.WikiCommentService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fluence/comments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fluence Comments", description = "Unified comment management for wiki pages and blog posts")
public class FluenceCommentController {

    private final WikiCommentService wikiCommentService;
    private final BlogCommentService blogCommentService;

    @GetMapping("/{contentType}/{contentId}")
    @Operation(summary = "List comments for content")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<WikiCommentDto>> getComments(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            Pageable pageable) {
        return switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> ResponseEntity.ok(wikiCommentService.getComments(contentId, pageable));
            case "blog", "blog_post" -> ResponseEntity.ok(blogCommentService.getComments(contentId, pageable));
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
    }

    @PostMapping("/{contentType}/{contentId}")
    @Operation(summary = "Create a comment")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_CREATE)
    public ResponseEntity<WikiCommentDto> createComment(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @Valid @RequestBody CreateCommentRequest request) {
        WikiCommentDto dto = switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> wikiCommentService.createComment(contentId, request);
            case "blog", "blog_post" -> blogCommentService.createComment(contentId, request);
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{contentType}/{contentId}/{commentId}")
    @Operation(summary = "Update a comment")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiCommentDto> updateComment(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @PathVariable UUID commentId,
            @Valid @RequestBody CreateCommentRequest request) {
        WikiCommentDto dto = switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> wikiCommentService.updateComment(commentId, request);
            case "blog", "blog_post" -> blogCommentService.updateComment(commentId, request);
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{contentType}/{contentId}/{commentId}")
    @Operation(summary = "Delete a comment")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)
    public ResponseEntity<Void> deleteComment(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @PathVariable UUID commentId) {
        switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> wikiCommentService.deleteComment(contentId, commentId);
            case "blog", "blog_post" -> blogCommentService.deleteComment(contentId, commentId);
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{contentType}/{contentId}/{commentId}/permalink")
    @Operation(summary = "Get comment permalink")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<WikiCommentDto> getCommentPermalink(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @PathVariable UUID commentId) {
        WikiCommentDto dto = switch (contentType.toLowerCase()) {
            case "wiki", "wiki_page" -> wikiCommentService.getCommentById(commentId);
            case "blog", "blog_post" -> blogCommentService.getCommentById(commentId);
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
        return ResponseEntity.ok(dto);
    }
}
