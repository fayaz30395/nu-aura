package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.*;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Unified Dashboard Controller providing role-based analytics dashboards
 *
 * Dashboard Types:
 * 1. Executive Dashboard - C-suite KPIs, financial metrics, strategic insights
 * 2. HR Operations Dashboard - Day-to-day HR metrics
 * 3. Manager Dashboard - Team-specific insights
 * 4. Employee Dashboard - Personal analytics
 * 5. Predictive Dashboard - AI-powered forecasts (handled by PredictiveAnalyticsController)
 */
@RestController
@RequestMapping("/api/v1/dashboards")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboards", description = "Role-based analytics dashboards")
public class DashboardsController {

    private final ExecutiveDashboardService executiveDashboardService;
    private final DashboardAnalyticsService hrOperationsDashboardService;
    private final ManagerDashboardService managerDashboardService;
    private final EmployeeDashboardService employeeDashboardService;

    // ==================== EXECUTIVE DASHBOARD ====================

    /**
     * Get Executive Dashboard
     * For C-suite executives, provides high-level KPIs, financial metrics, and strategic insights
     */
    @GetMapping("/executive")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get executive dashboard",
               description = "Returns C-suite level analytics with KPIs, financial summary, workforce overview, and strategic alerts")
    public ResponseEntity<ExecutiveDashboardResponse> getExecutiveDashboard() {
        log.info("Fetching executive dashboard");
        ExecutiveDashboardResponse dashboard = executiveDashboardService.getExecutiveDashboard();
        return ResponseEntity.ok(dashboard);
    }

    // ==================== HR OPERATIONS DASHBOARD ====================

    /**
     * Get HR Operations Dashboard
     * For HR teams, provides day-to-day metrics and operational insights
     */
    @GetMapping("/hr-operations")
    @RequiresPermission(Permission.DASHBOARD_VIEW)
    @Operation(summary = "Get HR operations dashboard",
               description = "Returns day-to-day HR metrics including attendance, leave, payroll, and headcount")
    public ResponseEntity<DashboardAnalyticsResponse> getHROperationsDashboard() {
        log.info("Fetching HR operations dashboard");

        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        boolean isAdmin = SecurityContext.isHRManager() || SecurityContext.isTenantAdmin() || SecurityContext.isSuperAdmin();
        boolean isManager = SecurityContext.isManager();

        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                employeeId,
                isAdmin,
                isManager
        );

        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard);
    }

    // ==================== MANAGER DASHBOARD ====================

    /**
     * Get Manager Dashboard for current user
     * For managers, provides team-specific insights about their direct and indirect reports
     */
    @GetMapping("/manager")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_TEAM)
    @Operation(summary = "Get manager dashboard",
               description = "Returns team-specific insights including attendance, leave, performance, and action items")
    public ResponseEntity<ManagerDashboardResponse> getManagerDashboard() {
        log.info("Fetching manager dashboard for current user");
        ManagerDashboardResponse dashboard = managerDashboardService.getManagerDashboard();
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get Manager Dashboard for a specific manager
     * Admin-only endpoint to view any manager's team dashboard
     */
    @GetMapping("/manager/{managerId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get manager dashboard for specific manager",
               description = "Admin-only: Returns team dashboard for a specific manager")
    public ResponseEntity<ManagerDashboardResponse> getManagerDashboardById(@PathVariable UUID managerId) {
        log.info("Fetching manager dashboard for manager: {}", managerId);
        ManagerDashboardResponse dashboard = managerDashboardService.getManagerDashboard(managerId);
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get team project allocations for the current manager
     * Shows each direct report with their active project assignments and allocation percentages
     */
    @GetMapping("/manager/team-projects")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_TEAM)
    @Operation(summary = "Get team project allocations",
               description = "Returns each direct report with their active project assignments, allocation percentages, and summary stats")
    public ResponseEntity<TeamProjectsResponse> getTeamProjects() {
        log.info("Fetching team project allocations for current manager");
        TeamProjectsResponse response = managerDashboardService.getTeamProjects();
        return ResponseEntity.ok(response);
    }

    // ==================== EMPLOYEE DASHBOARD ====================

    /**
     * Get Employee Dashboard for current user (self-service)
     * For employees, provides personal analytics and self-service insights
     */
    @GetMapping("/employee")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_SELF, Permission.SYSTEM_ADMIN})
    @Operation(summary = "Get employee dashboard",
               description = "Returns personal analytics including attendance, leave, payroll, performance, and career progress")
    public ResponseEntity<EmployeeDashboardResponse> getEmployeeDashboard() {
        log.info("Fetching employee dashboard for current user");
        EmployeeDashboardResponse dashboard = employeeDashboardService.getEmployeeDashboard();
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get Employee Dashboard for a specific employee
     * For managers/HR to view their reportee's dashboard
     */
    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_TEAM)
    @Operation(summary = "Get employee dashboard for specific employee",
               description = "Returns employee dashboard for a specific employee (requires manager or HR access)")
    public ResponseEntity<EmployeeDashboardResponse> getEmployeeDashboardById(@PathVariable UUID employeeId) {
        log.info("Fetching employee dashboard for employee: {}", employeeId);
        EmployeeDashboardResponse dashboard = employeeDashboardService.getEmployeeDashboard(employeeId);
        return ResponseEntity.ok(dashboard);
    }

    // ==================== MY DASHBOARD (SMART ROUTING) ====================

    /**
     * Get My Dashboard - Smart routing based on user role
     * Automatically routes to the appropriate dashboard based on user's role
     */
    @GetMapping("/my")
    @RequiresPermission(Permission.DASHBOARD_VIEW)
    @Operation(summary = "Get my dashboard",
               description = "Smart routing: Returns appropriate dashboard based on user's role (Executive, Manager, or Employee)")
    public ResponseEntity<?> getMyDashboard() {
        log.info("Fetching appropriate dashboard for current user");

        // Check roles and return appropriate dashboard
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) {
            // Executives get executive dashboard
            return ResponseEntity.ok(executiveDashboardService.getExecutiveDashboard());
        } else if (SecurityContext.isHRManager()) {
            // HR gets operations dashboard
            DashboardContext context = hrOperationsDashboardService.buildContext(
                    com.hrms.common.security.TenantContext.getCurrentTenant(),
                    SecurityContext.getCurrentUserId(),
                    SecurityContext.getCurrentEmployeeId(),
                    true,
                    false
            );
            return ResponseEntity.ok(hrOperationsDashboardService.getDashboardAnalytics(context));
        } else if (SecurityContext.isManager()) {
            // Managers get manager dashboard
            return ResponseEntity.ok(managerDashboardService.getManagerDashboard());
        } else {
            // Regular employees get employee dashboard
            return ResponseEntity.ok(employeeDashboardService.getEmployeeDashboard());
        }
    }

    // ==================== DASHBOARD WIDGETS ====================

    /**
     * Get specific dashboard widgets for customizable dashboards
     */
    @GetMapping("/widgets/attendance")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    @Operation(summary = "Get attendance widget data", description = "Returns attendance analytics widget data")
    public ResponseEntity<DashboardAnalyticsResponse.AttendanceAnalytics> getAttendanceWidget() {
        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                SecurityContext.getCurrentEmployeeId(),
                SecurityContext.isHRManager() || SecurityContext.isTenantAdmin(),
                SecurityContext.isManager()
        );
        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard.getAttendance());
    }

    @GetMapping("/widgets/leave")
    @RequiresPermission(Permission.LEAVE_VIEW_ALL)
    @Operation(summary = "Get leave widget data", description = "Returns leave analytics widget data")
    public ResponseEntity<DashboardAnalyticsResponse.LeaveAnalytics> getLeaveWidget() {
        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                SecurityContext.getCurrentEmployeeId(),
                SecurityContext.isHRManager() || SecurityContext.isTenantAdmin(),
                SecurityContext.isManager()
        );
        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard.getLeave());
    }

    @GetMapping("/widgets/headcount")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get headcount widget data", description = "Returns headcount analytics widget data")
    public ResponseEntity<DashboardAnalyticsResponse.HeadcountAnalytics> getHeadcountWidget() {
        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                SecurityContext.getCurrentEmployeeId(),
                true,
                false
        );
        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard.getHeadcount());
    }

    @GetMapping("/widgets/payroll")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    @Operation(summary = "Get payroll widget data", description = "Returns payroll analytics widget data")
    public ResponseEntity<DashboardAnalyticsResponse.PayrollAnalytics> getPayrollWidget() {
        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                SecurityContext.getCurrentEmployeeId(),
                true,
                false
        );
        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard.getPayroll());
    }

    @GetMapping("/widgets/events")
    @RequiresPermission(Permission.DASHBOARD_VIEW)
    @Operation(summary = "Get upcoming events widget data", description = "Returns upcoming events widget data")
    public ResponseEntity<DashboardAnalyticsResponse.UpcomingEvents> getEventsWidget() {
        DashboardContext context = hrOperationsDashboardService.buildContext(
                com.hrms.common.security.TenantContext.getCurrentTenant(),
                SecurityContext.getCurrentUserId(),
                SecurityContext.getCurrentEmployeeId(),
                SecurityContext.isHRManager() || SecurityContext.isTenantAdmin(),
                SecurityContext.isManager()
        );
        DashboardAnalyticsResponse dashboard = hrOperationsDashboardService.getDashboardAnalytics(context);
        return ResponseEntity.ok(dashboard.getUpcomingEvents());
    }
}
