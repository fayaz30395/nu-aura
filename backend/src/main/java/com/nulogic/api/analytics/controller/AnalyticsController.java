package com.nulogic.api.analytics.controller;

import com.nulogic.api.analytics.dto.DashboardAnalyticsResponse;
import com.nulogic.api.analytics.dto.DashboardContext;
import com.nulogic.application.analytics.dto.*;
import com.nulogic.application.analytics.service.AnalyticsService;
import com.nulogic.application.analytics.service.DashboardAnalyticsService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Dashboard and analytics APIs for HRMS metrics")
public class AnalyticsController {

    private final DashboardAnalyticsService dashboardAnalyticsService;
    private final AnalyticsService analyticsService;
    private final TenantTimeService tenantTimeService;

    /**
     * Lightweight summary for the main dashboard KPI widget.
     * Returns 6 top-level numbers: totalEmployees, presentToday, onLeaveToday,
     * pendingApprovals, payrollProcessedThisMonth, openPositions.
     */
    @GetMapping("/summary")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get analytics summary", description = "Returns the dashboard KPI summary: total employees, present today, on leave, pending approvals, payroll status, open positions")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Summary retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<com.nulogic.application.analytics.dto.AnalyticsSummary> getAnalyticsSummary() {
        com.nulogic.application.analytics.dto.AnalyticsSummary summary = analyticsService.getAnalyticsSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get role-based dashboard analytics.
     * - Admin/HR: Full organization view
     * - Manager: Team/reportees view
     * - Employee: Personal view only
     */
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/dashboard")
    @Operation(summary = "Get role-based dashboard analytics", description = "Returns analytics scoped to the caller's role: Admin/HR see org-wide, Manager sees team, Employee sees personal")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dashboard analytics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
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
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/metrics")
    @Operation(summary = "Get dashboard metrics", description = "Returns comprehensive cached dashboard metrics across the tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Metrics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<DashboardMetrics> getDashboardMetrics() {
        DashboardMetrics metrics = analyticsService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get employee metrics for the current tenant.
     */
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/employees")
    @Operation(summary = "Get employee metrics", description = "Returns employee-related metrics for the current tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Employee metrics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<EmployeeMetrics> getEmployeeMetrics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeMetrics metrics = analyticsService.getEmployeeMetrics(tenantId);
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get headcount trend over specified months.
     */
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/headcount-trend")
    @Operation(summary = "Get headcount trend", description = "Returns the headcount trend over the specified number of months")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Trend retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<List<HeadcountTrend>> getHeadcountTrend(
            @Parameter(description = "Number of months to include (defaults to 12)") @RequestParam(defaultValue = "12") int months) {
        List<HeadcountTrend> trend = analyticsService.getHeadcountTrend(months);
        return ResponseEntity.ok(trend);
    }

    /**
     * Get leave metrics for the current month.
     */
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/leave")
    @Operation(summary = "Get leave metrics", description = "Returns leave metrics for the current calendar month")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Leave metrics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<LeaveMetrics> getLeaveMetrics() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        java.time.LocalDate today = tenantTimeService.today(tenantId);
        LeaveMetrics metrics = analyticsService.getLeaveMetrics(
                tenantId, today.withDayOfMonth(1), today.withDayOfMonth(today.lengthOfMonth()));
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get payroll metrics for the current month.
     */
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @GetMapping("/payroll")
    @Operation(summary = "Get payroll metrics", description = "Returns payroll metrics for the current calendar month")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payroll metrics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ANALYTICS:VIEW permission")
    })
    public ResponseEntity<PayrollMetrics> getPayrollMetrics() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        java.time.LocalDate today = tenantTimeService.today(tenantId);
        PayrollMetrics metrics = analyticsService.getPayrollMetrics(
                tenantId, today.getYear(), today.getMonthValue());
        return ResponseEntity.ok(metrics);
    }
}
