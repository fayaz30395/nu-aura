package com.hrms.application.leave.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;

    public LeaveBalance getOrCreateBalance(UUID employeeId, UUID leaveTypeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        
        return leaveBalanceRepository
            .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, year, tenantId)
            .orElseGet(() -> {
                LeaveBalance balance = LeaveBalance.builder()
                    .employeeId(employeeId)
                    .leaveTypeId(leaveTypeId)
                    .year(year)
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

    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance accrueLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalance(employeeId, leaveTypeId, Year.now().getValue());
        balance.accrueLeave(days);
        return leaveBalanceRepository.save(balance);
    }

    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance deductLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalance(employeeId, leaveTypeId, Year.now().getValue());
        balance.deduct(days);
        return leaveBalanceRepository.save(balance);
    }

    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance creditLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        LeaveBalance balance = getOrCreateBalance(employeeId, leaveTypeId, Year.now().getValue());
        balance.credit(days);
        return leaveBalanceRepository.save(balance);
    }
}
