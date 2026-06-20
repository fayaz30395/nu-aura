package com.nulogic.api.performance.controller;

import com.nulogic.api.performance.dto.OKRGraphResponse;
import com.nulogic.api.performance.dto.PerformanceSpiderResponse;
import com.nulogic.application.performance.service.PerformanceRevolutionService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/performance/revolution")
@RequiredArgsConstructor
public class PerformanceRevolutionController {

    private final PerformanceRevolutionService performanceRevolutionService;

    @GetMapping("/okr-graph")
    @RequiresPermission(Permission.OKR_VIEW)
    public OKRGraphResponse getOKRGraph() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return performanceRevolutionService.getOKRGraph(tenantId);
    }

    @GetMapping("/spider/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public PerformanceSpiderResponse getPerformanceSpider(@PathVariable UUID employeeId) {
        enforceReviewViewScope(employeeId);
        UUID tenantId = TenantContext.getCurrentTenant();
        return performanceRevolutionService.getPerformanceSpider(employeeId, tenantId);
    }
    /**
     * IDOR FIX: Enforces data-scope on /spider/{employeeId}.
     * Scope hierarchy: isHRManager (implicit VIEW_ALL) > EMPLOYEE_VIEW_ALL > VIEW_TEAM > VIEW_SELF.
     * There is no REVIEW:VIEW_ALL in the Permission catalog; EMPLOYEE_VIEW_ALL is the
     * closest VIEW_ALL-class permission per the task instructions and is treated equivalently.
     * SuperAdmin and TenantAdmin bypass all scope checks.
     */
    private void enforceReviewViewScope(UUID targetEmployeeId) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) {
            return;
        }

        // HR managers have tenant-wide visibility over performance data
        if (SecurityContext.isHRManager()) {
            return;
        }

        // EMPLOYEE_VIEW_ALL: cross-department view — treat as review VIEW_ALL
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return;
        }

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // VIEW_SELF: caller may only view their own performance spider
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        // VIEW_TEAM: managers may view their direct and indirect reportees
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
            if (reporteeIds.contains(targetEmployeeId)) {
                return;
            }
        }

        throw new AccessDeniedException(
                "You are not authorized to view performance data for this employee");
    }


}
