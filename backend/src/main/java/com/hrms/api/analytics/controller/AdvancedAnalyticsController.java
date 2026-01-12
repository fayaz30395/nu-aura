package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.AdvancedAnalyticsService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics/advanced")
@RequiredArgsConstructor
@Slf4j
public class AdvancedAnalyticsController {

    private final AdvancedAnalyticsService analyticsService;

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<Map<String, Object>> getAnalyticsDashboard() {
        log.info("Fetching analytics dashboard");
        return ResponseEntity.ok(analyticsService.getAnalyticsDashboard());
    }

    // ==================== Workforce Analytics ====================

    @GetMapping("/workforce")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<WorkforceAnalyticsResponse> getWorkforceAnalytics() {
        log.info("Fetching workforce analytics");
        return ResponseEntity.ok(analyticsService.getWorkforceAnalytics());
    }

    // ==================== Hiring Analytics ====================

    @GetMapping("/hiring")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<HiringAnalyticsResponse> getHiringAnalytics() {
        log.info("Fetching hiring analytics");
        return ResponseEntity.ok(analyticsService.getHiringAnalytics());
    }

    // ==================== Performance Analytics ====================

    @GetMapping("/performance")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<PerformanceAnalyticsResponse> getPerformanceAnalytics() {
        log.info("Fetching performance analytics");
        return ResponseEntity.ok(analyticsService.getPerformanceAnalytics());
    }

    // ==================== Compensation Analytics ====================

    @GetMapping("/compensation")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<CompensationAnalyticsResponse> getCompensationAnalytics() {
        log.info("Fetching compensation analytics");
        return ResponseEntity.ok(analyticsService.getCompensationAnalytics());
    }

    // ==================== Attendance Analytics ====================

    @GetMapping("/attendance")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<AttendanceAnalyticsResponse> getAttendanceAnalytics() {
        log.info("Fetching attendance analytics");
        return ResponseEntity.ok(analyticsService.getAttendanceAnalytics());
    }
}
