package com.hrms.application.shift.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
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

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @InjectMocks
    private ShiftAttendanceService shiftAttendanceService;
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

    // ==================== calculateOvertimeForRecord Tests ====================

    @Test
    @DisplayName("calculateOvertimeForRecord - should use shift thresholds when shift assigned")
    void calculateOvertimeForRecord_withShift() {
        // Shift: 8h full day, 1h break => 420 min expected work
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        mockAssignmentWithShift(shift);

        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(500)  // 500 min worked, expected 420 => 80 min overtime
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isTrue();
        assertThat(record.getOvertimeMinutes()).isEqualTo(80);
    }

    @Test
    @DisplayName("calculateOvertimeForRecord - should return 0 when shift disallows overtime")
    void calculateOvertimeForRecord_shiftDisallowsOvertime() {
        Shift shift = buildShift(LocalTime.of(9, 0), LocalTime.of(18, 0), false, 15);
        shift.setAllowsOvertime(false);
        mockAssignmentWithShift(shift);

        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(600)
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isFalse();
        assertThat(record.getOvertimeMinutes()).isEqualTo(0);
    }

    @Test
    @DisplayName("calculateOvertimeForRecord - should use defaults when no shift assigned (overtime after 9h)")
    void calculateOvertimeForRecord_noShift_overtime() {
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.empty());
        when(shiftAssignmentRepository.findActiveEffectiveAssignmentsForDate(eq(tenantId), any()))
                .thenReturn(java.util.Collections.emptyList());

        // 10 hours = 600 minutes, threshold is 540 (9h), overtime = 600 - 480 = 120
        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(600)
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isTrue();
        assertThat(record.getOvertimeMinutes()).isEqualTo(120);  // 600 - 480 = 120
    }

    @Test
    @DisplayName("calculateOvertimeForRecord - should return 0 when no shift and under 9h threshold")
    void calculateOvertimeForRecord_noShift_noOvertime() {
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.empty());
        when(shiftAssignmentRepository.findActiveEffectiveAssignmentsForDate(eq(tenantId), any()))
                .thenReturn(java.util.Collections.emptyList());

        // 8.5 hours = 510 minutes, under 540 threshold
        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(510)
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isFalse();
        assertThat(record.getOvertimeMinutes()).isEqualTo(0);
    }

    @Test
    @DisplayName("calculateOvertimeForRecord - should handle null/zero work duration")
    void calculateOvertimeForRecord_nullWorkDuration() {
        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(0)
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isFalse();
        assertThat(record.getOvertimeMinutes()).isEqualTo(0);
    }

    @Test
    @DisplayName("calculateOvertimeForRecord - should use default thresholds: exactly 9h = no overtime")
    void calculateOvertimeForRecord_noShift_exactly9h() {
        when(shiftAssignmentRepository.findActiveAssignmentForEmployeeOnDate(
                eq(tenantId), eq(employeeId), any()))
                .thenReturn(Optional.empty());
        when(shiftAssignmentRepository.findActiveEffectiveAssignmentsForDate(eq(tenantId), any()))
                .thenReturn(java.util.Collections.emptyList());

        // Exactly 540 minutes (9h) — threshold is > 540, so no overtime
        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .workDurationMinutes(540)
                .build();
        record.setTenantId(tenantId);

        shiftAttendanceService.calculateOvertimeForRecord(record);

        assertThat(record.getIsOvertime()).isFalse();
        assertThat(record.getOvertimeMinutes()).isEqualTo(0);
    }
}
