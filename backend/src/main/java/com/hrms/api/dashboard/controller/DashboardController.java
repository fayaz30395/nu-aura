package com.hrms.api.dashboard.controller;

import com.hrms.api.dashboard.dto.DashboardMetricsResponse;
import com.hrms.application.dashboard.service.DashboardService;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.hrms.common.security.Permission.DASHBOARD_HR_OPS;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    @RequiresPermission(DASHBOARD_HR_OPS)
    public ResponseEntity<DashboardMetricsResponse> getDashboardMetrics() {
        log.info("Fetching dashboard metrics");
        DashboardMetricsResponse metrics = dashboardService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }
}
