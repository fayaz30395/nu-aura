package com.hrms.api.wall.controller;

import com.hrms.api.wall.dto.*;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.wall.model.WallPost;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.hrms.common.security.Permission.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/wall")
@Tag(name = "Organization Wall", description = "APIs for managing organization wall posts, polls, and praise")
public class WallController {

    private final WallService wallService;

    public WallController(WallService wallService) {
        this.wallService = wallService;
    }

    // ==================== POSTS ====================

    @PostMapping("/posts")
    @Operation(summary = "Create a new post", description = "Create a new post, poll, or praise on the organization wall")
    @RequiresPermission(WALL_POST)
    public ResponseEntity<WallPostResponse> createPost(@Valid @RequestBody CreatePostRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        WallPostResponse response = wallService.createPost(request, employeeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/posts")
    @Operation(summary = "Get all posts", description = "Get paginated list of posts from the organization wall")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Page<WallPostResponse>> getPosts(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Page<WallPostResponse> posts = wallService.getPosts(pageable, employeeId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/posts/type/{type}")
    @Operation(summary = "Get posts by type", description = "Get posts filtered by type (POST, POLL, or PRAISE)")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Page<WallPostResponse>> getPostsByType(
            @PathVariable WallPost.PostType type,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Page<WallPostResponse> posts = wallService.getPostsByType(type, pageable, employeeId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/posts/{postId}")
    @Operation(summary = "Get post by ID", description = "Get a specific post by its ID")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<WallPostResponse> getPost(@PathVariable UUID postId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        WallPostResponse post = wallService.getPostById(postId, employeeId);
        return ResponseEntity.ok(post);
    }

    @DeleteMapping("/posts/{postId}")
    @Operation(summary = "Delete a post", description = "Delete a post (only the author can delete)")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Void> deletePost(@PathVariable UUID postId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        wallService.deletePost(postId, employeeId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/posts/{postId}/pin")
    @Operation(summary = "Pin/unpin a post", description = "Pin or unpin a post (admin only)")
    @RequiresPermission(WALL_PIN)
    public ResponseEntity<WallPostResponse> pinPost(
            @PathVariable UUID postId,
            @RequestParam boolean pinned) {
        WallPostResponse response = wallService.pinPost(postId, pinned);
        return ResponseEntity.ok(response);
    }

    // ==================== REACTIONS ====================

    @PostMapping("/posts/{postId}/reactions")
    @Operation(summary = "Add reaction to post", description = "Add a reaction (like, love, celebrate, etc.) to a post")
    @RequiresPermission(WALL_REACT)
    public ResponseEntity<Void> addReaction(
            @PathVariable UUID postId,
            @Valid @RequestBody ReactionRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        wallService.addReaction(postId, employeeId, request.getReactionType());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/posts/{postId}/reactions")
    @Operation(summary = "Remove reaction from post", description = "Remove your reaction from a post")
    @RequiresPermission(WALL_REACT)
    public ResponseEntity<Void> removeReaction(@PathVariable UUID postId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        wallService.removeReaction(postId, employeeId);
        return ResponseEntity.noContent().build();
    }

    // ==================== COMMENTS ====================

    @PostMapping("/posts/{postId}/comments")
    @Operation(summary = "Add comment to post", description = "Add a comment or reply to a post")
    @RequiresPermission(WALL_COMMENT)
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID postId,
            @Valid @RequestBody CreateCommentRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        CommentResponse response = wallService.addComment(postId, request, employeeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/posts/{postId}/comments")
    @Operation(summary = "Get comments for post", description = "Get paginated list of comments for a post")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Page<CommentResponse>> getComments(
            @PathVariable UUID postId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<CommentResponse> comments = wallService.getComments(postId, pageable);
        return ResponseEntity.ok(comments);
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "Delete a comment", description = "Delete a comment (only the author can delete)")
    @RequiresPermission(WALL_COMMENT)
    public ResponseEntity<Void> deleteComment(@PathVariable UUID commentId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        wallService.deleteComment(commentId, employeeId);
        return ResponseEntity.noContent().build();
    }

    // ==================== POLLS ====================

    @PostMapping("/posts/{postId}/vote")
    @Operation(summary = "Vote on a poll", description = "Cast or change your vote on a poll")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<WallPostResponse> vote(
            @PathVariable UUID postId,
            @Valid @RequestBody VoteRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        WallPostResponse response = wallService.vote(postId, request.getOptionId(), employeeId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/posts/{postId}/vote")
    @Operation(summary = "Remove vote from poll", description = "Remove your vote from a poll")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Void> removeVote(@PathVariable UUID postId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        wallService.removeVote(postId, employeeId);
        return ResponseEntity.noContent().build();
    }

    // ==================== PRAISE ====================

    @GetMapping("/praise/employee/{employeeId}")
    @Operation(summary = "Get praise for employee", description = "Get all praise posts received by an employee")
    @RequiresPermission(WALL_VIEW)
    public ResponseEntity<Page<WallPostResponse>> getPraiseForEmployee(
            @PathVariable UUID employeeId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        Page<WallPostResponse> praise = wallService.getPraiseForEmployee(employeeId, pageable, currentEmployeeId);
        return ResponseEntity.ok(praise);
    }
}
