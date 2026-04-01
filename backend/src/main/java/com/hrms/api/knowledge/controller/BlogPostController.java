package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.BlogPostDto;
import com.hrms.api.knowledge.dto.CreateBlogPostRequest;
import com.hrms.api.knowledge.dto.UpdateBlogPostRequest;
import com.hrms.application.knowledge.service.BlogPostService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge/blogs")
@RequiredArgsConstructor
@Tag(name = "Blog Posts", description = "Blog post management")
public class BlogPostController {

    private final BlogPostService blogPostService;
    private final EmployeeRepository employeeRepository;

    /**
     * Convert BlogPost entity to DTO with author information
     */
    private BlogPostDto toDto(BlogPost post) {
        if (post == null) return null;

        if (post.getCreatedBy() == null) {
            return BlogPostDto.fromEntity(post, null, null);
        }

        UUID tenantId = TenantContext.requireCurrentTenant();
        Employee author = employeeRepository.findByUserIdWithUser(post.getCreatedBy(), tenantId)
                .orElse(null);

        if (author == null) {
            return BlogPostDto.fromEntity(post, null, null);
        }

        String authorName = author.getFirstName() +
                (author.getLastName() != null ? " " + author.getLastName() : "");
        return BlogPostDto.fromEntity(post, authorName, resolveAuthorAvatarUrl(author));
    }

    private String resolveAuthorAvatarUrl(Employee author) {
        return author != null && author.getUser() != null ? author.getUser().getProfilePictureUrl() : null;
    }

    @PostMapping
    @Operation(summary = "Create blog post")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_CREATE)
    public ResponseEntity<BlogPostDto> createPost(@Valid @RequestBody CreateBlogPostRequest request) {
        BlogPost post = BlogPost.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .excerpt(request.getExcerpt())
                .featuredImageUrl(request.getFeaturedImageUrl())
                .content(request.getContent())
                .visibility(BlogPost.VisibilityLevel.valueOf(request.getVisibility()))
                .status(BlogPost.BlogPostStatus.valueOf(request.getStatus()))
                .scheduledFor(request.getScheduledFor())
                .readTimeMinutes(request.getReadTimeMinutes())
                .build();

        BlogPost created = blogPostService.createPost(post);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @GetMapping("/{postId}")
    @Operation(summary = "Get blog post by ID")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<BlogPostDto> getPostById(@PathVariable UUID postId) {
        BlogPost post = blogPostService.getPostById(postId);
        return ResponseEntity.ok(toDto(post));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get blog post by slug")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<BlogPostDto> getPostBySlug(@PathVariable String slug) {
        BlogPost post = blogPostService.getPostBySlug(slug);
        return ResponseEntity.ok(toDto(post));
    }

    @GetMapping
    @Operation(summary = "Get published blog posts")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Page<BlogPostDto>> getPublishedPosts(Pageable pageable) {
        Page<BlogPost> posts = blogPostService.getPublishedPosts(pageable);
        return ResponseEntity.ok(posts.map(this::toDto));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active (published, non-archived) blog posts")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Page<BlogPostDto>> getActivePosts(Pageable pageable) {
        Page<BlogPost> posts = blogPostService.getPublishedPosts(pageable);
        return ResponseEntity.ok(posts.map(this::toDto));
    }

    @GetMapping("/category/{categoryId}")
    @Operation(summary = "Get posts by category")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Page<BlogPostDto>> getPostsByCategory(
            @PathVariable UUID categoryId,
            Pageable pageable) {
        Page<BlogPost> posts = blogPostService.getPostsByCategory(categoryId, pageable);
        return ResponseEntity.ok(posts.map(this::toDto));
    }

    @GetMapping("/featured")
    @Operation(summary = "Get featured blog posts")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<List<BlogPostDto>> getFeaturedPosts() {
        List<BlogPost> posts = blogPostService.getFeaturedPosts();
        return ResponseEntity.ok(
            posts.stream()
                .map(this::toDto)
                .collect(Collectors.toList())
        );
    }

    @PutMapping("/{postId}")
    @Operation(summary = "Update blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_UPDATE)
    public ResponseEntity<BlogPostDto> updatePost(
            @PathVariable UUID postId,
            @Valid @RequestBody UpdateBlogPostRequest request) {
        BlogPost postData = BlogPost.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .excerpt(request.getExcerpt())
                .featuredImageUrl(request.getFeaturedImageUrl())
                .content(request.getContent())
                .visibility(BlogPost.VisibilityLevel.valueOf(request.getVisibility()))
                .status(BlogPost.BlogPostStatus.valueOf(request.getStatus()))
                .readTimeMinutes(request.getReadTimeMinutes())
                .isFeatured(request.getIsFeatured())
                .featuredUntil(request.getFeaturedUntil())
                .build();

        BlogPost updated = blogPostService.updatePost(postId, postData);
        return ResponseEntity.ok(toDto(updated));
    }

    @PostMapping("/{postId}/publish")
    @Operation(summary = "Publish blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_PUBLISH)
    public ResponseEntity<BlogPostDto> publishPost(@PathVariable UUID postId) {
        BlogPost published = blogPostService.publishPost(postId);
        return ResponseEntity.ok(toDto(published));
    }

    @PostMapping("/{postId}/schedule")
    @Operation(summary = "Schedule blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_PUBLISH)
    public ResponseEntity<BlogPostDto> schedulePost(
            @PathVariable UUID postId,
            @RequestParam LocalDateTime scheduledFor) {
        BlogPost scheduled = blogPostService.schedulePost(postId, scheduledFor);
        return ResponseEntity.ok(toDto(scheduled));
    }

    @PostMapping("/{postId}/archive")
    @Operation(summary = "Archive blog post")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_UPDATE)
    public ResponseEntity<BlogPostDto> archivePost(@PathVariable UUID postId) {
        BlogPost archived = blogPostService.archivePost(postId);
        return ResponseEntity.ok(toDto(archived));
    }

    @DeleteMapping("/{postId}")
    @Operation(summary = "Delete blog post")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_DELETE)
    public ResponseEntity<Void> deletePost(@PathVariable UUID postId) {
        blogPostService.deletePost(postId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search blog posts")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<BlogPostDto>> searchPosts(
            @RequestParam String query,
            Pageable pageable) {
        Page<BlogPost> results = blogPostService.searchPosts(query, pageable);
        return ResponseEntity.ok(results.map(this::toDto));
    }
}
