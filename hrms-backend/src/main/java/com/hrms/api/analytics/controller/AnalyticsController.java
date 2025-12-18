package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.application.analytics.service.DashboardAnalyticsService;
import com.hrms.application.platform.service.HrmsPermissionInitializer;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final DashboardAnalyticsService dashboardAnalyticsService;

    /**
     * Get role-based dashboard analytics.
     * - Admin/HR: Full organization view
     * - Manager: Team/reportees view
     * - Employee: Personal view only
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardAnalyticsResponse> getDashboardAnalytics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        // Determine role-based view type
        boolean isAdmin = SecurityContext.isHRManager() || SecurityContext.isTenantAdmin() || SecurityContext.isSuperAdmin();
        boolean isManager = SecurityContext.isManager();

        // Build context based on user's role
        DashboardContext context = dashboardAnalyticsService.buildContext(
            tenantId, userId, employeeId, isAdmin, isManager);

        DashboardAnalyticsResponse analytics = dashboardAnalyticsService.getDashboardAnalytics(context);
        return ResponseEntity.ok(analytics);
    }
}
