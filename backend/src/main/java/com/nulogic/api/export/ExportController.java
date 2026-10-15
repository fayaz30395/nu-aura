package com.nulogic.api.export;

import com.nulogic.api.employee.dto.EmployeeResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.employee.service.EmployeeService;
import com.nulogic.common.export.ExportFormat;
import com.nulogic.common.export.ExportService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

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
    private final TenantTimeService tenantTimeService;
    private final AuditLogService auditLogService;
    private final EmployeeService employeeService;

    /** Non-sensitive columns exportable from /employees (no bank, DOB, personal contact). */
    private static final Map<String, Function<EmployeeResponse, Object>> EMPLOYEE_COLUMNS = new LinkedHashMap<>();

    static {
        EMPLOYEE_COLUMNS.put("employeeCode", EmployeeResponse::getEmployeeCode);
        EMPLOYEE_COLUMNS.put("fullName", EmployeeResponse::getFullName);
        EMPLOYEE_COLUMNS.put("workEmail", EmployeeResponse::getWorkEmail);
        EMPLOYEE_COLUMNS.put("designation", EmployeeResponse::getDesignation);
        EMPLOYEE_COLUMNS.put("departmentName", EmployeeResponse::getDepartmentName);
        EMPLOYEE_COLUMNS.put("managerName", EmployeeResponse::getManagerName);
        EMPLOYEE_COLUMNS.put("locationName", EmployeeResponse::getLocationName);
        EMPLOYEE_COLUMNS.put("employmentType", EmployeeResponse::getEmploymentType);
        EMPLOYEE_COLUMNS.put("status", EmployeeResponse::getStatus);
        EMPLOYEE_COLUMNS.put("joiningDate", EmployeeResponse::getJoiningDate);
    }

    @PostMapping("/employees")
    @RequiresPermission(Permission.EMPLOYEE_READ)
    @Operation(summary = "Export employee data")
    public ResponseEntity<byte[]> exportEmployees(
            @RequestParam(defaultValue = "EXCEL") ExportFormat format,
            @Valid @RequestBody ExportRequest request) throws Exception {

        // Rows come from the server (caller's data scope applies); the client only picks columns.
        List<String> keys = request.columnKeys() == null || request.columnKeys().isEmpty()
                ? List.copyOf(EMPLOYEE_COLUMNS.keySet()) : request.columnKeys();
        if (!EMPLOYEE_COLUMNS.keySet().containsAll(keys)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Unsupported employee export column");
        }
        List<String> headers = request.headers() != null && request.headers().size() == keys.size()
                ? request.headers() : keys;
        List<Map<String, Object>> rows = employeeService
                .getAllEmployees(PageRequest.of(0, 10000, Sort.by("employeeCode")))
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    keys.forEach(k -> row.put(k, EMPLOYEE_COLUMNS.get(k).apply(e)));
                    return row;
                }).getContent();

        byte[] data = exportService.export(format, "Employee Report", headers, rows, keys);

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
        UUID tenantId = TenantContext.requireCurrentTenant();
        String timestamp = tenantTimeService.now(tenantId).format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = prefix + "_" + timestamp + format.getExtension();

        auditLogService.logAction("USER", SecurityContext.getCurrentUserId(), AuditAction.EXPORT,
                null, null, "Exported " + prefix + " data as " + format);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, format.getContentType())
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(data.length))
                .body(data);
    }

    /**
     * SEC-FIX (M-15): bound the request payload so an authenticated caller cannot post an
     * arbitrarily large body and force an unbounded in-memory export. {@code @Size} is
     * honoured because every endpoint annotates the body with {@code @Valid}; the
     * {@code MAX_EXPORT_ROWS} guard in {@link ExportService#export} is the defence-in-depth
     * backstop for non-validated call paths.
     */
    public record ExportRequest(
            @Size(max = 200, message = "headers cannot exceed 200 entries")
            List<String> headers,
            @Size(max = 10000, message = "data cannot exceed 10000 rows")
            List<Map<String, Object>> data,
            @Size(max = 200, message = "columnKeys cannot exceed 200 entries")
            List<String> columnKeys
    ) {
    }
}
