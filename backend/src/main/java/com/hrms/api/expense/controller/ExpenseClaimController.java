package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.application.expense.service.ExpenseClaimService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.expense.ExpenseClaim;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpenseClaimController {

    private final ExpenseClaimService expenseClaimService;

    @PostMapping("/employees/{employeeId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseClaimResponse> createExpenseClaim(
            @PathVariable("employeeId") UUID employeeId,
            @Valid @RequestBody ExpenseClaimRequest request) {
        if (employeeId == null) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Creating expense claim for employee: {}", employeeId);
        ExpenseClaimResponse response = expenseClaimService.createExpenseClaim(employeeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{claimId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseClaimResponse> updateExpenseClaim(
            @PathVariable UUID claimId,
            @Valid @RequestBody ExpenseClaimRequest request) {
        log.info("Updating expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.updateExpenseClaim(claimId, request));
    }

    @PostMapping("/{claimId}/submit")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseClaimResponse> submitExpenseClaim(@PathVariable UUID claimId) {
        log.info("Submitting expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.submitExpenseClaim(claimId));
    }

    @PostMapping("/{claimId}/approve")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<ExpenseClaimResponse> approveExpenseClaim(
            @PathVariable UUID claimId) {
        log.info("Approving expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.approveExpenseClaim(claimId));
    }

    @PostMapping("/{claimId}/reject")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<ExpenseClaimResponse> rejectExpenseClaim(
            @PathVariable UUID claimId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        log.info("Rejecting expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.rejectExpenseClaim(claimId, reason));
    }

    @PostMapping("/{claimId}/pay")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpenseClaimResponse> markAsPaid(
            @PathVariable UUID claimId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paymentDate,
            @NotBlank @Size(max = 255) @RequestParam String paymentReference) {
        log.info("Marking expense claim as paid: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.markAsPaid(claimId, paymentDate, paymentReference));
    }

    @PostMapping("/{claimId}/cancel")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<Void> cancelExpenseClaim(@PathVariable UUID claimId) {
        log.info("Cancelling expense claim: {}", claimId);
        expenseClaimService.cancelExpenseClaim(claimId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{claimId}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<ExpenseClaimResponse> getExpenseClaim(@PathVariable UUID claimId) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaim(claimId));
    }

    @GetMapping
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getAllExpenseClaims(Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getAllExpenseClaims(pageable));
    }

    @GetMapping("/employees/{employeeId}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByEmployee(
            @PathVariable("employeeId") UUID employeeId,
            Pageable pageable) {
        if (employeeId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(expenseClaimService.getExpenseClaimsByEmployee(employeeId, pageable));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByStatus(
            @PathVariable ExpenseClaim.ExpenseStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaimsByStatus(status, pageable));
    }

    @GetMapping("/pending-approvals")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    public ResponseEntity<Page<ExpenseClaimResponse>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getPendingApprovals(pageable));
    }

    @GetMapping("/date-range")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaimsByDateRange(startDate, endDate, pageable));
    }

    @GetMapping("/summary")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<Map<String, Object>> getExpenseSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(expenseClaimService.getExpenseSummary(startDate, endDate));
    }

    @GetMapping("/categories")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<ExpenseClaim.ExpenseCategory[]> getCategories() {
        return ResponseEntity.ok(ExpenseClaim.ExpenseCategory.values());
    }

    @GetMapping("/statuses")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    public ResponseEntity<ExpenseClaim.ExpenseStatus[]> getStatuses() {
        return ResponseEntity.ok(ExpenseClaim.ExpenseStatus.values());
    }
}
