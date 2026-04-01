package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.MileageLogRequest;
import com.hrms.api.expense.dto.MileageLogResponse;
import com.hrms.api.expense.dto.MileageSummaryResponse;
import com.hrms.application.expense.service.MileageService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/mileage")
@RequiredArgsConstructor
@Slf4j
@Validated
public class MileageController {

    private final MileageService mileageService;

    @PostMapping("/employees/{employeeId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<MileageLogResponse> createMileageLog(
            @PathVariable @NotNull UUID employeeId,
            @Valid @RequestBody MileageLogRequest request) {
        log.info("Creating mileage log for employee: {}", employeeId);
        MileageLogResponse response = mileageService.createMileageLog(employeeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{logId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<MileageLogResponse> updateMileageLog(
            @PathVariable @NotNull UUID logId,
            @Valid @RequestBody MileageLogRequest request) {
        log.info("Updating mileage log: {}", logId);
        return ResponseEntity.ok(mileageService.updateMileageLog(logId, request));
    }

    @PostMapping("/{logId}/submit")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<MileageLogResponse> submitMileageLog(@PathVariable @NotNull UUID logId) {
        log.info("Submitting mileage log: {}", logId);
        return ResponseEntity.ok(mileageService.submitMileageLog(logId));
    }

    @PostMapping("/{logId}/approve")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<MileageLogResponse> approveMileageLog(@PathVariable @NotNull UUID logId) {
        log.info("Approving mileage log: {}", logId);
        return ResponseEntity.ok(mileageService.approveMileageLog(logId));
    }

    @PostMapping("/{logId}/reject")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<MileageLogResponse> rejectMileageLog(
            @PathVariable @NotNull UUID logId,
            @NotBlank @Size(max = 500) @RequestParam String reason) {
        log.info("Rejecting mileage log: {}", logId);
        return ResponseEntity.ok(mileageService.rejectMileageLog(logId, reason));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL, Permission.EXPENSE_MANAGE})
    public ResponseEntity<Page<MileageLogResponse>> getEmployeeMileageLogs(
            @PathVariable @NotNull UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(mileageService.getEmployeeMileageLogs(employeeId, pageable));
    }

    @GetMapping("/summary/{employeeId}")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL, Permission.EXPENSE_MANAGE})
    public ResponseEntity<MileageSummaryResponse> getMonthlySummary(
            @PathVariable @NotNull UUID employeeId,
            @RequestParam @Min(2020) @Max(2100) int year,
            @RequestParam @Min(1) @Max(12) int month) {
        return ResponseEntity.ok(mileageService.getMonthlySummary(employeeId, year, month));
    }

    @GetMapping("/pending-approvals")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<Page<MileageLogResponse>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(mileageService.getPendingApprovals(pageable));
    }
}
