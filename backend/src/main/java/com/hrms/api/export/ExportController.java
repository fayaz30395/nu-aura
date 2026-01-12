package com.hrms.api.export;

import com.hrms.common.export.ExportFormat;
import com.hrms.common.export.ExportService;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generic export controller for data exports.
 *
 * Playbook Reference: Prompt 33 - CSV/PDF export
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Data export endpoints")
public class ExportController {

    private final ExportService exportService;

    @PostMapping("/employees")
    @RequiresPermission("EMPLOYEE:VIEW")
    @Operation(summary = "Export employee data")
    public ResponseEntity<byte[]> exportEmployees(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Employee Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "employees");
    }

    @PostMapping("/attendance")
    @RequiresPermission("ATTENDANCE:VIEW")
    @Operation(summary = "Export attendance data")
    public ResponseEntity<byte[]> exportAttendance(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Attendance Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "attendance");
    }

    @PostMapping("/leaves")
    @RequiresPermission("LEAVE:VIEW")
    @Operation(summary = "Export leave data")
    public ResponseEntity<byte[]> exportLeaves(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Leave Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "leaves");
    }

    @PostMapping("/payroll")
    @RequiresPermission("PAYROLL:VIEW")
    @Operation(summary = "Export payroll data")
    public ResponseEntity<byte[]> exportPayroll(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Payroll Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "payroll");
    }

    @PostMapping("/timesheets")
    @RequiresPermission("TIMESHEET:VIEW")
    @Operation(summary = "Export timesheet data")
    public ResponseEntity<byte[]> exportTimesheets(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Timesheet Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "timesheets");
    }

    @PostMapping("/projects")
    @RequiresPermission("PROJECT:VIEW")
    @Operation(summary = "Export project data")
    public ResponseEntity<byte[]> exportProjects(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @RequestBody ExportRequest request) throws Exception {

        byte[] data = exportService.export(
                format,
                "Project Report",
                request.headers(),
                request.data(),
                request.columnKeys()
        );

        return buildResponse(data, format, "projects");
    }

    private ResponseEntity<byte[]> buildResponse(byte[] data, ExportFormat format, String prefix) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = prefix + "_" + timestamp + format.getExtension();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, format.getContentType())
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(data.length))
                .body(data);
    }

    public record ExportRequest(
            List<String> headers,
            List<java.util.Map<String, Object>> data,
            List<String> columnKeys
    ) {}
}
