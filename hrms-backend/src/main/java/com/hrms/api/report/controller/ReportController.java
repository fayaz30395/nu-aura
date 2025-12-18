package com.hrms.api.report.controller;

import com.hrms.api.report.dto.ReportRequest;
import com.hrms.application.report.service.ReportService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.lowagie.text.DocumentException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PostMapping("/employee-directory")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<byte[]> generateEmployeeDirectoryReport(
        @Valid @RequestBody ReportRequest request
    ) throws IOException, DocumentException {
        log.info("Generating employee directory report");
        byte[] reportData = reportService.generateEmployeeDirectoryReport(request);
        return buildResponse(reportData, "employee-directory", request.getFormat());
    }

    @PostMapping("/attendance")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<byte[]> generateAttendanceReport(
        @Valid @RequestBody ReportRequest request
    ) throws IOException, DocumentException {
        log.info("Generating attendance report from {} to {}",
            request.getStartDate(), request.getEndDate());
        byte[] reportData = reportService.generateAttendanceReport(request);
        return buildResponse(reportData, "attendance", request.getFormat());
    }

    @PostMapping("/department-headcount")
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<byte[]> generateDepartmentHeadcountReport(
        @Valid @RequestBody ReportRequest request
    ) throws IOException, DocumentException {
        log.info("Generating department headcount report");
        byte[] reportData = reportService.generateDepartmentHeadcountReport(request);
        return buildResponse(reportData, "department-headcount", request.getFormat());
    }

    private ResponseEntity<byte[]> buildResponse(
        byte[] reportData,
        String reportName,
        ReportRequest.ExportFormat format
    ) {
        if (format == null) {
            format = ReportRequest.ExportFormat.EXCEL;
        }

        String timestamp = LocalDate.now().format(DATE_FORMATTER);
        String filename;
        MediaType contentType;

        switch (format) {
            case EXCEL:
                filename = reportName + "-" + timestamp + ".xlsx";
                contentType = MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                break;
            case PDF:
                filename = reportName + "-" + timestamp + ".pdf";
                contentType = MediaType.APPLICATION_PDF;
                break;
            case CSV:
                filename = reportName + "-" + timestamp + ".csv";
                contentType = MediaType.parseMediaType("text/csv");
                break;
            default:
                filename = reportName + "-" + timestamp + ".xlsx";
                contentType = MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
            .headers(headers)
            .body(reportData);
    }
}
