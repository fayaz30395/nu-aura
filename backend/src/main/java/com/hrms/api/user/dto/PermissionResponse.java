package com.hrms.api.user.dto;

import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionResponse {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private String resource;
    private String action;

    /**
     * The scope for this permission assignment (when returned in context of a role).
     * May be null for global permission listings.
     */
    private RoleScope scope;

    /**
     * Custom targets for CUSTOM scope.
     * Only populated when scope is CUSTOM.
     */
    private Set<CustomTargetResponse> customTargets;

    /**
     * Response DTO for custom scope target.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomTargetResponse {
        private UUID id;
        private TargetType targetType;
        private UUID targetId;
        private String targetName; // Resolved name (employee name, department name, etc.)
    }

    /**
     * Constructor for backward compatibility (without scope).
     */
    public PermissionResponse(UUID id, String code, String name, String description, String resource, String action) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.resource = resource;
        this.action = action;
    }
}
