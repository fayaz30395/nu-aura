package com.hrms.api.export;

import com.hrms.common.export.ExportFormat;
import com.hrms.common.export.ExportService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Generic export controller for data exports.
 * <p>
 * Playbook Reference: Prompt 33 - CSV/PDF export
 */
@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Data export endpoints")
public class ExportController {

    private final ExportService exportService;

    @PostMapping("/employees")
    @RequiresPermission(Permission.EMPLOYEE_READ)
    @Operation(summary = "Export employee data")
    public ResponseEntity<byte[]> exportEmployees(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    @Operation(summary = "Export attendance data")
    public ResponseEntity<byte[]> exportAttendance(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
    @RequiresPermission(Permission.LEAVE_VIEW_ALL)
    @Operation(summary = "Export leave data")
    public ResponseEntity<byte[]> exportLeaves(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    @Operation(summary = "Export payroll data")
    public ResponseEntity<byte[]> exportPayroll(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
    @RequiresPermission(Permission.TIMESHEET_APPROVE)
    @Operation(summary = "Export timesheet data")
    public ResponseEntity<byte[]> exportTimesheets(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Export project data")
    public ResponseEntity<byte[]> exportProjects(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

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
            List<Map<String, Object>> data,
            List<String> columnKeys
    ) {
    }
}
