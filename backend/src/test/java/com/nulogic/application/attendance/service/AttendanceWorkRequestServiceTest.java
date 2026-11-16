package com.nulogic.application.attendance.service;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.attendance.AttendanceWorkRequest;
import com.nulogic.domain.attendance.AttendanceWorkRequest.RequestType;
import com.nulogic.domain.attendance.AttendanceWorkRequest.Status;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.AttendanceWorkRequestRepository;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AttendanceWorkRequestService Tests")
class AttendanceWorkRequestServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 16);

    @Mock
    private AttendanceWorkRequestRepository repository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private AttendanceActorScope actorScope;
    @Mock
    private AttendanceRecordRepository recordRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @InjectMocks
    private AttendanceWorkRequestService service;

    private UUID tenantId;
    private UUID employeeId;

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
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        lenient().when(actorScope.requireActor()).thenReturn(employeeId);
        lenient().when(tenantTimeService.today(tenantId)).thenReturn(TODAY);
        lenient().when(repository.save(any(AttendanceWorkRequest.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private AttendanceWorkRequest pending(UUID owner) {
        return AttendanceWorkRequest.builder().id(UUID.randomUUID()).tenantId(tenantId).employeeId(owner)
                .requestType(RequestType.WORK_FROM_HOME).startDate(TODAY).endDate(TODAY).reason("r").build();
    }

    @Nested
    class Create {
        @Test
        void createsPendingRequestForAuthenticatedEmployee() {
            AttendanceWorkRequest r = service.create(RequestType.WORK_FROM_HOME, TODAY, TODAY.plusDays(2), " plumber ");
            assertThat(r.getEmployeeId()).isEqualTo(employeeId);
            assertThat(r.getTenantId()).isEqualTo(tenantId);
            assertThat(r.getStatus()).isEqualTo(Status.PENDING);
            assertThat(r.getReason()).isEqualTo("plumber");
        }

        @Test
        void rejectsEndBeforeStart() {
            assertThatThrownBy(() -> service.create(RequestType.ON_DUTY, TODAY, TODAY.minusDays(1), "x"))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("End date");
        }

        @Test
        void rejectsRangeOverMaxDays() {
            assertThatThrownBy(() -> service.create(RequestType.WORK_FROM_HOME, TODAY, TODAY.plusDays(31), "x"))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("more than");
        }

        @Test
        void rejectsStartTooFarInPast() {
            LocalDate old = TODAY.minusDays(31);
            assertThatThrownBy(() -> service.create(RequestType.ON_DUTY, old, old, "x"))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("past");
        }

        @Test
        void remoteClockInMustBeSingleDay() {
            assertThatThrownBy(() -> service.create(RequestType.REMOTE_CLOCK_IN, TODAY, TODAY.plusDays(1), "x"))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("single day");
        }

        @Test
        void rejectsBlankReason() {
            assertThatThrownBy(() -> service.create(RequestType.WORK_FROM_HOME, TODAY, TODAY, "  "))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("Reason");
        }

        @Test
        void rejectsOverlappingActiveRequest() {
            when(repository.existsOverlapping(tenantId, employeeId, RequestType.WORK_FROM_HOME, TODAY, TODAY))
                    .thenReturn(true);
            assertThatThrownBy(() -> service.create(RequestType.WORK_FROM_HOME, TODAY, TODAY, "x"))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("already covers");
            verify(repository, never()).save(any());
        }
    }

    @Nested
    class Review {
        @Test
        void approveStampsReviewerAndStatus() {
            UUID approver = UUID.randomUUID();
            AttendanceWorkRequest r = pending(employeeId);
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            when(actorScope.requireApprovalAccess(employeeId, Permission.ATTENDANCE_APPROVE)).thenReturn(approver);
            when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.of(2026, 11, 16, 9, 0));

            AttendanceWorkRequest out = service.approve(r.getId(), "ok");
            assertThat(out.getStatus()).isEqualTo(Status.APPROVED);
            assertThat(out.getReviewedBy()).isEqualTo(approver);
            assertThat(out.getReviewNote()).isEqualTo("ok");
        }

        private AttendanceWorkRequest approveRange(RequestType type, int days) {
            AttendanceWorkRequest r = pending(employeeId);
            r.setRequestType(type);
            r.setEndDate(TODAY.plusDays(days - 1));
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            when(actorScope.requireApprovalAccess(employeeId, Permission.ATTENDANCE_APPROVE)).thenReturn(UUID.randomUUID());
            when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.of(2026, 11, 16, 9, 0));
            return r;
        }

        @Test
        void approvedWfhCreatesRemotePresentRecordPerNonHolidayDay() {
            AttendanceWorkRequest r = approveRange(RequestType.WORK_FROM_HOME, 3);
            lenient().when(holidayRepository.existsByTenantIdAndHolidayDate(tenantId, TODAY.plusDays(1))).thenReturn(true);
            service.approve(r.getId(), null);
            org.mockito.ArgumentCaptor<AttendanceRecord> c = org.mockito.ArgumentCaptor.forClass(AttendanceRecord.class);
            verify(recordRepository, times(2)).save(c.capture());
            assertThat(c.getAllValues()).allSatisfy(rec -> {
                assertThat(rec.getTenantId()).isEqualTo(tenantId);
                assertThat(rec.getEmployeeId()).isEqualTo(employeeId);
                assertThat(rec.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.PRESENT);
                assertThat(rec.getIsRemoteCheckin()).isTrue();
                assertThat(rec.getNotes()).contains("Work from home");
            });
        }

        @Test
        void approvedOnDutyKeepsRealClockTimesAndDoesNotSetRemoteFlag() {
            AttendanceWorkRequest r = approveRange(RequestType.ON_DUTY, 1);
            LocalDateTime in = LocalDateTime.of(2026, 11, 16, 9, 5);
            AttendanceRecord existing = AttendanceRecord.builder().tenantId(tenantId).employeeId(employeeId)
                    .attendanceDate(TODAY).checkInTime(in).status(AttendanceRecord.AttendanceStatus.INCOMPLETE).notes("x").build();
            when(recordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, TODAY, tenantId))
                    .thenReturn(Optional.of(existing));
            service.approve(r.getId(), null);
            assertThat(existing.getCheckInTime()).isEqualTo(in);
            assertThat(existing.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.INCOMPLETE);
            assertThat(existing.getIsRemoteCheckin()).isFalse();
            assertThat(existing.getNotes()).startsWith("x; On duty");
        }

        @Test
        void approvedRemoteClockInFlagsExistingAbsentRecord() {
            AttendanceWorkRequest r = approveRange(RequestType.REMOTE_CLOCK_IN, 1);
            AttendanceRecord existing = AttendanceRecord.builder().tenantId(tenantId).employeeId(employeeId)
                    .attendanceDate(TODAY).status(AttendanceRecord.AttendanceStatus.ABSENT).build();
            when(recordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, TODAY, tenantId))
                    .thenReturn(Optional.of(existing));
            service.approve(r.getId(), null);
            assertThat(existing.getIsRemoteCheckin()).isTrue();
            assertThat(existing.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.PRESENT);
        }

        @Test
        void rejectDoesNotTouchAttendance() {
            AttendanceWorkRequest r = approveRange(RequestType.WORK_FROM_HOME, 1);
            service.reject(r.getId(), "no");
            verifyNoInteractions(recordRepository);
        }

        @Test
        void outOfScopeApproverIsDenied() {
            AttendanceWorkRequest r = pending(employeeId);
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            when(actorScope.requireApprovalAccess(employeeId, Permission.ATTENDANCE_APPROVE))
                    .thenThrow(new AccessDeniedException("outside scope"));
            assertThatThrownBy(() -> service.reject(r.getId(), "no")).isInstanceOf(AccessDeniedException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void cannotReviewNonPending() {
            AttendanceWorkRequest r = pending(employeeId);
            r.setStatus(Status.APPROVED);
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            when(actorScope.requireApprovalAccess(any(), any())).thenReturn(UUID.randomUUID());
            assertThatThrownBy(() -> service.reject(r.getId(), "no")).isInstanceOf(IllegalStateException.class);
        }

        @Test
        void otherTenantIdIsNotFound() {
            UUID id = UUID.randomUUID();
            when(repository.findByIdAndTenantId(id, tenantId)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.approve(id, null)).isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    class Cancel {
        @Test
        void ownerCancelsPending() {
            AttendanceWorkRequest r = pending(employeeId);
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            assertThat(service.cancel(r.getId()).getStatus()).isEqualTo(Status.CANCELLED);
        }

        @Test
        void cannotCancelSomeoneElsesRequest() {
            AttendanceWorkRequest r = pending(UUID.randomUUID());
            when(repository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
            assertThatThrownBy(() -> service.cancel(r.getId())).isInstanceOf(AccessDeniedException.class);
        }
    }
}
