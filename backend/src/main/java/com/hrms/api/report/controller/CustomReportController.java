package com.hrms.api.report.controller;

import com.hrms.api.report.dto.ReportTemplateDto;
import com.hrms.application.report.service.CustomReportService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/custom")
@RequiredArgsConstructor
public class CustomReportController {

    private final CustomReportService customReportService;

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
        String csv = customReportService.toCsv(query);
        String filename = "custom-report-" + query.getModule().toLowerCase() + "-"
                + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}
