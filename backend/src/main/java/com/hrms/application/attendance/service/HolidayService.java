package com.hrms.application.attendance.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.Holiday;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @CacheEvict(value = CacheConfig.HOLIDAYS, allEntries = true)
    public Holiday createHoliday(Holiday holiday) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (holidayRepository.existsByTenantIdAndHolidayDate(tenantId, holiday.getHolidayDate())) {
            throw new IllegalArgumentException("Holiday already exists for this date");
        }

        holiday.setTenantId(tenantId);
        return holidayRepository.save(holiday);
    }

    @CacheEvict(value = CacheConfig.HOLIDAYS, allEntries = true)
    public Holiday updateHoliday(UUID id, Holiday holidayData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Holiday holiday = holidayRepository.findById(id)
            .filter(h -> h.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Holiday not found"));
        
        holiday.setHolidayName(holidayData.getHolidayName());
        holiday.setHolidayDate(holidayData.getHolidayDate());
        holiday.setHolidayType(holidayData.getHolidayType());
        holiday.setDescription(holidayData.getDescription());
        holiday.setIsOptional(holidayData.getIsOptional());
        holiday.setIsRestricted(holidayData.getIsRestricted());
        holiday.setApplicableLocations(holidayData.getApplicableLocations());
        holiday.setApplicableDepartments(holidayData.getApplicableDepartments());
        
        return holidayRepository.save(holiday);
    }

    @Transactional(readOnly = true)
    public Holiday getHolidayById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return holidayRepository.findById(id)
            .filter(h -> h.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Holiday not found"));
    }

    @Transactional(readOnly = true)
    public Page<Holiday> getAllHolidays(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return holidayRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.HOLIDAYS, keyGenerator = "tenantAwareKeyGenerator")
    public List<Holiday> getHolidaysByYear(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return holidayRepository.findAllByTenantIdAndYear(tenantId, year);
    }

    @Transactional(readOnly = true)
    public List<Holiday> getHolidaysByDateRange(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate);
    }

    @CacheEvict(value = CacheConfig.HOLIDAYS, allEntries = true)
    public void deleteHoliday(UUID id) {
        Holiday holiday = getHolidayById(id);
        holidayRepository.delete(holiday);
    }
}
