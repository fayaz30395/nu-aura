package com.hrms.api.overtime.controller;

import com.hrms.api.overtime.dto.OvertimeApprovalRequest;
import com.hrms.api.overtime.dto.OvertimeRecordRequest;
import com.hrms.api.overtime.dto.OvertimeRecordResponse;
import com.hrms.application.overtime.service.OvertimeManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import com.hrms.domain.overtime.CompTimeBalance;
import com.hrms.domain.overtime.CompTimeTransaction;

@RestController
@RequestMapping("/api/v1/overtime")
@RequiredArgsConstructor
@Slf4j
public class OvertimeManagementController {

    private final OvertimeManagementService overtimeManagementService;

    @PostMapping
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    public ResponseEntity<OvertimeRecordResponse> createOvertimeRecord(
            @Valid @RequestBody OvertimeRecordRequest request) {
        log.info("Creating overtime record for employee: {}", request.getEmployeeId());
        OvertimeRecordResponse response = overtimeManagementService.createOvertimeRecord(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{recordId}/approve")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<OvertimeRecordResponse> approveOrRejectOvertime(
            @PathVariable UUID recordId,
            @Valid @RequestBody OvertimeApprovalRequest request) {
        UUID approverId = SecurityContext.getCurrentEmployeeId() != null
                ? SecurityContext.getCurrentEmployeeId() : SecurityContext.getCurrentUserId();
        log.info("Processing approval for overtime record: {} by approver: {}", recordId, approverId);
        OvertimeRecordResponse response = overtimeManagementService
                .approveOrRejectOvertime(recordId, approverId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{recordId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<OvertimeRecordResponse> getOvertimeRecordById(@PathVariable UUID recordId) {
        log.info("Fetching overtime record: {}", recordId);
        OvertimeRecordResponse response = overtimeManagementService.getOvertimeRecordById(recordId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<OvertimeRecordResponse>> getEmployeeOvertimeRecords(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching overtime records for employee: {}", employeeId);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "overtimeDate"));
        Page<OvertimeRecordResponse> response = overtimeManagementService
                .getEmployeeOvertimeRecords(employeeId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<OvertimeRecordResponse>> getPendingOvertimeRecords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching pending overtime records");
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "overtimeDate"));
        Page<OvertimeRecordResponse> response = overtimeManagementService.getPendingOvertimeRecords(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<OvertimeRecordResponse>> getAllOvertimeRecords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "overtimeDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        log.info("Fetching all overtime records");
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<OvertimeRecordResponse> response = overtimeManagementService.getAllOvertimeRecords(pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{recordId}")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Void> deleteOvertimeRecord(@PathVariable UUID recordId) {
        log.info("Deleting overtime record: {}", recordId);
        overtimeManagementService.deleteOvertimeRecord(recordId);
        return ResponseEntity.noContent().build();
    }

    // ==================== COMP TIME ENDPOINTS ====================

    @GetMapping("/comp-time/balance/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Map<String, Object>> getCompTimeBalance(@PathVariable UUID employeeId) {
        log.info("Fetching comp time balance for employee: {}", employeeId);
        CompTimeBalance balance = overtimeManagementService.getCompTimeBalance(employeeId);
        BigDecimal totalBalance = overtimeManagementService.getTotalCompTimeBalance(employeeId);

        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("totalBalance", totalBalance);
        if (balance != null) {
            response.put("fiscalYear", balance.getFiscalYear());
            response.put("currentYearBalance", balance.getCurrentBalance());
            response.put("totalAccrued", balance.getTotalAccrued());
            response.put("totalUsed", balance.getTotalUsed());
            response.put("totalExpired", balance.getTotalExpired());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/comp-time/accrue")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Void> accrueCompTime(
            @RequestParam UUID employeeId,
            @RequestParam BigDecimal hours,
            @RequestParam(required = false) UUID overtimeRecordId,
            @RequestParam LocalDate overtimeDate) {
        log.info("Accruing {} comp time hours for employee: {}", hours, employeeId);
        overtimeManagementService.accrueCompTime(employeeId, hours, overtimeRecordId, overtimeDate);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/comp-time/use")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Void> useCompTime(
            @RequestParam UUID employeeId,
            @RequestParam BigDecimal hours,
            @RequestParam(required = false) UUID leaveRequestId,
            @RequestParam LocalDate usageDate) {
        log.info("Using {} comp time hours for employee: {}", hours, employeeId);
        overtimeManagementService.useCompTime(employeeId, hours, leaveRequestId, usageDate);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/comp-time/history/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<List<CompTimeTransaction>> getCompTimeHistory(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        log.info("Fetching comp time history for employee: {} from {} to {}", employeeId, startDate, endDate);
        List<CompTimeTransaction> history = overtimeManagementService.getCompTimeHistory(employeeId, startDate, endDate);
        return ResponseEntity.ok(history);
    }
}
