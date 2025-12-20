package com.hrms.api.monitoring.controller;

import com.hrms.api.monitoring.dto.MetricsResponse;
import com.hrms.api.monitoring.dto.SystemHealthResponse;
import com.hrms.api.monitoring.service.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for monitoring and metrics endpoints
 *
 * Provides aggregated metrics for admin dashboard display
 */
@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
@Tag(name = "Monitoring", description = "System monitoring and metrics API")
@SecurityRequirement(name = "Bearer Authentication")
public class MonitoringController {

    private final MonitoringService monitoringService;

    /**
     * Get system health status
     *
     * @return System health information including DB, cache, JVM, and API health
     */
    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get system health",
        description = "Returns comprehensive system health status including database, cache, JVM, and API metrics"
    )
    public ResponseEntity<SystemHealthResponse> getSystemHealth() {
        SystemHealthResponse health = monitoringService.getSystemHealth();
        return ResponseEntity.ok(health);
    }

    /**
     * Get comprehensive application metrics
     *
     * @return Aggregated metrics including system, business, and API metrics
     */
    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get application metrics",
        description = "Returns comprehensive application metrics including system resources, business KPIs, and API performance"
    )
    public ResponseEntity<MetricsResponse> getMetrics() {
        MetricsResponse metrics = monitoringService.getMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Simple ping endpoint for monitoring uptime
     *
     * @return Pong response
     */
    @GetMapping("/ping")
    @Operation(
        summary = "Ping endpoint",
        description = "Simple endpoint to check if the application is responding"
    )
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
