package com.hrms.api.common.controller;

import com.hrms.application.common.service.ContentViewService;
import com.hrms.application.common.service.ContentViewService.ViewerInfo;
import com.hrms.application.common.service.ContentViewService.ViewStats;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.common.ContentView.ContentType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.hrms.common.security.Permission.EMPLOYEE_VIEW_SELF;
import jakarta.validation.Valid;

/**
 * REST controller for content view tracking.
 * Provides endpoints to record views and query view statistics.
 */
@RestController
@RequestMapping("/api/v1/views")
public class ContentViewController {

    private final ContentViewService contentViewService;

    public ContentViewController(ContentViewService contentViewService) {
        this.contentViewService = contentViewService;
    }

    /**
     * Record a view for content
     */
    @PostMapping("/{contentType}/{contentId}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> recordView(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestParam UUID employeeId,
            @RequestParam(required = false) String source) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        contentViewService.recordView(type, contentId, employeeId, source);
        return ResponseEntity.ok().build();
    }

    /**
     * Check if employee has viewed content
     */
    @GetMapping("/{contentType}/{contentId}/has-viewed")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Map<String, Boolean>> hasViewed(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestParam UUID employeeId) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        boolean viewed = contentViewService.hasViewed(type, contentId, employeeId);
        return ResponseEntity.ok(Map.of("hasViewed", viewed));
    }

    /**
     * Get view count for content
     */
    @GetMapping("/{contentType}/{contentId}/count")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Map<String, Long>> getViewCount(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        long count = contentViewService.getViewCount(type, contentId);
        return ResponseEntity.ok(Map.of("viewCount", count));
    }

    /**
     * Get view statistics (unique viewers + total views)
     */
    @GetMapping("/{contentType}/{contentId}/stats")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<ViewStats> getViewStats(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        ViewStats stats = contentViewService.getViewStats(type, contentId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get all viewers for content
     */
    @GetMapping("/{contentType}/{contentId}/viewers")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<ViewerInfo>> getViewers(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        List<ViewerInfo> viewers = contentViewService.getViewers(type, contentId);
        return ResponseEntity.ok(viewers);
    }

    /**
     * Get recent viewers (top N)
     */
    @GetMapping("/{contentType}/{contentId}/recent-viewers")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<ViewerInfo>> getRecentViewers(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestParam(defaultValue = "10") int limit) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        List<ViewerInfo> viewers = contentViewService.getRecentViewers(type, contentId, limit);
        return ResponseEntity.ok(viewers);
    }

    /**
     * Batch get view counts for multiple content items
     */
    @PostMapping("/{contentType}/batch-counts")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Map<UUID, Long>> getBatchViewCounts(
            @PathVariable String contentType,
            @Valid @RequestBody List<UUID> contentIds) {

        ContentType type = ContentType.valueOf(contentType.toUpperCase());
        Map<UUID, Long> counts = contentViewService.getViewCounts(type, contentIds);
        return ResponseEntity.ok(counts);
    }
}
