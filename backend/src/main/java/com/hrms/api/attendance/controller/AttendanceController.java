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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceRecordService attendanceService;
    private final AttendanceImportService attendanceImportService;
    private final com.hrms.common.security.DataScopeService dataScopeService;
    private final EmployeeService employeeService;

    // ===================== Single Check-In/Out =====================

    @PostMapping("/check-in")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
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

    // ===================== Self-Service Attendance (My Attendance)
    // =====================

    @GetMapping("/my-attendance")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    public ResponseEntity<List<AttendanceResponse>> getMyAttendance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        UUID employeeId = requireCurrentEmployeeId();
        List<AttendanceRecord> records = attendanceService.getAttendanceByDateRange(employeeId, startDate, endDate);
        return ResponseEntity.ok(records.stream().map(this::toResponse).toList());
    }

    @GetMapping("/my-time-entries")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    public ResponseEntity<List<TimeEntryResponse>> getMyTimeEntries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
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
    public ResponseEntity<List<AttendanceResponse>> getEmployeeAttendanceByRange(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        List<AttendanceRecord> records = attendanceService.getAttendanceByDateRange(employeeId, startDate, endDate);
        return ResponseEntity.ok(records.stream().map(this::toResponse).toList());
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
    @RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
    public ResponseEntity<Page<AttendanceResponse>> getAllAttendance(Pageable pageable) {
        // Use highest applicable permission for scope resolution
        String permission = SecurityContext.hasPermission(Permission.ATTENDANCE_VIEW_ALL)
                ? Permission.ATTENDANCE_VIEW_ALL
                : Permission.ATTENDANCE_VIEW_TEAM;

        org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec = dataScopeService
                .getScopeSpecification(permission);
        Page<AttendanceRecord> records = attendanceService.getAllAttendance(scopeSpec, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @GetMapping("/date/{date}")
    @RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
    public ResponseEntity<Page<AttendanceResponse>> getAttendanceByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Pageable pageable) {
        String permission = determineViewPermission();
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec =
            dataScopeService.getScopeSpecification(permission);

        Page<AttendanceRecord> records = attendanceService.getAttendanceByDate(date, scopeSpec, pageable);
        return ResponseEntity.ok(records.map(this::toResponse));
    }

    @PostMapping("/{id}/request-regularization")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<AttendanceResponse> requestRegularization(
            @PathVariable UUID id,
            @RequestParam String reason) {
        AttendanceRecord existing = attendanceService.getAttendanceRecordById(id);
        validateEmployeeAccess(existing.getEmployeeId(), Permission.ATTENDANCE_REGULARIZE);
        AttendanceRecord updated = attendanceService.requestRegularization(id, reason);
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping("/{id}/approve-regularization")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<AttendanceResponse> approveRegularization(
            @PathVariable UUID id) {
        AttendanceRecord existing = attendanceService.getAttendanceRecordById(id);
        validateEmployeeAccess(existing.getEmployeeId(), Permission.ATTENDANCE_APPROVE);
        UUID approverId = requireCurrentEmployeeId();
        AttendanceRecord record = attendanceService.approveRegularization(id, approverId);
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
    public ResponseEntity<BulkAttendanceImportResponse> importAttendance(
            @RequestParam("file") MultipartFile file) throws IOException {

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
        response.setStatus(record.getStatus().name());
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
        java.util.Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        java.util.Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        try {
            Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
            return emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId());
        } catch (Exception e) {
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
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        java.util.Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        java.util.Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            try {
                Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
                if (emp.getDepartmentId() != null && customDepartmentIds.contains(emp.getDepartmentId())) {
                    return true;
                }
            } catch (Exception e) {
                // Employee not found or access denied
            }
        }

        java.util.Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            try {
                Employee emp = employeeService.getByIdAndTenant(employeeId, tenantId);
                if (emp.getOfficeLocationId() != null && customLocationIds.contains(emp.getOfficeLocationId())) {
                    return true;
                }
            } catch (Exception e) {
                // Employee not found or access denied
            }
        }

        return false;
    }
}
