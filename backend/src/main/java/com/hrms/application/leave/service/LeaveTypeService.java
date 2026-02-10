package com.hrms.application.leave.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveTypeService {

    private final LeaveTypeRepository leaveTypeRepository;

    @CacheEvict(value = CacheConfig.LEAVE_TYPES, allEntries = true)
    public LeaveType createLeaveType(LeaveType leaveType) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (leaveTypeRepository.existsByLeaveCodeAndTenantId(leaveType.getLeaveCode(), tenantId)) {
            throw new DuplicateResourceException("Leave type code already exists");
        }

        leaveType.setTenantId(tenantId);
        return leaveTypeRepository.save(leaveType);
    }

    @CacheEvict(value = CacheConfig.LEAVE_TYPES, allEntries = true)
    public LeaveType updateLeaveType(UUID id, LeaveType leaveTypeData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveType leaveType = leaveTypeRepository.findById(id)
            .filter(lt -> lt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));

        leaveType.setLeaveName(leaveTypeData.getLeaveName());
        leaveType.setDescription(leaveTypeData.getDescription());
        leaveType.setIsPaid(leaveTypeData.getIsPaid());
        leaveType.setColorCode(leaveTypeData.getColorCode());
        leaveType.setAnnualQuota(leaveTypeData.getAnnualQuota());
        leaveType.setMaxConsecutiveDays(leaveTypeData.getMaxConsecutiveDays());
        leaveType.setMinDaysNotice(leaveTypeData.getMinDaysNotice());
        leaveType.setMaxDaysPerRequest(leaveTypeData.getMaxDaysPerRequest());
        leaveType.setIsCarryForwardAllowed(leaveTypeData.getIsCarryForwardAllowed());
        leaveType.setMaxCarryForwardDays(leaveTypeData.getMaxCarryForwardDays());
        leaveType.setIsEncashable(leaveTypeData.getIsEncashable());
        leaveType.setRequiresDocument(leaveTypeData.getRequiresDocument());
        leaveType.setApplicableAfterDays(leaveTypeData.getApplicableAfterDays());
        leaveType.setAccrualType(leaveTypeData.getAccrualType());
        leaveType.setAccrualRate(leaveTypeData.getAccrualRate());
        leaveType.setGenderSpecific(leaveTypeData.getGenderSpecific());

        return leaveTypeRepository.save(leaveType);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_TYPES, key = "T(com.hrms.common.security.TenantContext).getCurrentTenant() + ':id:' + #id")
    public LeaveType getLeaveTypeById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveTypeRepository.findById(id)
            .filter(lt -> lt.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));
    }

    @Transactional(readOnly = true)
    public Page<LeaveType> getAllLeaveTypes(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveTypeRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_TYPES, key = "'active:' + T(com.hrms.common.security.TenantContext).getCurrentTenant()")
    public List<LeaveType> getActiveLeaveTypes() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true);
    }

    @CacheEvict(value = CacheConfig.LEAVE_TYPES, allEntries = true)
    public void activateLeaveType(UUID id) {
        LeaveType leaveType = getLeaveTypeById(id);
        leaveType.activate();
        leaveTypeRepository.save(leaveType);
    }

    @CacheEvict(value = CacheConfig.LEAVE_TYPES, allEntries = true)
    public void deactivateLeaveType(UUID id) {
        LeaveType leaveType = getLeaveTypeById(id);
        leaveType.deactivate();
        leaveTypeRepository.save(leaveType);
    }

    @CacheEvict(value = CacheConfig.LEAVE_TYPES, allEntries = true)
    public void deleteLeaveType(UUID id) {
        LeaveType leaveType = getLeaveTypeById(id);
        leaveTypeRepository.delete(leaveType);
    }
}
