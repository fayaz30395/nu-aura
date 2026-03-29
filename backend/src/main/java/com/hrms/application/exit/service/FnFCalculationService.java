package com.hrms.application.exit.service;

import com.hrms.application.exit.dto.FnFAdjustmentRequest;
import com.hrms.application.exit.dto.FnFCalculationResponse;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.exit.ExitProcess;
import com.hrms.domain.exit.FullAndFinalSettlement;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.exit.repository.ExitProcessRepository;
import com.hrms.infrastructure.exit.repository.FullAndFinalSettlementRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@Slf4j
public class FnFCalculationService {

    private final FullAndFinalSettlementRepository fnfRepository;
    private final ExitProcessRepository exitProcessRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;

    public FnFCalculationService(FullAndFinalSettlementRepository fnfRepository,
                                 ExitProcessRepository exitProcessRepository,
                                 EmployeeRepository employeeRepository,
                                 SalaryStructureRepository salaryStructureRepository) {
        this.fnfRepository = fnfRepository;
        this.exitProcessRepository = exitProcessRepository;
        this.employeeRepository = employeeRepository;
        this.salaryStructureRepository = salaryStructureRepository;
    }

    /**
     * Get or auto-calculate FnF for an exit process.
     * If a settlement already exists, return it. Otherwise compute from employee data.
     */
    @Transactional
    public FnFCalculationResponse getOrCalculate(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExitProcess exitProcess = exitProcessRepository.findById(exitProcessId)
                .orElseThrow(() -> new RuntimeException("Exit process not found"));

        // Return existing settlement if present
        return fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .map(this::mapToResponse)
                .orElseGet(() -> {
                    FullAndFinalSettlement settlement = computeSettlement(exitProcess, tenantId);
                    fnfRepository.save(settlement);
                    return mapToResponse(settlement);
                });
    }

    /**
     * Apply manual HR adjustments to the settlement (deductions, allowances, remarks).
     */
    @Transactional
    public FnFCalculationResponse addAdjustment(UUID exitProcessId, FnFAdjustmentRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        FullAndFinalSettlement settlement = fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new RuntimeException("Settlement not found — call getOrCalculate first"));

        if (req.getNoticeBuyout() != null) settlement.setNoticeBuyout(req.getNoticeBuyout());
        if (req.getLoanRecovery() != null) settlement.setLoanRecovery(req.getLoanRecovery());
        if (req.getAdvanceRecovery() != null) settlement.setAdvanceRecovery(req.getAdvanceRecovery());
        if (req.getAssetDamageDeduction() != null) settlement.setAssetDamageDeduction(req.getAssetDamageDeduction());
        if (req.getTaxDeduction() != null) settlement.setTaxDeduction(req.getTaxDeduction());
        if (req.getOtherDeductions() != null) settlement.setOtherDeductions(req.getOtherDeductions());
        if (req.getOtherEarnings() != null) settlement.setOtherEarnings(req.getOtherEarnings());
        if (req.getReimbursements() != null) settlement.setReimbursements(req.getReimbursements());
        if (req.getRemarks() != null) settlement.setRemarks(req.getRemarks());
        if (req.getPaymentMode() != null) settlement.setPaymentMode(req.getPaymentMode());

        settlement.calculateTotals();
        fnfRepository.save(settlement);
        return mapToResponse(settlement);
    }

    /**
     * HR approves the settlement and moves it to APPROVED status.
     */
    @Transactional
    public FnFCalculationResponse approve(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        FullAndFinalSettlement settlement = fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new RuntimeException("Settlement not found"));

        if (settlement.getStatus() != FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL
                && settlement.getStatus() != FullAndFinalSettlement.SettlementStatus.DRAFT) {
            throw new IllegalStateException("Settlement is not in a state that can be approved: " + settlement.getStatus());
        }

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.APPROVED);
        settlement.setApprovalDate(LocalDate.now());
        settlement.setApprovedBy(SecurityContext.getCurrentUserId());
        fnfRepository.save(settlement);
        return mapToResponse(settlement);
    }

    @Transactional(readOnly = true)
    public Page<FnFCalculationResponse> getAll(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return fnfRepository.findByTenantId(tenantId, pageable).map(this::mapToResponse);
    }

    // -------------------------------------------------------------------------

    private FullAndFinalSettlement computeSettlement(ExitProcess exitProcess, UUID tenantId) {
        Employee employee = employeeRepository.findById(exitProcess.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                .exitProcessId(exitProcess.getId())
                .employeeId(exitProcess.getEmployeeId())
                .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                .build();
        settlement.setTenantId(tenantId);

        BigDecimal baseSalary = salaryStructureRepository
                .findActiveByEmployeeIdAndDate(tenantId, employee.getId(), LocalDate.now())
                .map(SalaryStructure::getBasicSalary)
                .orElse(BigDecimal.ZERO);

        // Years of service
        LocalDate joiningDate = employee.getJoiningDate();
        LocalDate lastWorkingDate = exitProcess.getLastWorkingDate() != null
                ? exitProcess.getLastWorkingDate() : LocalDate.now();

        if (joiningDate != null) {
            long days = ChronoUnit.DAYS.between(joiningDate, lastWorkingDate);
            BigDecimal years = BigDecimal.valueOf(days).divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP);
            settlement.setYearsOfService(years);
            settlement.setLastDrawnSalary(baseSalary);
            settlement.calculateGratuity();
        }

        // Pending salary: pro-rated for current month
        if (baseSalary.compareTo(BigDecimal.ZERO) > 0) {
            int daysWorkedThisMonth = lastWorkingDate.getDayOfMonth();
            int daysInMonth = lastWorkingDate.lengthOfMonth();
            BigDecimal proRated = baseSalary
                    .multiply(BigDecimal.valueOf(daysWorkedThisMonth))
                    .divide(BigDecimal.valueOf(daysInMonth), 2, RoundingMode.HALF_UP);
            settlement.setPendingSalary(proRated);
        }

        settlement.calculateTotals();
        log.info("Computed FnF for employee {} — net payable: {}", exitProcess.getEmployeeId(), settlement.getNetPayable());
        return settlement;
    }

    private FnFCalculationResponse mapToResponse(FullAndFinalSettlement s) {
        String empName = employeeRepository.findById(s.getEmployeeId())
                .map(Employee::getFullName)
                .orElse("Unknown");

        return FnFCalculationResponse.builder()
                .id(s.getId())
                .exitProcessId(s.getExitProcessId())
                .employeeId(s.getEmployeeId())
                .employeeName(empName)
                .pendingSalary(s.getPendingSalary())
                .leaveEncashment(s.getLeaveEncashment())
                .bonusAmount(s.getBonusAmount())
                .gratuityAmount(s.getGratuityAmount())
                .noticePeriodRecovery(s.getNoticePeriodRecovery())
                .reimbursements(s.getReimbursements())
                .otherEarnings(s.getOtherEarnings())
                .noticeBuyout(s.getNoticeBuyout())
                .loanRecovery(s.getLoanRecovery())
                .advanceRecovery(s.getAdvanceRecovery())
                .assetDamageDeduction(s.getAssetDamageDeduction())
                .taxDeduction(s.getTaxDeduction())
                .otherDeductions(s.getOtherDeductions())
                .totalEarnings(s.getTotalEarnings())
                .totalDeductions(s.getTotalDeductions())
                .netPayable(s.getNetPayable())
                .yearsOfService(s.getYearsOfService())
                .isGratuityEligible(s.getIsGratuityEligible())
                .lastDrawnSalary(s.getLastDrawnSalary())
                .status(s.getStatus())
                .paymentMode(s.getPaymentMode())
                .paymentReference(s.getPaymentReference())
                .paymentDate(s.getPaymentDate())
                .remarks(s.getRemarks())
                .approvalDate(s.getApprovalDate())
                .build();
    }
}
