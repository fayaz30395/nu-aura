package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.BlogCategoryDto;
import com.hrms.api.knowledge.dto.CreateBlogCategoryRequest;
import com.hrms.application.knowledge.service.BlogCategoryService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.BlogCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/knowledge/blogs/categories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Blog Categories", description = "Blog category management")
public class BlogCategoryController {

    private final BlogCategoryService blogCategoryService;

    @PostMapping
    @Operation(summary = "Create blog category")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_CREATE)
    public ResponseEntity<BlogCategoryDto> createCategory(@RequestBody CreateBlogCategoryRequest request) {
        BlogCategory category = BlogCategory.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .color(request.getColor())
                .icon(request.getIcon())
                .orderIndex(request.getOrderIndex())
                .build();

        BlogCategory created = blogCategoryService.createCategory(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(BlogCategoryDto.fromEntity(created));
    }

    @GetMapping("/{categoryId}")
    @Operation(summary = "Get category by ID")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<BlogCategoryDto> getCategoryById(@PathVariable UUID categoryId) {
        BlogCategory category = blogCategoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(BlogCategoryDto.fromEntity(category));
    }

    @GetMapping
    @Operation(summary = "Get all categories")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Page<BlogCategoryDto>> getAllCategories(Pageable pageable) {
        Page<BlogCategory> categories = blogCategoryService.getAllCategories(pageable);
        return ResponseEntity.ok(categories.map(BlogCategoryDto::fromEntity));
    }

    @GetMapping("/ordered")
    @Operation(summary = "Get categories ordered")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<List<BlogCategoryDto>> getAllCategoriesOrdered() {
        List<BlogCategory> categories = blogCategoryService.getAllCategoriesOrdered();
        return ResponseEntity.ok(
            categories.stream()
                .map(BlogCategoryDto::fromEntity)
                .collect(Collectors.toList())
        );
    }

    @PutMapping("/{categoryId}")
    @Operation(summary = "Update blog category")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_UPDATE)
    public ResponseEntity<BlogCategoryDto> updateCategory(
            @PathVariable UUID categoryId,
            @RequestBody CreateBlogCategoryRequest request) {
        BlogCategory categoryData = BlogCategory.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .color(request.getColor())
                .icon(request.getIcon())
                .orderIndex(request.getOrderIndex())
                .build();

        BlogCategory updated = blogCategoryService.updateCategory(categoryId, categoryData);
        return ResponseEntity.ok(BlogCategoryDto.fromEntity(updated));
    }

    @DeleteMapping("/{categoryId}")
    @Operation(summary = "Delete blog category")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_DELETE)
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID categoryId) {
        blogCategoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}
