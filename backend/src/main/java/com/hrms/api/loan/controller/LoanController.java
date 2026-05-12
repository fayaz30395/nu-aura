package com.hrms.api.loan.controller;

import com.hrms.api.loan.dto.*;
import com.hrms.application.loan.service.LoanService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Tag(name = "Employee Loans", description = "Employee loan management")
public class LoanController {

    private final LoanService loanService;

    @PostMapping
    @RequiresPermission(Permission.LOAN_CREATE)
    @Operation(summary = "Apply for loan", description = "Submit a new loan application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Loan application submitted successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:CREATE permission")
    })
    public ResponseEntity<EmployeeLoanDto> applyForLoan(
            @Valid @RequestBody CreateLoanRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(loanService.applyForLoan(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.LOAN_VIEW)
    @Operation(summary = "Get loan", description = "Get loan by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> getLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(loanService.getById(id));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Approve loan", description = "Approve a pending loan application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan approved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid approved amount"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> approveLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApproveLoanRequest request
    ) {
        return ResponseEntity.ok(loanService.approveLoan(id,
                request != null ? request.getApprovedAmount() : null));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Reject loan", description = "Reject a pending loan application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan rejected successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> rejectLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id,
            @Valid @RequestBody RejectLoanRequest request
    ) {
        return ResponseEntity.ok(loanService.rejectLoan(id, request.getReason()));
    }

    @PostMapping("/{id}/disburse")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Disburse loan", description = "Mark loan as disbursed")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan disbursed successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> disburseLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(loanService.disburseLoan(id));
    }

    @PostMapping("/{id}/activate")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Activate loan", description = "Activate a disbursed loan for repayment")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan activated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> activateLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(loanService.activateLoan(id));
    }

    @PostMapping("/{id}/repayment")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Record repayment", description = "Record a loan repayment")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Repayment recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid repayment amount"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> recordRepayment(
            @Parameter(description = "Loan UUID") @PathVariable UUID id,
            @Valid @RequestBody RecordRepaymentRequest request
    ) {
        return ResponseEntity.ok(loanService.recordRepayment(id, request.getAmount()));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.LOAN_UPDATE)
    @Operation(summary = "Cancel loan", description = "Cancel a loan application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loan cancelled successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Loan not found")
    })
    public ResponseEntity<EmployeeLoanDto> cancelLoan(
            @Parameter(description = "Loan UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(loanService.cancelLoan(id));
    }

    @GetMapping("/my")
    @RequiresPermission(Permission.LOAN_VIEW)
    @Operation(summary = "Get my loans", description = "Get current user's loan applications")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loans retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:VIEW permission")
    })
    public ResponseEntity<Page<EmployeeLoanDto>> getMyLoans(Pageable pageable) {
        return ResponseEntity.ok(loanService.getMyLoans(pageable));
    }

    @GetMapping("/pending")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Get pending approvals", description = "Get loans pending approval")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pending loans retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:APPROVE permission")
    })
    public ResponseEntity<Page<EmployeeLoanDto>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(loanService.getPendingApprovals(pageable));
    }

    @GetMapping
    @RequiresPermission(Permission.LOAN_VIEW_ALL)
    @Operation(summary = "Get all loans", description = "Get all loans with optional status filter")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Loans retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:VIEW_ALL permission")
    })
    public ResponseEntity<Page<EmployeeLoanDto>> getAllLoans(
            @Parameter(description = "Filter by loan status") @RequestParam(required = false) LoanStatus status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(loanService.getAllLoans(status, pageable));
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.LOAN_VIEW_ALL)
    @Operation(summary = "Get active loans", description = "Get all active and disbursed loans")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Active loans retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LOAN:VIEW_ALL permission")
    })
    public ResponseEntity<List<EmployeeLoanDto>> getActiveLoans() {
        return ResponseEntity.ok(loanService.getActiveLoans());
    }
}
