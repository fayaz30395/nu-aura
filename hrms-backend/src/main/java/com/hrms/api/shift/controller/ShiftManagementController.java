package com.hrms.api.shift.controller;

import com.hrms.api.shift.dto.ShiftAssignmentRequest;
import com.hrms.api.shift.dto.ShiftAssignmentResponse;
import com.hrms.api.shift.dto.ShiftRequest;
import com.hrms.api.shift.dto.ShiftResponse;
import com.hrms.application.shift.service.ShiftManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
@Slf4j
public class ShiftManagementController {

    private final ShiftManagementService shiftManagementService;

    // ========== Shift CRUD ==========

    @PostMapping
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftResponse> createShift(@Valid @RequestBody ShiftRequest request) {
        log.info("Creating shift: {}", request.getShiftCode());
        ShiftResponse response = shiftManagementService.createShift(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{shiftId}")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftResponse> updateShift(
            @PathVariable UUID shiftId,
            @Valid @RequestBody ShiftRequest request) {
        log.info("Updating shift: {}", shiftId);
        ShiftResponse response = shiftManagementService.updateShift(shiftId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{shiftId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<ShiftResponse> getShiftById(@PathVariable UUID shiftId) {
        log.info("Fetching shift: {}", shiftId);
        ShiftResponse response = shiftManagementService.getShiftById(shiftId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<ShiftResponse>> getAllShifts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "shiftName") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        log.info("Fetching all shifts");
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ShiftResponse> response = shiftManagementService.getAllShifts(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<List<ShiftResponse>> getActiveShifts() {
        log.info("Fetching active shifts");
        List<ShiftResponse> response = shiftManagementService.getActiveShifts();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{shiftId}")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Void> deleteShift(@PathVariable UUID shiftId) {
        log.info("Deleting shift: {}", shiftId);
        shiftManagementService.deleteShift(shiftId);
        return ResponseEntity.noContent().build();
    }

    // ========== Shift Assignments ==========

    @PostMapping("/assignments")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftAssignmentResponse> assignShift(
            @Valid @RequestBody ShiftAssignmentRequest request) {
        log.info("Assigning shift {} to employee {}", request.getShiftId(), request.getEmployeeId());
        ShiftAssignmentResponse response = shiftManagementService.assignShiftToEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/assignments/employee/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<ShiftAssignmentResponse>> getEmployeeAssignments(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching assignments for employee: {}", employeeId);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "assignmentDate"));
        Page<ShiftAssignmentResponse> response = shiftManagementService.getEmployeeAssignments(employeeId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assignments/date/{date}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<List<ShiftAssignmentResponse>> getAssignmentsForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Fetching assignments for date: {}", date);
        List<ShiftAssignmentResponse> response = shiftManagementService.getAssignmentsForDate(date);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Void> cancelAssignment(@PathVariable UUID assignmentId) {
        log.info("Cancelling assignment: {}", assignmentId);
        shiftManagementService.cancelAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }
}
