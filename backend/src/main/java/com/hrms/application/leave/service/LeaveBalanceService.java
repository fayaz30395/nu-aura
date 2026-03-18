package com.hrms.application.leave.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    // R2-007 FIX: Inject LeaveTypeRepository to seed openingBalance from annualQuota
    private final LeaveTypeRepository leaveTypeRepository;

    /**
     * Get or create a leave balance for the given employee / leave-type / year.
     *
     * <p>R2-007 FIX: The previous implementation had two related bugs:
     * <ol>
     *   <li>{@code @Transactional(readOnly = true)} on a method that calls
     *       {@code leaveBalanceRepository.save()} — the save was silently
     *       ignored (Hibernate dirty-check disabled in a read-only transaction),
     *       so newly-created balances were never persisted.</li>
     *   <li>The builder always started {@code openingBalance = ZERO}, meaning
     *       employees began a new leave year with zero opening balance instead
     *       of the entitlement defined on the {@link LeaveType}.</li>
     * </ol>
     * Both are fixed: the method is now a full read-write {@code @Transactional},
     * and {@code openingBalance} is seeded from {@link LeaveType#getAnnualQuota()}
     * when the accrual type is {@code YEARLY} (direct grant) or when no accrual
     * type is configured (legacy data). Monthly/quarterly types accrue over time
     * so their opening balance stays zero.</p>
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public LeaveBalance getOrCreateBalance(UUID employeeId, UUID leaveTypeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return leaveBalanceRepository
            .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, year, tenantId)
            .orElseGet(() -> {
                // R2-007 FIX: Seed openingBalance from LeaveType.annualQuota for
                // yearly / no-accrual types so employees start the year with their
                // full entitlement already visible.
                BigDecimal opening = BigDecimal.ZERO;
                LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId).orElse(null);
                if (leaveType != null && leaveType.getAnnualQuota() != null) {
                    LeaveType.AccrualType accrualType = leaveType.getAccrualType();
                    if (accrualType == null
                            || accrualType == LeaveType.AccrualType.NONE
                            || accrualType == LeaveType.AccrualType.YEARLY) {
                        opening = leaveType.getAnnualQuota();
                    }
                }

                LeaveBalance balance = LeaveBalance.builder()
                    .employeeId(employeeId)
                    .leaveTypeId(leaveTypeId)
                    .year(year)
                    .openingBalance(opening)
                    .build();
                balance.setTenantId(tenantId);
                balance.calculateAvailable();
                return leaveBalanceRepository.save(balance);
            });
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_BALANCES, keyGenerator = "tenantAwareKeyGenerator")
    public List<LeaveBalance> getEmployeeBalances(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_BALANCES, keyGenerator = "tenantAwareKeyGenerator")
    public List<LeaveBalance> getEmployeeBalancesForYear(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveBalanceRepository.findByEmployeeIdAndYear(employeeId, year, tenantId);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance accrueLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, Year.now().getValue());
        balance.accrueLeave(days);
        return leaveBalanceRepository.save(balance);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance deductLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, Year.now().getValue());
        balance.deduct(days);
        return leaveBalanceRepository.save(balance);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance creditLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, Year.now().getValue());
        balance.credit(days);
        return leaveBalanceRepository.save(balance);
    }

    /**
     * Pessimistic-write variant of {@link #getOrCreateBalance}.
     *
     * <p>Used exclusively by mutation paths ({@code accrueLeave}, {@code deductLeave},
     * {@code creditLeave}) to prevent concurrent updates from producing lost-update
     * anomalies. Issues a {@code SELECT … FOR UPDATE} so the row is exclusively locked
     * for the duration of the enclosing transaction. Row creation falls through to a
     * plain save — the newly inserted row is owned by this transaction so no concurrent
     * reader can race on it.</p>
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    private LeaveBalance getOrCreateBalanceForUpdate(UUID employeeId, UUID leaveTypeId, int year) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, year, tenantId)
            .orElseGet(() -> {
                BigDecimal opening = BigDecimal.ZERO;
                LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId).orElse(null);
                if (leaveType != null && leaveType.getAnnualQuota() != null) {
                    LeaveType.AccrualType accrualType = leaveType.getAccrualType();
                    if (accrualType == null
                            || accrualType == LeaveType.AccrualType.NONE
                            || accrualType == LeaveType.AccrualType.YEARLY) {
                        opening = leaveType.getAnnualQuota();
                    }
                }

                LeaveBalance balance = LeaveBalance.builder()
                    .employeeId(employeeId)
                    .leaveTypeId(leaveTypeId)
                    .year(year)
                    .openingBalance(opening)
                    .build();
                balance.setTenantId(tenantId);
                balance.calculateAvailable();
                return leaveBalanceRepository.save(balance);
            });
    }
}
