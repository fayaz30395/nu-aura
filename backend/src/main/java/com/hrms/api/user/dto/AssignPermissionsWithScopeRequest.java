package com.hrms.api.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for assigning multiple permissions with their scopes to a role.
 * Supports the new Keka-style RBAC model where each permission has an associated scope.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignPermissionsWithScopeRequest {

    @NotEmpty(message = "At least one permission is required")
    @Valid
    private List<PermissionScopeRequest> permissions;

    /**
     * If true, replaces all existing permissions with the provided list.
     * If false (default), adds/updates the provided permissions without removing existing ones.
     */
    @Builder.Default
    private boolean replaceAll = false;
}
