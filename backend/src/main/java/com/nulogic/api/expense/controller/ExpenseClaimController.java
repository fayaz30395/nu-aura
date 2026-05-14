package com.nulogic.api.expense.controller;

import com.nulogic.api.expense.dto.ExpenseClaimRequest;
import com.nulogic.api.expense.dto.ExpenseClaimResponse;
import com.nulogic.application.expense.service.ExpenseClaimService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.expense.ExpenseClaim;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Slf4j
@Validated
@Tag(name = "Expense Claims", description = "Employee expense claim submission, approval, and reimbursement APIs")
public class ExpenseClaimController {

    private final ExpenseClaimService expenseClaimService;
    private final TenantTimeService tenantTimeService;

    @PostMapping("/employees/{employeeId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Create expense claim for employee", description = "Creates a new expense claim on behalf of the specified employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Expense claim created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission")
    })
    public ResponseEntity<ExpenseClaimResponse> createExpenseClaimForEmployee(
            @Parameter(description = "Employee UUID") @PathVariable("employeeId") @NotNull UUID employeeId,
            @Valid @RequestBody ExpenseClaimRequest request) {
        log.info("Creating expense claim for employee: {}", employeeId);
        ExpenseClaimResponse response = expenseClaimService.createExpenseClaim(employeeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * BUG-EXP-001 FIX: Convenience POST endpoint for creating expense claims.
     * Resolves the current employee from SecurityContext so the frontend can
     * POST directly to /api/v1/expenses without knowing the employeeId.
     */
    @PostMapping
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Create expense claim", description = "Creates a new expense claim for the authenticated user (employeeId resolved from SecurityContext)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Expense claim created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data or missing employee context"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission")
    })
    public ResponseEntity<ExpenseClaimResponse> createExpenseClaim(
            @Valid @RequestBody ExpenseClaimRequest request) {
        UUID employeeId = com.nulogic.common.security.SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Creating expense claim for current employee: {}", employeeId);
        ExpenseClaimResponse response = expenseClaimService.createExpenseClaim(employeeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{claimId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Update expense claim", description = "Updates an existing draft expense claim")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Expense claim updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> updateExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId,
            @Valid @RequestBody ExpenseClaimRequest request) {
        log.info("Updating expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.updateExpenseClaim(claimId, request));
    }

    @PostMapping("/{claimId}/submit")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Submit expense claim", description = "Submits a draft expense claim for approval")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim submitted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> submitExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId) {
        log.info("Submitting expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.submitExpenseClaim(claimId));
    }

    @PostMapping("/{claimId}/approve")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    @Operation(summary = "Approve expense claim", description = "Approves a submitted expense claim")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim approved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> approveExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId) {
        log.info("Approving expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.approveExpenseClaim(claimId));
    }

    @PostMapping("/{claimId}/reject")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    @Operation(summary = "Reject expense claim", description = "Rejects a submitted expense claim with a reason")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim rejected successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or missing rejection reason"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> rejectExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId,
            @Parameter(description = "Rejection reason (max 1000 chars)") @NotBlank @Size(max = 1000) @RequestParam String reason) {
        log.info("Rejecting expense claim: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.rejectExpenseClaim(claimId, reason));
    }

    @PostMapping("/{claimId}/pay")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    @Operation(summary = "Mark claim as paid", description = "Records payment of an approved expense claim with a payment reference")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim marked as paid successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid payment data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> markAsPaid(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId,
            @Parameter(description = "Payment date (defaults to today if omitted)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paymentDate,
            @Parameter(description = "Payment reference number (max 255 chars)") @NotBlank @Size(max = 255) @RequestParam String paymentReference) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate effectiveDate = paymentDate != null ? paymentDate : tenantTimeService.today(tenantId);
        log.info("Marking expense claim as paid: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.markAsPaid(claimId, effectiveDate, paymentReference));
    }

    @PostMapping("/{claimId}/cancel")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Cancel expense claim", description = "Cancels an expense claim that has not yet been paid")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Claim cancelled successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<Void> cancelExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId) {
        log.info("Cancelling expense claim: {}", claimId);
        expenseClaimService.cancelExpenseClaim(claimId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{claimId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Delete expense claim", description = "Soft-deletes an expense claim record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Claim deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<Void> deleteExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId) {
        log.info("Deleting expense claim: {}", claimId);
        expenseClaimService.deleteExpenseClaim(claimId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statistics/{employeeId}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    @Operation(summary = "Get employee expense statistics", description = "Returns aggregated expense metrics for the specified employee and year")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<Map<String, Object>> getEmployeeStatistics(
            @Parameter(description = "Employee UUID") @PathVariable @NotNull UUID employeeId,
            @Parameter(description = "Filter year (defaults to current year if omitted)") @RequestParam(required = false) Integer year) {
        log.info("Getting expense statistics for employee: {}", employeeId);
        return ResponseEntity.ok(expenseClaimService.getEmployeeStatistics(employeeId, year));
    }

    @GetMapping("/{claimId}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    @Operation(summary = "Get expense claim", description = "Returns a single expense claim by its UUID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> getExpenseClaim(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaim(claimId));
    }

    @GetMapping
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    @Operation(summary = "List all expense claims", description = "Returns a paginated list of expense claims visible to the caller")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claims retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
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
    @Operation(summary = "List employee expense claims", description = "Returns a paginated list of expense claims for the specified employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claims retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByEmployee(
            @Parameter(description = "Employee UUID") @PathVariable("employeeId") @NotNull UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaimsByEmployee(employeeId, pageable));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    @Operation(summary = "List claims by status", description = "Returns a paginated list of expense claims filtered by status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claims retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByStatus(
            @Parameter(description = "Expense status filter") @PathVariable @NotNull ExpenseClaim.ExpenseStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(expenseClaimService.getExpenseClaimsByStatus(status, pageable));
    }

    @GetMapping("/pending-approvals")
    @RequiresPermission(Permission.EXPENSE_APPROVE)
    @Operation(summary = "Get pending approvals", description = "Returns a paginated list of expense claims awaiting the caller's approval")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pending claims retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:APPROVE permission")
    })
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
    @Operation(summary = "List claims by date range", description = "Returns expense claims with expense dates between the supplied start and end dates")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claims retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid date range"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<Page<ExpenseClaimResponse>> getExpenseClaimsByDateRange(
            @Parameter(description = "Range start (ISO yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end (ISO yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
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
    @Operation(summary = "Get expense summary", description = "Returns aggregated expense totals for the specified date range")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Summary retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid date range"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<Map<String, Object>> getExpenseSummary(
            @Parameter(description = "Range start (ISO yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end (ISO yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(expenseClaimService.getExpenseSummary(startDate, endDate));
    }

    // Note: GET /categories is handled by ExpenseCategoryController

    @GetMapping("/statuses")
    @RequiresPermission({
            Permission.EXPENSE_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_MANAGE
    })
    @Operation(summary = "List expense statuses", description = "Returns all valid expense claim status values")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Statuses retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:VIEW or related permission")
    })
    public ResponseEntity<ExpenseClaim.ExpenseStatus[]> getStatuses() {
        return ResponseEntity.ok(ExpenseClaim.ExpenseStatus.values());
    }

    @PostMapping("/{claimId}/reimburse")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    @Operation(summary = "Mark claim as reimbursed", description = "Records that a paid expense claim has been reimbursed to the employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Claim marked as reimbursed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or missing reimbursement reference"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Expense claim not found")
    })
    public ResponseEntity<ExpenseClaimResponse> markAsReimbursed(
            @Parameter(description = "Expense claim UUID") @PathVariable @NotNull UUID claimId,
            @Parameter(description = "Reimbursement reference (max 255 chars)") @NotBlank @Size(max = 255) @RequestParam String reimbursementRef) {
        log.info("Marking expense claim as reimbursed: {}", claimId);
        return ResponseEntity.ok(expenseClaimService.markAsReimbursed(claimId, reimbursementRef));
    }

    @GetMapping("/validate-policy")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    @Operation(summary = "Validate against policy", description = "Returns a list of policy violation messages for the proposed claim amount; empty list indicates the amount is compliant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Validation completed"),
            @ApiResponse(responseCode = "400", description = "Invalid amount or employee"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires EXPENSE:CREATE permission")
    })
    public ResponseEntity<List<String>> validatePolicy(
            @Parameter(description = "Employee UUID") @RequestParam @NotNull UUID employeeId,
            @Parameter(description = "Proposed expense amount") @RequestParam @NotNull java.math.BigDecimal amount) {
        return ResponseEntity.ok(expenseClaimService.validatePolicy(employeeId, amount));
    }
}
