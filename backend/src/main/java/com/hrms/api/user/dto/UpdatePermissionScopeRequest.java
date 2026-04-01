package com.hrms.api.user.dto;

import com.hrms.domain.user.RoleScope;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Request DTO for updating the scope of a single permission on a role.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePermissionScopeRequest {

    @NotNull(message = "Scope is required")
    private RoleScope scope;

    /**
     * Custom targets for CUSTOM scope.
     * Required when scope is CUSTOM, ignored otherwise.
     */
    private Set<PermissionScopeRequest.CustomTargetRequest> customTargets;
}
