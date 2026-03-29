package com.hrms.application.shift.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.shift.Shift;
import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.infrastructure.shift.repository.ShiftAssignmentRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Integrates shift definitions with attendance tracking.
 * Maps employee punch times to their assigned shift to determine:
 * - Expected check-in / check-out times
 * - Late arrival detection (based on shift grace period)
 * - Early departure detection
 * - Overtime calculation (based on shift's full day hours)
 * - Night shift handling (shift spans midnight)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftAttendanceService {

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftRepository shiftRepository;

    /**
     * Get the assigned shift for an employee on a specific date.
     * Returns null if no active assignment exists.
     */
    @Transactional(readOnly = true)
    public Shift getAssignedShift(UUID employeeId, LocalDate date) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Optional<ShiftAssignment> assignment = shiftAssignmentRepository
                .findActiveAssignmentForEmployeeOnDate(tenantId, employeeId, date);

        if (assignment.isEmpty()) {
            // Fallback: check effective date range assignments
            var effectiveAssignments = shiftAssignmentRepository
                    .findActiveEffectiveAssignmentsForDate(tenantId, date);
            assignment = effectiveAssignments.stream()
                    .filter(a -> a.getEmployeeId().equals(employeeId))
                    .findFirst();
        }

        return assignment.map(a -> shiftRepository.findById(a.getShiftId()).orElse(null)).orElse(null);
    }

    /**
     * Check if the employee is late based on their assigned shift.
     *
     * @return number of late minutes, or 0 if not late
     */
    public int calculateLateMinutes(UUID employeeId, LocalDate date, LocalDateTime checkInTime) {
        Shift shift = getAssignedShift(employeeId, date);
        if (shift == null) {
            return 0; // No shift assigned, cannot determine lateness
        }

        LocalTime expectedStart = shift.getStartTime();
        int gracePeriod = shift.getGracePeriodInMinutes() != null ? shift.getGracePeriodInMinutes() : 0;

        LocalTime graceEnd = expectedStart.plusMinutes(gracePeriod);
        LocalTime actualCheckIn = checkInTime.toLocalTime();

        if (actualCheckIn.isAfter(graceEnd)) {
            return (int) Duration.between(expectedStart, actualCheckIn).toMinutes();
        }

        return 0;
    }

    /**
     * Check if the employee left early based on their assigned shift.
     *
     * @return number of early departure minutes, or 0 if not early
     */
    public int calculateEarlyDepartureMinutes(UUID employeeId, LocalDate date, LocalDateTime checkOutTime) {
        Shift shift = getAssignedShift(employeeId, date);
        if (shift == null) {
            return 0;
        }

        LocalTime expectedEnd = shift.getEndTime();
        LocalTime actualCheckOut = checkOutTime.toLocalTime();

        // For night shifts, end time is on the next day
        if (Boolean.TRUE.equals(shift.getIsNightShift())) {
            // If checkout is after midnight but before expected end, it's early departure
            if (actualCheckOut.isBefore(expectedEnd)) {
                return (int) Duration.between(actualCheckOut, expectedEnd).toMinutes();
            }
            return 0;
        }

        if (actualCheckOut.isBefore(expectedEnd)) {
            return (int) Duration.between(actualCheckOut, expectedEnd).toMinutes();
        }

        return 0;
    }

    /**
     * Calculate overtime minutes based on shift's full day hours.
     *
     * @return overtime minutes, or 0 if no overtime
     */
    public int calculateOvertimeMinutes(UUID employeeId, LocalDate date, int workedMinutes) {
        Shift shift = getAssignedShift(employeeId, date);
        if (shift == null || !Boolean.TRUE.equals(shift.getAllowsOvertime())) {
            return 0;
        }

        int fullDayMinutes = shift.getFullDayHours().intValue() * 60;
        int breakMinutes = shift.getBreakDurationMinutes() != null ? shift.getBreakDurationMinutes() : 0;
        int expectedWorkMinutes = fullDayMinutes - breakMinutes;

        if (workedMinutes > expectedWorkMinutes) {
            return workedMinutes - expectedWorkMinutes;
        }

        return 0;
    }

    /**
     * Determine if a check-in time falls within the shift window (including flexible shifts).
     */
    public boolean isWithinShiftWindow(UUID employeeId, LocalDate date, LocalDateTime checkInTime) {
        Shift shift = getAssignedShift(employeeId, date);
        if (shift == null) {
            return true; // No shift constraint
        }

        LocalTime actualTime = checkInTime.toLocalTime();
        LocalTime shiftStart = shift.getStartTime();

        if (Boolean.TRUE.equals(shift.getIsFlexible())) {
            int flexWindow = shift.getFlexibleWindowMinutes() != null ? shift.getFlexibleWindowMinutes() : 120;
            LocalTime flexStart = shiftStart.minusMinutes(flexWindow);
            LocalTime flexEnd = shiftStart.plusMinutes(flexWindow);
            return !actualTime.isBefore(flexStart) && !actualTime.isAfter(flexEnd);
        }

        // For non-flexible shifts, allow check-in up to 2 hours before shift start
        LocalTime earlyAllowed = shiftStart.minusMinutes(120);
        return !actualTime.isBefore(earlyAllowed);
    }
}
