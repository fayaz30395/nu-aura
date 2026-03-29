package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.ExpenseAdvanceRequest;
import com.hrms.api.expense.dto.ExpenseAdvanceResponse;
import com.hrms.application.expense.service.ExpenseAdvanceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/expenses/advances")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpenseAdvanceController {

    private final ExpenseAdvanceService advanceService;

    @PostMapping("/employees/{employeeId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseAdvanceResponse> createAdvance(
            @PathVariable UUID employeeId,
            @Valid @RequestBody ExpenseAdvanceRequest request) {
        log.info("Creating expense advance for employee: {}", employeeId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(advanceService.createAdvance(employeeId, request));
    }

    @PostMapping("/{advanceId}/approve")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<ExpenseAdvanceResponse> approveAdvance(@PathVariable UUID advanceId) {
        log.info("Approving expense advance: {}", advanceId);
        return ResponseEntity.ok(advanceService.approveAdvance(advanceId));
    }

    @PostMapping("/{advanceId}/disburse")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpenseAdvanceResponse> disburseAdvance(@PathVariable UUID advanceId) {
        log.info("Disbursing expense advance: {}", advanceId);
        return ResponseEntity.ok(advanceService.disburseAdvance(advanceId));
    }

    @PostMapping("/{advanceId}/settle")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseAdvanceResponse> settleAdvance(
            @PathVariable UUID advanceId,
            @RequestParam UUID claimId) {
        log.info("Settling expense advance: {} with claim: {}", advanceId, claimId);
        return ResponseEntity.ok(advanceService.settleAdvance(advanceId, claimId));
    }

    @PostMapping("/{advanceId}/cancel")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<Void> cancelAdvance(@PathVariable UUID advanceId) {
        log.info("Cancelling expense advance: {}", advanceId);
        advanceService.cancelAdvance(advanceId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{advanceId}")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM, Permission.EXPENSE_VIEW_ALL})
    public ResponseEntity<ExpenseAdvanceResponse> getAdvance(@PathVariable UUID advanceId) {
        return ResponseEntity.ok(advanceService.getAdvance(advanceId));
    }

    @GetMapping("/employees/{employeeId}")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM, Permission.EXPENSE_VIEW_ALL})
    public ResponseEntity<Page<ExpenseAdvanceResponse>> getAdvancesByEmployee(
            @PathVariable UUID employeeId, Pageable pageable) {
        return ResponseEntity.ok(advanceService.getAdvancesByEmployee(employeeId, pageable));
    }

    @GetMapping
    @RequiresPermission({Permission.EXPENSE_VIEW_ALL, Permission.EXPENSE_MANAGE})
    public ResponseEntity<Page<ExpenseAdvanceResponse>> getAllAdvances(Pageable pageable) {
        return ResponseEntity.ok(advanceService.getAllAdvances(pageable));
    }
}
