package com.hrms.application.attendance.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AttendanceRecordService Tests")
class AttendanceRecordServiceTest {

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private AttendanceTimeEntryRepository timeEntryRepository;

    @InjectMocks
    private AttendanceRecordService attendanceRecordService;

    private static MockedStatic<TenantContext> tenantContextMock;

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

        attendanceRecord = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(LocalDate.now())
                .build();
        attendanceRecord.setId(UUID.randomUUID());
        attendanceRecord.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Check-In Tests")
    class CheckInTests {

        @Test
        @DisplayName("Should create new attendance record on first check-in")
        void shouldCreateNewRecordOnFirstCheckIn() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, LocalDate.now(), tenantId))
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
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
            verify(timeEntryRepository).save(any(AttendanceTimeEntry.class));
        }

        @Test
        @DisplayName("Should use existing attendance record for same day check-in")
        void shouldUseExistingRecordForSameDayCheckIn() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, LocalDate.now(), tenantId))
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
    }

    @Nested
    @DisplayName("Check-Out Tests")
    class CheckOutTests {

        @Test
        @DisplayName("Should check out successfully when check-in exists")
        void shouldCheckOutSuccessfully() {
            attendanceRecord.checkIn(checkInTime, "WEB", "Office", "192.168.1.1");

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, LocalDate.now(), tenantId))
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
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("Should throw exception when no check-in found")
        void shouldThrowExceptionWhenNoCheckInFound() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, LocalDate.now(), tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> attendanceRecordService.checkOut(
                    employeeId, checkOutTime, "WEB", "Office", "192.168.1.1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No check-in found");
        }
    }

    @Nested
    @DisplayName("Bulk Operations Tests")
    class BulkOperationsTests {

        @Test
        @DisplayName("Should bulk check-in multiple employees")
        void shouldBulkCheckInMultipleEmployees() {
            List<UUID> employeeIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    any(), any(), any()))
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
        }

        @Test
        @DisplayName("Should handle partial failures in bulk check-in")
        void shouldHandlePartialFailuresInBulkCheckIn() {
            UUID successId = UUID.randomUUID();
            UUID failId = UUID.randomUUID();
            List<UUID> employeeIds = List.of(successId, failId);

            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(successId), any(), any()))
                    .thenReturn(Optional.empty());
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    eq(failId), any(), any()))
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
        }
    }

    @Nested
    @DisplayName("Regularization Tests")
    class RegularizationTests {

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
            verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
        }
    }

    @Nested
    @DisplayName("Query Tests")
    class QueryTests {

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
            when(attendanceRecordRepository.findAllByEmployeeIdAndAttendanceDateBetween(
                    employeeId, startDate, endDate))
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
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(
                    employeeId, LocalDate.now(), tenantId))
                    .thenReturn(Optional.of(attendanceRecord));
            when(timeEntryRepository.findByAttendanceRecordIdOrderBySequenceNumber(attendanceRecord.getId()))
                    .thenReturn(List.of(AttendanceTimeEntry.builder()
                            .attendanceRecordId(attendanceRecord.getId())
                            .checkInTime(checkInTime)
                            .build()));

            List<AttendanceTimeEntry> result = attendanceRecordService.getTimeEntriesForDate(
                    employeeId, LocalDate.now());

            assertThat(result).hasSize(1);
        }
    }
}
