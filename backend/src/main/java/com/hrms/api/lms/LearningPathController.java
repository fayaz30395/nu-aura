package com.hrms.api.lms;

import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.lms.LearningPath;
import com.hrms.infrastructure.lms.repository.LearningPathRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for LMS Learning Paths.
 * Provides CRUD operations for learning paths (curated sequences of courses).
 */
@RestController
@RequestMapping("/api/v1/lms/learning-paths")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_LMS)
@Tag(name = "LMS Learning Paths", description = "Learning path management")
@Slf4j
public class LearningPathController {

    private final LearningPathRepository learningPathRepository;

    @GetMapping
    @Operation(summary = "List learning paths", description = "Paginated list of learning paths for the current tenant")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Page<Map<String, Object>>> getLearningPaths(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String difficulty) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        try {
            Page<LearningPath> paths;
            if (difficulty != null && !difficulty.isBlank()) {
                LearningPath.DifficultyLevel level = LearningPath.DifficultyLevel.valueOf(difficulty.toUpperCase());
                paths = learningPathRepository.findByTenantIdAndDifficultyLevelAndIsDeletedFalse(tenantId, level, pageable);
            } else {
                paths = learningPathRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);
            }

            Page<Map<String, Object>> response = paths.map(this::toDto);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid difficulty level: {}", difficulty);
            Page<LearningPath> paths = learningPathRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);
            return ResponseEntity.ok(paths.map(this::toDto));
        }
    }

    @GetMapping("/published")
    @Operation(summary = "List published learning paths")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<Map<String, Object>>> getPublishedLearningPaths() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<LearningPath> paths = learningPathRepository.findByTenantIdAndIsPublishedTrueAndIsDeletedFalse(tenantId);
        List<Map<String, Object>> response = paths.stream().map(this::toDto).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a learning path by ID")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Map<String, Object>> getLearningPath(@PathVariable UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return learningPathRepository.findByIdAndTenantIdAndIsDeletedFalse(id, tenantId)
                .map(path -> ResponseEntity.ok(toDto(path)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toDto(LearningPath path) {
        return Map.ofEntries(
                Map.entry("id", path.getId()),
                Map.entry("title", path.getTitle()),
                Map.entry("description", path.getDescription() != null ? path.getDescription() : ""),
                Map.entry("thumbnailUrl", path.getThumbnailUrl() != null ? path.getThumbnailUrl() : ""),
                Map.entry("difficultyLevel", path.getDifficultyLevel().name()),
                Map.entry("estimatedHours", path.getEstimatedHours() != null ? path.getEstimatedHours() : 0),
                Map.entry("isPublished", path.getIsPublished()),
                Map.entry("isMandatory", path.getIsMandatory()),
                Map.entry("totalCourses", path.getTotalCourses() != null ? path.getTotalCourses() : 0),
                Map.entry("createdAt", path.getCreatedAt() != null ? path.getCreatedAt().toString() : "")
        );
    }
}
