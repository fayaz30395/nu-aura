package com.nulogic.application.attendance.service;

import com.nulogic.common.config.AttendanceConfigProperties;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.attendance.CompOffRequest;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.CompOffRequestRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompOffService Tests")
class CompOffServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private CompOffRequestRepository compOffRequestRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private AttendanceConfigProperties config;
    @InjectMocks
    private CompOffService compOffService;

    private UUID tenantId;
    private UUID employeeId;
    private LocalDate attendanceDate;

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
        attendanceDate = LocalDate.of(2025, 3, 15);

        lenient().when(config.getCompOff()).thenReturn(new AttendanceConfigProperties.CompOff());

        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    private AttendanceRecord overtimeRecord(int overtimeMinutes) {
        AttendanceRecord record = new AttendanceRecord();
        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);
        record.setEmployeeId(employeeId);
        record.setAttendanceDate(attendanceDate);
        record.setIsOvertime(true);
        record.setOvertimeMinutes(overtimeMinutes);
        return record;
    }

    @Nested
    @DisplayName("Request Comp-Off (accrual)")
    class RequestCompOffTests {

        @Test
        @DisplayName("Should raise a PENDING comp-off request for a full-day of overtime")
        void shouldRaiseRequestForFullDayOvertime() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.of(overtimeRecord(480)));
            when(compOffRequestRepository.existsByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate))
                    .thenReturn(false);
            when(compOffRequestRepository.save(any(CompOffRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CompOffRequest result = compOffService.requestCompOff(employeeId, attendanceDate, "weekend go-live");

            assertThat(result.getStatus()).isEqualTo(CompOffRequest.CompOffStatus.PENDING);
            assertThat(result.getCompOffDays()).isEqualByComparingTo(new BigDecimal("1.0"));
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getReason()).isEqualTo("weekend go-live");
            assertThat(result.getRequestedBy()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should accrue a half-day for overtime below the full-day threshold")
        void shouldAccrueHalfDayForPartialOvertime() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.of(overtimeRecord(240)));
            when(compOffRequestRepository.existsByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate))
                    .thenReturn(false);
            when(compOffRequestRepository.save(any(CompOffRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CompOffRequest result = compOffService.requestCompOff(employeeId, attendanceDate, "late release");

            assertThat(result.getCompOffDays()).isEqualByComparingTo(new BigDecimal("0.5"));
        }

        @Test
        @DisplayName("Should reject overtime below the minimum threshold")
        void shouldRejectBelowMinimumOvertime() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.of(overtimeRecord(30)));

            assertThatThrownBy(() -> compOffService.requestCompOff(employeeId, attendanceDate, "not enough"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("below the minimum");
            verify(compOffRequestRepository, never()).save(any(CompOffRequest.class));
        }

        @Test
        @DisplayName("Should reject a request when the day has no overtime flag")
        void shouldRejectWhenNotOvertime() {
            AttendanceRecord record = overtimeRecord(480);
            record.setIsOvertime(false);
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.of(record));

            assertThatThrownBy(() -> compOffService.requestCompOff(employeeId, attendanceDate, "no OT"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("No overtime");
        }

        @Test
        @DisplayName("Should throw when the attendance record does not exist")
        void shouldThrowWhenAttendanceMissing() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> compOffService.requestCompOff(employeeId, attendanceDate, "missing"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Attendance record not found");
        }

        @Test
        @DisplayName("Should return the existing request idempotently when already raised")
        void shouldBeIdempotent() {
            when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId))
                    .thenReturn(Optional.of(overtimeRecord(480)));
            when(compOffRequestRepository.existsByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate))
                    .thenReturn(true);

            CompOffRequest existing = CompOffRequest.builder()
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .attendanceDate(attendanceDate)
                    .status(CompOffRequest.CompOffStatus.PENDING)
                    .build();
            when(compOffRequestRepository.findByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate))
                    .thenReturn(Optional.of(existing));

            CompOffRequest result = compOffService.requestCompOff(employeeId, attendanceDate, "again");

            assertThat(result).isSameAs(existing);
            verify(compOffRequestRepository, never()).save(any(CompOffRequest.class));
        }
    }

    @Nested
    @DisplayName("Approve Comp-Off (credit)")
    class ApproveCompOffTests {

        @Test
        @DisplayName("Should credit leave balance and transition PENDING → CREDITED")
        void shouldApproveAndCreditLeave() {
            CompOffRequest request = CompOffRequest.builder()
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .attendanceDate(attendanceDate)
                    .compOffDays(new BigDecimal("1.0"))
                    .status(CompOffRequest.CompOffStatus.PENDING)
                    .build();
            request.setId(UUID.randomUUID());

            LeaveType compOffType = LeaveType.builder()
                    .leaveCode("COMP_OFF")
                    .build();
            compOffType.setId(UUID.randomUUID());

            LeaveBalance balance = LeaveBalance.builder()
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .leaveTypeId(compOffType.getId())
                    .year(2025)
                    .openingBalance(BigDecimal.ZERO)
                    .build();
            balance.setId(UUID.randomUUID());

            UUID approverId = UUID.randomUUID();
            LocalDateTime now = LocalDateTime.of(2025, 3, 15, 10, 0);

            when(compOffRequestRepository.findByIdAndTenantId(request.getId(), tenantId))
                    .thenReturn(Optional.of(request));
            when(leaveTypeRepository.findByLeaveCodeAndTenantId("COMP_OFF", tenantId))
                    .thenReturn(Optional.of(compOffType));
            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, compOffType.getId(), 2025, tenantId))
                    .thenReturn(Optional.of(balance));
            when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2025, 3, 15));
            when(tenantTimeService.now(tenantId)).thenReturn(now);
            when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenAnswer(inv -> inv.getArgument(0));
            when(compOffRequestRepository.save(any(CompOffRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            CompOffRequest result = compOffService.approveCompOff(request.getId(), approverId, "approved");

            assertThat(result.getStatus()).isEqualTo(CompOffRequest.CompOffStatus.CREDITED);
            assertThat(result.getReviewedBy()).isEqualTo(approverId);
            assertThat(result.getReviewedAt()).isEqualTo(now);
            assertThat(result.getLeaveBalanceId()).isEqualTo(balance.getId());
        }

        @Test
        @DisplayName("Should reject approval when request is not PENDING")
        void shouldRejectApprovalWhenNotPending() {
            CompOffRequest request = CompOffRequest.builder()
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .attendanceDate(attendanceDate)
                    .status(CompOffRequest.CompOffStatus.CREDITED)
                    .build();
            request.setId(UUID.randomUUID());

            when(compOffRequestRepository.findByIdAndTenantId(request.getId(), tenantId))
                    .thenReturn(Optional.of(request));

            assertThatThrownBy(() -> compOffService.approveCompOff(request.getId(), UUID.randomUUID(), "note"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not in PENDING state");
            verify(leaveBalanceRepository, never()).save(any(LeaveBalance.class));
        }
    }

    @Nested
    @DisplayName("Reject Comp-Off")
    class RejectCompOffTests {

        @Test
        @DisplayName("Should transition PENDING → REJECTED without crediting leave")
        void shouldReject() {
            CompOffRequest request = CompOffRequest.builder()
                    .tenantId(tenantId)
                    .employeeId(employeeId)
                    .attendanceDate(attendanceDate)
                    .status(CompOffRequest.CompOffStatus.PENDING)
                    .build();
            request.setId(UUID.randomUUID());
            UUID approverId = UUID.randomUUID();

            when(compOffRequestRepository.findByIdAndTenantId(request.getId(), tenantId))
                    .thenReturn(Optional.of(request));
            when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
            when(compOffRequestRepository.save(any(CompOffRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            CompOffRequest result = compOffService.rejectCompOff(request.getId(), approverId, "not eligible");

            assertThat(result.getStatus()).isEqualTo(CompOffRequest.CompOffStatus.REJECTED);
            assertThat(result.getReviewedBy()).isEqualTo(approverId);
            verify(leaveBalanceRepository, never()).save(any(LeaveBalance.class));
        }
    }
}
