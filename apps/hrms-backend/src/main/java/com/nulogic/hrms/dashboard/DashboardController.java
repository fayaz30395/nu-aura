package com.nulogic.hrms.dashboard;
import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.dashboard.dto.EmployeeDashboardData;
import com.nulogic.hrms.dashboard.dto.ExecutiveDashboardData;
import com.nulogic.hrms.dashboard.dto.ManagerDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboards")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/executive")
    public ResponseEntity<ExecutiveDashboardData> getExecutiveDashboard() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("User not authenticated"));
        return ResponseEntity.ok(dashboardService.getExecutiveDashboard(userId));
    }

    @GetMapping("/employee")
    public ResponseEntity<EmployeeDashboardData> getEmployeeDashboard() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("User not authenticated"));
        return ResponseEntity.ok(dashboardService.getEmployeeDashboard(userId));
    }

    @GetMapping("/employee/{id}")
    public ResponseEntity<EmployeeDashboardData> getEmployeeDashboardById(@PathVariable UUID id) {
        return ResponseEntity.ok(dashboardService.getEmployeeDashboard(id));
    }

    @GetMapping("/manager")
    public ResponseEntity<ManagerDashboardResponse> getManagerDashboard() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("User not authenticated"));
        return ResponseEntity.ok(dashboardService.getManagerDashboard(userId));
    }

    @GetMapping("/manager/{id}")
    public ResponseEntity<ManagerDashboardResponse> getManagerDashboardById(@PathVariable UUID id) {
        return ResponseEntity.ok(dashboardService.getManagerDashboard(id));
    }
}
