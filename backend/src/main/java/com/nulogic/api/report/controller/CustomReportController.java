package com.nulogic.api.report.controller;

import com.nulogic.api.report.dto.ReportTemplateDto;
import com.nulogic.application.report.service.CustomReportService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/custom")
@RequiredArgsConstructor
public class CustomReportController {

    private final CustomReportService customReportService;
    private final TenantTimeService tenantTimeService;

    @GetMapping("/templates")
    @RequiresPermission(Permission.REPORT_VIEW)
    public ResponseEntity<List<ReportTemplateDto>> listTemplates(
            @RequestParam(required = false) String module) {
        return ResponseEntity.ok(customReportService.listTemplates(module));
    }

    @PostMapping("/templates")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<ReportTemplateDto> saveTemplate(
            @Valid @RequestBody ReportTemplateDto dto) {
        return ResponseEntity.ok(customReportService.saveTemplate(dto));
    }

    @GetMapping("/templates/{id}")
    @RequiresPermission(Permission.REPORT_VIEW)
    public ResponseEntity<ReportTemplateDto> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(customReportService.getTemplate(id));
    }

    @DeleteMapping("/templates/{id}")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        customReportService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/execute")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<List<Map<String, Object>>> execute(
            @Valid @RequestBody ReportTemplateDto query) {
        return ResponseEntity.ok(customReportService.executeReport(query));
    }

    @PostMapping("/export")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<byte[]> export(@Valid @RequestBody ReportTemplateDto query) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        String csv = customReportService.toCsv(query);
        String filename = "custom-report-" + query.getModule().toLowerCase() + "-"
                + tenantTimeService.today(tenantId) + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}
