package com.hrms.application.shift.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.shift.Shift;
import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.infrastructure.shift.repository.ShiftAssignmentRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;
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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ShiftAttendanceService Tests")
class ShiftAttendanceServiceTest {

    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Mock
    private ShiftRepository shiftRepository;

    @InjectMocks
    private ShiftAttendanceService shiftAttendanceService;

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
    }

    private Shift buildShift(LocalTime start, LocalTime end, boolean nightShift, int gracePeriod) {
        return Shift.builder()
                .id(shiftId)
                .tenantId(tenantId)
                .shiftCode("GEN")
                .shiftName("General")
                .startTime(start)
                .endTime(end)
                .isNightShift(nightShift)
                .gracePeriodInMinutes(gracePeriod)
                .fullDayHours(new BigDecimal("8.00"))
                .breakDurationMinutes(60)
                .allowsOvertime(true)
                .isFlexible(false)
                .flexibleWindowMinutes(0)
                .build();
    }

    private void mockAssignmentWithShift(Shift shift) {
        ShiftAssignment assignment = ShiftAssignment.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .employeeId(employeeId)
                .shiftId(shift.getId())
                .build();

        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.of(assignment));
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
    }

    @Test
    @DisplayName("calculateLateMinutes - should return 0 when within grace period")
    void calculateLateMinutes_withinGrace() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        int late = shiftAttendanceService.calculateLateMinutes(
                employeeId, LocalDate.now(), LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 10)));

        assertThat(late).isEqualTo(0);
    }

    @Test
    @DisplayName("calculateLateMinutes - should return minutes when late beyond grace")
    void calculateLateMinutes_lateBeyondGrace() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        int late = shiftAttendanceService.calculateLateMinutes(
                employeeId, LocalDate.now(), LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 30)));

        assertThat(late).isEqualTo(30);
    }

    @Test
    @DisplayName("calculateEarlyDepartureMinutes - should detect early departure")
    void calculateEarlyDepartureMinutes_shouldDetect() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        int early = shiftAttendanceService.calculateEarlyDepartureMinutes(
                employeeId, LocalDate.now(), LocalDateTime.of(LocalDate.now(), LocalTime.of(17, 0)));

        assertThat(early).isEqualTo(60);
    }

    @Test
    @DisplayName("calculateOvertimeMinutes - should calculate overtime")
    void calculateOvertimeMinutes_shouldCalculate() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        // Worked 10 hours (600 min), expected 8h - 1h break = 420 net, overtime = 180
        int overtime = shiftAttendanceService.calculateOvertimeMinutes(
                employeeId, LocalDate.now(), 600);

        assertThat(overtime).isEqualTo(180);
    }

    @Test
    @DisplayName("calculateOvertimeMinutes - should return 0 when no overtime")
    void calculateOvertimeMinutes_shouldReturnZero() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        int overtime = shiftAttendanceService.calculateOvertimeMinutes(
                employeeId, LocalDate.now(), 400);

        assertThat(overtime).isEqualTo(0);
    }

    @Test
    @DisplayName("getAssignedShift - should return null when no assignment")
    void getAssignedShift_shouldReturnNull() {
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.empty());
        when(shiftAssignmentRepository.findActiveEffectiveAssignmentsForDate(eq(tenantId), any()))
                .thenReturn(java.util.Collections.emptyList());

        Shift result = shiftAttendanceService.getAssignedShift(employeeId, LocalDate.now());

        assertThat(result).isNull();
    }
}
