package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.application.analytics.dto.*;
import com.hrms.application.analytics.service.AnalyticsService;
import com.hrms.application.analytics.service.DashboardAnalyticsService;
import com.hrms.application.platform.service.HrmsPermissionInitializer;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final DashboardAnalyticsService dashboardAnalyticsService;
    private final AnalyticsService analyticsService;

    /**
     * Lightweight summary for the main dashboard KPI widget.
     * Returns 6 top-level numbers: totalEmployees, presentToday, onLeaveToday,
     * pendingApprovals, payrollProcessedThisMonth, openPositions.
     */
    @GetMapping("/summary")
    public ResponseEntity<com.hrms.application.analytics.dto.AnalyticsSummary> getAnalyticsSummary() {
        com.hrms.application.analytics.dto.AnalyticsSummary summary = analyticsService.getAnalyticsSummary();
        return ResponseEntity.ok(summary);
    }

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

    /**
     * Get comprehensive dashboard metrics (cached).
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/metrics")
    public ResponseEntity<DashboardMetrics> getDashboardMetrics() {
        DashboardMetrics metrics = analyticsService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get employee metrics for the current tenant.
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/employees")
    public ResponseEntity<EmployeeMetrics> getEmployeeMetrics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeMetrics metrics = analyticsService.getEmployeeMetrics(tenantId);
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get headcount trend over specified months.
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/headcount-trend")
    public ResponseEntity<List<HeadcountTrend>> getHeadcountTrend(
            @RequestParam(defaultValue = "12") int months) {
        List<HeadcountTrend> trend = analyticsService.getHeadcountTrend(months);
        return ResponseEntity.ok(trend);
    }

    /**
     * Get leave metrics for the current month.
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/leave")
    public ResponseEntity<LeaveMetrics> getLeaveMetrics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        java.time.LocalDate today = java.time.LocalDate.now();
        LeaveMetrics metrics = analyticsService.getLeaveMetrics(
                tenantId, today.withDayOfMonth(1), today.withDayOfMonth(today.lengthOfMonth()));
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get payroll metrics for the current month.
     */
    @RequiresPermission(HrmsPermissionInitializer.REPORT_VIEW)
    @GetMapping("/payroll")
    public ResponseEntity<PayrollMetrics> getPayrollMetrics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        java.time.LocalDate today = java.time.LocalDate.now();
        PayrollMetrics metrics = analyticsService.getPayrollMetrics(
                tenantId, today.getYear(), today.getMonthValue());
        return ResponseEntity.ok(metrics);
    }
}
