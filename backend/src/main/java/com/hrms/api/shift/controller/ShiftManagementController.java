package com.hrms.api.shift.controller;

import com.hrms.api.shift.dto.*;
import com.hrms.application.shift.service.ShiftManagementService;
import com.hrms.application.shift.service.ShiftPatternService;
import com.hrms.application.shift.service.ShiftScheduleService;
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
    private final ShiftPatternService shiftPatternService;
    private final ShiftScheduleService shiftScheduleService;

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

    @PatchMapping("/{shiftId}/activate")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftResponse> activateShift(@PathVariable UUID shiftId) {
        log.info("Activating shift: {}", shiftId);
        ShiftResponse response = shiftManagementService.activateShift(shiftId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{shiftId}/deactivate")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftResponse> deactivateShift(@PathVariable UUID shiftId) {
        log.info("Deactivating shift: {}", shiftId);
        ShiftResponse response = shiftManagementService.deactivateShift(shiftId);
        return ResponseEntity.ok(response);
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

    // ========== Shift Patterns ==========

    @PostMapping("/patterns")
    @RequiresPermission(Permission.SHIFT_MANAGE)
    public ResponseEntity<ShiftPatternResponse> createPattern(
            @Valid @RequestBody ShiftPatternRequest request) {
        log.info("Creating shift pattern: {}", request.getName());
        ShiftPatternResponse response = shiftPatternService.createPattern(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/patterns/{patternId}")
    @RequiresPermission(Permission.SHIFT_MANAGE)
    public ResponseEntity<ShiftPatternResponse> updatePattern(
            @PathVariable UUID patternId,
            @Valid @RequestBody ShiftPatternRequest request) {
        log.info("Updating shift pattern: {}", patternId);
        ShiftPatternResponse response = shiftPatternService.updatePattern(patternId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patterns/{patternId}")
    @RequiresPermission(Permission.SHIFT_VIEW)
    public ResponseEntity<ShiftPatternResponse> getPatternById(@PathVariable UUID patternId) {
        log.info("Fetching shift pattern: {}", patternId);
        ShiftPatternResponse response = shiftPatternService.getPatternById(patternId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patterns")
    @RequiresPermission(Permission.SHIFT_VIEW)
    public ResponseEntity<Page<ShiftPatternResponse>> getAllPatterns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ShiftPatternResponse> response = shiftPatternService.getAllPatterns(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patterns/active")
    @RequiresPermission(Permission.SHIFT_VIEW)
    public ResponseEntity<List<ShiftPatternResponse>> getActivePatterns() {
        log.info("Fetching active shift patterns");
        List<ShiftPatternResponse> response = shiftPatternService.getActivePatterns();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/patterns/{patternId}")
    @RequiresPermission(Permission.SHIFT_MANAGE)
    public ResponseEntity<Void> deletePattern(@PathVariable UUID patternId) {
        log.info("Deleting shift pattern: {}", patternId);
        shiftPatternService.deletePattern(patternId);
        return ResponseEntity.noContent().build();
    }

    // ========== Schedule Generation & Retrieval ==========

    @PostMapping("/generate-schedule")
    @RequiresPermission(Permission.SHIFT_MANAGE)
    public ResponseEntity<List<ScheduleEntryResponse>> generateSchedule(
            @Valid @RequestBody GenerateScheduleRequest request) {
        log.info("Generating schedule from {} to {}", request.getStartDate(), request.getEndDate());
        List<ScheduleEntryResponse> response = shiftScheduleService.generateSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/schedule")
    @RequiresPermission({Permission.SHIFT_VIEW, Permission.ATTENDANCE_VIEW_SELF})
    public ResponseEntity<List<ScheduleEntryResponse>> getEmployeeSchedule(
            @RequestParam UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Fetching schedule for employee {} from {} to {}", employeeId, startDate, endDate);
        List<ScheduleEntryResponse> response = shiftScheduleService.getEmployeeSchedule(employeeId, startDate, endDate);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/team-schedule")
    @RequiresPermission({Permission.SHIFT_VIEW, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<List<ScheduleEntryResponse>> getTeamSchedule(
            @RequestParam UUID managerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Fetching team schedule for manager {} from {} to {}", managerId, startDate, endDate);
        List<ScheduleEntryResponse> response = shiftScheduleService.getTeamSchedule(managerId, startDate, endDate);
        return ResponseEntity.ok(response);
    }

    // ========== Shift Rule Validation ==========

    @GetMapping("/validate-rules")
    @RequiresPermission(Permission.SHIFT_ASSIGN)
    public ResponseEntity<List<ShiftRuleViolation>> validateShiftRules(
            @RequestParam UUID employeeId,
            @RequestParam UUID shiftId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Validating shift rules for employee {} on {}", employeeId, date);
        List<ShiftRuleViolation> violations = shiftScheduleService.validateShiftRules(employeeId, shiftId, date);
        return ResponseEntity.ok(violations);
    }
}
