package com.hrms.api.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Context for role-based dashboard analytics.
 * Determines what data the user can see based on their role.
 */
@Data
@Builder
public class DashboardContext {

    /**
     * The dashboard view type based on user's role
     */
    public enum ViewType {
        ADMIN,      // Full organization view (HR Admin, Super Admin)
        MANAGER,    // Team/reportees view (Department Manager, Team Lead)
        EMPLOYEE    // Personal view only (Regular employees)
    }

    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;
    private ViewType viewType;

    /**
     * For ADMIN: null (all employees)
     * For MANAGER: list of reportee employee IDs
     * For EMPLOYEE: just their own ID
     */
    private java.util.List<UUID> targetEmployeeIds;

    public boolean isAdmin() {
        return viewType == ViewType.ADMIN;
    }

    public boolean isManager() {
        return viewType == ViewType.MANAGER;
    }

    public boolean isEmployee() {
        return viewType == ViewType.EMPLOYEE;
    }
}
