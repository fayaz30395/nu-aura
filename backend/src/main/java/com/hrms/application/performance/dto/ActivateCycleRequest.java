package com.hrms.application.performance.dto;

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
public class ActivateCycleRequest {

    /**
     * Scope type for activation: ALL, DEPARTMENT, LOCATION
     */
    private ScopeType scopeType;

    /**
     * Department IDs when scopeType is DEPARTMENT
     */
    private Set<UUID> departmentIds;

    /**
     * Location IDs when scopeType is LOCATION
     */
    private Set<UUID> locationIds;

    /**
     * Whether to create self-review templates for all in-scope employees
     */
    @Builder.Default
    private Boolean createSelfReviews = true;

    /**
     * Whether to create manager-review templates for all in-scope employees
     */
    @Builder.Default
    private Boolean createManagerReviews = true;

    public enum ScopeType {
        ALL,           // Entire organization (tenant-wide)
        DEPARTMENT,    // Specific departments
        LOCATION       // Specific locations
    }
}
