package com.hrms.application.project.validation;

import com.hrms.domain.project.TimeEntry;
import com.hrms.infrastructure.project.repository.ProjectTimeEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Validator for time entry operations
 * Provides comprehensive validation including hours, dates, and overlaps
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TimeEntryValidator {

    private static final BigDecimal MAX_HOURS_PER_DAY = new BigDecimal("24.00");
    private static final BigDecimal MIN_HOURS = new BigDecimal("0.01");
    private static final BigDecimal STANDARD_WORK_HOURS = new BigDecimal("8.00");
    private final ProjectTimeEntryRepository timeEntryRepository;

    /**
     * Validates a time entry request
     *
     * @param request         Time entry to validate
     * @param tenantId        Tenant ID
     * @param existingEntryId ID of existing entry (null for new entries)
     * @return List of validation errors (empty if valid)
     */
    public List<String> validate(TimeEntryValidationRequest request, UUID tenantId, UUID existingEntryId) {
        List<String> errors = new ArrayList<>();

        // Validate required fields
        if (request.getEmployeeId() == null) {
            errors.add("Employee ID is required");
        }
        if (request.getProjectId() == null) {
            errors.add("Project ID is required");
        }
        if (request.getWorkDate() == null) {
            errors.add("Work date is required");
        }
        if (request.getHoursWorked() == null) {
            errors.add("Hours worked is required");
        }

        // If basic validation fails, return early
        if (!errors.isEmpty()) {
            return errors;
        }

        // Validate hours
        validateHours(request.getHoursWorked(), errors);

        // Validate date
        validateDate(request.getWorkDate(), errors);

        // Validate total hours for the day
        validateDailyHours(
                request.getEmployeeId(),
                request.getWorkDate(),
                request.getHoursWorked(),
                tenantId,
                existingEntryId,
                errors
        );

        // Validate billing information
        if (Boolean.TRUE.equals(request.getIsBillable())) {
            if (request.getBillingRate() != null && request.getBillingRate().compareTo(BigDecimal.ZERO) < 0) {
                errors.add("Billing rate cannot be negative");
            }
        }

        return errors;
    }

    /**
     * Validates hours worked
     */
    private void validateHours(BigDecimal hours, List<String> errors) {
        if (hours.compareTo(MIN_HOURS) < 0) {
            errors.add("Hours worked must be greater than 0");
        }
        if (hours.compareTo(MAX_HOURS_PER_DAY) > 0) {
            errors.add("Hours worked cannot exceed 24 hours");
        }
        // Check decimal places (max 2)
        if (hours.scale() > 2) {
            errors.add("Hours worked can have at most 2 decimal places");
        }
    }

    /**
     * Validates work date
     */
    private void validateDate(LocalDate workDate, List<String> errors) {
        LocalDate today = LocalDate.now();
        LocalDate maxPastDate = today.minusMonths(3); // Cannot log time older than 3 months

        if (workDate.isAfter(today)) {
            errors.add("Cannot log time for future dates");
        }
        if (workDate.isBefore(maxPastDate)) {
            errors.add("Cannot log time older than 3 months");
        }
    }

    /**
     * Validates total hours for a specific day don't exceed maximum
     */
    private void validateDailyHours(
            UUID employeeId,
            LocalDate workDate,
            BigDecimal newHours,
            UUID tenantId,
            UUID existingEntryId,
            List<String> errors
    ) {
        // Get all time entries for this employee on this date
        List<TimeEntry> existingEntries = timeEntryRepository
                .findByTenantIdAndEmployeeIdAndWorkDateBetween(
                        tenantId,
                        employeeId,
                        workDate,
                        workDate
                );

        // Calculate total hours (excluding the current entry if it's an update)
        BigDecimal totalHours = existingEntries.stream()
                .filter(entry -> existingEntryId == null || !entry.getId().equals(existingEntryId))
                .filter(entry -> entry.getStatus() != TimeEntry.TimeEntryStatus.REJECTED)
                .map(TimeEntry::getHoursWorked)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        totalHours = totalHours.add(newHours);

        if (totalHours.compareTo(MAX_HOURS_PER_DAY) > 0) {
            errors.add(String.format(
                    "Total hours for %s would be %.2f, which exceeds the maximum of 24 hours",
                    workDate,
                    totalHours
            ));
        }

        // Warning for excessive hours (more than 12 hours in a day)
        BigDecimal excessiveHours = new BigDecimal("12.00");
        if (totalHours.compareTo(excessiveHours) > 0) {
            log.warn("Employee {} logged {} hours on {}, which is considered excessive",
                    employeeId, totalHours, workDate);
        }
    }

    /**
     * Calculates overtime hours for a given time entry
     *
     * @param employeeId Employee ID
     * @param workDate   Work date
     * @param tenantId   Tenant ID
     * @return Overtime hours (0 if no overtime)
     */
    public BigDecimal calculateOvertimeHours(UUID employeeId, LocalDate workDate, UUID tenantId) {
        List<TimeEntry> dayEntries = timeEntryRepository
                .findByTenantIdAndEmployeeIdAndWorkDateBetween(
                        tenantId,
                        employeeId,
                        workDate,
                        workDate
                );

        BigDecimal totalHours = dayEntries.stream()
                .filter(entry -> entry.getStatus() != TimeEntry.TimeEntryStatus.REJECTED)
                .map(TimeEntry::getHoursWorked)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Overtime is any hours beyond standard work hours
        if (totalHours.compareTo(STANDARD_WORK_HOURS) > 0) {
            return totalHours.subtract(STANDARD_WORK_HOURS);
        }

        return BigDecimal.ZERO;
    }

    /**
     * Checks if a time entry can be modified
     */
    public boolean canModifyEntry(TimeEntry entry) {
        return entry.getStatus() == TimeEntry.TimeEntryStatus.DRAFT ||
                entry.getStatus() == TimeEntry.TimeEntryStatus.REJECTED;
    }

    /**
     * Checks if a time entry can be deleted
     */
    public boolean canDeleteEntry(TimeEntry entry) {
        return entry.getStatus() == TimeEntry.TimeEntryStatus.DRAFT;
    }

    /**
     * Request object for validation
     */
    public static class TimeEntryValidationRequest {
        private UUID employeeId;
        private UUID projectId;
        private LocalDate workDate;
        private BigDecimal hoursWorked;
        private Boolean isBillable;
        private BigDecimal billingRate;

        public TimeEntryValidationRequest(
                UUID employeeId,
                UUID projectId,
                LocalDate workDate,
                BigDecimal hoursWorked,
                Boolean isBillable,
                BigDecimal billingRate
        ) {
            this.employeeId = employeeId;
            this.projectId = projectId;
            this.workDate = workDate;
            this.hoursWorked = hoursWorked;
            this.isBillable = isBillable;
            this.billingRate = billingRate;
        }

        public UUID getEmployeeId() {
            return employeeId;
        }

        public UUID getProjectId() {
            return projectId;
        }

        public LocalDate getWorkDate() {
            return workDate;
        }

        public BigDecimal getHoursWorked() {
            return hoursWorked;
        }

        public Boolean getIsBillable() {
            return isBillable;
        }

        public BigDecimal getBillingRate() {
            return billingRate;
        }
    }
}
