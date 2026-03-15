package com.hrms.application.loan.service;

import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.EmployeeLoanDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.loan.EmployeeLoan;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import com.hrms.infrastructure.loan.repository.EmployeeLoanRepository;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LoanService {

    private final EmployeeLoanRepository loanRepository;

    @Transactional
    public EmployeeLoanDto applyForLoan(CreateLoanRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();

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
        UUID employeeId = SecurityContext.getCurrentUserId();
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

    private String generateLoanNumber() {
        return "LN-" + System.currentTimeMillis();
    }
}
