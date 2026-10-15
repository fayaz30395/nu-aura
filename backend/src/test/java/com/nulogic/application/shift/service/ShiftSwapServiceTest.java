package com.nulogic.application.shift.service;

import com.nulogic.application.attendance.service.AttendanceActorScope;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.shift.ShiftAssignment;
import com.nulogic.domain.shift.ShiftSwapRequest;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.shift.repository.ShiftSwapRequestRepository;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ShiftSwapService authorization")
class ShiftSwapServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 14, 9, 0);

    @Mock
    private ShiftSwapRequestRepository swapRequestRepository;
    @Mock
    private ShiftManagementService shiftManagementService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private AttendanceActorScope actorScope;
    @Mock
    private EmployeeRepository employeeRepository;
    @InjectMocks
    private ShiftSwapService service;

    private UUID tenantId;
    private UUID requester;
    private UUID target;
    private UUID manager;
    private UUID requesterAssignmentId;
    private UUID targetAssignmentId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        requester = UUID.randomUUID();
        target = UUID.randomUUID();
        manager = UUID.randomUUID();
        requesterAssignmentId = UUID.randomUUID();
        targetAssignmentId = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);
        when(tenantTimeService.now(any())).thenReturn(NOW);
        when(swapRequestRepository.save(any(ShiftSwapRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.existsByIdAndTenantId(target, tenantId)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ShiftAssignment assignment(UUID id, UUID owner) {
        return ShiftAssignment.builder().id(id).employeeId(owner).tenantId(tenantId).build();
    }

    private ShiftSwapRequest request(ShiftSwapRequest.SwapType type, ShiftSwapRequest.SwapStatus status) {
        ShiftSwapRequest r = ShiftSwapRequest.builder()
                .tenantId(tenantId)
                .requesterEmployeeId(requester)
                .requesterAssignmentId(requesterAssignmentId)
                .targetEmployeeId(target)
                .targetAssignmentId(targetAssignmentId)
                .swapType(type)
                .status(status)
                .build();
        r.setId(UUID.randomUUID());
        when(swapRequestRepository.findByIdAndTenantId(r.getId(), tenantId)).thenReturn(Optional.of(r));
        return r;
    }

    private void owners() {
        when(shiftManagementService.getAssignmentById(requesterAssignmentId)).thenReturn(assignment(requesterAssignmentId, requester));
        when(shiftManagementService.getAssignmentById(targetAssignmentId)).thenReturn(assignment(targetAssignmentId, target));
    }

    // ---------- submit ----------

    @Test
    @DisplayName("submit: requester is the authenticated actor and the offered shift must be theirs")
    void submitStampsActorAsRequester() {
        when(actorScope.requireActor()).thenReturn(requester);
        owners();

        ShiftSwapRequest result = service.submitSwapRequest(requesterAssignmentId, LocalDate.now(), target,
                targetAssignmentId, LocalDate.now(), ShiftSwapRequest.SwapType.SWAP, "personal");

        assertThat(result.getRequesterEmployeeId()).isEqualTo(requester);
        assertThat(result.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING);
    }

    @Test
    @DisplayName("submit: offering someone else's assignment is refused and nothing is saved")
    void submitForeignAssignmentRefused() {
        when(actorScope.requireActor()).thenReturn(UUID.randomUUID());
        owners();

        assertThatThrownBy(() -> service.submitSwapRequest(requesterAssignmentId, LocalDate.now(), target,
                targetAssignmentId, LocalDate.now(), ShiftSwapRequest.SwapType.SWAP, "x"))
                .isInstanceOf(AccessDeniedException.class);
        verify(swapRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("submit: swapping with yourself, an unknown target, or a mismatched target assignment is refused")
    void submitInvalidTargetsRefused() {
        when(actorScope.requireActor()).thenReturn(requester);
        owners();
        UUID stranger = UUID.randomUUID();

        assertThatThrownBy(() -> service.submitSwapRequest(requesterAssignmentId, LocalDate.now(), requester,
                targetAssignmentId, LocalDate.now(), ShiftSwapRequest.SwapType.SWAP, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.submitSwapRequest(requesterAssignmentId, LocalDate.now(), stranger,
                targetAssignmentId, LocalDate.now(), ShiftSwapRequest.SwapType.SWAP, "x"))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
        // target assignment belongs to target, but request names another employee as the target
        when(employeeRepository.existsByIdAndTenantId(stranger, tenantId)).thenReturn(true);
        assertThatThrownBy(() -> service.submitSwapRequest(requesterAssignmentId, LocalDate.now(), stranger,
                targetAssignmentId, LocalDate.now(), ShiftSwapRequest.SwapType.SWAP, "x"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong");
        verify(swapRequestRepository, never()).save(any());
    }

    // ---------- target response / cancel ----------

    @Test
    @DisplayName("accept: only the target can accept; another employee is refused and the request stays PENDING")
    void acceptByNonTargetRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING);
        when(actorScope.requireActor()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> service.acceptByTarget(r.getId())).isInstanceOf(AccessDeniedException.class);

        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING);
        verify(swapRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("accept: target accepts a SWAP and it moves to manager approval without touching assignments")
    void acceptByTargetMovesToPendingApproval() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING);
        when(actorScope.requireActor()).thenReturn(target);

        ShiftSwapRequest result = service.acceptByTarget(r.getId());

        assertThat(result.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        verify(shiftManagementService, never()).swapAssignments(any(), any());
    }

    @Test
    @DisplayName("decline: a non-target cannot decline")
    void declineByNonTargetRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING);
        when(actorScope.requireActor()).thenReturn(requester);

        assertThatThrownBy(() -> service.declineByTarget(r.getId())).isInstanceOf(AccessDeniedException.class);
        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING);
    }

    @Test
    @DisplayName("cancel: only the requester can cancel")
    void cancelByNonRequesterRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING);
        when(actorScope.requireActor()).thenReturn(target);

        assertThatThrownBy(() -> service.cancelRequest(r.getId())).isInstanceOf(AccessDeniedException.class);
        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING);

        when(actorScope.requireActor()).thenReturn(requester);
        assertThat(service.cancelRequest(r.getId()).getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.CANCELLED);
    }

    // ---------- manager approval ----------

    @Test
    @DisplayName("approve: an approver outside scope is refused and the swap is not executed")
    void approveOutOfScopeRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        when(actorScope.requireApprovalAccess(requester, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));

        assertThatThrownBy(() -> service.approveByManager(r.getId())).isInstanceOf(AccessDeniedException.class);

        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        verify(shiftManagementService, never()).swapAssignments(any(), any());
        verify(swapRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("approve: a party to the swap cannot approve it, even with ALL scope")
    void approveBySwapPartyRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        when(actorScope.requireApprovalAccess(any(), any())).thenReturn(target); // target holds ALL scope

        assertThatThrownBy(() -> service.approveByManager(r.getId())).isInstanceOf(AccessDeniedException.class);

        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        verify(shiftManagementService, never()).swapAssignments(any(), any());
    }

    @Test
    @DisplayName("approve: an in-scope manager approves, approver is the authenticated actor, assignments swap")
    void approveByManagerExecutesSwap() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        owners();
        when(actorScope.requireApprovalAccess(any(), any())).thenReturn(manager);

        ShiftSwapRequest result = service.approveByManager(r.getId());

        assertThat(result.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.COMPLETED);
        assertThat(result.getApproverId()).isEqualTo(manager);
        verify(shiftManagementService).swapAssignments(requesterAssignmentId, targetAssignmentId);
    }

    @Test
    @DisplayName("approve: refuses to execute when the requester no longer holds the offered assignment")
    void approveRefusesStaleOwnership() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        when(shiftManagementService.getAssignmentById(requesterAssignmentId))
                .thenReturn(assignment(requesterAssignmentId, UUID.randomUUID()));
        when(actorScope.requireApprovalAccess(any(), any())).thenReturn(manager);

        assertThatThrownBy(() -> service.approveByManager(r.getId())).isInstanceOf(IllegalStateException.class);
        verify(shiftManagementService, never()).swapAssignments(any(), any());
    }

    @Test
    @DisplayName("reject: out-of-scope approver is refused")
    void rejectOutOfScopeRefused() {
        ShiftSwapRequest r = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        when(actorScope.requireApprovalAccess(requester, Permission.ATTENDANCE_APPROVE))
                .thenThrow(new AccessDeniedException("out of scope"));

        assertThatThrownBy(() -> service.rejectByManager(r.getId(), "no")).isInstanceOf(AccessDeniedException.class);
        assertThat(r.getStatus()).isEqualTo(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
    }

    // ---------- reads ----------

    @Test
    @DisplayName("my-requests / incoming: another employee's list is refused when outside view scope")
    void readsOfOtherEmployeeRefused() {
        UUID other = UUID.randomUUID();
        doThrow(new AccessDeniedException("no access")).when(actorScope).requireViewAccess(other);

        assertThatThrownBy(() -> service.getMyRequests(other, org.springframework.data.domain.Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getIncomingRequests(other)).isInstanceOf(AccessDeniedException.class);
        verify(swapRequestRepository, never()).findPendingRequestsForTargetEmployee(any(), any());
    }

    @Test
    @DisplayName("pending-approval: scope is part of the repository query; the service returns exactly what it yields")
    void pendingApprovalScopedByQuery() {
        ShiftSwapRequest inScope = request(ShiftSwapRequest.SwapType.SWAP, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        when(swapRequestRepository.findAll(any(Specification.class))).thenReturn(List.of(inScope));

        assertThat(service.getRequestsPendingApproval()).containsExactly(inScope);
        // same visible set as the by-id check is proven against Postgres in AttendanceScopeQueryTest
    }
}
