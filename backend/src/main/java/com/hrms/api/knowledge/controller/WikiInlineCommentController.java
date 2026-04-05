package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateInlineCommentRequest;
import com.hrms.api.knowledge.dto.ReplyToInlineCommentRequest;
import com.hrms.api.knowledge.dto.WikiInlineCommentDto;
import com.hrms.application.knowledge.service.WikiInlineCommentService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.knowledge.WikiInlineComment;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Tag(name = "Wiki Inline Comments", description = "Annotation-style comments anchored to wiki page content")
public class WikiInlineCommentController {

    private final WikiInlineCommentService wikiInlineCommentService;
    private final EmployeeRepository employeeRepository;

    // ==================== Page-Scoped Endpoints ====================

    @GetMapping("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments")
    @Operation(summary = "List all inline comments for a page")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiInlineCommentDto>> getInlineComments(@PathVariable UUID pageId) {
        List<WikiInlineComment> comments = wikiInlineCommentService.getInlineComments(pageId);
        return ResponseEntity.ok(toDtoTree(comments));
    }

    @GetMapping("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments/open")
    @Operation(summary = "List open inline comments for a page")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiInlineCommentDto>> getOpenInlineComments(@PathVariable UUID pageId) {
        List<WikiInlineComment> comments = wikiInlineCommentService.getOpenInlineComments(pageId);
        return ResponseEntity.ok(toDtoTree(comments));
    }

    @PostMapping("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments")
    @Operation(summary = "Create an inline comment on a page")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiInlineCommentDto> createInlineComment(
            @PathVariable UUID pageId,
            @Valid @RequestBody CreateInlineCommentRequest request) {
        WikiInlineComment created = wikiInlineCommentService.createInlineComment(pageId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    // ==================== Comment-Scoped Endpoints ====================

    @PostMapping("/api/v1/knowledge/wiki/inline-comments/{commentId}/reply")
    @Operation(summary = "Reply to an inline comment")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiInlineCommentDto> replyToInlineComment(
            @PathVariable UUID commentId,
            @Valid @RequestBody ReplyToInlineCommentRequest request) {
        WikiInlineComment reply = wikiInlineCommentService.replyToInlineComment(commentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(reply));
    }

    @PostMapping("/api/v1/knowledge/wiki/inline-comments/{commentId}/resolve")
    @Operation(summary = "Resolve an inline comment")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiInlineCommentDto> resolveInlineComment(@PathVariable UUID commentId) {
        WikiInlineComment resolved = wikiInlineCommentService.resolveInlineComment(commentId);
        return ResponseEntity.ok(toDto(resolved));
    }

    @DeleteMapping("/api/v1/knowledge/wiki/inline-comments/{commentId}")
    @Operation(summary = "Delete an inline comment")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)
    public ResponseEntity<Void> deleteInlineComment(@PathVariable UUID commentId) {
        wikiInlineCommentService.deleteInlineComment(commentId);
        return ResponseEntity.noContent().build();
    }

    // ==================== DTO Mapping Helpers ====================

    /**
     * Builds a threaded tree from a flat list of inline comments.
     * Root comments (no parentComment) are top-level; replies are nested under their parent.
     */
    private List<WikiInlineCommentDto> toDtoTree(List<WikiInlineComment> comments) {
        // Batch-load all authors in a single query
        Set<UUID> authorUserIds = comments.stream()
                .map(WikiInlineComment::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        UUID tenantId = TenantContext.getCurrentTenant();
        Map<UUID, Employee> authorsByUserId = authorUserIds.isEmpty()
                ? Map.of()
                : employeeRepository.findAllByUserIdIn(authorUserIds).stream()
                        .filter(e -> e.getUser() != null)
                        .collect(Collectors.toMap(e -> e.getUser().getId(), Function.identity(), (a, b) -> a));

        // Convert all entities to DTOs (flat, no replies yet)
        Map<UUID, WikiInlineCommentDto> dtoMap = new LinkedHashMap<>();
        for (WikiInlineComment comment : comments) {
            WikiInlineCommentDto dto = toDtoWithAuthor(comment, authorsByUserId);
            dto.setReplies(new ArrayList<>());
            dtoMap.put(comment.getId(), dto);
        }

        // Build tree: attach replies to their parent
        List<WikiInlineCommentDto> roots = new ArrayList<>();
        for (WikiInlineComment comment : comments) {
            WikiInlineCommentDto dto = dtoMap.get(comment.getId());
            UUID parentId = comment.getParentComment() != null ? comment.getParentComment().getId() : null;
            if (parentId != null && dtoMap.containsKey(parentId)) {
                dtoMap.get(parentId).getReplies().add(dto);
            } else {
                roots.add(dto);
            }
        }

        return roots;
    }

    private WikiInlineCommentDto toDto(WikiInlineComment comment) {
        if (comment == null) return null;

        String authorName = null;
        String avatarUrl = null;

        if (comment.getCreatedBy() != null) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Employee author = employeeRepository.findByUserIdWithUser(comment.getCreatedBy(), tenantId)
                    .orElse(null);
            if (author != null) {
                authorName = author.getFirstName() +
                        (author.getLastName() != null ? " " + author.getLastName() : "");
                avatarUrl = author.getUser() != null ? author.getUser().getProfilePictureUrl() : null;
            }
        }

        return WikiInlineCommentDto.fromEntity(comment, authorName, avatarUrl);
    }

    private WikiInlineCommentDto toDtoWithAuthor(WikiInlineComment comment, Map<UUID, Employee> authorsByUserId) {
        String authorName = null;
        String avatarUrl = null;

        if (comment.getCreatedBy() != null) {
            Employee author = authorsByUserId.get(comment.getCreatedBy());
            if (author != null) {
                authorName = author.getFirstName() +
                        (author.getLastName() != null ? " " + author.getLastName() : "");
                avatarUrl = author.getUser() != null ? author.getUser().getProfilePictureUrl() : null;
            }
        }

        return WikiInlineCommentDto.fromEntity(comment, authorName, avatarUrl);
    }
}
