package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.FluenceActivityDto;
import com.hrms.application.knowledge.service.FluenceActivityService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.knowledge.FluenceActivity;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fluence/activities")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fluence Activities", description = "Activity feed for NU-Fluence content")
public class FluenceActivityController {

    private final FluenceActivityService fluenceActivityService;
    private final EmployeeRepository employeeRepository;

    // Cache actor names within a single request to avoid repeated DB lookups
    private String resolveActorName(UUID actorId, UUID tenantId, Map<UUID, String> nameCache) {
        return nameCache.computeIfAbsent(actorId, id -> {
            Employee actor = employeeRepository.findByUserIdWithUser(id, tenantId).orElse(null);
            if (actor != null) {
                return actor.getFirstName() +
                        (actor.getLastName() != null ? " " + actor.getLastName() : "");
            }
            return null;
        });
    }

    @GetMapping
    @Operation(summary = "Get activity feed", description = "Paginated activity feed with optional content type filter")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FluenceActivityDto>> getActivityFeed(
            @RequestParam(required = false) String contentType,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<UUID, String> nameCache = new HashMap<>();

        Page<FluenceActivity> activities;
        if (contentType != null && !contentType.isBlank()) {
            activities = fluenceActivityService.getActivityFeedByType(tenantId, contentType, pageable);
        } else {
            activities = fluenceActivityService.getActivityFeed(tenantId, pageable);
        }

        Page<FluenceActivityDto> dtos = activities.map(activity ->
                FluenceActivityDto.fromEntity(activity,
                        resolveActorName(activity.getActorId(), tenantId, nameCache)));

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user's activity")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FluenceActivityDto>> getMyActivity(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        Map<UUID, String> nameCache = new HashMap<>();

        Page<FluenceActivity> activities = fluenceActivityService.getUserActivity(tenantId, userId, pageable);

        Page<FluenceActivityDto> dtos = activities.map(activity ->
                FluenceActivityDto.fromEntity(activity,
                        resolveActorName(activity.getActorId(), tenantId, nameCache)));

        return ResponseEntity.ok(dtos);
    }
}
