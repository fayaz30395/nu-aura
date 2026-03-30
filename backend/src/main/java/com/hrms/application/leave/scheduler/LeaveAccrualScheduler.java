package com.hrms.application.leave.scheduler;

import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Scheduled job for monthly leave accrual.
 *
 * <p>Runs at 2:00 AM UTC on the 1st of every month. For each active tenant,
 * finds all active leave types with MONTHLY or QUARTERLY accrual and credits
 * the appropriate amount to every active employee's leave balance.</p>
 *
 * <ul>
 *   <li><b>MONTHLY</b> types: accrued every month (annualQuota / 12)</li>
 *   <li><b>QUARTERLY</b> types: accrued only on quarter-start months
 *       (January, April, July, October) at annualQuota / 4</li>
 * </ul>
 *
 * <p>Per-tenant failure isolation ensures one tenant's error does not block others.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LeaveAccrualScheduler {

    private static final Set<Integer> QUARTER_START_MONTHS = Set.of(1, 4, 7, 10);

    private final LeaveBalanceService leaveBalanceService;
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Main monthly accrual job.
     * Cron: 2:00 AM UTC on the 1st of every month.
     */
    @Scheduled(cron = "${app.leave.accrual.cron:0 0 2 1 * *}", zone = "UTC")
    @SchedulerLock(name = "accrueMonthlyLeave", lockAtLeastFor = "PT15M", lockAtMostFor = "PT60M")
    public void accrueMonthlyLeave() {
        log.info("LeaveAccrualScheduler: starting monthly leave accrual run");

        List<UUID> tenants = fetchActiveTenants();
        int totalAccruals = 0;
        int tenantsProcessed = 0;
        int tenantsWithErrors = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);

                int accruals = processAccrualsForTenant(tenantId);
                totalAccruals += accruals;
                tenantsProcessed++;

                log.info("LeaveAccrualScheduler: tenant {} — {} accrual(s) applied", tenantId, accruals);
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                tenantsWithErrors++;
                log.error("LeaveAccrualScheduler: failed for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("LeaveAccrualScheduler: completed. Tenants processed: {}, Total accruals: {}, Tenants with errors: {}",
                tenantsProcessed, totalAccruals, tenantsWithErrors);
    }

    /**
     * Process leave accruals for a single tenant.
     *
     * @param tenantId the tenant to process
     * @return total number of individual balance accruals applied
     */
    private int processAccrualsForTenant(UUID tenantId) {
        int currentMonth = LocalDate.now().getMonthValue();
        boolean isQuarterStart = QUARTER_START_MONTHS.contains(currentMonth);

        // Fetch active leave types for this tenant
        List<LeaveType> activeLeaveTypes = leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true);

        // Fetch active employees for this tenant
        List<Employee> activeEmployees = employeeRepository.findByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);

        if (activeEmployees.isEmpty()) {
            log.debug("LeaveAccrualScheduler: no active employees for tenant {}, skipping", tenantId);
            return 0;
        }

        int accrualCount = 0;

        for (LeaveType leaveType : activeLeaveTypes) {
            if (leaveType.getAnnualQuota() == null || leaveType.getAnnualQuota().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal accrualAmount = calculateAccrualAmount(leaveType, isQuarterStart);
            if (accrualAmount == null) {
                continue;
            }

            log.debug("LeaveAccrualScheduler: accruing {} days for leave type '{}' ({}), tenant {}",
                    accrualAmount, leaveType.getLeaveName(), leaveType.getAccrualType(), tenantId);

            for (Employee employee : activeEmployees) {
                try {
                    leaveBalanceService.accrueLeave(employee.getId(), leaveType.getId(), accrualAmount);
                    accrualCount++;
                } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                    log.error("LeaveAccrualScheduler: failed to accrue leave for employee {} / leaveType {} in tenant {}: {}",
                            employee.getId(), leaveType.getId(), tenantId, e.getMessage(), e);
                }
            }
        }

        return accrualCount;
    }

    /**
     * Calculate the accrual amount for a leave type based on its accrual type and
     * whether this month is a quarter start.
     *
     * @param leaveType      the leave type
     * @param isQuarterStart true if the current month is Jan, Apr, Jul, or Oct
     * @return the amount to accrue, or null if this type should not accrue this month
     */
    private BigDecimal calculateAccrualAmount(LeaveType leaveType, boolean isQuarterStart) {
        LeaveType.AccrualType accrualType = leaveType.getAccrualType();
        if (accrualType == null) {
            return null;
        }

        // If a custom accrualRate is set, use it directly
        if (leaveType.getAccrualRate() != null && leaveType.getAccrualRate().compareTo(BigDecimal.ZERO) > 0) {
            return switch (accrualType) {
                case MONTHLY -> leaveType.getAccrualRate();
                case QUARTERLY -> isQuarterStart ? leaveType.getAccrualRate() : null;
                default -> null;
            };
        }

        // Otherwise, derive from annualQuota
        return switch (accrualType) {
            case MONTHLY -> leaveType.getAnnualQuota().divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case QUARTERLY -> isQuarterStart
                    ? leaveType.getAnnualQuota().divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP)
                    : null;
            default -> null;
        };
    }

    /**
     * Fetch all active tenant IDs from the database.
     * Uses raw JDBC to avoid requiring TenantContext to be set.
     */
    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.warn("LeaveAccrualScheduler: could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
