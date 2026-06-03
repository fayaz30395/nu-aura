package com.nulogic.api.user.controller;

import com.nulogic.api.user.dto.*;
import com.nulogic.application.user.service.ImplicitRoleEngine;
import com.nulogic.application.user.service.ImplicitRoleRuleService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.user.ImplicitRoleRule;
import com.nulogic.domain.user.ImplicitUserRole;
import com.nulogic.domain.user.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/implicit-role-rules")
@RequiredArgsConstructor
@Tag(name = "Implicit Role Rules", description = "Management of implicit role assignment rules based on org hierarchy")
@Validated
public class ImplicitRoleRuleController {

    private final ImplicitRoleRuleService implicitRoleRuleService;
    private final ImplicitRoleEngine implicitRoleEngine;

    // ===================== Read Operations =====================

    @Operation(summary = "List implicit role rules",
            description = "Retrieves all implicit role rules for the current tenant with optional filtering.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rules retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<Page<ImplicitRoleRuleResponse>> listRules(
            @Parameter(description = "Filter by active status", example = "true")
            @RequestParam(required = false) Boolean active,
            @Parameter(description = "Page number (0-indexed)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        UUID tenantId = SecurityContext.getCurrentTenantId();
        Pageable pageable = PageRequest.of(page, size);

        Page<ImplicitRoleRule> rules;
        if (active != null) {
            rules = implicitRoleRuleService.findRulesByTenantAndActive(tenantId, active, pageable);
        } else {
            rules = implicitRoleRuleService.findRulesByTenant(tenantId, pageable);
        }

        Page<ImplicitRoleRuleResponse> response = rules.map(this::mapToResponse);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get rule by ID",
            description = "Retrieves a specific implicit role rule.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rule retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @GetMapping("/{id}")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<ImplicitRoleRuleResponse> getRuleById(@PathVariable UUID id) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ImplicitRoleRule rule = implicitRoleRuleService.findRuleByIdAndTenant(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found"));
        return ResponseEntity.ok(mapToResponse(rule));
    }

    @Operation(summary = "Get affected users for a rule",
            description = "Retrieves the count and list of users affected by a specific rule.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Affected users retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @GetMapping("/{id}/affected-users")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<AffectedUsersResponse> getAffectedUsers(@PathVariable UUID id) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ImplicitRoleRule rule = implicitRoleRuleService.findRuleByIdAndTenant(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found"));

        List<ImplicitUserRole> affectedRoles = implicitRoleRuleService
                .findUserRolesByRuleAndTenant(id, tenantId);

        List<ImplicitUserRole> activeAffected = affectedRoles.stream()
                .filter(ImplicitUserRole::getIsActive)
                .collect(Collectors.toList());

        AffectedUsersResponse response = AffectedUsersResponse.builder()
                .ruleId(id)
                .ruleName(rule.getRuleName())
                .affectedUserCount((long) activeAffected.size())
                .affectedUsers(activeAffected.stream()
                        .map(this::mapUserRoleToResponse)
                        .collect(Collectors.toList()))
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get user's implicit roles",
            description = "Retrieves all implicit roles assigned to a specific user.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Implicit roles retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/user/{userId}/implicit-roles")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<List<ImplicitUserRoleResponse>> getUserImplicitRoles(@PathVariable UUID userId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<ImplicitUserRole> implicitRoles = implicitRoleRuleService
                .findActiveUserRolesByUserAndTenant(userId, tenantId);

        List<ImplicitUserRoleResponse> response = implicitRoles.stream()
                .map(this::mapUserRoleToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ===================== Write Operations =====================

    @Operation(summary = "Create implicit role rule",
            description = "Creates a new implicit role assignment rule.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Rule created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "404", description = "Target role not found")
    })
    @PostMapping
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<ImplicitRoleRuleResponse> createRule(@Valid @RequestBody ImplicitRoleRuleRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        // Verify target role exists
        implicitRoleRuleService.findRoleById(request.getTargetRoleId()).filter(r -> r.getTenantId() == null || r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Target role not found"));

        ImplicitRoleRule rule = new ImplicitRoleRule();
        rule.setTenantId(tenantId);
        rule.setRuleName(request.getRuleName());
        rule.setDescription(request.getDescription());
        rule.setConditionType(request.getConditionType());
        rule.setTargetRoleId(request.getTargetRoleId());
        rule.setScope(request.getScope());
        rule.setPriority(request.getPriority());
        rule.setIsActive(true);

        ImplicitRoleRule saved = implicitRoleRuleService.saveRule(rule);
        log.info("Created implicit role rule: {} for tenant: {}", saved.getId(), tenantId);

        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @Operation(summary = "Update implicit role rule",
            description = "Updates an existing implicit role assignment rule.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rule updated successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PutMapping("/{id}")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<ImplicitRoleRuleResponse> updateRule(
            @PathVariable UUID id,
            @Valid @RequestBody ImplicitRoleRuleRequest request) {

        UUID tenantId = SecurityContext.getCurrentTenantId();
        ImplicitRoleRule rule = implicitRoleRuleService.findRuleByIdAndTenant(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found"));

        // Verify target role exists
        implicitRoleRuleService.findRoleById(request.getTargetRoleId()).filter(r -> r.getTenantId() == null || r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Target role not found"));

        rule.setRuleName(request.getRuleName());
        rule.setDescription(request.getDescription());
        rule.setConditionType(request.getConditionType());
        rule.setTargetRoleId(request.getTargetRoleId());
        rule.setScope(request.getScope());
        rule.setPriority(request.getPriority());

        ImplicitRoleRule updated = implicitRoleRuleService.saveRule(rule);
        log.info("Updated implicit role rule: {} for tenant: {}", updated.getId(), tenantId);

        return ResponseEntity.ok(mapToResponse(updated));
    }

    @Operation(summary = "Delete implicit role rule",
            description = "Deletes an implicit role assignment rule (soft delete).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Rule deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ImplicitRoleRule rule = implicitRoleRuleService.findRuleByIdAndTenant(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found"));

        rule.setIsActive(false);
        implicitRoleRuleService.saveRule(rule);
        log.info("Deleted implicit role rule: {} for tenant: {}", id, tenantId);

        return ResponseEntity.noContent().build();
    }

    // ===================== Bulk Operations =====================

    @Operation(summary = "Trigger full recomputation",
            description = "Triggers recomputation of all implicit roles for the current tenant. This is async and may take time for large organizations.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Recomputation triggered successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/recompute-all")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<RecomputeResponse> recomputeAll() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        log.info("Triggering full recomputation of implicit roles for tenant: {}", tenantId);

        implicitRoleEngine.recomputeAll(tenantId);

        RecomputeResponse response = RecomputeResponse.builder()
                .status("ACCEPTED")
                .message("Recomputation of implicit roles triggered for tenant")
                .tenantId(tenantId)
                .build();

        return ResponseEntity.accepted().body(response);
    }

    @Operation(summary = "Bulk activate rules",
            description = "Activates multiple implicit role rules at once.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rules activated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/bulk-activate")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<BulkOperationResponse> bulkActivate(@Valid @RequestBody BulkRuleIdsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        List<ImplicitRoleRule> rules = implicitRoleRuleService.findRulesByIdsAndTenant(request.getRuleIds(), tenantId);
        List<ImplicitRoleRule> rulesToActivate = rules.stream()
                .filter(rule -> !rule.getIsActive())
                .collect(Collectors.toList());

        rulesToActivate.forEach(rule -> {
            rule.setIsActive(true);
            implicitRoleRuleService.saveRule(rule);
        });

        int activatedCount = rulesToActivate.size();

        log.info("Bulk activated {} implicit role rules for tenant: {}", activatedCount, tenantId);

        BulkOperationResponse response = BulkOperationResponse.builder()
                .operationType("ACTIVATE")
                .totalRequested(request.getRuleIds().size())
                .totalProcessed(activatedCount)
                .build();

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Bulk deactivate rules",
            description = "Deactivates multiple implicit role rules at once.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rules deactivated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/bulk-deactivate")
    @RequiresPermission(Permission.ROLE_MANAGE)
    public ResponseEntity<BulkOperationResponse> bulkDeactivate(@Valid @RequestBody BulkRuleIdsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        List<ImplicitRoleRule> rules = implicitRoleRuleService.findRulesByIdsAndTenant(request.getRuleIds(), tenantId);
        List<ImplicitRoleRule> rulesToDeactivate = rules.stream()
                .filter(ImplicitRoleRule::getIsActive)
                .collect(Collectors.toList());

        rulesToDeactivate.forEach(rule -> {
            rule.setIsActive(false);
            implicitRoleRuleService.saveRule(rule);
        });

        int deactivatedCount = rulesToDeactivate.size();

        log.info("Bulk deactivated {} implicit role rules for tenant: {}", deactivatedCount, tenantId);

        BulkOperationResponse response = BulkOperationResponse.builder()
                .operationType("DEACTIVATE")
                .totalRequested(request.getRuleIds().size())
                .totalProcessed(deactivatedCount)
                .build();

        return ResponseEntity.ok(response);
    }

    // ===================== Helpers =====================

    private ImplicitRoleRuleResponse mapToResponse(ImplicitRoleRule rule) {
        Role targetRole = implicitRoleRuleService.findRoleById(rule.getTargetRoleId())
                .orElse(null);

        long affectedUserCount = implicitRoleRuleService
                .countAffectedUsers(rule.getId(), rule.getTenantId());

        return ImplicitRoleRuleResponse.builder()
                .id(rule.getId())
                .ruleName(rule.getRuleName())
                .description(rule.getDescription())
                .conditionType(rule.getConditionType())
                .targetRoleId(rule.getTargetRoleId())
                .targetRoleName(targetRole != null ? targetRole.getName() : null)
                .scope(rule.getScope())
                .priority(rule.getPriority())
                .isActive(rule.getIsActive())
                .affectedUserCount(affectedUserCount)
                .createdAt(rule.getCreatedAt() != null ? rule.getCreatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
                .updatedAt(rule.getUpdatedAt() != null ? rule.getUpdatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
                .build();
    }

    private ImplicitUserRoleResponse mapUserRoleToResponse(ImplicitUserRole implicitRole) {
        Role role = implicitRoleRuleService.findRoleById(implicitRole.getRoleId())
                .orElse(null);

        return ImplicitUserRoleResponse.builder()
                .id(implicitRole.getId())
                .userId(implicitRole.getUserId())
                .userName(implicitRole.getUserId().toString()) // Could be enhanced with user lookup
                .roleId(implicitRole.getRoleId())
                .roleName(role != null ? role.getName() : null)
                .scope(implicitRole.getScope())
                .derivedFromContext(implicitRole.getDerivedFromContext())
                .computedAt(implicitRole.getComputedAt() != null ? implicitRole.getComputedAt().toInstant(java.time.ZoneOffset.UTC) : null)
                .isActive(implicitRole.getIsActive())
                .build();
    }
}
