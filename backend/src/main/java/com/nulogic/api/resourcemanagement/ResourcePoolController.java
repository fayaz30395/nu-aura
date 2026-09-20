package com.nulogic.api.resourcemanagement;

import com.nulogic.application.resourcemanagement.service.ResourcePoolService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Resource Pool Management endpoints.
 *
 * <p>UC-RESOURCE-006 — Resource Pool Management.
 * Fixes BUG-QA2-011: GET/POST /api/v1/resource-pools were returning 404.
 *
 * <p>Backed by {@link ResourcePoolService} and the {@code resource_pools} /
 * {@code resource_pool_members} tables (V317). Still gated behind
 * {@code app.features.resource-pools} (default false) — see field {@link #enabled}.
 */
@RestController
@RequestMapping("/api/v1/resource-pools")
@RequiredArgsConstructor
@Validated
@Tag(name = "Resource Pools", description = "Resource pool management — UC-RESOURCE-006")
public class ResourcePoolController {

    private final ResourcePoolService resourcePoolService;

    /**
     * QA sweep S2-C K-3 (production-blocker): until a real {@code resource_pools} table
     * and a backing service exist, every endpoint returns a stubbed empty payload, which
     * lets users believe their pool was created when it actually was not persisted. We
     * now gate the entire controller on {@code app.features.resource-pools} and return
     * {@code 501 Not Implemented} for every method when the flag is off. We do this with
     * a runtime {@code @Value} check rather than {@code @ConditionalOnProperty} so the
     * endpoints respond with a clear 501 instead of 404 (consistent with the rest of
     * this sweep).
     */
    @Value("${app.features.resource-pools:false}")
    private boolean enabled;

    // -----------------------------------------------------------------------
    // DTOs (static inner classes — no separate DTO file needed at stub stage)
    // -----------------------------------------------------------------------

    /**
     * GET /api/v1/resource-pools
     * List all resource pools for the current tenant.
     */
    @GetMapping
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "List all resource pools")
    public ResponseEntity<List<ResourcePoolSummary>> listPools(
            @RequestParam(required = false) String poolType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<ResourcePoolSummary> pools = resourcePoolService.listPools(poolType, pageable);
        return ResponseEntity.ok(pools.getContent());
    }

    /**
     * POST /api/v1/resource-pools
     * Create a new resource pool.
     */
    @PostMapping
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Create a resource pool")
    public ResponseEntity<CreatePoolResponse> createPool(
            @Valid @RequestBody CreatePoolRequest request) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        CreatePoolResponse response = resourcePoolService.createPool(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/resource-pools/{id}
     * Get a specific resource pool by ID.
     */
    @GetMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get a resource pool by ID")
    public ResponseEntity<ResourcePoolSummary> getPool(@PathVariable UUID id) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        return ResponseEntity.ok(resourcePoolService.getPool(id));
    }

    /**
     * GET /api/v1/resource-pools/{id}/members
     * Get current members of a resource pool.
     * Verification endpoint from UC-RESOURCE-006 QA spec.
     */
    @GetMapping("/{id}/members")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get members of a resource pool")
    public ResponseEntity<List<ResourcePoolMember>> getPoolMembers(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(resourcePoolService.getPoolMembers(id, pageable).getContent());
    }

    // -----------------------------------------------------------------------
    // Endpoints
    // -----------------------------------------------------------------------

    /**
     * POST /api/v1/resource-pools/{id}/members
     * Add employees to a resource pool.
     */
    @PostMapping("/{id}/members")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Add members to a resource pool")
    public ResponseEntity<Map<String, Object>> addMembers(
            @PathVariable UUID id,
            @Valid @RequestBody @Size(min = 1, max = 500, message = "Provide 1-500 employee IDs") List<UUID> employeeIds) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        int addedCount = resourcePoolService.addMembers(id, employeeIds);
        return ResponseEntity.ok(Map.of(
                "poolId", id,
                "addedCount", addedCount,
                "message", "Members added to pool."
        ));
    }

    /**
     * DELETE /api/v1/resource-pools/{id}/members/{employeeId}
     * Remove an employee from a resource pool.
     */
    @DeleteMapping("/{id}/members/{employeeId}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Remove a member from a resource pool")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID id,
            @PathVariable UUID employeeId) {
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        resourcePoolService.removeMember(id, employeeId);
        return ResponseEntity.noContent().build();
    }

    @Data
    @NoArgsConstructor
    public static class ResourcePoolSummary {
        private UUID id;
        private String name;
        private String description;
        private String poolType;        // SHARED | EXCLUSIVE
        private int memberCount;
        private boolean isActive;
        private String createdAt;
    }

    @Data
    @NoArgsConstructor
    public static class ResourcePoolMember {
        private UUID employeeId;
        private String employeeName;
        private String designation;
        private int currentAllocationPercent;
        private int availablePercent;
        private String joinedPoolAt;
    }

    @Data
    @NoArgsConstructor
    public static class CreatePoolRequest {
        @NotBlank
        private String name;
        private String description;
        private String poolType = "SHARED";
        private List<UUID> memberEmployeeIds;
    }

    @Data
    @NoArgsConstructor
    public static class CreatePoolResponse {
        private UUID id;
        private String name;
        private String description;
        private String poolType;
        private int memberCount;
        private boolean isActive;
        private String createdAt;
        private String message;
    }
}
