package com.nulogic.application.exit.service;

import com.nulogic.application.exit.dto.FnFAdjustmentRequest;
import com.nulogic.application.exit.dto.FnFCalculationResponse;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.exit.ExitProcess;
import com.nulogic.domain.exit.FullAndFinalSettlement;
import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.exit.repository.ExitProcessRepository;
import com.nulogic.infrastructure.exit.repository.FullAndFinalSettlementRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class FnFCalculationService {

    private final FullAndFinalSettlementRepository fnfRepository;
    private final ExitProcessRepository exitProcessRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final TenantTimeService tenantTimeService;

    /**
     * Get or auto-calculate FnF for an exit process.
     * If a settlement already exists, return it. Otherwise compute from employee data.
     */
    @Transactional
    public FnFCalculationResponse getOrCalculate(UUID exitProcessId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Exit process not found: " + exitProcessId));

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
        UUID tenantId = TenantContext.requireCurrentTenant();

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
        UUID tenantId = TenantContext.requireCurrentTenant();

        FullAndFinalSettlement settlement = fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new RuntimeException("Settlement not found"));

        if (settlement.getStatus() != FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL
                && settlement.getStatus() != FullAndFinalSettlement.SettlementStatus.DRAFT) {
            throw new IllegalStateException("Settlement is not in a state that can be approved: " + settlement.getStatus());
        }

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.APPROVED);
        // P0 Wave 3: tenant-local "today" for settlement approval date — resolved via TenantTimeService.
        settlement.setApprovalDate(tenantTimeService.today(tenantId));
        settlement.setApprovedBy(SecurityContext.getCurrentUserId());
        fnfRepository.save(settlement);
        return mapToResponse(settlement);
    }

    @Transactional(readOnly = true)
    public Page<FnFCalculationResponse> getAll(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return fnfRepository.findByTenantId(tenantId, pageable).map(this::mapToResponse);
    }

    // -------------------------------------------------------------------------

    private FullAndFinalSettlement computeSettlement(ExitProcess exitProcess, UUID tenantId) {
        Employee employee = employeeRepository.findByIdAndTenantId(exitProcess.getEmployeeId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                .exitProcessId(exitProcess.getId())
                .employeeId(exitProcess.getEmployeeId())
                .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                .build();
        settlement.setTenantId(tenantId);

        // P0 Wave 3: tenant-local "today" for active-salary lookup — resolved via TenantTimeService.
        LocalDate today = tenantTimeService.today(tenantId);
        BigDecimal baseSalary = salaryStructureRepository
                .findActiveByEmployeeIdAndDate(tenantId, employee.getId(), today)
                .map(SalaryStructure::getBasicSalary)
                .orElse(BigDecimal.ZERO);

        // Years of service
        LocalDate joiningDate = employee.getJoiningDate();
        // P0 Wave 3: fall back to tenant-local "today" when last-working-date is absent.
        LocalDate lastWorkingDate = exitProcess.getLastWorkingDate() != null
                ? exitProcess.getLastWorkingDate() : today;

        if (joiningDate != null) {
            // F1.3: Use Period for leap-year-correct YMD breakdown instead of days/365,
            // which drifts ~1 day per 4 years and can wrongly disqualify employees on the
            // 5-year boundary.
            Period period = Period.between(joiningDate, lastWorkingDate);
            int years = period.getYears();
            int months = period.getMonths();
            long daysInLastYear = ChronoUnit.DAYS.between(joiningDate.plusYears(years), lastWorkingDate);

            // 240-day rule per Madras HC + SC (Mettur Beardsell / Indian Hume Pipe Co.):
            // a 4-year + 240-day tenure qualifies as 5 years of continuous service for
            // gratuity under §2A of the Payment of Gratuity Act, 1972.
            boolean eligibleViaTenure = years >= 5;
            boolean eligibleVia240Rule = years == 4 && daysInLastYear >= 240;

            if (!eligibleViaTenure && !eligibleVia240Rule) {
                settlement.setIsGratuityEligible(false);
                settlement.setLastDrawnSalary(baseSalary);
                settlement.setYearsOfService(
                        BigDecimal.valueOf(years).add(
                                BigDecimal.valueOf(months).divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP)));
                settlement.setGratuityAmount(BigDecimal.ZERO);
            } else {
                // For statutory calculation, round up tenure ≥ 6 months in the final year
                // to a full year (§4(2) Payment of Gratuity Act). Years-only completed
                // service counts otherwise.
                int gratuityYears = years + (months >= 6 ? 1 : 0);
                BigDecimal yearsOfService = BigDecimal.valueOf(gratuityYears).setScale(2, RoundingMode.HALF_UP);

                // 240-day rule: when invoked, treat as 5 completed years for the formula.
                if (!eligibleViaTenure && eligibleVia240Rule) {
                    yearsOfService = new BigDecimal("5").setScale(2, RoundingMode.HALF_UP);
                }

                settlement.setYearsOfService(yearsOfService);
                settlement.setLastDrawnSalary(baseSalary);
                settlement.calculateGratuity();
            }
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
