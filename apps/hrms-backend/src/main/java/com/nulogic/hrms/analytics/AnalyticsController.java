package com.nulogic.hrms.analytics;

import com.nulogic.hrms.analytics.dto.DashboardAnalyticsResponse;
import com.nulogic.hrms.common.SecurityUtils;
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

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardAnalyticsResponse> getDashboardAnalytics() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("User not authenticated"));
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics(userId));
    }
}
