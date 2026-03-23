package com.hrms.application.analytics.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.analytics.dto.ScheduledReportRequest;
import com.hrms.api.analytics.dto.ScheduledReportResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.analytics.ScheduledReport;
import com.hrms.domain.analytics.ScheduledReport.Frequency;
import com.hrms.domain.analytics.ReportDefinition;
import com.hrms.infrastructure.analytics.repository.ReportDefinitionRepository;
import com.hrms.infrastructure.analytics.repository.ScheduledReportRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ScheduledReportService {

    private final ScheduledReportRepository scheduledReportRepository;
    private final ReportDefinitionRepository reportDefinitionRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ScheduledReportResponse createScheduledReport(ScheduledReportRequest request, UUID createdBy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID reportDefinitionId = resolveReportDefinitionId(request, tenantId);

        ScheduledReport report = ScheduledReport.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .reportDefinitionId(reportDefinitionId)
                .scheduleName(request.getScheduleName())
                .frequency(request.getFrequency())
                .dayOfWeek(request.getDayOfWeek())
                .dayOfMonth(request.getDayOfMonth())
                .timeOfDay(request.getTimeOfDay())
                .recipients(serializeList(request.getRecipients()))
                .parameters(serializeParameters(request))
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .nextRunAt(calculateNextRunTime(request.getFrequency(), request.getDayOfWeek(),
                        request.getDayOfMonth(), request.getTimeOfDay()))
                .createdBy(createdBy)
                .build();

        ScheduledReport saved = scheduledReportRepository.save(report);
        log.info("Created scheduled report: {} for tenant: {} with reportDefinitionId: {}",
                saved.getId(), tenantId, reportDefinitionId);

        return enrichResponse(saved);
    }

    @Transactional
    public ScheduledReportResponse updateScheduledReport(UUID reportId, ScheduledReportRequest request, UUID updatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ScheduledReport report = scheduledReportRepository.findByIdAndTenantId(reportId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled report not found: " + reportId));

        // Update reportDefinitionId if reportType or reportDefinitionId changed
        UUID reportDefinitionId = resolveReportDefinitionId(request, tenantId);
        report.setReportDefinitionId(reportDefinitionId);

        report.setScheduleName(request.getScheduleName());
        report.setFrequency(request.getFrequency());
        report.setDayOfWeek(request.getDayOfWeek());
        report.setDayOfMonth(request.getDayOfMonth());
        report.setTimeOfDay(request.getTimeOfDay());
        report.setRecipients(serializeList(request.getRecipients()));
        report.setParameters(serializeParameters(request));
        report.setIsActive(request.getIsActive());
        report.setNextRunAt(calculateNextRunTime(request.getFrequency(), request.getDayOfWeek(),
                request.getDayOfMonth(), request.getTimeOfDay()));
        report.setUpdatedBy(updatedBy);

        ScheduledReport saved = scheduledReportRepository.save(report);
        log.info("Updated scheduled report: {}", saved.getId());

        return enrichResponse(saved);
    }

    @Transactional(readOnly = true)
    public ScheduledReportResponse getScheduledReportById(UUID reportId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ScheduledReport report = scheduledReportRepository.findByIdAndTenantId(reportId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled report not found: " + reportId));

        return enrichResponse(report);
    }

    @Transactional(readOnly = true)
    public Page<ScheduledReportResponse> getAllScheduledReports(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return scheduledReportRepository.findAllByTenantId(tenantId, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public List<ScheduledReportResponse> getActiveScheduledReports() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return scheduledReportRepository.findByTenantIdAndIsActive(tenantId, true)
                .stream()
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteScheduledReport(UUID reportId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ScheduledReport report = scheduledReportRepository.findByIdAndTenantId(reportId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled report not found: " + reportId));

        scheduledReportRepository.delete(report);
        log.info("Deleted scheduled report: {}", reportId);
    }

    public ScheduledReportResponse toggleStatus(UUID reportId, UUID updatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ScheduledReport report = scheduledReportRepository.findByIdAndTenantId(reportId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled report not found: " + reportId));

        report.setIsActive(!report.getIsActive());
        report.setUpdatedBy(updatedBy);

        if (report.getIsActive()) {
            // Recalculate next run time when re-activating
            report.setNextRunAt(calculateNextRunTime(report.getFrequency(), report.getDayOfWeek(),
                    report.getDayOfMonth(), report.getTimeOfDay()));
        }

        ScheduledReport saved = scheduledReportRepository.save(report);
        log.info("Toggled scheduled report {} to active={}", reportId, saved.getIsActive());

        return enrichResponse(saved);
    }

    /**
     * Get reports that are due for execution.
     * Called by the scheduler job.
     */
    @Transactional(readOnly = true)
    public List<ScheduledReport> getReportsDueForExecution() {
        return scheduledReportRepository.findDueForExecution(LocalDateTime.now());
    }

    /**
     * Update last run time and calculate next run time after execution.
     */
    @Transactional
    public void markAsExecuted(UUID reportId) {
        ScheduledReport report = scheduledReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled report not found: " + reportId));

        report.setLastRunAt(LocalDateTime.now());
        report.setNextRunAt(calculateNextRunTime(report.getFrequency(), report.getDayOfWeek(),
                report.getDayOfMonth(), report.getTimeOfDay()));

        scheduledReportRepository.save(report);
        log.info("Marked scheduled report {} as executed, next run: {}", reportId, report.getNextRunAt());
    }

    // ==================== Helper Methods ====================

    /**
     * Resolve the reportDefinitionId from the request.
     * Priority:
     * 1. Use explicit reportDefinitionId if provided
     * 2. Look up by reportType (as reportCode) in ReportDefinition table
     * 3. Create a dynamic/virtual definition ID based on reportType for ad-hoc reports
     */
    private UUID resolveReportDefinitionId(ScheduledReportRequest request, UUID tenantId) {
        // 1. If explicit reportDefinitionId is provided, validate and use it
        if (request.getReportDefinitionId() != null) {
            ReportDefinition definition = reportDefinitionRepository
                    .findByIdAndTenantId(request.getReportDefinitionId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Report definition not found: " + request.getReportDefinitionId()));
            log.debug("Using explicit reportDefinitionId: {}", request.getReportDefinitionId());
            return definition.getId();
        }

        // 2. Try to find by reportType as reportCode
        String reportType = request.getReportType();
        if (reportType != null && !reportType.isBlank()) {
            return reportDefinitionRepository
                    .findActiveByReportCodeIgnoreCase(reportType, tenantId)
                    .map(def -> {
                        log.debug("Resolved reportType '{}' to reportDefinitionId: {}", reportType, def.getId());
                        return def.getId();
                    })
                    .orElseGet(() -> {
                        // 3. Generate a deterministic UUID based on reportType for ad-hoc/dynamic reports
                        // This allows consistent identification without requiring pre-defined report definitions
                        UUID dynamicId = UUID.nameUUIDFromBytes(
                                ("DYNAMIC_REPORT:" + tenantId + ":" + reportType.toUpperCase()).getBytes());
                        log.info("No ReportDefinition found for reportType '{}', using dynamic ID: {}",
                                reportType, dynamicId);
                        return dynamicId;
                    });
        }

        throw new IllegalArgumentException("Either reportDefinitionId or reportType must be provided");
    }

    private LocalDateTime calculateNextRunTime(Frequency frequency, Integer dayOfWeek,
                                                Integer dayOfMonth, LocalTime timeOfDay) {
        LocalDate today = LocalDate.now();
        LocalTime time = timeOfDay != null ? timeOfDay : LocalTime.of(6, 0); // Default 6 AM

        return switch (frequency) {
            case DAILY -> {
                LocalDateTime next = today.atTime(time);
                if (next.isBefore(LocalDateTime.now())) {
                    next = next.plusDays(1);
                }
                yield next;
            }
            case WEEKLY -> {
                DayOfWeek targetDay = DayOfWeek.of(dayOfWeek != null ? dayOfWeek : 1); // Default Monday
                LocalDate nextDate = today.with(TemporalAdjusters.nextOrSame(targetDay));
                LocalDateTime next = nextDate.atTime(time);
                if (next.isBefore(LocalDateTime.now())) {
                    next = next.plusWeeks(1);
                }
                yield next;
            }
            case MONTHLY -> {
                int day = dayOfMonth != null ? Math.min(dayOfMonth, today.lengthOfMonth()) : 1;
                LocalDate nextDate = today.withDayOfMonth(day);
                if (nextDate.isBefore(today) || (nextDate.equals(today) && time.isBefore(LocalTime.now()))) {
                    nextDate = nextDate.plusMonths(1);
                    day = Math.min(dayOfMonth != null ? dayOfMonth : 1, nextDate.lengthOfMonth());
                    nextDate = nextDate.withDayOfMonth(day);
                }
                yield nextDate.atTime(time);
            }
            case QUARTERLY -> {
                LocalDate nextQuarter = today.plusMonths(3 - (today.getMonthValue() - 1) % 3)
                        .withDayOfMonth(1);
                yield nextQuarter.atTime(time);
            }
            case YEARLY -> {
                LocalDate nextYear = today.plusYears(1).withDayOfYear(1);
                yield nextYear.atTime(time);
            }
        };
    }

    private String serializeList(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.error("Error serializing list", e);
            return "[]";
        }
    }

    private List<String> deserializeList(String json) {
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            log.error("Error deserializing list", e);
            return List.of();
        }
    }

    private String serializeParameters(ScheduledReportRequest request) {
        Map<String, Object> params = new HashMap<>();
        params.put("reportType", request.getReportType());
        params.put("departmentId", request.getDepartmentId());
        params.put("status", request.getStatus());
        params.put("exportFormat", request.getExportFormat() != null ? request.getExportFormat() : "EXCEL");
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            log.error("Error serializing parameters", e);
            return "{}";
        }
    }

    private ScheduledReportResponse enrichResponse(ScheduledReport report) {
        String createdByName = null;
        String departmentName = null;

        if (report.getCreatedBy() != null) {
            createdByName = employeeRepository.findById(report.getCreatedBy())
                    .map(e -> e.getFirstName() + " " + e.getLastName())
                    .orElse(null);
        }

        ScheduledReportResponse response = ScheduledReportResponse.fromEntity(report, createdByName, departmentName);
        response.setRecipients(deserializeList(report.getRecipients()));

        // BP-L01 FIX: Re-throw parameter parsing failures instead of silently swallowing.
        // Invalid parameters indicate corrupt data that callers must handle.
        try {
            Map<String, Object> params = objectMapper.readValue(report.getParameters(),
                    objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
            response.setReportType((String) params.get("reportType"));
            response.setStatus((String) params.get("status"));
            response.setExportFormat((String) params.get("exportFormat"));

            Object deptId = params.get("departmentId");
            if (deptId != null) {
                UUID departmentId = UUID.fromString(deptId.toString());
                response.setDepartmentId(departmentId);
                departmentName = departmentRepository.findById(departmentId)
                        .map(d -> d.getName())
                        .orElse(null);
                response.setDepartmentName(departmentName);
            }
        } catch (Exception e) {
            log.error("Error parsing report parameters for report {}: {}", report.getId(), e.getMessage(), e);
            throw new IllegalStateException("Failed to parse report parameters for report " + report.getId(), e);
        }

        return response;
    }
}
