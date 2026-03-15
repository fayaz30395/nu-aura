package com.hrms.application.timetracking.service;

import com.hrms.api.timetracking.dto.CreateTimeEntryRequest;
import com.hrms.api.timetracking.dto.TimeEntryDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.timetracking.TimeEntry;
import com.hrms.domain.timetracking.TimeEntry.TimeEntryStatus;
import com.hrms.infrastructure.timetracking.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TimeTrackingService {

    private final TimeEntryRepository timeEntryRepository;

    @Transactional
    public TimeEntryDto createEntry(CreateTimeEntryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();

        TimeEntry entry = TimeEntry.builder()
                .employeeId(employeeId)
                .projectId(request.getProjectId())
                .taskId(request.getTaskId())
                .entryDate(request.getEntryDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .hoursWorked(request.getHoursWorked())
                .billableHours(request.getBillableHours() != null ? request.getBillableHours() : request.getHoursWorked())
                .isBillable(request.getIsBillable() != null ? request.getIsBillable() : false)
                .hourlyRate(request.getHourlyRate())
                .entryType(request.getEntryType() != null ? request.getEntryType() : TimeEntry.EntryType.REGULAR)
                .description(request.getDescription())
                .notes(request.getNotes())
                .clientId(request.getClientId())
                .clientName(request.getClientName())
                .externalRef(request.getExternalRef())
                .status(TimeEntryStatus.DRAFT)
                .build();

        entry.calculateBilling();
        entry.setTenantId(tenantId);

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry created for date {} by employee {}", request.getEntryDate(), employeeId);
        return TimeEntryDto.fromEntity(saved);
    }

    @Transactional
    public TimeEntryDto updateEntry(UUID entryId, CreateTimeEntryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (entry.getStatus() != TimeEntryStatus.DRAFT && entry.getStatus() != TimeEntryStatus.REJECTED) {
            throw new IllegalStateException("Cannot update entry in status: " + entry.getStatus());
        }

        entry.setProjectId(request.getProjectId());
        entry.setTaskId(request.getTaskId());
        entry.setEntryDate(request.getEntryDate());
        entry.setStartTime(request.getStartTime());
        entry.setEndTime(request.getEndTime());
        entry.setHoursWorked(request.getHoursWorked());
        entry.setBillableHours(request.getBillableHours() != null ? request.getBillableHours() : request.getHoursWorked());
        entry.setIsBillable(request.getIsBillable());
        entry.setHourlyRate(request.getHourlyRate());
        entry.setEntryType(request.getEntryType());
        entry.setDescription(request.getDescription());
        entry.setNotes(request.getNotes());
        entry.setClientId(request.getClientId());
        entry.setClientName(request.getClientName());
        entry.setExternalRef(request.getExternalRef());

        entry.calculateBilling();

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry updated: {}", saved.getId());
        return TimeEntryDto.fromEntity(saved);
    }

    @Transactional
    public TimeEntryDto submitEntry(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (entry.getStatus() != TimeEntryStatus.DRAFT && entry.getStatus() != TimeEntryStatus.REJECTED) {
            throw new IllegalStateException("Cannot submit entry in status: " + entry.getStatus());
        }

        entry.setStatus(TimeEntryStatus.SUBMITTED);
        entry.setSubmittedDate(LocalDate.now());

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry submitted: {}", saved.getId());
        return TimeEntryDto.fromEntity(saved);
    }

    @Transactional
    public List<TimeEntryDto> submitMultiple(List<UUID> entryIds) {
        return entryIds.stream()
                .map(this::submitEntry)
                .collect(Collectors.toList());
    }

    @Transactional
    public TimeEntryDto approveEntry(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (entry.getStatus() != TimeEntryStatus.SUBMITTED) {
            throw new IllegalStateException("Cannot approve entry in status: " + entry.getStatus());
        }

        entry.setStatus(TimeEntryStatus.APPROVED);
        entry.setApprovedBy(approverId);
        entry.setApprovedDate(LocalDate.now());

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry approved: {} by {}", saved.getId(), approverId);
        return TimeEntryDto.fromEntity(saved);
    }

    @Transactional
    public List<TimeEntryDto> approveMultiple(List<UUID> entryIds) {
        return entryIds.stream()
                .map(this::approveEntry)
                .collect(Collectors.toList());
    }

    @Transactional
    public TimeEntryDto rejectEntry(UUID entryId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (entry.getStatus() != TimeEntryStatus.SUBMITTED) {
            throw new IllegalStateException("Cannot reject entry in status: " + entry.getStatus());
        }

        entry.setStatus(TimeEntryStatus.REJECTED);
        entry.setApprovedBy(approverId);
        entry.setApprovedDate(LocalDate.now());
        entry.setRejectionReason(reason);

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry rejected: {} by {}", saved.getId(), approverId);
        return TimeEntryDto.fromEntity(saved);
    }

    @Transactional
    public void deleteEntry(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (entry.getStatus() != TimeEntryStatus.DRAFT) {
            throw new IllegalStateException("Cannot delete entry in status: " + entry.getStatus());
        }

        timeEntryRepository.delete(entry);
        log.info("Time entry deleted: {}", entryId);
    }

    @Transactional(readOnly = true)
    public TimeEntryDto getById(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TimeEntry entry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        return TimeEntryDto.fromEntity(entry);
    }

    @Transactional(readOnly = true)
    public Page<TimeEntryDto> getMyEntries(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();
        return timeEntryRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(TimeEntryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryDto> getMyEntriesForDateRange(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();
        return timeEntryRepository.findByEmployeeIdAndTenantIdAndEntryDateBetween(
                employeeId, tenantId, startDate, endDate
        ).stream().map(TimeEntryDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<TimeEntryDto> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return timeEntryRepository.findByTenantIdAndStatus(tenantId, TimeEntryStatus.SUBMITTED, pageable)
                .map(TimeEntryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<TimeEntryDto> getAllEntries(TimeEntryStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (status != null) {
            return timeEntryRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                    .map(TimeEntryDto::fromEntity);
        }
        return timeEntryRepository.findByTenantId(tenantId, pageable)
                .map(TimeEntryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryDto> getEntriesByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return timeEntryRepository.findByProjectIdAndTenantId(projectId, tenantId)
                .stream().map(TimeEntryDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTimeSummary(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();

        BigDecimal totalHours = timeEntryRepository.sumHoursWorkedByEmployee(tenantId, employeeId, startDate, endDate);

        return Map.of(
                "startDate", startDate,
                "endDate", endDate,
                "totalHoursWorked", totalHours != null ? totalHours : BigDecimal.ZERO,
                "employeeId", employeeId
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProjectTimeSummary(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BigDecimal billableHours = timeEntryRepository.sumBillableHoursByProject(tenantId, projectId);
        BigDecimal billingAmount = timeEntryRepository.sumBillingAmountByProject(tenantId, projectId);

        return Map.of(
                "projectId", projectId,
                "totalBillableHours", billableHours != null ? billableHours : BigDecimal.ZERO,
                "totalBillingAmount", billingAmount != null ? billingAmount : BigDecimal.ZERO
        );
    }
}
