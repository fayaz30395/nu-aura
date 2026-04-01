package com.hrms.application.shift.service;

import com.hrms.api.shift.dto.ShiftRuleViolation;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.shift.Shift;
import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.shift.repository.ShiftAssignmentRepository;
import com.hrms.infrastructure.shift.repository.ShiftPatternRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ShiftScheduleService Tests")
class ShiftScheduleServiceTest {

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private ShiftPatternRepository shiftPatternRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ShiftScheduleService shiftScheduleService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID employeeId;
    private UUID shiftId;

    @BeforeAll
    static void setUpTenantContext() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownTenantContext() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        shiftId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("validateShiftRules - should detect min gap violation")
    void validateShiftRules_shouldDetectMinGapViolation() {
        // Target shift starts at 06:00
        Shift targetShift = Shift.builder()
                .id(shiftId)
                .tenantId(tenantId)
                .shiftCode("MOR")
                .shiftName("Morning")
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(14, 0))
                .minGapBetweenShiftsHours(11)
                .isNightShift(false)
                .build();

        // Previous day shift ends at 22:00 — only 8h gap (violates 11h rule)
        Shift prevShift = Shift.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .shiftCode("AFT")
                .shiftName("Afternoon")
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(22, 0))
                .isNightShift(false)
                .build();

        ShiftAssignment prevAssignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .employeeId(employeeId)
                .shiftId(prevShift.getId())
                .assignmentDate(LocalDate.now().minusDays(1))
                .build();

        Employee employee = Employee.builder()
                .id(employeeId)
                .firstName("John")
                .lastName("Doe")
                .build();

        when(shiftRepository.findByIdAndTenantId(shiftId, tenantId)).thenReturn(Optional.of(targetShift));
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.of(prevAssignment));
        when(shiftRepository.findById(prevShift.getId())).thenReturn(Optional.of(prevShift));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        List<ShiftRuleViolation> violations = shiftScheduleService.validateShiftRules(
                employeeId, shiftId, LocalDate.now());

        assertThat(violations).isNotEmpty();
        assertThat(violations.get(0).getRule()).isEqualTo("MIN_GAP_BETWEEN_SHIFTS");
        assertThat(violations.get(0).getSeverity()).isEqualTo("ERROR");
    }

    @Test
    @DisplayName("validateShiftRules - should detect max consecutive days violation")
    void validateShiftRules_shouldDetectMaxConsecutiveDaysViolation() {
        Shift targetShift = Shift.builder()
                .id(shiftId)
                .tenantId(tenantId)
                .shiftCode("GEN")
                .shiftName("General")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .minGapBetweenShiftsHours(11)
                .isNightShift(false)
                .build();

        Employee employee = Employee.builder()
                .id(employeeId)
                .firstName("Jane")
                .lastName("Smith")
                .build();

        when(shiftRepository.findByIdAndTenantId(shiftId, tenantId)).thenReturn(Optional.of(targetShift));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        // No previous day assignment (no gap violation)
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), eq(LocalDate.now().minusDays(1))))
                .thenReturn(Optional.empty());

        // 6 consecutive working days before today
        for (int i = 1; i <= 6; i++) {
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .id(UUID.randomUUID())
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .shiftId(shiftId)
                    .assignmentDate(LocalDate.now().minusDays(i))
                    .build();
            when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                    eq(tenantId), eq(employeeId), eq(LocalDate.now().minusDays(i))))
                    .thenReturn(Optional.of(assignment));
        }

        List<ShiftRuleViolation> violations = shiftScheduleService.validateShiftRules(
                employeeId, shiftId, LocalDate.now());

        assertThat(violations).anyMatch(v -> v.getRule().equals("MAX_CONSECUTIVE_DAYS"));
    }

    @Test
    @DisplayName("validateShiftRules - should return no violations when rules pass")
    void validateShiftRules_shouldReturnNoViolationsWhenRulesPass() {
        Shift targetShift = Shift.builder()
                .id(shiftId)
                .tenantId(tenantId)
                .shiftCode("GEN")
                .shiftName("General")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .minGapBetweenShiftsHours(11)
                .isNightShift(false)
                .build();

        Employee employee = Employee.builder()
                .id(employeeId)
                .firstName("Bob")
                .lastName("Jones")
                .build();

        when(shiftRepository.findByIdAndTenantId(shiftId, tenantId)).thenReturn(Optional.of(targetShift));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        // No previous day assignment — no gap violation
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                any(), eq(employeeId), any()))
                .thenReturn(Optional.empty());

        List<ShiftRuleViolation> violations = shiftScheduleService.validateShiftRules(
                employeeId, shiftId, LocalDate.now());

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("getEmployeeSchedule - should return schedule entries")
    void getEmployeeSchedule_shouldReturnEntries() {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(6);

        ShiftAssignment assignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .employeeId(employeeId)
                .shiftId(shiftId)
                .assignmentDate(start)
                .effectiveFrom(start)
                .effectiveTo(end)
                .assignmentType(ShiftAssignment.AssignmentType.PERMANENT)
                .status(ShiftAssignment.AssignmentStatus.ACTIVE)
                .build();

        Shift shift = Shift.builder()
                .id(shiftId)
                .tenantId(tenantId)
                .shiftCode("GEN")
                .shiftName("General")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .colorCode("#3B82F6")
                .isNightShift(false)
                .fullDayHours(new BigDecimal("8.00"))
                .breakDurationMinutes(60)
                .build();

        Employee employee = Employee.builder()
                .id(employeeId)
                .firstName("Alice")
                .lastName("Williams")
                .employeeCode("EMP001")
                .build();

        when(shiftAssignmentRepository.findAssignmentsForEmployeeBetweenDates(
                tenantId, employeeId, start, end))
                .thenReturn(List.of(assignment));
        when(shiftRepository.findById(shiftId)).thenReturn(Optional.of(shift));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        var result = shiftScheduleService.getEmployeeSchedule(employeeId, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getShiftCode()).isEqualTo("GEN");
        assertThat(result.get(0).getEmployeeName()).isEqualTo("Alice Williams");
        assertThat(result.get(0).getDate()).isEqualTo(start);
    }
}
