package com.hrms.application.shift.service;

import com.hrms.api.shift.dto.GenerateScheduleRequest;
import com.hrms.api.shift.dto.ScheduleEntryResponse;
import com.hrms.api.shift.dto.ShiftRuleViolation;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.shift.Shift;
import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.domain.shift.ShiftPattern;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.shift.repository.ShiftAssignmentRepository;
import com.hrms.infrastructure.shift.repository.ShiftPatternRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handles shift schedule generation, retrieval, and rule validation.
 * Rules enforced:
 * - Minimum 11h gap between consecutive shifts (configurable per shift)
 * - Maximum 6 consecutive working days
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftScheduleService {

    private static final int MAX_CONSECUTIVE_DAYS = 6;
    private static final String OFF_MARKER = "OFF";

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftPatternRepository shiftPatternRepository;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper;

    /**
     * Generate shift assignments for employees based on a pattern.
     */
    @Transactional
    public List<ScheduleEntryResponse> generateSchedule(GenerateScheduleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating schedule for tenant {} from {} to {}", tenantId, request.getStartDate(), request.getEndDate());

        ShiftPattern pattern = shiftPatternRepository.findByIdAndTenantId(request.getShiftPatternId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift pattern not found"));

        List<String> cycleShiftIds = parsePatternJson(pattern.getPattern());
        if (cycleShiftIds.isEmpty()) {
            throw new IllegalArgumentException("Shift pattern has no entries");
        }

        // Resolve employees
        List<UUID> resolvedEmployeeIds;
        if (request.getEmployeeIds() != null && !request.getEmployeeIds().isEmpty()) {
            resolvedEmployeeIds = request.getEmployeeIds();
        } else if (request.getDepartmentId() != null) {
            resolvedEmployeeIds = employeeRepository.findByTenantIdAndDepartmentIdIn(
                            tenantId, Set.of(request.getDepartmentId()))
                    .stream().map(Employee::getId).collect(Collectors.toList());
        } else {
            throw new IllegalArgumentException("Either employeeIds or departmentId is required");
        }
        final List<UUID> employeeIds = resolvedEmployeeIds;

        // Pre-load shift definitions used in the pattern
        Map<UUID, Shift> shiftCache = new HashMap<>();
        for (String shiftIdStr : cycleShiftIds) {
            if (!OFF_MARKER.equals(shiftIdStr)) {
                UUID shiftId = UUID.fromString(shiftIdStr);
                shiftCache.computeIfAbsent(shiftId, id ->
                        shiftRepository.findByIdAndTenantId(id, tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + id)));
            }
        }

        List<ShiftAssignment> generatedAssignments = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            // If overwrite, cancel existing assignments in the range
            if (Boolean.TRUE.equals(request.getOverwrite())) {
                List<ShiftAssignment> existing = shiftAssignmentRepository
                        .findAssignmentsForEmployeeBetweenDates(tenantId, employeeId,
                                request.getStartDate(), request.getEndDate());
                existing.forEach(a -> a.setStatus(ShiftAssignment.AssignmentStatus.CANCELLED));
                shiftAssignmentRepository.saveAll(existing);
            }

            // Generate day-by-day assignments from the pattern cycle
            LocalDate currentDate = request.getStartDate();
            int dayIndex = 0;
            while (!currentDate.isAfter(request.getEndDate())) {
                int cycleIndex = dayIndex % cycleShiftIds.size();
                String shiftIdStr = cycleShiftIds.get(cycleIndex);

                if (!OFF_MARKER.equals(shiftIdStr)) {
                    UUID shiftId = UUID.fromString(shiftIdStr);
                    ShiftAssignment assignment = ShiftAssignment.builder()
                            .tenantId(tenantId)
                            .employeeId(employeeId)
                            .shiftId(shiftId)
                            .assignmentDate(currentDate)
                            .effectiveFrom(request.getStartDate())
                            .effectiveTo(request.getEndDate())
                            .assignmentType(ShiftAssignment.AssignmentType.ROTATION)
                            .status(ShiftAssignment.AssignmentStatus.ACTIVE)
                            .isRecurring(true)
                            .recurrencePattern(pattern.getRotationType().name())
                            .notes("Auto-generated from pattern: " + pattern.getName())
                            .build();
                    generatedAssignments.add(assignment);
                }

                currentDate = currentDate.plusDays(1);
                dayIndex++;
            }
        }

        List<ShiftAssignment> saved = shiftAssignmentRepository.saveAll(generatedAssignments);
        log.info("Generated {} shift assignments", saved.size());

        return saved.stream()
                .map(a -> mapToScheduleEntry(a, shiftCache, employeeIds))
                .collect(Collectors.toList());
    }

    /**
     * Get employee schedule for a date range.
     */
    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> getEmployeeSchedule(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ShiftAssignment> assignments = shiftAssignmentRepository
                .findAssignmentsForEmployeeBetweenDates(tenantId, employeeId, startDate, endDate);

        return assignments.stream()
                .map(this::mapToScheduleEntryWithLookup)
                .collect(Collectors.toList());
    }

    /**
     * Get team schedule for a manager's direct reports.
     */
    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> getTeamSchedule(UUID managerId, LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Find all employees reporting to this manager
        List<Employee> teamMembers = employeeRepository.findDirectReportsByManagerId(tenantId, managerId);
        List<UUID> teamIds = teamMembers.stream().map(Employee::getId).collect(Collectors.toList());

        // Include the manager themselves
        teamIds.add(managerId);

        List<ScheduleEntryResponse> result = new ArrayList<>();
        for (UUID empId : teamIds) {
            List<ShiftAssignment> assignments = shiftAssignmentRepository
                    .findAssignmentsForEmployeeBetweenDates(tenantId, empId, startDate, endDate);
            assignments.stream()
                    .map(this::mapToScheduleEntryWithLookup)
                    .forEach(result::add);
        }

        return result;
    }

    /**
     * Validate shift rules for an employee on a specific date and shift.
     * Returns any violations found.
     */
    @Transactional(readOnly = true)
    public List<ShiftRuleViolation> validateShiftRules(UUID employeeId, UUID shiftId, LocalDate date) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ShiftRuleViolation> violations = new ArrayList<>();

        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        String empName = employee != null ? employee.getFullName() : "Unknown";

        Shift targetShift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        // Rule 1: Minimum gap between shifts (default 11 hours)
        int minGapHours = targetShift.getMinGapBetweenShiftsHours() != null
                ? targetShift.getMinGapBetweenShiftsHours() : 11;

        // Check previous day's shift
        LocalDate prevDay = date.minusDays(1);
        shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(tenantId, employeeId, prevDay)
                .ifPresent(prevAssignment -> {
                    Shift prevShift = shiftRepository.findById(prevAssignment.getShiftId()).orElse(null);
                    if (prevShift != null) {
                        LocalTime prevEnd = prevShift.getEndTime();
                        LocalTime targetStart = targetShift.getStartTime();

                        // Calculate gap considering overnight shifts
                        LocalDateTime prevEndDT = LocalDateTime.of(prevDay, prevEnd);
                        if (Boolean.TRUE.equals(prevShift.getIsNightShift())) {
                            prevEndDT = prevEndDT.plusDays(1); // Night shift ends next day
                        }
                        LocalDateTime targetStartDT = LocalDateTime.of(date, targetStart);

                        long gapHours = Duration.between(prevEndDT, targetStartDT).toHours();
                        if (gapHours < minGapHours) {
                            violations.add(ShiftRuleViolation.builder()
                                    .employeeId(employeeId)
                                    .employeeName(empName)
                                    .date(date)
                                    .rule("MIN_GAP_BETWEEN_SHIFTS")
                                    .description("Only " + gapHours + "h gap between shifts (minimum " + minGapHours + "h required)")
                                    .severity("ERROR")
                                    .build());
                        }
                    }
                });

        // Rule 2: Max consecutive working days
        int consecutiveDays = 0;
        for (int i = 1; i <= MAX_CONSECUTIVE_DAYS; i++) {
            LocalDate checkDate = date.minusDays(i);
            Optional<ShiftAssignment> assignment = shiftAssignmentRepository
                    .findActiveAssignmentForEmployeeOnDate(tenantId, employeeId, checkDate);
            if (assignment.isPresent()) {
                consecutiveDays++;
            } else {
                break;
            }
        }

        if (consecutiveDays >= MAX_CONSECUTIVE_DAYS) {
            violations.add(ShiftRuleViolation.builder()
                    .employeeId(employeeId)
                    .employeeName(empName)
                    .date(date)
                    .rule("MAX_CONSECUTIVE_DAYS")
                    .description("Employee has worked " + consecutiveDays + " consecutive days (max " + MAX_CONSECUTIVE_DAYS + ")")
                    .severity("WARNING")
                    .build());
        }

        return violations;
    }

    // ========== Internal helpers ==========

    private List<String> parsePatternJson(String patternJson) {
        try {
            return objectMapper.readValue(patternJson, new TypeReference<List<String>>() {});
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Failed to parse shift pattern JSON: {}", patternJson, e);
            throw new IllegalArgumentException("Invalid shift pattern format");
        }
    }

    private ScheduleEntryResponse mapToScheduleEntryWithLookup(ShiftAssignment assignment) {
        Employee employee = employeeRepository.findById(assignment.getEmployeeId()).orElse(null);
        Shift shift = shiftRepository.findById(assignment.getShiftId()).orElse(null);

        return ScheduleEntryResponse.builder()
                .assignmentId(assignment.getId())
                .employeeId(assignment.getEmployeeId())
                .employeeName(employee != null ? employee.getFullName() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .shiftId(assignment.getShiftId())
                .shiftName(shift != null ? shift.getShiftName() : null)
                .shiftCode(shift != null ? shift.getShiftCode() : null)
                .colorCode(shift != null ? shift.getColorCode() : null)
                .startTime(shift != null ? shift.getStartTime() : null)
                .endTime(shift != null ? shift.getEndTime() : null)
                .date(assignment.getAssignmentDate())
                .isNightShift(shift != null ? shift.getIsNightShift() : false)
                .isDayOff(false)
                .assignmentType(assignment.getAssignmentType().name())
                .status(assignment.getStatus().name())
                .build();
    }

    private ScheduleEntryResponse mapToScheduleEntry(ShiftAssignment assignment,
                                                      Map<UUID, Shift> shiftCache,
                                                      List<UUID> employeeIds) {
        Shift shift = shiftCache.get(assignment.getShiftId());
        Employee employee = employeeRepository.findById(assignment.getEmployeeId()).orElse(null);

        return ScheduleEntryResponse.builder()
                .assignmentId(assignment.getId())
                .employeeId(assignment.getEmployeeId())
                .employeeName(employee != null ? employee.getFullName() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .shiftId(assignment.getShiftId())
                .shiftName(shift != null ? shift.getShiftName() : null)
                .shiftCode(shift != null ? shift.getShiftCode() : null)
                .colorCode(shift != null ? shift.getColorCode() : null)
                .startTime(shift != null ? shift.getStartTime() : null)
                .endTime(shift != null ? shift.getEndTime() : null)
                .date(assignment.getAssignmentDate())
                .isNightShift(shift != null ? shift.getIsNightShift() : false)
                .isDayOff(false)
                .assignmentType(assignment.getAssignmentType().name())
                .status(assignment.getStatus().name())
                .build();
    }
}
