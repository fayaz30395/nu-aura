package com.hrms.application.shift.service;

import com.hrms.api.shift.dto.ShiftAssignmentRequest;
import com.hrms.api.shift.dto.ShiftAssignmentResponse;
import com.hrms.api.shift.dto.ShiftRequest;
import com.hrms.api.shift.dto.ShiftResponse;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.shift.Shift;
import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.shift.repository.ShiftAssignmentRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ShiftManagementService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmployeeRepository employeeRepository;

    // ========== Shift Management ==========

    @Transactional
    public ShiftResponse createShift(ShiftRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating shift: {} for tenant: {}", request.getShiftCode(), tenantId);

        if (shiftRepository.existsByTenantIdAndShiftCode(tenantId, request.getShiftCode())) {
            throw new DuplicateResourceException("Shift code already exists: " + request.getShiftCode());
        }

        Shift shift = Shift.builder()
                .tenantId(tenantId)
                .shiftCode(request.getShiftCode())
                .shiftName(request.getShiftName())
                .description(request.getDescription())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .gracePeriodInMinutes(request.getGracePeriodInMinutes())
                .lateMarkAfterMinutes(request.getLateMarkAfterMinutes())
                .halfDayAfterMinutes(request.getHalfDayAfterMinutes())
                .fullDayHours(request.getFullDayHours())
                .breakDurationMinutes(request.getBreakDurationMinutes())
                .isNightShift(request.getIsNightShift())
                .workingDays(request.getWorkingDays())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .shiftType(request.getShiftType() != null ?
                        Shift.ShiftType.valueOf(request.getShiftType()) : Shift.ShiftType.FIXED)
                .isFlexible(request.getIsFlexible() != null ? request.getIsFlexible() : false)
                .flexibleWindowMinutes(request.getFlexibleWindowMinutes() != null ? request.getFlexibleWindowMinutes() : 0)
                .minGapBetweenShiftsHours(request.getMinGapBetweenShiftsHours() != null ? request.getMinGapBetweenShiftsHours() : 11)
                .colorCode(request.getColorCode())
                .allowsOvertime(request.getAllowsOvertime())
                .overtimeMultiplier(request.getOvertimeMultiplier())
                .build();

        shift = shiftRepository.save(shift);
        return mapToShiftResponse(shift);
    }

    @Transactional
    public ShiftResponse updateShift(UUID shiftId, ShiftRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Shift shift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        shift.setShiftName(request.getShiftName());
        shift.setDescription(request.getDescription());
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        shift.setGracePeriodInMinutes(request.getGracePeriodInMinutes());
        shift.setLateMarkAfterMinutes(request.getLateMarkAfterMinutes());
        shift.setHalfDayAfterMinutes(request.getHalfDayAfterMinutes());
        shift.setFullDayHours(request.getFullDayHours());
        shift.setBreakDurationMinutes(request.getBreakDurationMinutes());
        shift.setIsNightShift(request.getIsNightShift());
        shift.setWorkingDays(request.getWorkingDays());
        shift.setIsActive(request.getIsActive());
        if (request.getShiftType() != null) {
            shift.setShiftType(Shift.ShiftType.valueOf(request.getShiftType()));
        }
        shift.setIsFlexible(request.getIsFlexible());
        shift.setFlexibleWindowMinutes(request.getFlexibleWindowMinutes());
        shift.setMinGapBetweenShiftsHours(request.getMinGapBetweenShiftsHours());
        shift.setColorCode(request.getColorCode());
        shift.setAllowsOvertime(request.getAllowsOvertime());
        shift.setOvertimeMultiplier(request.getOvertimeMultiplier());

        shift = shiftRepository.save(shift);
        return mapToShiftResponse(shift);
    }

    @Transactional(readOnly = true)
    public ShiftResponse getShiftById(UUID shiftId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Shift shift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));
        return mapToShiftResponse(shift);
    }

    @Transactional(readOnly = true)
    public Page<ShiftResponse> getAllShifts(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<Shift> shifts = shiftRepository.findAllByTenantId(tenantId, pageable);
        return shifts.map(this::mapToShiftResponse);
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> getActiveShifts() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Shift> shifts = shiftRepository.findAllByTenantIdAndIsActive(tenantId, true);
        return shifts.stream()
                .map(this::mapToShiftResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteShift(UUID shiftId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Shift shift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));
        shiftRepository.delete(shift);
        log.info("Deleted shift: {}", shift.getShiftCode());
    }

    @Transactional
    public ShiftResponse activateShift(UUID shiftId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Shift shift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
        shift.setIsActive(true);
        shift = shiftRepository.save(shift);
        log.info("Activated shift: {}", shift.getShiftCode());
        return mapToShiftResponse(shift);
    }

    @Transactional
    public ShiftResponse deactivateShift(UUID shiftId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Shift shift = shiftRepository.findByIdAndTenantId(shiftId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
        shift.setIsActive(false);
        shift = shiftRepository.save(shift);
        log.info("Deactivated shift: {}", shift.getShiftCode());
        return mapToShiftResponse(shift);
    }

    // ========== Shift Assignment ==========

    @Transactional
    public ShiftAssignmentResponse assignShiftToEmployee(ShiftAssignmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Assigning shift {} to employee: {}", request.getShiftId(), request.getEmployeeId());

        // Validate employee and shift exist
        employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        shiftRepository.findByIdAndTenantId(request.getShiftId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        ShiftAssignment assignment = ShiftAssignment.builder()
                .tenantId(tenantId)
                .employeeId(request.getEmployeeId())
                .shiftId(request.getShiftId())
                .assignmentDate(request.getAssignmentDate())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .assignmentType(ShiftAssignment.AssignmentType.valueOf(request.getAssignmentType()))
                .status(ShiftAssignment.AssignmentStatus.ACTIVE)
                .isRecurring(request.getIsRecurring())
                .recurrencePattern(request.getRecurrencePattern())
                .notes(request.getNotes())
                .build();

        assignment = shiftAssignmentRepository.save(assignment);
        return mapToAssignmentResponse(assignment);
    }

    @Transactional(readOnly = true)
    public Page<ShiftAssignmentResponse> getEmployeeAssignments(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<ShiftAssignment> assignments = shiftAssignmentRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
        return assignments.map(this::mapToAssignmentResponse);
    }

    @Transactional(readOnly = true)
    public List<ShiftAssignmentResponse> getAssignmentsForDate(LocalDate date) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ShiftAssignment> assignments = shiftAssignmentRepository
                .findAllActiveAssignmentsForDate(tenantId, date);
        return assignments.stream()
                .map(this::mapToAssignmentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void cancelAssignment(UUID assignmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftAssignment assignment = shiftAssignmentRepository.findByIdAndTenantId(assignmentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        assignment.setStatus(ShiftAssignment.AssignmentStatus.CANCELLED);
        shiftAssignmentRepository.save(assignment);
        log.info("Cancelled assignment: {}", assignmentId);
    }

    // ========== Swap helpers (used by ShiftSwapService) ==========

    @Transactional(readOnly = true)
    public ShiftAssignment getAssignmentById(UUID assignmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return shiftAssignmentRepository.findByIdAndTenantId(assignmentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift assignment not found: " + assignmentId));
    }

    /**
     * Swap the shift IDs between two assignments (for SWAP type requests).
     */
    public void swapAssignments(UUID assignmentIdA, UUID assignmentIdB) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftAssignment a = shiftAssignmentRepository.findByIdAndTenantId(assignmentIdA, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentIdA));
        ShiftAssignment b = shiftAssignmentRepository.findByIdAndTenantId(assignmentIdB, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentIdB));

        UUID shiftA = a.getShiftId();
        a.setShiftId(b.getShiftId());
        b.setShiftId(shiftA);

        shiftAssignmentRepository.save(a);
        shiftAssignmentRepository.save(b);
        log.info("Swapped shift assignments: {} <-> {}", assignmentIdA, assignmentIdB);
    }

    /**
     * Transfer an assignment to a different employee (for GIVE_AWAY / PICK_UP type requests).
     */
    @Transactional
    public void transferAssignment(UUID assignmentId, UUID newEmployeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftAssignment assignment = shiftAssignmentRepository.findByIdAndTenantId(assignmentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        assignment.setEmployeeId(newEmployeeId);
        shiftAssignmentRepository.save(assignment);
        log.info("Transferred assignment {} to employee {}", assignmentId, newEmployeeId);
    }

    // ========== Mappers ==========

    private ShiftResponse mapToShiftResponse(Shift shift) {
        return ShiftResponse.builder()
                .id(shift.getId())
                .shiftCode(shift.getShiftCode())
                .shiftName(shift.getShiftName())
                .description(shift.getDescription())
                .startTime(shift.getStartTime())
                .endTime(shift.getEndTime())
                .gracePeriodInMinutes(shift.getGracePeriodInMinutes())
                .lateMarkAfterMinutes(shift.getLateMarkAfterMinutes())
                .halfDayAfterMinutes(shift.getHalfDayAfterMinutes())
                .fullDayHours(shift.getFullDayHours())
                .breakDurationMinutes(shift.getBreakDurationMinutes())
                .isNightShift(shift.getIsNightShift())
                .workingDays(shift.getWorkingDays())
                .isActive(shift.getIsActive())
                .shiftType(shift.getShiftType() != null ? shift.getShiftType().name() : null)
                .isFlexible(shift.getIsFlexible())
                .flexibleWindowMinutes(shift.getFlexibleWindowMinutes())
                .minGapBetweenShiftsHours(shift.getMinGapBetweenShiftsHours())
                .colorCode(shift.getColorCode())
                .allowsOvertime(shift.getAllowsOvertime())
                .overtimeMultiplier(shift.getOvertimeMultiplier())
                .netWorkingHours(shift.getNetWorkingHours())
                .createdAt(shift.getCreatedAt())
                .updatedAt(shift.getUpdatedAt())
                .build();
    }

    private ShiftAssignmentResponse mapToAssignmentResponse(ShiftAssignment assignment) {
        Employee employee = employeeRepository.findById(assignment.getEmployeeId()).orElse(null);
        Shift shift = shiftRepository.findById(assignment.getShiftId()).orElse(null);

        return ShiftAssignmentResponse.builder()
                .id(assignment.getId())
                .employeeId(assignment.getEmployeeId())
                .employeeName(employee != null ? employee.getFullName() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .shiftId(assignment.getShiftId())
                .shiftName(shift != null ? shift.getShiftName() : null)
                .shiftCode(shift != null ? shift.getShiftCode() : null)
                .shiftStartTime(shift != null ? shift.getStartTime() : null)
                .shiftEndTime(shift != null ? shift.getEndTime() : null)
                .assignmentDate(assignment.getAssignmentDate())
                .effectiveFrom(assignment.getEffectiveFrom())
                .effectiveTo(assignment.getEffectiveTo())
                .assignmentType(assignment.getAssignmentType().name())
                .status(assignment.getStatus().name())
                .isRecurring(assignment.getIsRecurring())
                .recurrencePattern(assignment.getRecurrencePattern())
                .notes(assignment.getNotes())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}
