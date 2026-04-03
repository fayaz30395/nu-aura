package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.AttendanceImportService;
import com.hrms.application.attendance.service.AttendanceRecordService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.domain.employee.Employee;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Set;

/**
 * REST controller for attendance management.
 * Handles check-in/out, time tracking, regularization, and bulk imports.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Validated
@Tag(name = "Attendance", description = "Attendance management endpoints for time tracking, check-in/out, and regularization")
public class AttendanceController {

    private final AttendanceRecordService attendanceService;
    private final AttendanceImportService attendanceImportService;
    private final com.hrms.common.security.DataScopeService dataScopeService;
    private final EmployeeService employeeService;

    // ===================== Single Check-In/Out =====================

    @PostMapping("/check-in")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    @Operation(summary = "Check in", description = "Record employee check-in for the day")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Check-in recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request or already checked in"),
            @ApiResponse(responseCode = "403", description = "Not authorized to mark attendance")
    })
    public ResponseEntity<AttendanceResponse> checkIn(@Valid @RequestBody CheckInRequest request) {
        LocalDateTime checkInTime = request.getCheckInTime() != null ? request.getCheckInTime() : LocalDateTime.now();
        UUID employeeId = resolveEmployeeId(request.getEmployeeId(), Permission.ATTENDANCE_MARK);
        AttendanceRecord record = attendanceService.checkIn(
                employeeId,
                checkInTime,
                request.getSource(),
                request.getLocation(),
                request.getIp(),
                request.getAttendanceDate() // Pass client's local date to handle timezone differences
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(record));
    }

    @PostMapping("/check-out")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    @Operation(summary = "Check out", description = "Record employee check-out for the day")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Check-out recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request or not checked in"),
            @ApiResponse(responseCode = "403", description = "Not authorized to mark attendance")
    })
    public ResponseEntity<AttendanceResponse> checkOut(@Valid @RequestBody CheckOutRequest request) {
        LocalDateTime checkOutTime = request.getCheckOutTime() != null ? request.getCheckOutTime()
                : LocalDateTime.now();
        UUID employeeId = resolveEmployeeId(request.getEmployeeId(), Permission.ATTENDANCE_MARK);
        AttendanceRecord record = attendanceService.checkOut(
                employeeId,
                checkOutTime,
                request.getSource(),
                request.getLocation(),
                request.getIp(),
                request.getAttendanceDate() // Pass client's local date to handle timezone differences
        );
        return ResponseEntity.ok(toResponse(record));
    }

    // ===================== Today's Attendance =====================

    @GetMapping("/today")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    @Operation(summary = "Get today's attendance", description = "Retrieve the authenticated user's attendance record for today")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Today's attendance record (may be empty if not checked in)"),
            @ApiResponse(responseCode = "403", description = "Not authorized")
    })
    public ResponseEntity<AttendanceResponse> getTodayAttendance() {
        UUID employeeId = requireCurrentEmployeeId();
        return attendanceService.getTodayAttendance(employeeId)
                .map(record -> ResponseEntity.ok(toResponse(record)))
                .orElseGet(() -> {
                    // Return an empty response with today's date — no attendance yet
                    AttendanceResponse empty = new AttendanceResponse();
                    empty.setEmployeeId(employeeId);
                    empty.setAttendanceDate(java.time.LocalDate.now());
                    empty.setStatus("NOT_CHECKED_IN");
                    empty.setWorkDurationMinutes(0);
                    empty.setBreakDurationMinutes(0);
                    empty.setOvertimeMinutes(0);
                    empty.setIsLate(false);
                    empty.setLateByMinutes(0);
                    empty.setIsEarlyDeparture(false);
                    empty.setEarlyDepartureMinutes(0);
                    empty.setRegularizationRequested(false);
                    empty.setRegularizationApproved(false);
                    return ResponseEntity.ok(empty);
                });
    }

    // ===================== Self-Service Attendance (My Attendance)
    // =====================

    @GetMapping("/my-attendance")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    @Operation(summary = "Get my attendance", description = "Retrieve authenticated user's attendance records for a date range")
    @ApiResponse(responseCode = "200", description = "Attendance records retrieved successfully")
    public ResponseEntity<Page<AttendanceResponse>> getMyAttendance(
            @Parameter(description = "Start date (ISO format)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (ISO format)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        UUID employeeId = requireCurrentEmployeeId();
        Page<AttendanceRecord> records = attendanceService.getAttendanceByDateRange(employeeId, startDate, endDate, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/my-time-entries")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    @Operation(summary = "Get my time entries", description = "Retrieve authenticated user's time entries for a specific date")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<List<TimeEntryResponse>> getMyTimeEntries(
            @Parameter(description = "Date (ISO format)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        UUID employeeId = requireCurrentEmployeeId();
        List<AttendanceTimeEntry> entries = attendanceService.getTimeEntriesForDate(employeeId, date);
        return ResponseEntity.ok(entries.stream().map(this::toTimeEntryResponse).collect(Collectors.toList()));
    }

    // ===================== Multi Check-In/Out (Break Tracking)
    // =====================

    @PostMapping("/multi-check-in")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    public ResponseEntity<TimeEntryResponse> multiCheckIn(@Valid @RequestBody MultiCheckInRequest request) {
        LocalDateTime checkInTime = request.getCheckInTime() != null ? request.getCheckInTime() : LocalDateTime.now();
        UUID employeeId = resolveEmployeeId(request.getEmployeeId(), Permission.ATTENDANCE_MARK);
        AttendanceTimeEntry entry = attendanceService.multiCheckIn(
                employeeId,
                checkInTime,
                request.getEntryType(),
                request.getSource(),
                request.getLocation(),
                request.getIp(),
                request.getNotes());
        return ResponseEntity.status(HttpStatus.CREATED).body(toTimeEntryResponse(entry));
    }

    @PostMapping("/multi-check-out")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    public ResponseEntity<TimeEntryResponse> multiCheckOut(@Valid @RequestBody MultiCheckOutRequest request) {
        LocalDateTime checkOutTime = request.getCheckOutTime() != null ? request.getCheckOutTime()
                : LocalDateTime.now();
        UUID employeeId = resolveEmployeeId(request.getEmployeeId(), Permission.ATTENDANCE_MARK);
        AttendanceTimeEntry entry = attendanceService.multiCheckOut(
                employeeId,
                request.getTimeEntryId(),
                checkOutTime,
                request.getSource(),
                request.getLocation(),
                request.getIp());
        return ResponseEntity.ok(toTimeEntryResponse(entry));
    }

    @GetMapping("/time-entries/{attendanceRecordId}")
    @RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntries(@PathVariable UUID attendanceRecordId) {
        AttendanceRecord record = attendanceService.getAttendanceRecordById(attendanceRecordId);
        String permission = determineViewPermission();
        validateEmployeeAccess(record.getEmployeeId(), permission);
        List<AttendanceTimeEntry> entries = attendanceService.getTimeEntries(attendanceRecordId);
        return ResponseEntity.ok(entries.stream().map(this::toTimeEntryResponse).collect(Collectors.toList()));
    }

    @GetMapping("/employee/{employeeId}/time-entries")
    @RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesForDate(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        List<AttendanceTimeEntry> entries = attendanceService.getTimeEntriesForDate(employeeId, date);
        return ResponseEntity.ok(entries.stream().map(this::toTimeEntryResponse).collect(Collectors.toList()));
    }

    // ===================== Bulk Check-In/Out =====================

    @PostMapping("/bulk-check-in")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    public ResponseEntity<BulkAttendanceResponse> bulkCheckIn(@Valid @RequestBody BulkCheckInRequest request) {
        LocalDateTime checkInTime = request.getCheckInTime() != null ? request.getCheckInTime() : LocalDateTime.now();
        AttendanceRecordService.BulkResult result = attendanceService.bulkCheckIn(
                request.getEmployeeIds(),
                checkInTime,
                request.getSource(),
                request.getLocation(),
                request.getIp());
        return ResponseEntity.status(HttpStatus.CREATED).body(toBulkResponse(result));
    }

    @PostMapping("/bulk-check-out")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    public ResponseEntity<BulkAttendanceResponse> bulkCheckOut(@Valid @RequestBody BulkCheckOutRequest request) {
        LocalDateTime checkOutTime = request.getCheckOutTime() != null ? request.getCheckOutTime()
                : LocalDateTime.now();
        AttendanceRecordService.BulkResult result = attendanceService.bulkCheckOut(
                request.getEmployeeIds(),
                checkOutTime,
                request.getSource(),
                request.getLocation(),
                request.getIp());
        return ResponseEntity.ok(toBulkResponse(result));
    }

    // ===================== Existing Endpoints =====================

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({
            Permission.ATTENDANCE_VIEW_ALL,
            Permission.ATTENDANCE_VIEW_TEAM
    })
    public ResponseEntity<Page<AttendanceResponse>> getEmployeeAttendance(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        Page<AttendanceRecord> records = attendanceService.getAttendanceByEmployee(employeeId, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/employee/{employeeId}/range")
    @RequiresPermission({
            Permission.ATTENDANCE_VIEW_ALL,
            Permission.ATTENDANCE_VIEW_TEAM
    })
    public ResponseEntity<Page<AttendanceResponse>> getEmployeeAttendanceByRange(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        Page<AttendanceRecord> records = attendanceService.getAttendanceByDateRange(employeeId, startDate, endDate, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/pending-regularizations")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Page<AttendanceResponse>> getPendingRegularizations(Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec = dataScopeService
                .getScopeSpecification(Permission.ATTENDANCE_APPROVE);
        Page<AttendanceRecord> records = attendanceService.getPendingRegularizations(scopeSpec, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/all")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    public ResponseEntity<Page<AttendanceResponse>> getAllAttendance(Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec = dataScopeService
                .getScopeSpecification(Permission.ATTENDANCE_MANAGE);
        Page<AttendanceRecord> records = attendanceService.getAllAttendance(scopeSpec, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/date/{date}")
    @RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
    public ResponseEntity<Page<AttendanceResponse>> getAttendanceByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Pageable pageable) {
        String permission = determineViewPermission();
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec = dataScopeService
                .getScopeSpecification(permission);

        Page<AttendanceRecord> records = attendanceService.getAttendanceByDate(date, scopeSpec, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @PostMapping("/regularization")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    @Operation(summary = "Submit regularization request", description = "Submit an attendance regularization request by date (creates a stub record if needed)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Regularization request submitted"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<AttendanceResponse> submitRegularization(
            @Valid @RequestBody RegularizationRequest request) {
        UUID employeeId = request.getEmployeeId() != null
                ? request.getEmployeeId()
                : requireCurrentEmployeeId();
        if (request.getEmployeeId() != null) {
            validateEmployeeAccess(employeeId, Permission.ATTENDANCE_REGULARIZE);
        }
        AttendanceRecord record = attendanceService.submitRegularizationRequest(
                employeeId, request.getDate(),
                request.getCheckInTime(), request.getCheckOutTime(),
                request.getReason());
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(toResponse(record));
    }

    @PostMapping("/{id}/request-regularization")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    @Operation(summary = "Request regularization", description = "Request approval to regularize an attendance record")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Regularization request submitted"),
            @ApiResponse(responseCode = "404", description = "Attendance record not found"),
            @ApiResponse(responseCode = "409", description = "Record already has pending regularization")
    })
    public ResponseEntity<AttendanceResponse> requestRegularization(
            @Parameter(description = "Attendance record UUID") @PathVariable UUID id,
            @Parameter(description = "Reason for regularization") @NotBlank @Size(max = 1000) @RequestParam String reason) {
        AttendanceRecord existing = attendanceService.getAttendanceRecordById(id);
        validateEmployeeAccess(existing.getEmployeeId(), Permission.ATTENDANCE_REGULARIZE);
        AttendanceRecord updated = attendanceService.requestRegularization(id, reason);
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping("/{id}/approve-regularization")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    @Operation(summary = "Approve regularization", description = "Approve a pending attendance regularization request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Regularization approved"),
            @ApiResponse(responseCode = "404", description = "Attendance record not found"),
            @ApiResponse(responseCode = "409", description = "Record is not pending regularization")
    })
    public ResponseEntity<AttendanceResponse> approveRegularization(
            @Parameter(description = "Attendance record UUID") @PathVariable UUID id) {
        AttendanceRecord existing = attendanceService.getAttendanceRecordById(id);
        validateEmployeeAccess(existing.getEmployeeId(), Permission.ATTENDANCE_APPROVE);
        UUID approverId = requireCurrentEmployeeId();
        AttendanceRecord record = attendanceService.approveRegularization(id, approverId);
        return ResponseEntity.ok(toResponse(record));
    }

    @PostMapping("/{id}/reject-regularization")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    @Operation(summary = "Reject regularization", description = "Reject a pending attendance regularization request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Regularization rejected"),
            @ApiResponse(responseCode = "404", description = "Attendance record not found"),
            @ApiResponse(responseCode = "409", description = "Record is not pending regularization")
    })
    public ResponseEntity<AttendanceResponse> rejectRegularization(
            @Parameter(description = "Attendance record UUID") @PathVariable UUID id,
            @Parameter(description = "Rejection reason (optional)") @Size(max = 1000) @RequestParam(required = false, defaultValue = "") String reason) {
        AttendanceRecord existing = attendanceService.getAttendanceRecordById(id);
        validateEmployeeAccess(existing.getEmployeeId(), Permission.ATTENDANCE_APPROVE);
        UUID rejectorId = requireCurrentEmployeeId();
        AttendanceRecord record = attendanceService.rejectRegularization(id, rejectorId, reason);
        return ResponseEntity.ok(toResponse(record));
    }

    // ===================== Bulk Import (Excel) =====================

    @GetMapping("/import/template")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    public ResponseEntity<byte[]> downloadImportTemplate() throws IOException {
        byte[] template = attendanceImportService.generateTemplate();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=attendance_import_template.xlsx")
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(template);
    }

    @PostMapping("/import")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    @Operation(summary = "Import attendance", description = "Bulk import attendance records from Excel file")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Import completed (check response for individual errors)"),
            @ApiResponse(responseCode = "400", description = "Invalid file format or empty file")
    })
    public ResponseEntity<BulkAttendanceImportResponse> importAttendance(
            @Parameter(description = "Excel file (.xlsx or .xls)") @RequestParam("file") MultipartFile file)
            throws IOException {

        // Validate file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    BulkAttendanceImportResponse.builder()
                            .totalRecords(0)
                            .failureCount(1)
                            .errors(List.of(BulkAttendanceImportResponse.ImportError.builder()
                                    .rowNumber(0)
                                    .errorMessage("File is empty")
                                    .build()))
                            .build());
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            return ResponseEntity.badRequest().body(
                    BulkAttendanceImportResponse.builder()
                            .totalRecords(0)
                            .failureCount(1)
                            .errors(List.of(BulkAttendanceImportResponse.ImportError.builder()
                                    .rowNumber(0)
                                    .errorMessage("Invalid file format. Please upload an Excel file (.xlsx or .xls)")
                                    .build()))
                            .build());
        }

        BulkAttendanceImportResponse response = attendanceImportService.importFromExcel(file);
        return ResponseEntity.ok(response);
    }

    // ===================== Response Mappers =====================

    private AttendanceResponse toResponse(AttendanceRecord record) {
        AttendanceResponse response = new AttendanceResponse();
        BeanUtils.copyProperties(record, response);
        response.setStatus(record.getStatus() != null ? record.getStatus().name() : "UNKNOWN");
        // Null-safe defaults for fields that may be null in legacy/imported records
        if (response.getWorkDurationMinutes() == null)
            response.setWorkDurationMinutes(0);
        if (response.getBreakDurationMinutes() == null)
            response.setBreakDurationMinutes(0);
        if (response.getOvertimeMinutes() == null)
            response.setOvertimeMinutes(0);
        if (response.getIsLate() == null)
            response.setIsLate(false);
        if (response.getLateByMinutes() == null)
            response.setLateByMinutes(0);
        if (response.getIsEarlyDeparture() == null)
            response.setIsEarlyDeparture(false);
        if (response.getEarlyDepartureMinutes() == null)
            response.setEarlyDepartureMinutes(0);
        if (response.getRegularizationRequested() == null)
            response.setRegularizationRequested(false);
        if (response.getRegularizationApproved() == null)
            response.setRegularizationApproved(false);
        return response;
    }

    private TimeEntryResponse toTimeEntryResponse(AttendanceTimeEntry entry) {
        TimeEntryResponse response = new TimeEntryResponse();
        response.setId(entry.getId());
        response.setAttendanceRecordId(entry.getAttendanceRecordId());
        response.setEntryType(entry.getEntryType().name());
        response.setCheckInTime(entry.getCheckInTime());
        response.setCheckOutTime(entry.getCheckOutTime());
        response.setCheckInSource(entry.getCheckInSource());
        response.setCheckOutSource(entry.getCheckOutSource());
        response.setDurationMinutes(entry.getDurationMinutes());
        response.setSequenceNumber(entry.getSequenceNumber());
        response.setNotes(entry.getNotes());
        response.setOpen(entry.isOpen());
        return response;
    }

    private BulkAttendanceResponse toBulkResponse(AttendanceRecordService.BulkResult result) {
        return BulkAttendanceResponse.builder()
                .successCount(result.successful().size())
                .failureCount(result.failed().size())
                .successful(result.successful().stream().map(this::toResponse).collect(Collectors.toList()))
                .failed(result.failed().stream()
                        .map(f -> BulkAttendanceResponse.FailedEntry.builder()
                                .employeeId(f.employeeId())
                                .error(f.error())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    // ===================== Scope Enforcement Helpers =====================

    private UUID requireCurrentEmployeeId() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            throw new AccessDeniedException("No employee context available");
        }
        return employeeId;
    }

    private UUID resolveEmployeeId(UUID requestedEmployeeId, String permission) {
        if (requestedEmployeeId == null) {
            return requireCurrentEmployeeId();
        }
        validateEmployeeAccess(requestedEmployeeId, permission);
        return requestedEmployeeId;
    }

    private String determineViewPermission() {
        if (SecurityContext.getPermissionScope(Permission.ATTENDANCE_VIEW_ALL) != null) {
            return Permission.ATTENDANCE_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.ATTENDANCE_VIEW_TEAM) != null) {
            return Permission.ATTENDANCE_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.ATTENDANCE_VIEW_SELF) != null) {
            return Permission.ATTENDANCE_VIEW_SELF;
        }

        // Fallback to MANAGE scope when view permissions are not explicitly present
        if (SecurityContext.getPermissionScope(Permission.ATTENDANCE_MANAGE) != null) {
            return Permission.ATTENDANCE_MANAGE;
        }

        return Permission.ATTENDANCE_VIEW_SELF;
    }

    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        com.hrms.domain.user.RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to attendance records");
        }

        switch (scope) {
            case ALL:
                return;
            case LOCATION:
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;
            case DEPARTMENT:
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;
            case TEAM:
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;
            case SELF:
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;
            case CUSTOM:
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new AccessDeniedException("You do not have permission to access this employee's attendance");
    }

    private boolean isReportee(UUID employeeId) {
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        try {
            Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
            return emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId());
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            return false;
        }
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        try {
            Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
            return departmentId.equals(emp.getDepartmentId());
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            return false;
        }
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            try {
                Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
                if (emp.getDepartmentId() != null && customDepartmentIds.contains(emp.getDepartmentId())) {
                    return true;
                }
            } catch (Exception e) { // Intentional broad catch — controller error boundary
                log.debug("Department scope check failed for employee {}: {}", employeeId, e.getMessage());
            }
        }

        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            try {
                Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
                if (emp.getOfficeLocationId() != null && customLocationIds.contains(emp.getOfficeLocationId())) {
                    return true;
                }
            } catch (Exception e) { // Intentional broad catch — controller error boundary
                log.debug("Location scope check failed for employee {}: {}", employeeId, e.getMessage());
            }
        }

        return false;
    }
}
