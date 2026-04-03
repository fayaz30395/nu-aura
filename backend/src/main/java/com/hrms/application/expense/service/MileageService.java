package com.hrms.application.expense.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.MileageLogRequest;
import com.hrms.api.expense.dto.MileageLogResponse;
import com.hrms.api.expense.dto.MileageSummaryResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.expense.MileageLog;
import com.hrms.domain.expense.MileagePolicy;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.expense.repository.MileageLogRepository;
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
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MileageService {

    private final MileageLogRepository mileageLogRepository;
    private final MileagePolicyService mileagePolicyService;
    private final ExpenseClaimRepository expenseClaimRepository;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public MileageLogResponse createMileageLog(UUID employeeId, MileageLogRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (!employeeRepository.existsByIdAndTenantId(employeeId, tenantId)) {
            throw new EntityNotFoundException("Employee not found: " + employeeId);
        }

        validateDistance(request.distanceKm());

        MileagePolicy policy = mileagePolicyService.getActivePolicy(tenantId);
        BigDecimal ratePerKm = resolveRate(policy, request.vehicleType());
        BigDecimal reimbursementAmount = request.distanceKm().multiply(ratePerKm).setScale(2, RoundingMode.HALF_UP);

        MileageLog mileageLog = MileageLog.builder()
                .employeeId(employeeId)
                .travelDate(request.travelDate())
                .fromLocation(request.fromLocation())
                .toLocation(request.toLocation())
                .distanceKm(request.distanceKm())
                .purpose(request.purpose())
                .vehicleType(request.vehicleType())
                .ratePerKm(ratePerKm)
                .reimbursementAmount(reimbursementAmount)
                .status(MileageLog.MileageStatus.DRAFT)
                .notes(request.notes())
                .build();
        mileageLog.setTenantId(tenantId);

        MileageLog saved = mileageLogRepository.save(mileageLog);
        log.info("Created mileage log for employee: {} distance: {}km", employeeId, request.distanceKm());

        return enrichResponse(MileageLogResponse.fromEntity(saved));
    }

    @Transactional
    public MileageLogResponse updateMileageLog(UUID logId, MileageLogRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        MileageLog mileageLog = mileageLogRepository.findByIdAndTenantId(logId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage log not found: " + logId));

        if (mileageLog.getStatus() != MileageLog.MileageStatus.DRAFT) {
            throw new IllegalStateException("Can only update mileage logs in DRAFT status");
        }

        validateDistance(request.distanceKm());

        MileagePolicy policy = mileagePolicyService.getActivePolicy(tenantId);
        BigDecimal ratePerKm = resolveRate(policy, request.vehicleType());
        BigDecimal reimbursementAmount = request.distanceKm().multiply(ratePerKm).setScale(2, RoundingMode.HALF_UP);

        mileageLog.setTravelDate(request.travelDate());
        mileageLog.setFromLocation(request.fromLocation());
        mileageLog.setToLocation(request.toLocation());
        mileageLog.setDistanceKm(request.distanceKm());
        mileageLog.setPurpose(request.purpose());
        mileageLog.setVehicleType(request.vehicleType());
        mileageLog.setRatePerKm(ratePerKm);
        mileageLog.setReimbursementAmount(reimbursementAmount);
        mileageLog.setNotes(request.notes());

        MileageLog saved = mileageLogRepository.save(mileageLog);
        log.info("Updated mileage log: {}", logId);

        return enrichResponse(MileageLogResponse.fromEntity(saved));
    }

    @Transactional
    public MileageLogResponse submitMileageLog(UUID logId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        MileageLog mileageLog = mileageLogRepository.findByIdAndTenantId(logId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage log not found: " + logId));

        // Validate policy limits before submission
        validatePolicyLimits(tenantId, mileageLog);

        mileageLog.submit();
        MileageLog saved = mileageLogRepository.save(mileageLog);
        log.info("Submitted mileage log: {}", logId);

        return enrichResponse(MileageLogResponse.fromEntity(saved));
    }

    @Transactional
    public MileageLogResponse approveMileageLog(UUID logId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        MileageLog mileageLog = mileageLogRepository.findByIdAndTenantId(logId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage log not found: " + logId));

        mileageLog.approve(approverId);
        MileageLog saved = mileageLogRepository.save(mileageLog);

        // Auto-create expense claim on approval
        ExpenseClaim claim = createExpenseClaimFromMileage(saved, tenantId);
        saved.setExpenseClaimId(claim.getId());
        mileageLogRepository.save(saved);

        log.info("Approved mileage log: {} and created expense claim: {}", logId, claim.getClaimNumber());

        return enrichResponse(MileageLogResponse.fromEntity(saved));
    }

    @Transactional
    public MileageLogResponse rejectMileageLog(UUID logId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID rejecterId = SecurityContext.getCurrentEmployeeId();

        MileageLog mileageLog = mileageLogRepository.findByIdAndTenantId(logId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage log not found: " + logId));

        mileageLog.reject(rejecterId, reason);
        MileageLog saved = mileageLogRepository.save(mileageLog);
        log.info("Rejected mileage log: {} by {}", logId, rejecterId);

        return enrichResponse(MileageLogResponse.fromEntity(saved));
    }

    @Transactional(readOnly = true)
    public Page<MileageLogResponse> getEmployeeMileageLogs(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<MileageLog> page = mileageLogRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
        return page.map(log -> enrichResponse(MileageLogResponse.fromEntity(log)));
    }

    @Transactional(readOnly = true)
    public Page<MileageLogResponse> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<MileageLog> page = mileageLogRepository.findByTenantIdAndStatus(
                tenantId, MileageLog.MileageStatus.SUBMITTED, pageable);
        return page.map(log -> enrichResponse(MileageLogResponse.fromEntity(log)));
    }

    @Transactional(readOnly = true)
    public MileageSummaryResponse getMonthlySummary(UUID employeeId, int year, int month) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        BigDecimal totalDistance = mileageLogRepository.sumDistanceByEmployeeAndDateRange(
                tenantId, employeeId, startDate, endDate);
        BigDecimal totalReimbursement = mileageLogRepository.sumReimbursementByEmployeeAndDateRange(
                tenantId, employeeId, startDate, endDate);
        List<MileageLog> logs = mileageLogRepository.findByTenantIdAndEmployeeIdAndTravelDateBetween(
                tenantId, employeeId, startDate, endDate);
        long totalTrips = logs.stream()
                .filter(l -> l.getStatus() != MileageLog.MileageStatus.REJECTED)
                .count();

        MileagePolicy policy = mileagePolicyService.getActivePolicy(tenantId);
        BigDecimal policyMaxMonthly = policy != null ? policy.getMaxMonthlyKm() : null;
        BigDecimal remaining = policyMaxMonthly != null
                ? policyMaxMonthly.subtract(totalDistance).max(BigDecimal.ZERO)
                : null;

        return MileageSummaryResponse.builder()
                .year(year)
                .month(month)
                .totalDistanceKm(totalDistance)
                .totalReimbursement(totalReimbursement)
                .totalTrips(totalTrips)
                .policyMaxMonthlyKm(policyMaxMonthly)
                .remainingMonthlyKm(remaining)
                .build();
    }

    // ======================== Private Helpers ========================

    private void validateDistance(BigDecimal distanceKm) {
        if (distanceKm == null || distanceKm.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Distance must be greater than zero");
        }
        if (distanceKm.compareTo(new BigDecimal("99999.99")) > 0) {
            throw new ValidationException("Distance exceeds maximum allowed value");
        }
    }

    private void validatePolicyLimits(UUID tenantId, MileageLog mileageLog) {
        MileagePolicy policy = mileagePolicyService.getActivePolicy(tenantId);
        if (policy == null) {
            return; // No policy = no limits
        }

        // Check daily limit
        if (policy.getMaxDailyKm() != null) {
            BigDecimal existingDailyKm = mileageLogRepository.sumDistanceByEmployeeAndDate(
                    tenantId, mileageLog.getEmployeeId(), mileageLog.getTravelDate(), mileageLog.getId());
            BigDecimal totalDaily = existingDailyKm.add(mileageLog.getDistanceKm());
            if (totalDaily.compareTo(policy.getMaxDailyKm()) > 0) {
                throw new ValidationException(String.format(
                        "Daily mileage limit exceeded. Limit: %s km, current day total would be: %s km",
                        policy.getMaxDailyKm(), totalDaily));
            }
        }

        // Check monthly limit
        if (policy.getMaxMonthlyKm() != null) {
            YearMonth ym = YearMonth.from(mileageLog.getTravelDate());
            LocalDate monthStart = ym.atDay(1);
            LocalDate monthEnd = ym.atEndOfMonth();
            BigDecimal existingMonthlyKm = mileageLogRepository.sumDistanceByEmployeeAndDateRange(
                    tenantId, mileageLog.getEmployeeId(), monthStart, monthEnd);
            // Subtract current log's distance if already counted (for re-submissions)
            BigDecimal totalMonthly = existingMonthlyKm.add(mileageLog.getDistanceKm());
            if (totalMonthly.compareTo(policy.getMaxMonthlyKm()) > 0) {
                throw new ValidationException(String.format(
                        "Monthly mileage limit exceeded. Limit: %s km, current month total would be: %s km",
                        policy.getMaxMonthlyKm(), totalMonthly));
            }
        }
    }

    private BigDecimal resolveRate(MileagePolicy policy, MileageLog.VehicleType vehicleType) {
        if (policy == null) {
            return BigDecimal.ZERO;
        }

        // Try vehicle-specific rate override
        if (policy.getVehicleRates() != null && !policy.getVehicleRates().isBlank()) {
            try {
                Map<String, BigDecimal> rates = objectMapper.readValue(
                        policy.getVehicleRates(), new TypeReference<Map<String, BigDecimal>>() {
                        });
                BigDecimal vehicleRate = rates.get(vehicleType.name());
                if (vehicleRate != null) {
                    return vehicleRate;
                }
            } catch (Exception e) {
                log.warn("Failed to parse vehicle rates JSON for policy {}: {}",
                        policy.getName(), e.getMessage());
            }
        }

        return policy.getRatePerKm();
    }

    private ExpenseClaim createExpenseClaimFromMileage(MileageLog mileageLog, UUID tenantId) {
        String prefix = "MLG-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String claimNumber = prefix + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        String description = String.format("Mileage reimbursement: %s to %s (%s km, %s)",
                mileageLog.getFromLocation(), mileageLog.getToLocation(),
                mileageLog.getDistanceKm(), mileageLog.getVehicleType().name());

        ExpenseClaim claim = ExpenseClaim.builder()
                .employeeId(mileageLog.getEmployeeId())
                .claimNumber(claimNumber)
                .claimDate(mileageLog.getTravelDate())
                .category(ExpenseClaim.ExpenseCategory.TRANSPORT)
                .description(description)
                .amount(mileageLog.getReimbursementAmount())
                .currency("USD")
                .status(ExpenseClaim.ExpenseStatus.APPROVED)
                .approvedBy(mileageLog.getApprovedBy())
                .approvedAt(mileageLog.getApprovedAt())
                .title("Mileage: " + mileageLog.getFromLocation() + " to " + mileageLog.getToLocation())
                .build();
        claim.setTenantId(tenantId);

        return expenseClaimRepository.save(claim);
    }

    private MileageLogResponse enrichResponse(MileageLogResponse response) {
        if (response.getEmployeeId() != null) {
            employeeRepository.findById(response.getEmployeeId())
                    .ifPresent(emp -> response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName()));
        }
        if (response.getApprovedBy() != null) {
            employeeRepository.findById(response.getApprovedBy())
                    .ifPresent(emp -> response.setApprovedByName(emp.getFirstName() + " " + emp.getLastName()));
        }
        return response;
    }
}
