package com.hrms.api.loan.controller;

import com.hrms.api.loan.dto.ApproveLoanRequest;
import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.EmployeeLoanDto;
import com.hrms.api.loan.dto.RecordRepaymentRequest;
import com.hrms.api.loan.dto.RejectLoanRequest;
import com.hrms.application.loan.service.LoanService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public ResponseEntity<EmployeeLoanDto> applyForLoan(
            @Valid @RequestBody CreateLoanRequest request
    ) {
        return ResponseEntity.ok(loanService.applyForLoan(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.LOAN_VIEW)
    @Operation(summary = "Get loan", description = "Get loan by ID")
    public ResponseEntity<EmployeeLoanDto> getLoan(@PathVariable UUID id) {
        return ResponseEntity.ok(loanService.getById(id));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Approve loan", description = "Approve a pending loan application")
    public ResponseEntity<EmployeeLoanDto> approveLoan(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApproveLoanRequest request
    ) {
        return ResponseEntity.ok(loanService.approveLoan(id,
                request != null ? request.getApprovedAmount() : null));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Reject loan", description = "Reject a pending loan application")
    public ResponseEntity<EmployeeLoanDto> rejectLoan(
            @PathVariable UUID id,
            @Valid @RequestBody RejectLoanRequest request
    ) {
        return ResponseEntity.ok(loanService.rejectLoan(id, request.getReason()));
    }

    @PostMapping("/{id}/disburse")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Disburse loan", description = "Mark loan as disbursed")
    public ResponseEntity<EmployeeLoanDto> disburseLoan(@PathVariable UUID id) {
        return ResponseEntity.ok(loanService.disburseLoan(id));
    }

    @PostMapping("/{id}/activate")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Activate loan", description = "Activate a disbursed loan for repayment")
    public ResponseEntity<EmployeeLoanDto> activateLoan(@PathVariable UUID id) {
        return ResponseEntity.ok(loanService.activateLoan(id));
    }

    @PostMapping("/{id}/repayment")
    @RequiresPermission(Permission.LOAN_MANAGE)
    @Operation(summary = "Record repayment", description = "Record a loan repayment")
    public ResponseEntity<EmployeeLoanDto> recordRepayment(
            @PathVariable UUID id,
            @Valid @RequestBody RecordRepaymentRequest request
    ) {
        return ResponseEntity.ok(loanService.recordRepayment(id, request.getAmount()));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.LOAN_UPDATE)
    @Operation(summary = "Cancel loan", description = "Cancel a loan application")
    public ResponseEntity<EmployeeLoanDto> cancelLoan(@PathVariable UUID id) {
        return ResponseEntity.ok(loanService.cancelLoan(id));
    }

    @GetMapping("/my")
    @RequiresPermission(Permission.LOAN_VIEW)
    @Operation(summary = "Get my loans", description = "Get current user's loan applications")
    public ResponseEntity<Page<EmployeeLoanDto>> getMyLoans(Pageable pageable) {
        return ResponseEntity.ok(loanService.getMyLoans(pageable));
    }

    @GetMapping("/pending")
    @RequiresPermission(Permission.LOAN_APPROVE)
    @Operation(summary = "Get pending approvals", description = "Get loans pending approval")
    public ResponseEntity<Page<EmployeeLoanDto>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(loanService.getPendingApprovals(pageable));
    }

    @GetMapping
    @RequiresPermission(Permission.LOAN_VIEW_ALL)
    @Operation(summary = "Get all loans", description = "Get all loans with optional status filter")
    public ResponseEntity<Page<EmployeeLoanDto>> getAllLoans(
            @RequestParam(required = false) LoanStatus status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(loanService.getAllLoans(status, pageable));
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.LOAN_VIEW_ALL)
    @Operation(summary = "Get active loans", description = "Get all active and disbursed loans")
    public ResponseEntity<List<EmployeeLoanDto>> getActiveLoans() {
        return ResponseEntity.ok(loanService.getActiveLoans());
    }
}
