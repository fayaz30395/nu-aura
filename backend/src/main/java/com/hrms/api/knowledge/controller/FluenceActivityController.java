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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/fluence/activities")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fluence Activities", description = "Activity feed for NU-Fluence content")
public class FluenceActivityController {

    private final FluenceActivityService fluenceActivityService;
    private final EmployeeRepository employeeRepository;

    /**
     * Batch-resolve actor names for a page of activities in a single query
     * instead of N individual findByUserIdWithUser calls.
     */
    private Map<UUID, String> batchResolveActorNames(Page<FluenceActivity> activities, UUID tenantId) {
        Set<UUID> actorIds = activities.getContent().stream()
                .map(FluenceActivity::getActorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (actorIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> nameMap = new HashMap<>();
        try {
            // Use findAllById for batch lookup — single query instead of N queries
            List<Employee> employees = employeeRepository.findAllById(actorIds);
            for (Employee emp : employees) {
                String name = emp.getFirstName() +
                        (emp.getLastName() != null ? " " + emp.getLastName() : "");
                // Map by employee ID (actorId in activities may be userId or employeeId)
                nameMap.put(emp.getId(), name);
                // Also map by userId if available, since actorId might be a userId
                if (emp.getUser() != null && emp.getUser().getId() != null) {
                    nameMap.put(emp.getUser().getId(), name);
                }
            }

            // For any actorIds still unresolved, try findByUserIdWithUser (they might be user IDs)
            Set<UUID> unresolved = actorIds.stream()
                    .filter(id -> !nameMap.containsKey(id))
                    .collect(Collectors.toSet());
            for (UUID userId : unresolved) {
                try {
                    employeeRepository.findByUserIdWithUser(userId, tenantId).ifPresent(emp -> {
                        String name = emp.getFirstName() +
                                (emp.getLastName() != null ? " " + emp.getLastName() : "");
                        nameMap.put(userId, name);
                    });
                } catch (Exception e) { // Intentional broad catch — controller error boundary
                    log.debug("Could not resolve actor name for userId {}: {}", userId, e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.warn("Failed to batch-resolve actor names: {}", e.getMessage());
        }
        return nameMap;
    }

    @GetMapping
    @Operation(summary = "Get activity feed", description = "Paginated activity feed with optional content type filter")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FluenceActivityDto>> getActivityFeed(
            @RequestParam(required = false) String contentType,
            Pageable pageable) {
        try {
            UUID tenantId = TenantContext.getCurrentTenant();

            Page<FluenceActivity> activities;
            if (contentType != null && !contentType.isBlank()) {
                activities = fluenceActivityService.getActivityFeedByType(tenantId, contentType, pageable);
            } else {
                activities = fluenceActivityService.getActivityFeed(tenantId, pageable);
            }

            Map<UUID, String> nameMap = batchResolveActorNames(activities, tenantId);

            Page<FluenceActivityDto> dtos = activities.map(activity ->
                    FluenceActivityDto.fromEntity(activity, nameMap.get(activity.getActorId())));

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.warn("Failed to load activity feed: {}", e.getMessage());
            return ResponseEntity.ok(Page.empty(pageable));
        }
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user's activity")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<FluenceActivityDto>> getMyActivity(Pageable pageable) {
        try {
            UUID tenantId = TenantContext.getCurrentTenant();
            UUID userId = SecurityContext.getCurrentUserId();

            Page<FluenceActivity> activities = fluenceActivityService.getUserActivity(tenantId, userId, pageable);

            Map<UUID, String> nameMap = batchResolveActorNames(activities, tenantId);

            Page<FluenceActivityDto> dtos = activities.map(activity ->
                    FluenceActivityDto.fromEntity(activity, nameMap.get(activity.getActorId())));

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.warn("Failed to load user activity: {}", e.getMessage());
            return ResponseEntity.ok(Page.empty(pageable));
        }
    }
}
