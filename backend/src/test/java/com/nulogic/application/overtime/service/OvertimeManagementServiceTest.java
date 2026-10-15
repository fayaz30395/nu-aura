package com.nulogic.application.overtime.service;

import com.nulogic.api.overtime.dto.OvertimeApprovalRequest;
import com.nulogic.api.overtime.dto.OvertimeRecordRequest;
import com.nulogic.api.overtime.dto.OvertimeRecordResponse;
import com.nulogic.application.attendance.service.AttendanceActorScope;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.overtime.OvertimePolicy;
import com.nulogic.domain.overtime.OvertimeRecord;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.overtime.repository.CompTimeBalanceRepository;
import com.nulogic.infrastructure.overtime.repository.CompTimeTransactionRepository;
import com.nulogic.infrastructure.overtime.repository.OvertimePolicyRepository;
import com.nulogic.infrastructure.overtime.repository.OvertimeRecordRepository;
import com.nulogic.infrastructure.shift.repository.ShiftRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OvertimeManagementService authorization")
class OvertimeManagementServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 14, 9, 0);

    @Mock
    private OvertimeRecordRepository overtimeRecordRepository;
    @Mock
    private OvertimePolicyRepository overtimePolicyRepository;
    @Mock
    private CompTimeBalanceRepository compTimeBalanceRepository;
    @Mock
    private CompTimeTransactionRepository compTimeTransactionRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private DomainEventPublisher domainEventPublisher;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private AttendanceActorScope actorScope;
    @InjectMocks
    private OvertimeManagementService service;

    private UUID tenantId;
    private UUID actor;
    private UUID other;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        actor = UUID.randomUUID();
        other = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);
        when(actorScope.requireActor()).thenReturn(actor);
        when(tenantTimeService.now(any())).thenReturn(NOW);
        when(overtimePolicyRepository.findDefaultPolicy(tenantId))
                .thenReturn(Optional.of(OvertimePolicy.builder().tenantId(tenantId).build()));
        when(overtimeRecordRepository.save(any(OvertimeRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.existsByIdAndTenantId(other, tenantId)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private OvertimeRecordRequest createRequest(UUID employeeId, Boolean preApproved) {
        return OvertimeRecordRequest.builder()
                .employeeId(employeeId)
                .overtimeDate(LocalDate.of(2026, 5, 13))
                .regularHours(new BigDecimal("8"))
                .actualHours(new BigDecimal("10"))
                .overtimeHours(new BigDecimal("2"))
                .overtimeType("REGULAR")
                .isPreApproved(preApproved)
                .build();
    }

    private OvertimeRecord pendingRecord(UUID owner) {
        OvertimeRecord record = OvertimeRecord.builder()
                .employeeId(owner)
                .overtimeDate(LocalDate.of(2026, 5, 13))
                .overtimeHours(new BigDecimal("2"))
                .multiplier(new BigDecimal("1.5"))
                .overtimeType(OvertimeRecord.OvertimeType.REGULAR)
                .status(OvertimeRecord.OvertimeStatus.PENDING)
                .build();
        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);
        when(overtimeRecordRepository.findByIdAndTenantId(record.getId(), tenantId)).thenReturn(Optional.of(record));
        return record;
    }

    // ---------- create ----------

    @Test
    @DisplayName("create: defaults to the authenticated employee and is PENDING under the default policy")
    void createForSelfIsPending() {
        OvertimeRecordResponse response = service.createOvertimeRecord(createRequest(null, null));

        assertThat(response.getEmployeeId()).isEqualTo(actor);
        assertThat(response.getStatus()).isEqualTo("PENDING");
        verify(actorScope, never()).requireApprovalAccess(any(), any());
    }

    @Test
    @DisplayName("create: a body naming another employee needs approval scope over them; denial saves nothing")
    void createForOtherOutOfScopeRefused() {
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));

        assertThatThrownBy(() -> service.createOvertimeRecord(createRequest(other, null)))
                .isInstanceOf(AccessDeniedException.class);
        verify(overtimeRecordRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: client pre-approval is refused for an employee recording their own overtime")
    void selfPreApprovalRefused() {
        assertThatThrownBy(() -> service.createOvertimeRecord(createRequest(actor, true)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.createOvertimeRecord(createRequest(null, true)))
                .isInstanceOf(AccessDeniedException.class);
        verify(overtimeRecordRepository, never()).save(any());
    }

    @Test
    @DisplayName("create: an in-scope approver may record pre-approved overtime for another employee, stamped with their id")
    void approverPreApprovesForOther() {
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE)).thenReturn(actor);

        OvertimeRecordResponse response = service.createOvertimeRecord(createRequest(other, true));

        assertThat(response.getEmployeeId()).isEqualTo(other);
        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getApprovedBy()).isEqualTo(actor);
    }

    @Test
    @DisplayName("create: non-positive overtime hours are rejected")
    void nonPositiveHoursRejected() {
        OvertimeRecordRequest request = createRequest(null, null);
        request.setOvertimeHours(BigDecimal.ZERO);

        assertThatThrownBy(() -> service.createOvertimeRecord(request)).isInstanceOf(ValidationException.class);
        verify(overtimeRecordRepository, never()).save(any());
    }

    // ---------- approve / reject ----------

    @Test
    @DisplayName("approve: out-of-scope or self approval is refused, no event, record stays PENDING")
    void approveRefusedLeavesNoMutation() {
        OvertimeRecord record = pendingRecord(other);
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("You cannot approve your own request"));

        assertThatThrownBy(() -> service.approveOrRejectOvertime(record.getId(),
                OvertimeApprovalRequest.builder().action("APPROVE").build()))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(record.getStatus()).isEqualTo(OvertimeRecord.OvertimeStatus.PENDING);
        verify(domainEventPublisher, never()).publish(any());
        verify(overtimeRecordRepository, never()).save(any());
    }

    @Test
    @DisplayName("approve: an in-scope approver approves; approver id is the authenticated actor and payroll event fires")
    void approveInScope() {
        OvertimeRecord record = pendingRecord(other);
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE)).thenReturn(actor);

        OvertimeRecordResponse response = service.approveOrRejectOvertime(record.getId(),
                OvertimeApprovalRequest.builder().action("APPROVE").build());

        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(record.getApprovedBy()).isEqualTo(actor);
        verify(domainEventPublisher).publish(any());
    }

    @Test
    @DisplayName("reject: out-of-scope approver is refused")
    void rejectOutOfScopeRefused() {
        OvertimeRecord record = pendingRecord(other);
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));

        assertThatThrownBy(() -> service.approveOrRejectOvertime(record.getId(),
                OvertimeApprovalRequest.builder().action("REJECT").rejectionReason("no").build()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(record.getStatus()).isEqualTo(OvertimeRecord.OvertimeStatus.PENDING);
    }

    // ---------- delete / reads ----------

    @Test
    @DisplayName("delete: another employee's record needs approval scope; own record does not")
    void deleteScope() {
        OvertimeRecord foreign = pendingRecord(other);
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));
        assertThatThrownBy(() -> service.deleteOvertimeRecord(foreign.getId())).isInstanceOf(AccessDeniedException.class);
        verify(overtimeRecordRepository, never()).delete(any(OvertimeRecord.class));

        OvertimeRecord own = pendingRecord(actor);
        service.deleteOvertimeRecord(own.getId());
        verify(overtimeRecordRepository).delete(own);
    }

    @Test
    @DisplayName("reads: record by id, by employee and comp-time views are refused outside view scope")
    void readsRefusedOutsideScope() {
        OvertimeRecord record = pendingRecord(other);
        doThrow(new AccessDeniedException("no access")).when(actorScope).requireViewAccess(other);

        assertThatThrownBy(() -> service.getOvertimeRecordById(record.getId())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getEmployeeOvertimeRecords(other, org.springframework.data.domain.Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getCompTimeBalance(other)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getTotalCompTimeBalance(other)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getCompTimeHistory(other, LocalDate.now(), LocalDate.now()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("lists: pending and all go through the scoped query, never an unscoped tenant-wide finder")
    void listsUseScopedQuery() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 5);
        when(overtimeRecordRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty(pageable));

        service.getPendingOvertimeRecords(pageable);
        service.getAllOvertimeRecords(pageable);

        verify(overtimeRecordRepository, org.mockito.Mockito.times(2))
                .findAll(any(org.springframework.data.jpa.domain.Specification.class), any(org.springframework.data.domain.Pageable.class));
        verify(overtimeRecordRepository, never()).findAll(any(org.springframework.data.domain.Pageable.class));
    }

    // ---------- comp time ----------

    @Test
    @DisplayName("comp-time accrue/use: out-of-scope or self target is refused before any balance is touched")
    void compTimeMutationsNeedApprovalScope() {
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));

        assertThatThrownBy(() -> service.accrueCompTime(other, BigDecimal.ONE, null, LocalDate.now()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.useCompTime(other, BigDecimal.ONE, null, LocalDate.now()))
                .isInstanceOf(AccessDeniedException.class);
        verify(compTimeBalanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("comp-time accrue: non-positive hours are rejected")
    void compTimeNonPositiveHoursRejected() {
        when(actorScope.requireApprovalAccess(other, Permission.ATTENDANCE_APPROVE)).thenReturn(actor);

        assertThatThrownBy(() -> service.accrueCompTime(other, new BigDecimal("-3"), null, LocalDate.now()))
                .isInstanceOf(ValidationException.class);
        verify(compTimeBalanceRepository, never()).save(any());
    }
}
