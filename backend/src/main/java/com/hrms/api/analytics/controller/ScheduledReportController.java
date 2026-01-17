package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.ScheduledReportRequest;
import com.hrms.api.analytics.dto.ScheduledReportResponse;
import com.hrms.application.analytics.service.ScheduledReportService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/scheduled-reports")
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportController {

    private final ScheduledReportService scheduledReportService;

    @PostMapping
    @RequiresPermission(REPORT_CREATE)
    public ResponseEntity<ScheduledReportResponse> createScheduledReport(
            @Valid @RequestBody ScheduledReportRequest request) {
        UUID createdBy = SecurityContext.getCurrentEmployeeId();
        log.info("Creating scheduled report: {} by: {}", request.getScheduleName(), createdBy);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scheduledReportService.createScheduledReport(request, createdBy));
    }

    @PutMapping("/{id}")
    @RequiresPermission(REPORT_CREATE)
    public ResponseEntity<ScheduledReportResponse> updateScheduledReport(
            @PathVariable UUID id,
            @Valid @RequestBody ScheduledReportRequest request) {
        UUID updatedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Updating scheduled report: {} by: {}", id, updatedBy);
        return ResponseEntity.ok(scheduledReportService.updateScheduledReport(id, request, updatedBy));
    }

    @GetMapping("/{id}")
    @RequiresPermission(REPORT_VIEW)
    public ResponseEntity<ScheduledReportResponse> getScheduledReportById(@PathVariable UUID id) {
        return ResponseEntity.ok(scheduledReportService.getScheduledReportById(id));
    }

    @GetMapping
    @RequiresPermission(REPORT_VIEW)
    public ResponseEntity<Page<ScheduledReportResponse>> getAllScheduledReports(Pageable pageable) {
        return ResponseEntity.ok(scheduledReportService.getAllScheduledReports(pageable));
    }

    @GetMapping("/active")
    @RequiresPermission(REPORT_VIEW)
    public ResponseEntity<List<ScheduledReportResponse>> getActiveScheduledReports() {
        return ResponseEntity.ok(scheduledReportService.getActiveScheduledReports());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(REPORT_CREATE)
    public ResponseEntity<Void> deleteScheduledReport(@PathVariable UUID id) {
        log.info("Deleting scheduled report: {}", id);
        scheduledReportService.deleteScheduledReport(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle-status")
    @RequiresPermission(REPORT_CREATE)
    public ResponseEntity<ScheduledReportResponse> toggleStatus(@PathVariable UUID id) {
        UUID updatedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Toggling scheduled report status: {} by: {}", id, updatedBy);
        return ResponseEntity.ok(scheduledReportService.toggleStatus(id, updatedBy));
    }
}
