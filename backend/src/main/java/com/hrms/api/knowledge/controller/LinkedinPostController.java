package com.hrms.api.knowledge.controller;

import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Stub controller for LinkedIn posts.
 * Returns empty results until the LinkedIn integration feature is fully implemented.
 * Prevents 500 errors from frontend routes that call these endpoints.
 */
@RestController
@RequestMapping("/api/v1/linkedin-posts")
@Slf4j
@Tag(name = "LinkedIn Posts", description = "LinkedIn post management (stub)")
public class LinkedinPostController {

    @GetMapping("/active")
    @Operation(summary = "Get active LinkedIn posts")
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<List<Map<String, Object>>> getActiveLinkedinPosts() {
        log.debug("GET /api/v1/linkedin-posts/active - returning empty list (stub)");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @GetMapping
    @Operation(summary = "Get all LinkedIn posts (paginated)")
    @RequiresPermission(Permission.KNOWLEDGE_BLOG_READ)
    public ResponseEntity<Page<Map<String, Object>>> getAllLinkedinPosts(Pageable pageable) {
        log.debug("GET /api/v1/linkedin-posts - returning empty page (stub)");
        return ResponseEntity.ok(new PageImpl<>(Collections.emptyList(), pageable, 0));
    }
}
