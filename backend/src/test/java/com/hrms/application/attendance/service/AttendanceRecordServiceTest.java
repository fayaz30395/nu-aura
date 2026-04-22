package com.hrms.application.attendance.service;

import com.hrms.application.shift.service.ShiftAttendanceService;
import com.hrms.common.config.AttendanceConfigProperties;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AttendanceRecordService Tests")
class AttendanceRecordServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private AttendanceTimeEntryRepository timeEntryRepository;
    @Mock
    private AttendanceConfigProperties config;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private ShiftAttendanceService shiftAttendanceService;
    @Mock
    private TenantAttendanceConfigService tenantAttendanceConfigService;
    @InjectMocks
    private AttendanceRecordService attendanceRecordService;
    private UUID tenantId;
    private UUID employeeId;
    private AttendanceRecord attendanceRecord;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        checkInTime = LocalDateTime.now().withHour(9).withMinute(0);
        checkOutTime = LocalDateTime.now().withHour(18).withMinute(0);

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        // Setup config defaults
        when(config.getMaxLookbackDays()).thenReturn(2);
        when(config.getMaxOvernightShiftHours()).thenReturn(16);

        // Setup tenant attendance config defaults
        when(tenantAttendanceConfigService.getConfig(any(UUID.class)))
                .thenReturn(TenantAttendanceConfigService.TenantAttendanceConfig.defaults());

        attendanceRecord = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(checkInTime.toLocalDate())
                .build();
        attendanceRecord.setId(UUID.randomUUID());
        attendanceRecord.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Check-In Tests")
    class CheckInTests {

        @Test
        @DisplayName("Should create new attendance record on first check-in using date from checkInTime")
        void shouldCreateNewRecordOnFirstCheckIn() {
            LocalDate checkInDate = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkInDate, tenantId))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkIn(
                    employeeId, checkInTime, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
            assertThat(result.getAttendanceDate()).isEqualTo(checkInDate);
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkInDate, tenantId);
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
            verify(timeEntryRepository).save(any(AttendanceTimeEntry.class));
        }

        @Test
        @DisplayName("Should use existing attendance record for same day check-in")
        void shouldUseExistingRecordForSameDayCheckIn() {
            LocalDate checkInDate = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkInDate, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkIn(
                    employeeId, checkInTime, "MOBILE", "Remote", "10.0.0.1");

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(attendanceRecord.getId());
        }

        @Test
        @DisplayName("Should throw exception when already checked in")
        void shouldThrowExceptionWhenAlreadyCheckedIn() {
            LocalDate checkInDate = checkInTime.toLocalDate();
            attendanceRecord.setId(UUID.randomUUID());
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkInDate, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(attendanceRecord.getId()))
                    .thenReturn(Optional.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(attendanceRecord.getId())
                            .checkInTime(checkInTime)
                            .build()));

            assertThatThrownBy(() -> attendanceRecordService.checkIn(
                    employeeId, checkInTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Already checked in");
        }

        @Test
        @DisplayName("Should extract date from checkInTime parameter, not use LocalDate.now()")
        void shouldExtractDateFromCheckInTimeParameter() {
            LocalDateTime pastCheckInTime = LocalDateTime.now().minusDays(5).withHour(9).withMinute(0);
            LocalDate pastDate = pastCheckInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, pastDate, tenantId))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        assertThat(saved.getAttendanceDate()).isEqualTo(pastDate);
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkIn(
                    employeeId, pastCheckInTime, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, pastDate, tenantId);
        }

        @Test
        @DisplayName("Should use current time when checkInTime is null")
        void shouldUseCurrentTimeWhenCheckInTimeIsNull() {
            LocalDate today = LocalDate.now();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkIn(
                    employeeId, null, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(employeeId), eq(today), eq(tenantId));
        }

        @Test
        @DisplayName("Should throw exception when tenant context is not set")
        void shouldThrowExceptionWhenTenantContextNotSet() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(null);
            tenantContextMock.when(TenantContext::requireCurrentTenant)
                    .thenThrow(new IllegalStateException("Tenant context not set"));

            assertThatThrownBy(() -> attendanceRecordService.checkIn(
                    employeeId, checkInTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not set");
        }

        @Test
        @DisplayName("Should throw exception when employeeId is null")
        void shouldThrowExceptionWhenEmployeeIdIsNull() {
            assertThatThrownBy(() -> attendanceRecordService.checkIn(
                    null, checkInTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Employee ID cannot be null");
        }
    }

    @Nested
    @DisplayName("Check-Out Tests")
    class CheckOutTests {

        @BeforeEach
        void resetTenantContext() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        }

        @Test
        @DisplayName("Should check out successfully when check-in exists for same day")
        void shouldCheckOutSuccessfully() {
            checkOutTime.toLocalDate();
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkOutDate, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(any()))
                    .thenReturn(Optional.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(attendanceRecord.getId())
                            .checkInTime(checkInTime)
                            .build()));
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getTotalWorkMinutes(any())).thenReturn(540);
            when(timeEntryRepository.getTotalBreakMinutes(any())).thenReturn(60);
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkOut(
                    employeeId, checkOutTime, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, checkOutDate, tenantId);
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should check out using yesterday's record for overnight shifts")
        void shouldCheckOutUsingYesterdaysRecordForOvernightShifts() {
            LocalDateTime yesterdayCheckIn = LocalDateTime.now().minusDays(1).withHour(22).withMinute(0);
            LocalDate yesterday = yesterdayCheckIn.toLocalDate();

            LocalDateTime todayCheckOut = LocalDateTime.now().withHour(6).withMinute(0);
            LocalDate today = todayCheckOut.toLocalDate();

            AttendanceRecord yesterdayRecord = AttendanceRecord.builder()
                    .employeeId(employeeId)
                    .attendanceDate(yesterday)
                    .build();
            yesterdayRecord.setId(UUID.randomUUID());
            yesterdayRecord.setTenantId(tenantId);
            yesterdayRecord.checkIn(yesterdayCheckIn, "WEB", "Office", "192.168.1.1");

            // First lookup for today returns empty
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.empty());
            // Second lookup for yesterday returns the record with open check-in
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, yesterday, tenantId))
                    .thenReturn(Optional.of(yesterdayRecord));
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(any()))
                    .thenReturn(Optional.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(yesterdayRecord.getId())
                            .checkInTime(yesterdayCheckIn)
                            .build()));
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getTotalWorkMinutes(any())).thenReturn(480);
            when(timeEntryRepository.getTotalBreakMinutes(any())).thenReturn(0);
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkOut(
                    employeeId, todayCheckOut, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            assertThat(result.getAttendanceDate()).isEqualTo(yesterday);
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId);
            verify(attendanceRecordRepository).findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, yesterday, tenantId);
        }

        @Test
        @DisplayName("Should throw exception when no open check-in found in last 3 days")
        void shouldThrowExceptionWhenNoCheckInFound() {
            LocalDate checkOutDate = checkOutTime.toLocalDate();

            // Mock all 3 days returning empty
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(employeeId), any(LocalDate.class), eq(tenantId)))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> attendanceRecordService.checkOut(
                    employeeId, checkOutTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No open check-in found");
        }

        @Test
        @DisplayName("Should skip already checked-out records when looking for open check-in")
        void shouldSkipAlreadyCheckedOutRecords() {
            LocalDate today = checkOutTime.toLocalDate();
            LocalDate yesterday = today.minusDays(1);

            // Today's record is already checked out
            UUID todayRecordId = UUID.randomUUID();
            AttendanceRecord todayRecord = AttendanceRecord.builder()
                    .employeeId(employeeId)
                    .attendanceDate(today)
                    .build();
            todayRecord.setId(todayRecordId);
            todayRecord.setTenantId(tenantId);
            todayRecord.checkIn(checkInTime.minusHours(2), "WEB", "Office", "192.168.1.1");
            todayRecord.checkOut(checkInTime.minusHours(1), "WEB", "Office", "192.168.1.1");

            // Yesterday's record has open check-in
            UUID yesterdayRecordId = UUID.randomUUID();
            AttendanceRecord yesterdayRecord = AttendanceRecord.builder()
                    .employeeId(employeeId)
                    .attendanceDate(yesterday)
                    .build();
            yesterdayRecord.setId(yesterdayRecordId);
            yesterdayRecord.setTenantId(tenantId);
            yesterdayRecord.checkIn(yesterday.atTime(22, 0), "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(todayRecord));
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, yesterday, tenantId))
                    .thenReturn(Optional.of(yesterdayRecord));
            // Today's record has no open time entry (already checked out)
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(todayRecordId))
                    .thenReturn(Optional.empty());
            // Yesterday's record has an open time entry
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(yesterdayRecordId))
                    .thenReturn(Optional.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(yesterdayRecordId)
                            .checkInTime(yesterday.atTime(22, 0))
                            .build()));
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getTotalWorkMinutes(any())).thenReturn(480);
            when(timeEntryRepository.getTotalBreakMinutes(any())).thenReturn(0);
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.checkOut(
                    employeeId, checkOutTime, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            assertThat(result.getAttendanceDate()).isEqualTo(yesterday);
        }

        @Test
        @DisplayName("Should throw exception when checkout time is before check-in time")
        void shouldThrowExceptionWhenCheckoutBeforeCheckin() {
            LocalDate today = checkOutTime.toLocalDate();
            LocalDateTime earlyCheckout = checkInTime.minusHours(1);

            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));

            assertThatThrownBy(() -> attendanceRecordService.checkOut(
                    employeeId, earlyCheckout, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Check-out time cannot be before check-in time");
        }

        @Test
        @DisplayName("Should throw exception when tenant context is not set")
        void shouldThrowExceptionWhenTenantContextNotSet() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(null);
            tenantContextMock.when(TenantContext::requireCurrentTenant)
                    .thenThrow(new IllegalStateException("Tenant context not set"));

            assertThatThrownBy(() -> attendanceRecordService.checkOut(
                    employeeId, checkOutTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not set");
        }

        @Test
        @DisplayName("Should throw exception when employeeId is null")
        void shouldThrowExceptionWhenEmployeeIdIsNull() {
            assertThatThrownBy(() -> attendanceRecordService.checkOut(
                    null, checkOutTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Employee ID cannot be null");
        }
    }

    @Nested
    @DisplayName("Bulk Operations Tests")
    class BulkOperationsTests {

        @BeforeEach
        void resetTenantContext() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        }

        @Test
        @DisplayName("Should bulk check-in multiple employees")
        void shouldBulkCheckInMultipleEmployees() {
            List<UUID> employeeIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
            LocalDate checkInDate = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    any(), eq(checkInDate), eq(tenantId)))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecordService.BulkResult result = attendanceRecordService.bulkCheckIn(
                    employeeIds, checkInTime, "BIOMETRIC", "Main Office", "192.168.1.100");

            assertThat(result.successful()).hasSize(3);
            assertThat(result.failed()).isEmpty();
            assertThat(result.totalCount()).isEqualTo(3);
            assertThat(result.successCount()).isEqualTo(3);
            assertThat(result.failureCount()).isEqualTo(0);
            assertThat(result.hasFailures()).isFalse();
        }

        @Test
        @DisplayName("Should handle partial failures in bulk check-in")
        void shouldHandlePartialFailuresInBulkCheckIn() {
            UUID successId = UUID.randomUUID();
            UUID failId = UUID.randomUUID();
            List<UUID> employeeIds = List.of(successId, failId);
            LocalDate checkInDate = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(successId), eq(checkInDate), eq(tenantId)))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(failId), eq(checkInDate), eq(tenantId)))
                    .thenThrow(new RuntimeException("Database error"));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecordService.BulkResult result = attendanceRecordService.bulkCheckIn(
                    employeeIds, checkInTime, "BIOMETRIC", "Main Office", "192.168.1.100");

            assertThat(result.successful()).hasSize(1);
            assertThat(result.failed()).hasSize(1);
            assertThat(result.failed().get(0).employeeId()).isEqualTo(failId);
            assertThat(result.hasFailures()).isTrue();
        }

        @Test
        @DisplayName("Should bulk check-out multiple employees")
        void shouldBulkCheckOutMultipleEmployees() {
            List<UUID> employeeIds = List.of(UUID.randomUUID(), UUID.randomUUID());
            LocalDate checkOutDate = checkOutTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    any(), eq(checkOutDate), eq(tenantId)))
                    .thenAnswer(invocation -> {
                        UUID empId = invocation.getArgument(0);
                        AttendanceRecord record = AttendanceRecord.builder()
                                .employeeId(empId)
                                .attendanceDate(checkOutDate)
                                .build();
                        record.setId(UUID.randomUUID());
                        record.setTenantId(tenantId);
                        record.checkIn(checkInTime, "BIOMETRIC", "Main Office", "192.168.1.100");
                        return Optional.of(record);
                    });
            when(timeEntryRepository.findOpenEntryByAttendanceRecordId(any()))
                    .thenReturn(Optional.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(UUID.randomUUID())
                            .checkInTime(checkInTime)
                            .build()));
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getTotalWorkMinutes(any())).thenReturn(540);
            when(timeEntryRepository.getTotalBreakMinutes(any())).thenReturn(60);
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecordService.BulkResult result = attendanceRecordService.bulkCheckOut(
                    employeeIds, checkOutTime, "BIOMETRIC", "Main Office", "192.168.1.100");

            assertThat(result.successful()).hasSize(2);
            assertThat(result.failed()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Regularization Tests")
    class RegularizationTests {

        @BeforeEach
        void resetTenantContext() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        }

        @Test
        @DisplayName("Should request regularization successfully")
        void shouldRequestRegularizationSuccessfully() {
            when(attendanceRecordRepository.findById(attendanceRecord.getId()))
                    .thenReturn(Optional.of(attendanceRecord));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.requestRegularization(
                    attendanceRecord.getId(), "Forgot to check out");

            assertThat(result).isNotNull();
            assertThat(result.getRegularizationRequested()).isTrue();
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should approve regularization successfully")
        void shouldApproveRegularizationSuccessfully() {
            UUID approverId = UUID.randomUUID();
            attendanceRecord.requestRegularization("Forgot to check out");

            when(attendanceRecordRepository.findById(attendanceRecord.getId()))
                    .thenReturn(Optional.of(attendanceRecord));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.approveRegularization(
                    attendanceRecord.getId(), approverId);

            assertThat(result).isNotNull();
            assertThat(result.getRegularizationApproved()).isTrue();
            assertThat(result.getApprovedBy()).isEqualTo(approverId);
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should reject regularization successfully")
        void shouldRejectRegularizationSuccessfully() {
            UUID rejectorId = UUID.randomUUID();
            attendanceRecord.requestRegularization("Forgot to check out");

            when(attendanceRecordRepository.findById(attendanceRecord.getId()))
                    .thenReturn(Optional.of(attendanceRecord));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceRecord result = attendanceRecordService.rejectRegularization(
                    attendanceRecord.getId(), rejectorId, "Invalid reason provided");

            assertThat(result).isNotNull();
            assertThat(result.getRegularizationApproved()).isFalse();
            assertThat(result.getApprovedBy()).isEqualTo(rejectorId);
            assertThat(result.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.ABSENT);
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should throw exception when record not found for regularization")
        void shouldThrowExceptionWhenRecordNotFound() {
            UUID nonExistentId = UUID.randomUUID();
            when(attendanceRecordRepository.findById(nonExistentId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> attendanceRecordService.requestRegularization(
                    nonExistentId, "Forgot to check out"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Attendance record not found");
        }
    }

    @Nested
    @DisplayName("Query Tests")
    class QueryTests {

        @BeforeEach
        void resetTenantContext() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        }

        @Test
        @DisplayName("Should get attendance by employee with pagination")
        void shouldGetAttendanceByEmployee() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<AttendanceRecord> page = new PageImpl<>(List.of(attendanceRecord));
            when(attendanceRecordRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable))
                    .thenReturn(page);

            Page<AttendanceRecord> result = attendanceRecordService.getAttendanceByEmployee(employeeId, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get attendance by date range")
        void shouldGetAttendanceByDateRange() {
            LocalDate startDate = LocalDate.now().minusDays(7);
            LocalDate endDate = LocalDate.now();
            when(attendanceRecordRepository.findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(
                    tenantId, employeeId, startDate, endDate))
                    .thenReturn(List.of(attendanceRecord));

            List<AttendanceRecord> result = attendanceRecordService.getAttendanceByDateRange(
                    employeeId, startDate, endDate);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should get pending regularizations")
        void shouldGetPendingRegularizations() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<AttendanceRecord> page = new PageImpl<>(List.of(attendanceRecord));
            when(attendanceRecordRepository.findPendingRegularizations(tenantId, pageable))
                    .thenReturn(page);

            Page<AttendanceRecord> result = attendanceRecordService.getPendingRegularizations(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get time entries for date")
        void shouldGetTimeEntriesForDate() {
            LocalDate today = LocalDate.now();
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.findByAttendanceRecordIdOrderBySequenceNumber(attendanceRecord.getId()))
                    .thenReturn(List.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(attendanceRecord.getId())
                            .checkInTime(checkInTime)
                            .build()));

            List<AttendanceTimeEntry> result = attendanceRecordService.getTimeEntriesForDate(
                    employeeId, today);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should return empty list when no record exists for date")
        void shouldReturnEmptyListWhenNoRecordExists() {
            LocalDate today = LocalDate.now();
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.empty());

            List<AttendanceTimeEntry> result = attendanceRecordService.getTimeEntriesForDate(
                    employeeId, today);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should get attendance for specific date")
        void shouldGetAttendanceForDate() {
            LocalDate today = LocalDate.now();
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));

            Optional<AttendanceRecord> result = attendanceRecordService.getAttendanceForDate(employeeId, today);

            assertThat(result).isPresent();
            assertThat(result.get().getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should check if employee is checked in")
        void shouldCheckIfEmployeeIsCheckedIn() {
            LocalDate today = LocalDate.now();
            attendanceRecord.setAttendanceDate(today);
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));

            boolean result = attendanceRecordService.isEmployeeCheckedIn(employeeId);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when employee is not checked in")
        void shouldReturnFalseWhenEmployeeNotCheckedIn() {
            LocalDate today = LocalDate.now();
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.empty());

            boolean result = attendanceRecordService.isEmployeeCheckedIn(employeeId);

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when employee already checked out")
        void shouldReturnFalseWhenEmployeeCheckedOut() {
            LocalDate today = LocalDate.now();
            attendanceRecord.setAttendanceDate(today);
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");
            attendanceRecord.checkOut(checkOutTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));

            boolean result = attendanceRecordService.isEmployeeCheckedIn(employeeId);

            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("Multi Check-In/Out Tests")
    class MultiCheckInOutTests {

        @BeforeEach
        void resetTenantContext() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        }

        @Test
        @DisplayName("Should create multi check-in for break tracking")
        void shouldCreateMultiCheckInForBreakTracking() {
            LocalDate today = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.getMaxSequenceNumber(attendanceRecord.getId())).thenReturn(1);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceTimeEntry result = attendanceRecordService.multiCheckIn(
                    employeeId, checkInTime, "LUNCH", "WEB", "Cafeteria", "192.168.1.1", "Lunch break");

            assertThat(result).isNotNull();
            assertThat(result.getEntryType()).isEqualTo(AttendanceTimeEntry.EntryType.LUNCH);
            verify(timeEntryRepository).save(any(AttendanceTimeEntry.class));
        }

        @Test
        @DisplayName("Should create new attendance record on first multi check-in")
        void shouldCreateNewRecordOnFirstMultiCheckIn() {
            LocalDate today = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> {
                        AttendanceRecord saved = invocation.getArgument(0);
                        saved.setId(UUID.randomUUID());
                        return saved;
                    });
            when(timeEntryRepository.getMaxSequenceNumber(any())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceTimeEntry result = attendanceRecordService.multiCheckIn(
                    employeeId, checkInTime, "REGULAR", "WEB", "Office", "192.168.1.1", null);

            assertThat(result).isNotNull();
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
            verify(timeEntryRepository).save(any(AttendanceTimeEntry.class));
        }

        @Test
        @DisplayName("Should close open time entry on multi check-out")
        void shouldCloseOpenTimeEntryOnMultiCheckOut() {
            LocalDate today = checkOutTime.toLocalDate();
            UUID timeEntryId = UUID.randomUUID();

            AttendanceTimeEntry openEntry = AttendanceTimeEntry.builder()
                    .attendanceRecordId(attendanceRecord.getId())
                    .checkInTime(checkInTime)
                    .entryType(AttendanceTimeEntry.EntryType.LUNCH)
                    .build();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.findById(timeEntryId))
                    .thenReturn(Optional.of(openEntry));
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(timeEntryRepository.getTotalWorkMinutes(any())).thenReturn(420);
            when(timeEntryRepository.getTotalBreakMinutes(any())).thenReturn(60);
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceTimeEntry result = attendanceRecordService.multiCheckOut(
                    employeeId, timeEntryId, checkOutTime, "WEB", "Office", "192.168.1.1");

            assertThat(result).isNotNull();
            assertThat(result.getCheckOutTime()).isEqualTo(checkOutTime);
            verify(timeEntryRepository).save(any(AttendanceTimeEntry.class));
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should parse unknown entry type as REGULAR")
        void shouldParseUnknownEntryTypeAsRegular() {
            LocalDate today = checkInTime.toLocalDate();

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, today, tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.getMaxSequenceNumber(attendanceRecord.getId())).thenReturn(0);
            when(timeEntryRepository.save(any(AttendanceTimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            AttendanceTimeEntry result = attendanceRecordService.multiCheckIn(
                    employeeId, checkInTime, "UNKNOWN_TYPE", "WEB", "Office", "192.168.1.1", null);

            assertThat(result).isNotNull();
            assertThat(result.getEntryType()).isEqualTo(AttendanceTimeEntry.EntryType.REGULAR);
        }
    }

    @Nested
    @DisplayName("Domain Entity Tests")
    class DomainEntityTests {

        @Test
        @DisplayName("AttendanceRecord hasOpenCheckIn should return true when checked in but not out")
        void attendanceRecordHasOpenCheckIn() {
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            assertThat(attendanceRecord.hasOpenCheckIn()).isTrue();
            assertThat(attendanceRecord.isComplete()).isFalse();
        }

        @Test
        @DisplayName("AttendanceRecord isComplete should return true when both checked in and out")
        void attendanceRecordIsComplete() {
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");
            attendanceRecord.checkOut(checkOutTime, "WEB", "Office", "192.168.1.1");

            assertThat(attendanceRecord.hasOpenCheckIn()).isFalse();
            assertThat(attendanceRecord.isComplete()).isTrue();
        }

        @Test
        @DisplayName("AttendanceRecord rejectRegularization should update status to ABSENT")
        void attendanceRecordRejectRegularization() {
            attendanceRecord.requestRegularization("Forgot to check out");
            UUID rejectorId = UUID.randomUUID();

            attendanceRecord.rejectRegularization(rejectorId, "Invalid reason");

            assertThat(attendanceRecord.getRegularizationApproved()).isFalse();
            assertThat(attendanceRecord.getApprovedBy()).isEqualTo(rejectorId);
            assertThat(attendanceRecord.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.ABSENT);
            assertThat(attendanceRecord.getRegularizationReason()).contains("[REJECTED:");
        }
    }
}
