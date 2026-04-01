package com.hrms.api.user.dto;

import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

/**
 * Request DTO for assigning a permission with a specific scope.
 * Used when creating or updating role permissions with Keka-style RBAC.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionScopeRequest {

    @NotBlank(message = "Permission code is required")
    private String permissionCode;

    @NotNull(message = "Scope is required")
    private RoleScope scope;

    /**
     * Custom targets for CUSTOM scope.
     * Required when scope is CUSTOM, ignored otherwise.
     */
    private Set<CustomTargetRequest> customTargets;

    /**
     * Represents a single custom target (employee, department, or location).
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomTargetRequest {
        @NotNull(message = "Target type is required")
        private TargetType targetType;

        @NotNull(message = "Target ID is required")
        private UUID targetId;
    }
}
