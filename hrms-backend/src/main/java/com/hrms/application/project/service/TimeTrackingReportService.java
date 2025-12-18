package com.hrms.application.project.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.project.TimeEntry;
import com.hrms.infrastructure.project.repository.TimeEntryRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating time tracking reports and analytics
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimeTrackingReportService {

    private final TimeEntryRepository timeEntryRepository;
    private static final BigDecimal STANDARD_WORK_HOURS = new BigDecimal("8.00");

    /**
     * Generate time summary report for an employee
     */
    @Transactional(readOnly = true)
    public TimeSummaryReport getEmployeeTimeSummary(
            UUID employeeId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating time summary for employee {} from {} to {}", employeeId, startDate, endDate);

        List<TimeEntry> entries = timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                tenantId, employeeId, startDate, endDate
        );

        return buildTimeSummaryReport(entries, startDate, endDate);
    }

    /**
     * Generate weekly time report for an employee
     */
    @Transactional(readOnly = true)
    public WeeklyTimeReport getWeeklyTimeReport(UUID employeeId, LocalDate weekStartDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate weekEndDate = weekStartDate.plusDays(6);

        log.info("Generating weekly time report for employee {} for week starting {}", employeeId, weekStartDate);

        List<TimeEntry> entries = timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                tenantId, employeeId, weekStartDate, weekEndDate
        );

        return buildWeeklyReport(entries, weekStartDate);
    }

    /**
     * Generate monthly time report for an employee
     */
    @Transactional(readOnly = true)
    public MonthlyTimeReport getMonthlyTimeReport(UUID employeeId, int year, int month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.with(TemporalAdjusters.lastDayOfMonth());

        log.info("Generating monthly time report for employee {} for {}-{}", employeeId, year, month);

        List<TimeEntry> entries = timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                tenantId, employeeId, startDate, endDate
        );

        return buildMonthlyReport(entries, year, month);
    }

    /**
     * Generate project time report
     */
    @Transactional(readOnly = true)
    public ProjectTimeReport getProjectTimeReport(
            UUID projectId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating project time report for project {} from {} to {}", projectId, startDate, endDate);

        List<TimeEntry> entries = timeEntryRepository.findByTenantIdAndProjectId(tenantId, projectId).stream()
                .filter(e -> !e.getWorkDate().isBefore(startDate) && !e.getWorkDate().isAfter(endDate))
                .collect(Collectors.toList());

        return buildProjectReport(entries, projectId, startDate, endDate);
    }

    /**
     * Get utilization report for an employee
     */
    @Transactional(readOnly = true)
    public UtilizationReport getUtilizationReport(
            UUID employeeId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating utilization report for employee {} from {} to {}", employeeId, startDate, endDate);

        List<TimeEntry> entries = timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                tenantId, employeeId, startDate, endDate
        );

        return buildUtilizationReport(entries, startDate, endDate);
    }

    /**
     * Get time entries requiring approval
     */
    @Transactional(readOnly = true)
    public List<TimeEntry> getPendingApprovals() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return timeEntryRepository.findByTenantIdAndStatus(tenantId, TimeEntry.TimeEntryStatus.SUBMITTED);
    }

    // ==================== Report Building Methods ====================

    private TimeSummaryReport buildTimeSummaryReport(
            List<TimeEntry> entries,
            LocalDate startDate,
            LocalDate endDate
    ) {
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal billableHours = BigDecimal.ZERO;
        BigDecimal nonBillableHours = BigDecimal.ZERO;
        BigDecimal totalBilledAmount = BigDecimal.ZERO;

        Map<TimeEntry.EntryType, BigDecimal> hoursByType = new EnumMap<>(TimeEntry.EntryType.class);
        Map<UUID, BigDecimal> hoursByProject = new HashMap<>();
        Map<TimeEntry.TimeEntryStatus, Long> entriesByStatus = new EnumMap<>(TimeEntry.TimeEntryStatus.class);

        for (TimeEntry entry : entries) {
            totalHours = totalHours.add(entry.getHoursWorked());

            if (Boolean.TRUE.equals(entry.getIsBillable())) {
                billableHours = billableHours.add(entry.getHoursWorked());
                if (entry.getBilledAmount() != null) {
                    totalBilledAmount = totalBilledAmount.add(entry.getBilledAmount());
                }
            } else {
                nonBillableHours = nonBillableHours.add(entry.getHoursWorked());
            }

            // Group by type
            hoursByType.merge(entry.getEntryType(), entry.getHoursWorked(), BigDecimal::add);

            // Group by project
            hoursByProject.merge(entry.getProjectId(), entry.getHoursWorked(), BigDecimal::add);

            // Count by status
            entriesByStatus.merge(entry.getStatus(), 1L, Long::sum);
        }

        return TimeSummaryReport.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalHours(totalHours)
                .billableHours(billableHours)
                .nonBillableHours(nonBillableHours)
                .totalBilledAmount(totalBilledAmount)
                .hoursByType(hoursByType)
                .hoursByProject(hoursByProject)
                .entriesByStatus(entriesByStatus)
                .totalEntries(entries.size())
                .build();
    }

    private WeeklyTimeReport buildWeeklyReport(List<TimeEntry> entries, LocalDate weekStartDate) {
        Map<LocalDate, BigDecimal> dailyHours = new TreeMap<>();
        Map<UUID, BigDecimal> hoursByProject = new HashMap<>();
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;

        // Initialize all days of the week
        for (int i = 0; i < 7; i++) {
            dailyHours.put(weekStartDate.plusDays(i), BigDecimal.ZERO);
        }

        // Group by date
        Map<LocalDate, List<TimeEntry>> entriesByDate = entries.stream()
                .collect(Collectors.groupingBy(TimeEntry::getWorkDate));

        for (Map.Entry<LocalDate, List<TimeEntry>> dayEntry : entriesByDate.entrySet()) {
            BigDecimal dayTotal = dayEntry.getValue().stream()
                    .map(TimeEntry::getHoursWorked)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dailyHours.put(dayEntry.getKey(), dayTotal);
            totalHours = totalHours.add(dayTotal);

            // Calculate overtime (hours beyond 8 per day)
            if (dayTotal.compareTo(STANDARD_WORK_HOURS) > 0) {
                overtimeHours = overtimeHours.add(dayTotal.subtract(STANDARD_WORK_HOURS));
            }
        }

        // Group by project
        for (TimeEntry entry : entries) {
            hoursByProject.merge(entry.getProjectId(), entry.getHoursWorked(), BigDecimal::add);
        }

        return WeeklyTimeReport.builder()
                .weekStartDate(weekStartDate)
                .weekEndDate(weekStartDate.plusDays(6))
                .dailyHours(dailyHours)
                .totalHours(totalHours)
                .overtimeHours(overtimeHours)
                .hoursByProject(hoursByProject)
                .build();
    }

    private MonthlyTimeReport buildMonthlyReport(List<TimeEntry> entries, int year, int month) {
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal billableHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;
        BigDecimal totalBilledAmount = BigDecimal.ZERO;

        Map<UUID, BigDecimal> hoursByProject = new HashMap<>();
        Map<Integer, BigDecimal> hoursByWeek = new HashMap<>();

        // Group by date to calculate overtime
        Map<LocalDate, List<TimeEntry>> entriesByDate = entries.stream()
                .collect(Collectors.groupingBy(TimeEntry::getWorkDate));

        for (Map.Entry<LocalDate, List<TimeEntry>> dayEntry : entriesByDate.entrySet()) {
            BigDecimal dayTotal = dayEntry.getValue().stream()
                    .map(TimeEntry::getHoursWorked)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            totalHours = totalHours.add(dayTotal);

            if (dayTotal.compareTo(STANDARD_WORK_HOURS) > 0) {
                overtimeHours = overtimeHours.add(dayTotal.subtract(STANDARD_WORK_HOURS));
            }

            // Calculate week number
            int weekOfMonth = (dayEntry.getKey().getDayOfMonth() - 1) / 7 + 1;
            hoursByWeek.merge(weekOfMonth, dayTotal, BigDecimal::add);
        }

        // Calculate billable hours and amounts
        for (TimeEntry entry : entries) {
            if (Boolean.TRUE.equals(entry.getIsBillable())) {
                billableHours = billableHours.add(entry.getHoursWorked());
                if (entry.getBilledAmount() != null) {
                    totalBilledAmount = totalBilledAmount.add(entry.getBilledAmount());
                }
            }
            hoursByProject.merge(entry.getProjectId(), entry.getHoursWorked(), BigDecimal::add);
        }

        int workingDays = (int) entriesByDate.keySet().size();
        BigDecimal averageHoursPerDay = workingDays > 0 ?
                totalHours.divide(BigDecimal.valueOf(workingDays), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        return MonthlyTimeReport.builder()
                .year(year)
                .month(month)
                .totalHours(totalHours)
                .billableHours(billableHours)
                .overtimeHours(overtimeHours)
                .totalBilledAmount(totalBilledAmount)
                .averageHoursPerDay(averageHoursPerDay)
                .workingDays(workingDays)
                .hoursByProject(hoursByProject)
                .hoursByWeek(hoursByWeek)
                .build();
    }

    private ProjectTimeReport buildProjectReport(
            List<TimeEntry> entries,
            UUID projectId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal billableHours = BigDecimal.ZERO;
        BigDecimal totalBilledAmount = BigDecimal.ZERO;

        Map<UUID, BigDecimal> hoursByEmployee = new HashMap<>();
        Map<TimeEntry.EntryType, BigDecimal> hoursByType = new EnumMap<>(TimeEntry.EntryType.class);

        for (TimeEntry entry : entries) {
            totalHours = totalHours.add(entry.getHoursWorked());

            if (Boolean.TRUE.equals(entry.getIsBillable())) {
                billableHours = billableHours.add(entry.getHoursWorked());
                if (entry.getBilledAmount() != null) {
                    totalBilledAmount = totalBilledAmount.add(entry.getBilledAmount());
                }
            }

            hoursByEmployee.merge(entry.getEmployeeId(), entry.getHoursWorked(), BigDecimal::add);
            hoursByType.merge(entry.getEntryType(), entry.getHoursWorked(), BigDecimal::add);
        }

        return ProjectTimeReport.builder()
                .projectId(projectId)
                .startDate(startDate)
                .endDate(endDate)
                .totalHours(totalHours)
                .billableHours(billableHours)
                .totalBilledAmount(totalBilledAmount)
                .hoursByEmployee(hoursByEmployee)
                .hoursByType(hoursByType)
                .totalEntries(entries.size())
                .build();
    }

    private UtilizationReport buildUtilizationReport(
            List<TimeEntry> entries,
            LocalDate startDate,
            LocalDate endDate
    ) {
        long totalDays = startDate.datesUntil(endDate.plusDays(1))
                .filter(date -> date.getDayOfWeek().getValue() <= 5) // Weekdays only
                .count();

        BigDecimal expectedHours = STANDARD_WORK_HOURS.multiply(BigDecimal.valueOf(totalDays));
        BigDecimal actualHours = entries.stream()
                .map(TimeEntry::getHoursWorked)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal billableHours = entries.stream()
                .filter(e -> Boolean.TRUE.equals(e.getIsBillable()))
                .map(TimeEntry::getHoursWorked)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal utilizationRate = expectedHours.compareTo(BigDecimal.ZERO) > 0 ?
                actualHours.divide(expectedHours, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                BigDecimal.ZERO;

        BigDecimal billableRate = actualHours.compareTo(BigDecimal.ZERO) > 0 ?
                billableHours.divide(actualHours, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                BigDecimal.ZERO;

        return UtilizationReport.builder()
                .startDate(startDate)
                .endDate(endDate)
                .expectedHours(expectedHours)
                .actualHours(actualHours)
                .billableHours(billableHours)
                .utilizationRate(utilizationRate)
                .billableRate(billableRate)
                .workingDays(totalDays)
                .build();
    }

    // ==================== Report DTOs ====================

    @Data
    @Builder
    @AllArgsConstructor
    public static class TimeSummaryReport {
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal totalHours;
        private BigDecimal billableHours;
        private BigDecimal nonBillableHours;
        private BigDecimal totalBilledAmount;
        private Map<TimeEntry.EntryType, BigDecimal> hoursByType;
        private Map<UUID, BigDecimal> hoursByProject;
        private Map<TimeEntry.TimeEntryStatus, Long> entriesByStatus;
        private int totalEntries;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class WeeklyTimeReport {
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private Map<LocalDate, BigDecimal> dailyHours;
        private BigDecimal totalHours;
        private BigDecimal overtimeHours;
        private Map<UUID, BigDecimal> hoursByProject;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MonthlyTimeReport {
        private int year;
        private int month;
        private BigDecimal totalHours;
        private BigDecimal billableHours;
        private BigDecimal overtimeHours;
        private BigDecimal totalBilledAmount;
        private BigDecimal averageHoursPerDay;
        private int workingDays;
        private Map<UUID, BigDecimal> hoursByProject;
        private Map<Integer, BigDecimal> hoursByWeek;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ProjectTimeReport {
        private UUID projectId;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal totalHours;
        private BigDecimal billableHours;
        private BigDecimal totalBilledAmount;
        private Map<UUID, BigDecimal> hoursByEmployee;
        private Map<TimeEntry.EntryType, BigDecimal> hoursByType;
        private int totalEntries;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class UtilizationReport {
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal expectedHours;
        private BigDecimal actualHours;
        private BigDecimal billableHours;
        private BigDecimal utilizationRate; // Percentage
        private BigDecimal billableRate; // Percentage
        private long workingDays;
    }
}
