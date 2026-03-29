package com.hrms.application.loan.service;

import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.EmployeeLoanDto;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.loan.EmployeeLoan;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.loan.repository.EmployeeLoanRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class LoanService implements ApprovalCallbackHandler {

    private final EmployeeLoanRepository loanRepository;
    private final WorkflowService workflowService;

    public LoanService(EmployeeLoanRepository loanRepository,
                       @org.springframework.context.annotation.Lazy WorkflowService workflowService) {
        this.loanRepository = loanRepository;
        this.workflowService = workflowService;
    }

    @Transactional
    public EmployeeLoanDto applyForLoan(CreateLoanRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        EmployeeLoan loan = EmployeeLoan.builder()
                .employeeId(employeeId)
                .loanNumber(generateLoanNumber())
                .loanType(request.getLoanType())
                .principalAmount(request.getPrincipalAmount())
                .interestRate(request.getInterestRate() != null ? request.getInterestRate() : BigDecimal.ZERO)
                .tenureMonths(request.getTenureMonths())
                .purpose(request.getPurpose())
                .requestedDate(LocalDate.now())
                .isSalaryDeduction(request.getIsSalaryDeduction() != null ? request.getIsSalaryDeduction() : true)
                .guarantorName(request.getGuarantorName())
                .guarantorEmployeeId(request.getGuarantorEmployeeId())
                .remarks(request.getRemarks())
                .status(LoanStatus.PENDING)
                .build();

        loan.calculateEmi();
        loan.setTenantId(tenantId);

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan application created: {}", saved.getLoanNumber());

        // Start approval workflow (Manager -> Finance Head)
        startLoanApprovalWorkflow(saved, tenantId);

        return EmployeeLoanDto.fromEntity(saved);
    }

    @Transactional
    public EmployeeLoanDto approveLoan(UUID loanId, BigDecimal approvedAmount) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new IllegalStateException("Cannot approve loan in status: " + loan.getStatus());
        }

        if (approvedAmount != null && approvedAmount.compareTo(loan.getPrincipalAmount()) <= 0) {
            loan.setPrincipalAmount(approvedAmount);
            loan.calculateEmi();
        }

        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedBy(approverId);
        loan.setApprovedDate(LocalDate.now());

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan approved: {} by {}", saved.getLoanNumber(), approverId);
        return EmployeeLoanDto.fromEntity(saved);
    }

    @Transactional
    public EmployeeLoanDto rejectLoan(UUID loanId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new IllegalStateException("Cannot reject loan in status: " + loan.getStatus());
        }

        loan.setStatus(LoanStatus.REJECTED);
        loan.setApprovedBy(approverId);
        loan.setApprovedDate(LocalDate.now());
        loan.setRejectedReason(reason);

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan rejected: {} by {}", saved.getLoanNumber(), approverId);
        return EmployeeLoanDto.fromEntity(saved);
    }

    public EmployeeLoanDto disburseLoan(UUID loanId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Cannot disburse loan in status: " + loan.getStatus());
        }

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursementDate(LocalDate.now());
        loan.setFirstEmiDate(LocalDate.now().plusMonths(1).withDayOfMonth(1));
        loan.setLastEmiDate(loan.getFirstEmiDate().plusMonths(loan.getTenureMonths() - 1));

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan disbursed: {}", saved.getLoanNumber());
        return EmployeeLoanDto.fromEntity(saved);
    }

    public EmployeeLoanDto activateLoan(UUID loanId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.DISBURSED) {
            throw new IllegalStateException("Cannot activate loan in status: " + loan.getStatus());
        }

        loan.setStatus(LoanStatus.ACTIVE);

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan activated: {}", saved.getLoanNumber());
        return EmployeeLoanDto.fromEntity(saved);
    }

    public EmployeeLoanDto recordRepayment(UUID loanId, BigDecimal amount) {
        UUID tenantId = TenantContext.getCurrentTenant();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() != LoanStatus.ACTIVE && loan.getStatus() != LoanStatus.DISBURSED) {
            throw new IllegalStateException("Cannot record repayment for loan in status: " + loan.getStatus());
        }

        BigDecimal newOutstanding = loan.getOutstandingAmount().subtract(amount);
        if (newOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            newOutstanding = BigDecimal.ZERO;
        }

        loan.setOutstandingAmount(newOutstanding);

        if (newOutstanding.compareTo(BigDecimal.ZERO) == 0) {
            loan.setStatus(LoanStatus.CLOSED);
            log.info("Loan fully repaid and closed: {}", loan.getLoanNumber());
        }

        EmployeeLoan saved = loanRepository.save(loan);
        return EmployeeLoanDto.fromEntity(saved);
    }

    @Transactional
    public EmployeeLoanDto cancelLoan(UUID loanId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (loan.getStatus() == LoanStatus.ACTIVE || loan.getStatus() == LoanStatus.CLOSED) {
            throw new IllegalStateException("Cannot cancel loan in status: " + loan.getStatus());
        }

        loan.setStatus(LoanStatus.CANCELLED);

        EmployeeLoan saved = loanRepository.save(loan);
        log.info("Loan cancelled: {}", saved.getLoanNumber());
        return EmployeeLoanDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public EmployeeLoanDto getById(UUID loanId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeLoan loan = loanRepository.findByIdAndTenantId(loanId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        return EmployeeLoanDto.fromEntity(loan);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeLoanDto> getMyLoans(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return loanRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(EmployeeLoanDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeLoanDto> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return loanRepository.findByTenantIdAndStatus(tenantId, LoanStatus.PENDING, pageable)
                .map(EmployeeLoanDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeLoanDto> getAllLoans(LoanStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (status != null) {
            return loanRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                    .map(EmployeeLoanDto::fromEntity);
        }
        return loanRepository.findByTenantId(tenantId, pageable)
                .map(EmployeeLoanDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<EmployeeLoanDto> getActiveLoans() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return loanRepository.findByTenantIdAndStatusIn(
                tenantId,
                List.of(LoanStatus.ACTIVE, LoanStatus.DISBURSED)
        ).stream().map(EmployeeLoanDto::fromEntity).collect(Collectors.toList());
    }

    // ======================== ApprovalCallbackHandler ========================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.LOAN_REQUEST;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Loan {} approved via workflow by {}", entityId, approvedBy);

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (loan == null) {
            log.warn("Loan {} not found for approval callback", entityId);
            return;
        }

        if (loan.getStatus() != LoanStatus.PENDING) {
            log.warn("Loan {} already in status {}, skipping approval", entityId, loan.getStatus());
            return;
        }

        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedBy(approvedBy);
        loan.setApprovedDate(LocalDate.now());
        loanRepository.save(loan);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Loan {} rejected via workflow by {}", entityId, rejectedBy);

        EmployeeLoan loan = loanRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (loan == null) {
            log.warn("Loan {} not found for rejection callback", entityId);
            return;
        }

        if (loan.getStatus() != LoanStatus.PENDING) {
            log.warn("Loan {} already in status {}, skipping rejection", entityId, loan.getStatus());
            return;
        }

        loan.setStatus(LoanStatus.REJECTED);
        loan.setApprovedBy(rejectedBy);
        loan.setApprovedDate(LocalDate.now());
        loan.setRejectedReason(reason);
        loanRepository.save(loan);
    }

    private void startLoanApprovalWorkflow(EmployeeLoan loan, UUID tenantId) {
        try {
            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.LOAN_REQUEST);
            workflowRequest.setEntityId(loan.getId());
            workflowRequest.setTitle("Loan Approval: " + loan.getLoanNumber()
                    + " - " + loan.getLoanType() + " (" + loan.getPrincipalAmount() + ")");
            workflowRequest.setAmount(loan.getPrincipalAmount());

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for loan: {}", loan.getLoanNumber());
        } catch (Exception e) {
            log.warn("Could not start approval workflow for loan {}: {}",
                    loan.getLoanNumber(), e.getMessage());
        }
    }

    private String generateLoanNumber() {
        return "LN-" + System.currentTimeMillis();
    }
}
